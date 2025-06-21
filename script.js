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
    marker: false
  }
});
map.addControl(drawControl);
map.on(L.Draw.Event.CREATED, function (event) {
  const layer = event.layer;
  const id = Date.now();

  const todoText = prompt("Enter tasks for this field (separate by commas):");
 const todos = todoText
  ? todoText.split(',').map(t => ({ text: t.trim(), done: false }))
  : [];


  layer.todoId = id;
  layer.todos = todos;

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


L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
  attribution: 'Tiles © Esri & contributors'
}).addTo(map);


// Set up feature group for drawn items

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
function saveToLocalStorage() {
  const data = [];
  drawnItems.eachLayer(layer => {
    if (layer instanceof L.Polygon || layer instanceof L.Rectangle) {
      data.push({
        id: layer.todoId, // ✅ include ID
        type: layer instanceof L.Rectangle ? "rectangle" : "polygon",
        coords: layer.getLatLngs(),
        todos: layer.todos
      });
    }
  });
  localStorage.setItem('fields', JSON.stringify(data));
}


function loadFromLocalStorage() {
  const data = JSON.parse(localStorage.getItem('fields') || '[]');
  data.forEach(item => {
    let layer;
    if (item.type === 'rectangle') {
      layer = L.rectangle(item.coords);
    } else {
      layer = L.polygon(item.coords);
    }

    layer.todoId = item.id;          // ✅ restore the ID
    layer.todos = item.todos || [];  // ✅ restore the todos list
    layer.bindPopup(generateChecklistHTML(item.todos, item.id));

    drawnItems.addLayer(layer);
  });
}


loadFromLocalStorage();
function toggleTask(layerId, taskIndex) {
  const data = JSON.parse(localStorage.getItem('fields') || '[]');
  const field = data.find(f => f.id === layerId);
  if (field) {
    field.todos[taskIndex].done = !field.todos[taskIndex].done;
    localStorage.setItem('fields', JSON.stringify(data));
    reloadShapes(); // update the map display
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

function reloadShapes() {
  drawnItems.clearLayers();
  loadFromLocalStorage();
}
map.on(L.Draw.Event.CREATED, function (event) {
  const layer = event.layer;
  const id = Date.now();

  const todoText = prompt("Enter tasks for this field (separate by commas):");
  const todos = todoText
    ? todoText.split(',').map(t => ({ text: t.trim(), done: false }))
    : [];

  layer.todoId = id;
  layer.todos = todos;

  layer.bindPopup(generateChecklistHTML(todos, id));
  drawnItems.addLayer(layer);
  saveToLocalStorage();
});
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
