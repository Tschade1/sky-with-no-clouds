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

      uploadedDataURL = canvas.toDataURL('image/webp', 0.8);
      document.getElementById('photoArea').style.backgroundImage = `url('${uploadedDataURL}')`;
      document.getElementById('uploadOverlay').classList.remove('show');
      document.getElementById('previewCard').style.display = 'flex';
      document.getElementById('previewCard').scrollIntoView({ behavior: 'smooth' });

      let exifData = {};
      try {
        if (file instanceof Blob) {
          exifData = await exifr.parse(file);
        } else {
          log('File is not a Blob, cannot parse EXIF');
        }
        
        log('EXIF extracted:', exifData);
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

      const manualFields = document.getElementById('manualFields');
      const dateTimeField = document.getElementById('manualDateTime');
      const locationField = document.getElementById('manualLocation');

      if (missingDateTime || missingLocation) {
        dateTimeField.style.display = missingDateTime ? 'block' : 'none';
        locationField.style.display = missingLocation ? 'block' : 'none';
        manualFields.style.display = 'block';

        if (missingLocation) initMapForManualSelection();
        else initMapWithExif(parseFloat(extractedLat), parseFloat(extractedLon));
      } else {
        dateTimeField.style.display = 'none';
        locationField.style.display = 'none';
        manualFields.style.display = 'none';
      }

      updatePreview();
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
});
