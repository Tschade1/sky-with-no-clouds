import * as exifr from 'https://cdn.jsdelivr.net/npm/exifr/dist/full.esm.mjs';

let map;
let marker;
let uploadedDataURL = null;
let extractedDate = '';
let extractedTime = '';
let extractedLat = '';
let extractedLon = '';
let missingDateTime = false;
let missingLocation = false;

function log(...args) {
  console.log('[UPLOAD DEBUG]:', ...args);
}

document.documentElement.style.overscrollBehavior = 'none';
document.body.classList.add('noscroll');

function toggleDialog() {
  document.getElementById('aboutDialog')?.classList.toggle('show');
}

function toggleUploadForm() {
  const form = document.getElementById('uploadForm');
  const overlay = document.getElementById('uploadOverlay');
  const isOpening = !form.classList.contains('show');

  if (isOpening) {
    log('Opening upload form');
    form.classList.add('show');
    overlay.classList.add('show');
    document.body.classList.add('noscroll');
    clearUploadForm();
    document.getElementById('manualFields').style.display = 'none';
    document.getElementById('previewCard').style.display = 'none';
  } else {
    log('Closing upload form');
    form.classList.remove('show');
    overlay.classList.remove('show');
    document.body.classList.remove('noscroll');
    clearUploadForm();
    removePreviewCard();
    location.reload();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelector('[data-upload-button]')?.addEventListener('click', toggleUploadForm);
  document.querySelector('[data-about-button]')?.addEventListener('click', toggleDialog);
  document.querySelectorAll('[data-close-button]').forEach(btn => btn.addEventListener('click', toggleUploadForm));
  document.querySelector('[data-submit-button]')?.addEventListener('click', submitUpload);
});

document.getElementById('photoInput').addEventListener('change', async function (event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async function (e) {
    const img = new Image();
    img.onload = async function () {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (img.height > img.width) {
        canvas.width = img.height;
        canvas.height = img.width;
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(Math.PI / 2);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
      } else {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
      }

      uploadedDataURL = canvas.toDataURL('image/jpeg', 0.9);
      document.getElementById('photoArea').style.backgroundImage = `url('${uploadedDataURL}')`;
      document.getElementById('uploadOverlay').classList.remove('show');
      document.getElementById('previewCard').style.display = 'flex';
      document.getElementById('previewCard').scrollIntoView({ behavior: 'smooth' });

      let exifData = {};
      try {
        exifData = await exifr.parse(file);
        log('Full EXIF keys:', Object.keys(exifData));
        log('Full EXIF data:', JSON.stringify(exifData, null, 2));
        
      } catch (err) {
        log('EXIF parse error:', err);
      }

      extractedDate = '--';
      extractedTime = '--';
      extractedLat = '';
      extractedLon = '';

      if (exifData?.DateTimeOriginal instanceof Date) {
        const iso = exifData.DateTimeOriginal.toISOString();
        extractedDate = iso.split('T')[0];
        extractedTime = iso.split('T')[1].slice(0, 5);
      }

      if (typeof exifData.latitude === 'number' && typeof exifData.longitude === 'number') {
        extractedLat = exifData.latitude;
        extractedLon = exifData.longitude;
      }

      missingDateTime = (extractedDate === '--' || extractedTime === '--');
      missingLocation = (!extractedLat || !extractedLon);

      log('Missing Date/Time:', missingDateTime, 'Missing Location:', missingLocation);

      const dateInput = document.getElementById('manualDate');
      const timeInput = document.getElementById('manualTime');
      const mapDiv = document.getElementById('manualMap');

      document.getElementById('manualDateTime').style.display = missingDateTime ? 'block' : 'none';
      document.getElementById('manualLocation').style.display = missingLocation ? 'block' : 'none';
      document.getElementById('manualFields').style.display = (missingDateTime || missingLocation) ? 'block' : 'none';

      if (missingDateTime) {
        if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
        if (timeInput) timeInput.value = new Date().toTimeString().slice(0, 5);
      }

      if (missingLocation && mapDiv && !map) initMapForManualSelection();
      else if (!missingLocation) initMapWithExif(parseFloat(extractedLat), parseFloat(extractedLon));

      updatePreview();
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
});

function updatePreview() {
  const date = missingDateTime ? document.getElementById('manualDate')?.value || '--' : extractedDate;
  const time = missingDateTime ? document.getElementById('manualTime')?.value || '--' : extractedTime;
  const latRaw = missingLocation ? document.getElementById('manualMap')?.dataset?.lat : extractedLat;
  const lonRaw = missingLocation ? document.getElementById('manualMap')?.dataset?.lon : extractedLon;

  const latDisplay = latRaw ? toExifDMS(parseFloat(latRaw), 'lat') : '--';
  const lonDisplay = lonRaw ? toExifDMS(parseFloat(lonRaw), 'lon') : '--';

  document.getElementById('meta').innerHTML = `
    <p>${date}</p>
    <p>${time}</p>
    <p>${latDisplay}</p>
    <p>${lonDisplay}</p>
  `;
}

function toExifDMS(coord, type) {
  if (!coord) return '--';
  const abs = Math.abs(coord);
  const degrees = Math.floor(abs);
  const minutesFloat = (abs - degrees) * 60;
  const minutes = Math.floor(minutesFloat);
  const seconds = ((minutesFloat - minutes) * 60).toFixed(1);
  const dir = (type === 'lat') ? (coord >= 0 ? 'N' : 'S') : (coord >= 0 ? 'E' : 'W');
  return `${degrees}° ${minutes}' ${seconds}" ${dir}`;
}

function submitUpload() {
  const date = missingDateTime ? document.getElementById('manualDate').value : extractedDate;
  const time = missingDateTime ? document.getElementById('manualTime').value : extractedTime;
  const lat = missingLocation ? document.getElementById('manualMap').dataset.lat : extractedLat;
  const lon = missingLocation ? document.getElementById('manualMap').dataset.lon : extractedLon;

  log('Submitting with:', { date, time, lat, lon });

  if (!uploadedDataURL || !date || !time || !lat || !lon) {
    alert('Please fill out all required metadata fields.');
    return;
  }

  const formData = new FormData();
  const fileInput = document.getElementById('photoInput');
  formData.append('photo', fileInput.files[0]);
  formData.append('date', date);
  formData.append('time', time);
  formData.append('lat', lat);
  formData.append('lon', lon);

  fetch('/upload', {
    method: 'POST',
    body: formData,
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        alert('Upload successful and pending approval!');
        toggleUploadForm();
      } else {
        alert(data.message || 'Upload failed.');
      }
    })
    .catch(err => {
      console.error('Upload error:', err);
      alert('An error occurred during upload.');
    });
}

function clearUploadForm() {
  uploadedDataURL = null;
  map = null;
  marker = null;
  extractedDate = '';
  extractedTime = '';
  extractedLat = '';
  extractedLon = '';
  missingDateTime = false;
  missingLocation = false;

  document.getElementById('photoInput').value = '';
  document.getElementById('photoArea').style.backgroundImage = '';
  document.getElementById('meta').innerHTML = `<p>--</p><p>--</p><p>--</p><p>--</p>`;
  document.getElementById('manualDate').value = '';
  document.getElementById('manualTime').value = '';
  document.getElementById('manualMap').innerHTML = '';
  document.getElementById('manualMap').dataset.lat = '';
  document.getElementById('manualMap').dataset.lon = '';
}

function removePreviewCard() {
  document.getElementById('photoArea').style.backgroundImage = '';
  document.getElementById('previewCard').style.display = 'none';
  document.getElementById('meta').innerHTML = `<p>--</p><p>--</p><p>--</p><p>--</p>`;
}

function initMapWithExif(lat, lon) {
  const mapContainer = document.getElementById('manualMap');
  mapContainer.innerHTML = '';
  map = L.map(mapContainer).setView([lat, lon], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
  marker = L.marker([lat, lon]).addTo(map);
}

function initMapForManualSelection() {
  const mapContainer = document.getElementById('manualMap');
  mapContainer.innerHTML = '';
  map = L.map(mapContainer).setView([39.95, -75.16], 4);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

  navigator.geolocation?.getCurrentPosition(pos => {
    const lat = pos.coords.latitude;
    const lon = pos.coords.longitude;
    marker = L.marker([lat, lon]).addTo(map);
    map.setView([lat, lon], 12);
    mapContainer.dataset.lat = lat;
    mapContainer.dataset.lon = lon;
    updatePreview();
  });

  map.on('click', function(e) {
    const { lat, lng } = e.latlng;
    if (marker) marker.setLatLng([lat, lng]);
    else marker = L.marker([lat, lng]).addTo(map);
    mapContainer.dataset.lat = lat;
    mapContainer.dataset.lon = lng;
    updatePreview();
  });
}
