document.addEventListener('DOMContentLoaded', () => {
    fetch('/data')
      .then(res => res.json())
      .then(data => {
        const container = document.getElementById('galleryContainer');
        if (!container) return;
  
        const approvedPhotos = data.filter(item => item.status === 'approved').reverse();
  
        approvedPhotos.forEach(photo => {
          const card = document.createElement('div');
          card.className = 'photo-card';
          card.id = photo.filename; // This is the scroll target for hash
  
          const photoArea = document.createElement('div');
          photoArea.className = 'photo-area';
          photoArea.style.backgroundImage = `url('/uploads/${photo.filename}')`;
  
          const metaArea = document.createElement('div');
          metaArea.className = 'meta-area';
          metaArea.innerHTML = `
            <p>${photo.date || '--'}</p>
            <p>${photo.time || '--'}</p>
            <p>${formatCoord(photo.lat, 'lat')}</p>
            <p>${formatCoord(photo.lon, 'lon')}</p>
          `;
  
          card.appendChild(photoArea);
          card.appendChild(metaArea);
          container.appendChild(card);
        });
  
        // Scroll into view if there's a hash match after photos are rendered
        const hash = window.location.hash?.substring(1);
        if (hash) {
          const target = document.getElementById(hash);
          if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
          }
        }
      });
  });
  
  function formatCoord(raw, type) {
    if (!raw || typeof raw !== 'string') return '--';
    if (!isNaN(parseFloat(raw))) return toDMS(parseFloat(raw), type);
    return raw;
  }
  
  function toDMS(coord, type) {
    const abs = Math.abs(coord);
    const degrees = Math.floor(abs);
    const minutesFloat = (abs - degrees) * 60;
    const minutes = Math.floor(minutesFloat);
    const seconds = ((minutesFloat - minutes) * 60).toFixed(1);
    const dir = (type === 'lat') ? (coord >= 0 ? 'N' : 'S') : (coord >= 0 ? 'E' : 'W');
    return `${degrees}° ${minutes}' ${seconds}" ${dir}`;
  }
  