// Initialize map centered on Washington State (Seattle area)
const map = L.map('map').setView([47.6062, -122.3321], 10);

// Add Esri Satellite base layer with labels (streets, cities)
const satellite = L.tileLayer(
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  {
    attribution: '© Esri & contributors',
    maxZoom: 19,
  }
).addTo(map);

const labels = L.tileLayer(
  'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
  {
    attribution: '© Esri & contributors',
    maxZoom: 19,
  }
).addTo(map);

// Feature group to hold drawn shapes
const drawnItems = new L.FeatureGroup();
map.addLayer(drawnItems);

// Add draw controls (polygon and rectangle only)
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

// Utilities for localStorage keys
const LS_FIELDS_KEY = 'agritrace_fields';
const LS_FARMS_KEY = 'agritrace_farms';

// Helper: Generate checklist popup HTML for a field
function generateChecklistHTML(todos, id) {
  if (!Array.isArray(todos) || todos.length === 0)
    return `<p>No tasks yet.</p>`;

  return `
  <ul class="task-list">
    ${todos
      .map(
        (todo, i) => `
      <li>
        <input type="checkbox" data-field-id="${id}" data-task-index="${i}" ${
          todo.done ? 'checked' : ''
        }>
        <span>${todo.text}</span>
        <button data-field-id="${id}" data-task-index="${i}" title="Delete task">🗑</button>
      </li>`
      )
      .join('')}
  </ul>
  <input type="text" id="new-task-${id}" placeholder="Add new task…" />
  <button data-field-id="${id}" class="add-task-btn">Add Task</button>
  `;
}

// Load fields from localStorage and add to map
function loadFields() {
  const fields = JSON.parse(localStorage.getItem(LS_FIELDS_KEY) || '[]');
  drawnItems.clearLayers();
  fields.forEach((field) => {
    let layer;
    if (field.type === 'rectangle') {
      layer = L.rectangle(field.coords);
    } else {
      layer = L.polygon(field.coords);
    }
    layer.fieldId = field.id;
    layer.todos = field.todos || [];
    layer.bindPopup(generateChecklistHTML(layer.todos, field.id));
    drawnItems.addLayer(layer);
  });
}

// Save all drawn fields and tasks to localStorage
function saveFields() {
  const fields = [];
  drawnItems.eachLayer((layer) => {
    if (layer instanceof L.Polygon || layer instanceof L.Rectangle) {
      fields.push({
        id: layer.fieldId,
        type: layer instanceof L.Rectangle ? 'rectangle' : 'polygon',
        coords: layer.getLatLngs(),
        todos: layer.todos || [],
      });
    }
  });
  localStorage.setItem(LS_FIELDS_KEY, JSON.stringify(fields));
}

// Farms data
let farms = JSON.parse(localStorage.getItem(LS_FARMS_KEY) || '[]');

// Render farms in sidebar
function renderFarms() {
  const farmList = document.getElementById('farm-list');
  farmList.innerHTML = '';

  if (farms.length === 0) {
    farmList.innerHTML = '<p>No farms added yet.</p>';
    return;
  }

  farms.forEach((farm) => {
    const farmDiv = document.createElement('div');
    farmDiv.className = 'farm-block';
    farmDiv.innerHTML = `
      <h3>${farm.name}</h3>
      <p>Fields: ${farm.fields.length}</p>
    `;
    farmList.appendChild(farmDiv);
  });
}

// Add new farm from input
function addFarm() {
  const input = document.getElementById('farm-name');
  const name = input.value.trim();
  if (!name) {
    alert('Please enter a farm name.');
    return;
  }
  const newFarm = {
    id: Date.now(),
    name,
    fields: [],
  };
  farms.push(newFarm);
  localStorage.setItem(LS_FARMS_KEY, JSON.stringify(farms));
  input.value = '';
  renderFarms();
}

// Add farm button event
document
  .getElementById('add-farm-btn')
  .addEventListener('click', addFarm);

// On map draw created: add field, prompt crop and tasks
map.on(L.Draw.Event.CREATED, function (e) {
  const layer = e.layer;
  const id = Date.now();

  // Prompt for crop type
  const crop = prompt('Enter crop type for this field:', 'Unknown') || 'Unknown';

  // Prompt for tasks
  const taskText = prompt(
    'Enter tasks for this field (comma separated):',
    ''
  );
  const todos = taskText
    ? taskText.split(',').map((t) => ({ text: t.trim(), done: false }))
    : [];

  layer.fieldId = id;
  layer.todos = todos;
  layer.crop = crop;

  // Bind popup with checklist + crop info
  layer.bindPopup(
    `<strong>Crop:</strong> ${crop}<br>${generateChecklistHTML(todos, id)}`
  );

  drawnItems.addLayer(layer);

  // Save to localStorage
  saveFields();

  alert('Field added! You can click on shapes to manage tasks.');
});

// Handle popup task checkbox toggle and delete buttons
map.on('popupopen', (e) => {
  const popup = e.popup._contentNode;

  // Checkbox toggles
  popup.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
    checkbox.addEventListener('change', (ev) => {
      const fieldId = Number(ev.target.dataset.fieldId);
      const taskIndex = Number(ev.target.dataset.taskIndex);

      const fields = JSON.parse(localStorage.getItem(LS_FIELDS_KEY) || '[]');
      const field = fields.find((f) => f.id === fieldId);
      if (!field) return;
      field.todos[taskIndex].done = ev.target.checked;
      localStorage.setItem(LS_FIELDS_KEY, JSON.stringify(fields));
      loadFields();
    });
  });

  // Delete buttons
  popup.querySelectorAll('button').forEach((btn) => {
    btn.addEventListener('click', (ev) => {
      const fieldId = Number(ev.target.dataset.fieldId);
      const taskIndex = Number(ev.target.dataset.taskIndex);

      const fields = JSON.parse(localStorage.getItem(LS_FIELDS_KEY) || '[]');
      const field = fields.find((f) => f.id === fieldId);
      if (!field) return;
      field.todos.splice(taskIndex, 1);
      localStorage.setItem(LS_FIELDS_KEY, JSON.stringify(fields));
      loadFields();
    });
  });

  // Add task button
  const addBtn = popup.querySelector('.add-task-btn');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      const fieldId = Number(addBtn.dataset.fieldId);
      const input = popup.querySelector(`#new-task-${fieldId}`);
      if (!input) return;
      const newTaskText = input.value.trim();
      if (!newTaskText) return;

      const fields = JSON.parse(localStorage.getItem(LS_FIELDS_KEY) || '[]');
      const field = fields.find((f) => f.id === fieldId);
      if (!field) return;
      field.todos.push({ text: newTaskText, done: false });
      localStorage.setItem(LS_FIELDS_KEY, JSON.stringify(fields));
      input.value = '';
      loadFields();
    });
  }
});

// Load saved farms and fields on startup
window.onload = () => {
  renderFarms();
  loadFields();
};
