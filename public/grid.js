document.addEventListener('DOMContentLoaded', () => {
    document.body.style.backgroundColor = 'white';
    document.body.style.overflowY = 'scroll';
  
    fetch('/data')
      .then(res => res.json())
      .then(data => {
        const grid = document.getElementById('gridContainer');
        if (!grid) return;
  
        const approvedPhotos = data.filter(item => item.status === 'approved').reverse();
  
        approvedPhotos.forEach(photo => {
          const cell = document.createElement('div');
          cell.className = 'grid-cell';
          cell.id = photo.filename;
  
          const img = document.createElement('img');
          img.src = `/uploads/${photo.filename}`;
          img.alt = 'Sky Photo';
          img.className = 'grid-image';
          img.loading = 'lazy';
  
          const meta = document.createElement('div');
          meta.className = 'grid-meta';
          meta.innerHTML = `
            <p>${photo.date || '--'}</p>
            <p>${photo.time || '--'}</p>
            <p>${formatCoord(photo.lat, 'lat')}</p>
            <p>${formatCoord(photo.lon, 'lon')}</p>
          `;
  
          cell.appendChild(img);
          cell.appendChild(meta);
          cell.onclick = () => {
            window.location.href = `/gallery.html#${photo.filename}`;
          };
  
          grid.appendChild(cell);
        });
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
  
  // Gallery-side code to scroll into view based on hash
  window.addEventListener('DOMContentLoaded', () => {
    const hash = window.location.hash?.substring(1);
    if (hash) {
      const target = document.getElementById(hash);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    }
  });
  