const map = L.map('map').setView([0, 0], 2);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Cluster Group
const markers = L.markerClusterGroup();
const bounds = [];

fetch('http://localhost:3000/data')
  .then(response => response.json())
  .then(data => {
    data
      .filter(item => item.status === 'approved')
      .forEach(item => {
        const lat = parseFloat(item.lat);
        const lon = parseFloat(item.lon);

        if (!isNaN(lat) && !isNaN(lon)) {
            const marker = L.marker([lat, lon]).bindPopup(`
                <a href="/gallery.html#${item.filename}" style="text-decoration: none; color: black;">
                  <img src="/uploads/${item.filename}" width="200"><br>
                  ${item.date} ${item.time}
                </a>
              `);
              

          markers.addLayer(marker);
          bounds.push([lat, lon]);
        }
      });

    map.addLayer(markers);

    if (bounds.length) {
      map.fitBounds(bounds, { padding: [30, 30] });
    }
  });
