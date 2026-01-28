/**
 * NIGHTLIGHT LAYER MODULE
 * Independent, reusable module for ALL Nightlight layers (2022, 2023, future years)
 *
 * Features:
 * - Multi-year support
 * - Drag-and-drop functionality
 * - Auto-styling by intensity gradient
 * - Regional loading
 * - Checkbox toggle
 *
 * Version: 1.0
 * Date: 2026-01-21
 */

const NightlightLayer = {
    // State management
    state: {
        activeVersions: {}  // { '2022': {layer, region}, '2023': {layer, region} }
    },

    // Configuration
    config: {
        // Purple to Yellow gradient colors
        colors: {
            veryLow: '#1e1b4b',      // 0.0-0.7
            low: '#7c3aed',          // 0.7-2.0
            medium: '#e879f9',       // 2.0-4.0
            high: '#fb923c',         // 4.0-5.5
            veryHigh: '#fde047'      // 5.5+
        }
    },

    /**
     * Initialize Nightlight layer for a specific year
     * @param {string} year - Year (e.g., '2022', '2023')
     * @param {object} options - Configuration options
     * @returns {object} - {success: bool, message: str}
     */
    init(year, options = {}) {
        console.log(`[NightlightLayer] Initializing year: ${year}`);

        try {
            // Setup state for this year
            if (!this.state.activeVersions[year]) {
                this.state.activeVersions[year] = {
                    layer: null,
                    region: null,
                    dataVariable: options.dataVariable || `bakoolNightlight${year}`
                };
            }

            // Setup event listeners
            this.setupDragDrop(year, options);
            this.setupCheckbox(year, options);

            console.log(`[NightlightLayer] ✓ Initialized ${year}`);
            return { success: true, message: `${year} initialized` };

        } catch (error) {
            console.error(`[NightlightLayer] Error initializing ${year}:`, error);
            return { success: false, message: error.message };
        }
    },

    /**
     * Setup drag-and-drop for a nightlight year
     */
    setupDragDrop(year, options) {
        const labelId = options.labelId;
        if (!labelId) return;

        const label = document.getElementById(labelId);
        if (!label) {
            console.warn(`[NightlightLayer] Label ${labelId} not found`);
            return;
        }

        const self = this;
        const map = options.map;
        const targetRegion = options.targetRegion; // e.g., 'Bakool', 'Lower Shebelle'
        const regionLayer = options.regionLayer;
        const adm1Layer = options.adm1Layer;

        let dragGhost = null;

        // Drag start
        label.addEventListener('dragstart', function(e) {
            document.body.classList.add('dragging');

            dragGhost = document.createElement('div');
            dragGhost.style.cssText = `
                position: fixed;
                background: rgba(168, 85, 247, 0.9);
                color: white;
                padding: 8px 12px;
                border-radius: 6px;
                font-size: 14px;
                pointer-events: none;
                z-index: 10000;
            `;
            dragGhost.textContent = `💡 Drag to ${targetRegion} to activate nightlight`;
            document.body.appendChild(dragGhost);

            label.classList.add('dragging-layer');

            e.dataTransfer.effectAllowed = 'copy';
            e.dataTransfer.setData('text/plain', year);
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

        // Map dragover handler
        const mapContainer = document.getElementById('map');
        mapContainer.addEventListener('dragover', function(e) {
            e.preventDefault();

            const rect = mapContainer.getBoundingClientRect();
            const latlng = map.containerPointToLatLng([e.clientX - rect.left, e.clientY - rect.top]);

            // Check if over target region
            if (regionLayer && self.isPointInPolygon(latlng, regionLayer)) {
                mapContainer.classList.add('drop-target');
                mapContainer.classList.remove('drop-invalid');

                if (dragGhost) {
                    dragGhost.style.background = 'rgba(34, 197, 94, 0.9)';
                    dragGhost.textContent = `✓ Drop to activate ${targetRegion} nightlight ${year}`;
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

        // Map drop handler
        mapContainer.addEventListener('drop', function(e) {
            e.preventDefault();
            mapContainer.classList.remove('drop-target', 'drop-invalid');

            const rect = mapContainer.getBoundingClientRect();
            const latlng = map.containerPointToLatLng([e.clientX - rect.left, e.clientY - rect.top]);

            if (regionLayer && self.isPointInPolygon(latlng, regionLayer)) {
                console.log(`[NightlightLayer] Loading ${year} for ${targetRegion}`);
                self.loadData(year, targetRegion, { map, options });
            }
        });

        console.log(`[NightlightLayer] ✓ Drag-drop setup for ${year}`);
    },

    /**
     * Setup checkbox toggle
     */
    setupCheckbox(year, options) {
        const checkboxId = options.checkboxId;
        if (!checkboxId) return;

        const checkbox = document.getElementById(checkboxId);
        if (!checkbox) {
            console.warn(`[NightlightLayer] Checkbox ${checkboxId} not found`);
            return;
        }

        const self = this;
        const map = options.map;

        checkbox.addEventListener('change', function() {
            const yearState = self.state.activeVersions[year];

            if (this.checked) {
                if (yearState && yearState.layer) {
                    map.addLayer(yearState.layer);
                    console.log(`[NightlightLayer] ✓ Showed ${year}`);
                }
            } else {
                if (yearState && yearState.layer) {
                    map.removeLayer(yearState.layer);
                    console.log(`[NightlightLayer] Hidden ${year}`);
                }
            }
        });

        console.log(`[NightlightLayer] ✓ Checkbox setup for ${year}`);
    },

    /**
     * Load nightlight data for a region
     */
    loadData(year, regionName, context) {
        const { map, options } = context;
        const yearState = this.state.activeVersions[year];

        console.log(`[NightlightLayer] Loading ${year} for ${regionName}...`);

        // Remove previous layer if exists
        if (yearState.layer) {
            map.removeLayer(yearState.layer);
            yearState.layer = null;
        }

        try {
            // Get data from global variable
            const dataVariable = yearState.dataVariable;
            const data = window[dataVariable];

            if (!data || !data.features) {
                throw new Error(`No nightlight data found for ${year}`);
            }

            // Create layer with styling
            const layer = L.geoJSON(data, {
                style: (feature) => this.getStyle(feature),
                onEachFeature: (feature, layer) => this.bindPopup(feature, layer, year)
            }).addTo(map);

            yearState.layer = layer;
            yearState.region = regionName;

            // Success popup
            L.popup()
                .setLatLng(map.getCenter())
                .setContent(`✓ ${regionName} ${year} Nightlight Layer Activated`)
                .openOn(map);

            console.log(`[NightlightLayer] ✓ Loaded ${year} for ${regionName}`);

            return { success: true, count: data.features.length };

        } catch (error) {
            L.popup()
                .setLatLng(map.getCenter())
                .setContent(`❌ Failed to load nightlight ${year}: ${error.message}`)
                .openOn(map);

            console.error(`[NightlightLayer] Error loading ${year}:`, error);
            return { success: false, message: error.message };
        }
    },

    /**
     * Get style based on nightlight intensity
     */
    getStyle(feature) {
        const value = feature.properties.avg_rad || 0;
        let color;

        if (value <= 0.7) color = this.config.colors.veryLow;
        else if (value <= 2.0) color = this.config.colors.low;
        else if (value <= 4.0) color = this.config.colors.medium;
        else if (value <= 5.5) color = this.config.colors.high;
        else color = this.config.colors.veryHigh;

        return {
            fillColor: color,
            fillOpacity: 0.7,
            color: color,
            weight: 1,
            opacity: 0.8
        };
    },

    /**
     * Bind popup to nightlight feature
     */
    bindPopup(feature, layer, year) {
        if (!feature.properties) return;

        const value = feature.properties.avg_rad || 0;
        const lat = feature.properties.y_coord?.toFixed(4) || 'N/A';
        const lon = feature.properties.x_coord?.toFixed(4) || 'N/A';

        layer.bindPopup(`
            <div style="font-size: 0.9em;">
                <strong>💡 Nightlight Intensity:</strong> ${value.toFixed(2)}<br>
                <strong>📅 Year:</strong> ${year}<br>
                <strong>📍 Coordinates:</strong> ${lat}, ${lon}<br>
                <em style="color: #94a3b8;">VIIRS DNB - 500m grid</em>
            </div>
        `);
    },

    /**
     * Remove nightlight layer
     */
    remove(year, map) {
        const yearState = this.state.activeVersions[year];

        if (yearState && yearState.layer) {
            map.removeLayer(yearState.layer);
            yearState.layer = null;
            yearState.region = null;
            console.log(`[NightlightLayer] Removed ${year}`);
            return { success: true };
        }

        return { success: false, message: 'Layer not active' };
    },

    /**
     * Helper: Check if point is in polygon (same as RoadsLayer)
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
    }
};

// Export for use in main script
window.NightlightLayer = NightlightLayer;
console.log('✓ Nightlight Layer Module loaded');
