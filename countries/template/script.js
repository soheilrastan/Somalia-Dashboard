/**
 * R2A Dynamic Template - v4.1
 * ONE template for ALL 22 Arab countries
 *
 * URL: countries/template/index.html?country=somalia
 *
 * Keywords: R2A-SPEED, GEO-INSIGHTS-ARCH
 */

// ============================================
// VERSION AND INITIALIZATION
// ============================================
console.log(`[R2A] Dashboard v4.1: Dynamic Template System`);
console.log(`[R2A] Country: ${window.COUNTRY_CODE}`);

// ============================================
// CONFIGURATION LOADER
// ============================================

let CONFIG = null;
let REGIONS_DATA = null; // Will be loaded from config or data file

/**
 * Load country-specific configuration
 */
async function loadCountryConfig() {
    try {
        const configPath = window.PATHS.config;
        console.log(`[R2A] Loading config from: ${configPath}`);

        const response = await fetch(configPath);
        if (!response.ok) {
            throw new Error(`Config not found: ${response.status}`);
        }

        CONFIG = await response.json();
        window.COUNTRY_CONFIG = CONFIG;

        console.log(`[R2A] Config loaded for: ${CONFIG.country.name}`);

        // Update page title and header
        document.title = `Geo-Insights: ${CONFIG.country.name} Dashboard - ESCWA, UN`;

        const headerTitle = document.getElementById('headerTitle');
        if (headerTitle) {
            headerTitle.innerHTML = `Geo-Insights: ${CONFIG.country.name} Dashboard, ESCWA, UN`;
        }

        // Update logo
        const logo = document.getElementById('countryLogo');
        if (logo) {
            logo.src = `../${window.COUNTRY_CODE}/adp_logo.png`;
        }

        return CONFIG;
    } catch (error) {
        console.error('[R2A] Failed to load config:', error);
        alert(`Error loading country configuration for "${window.COUNTRY_CODE}". Please check the URL.`);
        return null;
    }
}

// ============================================
// REGION-FIRST ANALYSIS STATE MANAGEMENT
// ============================================

const layerCheckboxMapping = {
    patterns: {
        'Population': function(layerName) {
            const yearMatch = layerName.match(/Population\s+(\d{4})/);
            if (yearMatch) {
                return `pop${yearMatch[1]}Toggle`;
            }
            return null;
        },
        'Roads OSM': 'roadsOSMToggle',
        'Roads': 'roadsToggle',
        'Nightlight': 'nightlightToggle',
        'iSEE': 'iseeAnalyticsToggle'
    },

    getCheckboxId: function(layerName) {
        for (const [pattern, checkboxId] of Object.entries(this.patterns)) {
            if (layerName.includes(pattern)) {
                if (typeof checkboxId === 'function') {
                    return checkboxId(layerName);
                }
                return checkboxId;
            }
        }
        return null;
    },

    syncCheckboxOnRemove: function(layerName) {
        const checkboxId = this.getCheckboxId(layerName);
        if (checkboxId) {
            const checkbox = document.getElementById(checkboxId);
            if (checkbox) {
                checkbox.checked = false;
                console.log(`[R2A] Checkbox synced: ${checkboxId}`);

                const label = checkbox.closest('label');
                if (label) {
                    const draggableSpan = label.querySelector('[draggable="true"]');
                    if (draggableSpan) {
                        draggableSpan.classList.remove('layer-dropped');
                    }
                }
            }
        }
    }
};

const regionLockState = {
    isLocked: false,
    lockedRegion: null,
    lockedRegionLayer: null,
    loadedLayers: [],

    lock: function(regionName, regionLayer) {
        this.isLocked = true;
        this.lockedRegion = regionName;
        this.lockedRegionLayer = regionLayer;
        this.loadedLayers = [];
        console.log(`[R2A] Region locked: ${regionName}`);

        document.dispatchEvent(new CustomEvent('regionLocked', {
            detail: { region: regionName, layer: regionLayer }
        }));
    },

    unlock: function() {
        const previousRegion = this.lockedRegion;

        this.loadedLayers.forEach(layerInfo => {
            if (layerInfo.layer && map.hasLayer(layerInfo.layer)) {
                map.removeLayer(layerInfo.layer);
            }
            layerCheckboxMapping.syncCheckboxOnRemove(layerInfo.name);
        });

        this.isLocked = false;
        this.lockedRegion = null;
        this.lockedRegionLayer = null;
        this.loadedLayers = [];

        if (typeof window.resetISEEAnalytics === 'function') {
            window.resetISEEAnalytics();
        }

        console.log(`[R2A] Region unlocked: ${previousRegion}`);

        document.dispatchEvent(new CustomEvent('regionUnlocked', {
            detail: { previousRegion: previousRegion }
        }));

        return previousRegion;
    },

    addLayer: function(name, layer, type) {
        if (!this.isLocked) return false;
        this.loadedLayers.push({ name, layer, type });
        console.log(`[R2A] Layer added to ${this.lockedRegion}: ${name}`);
        return true;
    },

    removeLayer: function(name) {
        const idx = this.loadedLayers.findIndex(l => l.name === name);
        if (idx !== -1) {
            const layerInfo = this.loadedLayers[idx];
            if (layerInfo.layer && map.hasLayer(layerInfo.layer)) {
                map.removeLayer(layerInfo.layer);
            }
            this.loadedLayers.splice(idx, 1);
            console.log(`[R2A] Layer removed: ${name}`);
            layerCheckboxMapping.syncCheckboxOnRemove(name);

            if (typeof window.resetISEEAnalytics === 'function') {
                window.resetISEEAnalytics();
            }
            return true;
        }
        return false;
    },

    hasLayer: function(name) {
        return this.loadedLayers.some(l => l.name === name);
    },

    getLoadedLayerNames: function() {
        return this.loadedLayers.map(l => l.name);
    }
};

// ============================================
// MAP INITIALIZATION
// ============================================

const isMobile = window.innerWidth <= 767;
const isTablet = window.innerWidth > 767 && window.innerWidth <= 1024;

// Map will be initialized after config loads
let map = null;

// Define base layers
const darkMap = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    subdomains: 'abcd',
    maxZoom: 20
});

const satelliteMap = L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
    attribution: '&copy; Google &copy; Maxar &copy; CNES/Airbus',
    maxZoom: 22,
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
});

let currentBaseLayer = 'dark';

// ============================================
// LAYER REGISTRY
// ============================================

const layerCheckboxRegistry = new Map();

function registerLayerCheckbox(layer, checkboxId, labelId) {
    layerCheckboxRegistry.set(layer, { checkboxId, labelId });
    console.log(`[R2A] Layer registered: ${checkboxId}`);
}

function unregisterLayerCheckbox(layer) {
    layerCheckboxRegistry.delete(layer);
}

// ============================================
// COLOR FUNCTIONS (DYNAMIC BASED ON COUNTRY)
// ============================================

function getMPIColor(mpi) {
    if (mpi >= 90) return '#7f1d1d';
    if (mpi >= 80) return '#991b1b';
    if (mpi >= 70) return '#b91c1c';
    if (mpi >= 60) return '#dc2626';
    if (mpi >= 50) return '#f97316';
    if (mpi >= 40) return '#f59e0b';
    if (mpi >= 30) return '#eab308';
    if (mpi >= 20) return '#84cc16';
    if (mpi >= 10) return '#22c55e';
    return '#047857';
}

function getNightlightColor(value) {
    const normalized = Math.min(value / 6.5, 1.0);

    if (normalized <= 0.1) return '#1e1b4b';
    if (normalized <= 0.2) return '#4c1d95';
    if (normalized <= 0.3) return '#7c3aed';
    if (normalized <= 0.4) return '#a855f7';
    if (normalized <= 0.5) return '#c084fc';
    if (normalized <= 0.6) return '#e879f9';
    if (normalized <= 0.7) return '#f472b6';
    if (normalized <= 0.8) return '#fb923c';
    if (normalized <= 0.9) return '#fbbf24';
    return '#fde047';
}

function getNightlightRadius(value) {
    if (value >= 5.0) return 6;
    if (value >= 2.0) return 5;
    if (value >= 1.0) return 4;
    if (value >= 0.5) return 3;
    return 2;
}

// ============================================
// REGION STYLES
// ============================================

const regionStyles = {
    default: {
        color: '#94a3b8',
        weight: 2.5,
        opacity: 0.7,
        fillOpacity: 0,
        dashArray: '5, 5'
    },
    hover: {
        color: '#60a5fa',
        weight: 3,
        opacity: 0.9,
        fillColor: '#60a5fa',
        fillOpacity: 0.05
    },
    locked: {
        color: '#22c55e',
        weight: 4,
        opacity: 1,
        fillColor: '#22c55e',
        fillOpacity: 0.15,
        dashArray: null
    },
    lockedPulse: {
        color: '#4ade80',
        weight: 5,
        opacity: 1,
        fillColor: '#22c55e',
        fillOpacity: 0.2,
        dashArray: null
    }
};

// ============================================
// MAIN INITIALIZATION
// ============================================

var adm1Layer = null;
// Note: adm1Boundaries is declared as const in data.js
// We use a different name for dynamically loaded boundaries
var dynamicAdm1Boundaries = null;

async function initializeDashboard() {
    // 1. Load country config
    const config = await loadCountryConfig();
    if (!config) {
        console.error('[R2A] Cannot initialize without config');
        return;
    }

    // 2. Initialize map with country-specific settings
    const mapConfig = config.map || {
        center: [0, 0],
        zoom: 6,
        minZoom: 4,
        maxZoom: 18
    };

    map = L.map('map', {
        minZoom: mapConfig.minZoom,
        maxZoom: mapConfig.maxZoom
    }).setView(mapConfig.center, isMobile ? mapConfig.zoom - 1 : mapConfig.zoom);

    // Add base layer
    darkMap.addTo(map);

    // 3. Set up layer removal listener
    map.on('layerremove', function(e) {
        const info = layerCheckboxRegistry.get(e.layer);
        if (info) {
            const checkbox = document.getElementById(info.checkboxId);
            if (checkbox && checkbox.checked) {
                checkbox.checked = false;
                console.log(`[R2A] Auto-synced checkbox: ${info.checkboxId}`);
            }
            if (info.labelId) {
                const label = document.getElementById(info.labelId);
                if (label) {
                    label.classList.remove('layer-dropped');
                }
            }
        }
    });

    // 4. Block default context menu
    map.on('contextmenu', function(e) {
        L.DomEvent.preventDefault(e);
        L.DomEvent.stopPropagation(e);
    });

    map.getContainer().addEventListener('contextmenu', function(e) {
        e.preventDefault();
        e.stopPropagation();
        return false;
    });

    // 5. Load ADM1 boundaries
    await loadAdm1Boundaries();

    // 6. Create UI controls
    createLayerControl();
    createLegendControl();
    createInfoBox();

    // 7. Initialize R2A Loader (if available)
    if (typeof R2ALoader !== 'undefined') {
        window.r2aLoader = new R2ALoader(map, window.COUNTRY_CODE);
        console.log('[R2A] R2A Loader initialized');
    }

    console.log(`[R2A] Dashboard initialized for ${config.country.name}`);
}

// ============================================
// LOAD ADM1 BOUNDARIES
// ============================================

async function loadAdm1Boundaries() {
    if (!CONFIG || !CONFIG.paths || !CONFIG.paths.boundaries) {
        console.error('[R2A] Config missing boundary paths');
        return;
    }

    // Check if adm1Boundaries already loaded from data.js
    if (typeof adm1Boundaries !== 'undefined' && adm1Boundaries !== null) {
        console.log('[R2A] Using adm1Boundaries from data.js');
        dynamicAdm1Boundaries = adm1Boundaries;
    } else {
        // Load from config path
        const adm1Path = CONFIG.paths.boundaries.adm1;
        console.log(`[R2A] Loading ADM1 boundaries from: ${adm1Path}`);

        try {
            const response = await fetch(adm1Path);
            if (!response.ok) {
                throw new Error(`Failed to load boundaries: ${response.status}`);
            }
            dynamicAdm1Boundaries = await response.json();
        } catch (error) {
            console.error('[R2A] Failed to load ADM1 boundaries:', error);
            return;
        }
    }

    // Determine name field from config or use defaults
    const nameField = CONFIG.admin?.L1?.nameField || 'admin1Name' || 'name' || 'NAME';

    try {
        adm1Layer = L.geoJSON(dynamicAdm1Boundaries, {
            style: function(feature) {
                return regionStyles.default;
            },
            onEachFeature: function(feature, layer) {
                // Try multiple name field options
                const regionName = feature.properties[nameField]
                    || feature.properties.admin1Name
                    || feature.properties.name
                    || feature.properties.NAME
                    || 'Unknown';

                // Tooltip
                layer.bindTooltip('', {
                    permanent: false,
                    direction: 'center',
                    className: 'region-tooltip'
                });

                // Hover events
                layer.on('mouseover', function(e) {
                    if (regionLockState.isLocked) {
                        if (regionLockState.lockedRegion === regionName) {
                            layer.setTooltipContent(`${regionName} (LOCKED - Right-click to manage)`);
                        } else {
                            layer.setTooltipContent(`${regionName} (Unlock current region first)`);
                        }
                    } else {
                        layer.setTooltipContent(`Click to select ${regionName} for analysis`);
                    }

                    if (!regionLockState.isLocked) {
                        layer.setStyle(regionStyles.hover);
                    }
                });

                layer.on('mouseout', function(e) {
                    if (!regionLockState.isLocked) {
                        layer.setStyle(regionStyles.default);
                    } else if (regionLockState.lockedRegion === regionName) {
                        layer.setStyle(regionStyles.locked);
                    }
                });

                // Click - region locking
                layer.on('click', function(e) {
                    L.DomEvent.stopPropagation(e);
                    handleRegionClick(e, feature, layer, regionName);
                });

                // Right-click context menu
                layer.on('contextmenu', function(e) {
                    L.DomEvent.stopPropagation(e);
                    L.DomEvent.preventDefault(e);

                    if (regionLockState.isLocked && regionLockState.lockedRegion === regionName) {
                        showRegionContextMenu(e.latlng, regionName, layer);
                    }
                });
            }
        });

        adm1Layer.addTo(map);
        console.log(`[R2A] ADM1 boundaries loaded: ${dynamicAdm1Boundaries.features.length} regions`);

    } catch (error) {
        console.error('[R2A] Failed to create ADM1 layer:', error);
    }
}

// ============================================
// REGION CLICK HANDLER
// ============================================

function handleRegionClick(e, feature, layer, regionName) {
    const props = feature.properties;

    // If already locked to this region, show info
    if (regionLockState.isLocked && regionLockState.lockedRegion === regionName) {
        const loadedLayersList = regionLockState.loadedLayers.length > 0
            ? regionLockState.loadedLayers.map(l => `- ${l.name}`).join('<br>')
            : '<em>No layers loaded yet</em>';

        L.popup()
            .setLatLng(e.latlng)
            .setContent(`
                <div class="popup-header" style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);">
                    ${regionName} (Locked)
                </div>
                <div class="popup-body">
                    <div class="popup-metric">
                        <span class="metric-label">Loaded Layers:</span>
                    </div>
                    <div style="margin-left: 10px; font-size: 0.85em; color: #94a3b8;">
                        ${loadedLayersList}
                    </div>
                    <div style="margin-top: 12px; padding: 8px; background: rgba(34, 197, 94, 0.15); border-left: 3px solid #22c55e; border-radius: 5px; font-size: 0.8em;">
                        <strong>Tip:</strong> Right-click to manage layers or unlock
                    </div>
                </div>
            `)
            .openOn(map);
        return;
    }

    // If locked to different region, show warning
    if (regionLockState.isLocked && regionLockState.lockedRegion !== regionName) {
        L.popup({
            className: 'region-locked-warning-popup'
        })
            .setLatLng(e.latlng)
            .setContent(`
                <div class="popup-header" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">
                    Region Locked
                </div>
                <div class="popup-body">
                    <p style="margin: 0 0 10px 0;">
                        <strong>${regionLockState.lockedRegion}</strong> is currently selected.
                    </p>
                    <p style="margin: 0; font-size: 0.85em; color: #94a3b8;">
                        Right-click on ${regionLockState.lockedRegion} to unlock before selecting ${regionName}.
                    </p>
                </div>
            `)
            .openOn(map);
        return;
    }

    // Not locked - LOCK THIS REGION
    adm1Layer.eachLayer(function(l) {
        l.setStyle(regionStyles.default);
    });

    layer.setStyle(regionStyles.locked);
    regionLockState.lock(regionName, layer);

    // Zoom to region
    map.fitBounds(layer.getBounds(), {
        padding: [50, 50],
        maxZoom: 9
    });

    // Show confirmation popup
    L.popup({
        className: 'region-locked-popup'
    })
        .setLatLng(e.latlng)
        .setContent(`
            <div class="popup-header" style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);">
                ${regionName} Selected
            </div>
            <div class="popup-body">
                <div style="margin-top: 8px; padding: 10px; background: rgba(34, 197, 94, 0.15); border-left: 3px solid #22c55e; border-radius: 5px; font-size: 0.85em;">
                    <strong>Region locked for analysis!</strong><br>
                    <span style="color: #94a3b8;">Now drag layers from the sidebar onto this region.</span>
                </div>
            </div>
        `)
        .openOn(map);

    // Enable drag-drop
    updateDragDropState(true);
}

// ============================================
// CONTEXT MENU
// ============================================

let contextMenuPopup = null;

function showRegionContextMenu(latlng, regionName, regionLayer) {
    let layerListHTML = '';
    if (regionLockState.loadedLayers.length > 0) {
        layerListHTML = regionLockState.loadedLayers.map((layerInfo, idx) => `
            <div class="context-menu-item" data-action="remove-layer" data-layer-name="${layerInfo.name}" style="padding: 6px 12px; cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
                <span>${layerInfo.name}</span>
                <span style="color: #ef4444; font-size: 0.85em;">Remove</span>
            </div>
        `).join('');
    } else {
        layerListHTML = '<div style="padding: 8px 12px; color: #6b7280; font-style: italic;">No layers loaded</div>';
    }

    const menuContent = `
        <div class="region-context-menu" style="min-width: 220px;">
            <div style="padding: 10px 12px; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: white; font-weight: 600; border-radius: 8px 8px 0 0;">
                ${regionName}
            </div>

            <div style="border-bottom: 1px solid #374151; padding: 4px 0;">
                <div style="padding: 6px 12px; color: #9ca3af; font-size: 0.75em; text-transform: uppercase;">Loaded Layers</div>
                ${layerListHTML}
            </div>

            <div class="context-menu-item" data-action="isee-analytics" style="padding: 10px 12px; cursor: pointer; border-bottom: 1px solid #374151;">
                iSEE Analytics
            </div>

            <div class="context-menu-item" data-action="remove-all" style="padding: 10px 12px; cursor: pointer; color: #f59e0b; border-bottom: 1px solid #374151;">
                Remove All Layers
            </div>

            <div class="context-menu-item" data-action="unlock" style="padding: 10px 12px; cursor: pointer; color: #ef4444;">
                Unlock Region
            </div>
        </div>
    `;

    if (contextMenuPopup) {
        map.closePopup(contextMenuPopup);
    }

    contextMenuPopup = L.popup({
        closeButton: true,
        className: 'context-menu-popup',
        maxWidth: 280,
        autoPan: true
    })
        .setLatLng(latlng)
        .setContent(menuContent)
        .openOn(map);

    // Add click handlers
    setTimeout(() => {
        const menuItems = document.querySelectorAll('.context-menu-item');
        menuItems.forEach(item => {
            item.addEventListener('click', function(e) {
                const action = this.dataset.action;

                if (action === 'remove-layer') {
                    const layerName = this.dataset.layerName;
                    regionLockState.removeLayer(layerName);
                    showRegionContextMenu(latlng, regionName, regionLayer);
                } else if (action === 'isee-analytics') {
                    map.closePopup(contextMenuPopup);
                    triggerISEEAnalytics(regionName, regionLayer);
                } else if (action === 'remove-all') {
                    const layerNames = [...regionLockState.loadedLayers.map(l => l.name)];
                    layerNames.forEach(name => regionLockState.removeLayer(name));
                    showRegionContextMenu(latlng, regionName, regionLayer);
                } else if (action === 'unlock') {
                    map.closePopup(contextMenuPopup);
                    unlockRegion();
                }
            });

            item.addEventListener('mouseenter', function() {
                this.style.background = 'rgba(255,255,255,0.1)';
            });
            item.addEventListener('mouseleave', function() {
                this.style.background = 'transparent';
            });
        });
    }, 50);
}

// ============================================
// UNLOCK REGION
// ============================================

function unlockRegion() {
    if (!regionLockState.isLocked) return;

    const previousRegion = regionLockState.lockedRegion;
    const previousLayer = regionLockState.lockedRegionLayer;

    regionLockState.unlock();

    if (previousLayer) {
        previousLayer.setStyle(regionStyles.default);
    }

    resetLayerCheckboxes();
    updateDragDropState(false);

    // Zoom out to country view
    if (CONFIG && CONFIG.map) {
        map.setView(CONFIG.map.center, CONFIG.map.zoom);
    }

    L.popup()
        .setLatLng(map.getCenter())
        .setContent(`
            <div style="padding: 12px; text-align: center;">
                <div style="font-size: 1.5em; margin-bottom: 8px;">Unlocked</div>
                <strong>${previousRegion}</strong> unlocked<br>
                <span style="color: #6b7280; font-size: 0.85em;">All layers cleared. Select a new region to continue.</span>
            </div>
        `)
        .openOn(map);
}

function resetLayerCheckboxes() {
    const checkboxIds = [
        'nightlightToggle', 'iseeAnalyticsToggle',
        'roadsOSMToggle', 'roadsToggle'
    ];

    // Add population year checkboxes
    const popYears = CONFIG?.dataSources?.population?.years || [2015, 2020, 2025, 2030];
    popYears.forEach(year => {
        checkboxIds.push(`pop${year}Toggle`);
    });

    checkboxIds.forEach(id => {
        const checkbox = document.getElementById(id);
        if (checkbox) checkbox.checked = false;
    });

    const labels = document.querySelectorAll('.layer-dropped');
    labels.forEach(label => label.classList.remove('layer-dropped'));
}

function updateDragDropState(enabled) {
    const draggableLabels = document.querySelectorAll('[draggable="true"]');
    draggableLabels.forEach(label => {
        if (enabled) {
            label.classList.remove('drag-disabled');
            label.style.opacity = '1';
        } else {
            label.classList.add('drag-disabled');
            label.style.opacity = '0.5';
        }
    });
}

// ============================================
// ISEE ANALYTICS
// ============================================

function triggerISEEAnalytics(regionName, regionLayer) {
    console.log(`[R2A] Triggering iSEE Analytics for ${regionName}`);

    // Check if runISEEAnalytics is available
    if (typeof runISEEAnalytics === 'function') {
        const layerRefs = {
            dynamicLayers: {},
            loadedLayersList: regionLockState.loadedLayers,
            regionLayer: regionLayer,
            targetRegion: regionName
        };

        // Build dynamic layers from loaded layers
        regionLockState.loadedLayers.forEach(layerInfo => {
            const safeKey = layerInfo.name.toLowerCase().replace(/\s+/g, '_');
            layerRefs.dynamicLayers[safeKey] = {
                active: true,
                layer: layerInfo.layer,
                data: layerInfo.layer?.toGeoJSON ? layerInfo.layer.toGeoJSON() : null
            };
        });

        runISEEAnalytics({}, map, layerRefs, regionName);
    } else {
        console.warn('[R2A] iSEE Analytics module not loaded');
        L.popup()
            .setLatLng(map.getCenter())
            .setContent('<div style="padding: 10px;">iSEE Analytics module loading...</div>')
            .openOn(map);
    }
}

// ============================================
// UI CONTROLS (Created Dynamically)
// ============================================

function createLayerControl() {
    const LayerControl = L.Control.extend({
        options: { position: 'topleft' },
        onAdd: function(map) {
            const container = L.DomUtil.create('div', 'layer-control leaflet-bar');

            // Build layer options based on config
            const popYears = CONFIG?.dataSources?.population?.years || [2015, 2020, 2025, 2030];

            let popCheckboxes = popYears.map(year => `
                <label id="pop${year}Label" draggable="true" style="cursor: grab;">
                    <input type="checkbox" id="pop${year}Toggle">
                    <span class="drag-handle" style="margin-right: 4px; opacity: 0.3;">&#9776;</span>
                    Population ${year}
                </label>
            `).join('');

            container.innerHTML = `
                <div class="layer-header" style="display: flex; justify-content: space-between; align-items: center; cursor: pointer; margin-bottom: 10px;">
                    <div style="color: #0ea5e9; font-weight: bold;">Layers</div>
                    <span style="font-size: 1.2em; transition: transform 0.2s;">&#9660;</span>
                </div>
                <div class="layer-content">
                    <div style="color: #94a3b8; font-size: 0.75em; margin-bottom: 5px; text-transform: uppercase;">Base Map</div>
                    <label>
                        <input type="radio" name="baseLayer" value="dark" checked> Dark Map
                    </label>
                    <label>
                        <input type="radio" name="baseLayer" value="satellite"> Satellite
                    </label>

                    <hr style="border-color: #334155; margin: 10px 0;">

                    <div style="color: #94a3b8; font-size: 0.75em; margin-bottom: 5px; text-transform: uppercase;">Population (WorldPop)</div>
                    ${popCheckboxes}

                    <hr style="border-color: #334155; margin: 10px 0;">

                    <div style="color: #94a3b8; font-size: 0.75em; margin-bottom: 5px; text-transform: uppercase;">Roads (OSM)</div>
                    <label id="roadsOSMLabel" draggable="true" style="cursor: grab;">
                        <input type="checkbox" id="roadsOSMToggle">
                        <span class="drag-handle" style="margin-right: 4px; opacity: 0.3;">&#9776;</span>
                        Roads OSM Latest
                    </label>

                    <hr style="border-color: #334155; margin: 10px 0;">

                    <div style="color: #94a3b8; font-size: 0.75em; margin-bottom: 5px; text-transform: uppercase;">Analytics</div>
                    <label id="iseeAnalyticsLabel" draggable="true" style="cursor: grab;">
                        <input type="checkbox" id="iseeAnalyticsToggle">
                        <span class="drag-handle" style="margin-right: 4px; opacity: 0.3;">&#9776;</span>
                        iSEE Analytics
                    </label>
                </div>
            `;

            // Prevent map interaction when clicking control
            L.DomEvent.disableClickPropagation(container);
            L.DomEvent.disableScrollPropagation(container);

            // Base layer radio buttons
            const radios = container.querySelectorAll('input[name="baseLayer"]');
            radios.forEach(radio => {
                radio.addEventListener('change', function() {
                    if (this.value === 'dark') {
                        map.removeLayer(satelliteMap);
                        map.addLayer(darkMap);
                        currentBaseLayer = 'dark';
                    } else {
                        map.removeLayer(darkMap);
                        map.addLayer(satelliteMap);
                        currentBaseLayer = 'satellite';
                    }
                });
            });

            // Collapsible header
            const header = container.querySelector('.layer-header');
            header.addEventListener('click', function() {
                container.classList.toggle('collapsed');
                const arrow = header.querySelector('span');
                if (container.classList.contains('collapsed')) {
                    arrow.style.transform = 'rotate(-90deg)';
                } else {
                    arrow.style.transform = 'rotate(0deg)';
                }
            });

            return container;
        }
    });

    new LayerControl().addTo(map);
}

function createLegendControl() {
    const LegendControl = L.Control.extend({
        options: { position: 'topright' },
        onAdd: function(map) {
            const container = L.DomUtil.create('div', 'legend leaflet-bar');

            container.innerHTML = `
                <div class="legend-header" style="display: flex; justify-content: space-between; align-items: center; cursor: pointer; margin-bottom: 10px;">
                    <div class="legend-title">Legend</div>
                    <span style="font-size: 1.2em; transition: transform 0.2s;">&#9660;</span>
                </div>
                <div class="legend-content">
                    <div style="color: #94a3b8; font-size: 0.75em; margin-bottom: 5px;">POPULATION DENSITY</div>
                    <div class="population-gradient"></div>
                    <div style="display: flex; justify-content: space-between; font-size: 0.7em; color: #94a3b8; margin-bottom: 15px;">
                        <span>Low</span>
                        <span>High</span>
                    </div>

                    <div style="color: #94a3b8; font-size: 0.75em; margin-bottom: 5px;">NIGHTLIGHT INTENSITY</div>
                    <div class="gradient-bar"></div>
                    <div style="display: flex; justify-content: space-between; font-size: 0.7em; color: #94a3b8;">
                        <span>0 nW</span>
                        <span>6.5+ nW</span>
                    </div>
                </div>
            `;

            L.DomEvent.disableClickPropagation(container);
            L.DomEvent.disableScrollPropagation(container);

            // Collapsible
            const header = container.querySelector('.legend-header');
            header.addEventListener('click', function() {
                container.classList.toggle('collapsed');
                const arrow = header.querySelector('span');
                if (container.classList.contains('collapsed')) {
                    arrow.style.transform = 'rotate(-90deg)';
                } else {
                    arrow.style.transform = 'rotate(0deg)';
                }
            });

            return container;
        }
    });

    new LegendControl().addTo(map);
}

function createInfoBox() {
    const InfoControl = L.Control.extend({
        options: { position: 'topright' },
        onAdd: function(map) {
            const container = L.DomUtil.create('div', 'info-box leaflet-bar');

            const countryName = CONFIG?.country?.name || window.COUNTRY_CODE;
            const adminInfo = CONFIG?.admin || {};

            container.innerHTML = `
                <div class="info-header" style="display: flex; justify-content: space-between; align-items: center; cursor: pointer; margin-bottom: 10px;">
                    <div class="info-title">Data Summary</div>
                    <span style="font-size: 1.2em; transition: transform 0.2s;">&#9660;</span>
                </div>
                <div class="info-content">
                    <div class="info-text">
                        <strong>Country:</strong> ${countryName}<br>
                        <strong>Regions (L1):</strong> ${adminInfo.L1?.count || 'N/A'}<br>
                        <strong>Districts (L2):</strong> ${adminInfo.L2?.count || 'N/A'}<br>
                        <br>
                        <strong>Data Sources:</strong><br>
                        - Population: WorldPop 1km<br>
                        - Roads: OpenStreetMap<br>
                        - Nightlight: VIIRS DNB<br>
                        <br>
                        <strong>R2A Architecture v4.1</strong><br>
                        <span style="color: #22c55e;">Fast tile loading enabled</span>
                    </div>
                </div>
            `;

            L.DomEvent.disableClickPropagation(container);
            L.DomEvent.disableScrollPropagation(container);

            // Collapsible
            const header = container.querySelector('.info-header');
            header.addEventListener('click', function() {
                container.classList.toggle('collapsed');
                const arrow = header.querySelector('span');
                if (container.classList.contains('collapsed')) {
                    arrow.style.transform = 'rotate(-90deg)';
                } else {
                    arrow.style.transform = 'rotate(0deg)';
                }
            });

            return container;
        }
    });

    new InfoControl().addTo(map);
}

// ============================================
// STARTUP
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('[R2A] DOM loaded, initializing dashboard...');
    initializeDashboard();
});

// Export for global access
window.regionLockState = regionLockState;
window.initializeDashboard = initializeDashboard;
