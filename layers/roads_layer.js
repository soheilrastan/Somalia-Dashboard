/**
 * ROADS LAYER MODULE
 * Independent, reusable module for ALL Roads layers (OSM 2023, OSM Latest, future versions)
 *
 * Features:
 * - Multi-version support (2023, 2024, 2026, Latest)
 * - Drag-and-drop functionality
 * - Auto-styling by highway type
 * - Regional loading
 * - Checkbox toggle
 *
 * Version: 1.0
 * Date: 2026-01-21
 */

const RoadsLayer = {
    // State management
    state: {
        activeVersions: {},  // { 'osm_2023': {layer, region}, 'osm_latest': {layer, region} }
        dragState: {
            draggedVersion: null,
            dragGhost: null,
            cursorIndicator: null
        }
    },

    // Configuration
    config: {
        colors: {
            motorway: '#7c2d12',
            trunk: '#dc2626',
            primary: '#ef4444',
            secondary: '#f97316',
            tertiary: '#fbbf24',
            residential: '#cbd5e1',
            track: '#78716c',
            footway: '#a8a29e',
            path: '#a8a29e',
            default: '#94a3b8'
        },
        weights: {
            motorway: 3,
            trunk: 3,
            primary: 3,
            secondary: 2,
            tertiary: 2,
            default: 1
        }
    },

    /**
     * Initialize Roads layer for a specific version
     * @param {string} version - Version ID (e.g., 'osm_2023', 'osm_latest', 'osm_2024_07_23')
     * @param {object} options - Configuration options
     * @returns {object} - {success: bool, message: str}
     */
    init(version, options = {}) {
        console.log(`[RoadsLayer] Initializing version: ${version}`);

        try {
            // Setup state for this version
            if (!this.state.activeVersions[version]) {
                this.state.activeVersions[version] = {
                    layer: null,
                    region: null,
                    folder: options.folder || 'roads_by_region_latest'
                };
            }

            // Setup event listeners
            this.setupDragDrop(version, options);
            this.setupCheckbox(version, options);

            console.log(`[RoadsLayer] ✓ Initialized ${version}`);
            return { success: true, message: `${version} initialized` };

        } catch (error) {
            console.error(`[RoadsLayer] Error initializing ${version}:`, error);
            return { success: false, message: error.message };
        }
    },

    /**
     * Setup drag-and-drop for a roads version
     */
    setupDragDrop(version, options) {
        const labelId = options.labelId;
        if (!labelId) return;

        const label = document.getElementById(labelId);
        if (!label) {
            console.warn(`[RoadsLayer] Label ${labelId} not found`);
            return;
        }

        const self = this;
        const map = options.map;
        const allRegionLayers = options.allRegionLayers;
        const adm1Layer = options.adm1Layer;

        // Drag start
        label.addEventListener('dragstart', function(e) {
            self.state.dragState.draggedVersion = version;
            document.body.classList.add('dragging');

            // Create cursor indicator
            const cursorIndicator = document.createElement('div');
            cursorIndicator.className = 'cursor-indicator';
            document.body.appendChild(cursorIndicator);
            self.state.dragState.cursorIndicator = cursorIndicator;

            // Create drag ghost
            const dragGhost = document.createElement('div');
            dragGhost.style.cssText = `
                position: fixed;
                background: rgba(34, 197, 94, 0.9);
                color: white;
                padding: 8px 12px;
                border-radius: 6px;
                font-size: 14px;
                pointer-events: none;
                z-index: 10000;
                box-shadow: 0 4px 6px rgba(0,0,0,0.3);
            `;
            dragGhost.textContent = '🛣️ Drag to region to load roads';
            document.body.appendChild(dragGhost);
            self.state.dragState.dragGhost = dragGhost;

            label.classList.add('dragging-layer');

            e.dataTransfer.effectAllowed = 'copy';
            e.dataTransfer.setData('text/plain', version);

            const img = new Image();
            img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
            e.dataTransfer.setDragImage(img, 0, 0);
        });

        // Update ghost position
        document.addEventListener('drag', function(e) {
            if (self.state.dragState.dragGhost &&
                self.state.dragState.draggedVersion === version &&
                e.clientX !== 0 && e.clientY !== 0) {
                self.state.dragState.dragGhost.style.left = (e.clientX + 10) + 'px';
                self.state.dragState.dragGhost.style.top = (e.clientY + 10) + 'px';
            }
        });

        // Drag end
        label.addEventListener('dragend', function(e) {
            label.classList.remove('dragging-layer');
            document.body.classList.remove('dragging');

            if (self.state.dragState.dragGhost) {
                document.body.removeChild(self.state.dragState.dragGhost);
                self.state.dragState.dragGhost = null;
            }
            if (self.state.dragState.cursorIndicator) {
                document.body.removeChild(self.state.dragState.cursorIndicator);
                self.state.dragState.cursorIndicator = null;
            }
            self.state.dragState.draggedVersion = null;

            // Remove highlights
            Object.values(allRegionLayers).forEach(regionLayer => {
                adm1Layer.resetStyle(regionLayer);
            });
        });

        // Map dragover handler
        const mapContainer = document.getElementById('map');
        mapContainer.addEventListener('dragover', function(e) {
            if (self.state.dragState.draggedVersion !== version) return;

            e.preventDefault();

            const rect = mapContainer.getBoundingClientRect();
            const latlng = map.containerPointToLatLng([e.clientX - rect.left, e.clientY - rect.top]);

            // Check which region
            let currentRegion = null;
            Object.values(allRegionLayers).forEach(regionLayer => {
                if (self.isPointInPolygon(latlng, regionLayer)) {
                    currentRegion = regionLayer.feature.properties.name;
                }
            });

            if (currentRegion) {
                mapContainer.classList.add('drop-target');
                mapContainer.classList.remove('drop-invalid');

                if (self.state.dragState.dragGhost) {
                    self.state.dragState.dragGhost.style.background = 'rgba(34, 197, 94, 0.9)';
                    self.state.dragState.dragGhost.textContent = `✓ Drop to load roads for ${currentRegion}`;
                }

                // Highlight region
                Object.values(allRegionLayers).forEach(regionLayer => {
                    if (regionLayer.feature.properties.name === currentRegion) {
                        regionLayer.setStyle({
                            color: '#22c55e',
                            weight: 4,
                            opacity: 1,
                            fillColor: '#22c55e',
                            fillOpacity: 0.2,
                            dashArray: '10, 5'
                        });
                    } else {
                        adm1Layer.resetStyle(regionLayer);
                    }
                });

                if (self.state.dragState.cursorIndicator) {
                    self.state.dragState.cursorIndicator.style.left = e.clientX + 'px';
                    self.state.dragState.cursorIndicator.style.top = e.clientY + 'px';
                    self.state.dragState.cursorIndicator.style.borderColor = '#22c55e';
                    self.state.dragState.cursorIndicator.classList.add('active');
                }
            } else {
                mapContainer.classList.add('drop-invalid');
                mapContainer.classList.remove('drop-target');

                if (self.state.dragState.dragGhost) {
                    self.state.dragState.dragGhost.style.background = 'rgba(239, 68, 68, 0.9)';
                    self.state.dragState.dragGhost.textContent = '✗ Drop only on Somalia regions';
                }

                Object.values(allRegionLayers).forEach(regionLayer => {
                    adm1Layer.resetStyle(regionLayer);
                });

                if (self.state.dragState.cursorIndicator) {
                    self.state.dragState.cursorIndicator.classList.remove('active');
                }
            }
        });

        // Map drop handler
        mapContainer.addEventListener('drop', function(e) {
            if (self.state.dragState.draggedVersion !== version) return;

            e.preventDefault();
            mapContainer.classList.remove('drop-target', 'drop-invalid');

            const rect = mapContainer.getBoundingClientRect();
            const latlng = map.containerPointToLatLng([e.clientX - rect.left, e.clientY - rect.top]);

            // Find dropped region
            let droppedRegion = null;
            Object.values(allRegionLayers).forEach(regionLayer => {
                if (self.isPointInPolygon(latlng, regionLayer)) {
                    droppedRegion = regionLayer.feature.properties.name;
                }
            });

            if (droppedRegion) {
                console.log(`[RoadsLayer] Loading ${version} for ${droppedRegion}`);
                self.loadRegion(version, droppedRegion, { map, options });
            }
        });

        console.log(`[RoadsLayer] ✓ Drag-drop setup for ${version}`);
    },

    /**
     * Setup checkbox toggle for a roads version
     */
    setupCheckbox(version, options) {
        const checkboxId = options.checkboxId;
        if (!checkboxId) return;

        const checkbox = document.getElementById(checkboxId);
        if (!checkbox) {
            console.warn(`[RoadsLayer] Checkbox ${checkboxId} not found`);
            return;
        }

        const self = this;
        const map = options.map;

        checkbox.addEventListener('change', function() {
            const versionState = self.state.activeVersions[version];

            if (this.checked) {
                if (versionState && versionState.layer) {
                    map.addLayer(versionState.layer);
                    console.log(`[RoadsLayer] ✓ Showed ${version}`);
                }
            } else {
                if (versionState && versionState.layer) {
                    map.removeLayer(versionState.layer);
                    console.log(`[RoadsLayer] Hidden ${version}`);
                }
            }
        });

        console.log(`[RoadsLayer] ✓ Checkbox setup for ${version}`);
    },

    /**
     * Load roads for a specific region
     */
    async loadRegion(version, regionName, context) {
        const { map, options } = context;
        const versionState = this.state.activeVersions[version];

        console.log(`[RoadsLayer] Loading ${version} for ${regionName}...`);

        // Remove previous layer if exists
        if (versionState.layer) {
            map.removeLayer(versionState.layer);
            versionState.layer = null;
        }

        // Show loading popup
        const loadingPopup = L.popup()
            .setLatLng(map.getCenter())
            .setContent(`⏳ Loading ${regionName} roads...`)
            .openOn(map);

        try {
            // Load roads data
            const regionSafe = regionName.replace(/ /g, '_');
            const folder = versionState.folder;
            const dataUrl = `${folder}/${regionSafe}_roads.js?v=${Date.now()}`;

            // Dynamic script loading
            await this.loadScript(dataUrl);

            // Get data from global variable
            const varName = `${regionSafe.toLowerCase()}Roads${folder.replace('roads_by_region_', '').replace(/_/g, '')}`;
            const loadedData = window[varName];

            if (!loadedData || !loadedData.features) {
                throw new Error('No roads data found');
            }

            // Create layer with styling
            const layer = L.geoJSON(loadedData, {
                style: (feature) => this.getStyle(feature),
                onEachFeature: (feature, layer) => this.bindPopup(feature, layer, version)
            }).addTo(map);

            versionState.layer = layer;
            versionState.region = regionName;

            // Close loading popup
            map.closePopup(loadingPopup);

            // Success popup
            L.popup()
                .setLatLng(map.getCenter())
                .setContent(`✓ ${regionName} roads loaded (${loadedData.features.length.toLocaleString()} features)`)
                .openOn(map);

            console.log(`[RoadsLayer] ✓ Loaded ${version} for ${regionName}`);

            return { success: true, count: loadedData.features.length };

        } catch (error) {
            map.closePopup(loadingPopup);

            L.popup()
                .setLatLng(map.getCenter())
                .setContent(`❌ Failed to load ${regionName} roads: ${error.message}`)
                .openOn(map);

            console.error(`[RoadsLayer] Error loading ${version}:`, error);
            return { success: false, message: error.message };
        }
    },

    /**
     * Get style for a road feature based on highway type
     */
    getStyle(feature) {
        const highway = feature.properties.highway || 'unknown';
        const color = this.config.colors[highway] || this.config.colors.default;
        const weight = this.config.weights[highway] || this.config.weights.default;

        const style = {
            color: color,
            weight: weight,
            opacity: 0.8
        };

        // Add dashed line for tracks
        if (highway === 'track') {
            style.dashArray = '5, 10';
        }

        return style;
    },

    /**
     * Bind popup to road feature
     */
    bindPopup(feature, layer, version) {
        if (!feature.properties) return;

        const highway = feature.properties.highway || 'Unknown';
        const name = feature.properties.name || 'Unnamed road';
        const surface = feature.properties.surface || 'Unknown';
        const osmId = feature.properties.osm_id || 'N/A';

        layer.bindPopup(`
            <div style="font-size: 0.9em;">
                <strong>🛣️ Road Type:</strong> ${highway}<br>
                <strong>📛 Name:</strong> ${name}<br>
                <strong>🛤️ Surface:</strong> ${surface}<br>
                <strong>📍 OSM ID:</strong> ${osmId}<br>
                <em style="color: #94a3b8;">Version: ${version}</em>
            </div>
        `);
    },

    /**
     * Remove roads layer for a version
     */
    remove(version, map) {
        const versionState = this.state.activeVersions[version];

        if (versionState && versionState.layer) {
            map.removeLayer(versionState.layer);
            versionState.layer = null;
            versionState.region = null;
            console.log(`[RoadsLayer] Removed ${version}`);
            return { success: true };
        }

        return { success: false, message: 'Layer not active' };
    },

    /**
     * Helper: Check if point is in polygon
     */
    isPointInPolygon(latlng, layer) {
        if (!layer || !layer.feature || !layer.feature.geometry) return false;

        const coords = layer.feature.geometry.coordinates;
        if (layer.feature.geometry.type === 'Polygon') {
            return this.pointInPolygon(latlng, coords[0]);
        } else if (layer.feature.geometry.type === 'MultiPolygon') {
            for (let poly of coords) {
                if (this.pointInPolygon(latlng, poly[0])) {
                    return true;
                }
            }
        }
        return false;
    },

    /**
     * Helper: Point in polygon algorithm
     */
    pointInPolygon(latlng, polygon) {
        let inside = false;
        const x = latlng.lng;
        const y = latlng.lat;

        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i][0], yi = polygon[i][1];
            const xj = polygon[j][0], yj = polygon[j][1];

            const intersect = ((yi > y) !== (yj > y)) &&
                (x < (xj - xi) * (y - yi) / (yj - yi) + xi);

            if (intersect) inside = !inside;
        }

        return inside;
    },

    /**
     * Helper: Load external script dynamically
     */
    loadScript(url) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = url;
            script.onload = resolve;
            script.onerror = () => reject(new Error(`Failed to load script: ${url}`));
            document.head.appendChild(script);
        });
    }
};

// Export for use in main script
window.RoadsLayer = RoadsLayer;
console.log('✓ Roads Layer Module loaded');
