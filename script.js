// Initialize map centered on Washington State
const map = L.map('map').setView([47.6062, -122.3321], 9);

// Add ESRI satellite basemap tiles
L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
  attribution: 'Tiles © Esri & contributors'
}).addTo(map);

// FeatureGroup to hold drawn items
const drawnItems = new L.FeatureGroup();
map.addLayer(drawnItems);

// Add Leaflet Draw controls for polygons and rectangles only
const drawControl = new L.Control.Draw({
  edit: {
    featureGroup: drawnItems
  },
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

// Generate checklist HTML for popup
function generateChecklistHTML(todos, id) {
  if (!Array.isArray(todos)) return "<p>No tasks found</p>";

  return `
    <div data-id="${id}">
      <ul style="list-style:none; padding-left:0;">
        ${todos.map((todo, index) => `
          <li>
            <input type="checkbox" ${todo.done ? 'checked' : ''} onchange="toggleTask(${id}, ${index})" />
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

// Save current drawn fields with todos to localStorage
function saveToLocalStorage() {
  const data = [];
  drawnItems.eachLayer(layer => {
    if (layer instanceof L.Polygon || layer instanceof L.Rectangle) {
      data.push({
        id: layer.todoId,
        type: layer instanceof L.Rectangle ? "rectangle" : "polygon",
        coords: layer.getLatLngs(),
        tod
