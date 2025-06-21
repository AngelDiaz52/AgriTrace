// Initialize the map
const map = L.map('map').setView([20.5937, 78.9629], 5); // Default view on India

// Feature group to hold drawn shapes
const drawnItems = new L.FeatureGroup();
map.addLayer(drawnItems);

// Drawing controls
const drawControl = new L.Control.Draw({
  edit: { featureGroup: drawnItems },
  draw: {
    polygon: true,
    rectangle: true,
    polyline: false,
    circle: false,
    marker: false,
    circlemarker: false
  }
});
map.addControl(drawControl);

// Function to generate checklist HTML for todos
function generateChecklistHTML(todos, id) {
  if (!Array.isArray(todos)) return "<p>No tasks found</p>";

  return `
    <div data-id="${id}">
      <ul style="list-style: none; padding-left: 0;">
        ${todos.map((todo, index) => `
          <li>
            <input type="checkbox" ${todo.done ? 'checked' : ''} onchange="toggleTask(${id}, ${index})">
            <span>${todo.text}</span>
            <button onclick="deleteTask(${id}, ${index})" style="margin-left:5px;">🗑</button>
          </li>
        `).join('')}
      </ul>
      <input type="text" id="new-task-${id}" placeholder="New task" />
      <button onclick="addTask(${id})">➕ Add Task</button>
    </div>
  `;
}

// Add Esri imagery tile layer
L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
  attribution: 'Tiles © Esri & contributors'
}).addTo(map);

// Load saved fields from localStorage
function loadFromLocalStorage() {
  const data = JSON.parse(localStorage.getItem('fields') || '[]');
  data.forEach(item => {
    let layer;
    if (item.type === 'rectangle') {
      layer = L.rectangle(item.coords);
    } else {
      layer = L.polygon(item.coords);
    }

    layer.todoId = item.id;          // restore the ID
    layer.todos = item.todos || [];  // restore the todos list
    layer.bindPopup(generateChecklistHTML(item.todos, item.id));

    drawnItems.addLayer(layer);
  });
}

// Save all fields with todos to localStorage
function saveToLocalStorage() {
  const data = [];
  drawnItems.eachLayer(layer => {
    if (layer instanceof L.Polygon || layer instanceof L.Rectangle) {
      data.push({
        id: layer.todoId, // include ID
        type: layer instanceof L.Rectangle ? "rectangle" : "polygon",
        coords: layer.getLatLngs(),
        todos: layer.todos
      });
    }
  });
  localStorage.setItem('fields', JSON.stringify(data));
}

// Reload shapes on map from localStorage
function reloadShapes() {
  drawnItems.clearLayers();
  loadFromLocalStorage();
}

// Todo task functions
function toggleTask(layerId, taskIndex) {
  const data = JSON.parse(localStorage.getItem('fields') || '[]');
  const field = data.find(f => f.id === layerId);
  if (field) {
    field.todos[taskIndex].done = !field.todos[taskIndex].done;
    localStorage.setItem('fields', JSON.stringify(data));
    reloadShapes();
  }
}

function deleteTask(layerId, taskIndex) {
  const data = JSON.parse(localStorage.getItem('fields') || '[]');
  const field = data.find(f => f.id === layerId);
  if (field) {
    field.todos.splice(taskIndex, 1);
    localStorage.setItem('fields', JSON.stringify(data));
    reloadShapes();
  }
}

function addTask(layerId) {
  const input = document.getElementById(`new-task-${layerId}`);
  const newTask = input.value.trim();
  if (!newTask) return;

  const data = JSON.parse(localStorage.getItem('fields') || '[]');
  const field = data.find(f => f.id === layerId);
  if (field) {
    field.todos.push({ text: newTask, done: false });
    localStorage.setItem('fields', JSON.stringify(data));
    reloadShapes();
  }
}

// When a new shape is created
map.on(L.Draw.Event.CREATED, function (event) {
  const layer = event.layer;
  const id = Date.now();

  // Prompt user for tasks
  const todoText = prompt("Enter tasks for this field (separate by commas):");
  const todos = todoText
    ? todoText.split(',').map(t => ({ text: t.trim(), done: false }))
    : [];

  // Assign ID and todos to layer
  layer.todoId = id;
  layer.todos = todos;

  // Bind popup with todo checklist
  layer.bindPopup(generateChecklistHTML(todos, id));

  drawnItems.addLayer(layer);
  saveToLocalStorage();
});

// Load existing fields on page load
loadFromLocalStorage();


// Farms management
let farms = JSON.parse(localStorage.getItem("farms")) || [];

function addFarm() {
  const name = document.getElementById("farm-name").value.trim();
  if (!name) return;

  const farm = {
    id: Date.now(),
    name: name,
    fields: []
  };

  farms.push(farm);
  localStorage.setItem("farms", JSON.stringify(farms));
  document.getElementById("farm-name").value = "";
  renderFarms();
}

function renderFarms() {
  const farmList = document.getElementById("farm-list");
  farmList.innerHTML = "";

  farms.forEach(farm => {
    const div = document.createElement("div");
    div.className = "farm-block";
    div.innerHTML = `
      <h4>${farm.name}</h4>
      <p>Fields: ${farm.fields.length}</p>
    `;
    farmList.appendChild(div);
  });
}

// Load farms on page load
renderFarms();
