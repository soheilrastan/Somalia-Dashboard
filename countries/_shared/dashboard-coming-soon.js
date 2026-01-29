/**
 * Geo-Insights Dashboard - Coming Soon Version
 * Matches Somalia's exact UI layout and structure
 *
 * Shows the full dashboard structure with satellite map and "Regional Analysis Coming Soon" message
 * All UI elements present in same positions as Somalia but with placeholder content
 *
 * Version: 4.1
 * Keywords: GEO-INSIGHTS-ARCH, R2A-SPEED
 */

// ============================================
// CONFIGURATION
// ============================================

// COUNTRY is set by the country's index.html before this script loads
const COUNTRY_CODE = window.COUNTRY_CODE || 'unknown';
const COUNTRY_NAME = window.COUNTRY_NAME || 'Unknown Country';
const COUNTRY_NAME_AR = window.COUNTRY_NAME_AR || '';
const COUNTRY_FLAG = window.COUNTRY_FLAG || '🌍';
const COUNTRY_CENTER = window.COUNTRY_CENTER || [20, 45];
const COUNTRY_ZOOM = window.COUNTRY_ZOOM || 5;
const COUNTRY_BOUNDS = window.COUNTRY_BOUNDS || null;

console.log(`🌍 Geo-Insights Dashboard: ${COUNTRY_NAME} (Coming Soon)`);

// ============================================
// MAP INITIALIZATION
// ============================================

const isMobile = window.innerWidth <= 767;
const isTablet = window.innerWidth > 767 && window.innerWidth <= 1024;

const map = L.map('map', {
    minZoom: 3,
    maxZoom: 18
}).setView(COUNTRY_CENTER, isMobile ? COUNTRY_ZOOM - 1 : COUNTRY_ZOOM);

// Define base layers
const satelliteMap = L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
    attribution: '&copy; Google &copy; Maxar &copy; CNES/Airbus',
    maxZoom: 22
});

const darkMap = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    subdomains: 'abcd',
    maxZoom: 20
});

// Start with satellite for Coming Soon countries
satelliteMap.addTo(map);
let currentBaseLayer = 'satellite';

// Fit to country bounds if provided
if (COUNTRY_BOUNDS) {
    map.fitBounds(COUNTRY_BOUNDS, { padding: [20, 20] });
}

// ============================================
// TOP LEFT: LAYERS + GEO-AI INSIGHTS (Side by Side)
// ============================================

const combinedControl = L.control({position: 'topleft'});
combinedControl.onAdd = function() {
    const wrapper = L.DomUtil.create('div', 'controls-wrapper');
    wrapper.style.display = 'flex';
    wrapper.style.gap = '10px';

    // Create Layer Control div (collapsed by default)
    const layerDiv = L.DomUtil.create('div', 'layer-control collapsed', wrapper);

    layerDiv.innerHTML = `
        <div class="layer-header" style="color: #10b981; font-weight: bold; margin-bottom: 8px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; white-space: nowrap; overflow: hidden;">
            <span style="overflow: hidden; text-overflow: ellipsis;">🗺️ Layers</span>
            <span class="layer-toggle-icon" style="font-size: 1.2em; flex-shrink: 0;">▶</span>
        </div>
        <div class="layer-content">
            <div style="margin-bottom: 10px; padding-bottom: 10px; border-bottom: 2px solid #334155;">
                <label style="font-weight: bold; color: #10b981;">
                    <input type="checkbox" id="satelliteToggle" checked> 🛰️ Satellite Imagery
                </label>
            </div>

            <label style="color: #6b7280;"><input type="checkbox" disabled> Multidimensional Poverty Index <span style="color: #fbbf24; font-style: italic; font-size: 0.8em;">(Coming Soon)</span></label>
            <label style="color: #6b7280;"><input type="checkbox" disabled> 💡 Nightlight Points <span style="color: #fbbf24; font-style: italic; font-size: 0.8em;">(Coming Soon)</span></label>

            <!-- Roads Infrastructure -->
            <div style="margin-top: 12px; border-left: 3px solid #3b82f6; padding-left: 10px;">
                <label style="font-weight: bold; color: #3b82f6; font-size: 1em; display: block; margin-bottom: 8px;">
                    🛣️ Roads Infrastructure (OSM/HDX)
                </label>
                <div style="margin-left: 8px; padding: 8px; background: rgba(107, 114, 128, 0.08); border-radius: 4px;">
                    <div style="font-size: 0.9em; color: #6b7280; font-style: italic;">
                        Data layers coming soon
                    </div>
                </div>
            </div>

            <!-- Population -->
            <div style="margin-top: 12px; border-left: 3px solid #EC407A; padding-left: 10px;">
                <label style="font-weight: bold; color: #EC407A; font-size: 1em; display: block; margin-bottom: 8px;">
                    👶 Population (WorldPop)
                </label>
                <div style="margin-left: 8px; padding: 8px; background: rgba(107, 114, 128, 0.08); border-radius: 4px;">
                    <div style="font-size: 0.9em; color: #6b7280; font-style: italic;">
                        Data layers coming soon
                    </div>
                </div>
            </div>
        </div>
    `;

    // Create Geo-AI Insights div (collapsed by default)
    const aiDiv = L.DomUtil.create('div', 'ai-insights-control collapsed', wrapper);

    aiDiv.innerHTML = `
        <div class="ai-header" style="color: #f59e0b; font-weight: bold; margin-bottom: 8px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; white-space: nowrap; overflow: hidden;">
            <span>🧠 Geo-AI Insights</span>
            <span class="ai-toggle-icon" style="font-size: 1.2em; flex-shrink: 0;">▶</span>
        </div>
        <div class="ai-content">
            <div style="padding: 15px; text-align: center; background: rgba(245, 158, 11, 0.1); border-radius: 8px; border: 1px solid rgba(245, 158, 11, 0.3);">
                <div style="font-size: 2em; margin-bottom: 10px;">🚧</div>
                <div style="color: #fbbf24; font-weight: bold; margin-bottom: 5px;">Coming Soon</div>
                <div style="color: #94a3b8; font-size: 0.85em;">
                    iSEE Analytics will be<br>available when data is ready
                </div>
            </div>
        </div>
    `;

    // Layer control collapse handler
    const layerHeader = layerDiv.querySelector('.layer-header');
    const layerContent = layerDiv.querySelector('.layer-content');
    layerHeader.addEventListener('click', function(e) {
        e.stopPropagation();
        layerDiv.classList.toggle('collapsed');
        const icon = this.querySelector('.layer-toggle-icon');
        if (icon) {
            icon.textContent = layerDiv.classList.contains('collapsed') ? '▶' : '▼';
        }
    });

    // AI Insights collapse handler
    const aiHeader = aiDiv.querySelector('.ai-header');
    const aiContent = aiDiv.querySelector('.ai-content');
    aiHeader.addEventListener('click', function(e) {
        e.stopPropagation();
        aiDiv.classList.toggle('collapsed');
        const icon = this.querySelector('.ai-toggle-icon');
        if (icon) {
            icon.textContent = aiDiv.classList.contains('collapsed') ? '▶' : '▼';
        }
    });

    // Satellite toggle handler
    setTimeout(() => {
        const satToggle = document.getElementById('satelliteToggle');
        if (satToggle) {
            satToggle.addEventListener('change', function(e) {
                if (e.target.checked) {
                    map.removeLayer(darkMap);
                    map.addLayer(satelliteMap);
                    currentBaseLayer = 'satellite';
                } else {
                    map.removeLayer(satelliteMap);
                    map.addLayer(darkMap);
                    currentBaseLayer = 'dark';
                }
            });
        }
    }, 100);

    L.DomEvent.disableClickPropagation(wrapper);
    L.DomEvent.disableScrollPropagation(wrapper);

    return wrapper;
};
combinedControl.addTo(map);

// ============================================
// TOP RIGHT: CONCEPTS + SYMBOLOGY (Stacked)
// ============================================

// Concepts, Sources, and Methods
const infoBox = L.control({position: 'topright'});
infoBox.onAdd = function() {
    const div = L.DomUtil.create('div', 'info-box collapsed');
    div.style.width = isMobile ? '100%' : '255px';
    div.style.maxHeight = isMobile ? '40vh' : '70vh';
    div.style.overflowY = 'auto';
    div.style.position = isMobile ? 'relative' : 'absolute';
    div.style.top = isMobile ? 'auto' : '0px';
    div.style.right = isMobile ? 'auto' : '265px';

    div.innerHTML = `
        <div class="info-header" style="color: #10b981; font-weight: bold; margin-bottom: 8px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; white-space: nowrap; overflow: hidden;">
            <span style="overflow: hidden; text-overflow: ellipsis;">📚 Concepts, Sources, and Methods</span>
            <span class="info-toggle-icon" style="font-size: 1.2em; flex-shrink: 0;">▶</span>
        </div>
        <div class="info-content">
            <div class="info-title" style="margin-top: 5px; font-size: 1em; color: #0ea5e9; font-weight: 600;">📋 Sources</div>
            <div class="info-text" style="line-height: 1.3; margin-bottom: 15px; color: #94a3b8;">
                Data sources will be documented<br>when dashboard is fully implemented.
            </div>

            <div class="info-title" style="margin-top: 5px; font-size: 1em; color: #0ea5e9; font-weight: 600;">📊 Summary</div>
            <div class="info-text" style="margin-bottom: 10px; padding-bottom: 10px; border-bottom: 2px solid #334155; line-height: 1.3; color: #94a3b8;">
                <strong>Country:</strong> ${COUNTRY_NAME}<br>
                <strong>Status:</strong> <span style="color: #f59e0b;">Coming Soon</span><br>
                <strong>Available:</strong> Satellite imagery only
            </div>
        </div>
    `;

    // Collapse handler
    const infoHeader = div.querySelector('.info-header');
    infoHeader.addEventListener('click', function(e) {
        e.stopPropagation();
        div.classList.toggle('collapsed');
        const icon = this.querySelector('.info-toggle-icon');
        if (icon) {
            icon.textContent = div.classList.contains('collapsed') ? '▶' : '▼';
        }
    });

    L.DomEvent.disableClickPropagation(div);
    L.DomEvent.disableScrollPropagation(div);

    return div;
};
infoBox.addTo(map);

// Symbology
const symbologyBox = L.control({position: 'topright'});
symbologyBox.onAdd = function() {
    const div = L.DomUtil.create('div', 'symbology-box collapsed');
    div.style.marginTop = '10px';

    div.innerHTML = `
        <div class="symbology-header" style="color: #f59e0b; font-weight: bold; margin-bottom: 8px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; white-space: nowrap; overflow: hidden;">
            <span style="overflow: hidden; text-overflow: ellipsis;">🎨 Symbology</span>
            <span class="symbology-toggle-icon" style="font-size: 1.2em; flex-shrink: 0;">▶</span>
        </div>
        <div class="symbology-content">
            <div style="padding: 15px; text-align: center; color: #94a3b8;">
                Symbology legend will appear<br>when data layers are available
            </div>
        </div>
    `;

    // Collapse handler
    const symbologyHeader = div.querySelector('.symbology-header');
    symbologyHeader.addEventListener('click', function(e) {
        e.stopPropagation();
        div.classList.toggle('collapsed');
        const icon = this.querySelector('.symbology-toggle-icon');
        if (icon) {
            icon.textContent = div.classList.contains('collapsed') ? '▶' : '▼';
        }
    });

    L.DomEvent.disableClickPropagation(div);
    L.DomEvent.disableScrollPropagation(div);

    return div;
};
symbologyBox.addTo(map);

// ============================================
// BOTTOM LEFT: MEASURE DISTANCE + CLEAR
// ============================================

const measureBtn = L.control({position: 'bottomleft'});
measureBtn.onAdd = function() {
    const div = L.DomUtil.create('div', 'measure-button-container');
    div.style.position = 'absolute';
    div.style.bottom = '12px';
    div.style.left = '90px';
    div.style.zIndex = '1000';
    div.style.display = 'flex';
    div.style.gap = '10px';
    div.innerHTML = `
        <button id="measureBtn" style="
            background: rgba(14, 165, 233, 0.95);
            color: white;
            border: 2px solid #0ea5e9;
            padding: 10px 15px;
            border-radius: 8px;
            cursor: pointer;
            font-weight: bold;
            font-size: 0.9em;
            box-shadow: 0 4px 6px rgba(0,0,0,0.3);
            transition: all 0.3s;
            white-space: nowrap;
        ">📏 Measure Distance</button>
        <button id="clearMeasureBtn" style="
            background: rgba(127, 29, 29, 0.95);
            color: white;
            border: 2px solid #7f1d1d;
            padding: 10px 15px;
            border-radius: 8px;
            cursor: pointer;
            font-weight: bold;
            font-size: 0.9em;
            box-shadow: 0 4px 6px rgba(0,0,0,0.3);
            transition: all 0.3s;
            white-space: nowrap;
        ">🗑️ Clear</button>
    `;

    L.DomEvent.disableClickPropagation(div);
    L.DomEvent.disableScrollPropagation(div);

    return div;
};
measureBtn.addTo(map);

// ============================================
// MEASURE FUNCTIONALITY
// ============================================

let measureActive = false;
let measurePoints = [];
let measureLines = [];
let measureMarkers = [];

function activateMeasure() {
    measureActive = true;
    document.getElementById('measureBtn').style.background = 'rgba(34, 197, 94, 0.95)';
    document.getElementById('measureBtn').style.borderColor = '#22c55e';
    document.getElementById('measureBtn').innerHTML = '📏 Measuring... (click to add points)';
    map.getContainer().style.cursor = 'crosshair';
}

function deactivateMeasure() {
    measureActive = false;
    document.getElementById('measureBtn').style.background = 'rgba(14, 165, 233, 0.95)';
    document.getElementById('measureBtn').style.borderColor = '#0ea5e9';
    document.getElementById('measureBtn').innerHTML = '📏 Measure Distance';
    map.getContainer().style.cursor = '';
}

function clearMeasure() {
    measureLines.forEach(line => map.removeLayer(line));
    measureMarkers.forEach(marker => map.removeLayer(marker));
    measureLines = [];
    measureMarkers = [];
    measurePoints = [];
}

function formatDistance(meters) {
    if (meters < 1000) {
        return meters.toFixed(0) + ' m';
    } else {
        return (meters / 1000).toFixed(2) + ' km';
    }
}

// Measure button handlers
setTimeout(() => {
    document.getElementById('measureBtn').addEventListener('click', function(e) {
        e.stopPropagation();
        if (measureActive) {
            deactivateMeasure();
        } else {
            activateMeasure();
        }
    });

    document.getElementById('clearMeasureBtn').addEventListener('click', function(e) {
        e.stopPropagation();
        clearMeasure();
        if (measureActive) {
            deactivateMeasure();
        }
    });
}, 100);

// Map click for measuring
map.on('click', function(e) {
    if (!measureActive) return;

    const latlng = e.latlng;
    measurePoints.push(latlng);

    // Add marker
    const marker = L.circleMarker(latlng, {
        radius: 6,
        fillColor: '#22c55e',
        color: '#fff',
        weight: 2,
        fillOpacity: 1
    }).addTo(map);
    measureMarkers.push(marker);

    // Draw line if we have 2+ points
    if (measurePoints.length >= 2) {
        const lastTwo = measurePoints.slice(-2);
        const line = L.polyline(lastTwo, {
            color: '#22c55e',
            weight: 3,
            dashArray: '10, 10'
        }).addTo(map);
        measureLines.push(line);

        // Calculate and show distance
        const distance = lastTwo[0].distanceTo(lastTwo[1]);
        const midpoint = L.latLng(
            (lastTwo[0].lat + lastTwo[1].lat) / 2,
            (lastTwo[0].lng + lastTwo[1].lng) / 2
        );

        const label = L.marker(midpoint, {
            icon: L.divIcon({
                className: 'measure-label',
                html: `<div style="background: rgba(0,0,0,0.8); color: #22c55e; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; white-space: nowrap;">${formatDistance(distance)}</div>`,
                iconSize: [80, 20],
                iconAnchor: [40, 10]
            })
        }).addTo(map);
        measureMarkers.push(label);
    }
});

// Double-click to finish measuring
map.on('dblclick', function(e) {
    if (!measureActive) return;
    L.DomEvent.stopPropagation(e);
    deactivateMeasure();
});

// ============================================
// BOTTOM RIGHT: CLEAR CACHE
// ============================================

const clearCacheBtn = L.control({position: 'bottomright'});
clearCacheBtn.onAdd = function() {
    const div = L.DomUtil.create('div', 'clear-cache-container');
    div.style.marginBottom = '5px';
    div.innerHTML = `
        <button id="clearCacheBtn" style="
            background: rgba(168, 85, 247, 0.95);
            color: white;
            border: 2px solid #a855f7;
            padding: 8px 12px;
            border-radius: 8px;
            cursor: pointer;
            font-weight: bold;
            font-size: 0.8em;
            box-shadow: 0 4px 6px rgba(0,0,0,0.3);
            transition: all 0.3s;
            white-space: nowrap;
        " title="Clear browser cache and reload the page">
            🔄 Clear Cache
        </button>
    `;

    L.DomEvent.disableClickPropagation(div);
    L.DomEvent.disableScrollPropagation(div);

    return div;
};
clearCacheBtn.addTo(map);

// Clear cache button handler
setTimeout(() => {
    const btn = document.getElementById('clearCacheBtn');
    if (btn) {
        btn.addEventListener('click', function() {
            this.innerHTML = '⏳ Clearing...';
            this.disabled = true;

            if ('caches' in window) {
                caches.keys().then(function(names) {
                    for (let name of names) {
                        caches.delete(name);
                    }
                });
            }

            try {
                localStorage.clear();
                sessionStorage.clear();
            } catch(e) {
                console.log('Storage clear failed:', e);
            }

            setTimeout(function() {
                window.location.reload(true);
            }, 500);
        });

        btn.addEventListener('mouseenter', function() {
            this.style.background = 'rgba(168, 85, 247, 1)';
            this.style.transform = 'scale(1.05)';
        });

        btn.addEventListener('mouseleave', function() {
            this.style.background = 'rgba(168, 85, 247, 0.95)';
            this.style.transform = 'scale(1)';
        });
    }
}, 500);

// ============================================
// BOTTOM CENTER: INTEGRATED COMING SOON + BACK BUTTON
// ============================================

const hint = document.createElement('div');
hint.className = 'select-region-hint';
hint.id = 'selectRegionHint';
hint.style.cssText = `
    position: fixed;
    bottom: 30px;
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%);
    color: white;
    padding: 12px 24px;
    border-radius: 10px;
    font-size: 0.95em;
    z-index: 1000;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
    border: 1px solid rgba(245, 158, 11, 0.4);
    display: flex;
    align-items: center;
    gap: 20px;
`;
hint.innerHTML = `
    <a href="../../country-selector.html" style="
        color: #0ea5e9;
        text-decoration: none;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        background: rgba(14, 165, 233, 0.15);
        border-radius: 6px;
        border: 1px solid rgba(14, 165, 233, 0.3);
        transition: all 0.2s;
    " onmouseover="this.style.background='rgba(14, 165, 233, 0.25)'" onmouseout="this.style.background='rgba(14, 165, 233, 0.15)'">
        <span>←</span> Countries
    </a>
    <span style="color: #94a3b8;">|</span>
    <span style="display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 1.2em;">${COUNTRY_FLAG}</span>
        <span style="color: #f59e0b; font-weight: 600;">${COUNTRY_NAME}</span>
        <span style="color: #64748b;">—</span>
        <span style="color: #fbbf24;">Regional Analysis Coming Soon</span>
    </span>
`;
document.body.appendChild(hint);

console.log(`✅ ${COUNTRY_NAME} dashboard loaded (Coming Soon mode)`);
