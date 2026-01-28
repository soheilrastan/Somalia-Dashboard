/**
 * Layer Registry Module
 * =====================
 * Manages dynamic registration of downloaded/processed layers.
 * Automatically places new layers under correct thematic categories.
 *
 * Usage:
 *   LayerRegistry.init(map, adm1Layer, allRegionLayers);
 *   LayerRegistry.registerDownloadedLayer(config);
 *   LayerRegistry.getLayersByThematic('roads');
 */

const LayerRegistry = (function() {
    'use strict';

    // Module state
    let _map = null;
    let _adm1Layer = null;
    let _allRegionLayers = {};
    let _registeredLayers = {};
    let _thematicContainers = {};

    // Thematic categories and their colors
    const THEMATICS = {
        roads: {
            name: 'Roads Infrastructure',
            color: '#3b82f6',
            icon: '🛣️',
            containerId: 'roadsThematicContainer'
        },
        population: {
            name: 'Population',
            color: '#EC407A',
            icon: '👥',
            containerId: 'populationThematicContainer'
        },
        nightlight: {
            name: 'Nightlight',
            color: '#fbbf24',
            icon: '💡',
            containerId: 'nightlightThematicContainer'
        },
        boundaries: {
            name: 'Boundaries',
            color: '#10b981',
            icon: '📍',
            containerId: 'boundariesThematicContainer'
        },
        environment: {
            name: 'Environment',
            color: '#22c55e',
            icon: '🌿',
            containerId: 'environmentThematicContainer'
        },
        health: {
            name: 'Health',
            color: '#ef4444',
            icon: '🏥',
            containerId: 'healthThematicContainer'
        },
        education: {
            name: 'Education',
            color: '#8b5cf6',
            icon: '🎓',
            containerId: 'educationThematicContainer'
        }
    };

    // ========================================
    // INITIALIZATION
    // ========================================

    function init(map, adm1Layer, allRegionLayers) {
        _map = map;
        _adm1Layer = adm1Layer;
        _allRegionLayers = allRegionLayers || {};

        // Load previously registered layers from localStorage
        _loadPersistedLayers();

        console.log('[LayerRegistry] Initialized');
    }

    // ========================================
    // LAYER REGISTRATION
    // ========================================

    /**
     * Register a newly downloaded/processed layer
     * @param {Object} config - Layer configuration
     * @param {string} config.id - Unique layer ID (e.g., 'roads_2024_07_23')
     * @param {string} config.name - Display name (e.g., 'Roads 2024 (July)')
     * @param {string} config.thematic - Thematic category ('roads', 'population', etc.)
     * @param {string} config.folder - Data folder path
     * @param {string} config.date - Version date (YYYY-MM-DD)
     * @param {string} config.color - Theme color (hex)
     * @param {string} config.source - Data source description
     * @param {number} config.featureCount - Number of features
     */
    function registerDownloadedLayer(config) {
        const { id, name, thematic, folder, date, color, source, featureCount } = config;

        if (!id || !thematic || !folder) {
            console.error('[LayerRegistry] Invalid config: id, thematic, and folder required');
            return false;
        }

        // Check if already registered
        if (_registeredLayers[id]) {
            console.log(`[LayerRegistry] Layer ${id} already registered, updating...`);
        }

        // Create layer entry
        const layerEntry = {
            id,
            name: name || `${thematic} ${date}`,
            thematic,
            folder,
            date: date || new Date().toISOString().split('T')[0],
            color: color || THEMATICS[thematic]?.color || '#6b7280',
            source: source || 'Unknown',
            featureCount: featureCount || 0,
            toggleId: `${id}Toggle`,
            labelId: `${id}Label`,
            isActive: false,
            leafletLayer: null,
            activeRegion: null,
            registeredAt: new Date().toISOString()
        };

        _registeredLayers[id] = layerEntry;

        // Add to UI
        _addLayerToUI(layerEntry);

        // Persist to localStorage
        _persistLayers();

        console.log(`[LayerRegistry] Registered layer: ${id}`);
        return true;
    }

    /**
     * Unregister a layer
     */
    function unregisterLayer(layerId) {
        if (_registeredLayers[layerId]) {
            // Remove from map if active
            const layer = _registeredLayers[layerId];
            if (layer.leafletLayer && _map.hasLayer(layer.leafletLayer)) {
                _map.removeLayer(layer.leafletLayer);
            }

            // Remove from UI
            _removeLayerFromUI(layerId);

            // Remove from registry
            delete _registeredLayers[layerId];

            // Persist changes
            _persistLayers();

            console.log(`[LayerRegistry] Unregistered layer: ${layerId}`);
        }
    }

    // ========================================
    // UI MANAGEMENT
    // ========================================

    function _addLayerToUI(layerEntry) {
        const { id, name, thematic, color, date, folder, featureCount } = layerEntry;

        // Find or create thematic container
        let container = _getOrCreateThematicContainer(thematic);
        if (!container) {
            console.error(`[LayerRegistry] Could not find/create container for ${thematic}`);
            return;
        }

        // Check if layer already exists in UI
        if (document.getElementById(layerEntry.labelId)) {
            console.log(`[LayerRegistry] Layer ${id} already in UI`);
            return;
        }

        // Create layer HTML element
        const layerDiv = document.createElement('div');
        layerDiv.id = `${id}Container`;
        layerDiv.className = 'registry-layer-item';
        layerDiv.style.cssText = `
            margin-bottom: 6px;
            padding: 6px;
            background: ${color}15;
            border-left: 3px solid ${color};
            border-radius: 4px;
        `;

        layerDiv.innerHTML = `
            <label style="font-size: 0.85em; color: ${color}; display: flex; align-items: center; gap: 6px; cursor: pointer;">
                <input type="checkbox" id="${layerEntry.toggleId}">
                <span id="${layerEntry.labelId}"
                      class="ddr-layer-label"
                      data-layer="${id}"
                      data-folder="${folder}"
                      draggable="true"
                      style="cursor: grab; user-select: none; display: inline-flex; align-items: center; gap: 4px;">
                    <span style="opacity: 0.5;">⋮⋮</span>
                    <span>🗓️ ${name}</span>
                </span>
            </label>
            <div style="margin-left: 22px; font-size: 0.7em; color: #6b7280;">
                ${date} | ${featureCount ? featureCount.toLocaleString() + ' features' : 'Click to load'}
            </div>
        `;

        // Insert into container (sorted by date, newest first)
        _insertSortedByDate(container, layerDiv, date);

        // Set up event handlers
        _setupLayerEventHandlers(layerEntry);
    }

    function _removeLayerFromUI(layerId) {
        const container = document.getElementById(`${layerId}Container`);
        if (container) {
            container.remove();
        }
    }

    function _getOrCreateThematicContainer(thematic) {
        const thematicInfo = THEMATICS[thematic];
        if (!thematicInfo) {
            console.warn(`[LayerRegistry] Unknown thematic: ${thematic}`);
            return null;
        }

        // Check if container already exists
        let container = document.getElementById(thematicInfo.containerId);
        if (container) {
            return container.querySelector('.thematic-layers-list') || container;
        }

        // Find the layer content area
        const layerContent = document.querySelector('.layer-content');
        if (!layerContent) {
            console.error('[LayerRegistry] Could not find .layer-content');
            return null;
        }

        // For roads, find the existing roads section
        if (thematic === 'roads') {
            // Look for existing roads infrastructure container
            const roadsContainer = layerContent.querySelector('[style*="border-left: 3px solid #3b82f6"]');
            if (roadsContainer) {
                // Find or create a layers list within
                let layersList = roadsContainer.querySelector('.thematic-layers-list');
                if (!layersList) {
                    layersList = document.createElement('div');
                    layersList.className = 'thematic-layers-list';
                    layersList.id = 'roadsLayersList';
                    layersList.style.cssText = 'margin-top: 8px; margin-left: 8px;';

                    // Find the L1 section
                    const l1Section = roadsContainer.querySelector('[style*="border-left: 2px solid #94a3b8"]');
                    if (l1Section) {
                        l1Section.appendChild(layersList);
                    } else {
                        roadsContainer.appendChild(layersList);
                    }
                }
                _thematicContainers[thematic] = layersList;
                return layersList;
            }
        }

        // Create new thematic container for other types
        container = document.createElement('div');
        container.id = thematicInfo.containerId;
        container.style.cssText = `
            margin-top: 12px;
            border-left: 3px solid ${thematicInfo.color};
            padding-left: 10px;
        `;

        container.innerHTML = `
            <label style="font-weight: bold; color: ${thematicInfo.color}; font-size: 1em; display: block; margin-bottom: 8px;">
                ${thematicInfo.icon} ${thematicInfo.name}
            </label>
            <div class="thematic-layers-list" style="margin-left: 8px;"></div>
        `;

        // Insert after relevant section or at end
        layerContent.appendChild(container);

        _thematicContainers[thematic] = container.querySelector('.thematic-layers-list');
        return _thematicContainers[thematic];
    }

    function _insertSortedByDate(container, newElement, newDate) {
        const existingItems = container.querySelectorAll('.registry-layer-item');
        let inserted = false;

        for (const item of existingItems) {
            const itemDate = item.querySelector('[data-folder]')?.dataset.folder?.match(/\d{4}_\d{2}_\d{2}/)?.[0];
            if (itemDate && newDate > itemDate.replace(/_/g, '-')) {
                container.insertBefore(newElement, item);
                inserted = true;
                break;
            }
        }

        if (!inserted) {
            container.appendChild(newElement);
        }
    }

    // ========================================
    // EVENT HANDLERS
    // ========================================

    function _setupLayerEventHandlers(layerEntry) {
        const { id, folder, color, name } = layerEntry;
        const toggle = document.getElementById(layerEntry.toggleId);
        const label = document.getElementById(layerEntry.labelId);

        if (!toggle || !label) {
            console.error(`[LayerRegistry] Could not find toggle/label for ${id}`);
            return;
        }

        // Toggle handler
        toggle.addEventListener('change', function(e) {
            if (e.target.checked) {
                if (layerEntry.leafletLayer) {
                    _map.addLayer(layerEntry.leafletLayer);
                    label.classList.add('layer-dropped');
                }
            } else {
                if (layerEntry.leafletLayer) {
                    _map.removeLayer(layerEntry.leafletLayer);
                    label.classList.remove('layer-dropped');
                }
            }
        });

        // Drag start
        label.addEventListener('dragstart', function(e) {
            window._registryDraggedLayerId = id;
            document.body.classList.add('dragging');

            // Create ghost
            const ghost = document.createElement('div');
            ghost.id = 'registryDragGhost';
            ghost.style.cssText = `
                position: fixed;
                background: ${color}ee;
                color: white;
                padding: 8px 12px;
                border-radius: 6px;
                font-size: 0.85em;
                font-weight: bold;
                pointer-events: none;
                z-index: 10000;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            `;
            ghost.textContent = `🗓️ ${name} - Drop on region`;
            document.body.appendChild(ghost);

            label.classList.add('dragging-layer');
            e.dataTransfer.effectAllowed = 'copy';
            e.dataTransfer.setData('text/plain', id);

            const img = new Image();
            img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
            e.dataTransfer.setDragImage(img, 0, 0);
        });

        // Update ghost position
        document.addEventListener('drag', function(e) {
            const ghost = document.getElementById('registryDragGhost');
            if (ghost && window._registryDraggedLayerId === id && e.clientX !== 0) {
                ghost.style.left = (e.clientX + 10) + 'px';
                ghost.style.top = (e.clientY + 10) + 'px';
            }
        });

        // Drag end
        label.addEventListener('dragend', function(e) {
            label.classList.remove('dragging-layer');
            document.body.classList.remove('dragging');

            const ghost = document.getElementById('registryDragGhost');
            if (ghost) ghost.remove();

            window._registryDraggedLayerId = null;

            // Reset region styles
            if (_adm1Layer) {
                Object.values(_allRegionLayers).forEach(rl => _adm1Layer.resetStyle(rl));
            }
        });

        // Right-click context menu
        label.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            const isActive = layerEntry.leafletLayer && _map.hasLayer(layerEntry.leafletLayer);

            if (typeof showLayerContextMenu === 'function') {
                showLayerContextMenu(id, name, color, e.clientX, e.clientY, {
                    isActive,
                    onToggle: function() {
                        toggle.checked = !toggle.checked;
                        toggle.dispatchEvent(new Event('change'));
                    },
                    onZoom: function() {
                        if (layerEntry.leafletLayer) {
                            _map.fitBounds(layerEntry.leafletLayer.getBounds(), { padding: [50, 50] });
                        }
                    },
                    onRemove: function() {
                        if (layerEntry.leafletLayer) {
                            _map.removeLayer(layerEntry.leafletLayer);
                            layerEntry.leafletLayer = null;
                            layerEntry.activeRegion = null;
                            toggle.checked = false;
                            label.classList.remove('layer-dropped');
                        }
                    },
                    onInfo: function() {
                        alert(`${name}\n\nID: ${id}\nFolder: ${folder}\nRegion: ${layerEntry.activeRegion || 'Not loaded'}\nFeatures: ${layerEntry.leafletLayer ? layerEntry.leafletLayer.getLayers().length : 0}`);
                    }
                });
            }
        });

        // Set up drop handler for this layer
        _setupDropHandler(layerEntry);
    }

    function _setupDropHandler(layerEntry) {
        const mapContainer = _map.getContainer();

        // We need to add handlers that check for this specific layer
        mapContainer.addEventListener('dragover', function(e) {
            if (window._registryDraggedLayerId === layerEntry.id) {
                e.preventDefault();

                const rect = mapContainer.getBoundingClientRect();
                const latlng = _map.containerPointToLatLng([e.clientX - rect.left, e.clientY - rect.top]);

                // Find hovered region
                let hoveredRegion = null;
                let hoveredRegionName = null;
                Object.entries(_allRegionLayers).forEach(([name, regionLayer]) => {
                    if (regionLayer.getBounds && regionLayer.getBounds().contains(latlng)) {
                        hoveredRegion = regionLayer;
                        hoveredRegionName = name;
                    }
                });

                // Reset and highlight
                Object.values(_allRegionLayers).forEach(rl => _adm1Layer.resetStyle(rl));

                const ghost = document.getElementById('registryDragGhost');
                if (hoveredRegion) {
                    hoveredRegion.setStyle({
                        fillColor: layerEntry.color,
                        fillOpacity: 0.4,
                        weight: 3,
                        color: layerEntry.color
                    });
                    mapContainer.classList.add('drop-target');
                    mapContainer.classList.remove('drop-invalid');
                    if (ghost) {
                        ghost.textContent = `✓ Drop to load ${layerEntry.name} for ${hoveredRegionName}`;
                    }
                } else {
                    mapContainer.classList.remove('drop-target');
                    mapContainer.classList.add('drop-invalid');
                    if (ghost) {
                        ghost.textContent = `✗ Drop on a region`;
                        ghost.style.background = 'rgba(239, 68, 68, 0.9)';
                    }
                }
            }
        });

        mapContainer.addEventListener('drop', function(e) {
            if (window._registryDraggedLayerId !== layerEntry.id) return;

            e.preventDefault();

            const rect = mapContainer.getBoundingClientRect();
            const latlng = _map.containerPointToLatLng([e.clientX - rect.left, e.clientY - rect.top]);

            let droppedRegion = null;
            let droppedRegionLayer = null;
            Object.entries(_allRegionLayers).forEach(([name, regionLayer]) => {
                if (regionLayer.getBounds && regionLayer.getBounds().contains(latlng)) {
                    droppedRegion = name;
                    droppedRegionLayer = regionLayer;
                }
            });

            if (droppedRegion) {
                _loadLayerForRegion(layerEntry, droppedRegion, droppedRegionLayer, latlng);
            }

            // Reset
            Object.values(_allRegionLayers).forEach(rl => _adm1Layer.resetStyle(rl));
            mapContainer.classList.remove('drop-target', 'drop-invalid');
        });
    }

    function _loadLayerForRegion(layerEntry, regionName, regionLayer, latlng) {
        // Remove existing layer
        if (layerEntry.leafletLayer) {
            _map.removeLayer(layerEntry.leafletLayer);
            layerEntry.leafletLayer = null;
        }

        // Show loading
        const loadingPopup = L.popup({
            closeButton: false,
            autoClose: false,
            className: 'loading-popup'
        })
        .setLatLng(latlng)
        .setContent(`⏳ Loading ${layerEntry.name} for ${regionName}...`)
        .openOn(_map);

        // Load data
        const safeRegionName = regionName.replace(/ /g, '_');
        const filePath = `${layerEntry.folder}/${safeRegionName}_roads.js`;

        const script = document.createElement('script');
        script.src = filePath + '?v=' + Date.now();

        script.onload = function() {
            _map.closePopup(loadingPopup);

            // Find loaded data (try common naming patterns)
            const folderDate = layerEntry.folder.match(/\d{4}_\d{2}_\d{2}/)?.[0]?.replace(/_/g, '') || '';
            const varName = `${safeRegionName.toLowerCase()}Roads${folderDate}`;
            const loadedData = window[varName];

            if (loadedData && loadedData.features) {
                layerEntry.leafletLayer = L.geoJSON(loadedData, {
                    style: function(feature) {
                        const highway = feature.properties?.highway || 'unknown';
                        let color = layerEntry.color;
                        let weight = 1.5;
                        let dashArray = null;

                        if (highway === 'primary') weight = 3;
                        else if (highway === 'secondary') weight = 2.5;
                        else if (highway === 'tertiary') weight = 2;
                        else if (highway === 'track') dashArray = '5, 5';
                        else if (highway === 'path') dashArray = '3, 3';

                        return { color, weight, opacity: 0.8, dashArray };
                    },
                    onEachFeature: function(feature, layer) {
                        const props = feature.properties || {};
                        layer.bindPopup(`
                            <div style="min-width: 150px;">
                                <strong style="color: ${layerEntry.color};">${props.name || 'Unnamed'}</strong><br>
                                <small>Type: ${props.highway || 'road'}</small><br>
                                <small style="color: #94a3b8;">Source: ${layerEntry.folder}</small>
                            </div>
                        `);
                    }
                }).addTo(_map);

                layerEntry.activeRegion = regionName;
                layerEntry.isActive = true;

                // Update UI
                const toggle = document.getElementById(layerEntry.toggleId);
                const label = document.getElementById(layerEntry.labelId);
                if (toggle) toggle.checked = true;
                if (label) label.classList.add('layer-dropped');

                // Zoom
                _map.fitBounds(regionLayer.getBounds(), { padding: [50, 50], maxZoom: 11 });

                // Success
                L.popup({
                    closeButton: false,
                    autoClose: true,
                    className: 'drop-success-popup'
                })
                .setLatLng(latlng)
                .setContent(`✓ ${layerEntry.name} loaded for ${regionName}<br><small>${loadedData.features.length} features</small>`)
                .openOn(_map);

                setTimeout(() => _map.closePopup(), 3000);
            }
        };

        script.onerror = function() {
            _map.closePopup(loadingPopup);
            L.popup({ closeButton: true, className: 'error-popup' })
                .setLatLng(latlng)
                .setContent(`❌ No data for ${regionName}<br><small>File: ${filePath}</small>`)
                .openOn(_map);
        };

        document.head.appendChild(script);
    }

    // ========================================
    // PERSISTENCE
    // ========================================

    function _persistLayers() {
        try {
            const toSave = {};
            Object.entries(_registeredLayers).forEach(([id, layer]) => {
                toSave[id] = {
                    id: layer.id,
                    name: layer.name,
                    thematic: layer.thematic,
                    folder: layer.folder,
                    date: layer.date,
                    color: layer.color,
                    source: layer.source,
                    featureCount: layer.featureCount,
                    registeredAt: layer.registeredAt
                };
            });
            localStorage.setItem('somaliaLayerRegistry', JSON.stringify(toSave));
        } catch (e) {
            console.warn('[LayerRegistry] Could not persist layers:', e);
        }
    }

    function _loadPersistedLayers() {
        try {
            const saved = localStorage.getItem('somaliaLayerRegistry');
            if (saved) {
                const layers = JSON.parse(saved);
                Object.values(layers).forEach(layer => {
                    // Re-register (will add to UI)
                    setTimeout(() => registerDownloadedLayer(layer), 100);
                });
            }
        } catch (e) {
            console.warn('[LayerRegistry] Could not load persisted layers:', e);
        }
    }

    // ========================================
    // PUBLIC API
    // ========================================

    function getLayers() {
        return { ..._registeredLayers };
    }

    function getLayersByThematic(thematic) {
        return Object.values(_registeredLayers).filter(l => l.thematic === thematic);
    }

    function getThematics() {
        return { ...THEMATICS };
    }

    return {
        init,
        registerDownloadedLayer,
        unregisterLayer,
        getLayers,
        getLayersByThematic,
        getThematics
    };

})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LayerRegistry;
}
