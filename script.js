let map = L.map('map').setView([37.7749, -122.4194], 10);

const mapboxToken = 'YOUR_MAPBOX_TOKEN'; // Replace with your actual token

const street = L.tileLayer(`https://api.mapbox.com/styles/v1/mapbox/streets-v11/tiles/{z}/{x}/{y}?access_token=${mapboxToken}`, {
  tileSize: 512,
  zoomOffset: -1,
  attribution: '© <a href="https://www.mapbox.com/">Mapbox</a>'
});

const satellite = L.tileLayer(`https://api.mapbox.com/styles/v1/mapbox/satellite-v9/tiles/{z}/{x}/{y}?access_token=${mapboxToken}`, {
  tileSize: 512,
  zoomOffset: -1,
  attribution: '© <a href="https://www.mapbox.com/">Mapbox</a>'
});

street.addTo(map);
let currentLayer = street;

function toggleView() {
  map.removeLayer(currentLayer);
  currentLayer = currentLayer === street ? satellite : street;
  map.addLayer(currentLayer);
}

async function goToLocation() {
  const query = document.getElementById('locationInput').value;
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.length > 0) {
    const { lat, lon } = data[0];
    map.setView([lat, lon], 15);
  } else {
    alert('Location not found');
  }
}

const drawnItems = new L.FeatureGroup();
map.addLayer(drawnItems);

const drawControl = new L.Control.Draw({
  edit: {
    featureGroup: drawnItems
  },
  draw: {
    polygon: true,
    rectangle: true,
    circle: false,
    marker: true,
    polyline: false
  }
});

map.addControl(drawControl);

map.on(L.Draw.Event.CREATED, function (e) {
  const layer = e.layer;
  const label = prompt("Label this field:");
  if (label) {
    layer.bindPopup(label);
    drawnItems.addLayer(layer);
    saveField(label, layer.getLatLngs());
  }
});

function saveField(label, coords) {
  const fields = JSON.parse(localStorage.getItem('fields') || '[]');
  fields.push({ label, coords });
  localStorage.setItem('fields', JSON.stringify(fields));
  renderFields();
}

function renderFields() {
  const fieldList = document.getElementById('fieldList');
  fieldList.innerHTML = '';
  const fields = JSON.parse(localStorage.getItem('fields') || '[]');
  fields.forEach(field => {
    const div = document.createElement('div');
    div.className = 'field-item';
    div.innerText = field.label;
    fieldList.appendChild(div);
  });
}

rend
