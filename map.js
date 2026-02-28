// SAGE Egypt - Map Module
// Handles Leaflet map initialization and EE tile layers

var map;
var currentLayers = {};
var currentMarker = null;
var currentCircle = null;

function initMap() {
    map = L.map('map', {
        center: CONFIG.MAP_CENTER,
        zoom: CONFIG.MAP_ZOOM,
        zoomControl: true,
        attributionControl: false
    });

    // Add satellite base layer
    L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        attribution: '© Google'
    }).addTo(map);

    // Map click handler
    map.on('click', function (e) {
        if (window.mapClickEnabled) {
            onMapClick(e.latlng.lat, e.latlng.lng);
        }
    });

    console.log('🗺️ Map initialized');
}

// Add EE image as tile layer
function addEELayer(eeImage, visParams, name) {
    showLoading('جاري تحميل الطبقة...');

    eeImage.getMap(visParams, function (mapObj) {
        // Remove old layer with same name
        if (currentLayers[name]) {
            map.removeLayer(currentLayers[name]);
        }

        var tileLayer = L.tileLayer(mapObj.urlFormat, {
            maxZoom: 20,
            opacity: 0.7
        });

        tileLayer.addTo(map);
        currentLayers[name] = tileLayer;
        hideLoading();
    });
}

// Remove a layer by name
function removeEELayer(name) {
    if (currentLayers[name]) {
        map.removeLayer(currentLayers[name]);
        delete currentLayers[name];
    }
}

// Clear all EE layers
function clearEELayers() {
    for (var name in currentLayers) {
        map.removeLayer(currentLayers[name]);
    }
    currentLayers = {};
}

// Add a marker
function addMarker(lat, lng, label) {
    if (currentMarker) {
        map.removeLayer(currentMarker);
    }
    currentMarker = L.marker([lat, lng])
        .addTo(map)
        .bindPopup(label || '📍 الموقع المحدد')
        .openPopup();
    return currentMarker;
}

// Add a circle (buffer area) — removes previous circle first
function addBufferCircle(lat, lng, radius) {
    if (currentCircle) {
        map.removeLayer(currentCircle);
        currentCircle = null;
    }
    currentCircle = L.circle([lat, lng], {
        radius: radius,
        color: '#4CAF50',
        fillColor: '#4CAF5044',
        fillOpacity: 0.3,
        weight: 2
    }).addTo(map);
    return currentCircle;
}

// Update circle radius dynamically (called when buffer input changes)
function updateBufferCircle(radius) {
    if (currentCircle) {
        currentCircle.setRadius(radius);
    }
}

// Center map on location
function centerMap(lat, lng, zoom) {
    map.setView([lat, lng], zoom || 14);
}

// ====== Polygon Drawing (Researcher Mode) ======
var drawControl = null;
var drawnItems = new L.FeatureGroup();
var govBoundaryLayer = null;
var currentPolygonDrawer = null;

function enableDrawing() {
    if (!map) return;
    map.addLayer(drawnItems);

    if (!drawControl) {
        drawControl = new L.Control.Draw({
            draw: {
                polygon: { allowIntersection: false, shapeOptions: { color: '#FF5722', weight: 2, fillOpacity: 0.15 } },
                polyline: false, rectangle: true, circle: false, marker: false, circlemarker: false
            },
            edit: { featureGroup: drawnItems, remove: true }
        });
        map.addControl(drawControl);
    }

    // Programmatically enable the polygon drawing tool so the user doesn't have to click the small toolbar
    if (currentPolygonDrawer) {
        currentPolygonDrawer.disable();
    }
    currentPolygonDrawer = new L.Draw.Polygon(map, drawControl.options.draw.polygon);
    currentPolygonDrawer.enable();

    // Add custom Finish/Cancel UI banner
    var statusEl = document.getElementById('region-status');
    if (statusEl) {
        statusEl.innerHTML = '<div style="background:#FFF9C4; color:#F57F17; padding:8px; border-radius:4px; margin-top:5px; text-align:center;">' +
            '<b>✏️ وضع الرسم مفعل</b><br>انقر على الخريطة لرسم النقاط.<br>' +
            '<button onclick="finishPolygonDrawing()" style="background:#4CAF50; color:white; border:none; padding:4px 8px; margin-top:5px; border-radius:3px; cursor:pointer;">إنهاء ورسم الشكل</button>' +
            '</div>';
    }

    map.off(L.Draw.Event.CREATED);
    map.on(L.Draw.Event.CREATED, function (e) {
        drawnItems.clearLayers();
        drawnItems.addLayer(e.layer);
        var geojson = e.layer.toGeoJSON();
        window.drawnRegion = ee.Geometry(geojson.geometry);
        window.currentRegion = window.drawnRegion;

        // Update Researcher Mode Status
        if (statusEl) statusEl.innerHTML = '✅ 📍 تم رسم منطقة بنجاح';

        console.log('✅ Region drawn:', geojson.geometry.type);
    });
}

// Custom handler for finishing the polygon (since Leaflet Draw UI is hidden when triggered programmatically)
function finishPolygonDrawing() {
    if (currentPolygonDrawer) {
        currentPolygonDrawer.completeShape();
        currentPolygonDrawer.disable();
    }
}

function disableDrawing() {
    if (drawControl && map) {
        map.removeControl(drawControl);
        drawControl = null;
    }
    if (currentPolygonDrawer) {
        currentPolygonDrawer.disable();
        currentPolygonDrawer = null;
    }
    var statusEl = document.getElementById('region-status');
    if (statusEl && statusEl.innerHTML.indexOf('وضع الرسم مفعل') > -1) {
        statusEl.innerHTML = '';
    }
}

function clearDrawnRegion() {
    if (drawnItems) drawnItems.clearLayers();
    window.drawnRegion = null;
    window.currentRegion = null;
}

// ====== Governorate Boundary Display ======
function addGeoJsonBoundary(geojson, name) {
    if (govBoundaryLayer) {
        map.removeLayer(govBoundaryLayer);
    }
    govBoundaryLayer = L.geoJSON(geojson, {
        style: { color: '#1565C0', weight: 3, fillColor: '#1565C044', fillOpacity: 0.1, dashArray: '5,5' }
    }).addTo(map);
    return govBoundaryLayer;
}

function clearGovBoundary() {
    if (govBoundaryLayer) {
        map.removeLayer(govBoundaryLayer);
        govBoundaryLayer = null;
    }
}

function fitToBounds(geojson) {
    if (!map || !geojson) return;
    var layer = L.geoJSON(geojson);
    map.fitBounds(layer.getBounds(), { padding: [30, 30], maxZoom: 12 });
}
