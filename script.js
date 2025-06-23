let map = L.map('map').setView([37.7749, -122.4194], 10);

const street = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');
const satellite = L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
  subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
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

// Drawing controls
const drawnItems = new L.FeatureGroup();
map.addLayer(drawnItems);

const drawControl = new L.Control.Draw({
  edit: {
    featureGroup: drawnItems,
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
  fields.forEach((field, index) => {
    const div = document.createElement('div');
    div.className = 'field-item';
    div.innerText = field.label;
    fieldList.appendChild(div);
  });
}

renderFields();

// Sidebar Resizing
const resizer = document.getElementById('resizer');
const sidebar = document.getElementById('sidebar');
let isResizing = false;

resizer.addEventListener('mousedown', (e) => {
  isResizing = true;
  document.body.style.cursor = 'ew-resize';
});

document.addEventListener('mousemove', (e) => {
  if (!isResizing) return;
  const newWidth = e.clientX;
  if (newWidth > 200 && newWidth < 600) {
    sidebar.style.width = `${newWidth}px`;
  }
});

document.addEventListener('mouseup', () => {
  isResizing = false;
  document.body.style.cursor = 'default';
});
