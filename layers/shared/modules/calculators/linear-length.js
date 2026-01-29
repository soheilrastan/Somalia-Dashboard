/**
 * Linear Length Calculator Module
 * ================================
 * Generic calculator for computing lengths of linear GeoJSON features in meters.
 * Uses Haversine formula for accurate geographic distance calculation.
 *
 * Works with ANY linear feature type:
 * - Roads (primary, secondary, tracks, etc.)
 * - Electrical networks (transmission lines, distribution)
 * - Water pipelines
 * - Rivers and streams
 * - Railway lines
 * - Any LineString or MultiLineString geometry
 *
 * Usage:
 *   LinearLengthCalculator.calculate(feature);           // Returns length in meters (rounded to 1m)
 *   LinearLengthCalculator.addLengthToLayer(geoJson);    // Adds Length_m to all features
 *   LinearLengthCalculator.getTotalLength(geoJson);      // Returns total length of all features
 *   LinearLengthCalculator.getStatistics(geoJson);       // Returns min/max/avg/total statistics
 */

console.log('[LinearLengthCalculator] linear-length.js file loading...');

var LinearLengthCalculator = (function() {
    'use strict';

    // Earth's radius in meters (WGS84 mean radius)
    const EARTH_RADIUS_M = 6371008.8;

    // ========================================
    // HAVERSINE FORMULA
    // ========================================

    /**
     * Convert degrees to radians
     */
    function toRadians(degrees) {
        return degrees * (Math.PI / 180);
    }

    /**
     * Calculate distance between two points using Haversine formula
     * @param {number} lon1 - Longitude of point 1 (degrees)
     * @param {number} lat1 - Latitude of point 1 (degrees)
     * @param {number} lon2 - Longitude of point 2 (degrees)
     * @param {number} lat2 - Latitude of point 2 (degrees)
     * @returns {number} Distance in meters
     */
    function haversineDistance(lon1, lat1, lon2, lat2) {
        const dLat = toRadians(lat2 - lat1);
        const dLon = toRadians(lon2 - lon1);

        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return EARTH_RADIUS_M * c;
    }

    // ========================================
    // LINE LENGTH CALCULATION
    // ========================================

    /**
     * Calculate total length of a coordinate array (LineString)
     * @param {Array} coordinates - Array of [lon, lat] pairs
     * @returns {number} Total length in meters
     */
    function calculateLineLength(coordinates) {
        if (!coordinates || coordinates.length < 2) {
            return 0;
        }

        let totalLength = 0;

        for (let i = 0; i < coordinates.length - 1; i++) {
            const [lon1, lat1] = coordinates[i];
            const [lon2, lat2] = coordinates[i + 1];

            totalLength += haversineDistance(lon1, lat1, lon2, lat2);
        }

        return totalLength;
    }

    /**
     * Calculate total length of a MultiLineString
     * @param {Array} multiLineCoords - Array of LineString coordinate arrays
     * @returns {number} Total length in meters
     */
    function calculateMultiLineLength(multiLineCoords) {
        if (!multiLineCoords || !Array.isArray(multiLineCoords)) {
            return 0;
        }

        let totalLength = 0;

        for (const lineCoords of multiLineCoords) {
            totalLength += calculateLineLength(lineCoords);
        }

        return totalLength;
    }

    // ========================================
    // PUBLIC API
    // ========================================

    /**
     * Calculate length of a single GeoJSON feature
     * Automatically detects geometry type (LineString or MultiLineString)
     * @param {Object} feature - GeoJSON feature with geometry
     * @returns {number} Length in meters, rounded to 1m
     */
    function calculate(feature) {
        if (!feature || !feature.geometry) {
            console.warn('[LinearLengthCalculator] Feature has no geometry');
            return 0;
        }

        const geometry = feature.geometry;
        let length = 0;

        switch (geometry.type) {
            case 'LineString':
                length = calculateLineLength(geometry.coordinates);
                break;

            case 'MultiLineString':
                length = calculateMultiLineLength(geometry.coordinates);
                break;

            default:
                console.warn(`[LinearLengthCalculator] Unsupported geometry type: ${geometry.type}`);
                return 0;
        }

        // Round to 1 meter
        return Math.round(length);
    }

    /**
     * Add Length_m property to all features in a GeoJSON layer
     * @param {Object} geoJson - GeoJSON FeatureCollection
     * @param {string} propertyName - Optional custom property name (default: 'Length_m')
     * @returns {Object} Same GeoJSON with length added to each feature
     */
    function addLengthToLayer(geoJson, propertyName = 'Length_m') {
        if (!geoJson || !geoJson.features) {
            console.warn('[LinearLengthCalculator] Invalid GeoJSON - no features array');
            return geoJson;
        }

        let processedCount = 0;
        let totalLength = 0;

        for (const feature of geoJson.features) {
            if (!feature.properties) {
                feature.properties = {};
            }

            const length = calculate(feature);
            feature.properties[propertyName] = length;
            totalLength += length;
            processedCount++;
        }

        console.log(`[LinearLengthCalculator] Processed ${processedCount} features, total length: ${(totalLength / 1000).toFixed(2)} km`);

        return geoJson;
    }

    /**
     * Get total length of all features in a GeoJSON layer
     * @param {Object} geoJson - GeoJSON FeatureCollection
     * @param {string} propertyName - Optional property name to check first (default: 'Length_m')
     * @returns {number} Total length in meters
     */
    function getTotalLength(geoJson, propertyName = 'Length_m') {
        if (!geoJson || !geoJson.features) {
            return 0;
        }

        let totalLength = 0;

        for (const feature of geoJson.features) {
            // Use existing length property if available, otherwise calculate
            if (feature.properties && feature.properties[propertyName]) {
                totalLength += feature.properties[propertyName];
            } else {
                totalLength += calculate(feature);
            }
        }

        return Math.round(totalLength);
    }

    /**
     * Get length statistics for a GeoJSON layer
     * @param {Object} geoJson - GeoJSON FeatureCollection
     * @param {string} propertyName - Optional property name to check first (default: 'Length_m')
     * @returns {Object} Statistics object
     */
    function getStatistics(geoJson, propertyName = 'Length_m') {
        if (!geoJson || !geoJson.features || geoJson.features.length === 0) {
            return {
                count: 0,
                totalLength_m: 0,
                totalLength_km: 0,
                avgLength_m: 0,
                minLength_m: 0,
                maxLength_m: 0
            };
        }

        const lengths = geoJson.features.map(f => {
            if (f.properties && f.properties[propertyName]) {
                return f.properties[propertyName];
            }
            return calculate(f);
        });

        const totalLength = lengths.reduce((sum, len) => sum + len, 0);

        return {
            count: lengths.length,
            totalLength_m: Math.round(totalLength),
            totalLength_km: Math.round(totalLength / 10) / 100, // Round to 2 decimal places
            avgLength_m: Math.round(totalLength / lengths.length),
            minLength_m: Math.round(Math.min(...lengths)),
            maxLength_m: Math.round(Math.max(...lengths))
        };
    }

    // ========================================
    // RETURN PUBLIC API
    // ========================================

    return {
        calculate,
        addLengthToLayer,
        getTotalLength,
        getStatistics,
        // Expose internal functions for testing/advanced use
        haversineDistance,
        calculateLineLength,
        calculateMultiLineLength
    };

})();

// Backward compatibility alias - RoadLengthCalculator points to same module
var RoadLengthCalculator = LinearLengthCalculator;

// Export for module systems (Node.js)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LinearLengthCalculator;
}

console.log('[LinearLengthCalculator] Module fully loaded, typeof LinearLengthCalculator =', typeof LinearLengthCalculator);
