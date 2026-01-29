/**
 * L1Clip Module - Admin Level 1 Regional Clipping
 * ================================================
 * Centralized module for clipping/filtering GeoJSON data by Somalia's
 * Admin Level 1 (regional) boundaries.
 *
 * This module provides runtime spatial filtering for any GeoJSON dataset
 * against predefined L1 regional boundaries.
 *
 * Usage:
 *   // Initialize (call once on page load)
 *   await L1Clip.init();
 *
 *   // Filter GeoJSON to only features within Bakool
 *   const bakoolData = L1Clip.filterByRegion('Bakool', geojsonData);
 *
 *   // Check if a point is within a region
 *   const isInBakool = L1Clip.isPointInRegion('Bakool', [lat, lng]);
 *
 *   // Get Leaflet bounds for a region
 *   const bounds = L1Clip.getRegionBounds('Bakool');
 *
 *   // Get all region names
 *   const regions = L1Clip.getRegionNames();
 *
 * @author Geo-Insights Lab, ESCWA, UN
 * @version 1.0.0
 * @date 2026-01-28
 */

console.log('[L1Clip] Module loading...');

var L1Clip = (function() {
    'use strict';

    // ========================================
    // PRIVATE STATE
    // ========================================

    let initialized = false;
    let boundariesData = null;  // Raw GeoJSON FeatureCollection
    let regionIndex = {};       // { regionName: feature } for fast lookup
    let regionBounds = {};      // { regionName: L.latLngBounds } cached bounds

    // Somalia Admin L1 Regions (18 total)
    const SOMALIA_REGIONS = [
        'Awdal', 'Bakool', 'Banadir', 'Bari', 'Bay', 'Galgaduud',
        'Gedo', 'Hiiraan', 'Lower Juba', 'Lower Shebelle', 'Middle Juba',
        'Middle Shebelle', 'Mudug', 'Nugaal', 'Sanaag', 'Sool',
        'Togdheer', 'Woqooyi Galbeed'
    ];

    // Path to boundaries file
    const BOUNDARIES_PATH = '../layers/boundaries/adm1/somalia_adm1_boundaries.geojson';

    // ========================================
    // GEOMETRY HELPER FUNCTIONS
    // ========================================

    /**
     * Ray casting algorithm to check if point is in polygon
     * @param {Array} point - [lng, lat] coordinate
     * @param {Array} ring - Array of [lng, lat] coordinates forming polygon ring
     * @returns {boolean}
     */
    function pointInRing(point, ring) {
        const x = point[0], y = point[1];
        let inside = false;

        for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
            const xi = ring[i][0], yi = ring[i][1];
            const xj = ring[j][0], yj = ring[j][1];

            const intersect = ((yi > y) !== (yj > y))
                && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }

        return inside;
    }

    /**
     * Check if point is within a GeoJSON polygon or multipolygon
     * @param {Array} point - [lng, lat] coordinate
     * @param {Object} geometry - GeoJSON geometry object
     * @returns {boolean}
     */
    function pointInGeometry(point, geometry) {
        if (!geometry || !geometry.coordinates) return false;

        if (geometry.type === 'Polygon') {
            // Polygon: first ring is exterior, rest are holes
            const exteriorRing = geometry.coordinates[0];
            if (!pointInRing(point, exteriorRing)) return false;

            // Check holes (if any)
            for (let i = 1; i < geometry.coordinates.length; i++) {
                if (pointInRing(point, geometry.coordinates[i])) return false;
            }
            return true;
        }

        if (geometry.type === 'MultiPolygon') {
            // MultiPolygon: array of polygons
            for (const polygon of geometry.coordinates) {
                const exteriorRing = polygon[0];
                if (pointInRing(point, exteriorRing)) {
                    // Check holes
                    let inHole = false;
                    for (let i = 1; i < polygon.length; i++) {
                        if (pointInRing(point, polygon[i])) {
                            inHole = true;
                            break;
                        }
                    }
                    if (!inHole) return true;
                }
            }
            return false;
        }

        return false;
    }

    /**
     * Get bounding box from GeoJSON geometry
     * @param {Object} geometry - GeoJSON geometry object
     * @returns {Object} { minLng, minLat, maxLng, maxLat }
     */
    function getBoundingBox(geometry) {
        let minLng = Infinity, minLat = Infinity;
        let maxLng = -Infinity, maxLat = -Infinity;

        function processCoords(coords) {
            if (typeof coords[0] === 'number') {
                // This is a coordinate [lng, lat]
                minLng = Math.min(minLng, coords[0]);
                maxLng = Math.max(maxLng, coords[0]);
                minLat = Math.min(minLat, coords[1]);
                maxLat = Math.max(maxLat, coords[1]);
            } else {
                // This is an array of coordinates
                for (const c of coords) {
                    processCoords(c);
                }
            }
        }

        if (geometry && geometry.coordinates) {
            processCoords(geometry.coordinates);
        }

        return { minLng, minLat, maxLng, maxLat };
    }

    /**
     * Check if a line segment intersects a polygon (simplified - checks endpoints and midpoints)
     * @param {Array} coords - Array of [lng, lat] coordinates forming the line
     * @param {Object} regionGeometry - GeoJSON geometry of region
     * @returns {boolean}
     */
    function lineIntersectsRegion(coords, regionGeometry) {
        // Sample points along the line (endpoints + midpoints)
        const samplePoints = [];

        for (let i = 0; i < coords.length; i++) {
            samplePoints.push(coords[i]);

            // Add midpoint between consecutive points
            if (i < coords.length - 1) {
                const midpoint = [
                    (coords[i][0] + coords[i + 1][0]) / 2,
                    (coords[i][1] + coords[i + 1][1]) / 2
                ];
                samplePoints.push(midpoint);
            }
        }

        // If any sample point is in the region, the line intersects
        for (const point of samplePoints) {
            if (pointInGeometry(point, regionGeometry)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check if a polygon intersects a region (checks centroid and vertices)
     * @param {Array} coords - Array of coordinate rings
     * @param {Object} regionGeometry - GeoJSON geometry of region
     * @returns {boolean}
     */
    function polygonIntersectsRegion(coords, regionGeometry) {
        // Get exterior ring
        const exteriorRing = coords[0];

        // Check centroid
        let sumLng = 0, sumLat = 0;
        for (const point of exteriorRing) {
            sumLng += point[0];
            sumLat += point[1];
        }
        const centroid = [sumLng / exteriorRing.length, sumLat / exteriorRing.length];

        if (pointInGeometry(centroid, regionGeometry)) {
            return true;
        }

        // Check vertices
        for (const point of exteriorRing) {
            if (pointInGeometry(point, regionGeometry)) {
                return true;
            }
        }

        return false;
    }

    // ========================================
    // PUBLIC API
    // ========================================

    /**
     * Initialize the module by loading L1 boundaries
     * @param {string} [customPath] - Optional custom path to boundaries file
     * @returns {Promise<boolean>} - True if initialization successful
     */
    async function init(customPath) {
        if (initialized && boundariesData) {
            console.log('[L1Clip] Already initialized');
            return true;
        }

        const path = customPath || BOUNDARIES_PATH;
        console.log('[L1Clip] Initializing with boundaries from:', path);

        try {
            const response = await fetch(path + '?t=' + Date.now());
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            boundariesData = await response.json();

            if (!boundariesData || !boundariesData.features) {
                throw new Error('Invalid GeoJSON: missing features array');
            }

            // Build region index
            regionIndex = {};
            regionBounds = {};

            for (const feature of boundariesData.features) {
                const name = feature.properties && feature.properties.name;
                if (name) {
                    regionIndex[name] = feature;

                    // Pre-compute Leaflet bounds if Leaflet is available
                    if (typeof L !== 'undefined' && feature.geometry) {
                        const bbox = getBoundingBox(feature.geometry);
                        regionBounds[name] = L.latLngBounds(
                            [bbox.minLat, bbox.minLng],
                            [bbox.maxLat, bbox.maxLng]
                        );
                    }
                }
            }

            initialized = true;
            console.log(`[L1Clip] Initialized with ${Object.keys(regionIndex).length} regions:`,
                Object.keys(regionIndex).join(', '));

            return true;

        } catch (error) {
            console.error('[L1Clip] Failed to initialize:', error);
            return false;
        }
    }

    /**
     * Check if a point is within a specific region
     * @param {string} regionName - Name of the region (e.g., 'Bakool')
     * @param {Array|Object} point - Either [lat, lng] array or {lat, lng} object
     * @returns {boolean}
     */
    function isPointInRegion(regionName, point) {
        if (!initialized) {
            console.warn('[L1Clip] Module not initialized. Call L1Clip.init() first.');
            return false;
        }

        const region = regionIndex[regionName];
        if (!region) {
            console.warn(`[L1Clip] Region not found: ${regionName}`);
            return false;
        }

        // Normalize point to [lng, lat] for GeoJSON
        let lng, lat;
        if (Array.isArray(point)) {
            // Assume [lat, lng] (Leaflet convention)
            lat = point[0];
            lng = point[1];
        } else if (point && typeof point.lat !== 'undefined') {
            lat = point.lat;
            lng = point.lng;
        } else {
            console.warn('[L1Clip] Invalid point format:', point);
            return false;
        }

        return pointInGeometry([lng, lat], region.geometry);
    }

    /**
     * Filter GeoJSON data to only features within a specific region
     * @param {string} regionName - Name of the region
     * @param {Object} geojson - GeoJSON FeatureCollection or array of features
     * @param {Object} [options] - Options
     * @param {string} [options.mode='intersects'] - 'intersects' (any part in region) or 'within' (centroid in region)
     * @returns {Object} - Filtered GeoJSON FeatureCollection
     */
    function filterByRegion(regionName, geojson, options = {}) {
        if (!initialized) {
            console.warn('[L1Clip] Module not initialized. Call L1Clip.init() first.');
            return { type: 'FeatureCollection', features: [] };
        }

        const region = regionIndex[regionName];
        if (!region) {
            console.warn(`[L1Clip] Region not found: ${regionName}`);
            return { type: 'FeatureCollection', features: [] };
        }

        const mode = options.mode || 'intersects';
        const regionGeometry = region.geometry;

        // Handle different input formats
        let features;
        if (Array.isArray(geojson)) {
            features = geojson;
        } else if (geojson && geojson.features) {
            features = geojson.features;
        } else {
            console.warn('[L1Clip] Invalid GeoJSON format');
            return { type: 'FeatureCollection', features: [] };
        }

        console.log(`[L1Clip] Filtering ${features.length} features by ${regionName} (mode: ${mode})`);

        const filteredFeatures = [];
        let processed = 0;

        for (const feature of features) {
            if (!feature || !feature.geometry) continue;

            const geomType = feature.geometry.type;
            const coords = feature.geometry.coordinates;
            let includeFeature = false;

            switch (geomType) {
                case 'Point':
                    // Point: check if point is in region
                    includeFeature = pointInGeometry(coords, regionGeometry);
                    break;

                case 'MultiPoint':
                    // MultiPoint: check if any point is in region
                    for (const point of coords) {
                        if (pointInGeometry(point, regionGeometry)) {
                            includeFeature = true;
                            break;
                        }
                    }
                    break;

                case 'LineString':
                    // LineString: check if line intersects region
                    includeFeature = lineIntersectsRegion(coords, regionGeometry);
                    break;

                case 'MultiLineString':
                    // MultiLineString: check if any line intersects region
                    for (const line of coords) {
                        if (lineIntersectsRegion(line, regionGeometry)) {
                            includeFeature = true;
                            break;
                        }
                    }
                    break;

                case 'Polygon':
                    // Polygon: check if polygon intersects region
                    includeFeature = polygonIntersectsRegion(coords, regionGeometry);
                    break;

                case 'MultiPolygon':
                    // MultiPolygon: check if any polygon intersects region
                    for (const polygon of coords) {
                        if (polygonIntersectsRegion(polygon, regionGeometry)) {
                            includeFeature = true;
                            break;
                        }
                    }
                    break;

                default:
                    console.warn(`[L1Clip] Unsupported geometry type: ${geomType}`);
            }

            if (includeFeature) {
                filteredFeatures.push(feature);
            }

            processed++;

            // Progress logging for large datasets
            if (processed % 10000 === 0) {
                console.log(`[L1Clip] Processed ${processed}/${features.length} features...`);
            }
        }

        console.log(`[L1Clip] Filtered result: ${filteredFeatures.length}/${features.length} features in ${regionName}`);

        return {
            type: 'FeatureCollection',
            features: filteredFeatures,
            metadata: {
                region: regionName,
                originalCount: features.length,
                filteredCount: filteredFeatures.length,
                filterMode: mode,
                timestamp: new Date().toISOString()
            }
        };
    }

    /**
     * Get Leaflet bounds for a region
     * @param {string} regionName - Name of the region
     * @returns {L.LatLngBounds|null}
     */
    function getRegionBounds(regionName) {
        if (!initialized) {
            console.warn('[L1Clip] Module not initialized. Call L1Clip.init() first.');
            return null;
        }

        if (regionBounds[regionName]) {
            return regionBounds[regionName];
        }

        const region = regionIndex[regionName];
        if (!region) {
            console.warn(`[L1Clip] Region not found: ${regionName}`);
            return null;
        }

        // Compute bounds on demand
        if (typeof L !== 'undefined' && region.geometry) {
            const bbox = getBoundingBox(region.geometry);
            regionBounds[regionName] = L.latLngBounds(
                [bbox.minLat, bbox.minLng],
                [bbox.maxLat, bbox.maxLng]
            );
            return regionBounds[regionName];
        }

        return null;
    }

    /**
     * Get the GeoJSON feature for a region
     * @param {string} regionName - Name of the region
     * @returns {Object|null} - GeoJSON Feature
     */
    function getRegionFeature(regionName) {
        if (!initialized) {
            console.warn('[L1Clip] Module not initialized. Call L1Clip.init() first.');
            return null;
        }

        return regionIndex[regionName] || null;
    }

    /**
     * Get all region names
     * @returns {Array<string>}
     */
    function getRegionNames() {
        if (!initialized) {
            return SOMALIA_REGIONS; // Return hardcoded list as fallback
        }
        return Object.keys(regionIndex);
    }

    /**
     * Get all available regions with their properties
     * @returns {Array<Object>} - Array of {name, area_km2, area_percent}
     */
    function getRegions() {
        if (!initialized) {
            console.warn('[L1Clip] Module not initialized. Call L1Clip.init() first.');
            return [];
        }

        return Object.entries(regionIndex).map(([name, feature]) => ({
            name: name,
            area_km2: feature.properties.area_km2 || null,
            area_percent: feature.properties.area_percent || null
        }));
    }

    /**
     * Check if module is initialized
     * @returns {boolean}
     */
    function isInitialized() {
        return initialized;
    }

    /**
     * Get which region a point belongs to
     * @param {Array|Object} point - Either [lat, lng] array or {lat, lng} object
     * @returns {string|null} - Region name or null if not in Somalia
     */
    function getRegionForPoint(point) {
        if (!initialized) {
            console.warn('[L1Clip] Module not initialized. Call L1Clip.init() first.');
            return null;
        }

        // Normalize point
        let lng, lat;
        if (Array.isArray(point)) {
            lat = point[0];
            lng = point[1];
        } else if (point && typeof point.lat !== 'undefined') {
            lat = point.lat;
            lng = point.lng;
        } else {
            return null;
        }

        // Check each region
        for (const [name, feature] of Object.entries(regionIndex)) {
            if (pointInGeometry([lng, lat], feature.geometry)) {
                return name;
            }
        }

        return null;
    }

    /**
     * Convert region name to safe filename format
     * @param {string} regionName - Original region name
     * @returns {string} - Safe filename (spaces replaced with underscores)
     */
    function toSafeFilename(regionName) {
        return regionName.replace(/ /g, '_').replace(/\//g, '_');
    }

    /**
     * Convert safe filename back to region name
     * @param {string} filename - Safe filename
     * @returns {string} - Original region name
     */
    function fromSafeFilename(filename) {
        // Handle known special cases
        const mapping = {
            'Lower_Juba': 'Lower Juba',
            'Lower_Shebelle': 'Lower Shebelle',
            'Middle_Juba': 'Middle Juba',
            'Middle_Shebelle': 'Middle Shebelle',
            'Woqooyi_Galbeed': 'Woqooyi Galbeed'
        };
        return mapping[filename] || filename.replace(/_/g, ' ');
    }

    // ========================================
    // RETURN PUBLIC API
    // ========================================

    return {
        // Initialization
        init: init,
        isInitialized: isInitialized,

        // Point operations
        isPointInRegion: isPointInRegion,
        getRegionForPoint: getRegionForPoint,

        // Data filtering
        filterByRegion: filterByRegion,

        // Region information
        getRegionBounds: getRegionBounds,
        getRegionFeature: getRegionFeature,
        getRegionNames: getRegionNames,
        getRegions: getRegions,

        // Utility
        toSafeFilename: toSafeFilename,
        fromSafeFilename: fromSafeFilename,

        // Constants
        SOMALIA_REGIONS: SOMALIA_REGIONS
    };

})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = L1Clip;
}

console.log('[L1Clip] Module loaded. Call L1Clip.init() to initialize with boundaries.');
