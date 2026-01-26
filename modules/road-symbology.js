/**
 * Road Symbology Module
 * =====================
 * Unified symbology for all road layers across all versions.
 * Bridges different attribute schemas (fclass vs highway).
 *
 * All road layers POINT to this module for consistent styling.
 *
 * Usage:
 *   RoadSymbology.getStyle(feature);      // Returns {color, weight, opacity, dashArray}
 *   RoadSymbology.getClass(feature);      // Returns standardized class name
 *   RoadSymbology.getPopupContent(feature); // Returns popup HTML
 */

console.log('[RoadSymbology] roads.js file loading...');

var RoadSymbology = (function() {
    'use strict';

    // ========================================
    // STANDARD ROAD CLASSES (Capital letter)
    // ========================================
    // Aggregated classes:
    // - Trunk = trunk + trunk_link
    // - Primary = primary + primary_link
    // - Secondary = secondary + secondary_link
    // - Tertiary = tertiary + tertiary_link

    const ROAD_CLASSES = {
        // Major Roads
        Trunk: {
            color: '#7c2d12',      // Dark brown
            weight: 4.5,
            opacity: 0.9,
            dashArray: null,
            description: 'Major Highway / Trunk Road'
        },
        Primary: {
            color: '#dc2626',      // Red
            weight: 4,
            opacity: 0.9,
            dashArray: null,
            description: 'Primary Road'
        },
        Secondary: {
            color: '#f97316',      // Orange
            weight: 3,
            opacity: 0.85,
            dashArray: null,
            description: 'Secondary Road'
        },
        Tertiary: {
            color: '#fbbf24',      // Yellow
            weight: 2.5,
            opacity: 0.85,
            dashArray: null,
            description: 'Tertiary Road'
        },

        // Urban Roads
        Residential: {
            color: '#60a5fa',      // Blue
            weight: 2,
            opacity: 0.8,
            dashArray: null,
            description: 'Residential Road'
        },
        Service: {
            color: '#cbd5e1',      // Light gray
            weight: 1.5,
            opacity: 0.7,
            dashArray: null,
            description: 'Service Road (parking, driveways)'
        },

        // Rural / Unpaved
        Unclassified: {
            color: '#94a3b8',      // Gray
            weight: 1.5,
            opacity: 0.8,
            dashArray: null,
            description: 'Unclassified Road'
        },
        Track: {
            color: '#78716c',      // Brown
            weight: 1.5,
            opacity: 0.75,
            dashArray: '5, 10',    // Dotted
            description: 'Track / Unpaved Road'
        },

        // Pedestrian / Paths
        Path: {
            color: '#a8a29e',      // Tan
            weight: 1,
            opacity: 0.7,
            dashArray: '3, 6',     // Dotted
            description: 'Path / Walking Trail'
        },
        Footway: {
            color: '#a8a29e',      // Tan
            weight: 1,
            opacity: 0.7,
            dashArray: '3, 6',     // Dotted
            description: 'Footway / Sidewalk'
        },
        Pedestrian: {
            color: '#d4d4d8',      // Light gray
            weight: 1,
            opacity: 0.7,
            dashArray: '2, 4',     // Small dots
            description: 'Pedestrian Zone'
        },
        Steps: {
            color: '#d4d4d8',      // Light gray
            weight: 1,
            opacity: 0.7,
            dashArray: '1, 3',     // Tiny dots
            description: 'Steps / Stairs'
        },

        // Special
        Construction: {
            color: '#fca5a5',      // Pink
            weight: 2,
            opacity: 0.7,
            dashArray: '5, 10',    // Dotted
            description: 'Road Under Construction'
        },

        // Default / Unknown
        Unknown: {
            color: '#6b7280',      // Medium gray
            weight: 1,
            opacity: 0.6,
            dashArray: null,
            description: 'Unknown Road Type'
        }
    };

    // ========================================
    // BRIDGING TABLE
    // Maps fclass (2023) and highway (2024/Latest) to Standard Class
    // ========================================
    const BRIDGING_TABLE = {
        // Trunk (aggregated)
        'trunk': 'Trunk',
        'trunk_link': 'Trunk',

        // Primary (aggregated)
        'primary': 'Primary',
        'primary_link': 'Primary',

        // Secondary (aggregated)
        'secondary': 'Secondary',
        'secondary_link': 'Secondary',

        // Tertiary (aggregated)
        'tertiary': 'Tertiary',
        'tertiary_link': 'Tertiary',

        // Urban
        'residential': 'Residential',
        'service': 'Service',

        // Rural / Unpaved
        'unclassified': 'Unclassified',
        'track': 'Track',
        'track_grade1': 'Track',
        'track_grade2': 'Track',
        'track_grade3': 'Track',
        'track_grade4': 'Track',
        'track_grade5': 'Track',

        // Pedestrian / Paths
        'path': 'Path',
        'footway': 'Footway',
        'pedestrian': 'Pedestrian',
        'steps': 'Steps',

        // Special
        'construction': 'Construction'
    };

    // ========================================
    // FUNCTIONS
    // ========================================

    /**
     * Get the raw road type from feature properties
     * Handles both fclass (2023) and highway (2024/Latest) attributes
     */
    function getRawType(feature) {
        if (!feature || !feature.properties) return null;

        const props = feature.properties;

        // Check fclass first (2023 format)
        if (props.fclass) {
            return props.fclass.toLowerCase();
        }

        // Check highway (2024/Latest format)
        if (props.highway) {
            return props.highway.toLowerCase();
        }

        // Legacy: check TYPE (old format)
        if (props.TYPE) {
            return props.TYPE.toLowerCase();
        }

        return null;
    }

    /**
     * Get standardized class name (with Capital letter)
     */
    function getClass(feature) {
        const rawType = getRawType(feature);

        if (!rawType) return 'Unknown';

        return BRIDGING_TABLE[rawType] || 'Unknown';
    }

    /**
     * Get style object for Leaflet
     */
    function getStyle(feature) {
        const className = getClass(feature);
        const classStyle = ROAD_CLASSES[className] || ROAD_CLASSES.Unknown;

        return {
            color: classStyle.color,
            weight: classStyle.weight,
            opacity: classStyle.opacity,
            dashArray: classStyle.dashArray,
            lineCap: 'round',
            lineJoin: 'round'
        };
    }

    /**
     * Get color only (for legends, etc.)
     */
    function getColor(feature) {
        const className = getClass(feature);
        return ROAD_CLASSES[className]?.color || ROAD_CLASSES.Unknown.color;
    }

    /**
     * Get weight only
     */
    function getWeight(feature) {
        const className = getClass(feature);
        return ROAD_CLASSES[className]?.weight || ROAD_CLASSES.Unknown.weight;
    }

    /**
     * Get popup content HTML
     */
    function getPopupContent(feature, options = {}) {
        if (!feature || !feature.properties) {
            return '<div>No data available</div>';
        }

        const props = feature.properties;
        const className = getClass(feature);
        const classInfo = ROAD_CLASSES[className] || ROAD_CLASSES.Unknown;
        const rawType = getRawType(feature);

        // Get name
        const name = props.name || props['name:en'] || props['name:so'] || 'Unnamed Road';

        // Get surface
        const surface = props.surface || 'Unknown';

        // Get length if available
        const length = props.Length_m
            ? `${(props.Length_m / 1000).toFixed(2)} km`
            : 'Not calculated';

        // Get source info
        const source = options.source || props.Source_Yea || props.source || 'OSM';

        // Get OSM ID
        const osmId = props.osm_id || props.osm_type || 'N/A';

        return `
            <div style="font-family: 'Segoe UI', sans-serif; min-width: 180px;">
                <div style="font-weight: bold; color: ${classInfo.color}; font-size: 1.1em; margin-bottom: 8px; border-bottom: 2px solid ${classInfo.color}; padding-bottom: 4px;">
                    ${name}
                </div>
                <div style="margin: 6px 0;">
                    <span style="color: #94a3b8; font-size: 0.8em;">Class:</span><br>
                    <span style="font-weight: 600; color: ${classInfo.color};">${className}</span>
                    <span style="color: #6b7280; font-size: 0.75em;">(${rawType})</span>
                </div>
                <div style="margin: 6px 0;">
                    <span style="color: #94a3b8; font-size: 0.8em;">Surface:</span><br>
                    <span>${surface}</span>
                </div>
                <div style="margin: 6px 0;">
                    <span style="color: #94a3b8; font-size: 0.8em;">Length:</span><br>
                    <span>${length}</span>
                </div>
                <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #e5e7eb; font-size: 0.75em; color: #6b7280;">
                    Source: ${source} | OSM: ${osmId}
                </div>
            </div>
        `;
    }

    /**
     * Get all class definitions (for legends)
     */
    function getClasses() {
        return { ...ROAD_CLASSES };
    }

    /**
     * Get legend HTML
     */
    function getLegendHTML() {
        let html = '<div style="font-size: 0.85em;">';
        html += '<div style="font-weight: bold; margin-bottom: 8px; color: #374151;">Road Classes</div>';

        const mainClasses = ['Trunk', 'Primary', 'Secondary', 'Tertiary', 'Residential', 'Unclassified', 'Track', 'Path'];

        mainClasses.forEach(className => {
            const cls = ROAD_CLASSES[className];
            const dashStyle = cls.dashArray ? 'dashed' : 'solid';
            html += `
                <div style="display: flex; align-items: center; margin: 4px 0;">
                    <div style="width: 30px; height: 3px; background: ${cls.color}; margin-right: 8px; border-style: ${dashStyle};"></div>
                    <span>${className}</span>
                </div>
            `;
        });

        html += '</div>';
        return html;
    }

    // ========================================
    // PUBLIC API
    // ========================================
    return {
        getClass,
        getStyle,
        getColor,
        getWeight,
        getPopupContent,
        getClasses,
        getLegendHTML,
        getRawType,
        ROAD_CLASSES,
        BRIDGING_TABLE
    };

})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RoadSymbology;
}

console.log('[RoadSymbology] RoadSymbology module fully loaded, typeof RoadSymbology =', typeof RoadSymbology);
