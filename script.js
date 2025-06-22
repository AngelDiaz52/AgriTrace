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

const drawnItems = new L.FeatureGroup();
map.addLayer(drawnItems);

// Draw controls
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

const LS_FIELDS_KEY = 'agritrace_fields';
const LS_FARMS_KEY = 'agritrace_farms';

function generateChecklistHTML(todos, id) {
  if (!Array.isArray(todos) || todos.length === 0)
    return `<p>No tasks yet.</p>`;
  return `
  <ul class="task-list">
    ${todos
      .map(
        (todo, i) => `
      <li>
        <input type="checkbox" data-field-id="${id}" data-task-index="${i}" ${todo.done ? 'checked' : ''}>
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

function loadFields() {
  const fields = JSON.parse(localStorage.getItem(LS_FIELDS_KEY) || '[]');
  drawnItems.clearLayers();
  fields.forEach((field) => {
    let layer = field.type === 'rectangle'
      ? L.rectangle(field.coords)
      : L.polygon(field.coords);
    layer.fieldId = field.id;
    layer.todos = field.todos || [];
    layer.crop = field.crop || 'Unknown';
    layer.bindPopup(`<strong>Crop:</strong> ${layer.crop}<br>${generateChecklistHTML(layer.todos, layer.fieldId)}`);
    drawnItems.addLayer(layer);
  });
}

function saveFields(fields) {
  localStorage.setItem(LS_FIELDS_KEY, JSON.stringify(fields));
}

function getSavedFields() {
  return JSON.parse(localStorage.getItem(LS_FIELDS_KEY) || '[]');
}

let farms = JSON.parse(localStorage.getItem(LS_FARMS_KEY) || '[]');

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
  renderFarmSelector();
}

function renderFarmSelector() {
  const selector = document.getElementById('farmSelector');
  selector.innerHTML = '<option value="">-- Select a Farm --</option>';
  farms.forEach((farm) => {
    const option = document.createElement('option');
    option.value = farm.id;
    option.textContent = farm.name;
    selector.appendChild(option);
  });
}

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

document.getElementById('add-farm-btn').addEventListener('click', addFarm);

map.on(L.Draw.Event.CREATED, function (e) {
  const layer = e.layer;
  const id = Date.now();

  const crop = prompt('Enter crop type for this field:', 'Unknown') || 'Unknown';
  const taskText = prompt('Enter tasks for this field (comma separated):', '');
  const todos = taskText
    ? taskText.split(',').map((t) => ({ text: t.trim(), done: false }))
    : [];

  layer.fieldId = id;
  layer.crop = crop;
  layer.todos = todos;

  layer.bindPopup(`<strong>Crop:</strong> ${crop}<br>${generateChecklistHTML(todos, id)}`);
  drawnItems.addLayer(layer);

  // Save to local fields
  const fields = getSavedFields();
  const newField = {
    id,
    type: layer instanceof L.Rectangle ? 'rectangle' : 'polygon',
    coords: layer.getLatLngs(),
    crop,
    todos,
  };
  fields.push(newField);
  saveFields(fields);

  // Assign to farm
  const selectedFarmId = Number(document.getElementById('farmSelector').value);
  const farm = farms.find((f) => f.id === selectedFarmId);
  if (farm) {
    farm.fields.push(id);
    localStorage.setItem(LS_FARMS_KEY, JSON.stringify(farms));
    renderFarms();
    alert(`Field added and linked to farm: ${farm.name}`);
  } else {
    alert('Field added, but not assigned to a farm.');
  }
});

map.on('popupopen', (e) => {
  const popup = e.popup._contentNode;

  popup.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
    checkbox.addEventListener('change', (ev) => {
      const fieldId = Number(ev.target.dataset.fieldId);
      const taskIndex = Number(ev.target.dataset.taskIndex);
      const fields = getSavedFields();
      const field = fields.find((f) => f.id === fieldId);
      if (!field) return;
      field.todos[taskIndex].done = ev.target.checked;
      saveFields(fields);
      loadFields();
    });
  });

  popup.querySelectorAll('button').forEach((btn) => {
    btn.addEventListener('click', (ev) => {
      const fieldId = Number(ev.target.dataset.fieldId);
      const taskIndex = Number(ev.target.dataset.taskIndex);
      const fields = getSavedFields();
      const field = fields.find((f) => f.id === fieldId);
      if (!field) return;
      field.todos.splice(taskIndex, 1);
      saveFields(fields);
      loadFields();
    });
  });

  const addBtn = popup.querySelector('.add-task-btn');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      const fieldId = Number(addBtn.dataset.fieldId);
      const input = popup.querySelector(`#new-task-${fieldId}`);
      const newTaskText = input.value.trim();
      if (!newTaskText) return;
      const fields = getSavedFields();
      const field = fields.find((f) => f.id === fieldId);
      if (!field) return;
      field.todos.push({ text: newTaskText, done: false })
