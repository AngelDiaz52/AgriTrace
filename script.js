// script.js

// Initialize the map centered on Seattle
const map = L.map('map').setView([47.6062, -122.3321], 10);

// Add Satellite base layer
const satellite = L.tileLayer(
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  { attribution: '© Esri & contributors', maxZoom: 19 }
).addTo(map);

// Add Label layer
const labels = L.tileLayer(
  'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
  { attribution: '© Esri & contributors', maxZoom: 19 }
).addTo(map);

// LocalStorage keys
const LS_FIELDS_KEY = 'agritrace_fields';
const LS_FARMS_KEY = 'agritrace_farms';

const drawnItems = new L.FeatureGroup();
map.addLayer(drawnItems);

const drawControl = new L.Control.Draw({
  edit: {
    featureGroup: drawnItems,
    poly: { allowIntersection: false },
  },
  draw: {
    polygon: true,
    rectangle: true,
    circle: false,
    marker: false,
    polyline: false,
    circlemarker: false,
  },
});
map.addControl(drawControl);

let farms = JSON.parse(localStorage.getItem(LS_FARMS_KEY) || '[]');

function generateChecklistHTML(todos, id) {
  return `
    <ul class="task-list">
      ${todos.map((todo, i) => `
        <li>
          <input type="checkbox" data-field-id="${id}" data-task-index="${i}" ${todo.done ? 'checked' : ''}>
          <span>${todo.text}</span>
          <button data-field-id="${id}" data-task-index="${i}" title="Delete task">🗑</button>
        </li>
      `).join('')}
    </ul>
    <input type="text" id="new-task-${id}" placeholder="Add new task…">
    <button data-field-id="${id}" class="add-task-btn">Add Task</button>
  `;
}

function saveFields() {
  const fields = [];
  drawnItems.eachLayer((layer) => {
    if (layer instanceof L.Polygon || layer instanceof L.Rectangle) {
      fields.push({
        id: layer.fieldId,
        type: layer instanceof L.Rectangle ? 'rectangle' : 'polygon',
        coords: layer.getLatLngs(),
        todos: layer.todos || [],
        crop: layer.crop || 'Unknown',
        farmId: layer.farmId || null,
      });
    }
  });
  localStorage.setItem(LS_FIELDS_KEY, JSON.stringify(fields));
}

function loadFields() {
  const fields = JSON.parse(localStorage.getItem(LS_FIELDS_KEY) || '[]');
  drawnItems.clearLayers();
  fields.forEach((field) => {
    let layer = field.type === 'rectangle' ? L.rectangle(field.coords) : L.polygon(field.coords);
    layer.fieldId = field.id;
    layer.todos = field.todos || [];
    layer.crop = field.crop;
    layer.farmId = field.farmId;
    layer.bindPopup(`<strong>Crop:</strong> ${field.crop}<br>${generateChecklistHTML(field.todos, field.id)}`);
    drawnItems.addLayer(layer);
  });
}

function renderFarms() {
  const farmList = document.getElementById('farm-list');
  const farmSelector = document.getElementById('farmSelector');
  farmList.innerHTML = '';
  farmSelector.innerHTML = '<option value="">-- Select a Farm --</option>';
  
  if (farms.length === 0) {
    farmList.innerHTML = '<p>No farms added yet.</p>';
    return;
  }

  farms.forEach((farm) => {
    const div = document.createElement('div');
    div.className = 'farm-block';
    div.innerHTML = `<h3 contenteditable="true">${farm.name}</h3><p>Fields: ${farm.fields.length}</p>`;
    farmList.appendChild(div);

    const option = document.createElement('option');
    option.value = farm.id;
    option.textContent = farm.name;
    farmSelector.appendChild(option);
  });
}

function addFarm() {
  const input = document.getElementById('farm-name');
  const name = input.value.trim();
  if (!name) return alert('Enter a farm name.');

  const newFarm = { id: Date.now(), name, fields: [] };
  farms.push(newFarm);
  localStorage.setItem(LS_FARMS_KEY, JSON.stringify(farms));
  input.value = '';
  renderFarms();
}

document.getElementById('add-farm-btn').addEventListener('click', addFarm);

map.on(L.Draw.Event.CREATED, function (e) {
  const layer = e.layer;
  const id = Date.now();

  const crop = prompt('Enter crop type:', 'Unknown') || 'Unknown';
  const taskText = prompt('Enter tasks (comma-separated):', '');
  const todos = taskText ? taskText.split(',').map(t => ({ text: t.trim(), done: false })) : [];

  const farmId = document.getElementById('farmSelector').value || null;

  layer.fieldId = id;
  layer.todos = todos;
  layer.crop = crop;
  layer.farmId = farmId;

  layer.bindPopup(`<strong>Crop:</strong> ${crop}<br>${generateChecklistHTML(todos, id)}`);
  drawnItems.addLayer(layer);

  if (farmId) {
    const farm = farms.find(f => f.id == farmId);
    if (farm) {
      farm.fields.push(id);
      localStorage.setItem(LS_FARMS_KEY, JSON.stringify(farms));
    }
  }

  saveFields();
});

map.on('popupopen', (e) => {
  const popup = e.popup._contentNode;

  popup.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
    cb.addEventListener('change', () => {
      const fields = JSON.parse(localStorage.getItem(LS_FIELDS_KEY) || '[]');
      const field = fields.find(f => f.id == cb.dataset.fieldId);
      if (field) {
        field.todos[cb.dataset.taskIndex].done = cb.checked;
        localStorage.setItem(LS_FIELDS_KEY, JSON.stringify(fields));
        loadFields();
      }
    });
  });

  popup.querySelectorAll('button').forEach((btn) => {
    btn.addEventListener('click', () => {
      const fields = JSON.parse(localStorage.getItem(LS_FIELDS_KEY) || '[]');
      const field = fields.find(f => f.id == btn.dataset.fieldId);
      if (field) {
        field.todos.splice(btn.dataset.taskIndex, 1);
        localStorage.setItem(LS_FIELDS_KEY, JSON.stringify(fields));
        loadFields();
      }
    });
  });

  const addBtn = popup.querySelector('.add-task-btn');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      const fieldId = addBtn.dataset.fieldId;
      const input = popup.querySelector(`#new-task-${fieldId}`);
      if (!input.value.trim()) return;

      const fields = JSON.parse(localStorage.getItem(LS_FIELDS_KEY) || '[]');
      const field = fields.find(f => f.id == fieldId);
      if (field) {
        field.todos.push({ text: input.value.trim(), done: false });
        localStorage.setItem(LS_FIELDS_KEY, JSON.stringify(fields));
        loadFields();
      }
    });
  }
});

window.onload = () => {
  renderFarms();
  loadFields();
};
