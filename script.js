let map = L.map('map').setView([37.7749, -122.4194], 10);

const street = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');
street.addTo(map);

let currentLayer = street;

function toggleView() {
  if (map.hasLayer(street)) {
    map.removeLayer(street);
    const satellite = L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
    });
    satellite.addTo(map);
    currentLayer = satellite;
  } else {
    map.removeLayer(currentLayer);
    street.addTo(map);
    currentLayer = street;
  }
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

renderFields();
