/**
 * POPULATION LAYER MODULE
 * Independent, reusable module for ALL Population layers (different age groups, years)
 *
 * Features:
 * - Multi-version support (0-12 months, other age groups, years)
 * - Drag-and-drop functionality
 * - Auto-styling by population classes
 * - Regional loading
 * - Checkbox toggle
 *
 * Version: 1.0
 * Date: 2026-01-21
 */

const PopulationLayer = {
    // State management
    state: {
        activeVersions: {}  // { 'f_0_12_months': {layer, region}, 'f_1_5_years': {layer, region} }
    },

    // Configuration
    config: {
        // Pink gradient for female population
        colors: {
            low: '#F48FB1',      // 1-25
            medium: '#EC407A',   // 25-50
            high: '#AD1457'      // 50+
        },
        classes: [
            { min: 1, max: 25, color: '#F48FB1', size: 1.3 },
            { min: 25, max: 50, color: '#EC407A', size: 1.4 },
            { min: 50, max: Infinity, color: '#AD1457', size: 1.5 }
        ]
    },

    /**
     * Initialize Population layer for a specific version
     * @param {string} version - Version ID (e.g., 'f_0_12_months_2024')
     * @param {object} options - Configuration options
     * @returns {object} - {success: bool, message: str}
     */
    init(version, options = {}) {
        console.log(`[PopulationLayer] Initializing version: ${version}`);

        try {
            // Setup state for this version
            if (!this.state.activeVersions[version]) {
                this.state.activeVersions[version] = {
                    layer: null,
                    region: null,
                    dataVariable: options.dataVariable || 'populationData'
                };
            }

            // Setup event listeners
            this.setupDragDrop(version, options);
            this.setupCheckbox(version, options);

            console.log(`[PopulationLayer] ✓ Initialized ${version}`);
            return { success: true, message: `${version} initialized` };

        } catch (error) {
            console.error(`[PopulationLayer] Error initializing ${version}:`, error);
            return { success: false, message: error.message };
        }
    },

    /**
     * Setup drag-and-drop
     */
    setupDragDrop(version, options) {
        const labelId = options.labelId;
        if (!labelId) return;

        const label = document.getElementById(labelId);
        if (!label) {
            console.warn(`[PopulationLayer] Label ${labelId} not found`);
            return;
        }

        const self = this;
        const map = options.map;
        const targetRegion = options.targetRegion;
        const regionLayer = options.regionLayer;
        const adm1Layer = options.adm1Layer;

        let dragGhost = null;

        // Drag start
        label.addEventListener('dragstart', function(e) {
            document.body.classList.add('dragging');

            dragGhost = document.createElement('div');
            dragGhost.style.cssText = `
                position: fixed;
                background: rgba(236, 64, 122, 0.9);
                color: white;
                padding: 8px 12px;
                border-radius: 6px;
                font-size: 14px;
                pointer-events: none;
                z-index: 10000;
            `;
            dragGhost.textContent = `👶 Drag to ${targetRegion} to show population`;
            document.body.appendChild(dragGhost);

            label.classList.add('dragging-layer');

            e.dataTransfer.effectAllowed = 'copy';
            e.dataTransfer.setData('text/plain', version);
        });

        // Update ghost position
        document.addEventListener('drag', function(e) {
            if (dragGhost && e.clientX !== 0 && e.clientY !== 0) {
                dragGhost.style.left = (e.clientX + 10) + 'px';
                dragGhost.style.top = (e.clientY + 10) + 'px';
            }
        });

        // Drag end
        label.addEventListener('dragend', function(e) {
            label.classList.remove('dragging-layer');
            document.body.classList.remove('dragging');

            if (dragGhost) {
                document.body.removeChild(dragGhost);
                dragGhost = null;
            }

            if (regionLayer) {
                adm1Layer.resetStyle(regionLayer);
            }
        });

        // Map dragover and drop handlers (similar to nightlight)
        const mapContainer = document.getElementById('map');

        mapContainer.addEventListener('dragover', function(e) {
            e.preventDefault();
            const rect = mapContainer.getBoundingClientRect();
            const latlng = map.containerPointToLatLng([e.clientX - rect.left, e.clientY - rect.top]);

            if (regionLayer && self.isPointInPolygon(latlng, regionLayer)) {
                mapContainer.classList.add('drop-target');
                mapContainer.classList.remove('drop-invalid');

                if (dragGhost) {
                    dragGhost.style.background = 'rgba(34, 197, 94, 0.9)';
                    dragGhost.textContent = `✓ Drop to activate ${targetRegion} population`;
                }

                regionLayer.setStyle({
                    color: '#22c55e',
                    weight: 4,
                    fillColor: '#22c55e',
                    fillOpacity: 0.2,
                    dashArray: '10, 5'
                });
            } else {
                mapContainer.classList.add('drop-invalid');
                mapContainer.classList.remove('drop-target');

                if (dragGhost) {
                    dragGhost.style.background = 'rgba(239, 68, 68, 0.9)';
                    dragGhost.textContent = `✗ Drop only on ${targetRegion}`;
                }

                if (regionLayer) {
                    adm1Layer.resetStyle(regionLayer);
                }
            }
        });

        mapContainer.addEventListener('drop', function(e) {
            e.preventDefault();
            mapContainer.classList.remove('drop-target', 'drop-invalid');

            const rect = mapContainer.getBoundingClientRect();
            const latlng = map.containerPointToLatLng([e.clientX - rect.left, e.clientY - rect.top]);

            if (regionLayer && self.isPointInPolygon(latlng, regionLayer)) {
                self.loadData(version, targetRegion, { map, options });
            }
        });

        console.log(`[PopulationLayer] ✓ Drag-drop setup for ${version}`);
    },

    /**
     * Setup checkbox toggle
     */
    setupCheckbox(version, options) {
        const checkboxId = options.checkboxId;
        if (!checkboxId) return;

        const checkbox = document.getElementById(checkboxId);
        if (!checkbox) return;

        const self = this;
        const map = options.map;

        checkbox.addEventListener('change', function() {
            const versionState = self.state.activeVersions[version];

            if (this.checked) {
                if (versionState && versionState.layer) {
                    map.addLayer(versionState.layer);
                }
            } else {
                if (versionState && versionState.layer) {
                    map.removeLayer(versionState.layer);
                }
            }
        });

        console.log(`[PopulationLayer] ✓ Checkbox setup for ${version}`);
    },

    /**
     * Load population data
     */
    loadData(version, regionName, context) {
        const { map, options } = context;
        const versionState = this.state.activeVersions[version];

        console.log(`[PopulationLayer] Loading ${version} for ${regionName}...`);

        if (versionState.layer) {
            map.removeLayer(versionState.layer);
            versionState.layer = null;
        }

        try {
            const dataVariable = versionState.dataVariable;
            const data = window[dataVariable];

            if (!data || !data.features) {
                throw new Error(`No population data found for ${version}`);
            }

            const layer = L.geoJSON(data, {
                style: (feature) => this.getStyle(feature),
                pointToLayer: (feature, latlng) => {
                    return L.circleMarker(latlng, this.getStyle(feature));
                },
                onEachFeature: (feature, layer) => this.bindPopup(feature, layer, version)
            }).addTo(map);

            versionState.layer = layer;
            versionState.region = regionName;

            L.popup()
                .setLatLng(map.getCenter())
                .setContent(`✓ ${regionName} Population Layer Activated`)
                .openOn(map);

            console.log(`[PopulationLayer] ✓ Loaded ${version} for ${regionName}`);

            return { success: true, count: data.features.length };

        } catch (error) {
            L.popup()
                .setLatLng(map.getCenter())
                .setContent(`❌ Failed to load population: ${error.message}`)
                .openOn(map);

            console.error(`[PopulationLayer] Error:`, error);
            return { success: false, message: error.message };
        }
    },

    /**
     * Get style based on population value
     */
    getStyle(feature) {
        const value = feature.properties.f_0_un || 0;

        // Find matching class
        let styleClass = this.config.classes[0];
        for (let cls of this.config.classes) {
            if (value >= cls.min && value < cls.max) {
                styleClass = cls;
                break;
            }
        }

        return {
            radius: styleClass.size * 3,
            fillColor: styleClass.color,
            color: styleClass.color,
            weight: 1,
            opacity: 0.8,
            fillOpacity: 0.6
        };
    },

    /**
     * Bind popup
     */
    bindPopup(feature, layer, version) {
        if (!feature.properties) return;

        const value = feature.properties.f_0_un || 0;
        const lat = feature.geometry.coordinates[1].toFixed(4);
        const lon = feature.geometry.coordinates[0].toFixed(4);

        layer.bindPopup(`
            <div style="font-size: 0.9em;">
                <strong>👶 Population:</strong> ${value} infants<br>
                <strong>📅 Version:</strong> ${version}<br>
                <strong>📍 Coordinates:</strong> ${lat}, ${lon}<br>
                <em style="color: #94a3b8;">Female 0-12 months, 500m grid</em>
            </div>
        `);
    },

    /**
     * Remove population layer
     */
    remove(version, map) {
        const versionState = this.state.activeVersions[version];

        if (versionState && versionState.layer) {
            map.removeLayer(versionState.layer);
            versionState.layer = null;
            versionState.region = null;
            return { success: true };
        }

        return { success: false };
    },

    // Helper methods (same as other modules)
    isPointInPolygon(latlng, layer) {
        if (!layer || !layer.feature || !layer.feature.geometry) return false;
        const coords = layer.feature.geometry.coordinates;
        if (layer.feature.geometry.type === 'Polygon') {
            return this.pointInPolygon(latlng, coords[0]);
        } else if (layer.feature.geometry.type === 'MultiPolygon') {
            for (let poly of coords) {
                if (this.pointInPolygon(latlng, poly[0])) return true;
            }
        }
        return false;
    },

    pointInPolygon(latlng, polygon) {
        let inside = false;
        const x = latlng.lng, y = latlng.lat;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i][0], yi = polygon[i][1];
            const xj = polygon[j][0], yj = polygon[j][1];
            const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }
};

// Export
window.PopulationLayer = PopulationLayer;
console.log('✓ Population Layer Module loaded');
