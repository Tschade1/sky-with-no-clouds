async function fetchData() {
  const res = await fetch('/data');
  const data = await res.json();
  displayPhotos(data);
}

function toExifFormat(coord, type) {
  if (!coord || coord.includes('°')) return coord || '--';

  const abs = Math.abs(parseFloat(coord));
  const degrees = Math.floor(abs);
  const minutesFloat = (abs - degrees) * 60;
  const minutes = Math.floor(minutesFloat);
  const seconds = ((minutesFloat - minutes) * 60).toFixed(1);
  const dir = (type === 'lat') ? (coord >= 0 ? 'N' : 'S') : (coord >= 0 ? 'E' : 'W');

  return `${degrees}° ${minutes}' ${seconds}" ${dir}`;
}

function displayPhotos(data) {
  const sections = {
    pending: document.getElementById('pendingContainer'),
    approved: document.getElementById('approvedContainer'),
    rejected: document.getElementById('rejectedContainer'),
    deleted: document.getElementById('deletedContainer'),
  };

  // Clear existing
  Object.values(sections).forEach(el => el.innerHTML = '');

  data.forEach((item, index) => {
    if (!item || !item.status) return;

    const card = document.createElement('div');
    card.className = 'photo-card';

    const img = document.createElement('img');
    img.src = `/uploads/${item.filename}`;
    card.appendChild(img);

    const info = document.createElement('p');
    info.innerHTML = `
      Date: ${item.date || '--'}<br>
      Time: ${item.time || '--'}<br>
      Lat: ${toExifFormat(item.lat, 'lat')}<br>
      Lon: ${toExifFormat(item.lon, 'lon')}
    `;
    card.appendChild(info);

    // Button logic
    if (item.status === 'pending') {
      card.appendChild(createButton('Approve', () => approvePhoto(index)));
      card.appendChild(createButton('Reject', () => rejectPhoto(index)));
      card.appendChild(createButton('Delete', () => deletePhoto(index)));
      sections.pending.appendChild(card);

    } else if (item.status === 'approved') {
      card.appendChild(createButton('Reject', () => rejectPhoto(index)));
      sections.approved.appendChild(card);

    } else if (item.status === 'rejected') {
      card.appendChild(createButton('Approve', () => approvePhoto(index)));
      card.appendChild(createButton('Delete', () => deletePhoto(index)));
      sections.rejected.appendChild(card);

    } else if (item.status === 'deleted') {
      sections.deleted.appendChild(card);
    }
  });
}

function createButton(label, action) {
  const btn = document.createElement('button');
  btn.innerText = label;
  btn.onclick = action;
  return btn;
}

async function approvePhoto(index) {
  await fetch(`/approve/${index}`, { method: 'POST' });
  fetchData();
}

async function rejectPhoto(index) {
  await fetch(`/reject/${index}`, { method: 'POST' });
  fetchData();
}

async function deletePhoto(index) {
  const confirmDelete = confirm('Are you sure you want to permanently delete this image?');
  if (confirmDelete) {
    await fetch(`/delete/${index}`, { method: 'POST' });
    fetchData();
  }
}

// Init
fetchData();
