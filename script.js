// Initialize the map
const map = L.map('map').setView([20.5937, 78.9629], 5); // Default view on India

L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
  attribution: 'Tiles © Esri & contributors'
}).addTo(map);


// Set up feature group for drawn items
const drawnItems = new L.FeatureGroup();
map.addLayer(drawnItems);

// Add draw controls
const drawControl = new L.Control.Draw({
  edit: {
    featureGroup: drawnItems
  },
  draw: {
    polygon: true,
    polyline: false,
    rectangle: false,
    circle: false,
    marker: false,
    circlemarker: false
  }
});
map.addControl(drawControl);

// Load saved fields
window.onload = () => {
  const saved = JSON.parse(localStorage.getItem('fields') || '[]');
  saved.forEach(field => {
    const layer = L.polygon(field.coordinates).addTo(drawnItems);
    layer.bindPopup(`Crop: ${field.crop}`);
  });
};

// Save new drawing
map.on('draw:created', function (e) {
  const layer = e.layer;
  drawnItems.addLayer(layer);

  const coords = layer.getLatLngs();
  const cropType = prompt("Enter crop type for this field:");

  const fieldData = {
    crop: cropType || "Unknown",
    coordinates: coords[0]
  };

  // Save to localStorage
  const saved = JSON.parse(localStorage.getItem('fields') || '[]');
  saved.push(fieldData);
  localStorage.setItem('fields', JSON.stringify(saved));

  layer.bindPopup(`Crop: ${fieldData.crop}`);
  alert("Field saved!");
});
function centerMapByZip() {
  const zip = document.getElementById('zipInput').value.trim();
  if (!zip) return alert("Please enter a ZIP code.");

  fetch(`https://nominatim.openstreetmap.org/search?postalcode=${zip}&country=USA&format=json`)
    .then(response => response.json())
    .then(data => {
      if (data.length === 0) return alert("ZIP code not found.");
      const { lat, lon } = data[0];
      map.setView([lat, lon], 13);
    })
    .catch(() => alert("Error locating ZIP code."));
}
