# Layer Manager Usage Guide

## Overview

The Layer Manager provides a universal system to add ANY layer type to the dashboard automatically. It handles:
- ✅ Layers Panel integration
- ✅ Symbology Container integration
- ✅ Data Sources integration
- ✅ Automatic JSON conversion (standard format)

## Quick Start

### 1. Include the Layer Manager Script

```html
<script src="layer_manager.js"></script>
```

### 2. Define Your Layer Configuration

```javascript
const myLayerConfig = {
    type: 'roads',                    // Layer type: roads, population, nightlight, mpi
    version: '2024_07_23',            // Version identifier (underscore format)
    displayName: 'OSM Roads July 2024', // Human-readable name
    versionDate: '23 July 2024',      // Human-readable date
    isLatest: false,                  // true if this is the latest version

    symbology: {
        type: 'categorical',          // categorical, gradient, or classified
        icon: '🛣️',
        headerColor: '#22c55e',
        description: 'OpenStreetMap Highway Classification',
        categories: [
            { label: 'Motorway', color: '#7c2d12', weight: 1.2, count: 145 },
            { label: 'Primary', color: '#ef4444', weight: 1.1, count: 2341 },
            { label: 'Track', color: '#78716c', weight: 1, count: 8923, dashArray: '5, 10' }
        ],
        footer: 'Drag & Drop per region'
    },

    dataSource: {
        icon: '🗺️',
        provider: 'HDX - Humanitarian OpenStreetMap Team',
        description: 'Road network data from OpenStreetMap contributors',
        url: 'https://data.humdata.org/dataset/hotosm_som_roads',
        urlLabel: 'View on HDX',
        methodology: 'Community-mapped roads verified through satellite imagery'
    },

    layerHandler: {
        draggable: true,
        dragInfo: 'Drag to map to load roads for any region',
        onToggle: function(checked, config) {
            // Handle checkbox toggle
            console.log('Layer toggled:', checked);
        },
        onDragStart: function(e, config) {
            // Handle drag start
            e.dataTransfer.setData('layerType', config.type);
            e.dataTransfer.setData('layerVersion', config.version);
        }
    }
};
```

### 3. Add the Layer to Dashboard

```javascript
const result = addLayerToDashboard(myLayerConfig);

if (result.success) {
    console.log('✓ Layer added successfully!');
} else {
    console.error('Failed to add layer:', result.message);
}
```

## Symbology Types

### Categorical (Roads, Classifications)

```javascript
symbology: {
    type: 'categorical',
    icon: '🛣️',
    headerColor: '#22c55e',
    description: 'Road types',
    categories: [
        {
            label: 'Highway',
            color: '#dc2626',
            weight: 1.2,      // Font size multiplier
            count: 450,       // Optional feature count
            dashArray: null   // Optional: '5, 10' for dashed lines
        },
        { label: 'Street', color: '#fbbf24', weight: 1, count: 2100 }
    ],
    footer: 'Additional information'
}
```

### Gradient (Nightlight, Continuous Values)

```javascript
symbology: {
    type: 'gradient',
    icon: '💡',
    headerColor: '#f59e0b',
    gradient: 'linear-gradient(to right, #1e1b4b, #7c3aed, #e879f9, #fb923c, #fde047)',
    minLabel: 'Low Light',
    maxLabel: 'High Light',
    footer: '500m grid cells'
}
```

### Classified (Population, Ranges)

```javascript
symbology: {
    type: 'classified',
    icon: '👶',
    headerColor: '#EC407A',
    classes: [
        { range: '1-25', label: 'Low density', color: '#F48FB1', size: '1.3em', percentage: 96.3 },
        { range: '25-50', label: 'Medium', color: '#EC407A', size: '1.4em', percentage: 1.8 },
        { range: '50+', label: 'High', color: '#AD1457', size: '1.5em', percentage: 1.9 }
    ],
    footer: 'Population aged 0-12 months'
}
```

## Complete Examples

### Example 1: OSM Roads (with drag-and-drop)

```javascript
addLayerToDashboard({
    type: 'roads',
    version: '2024_07_23',
    displayName: 'OSM Roads July 2024',
    versionDate: '23 July 2024',
    isLatest: false,

    symbology: {
        type: 'categorical',
        icon: '🛣️',
        headerColor: '#22c55e',
        description: 'OpenStreetMap Highway Classification',
        categories: [
            { label: 'Motorway', color: '#7c2d12', weight: 1.2 },
            { label: 'Trunk', color: '#dc2626', weight: 1.2 },
            { label: 'Primary', color: '#ef4444', weight: 1.1 },
            { label: 'Secondary', color: '#f97316', weight: 1 },
            { label: 'Tertiary', color: '#fbbf24', weight: 1 },
            { label: 'Residential', color: '#cbd5e1', weight: 1 },
            { label: 'Track', color: '#78716c', weight: 1, dashArray: '5, 10' },
            { label: 'Other', color: '#94a3b8', weight: 1 }
        ],
        footer: 'Drag & Drop per region'
    },

    dataSource: {
        icon: '🗺️',
        provider: 'HDX - Humanitarian OpenStreetMap Team',
        description: 'Road network from OpenStreetMap contributors',
        url: 'https://data.humdata.org/dataset/hotosm_som_roads',
        urlLabel: 'View on HDX',
        methodology: 'Community-mapped roads verified via satellite imagery'
    },

    layerHandler: {
        draggable: true,
        dragInfo: 'Drag to map to load roads',
        onToggle: function(checked, config) {
            if (checked) {
                // Show instructions
                alert('Drag this layer to a region on the map');
            }
        },
        onDragStart: function(e, config) {
            e.dataTransfer.setData('roadsVersion', config.version);
            console.log('Dragging roads version:', config.version);
        }
    }
});
```

### Example 2: Nightlight (with checkbox toggle)

```javascript
addLayerToDashboard({
    type: 'nightlight',
    version: '2023',
    displayName: 'Nightlight Intensity 2023',
    versionDate: '2023',
    isLatest: true,

    symbology: {
        type: 'gradient',
        icon: '💡',
        headerColor: '#f59e0b',
        gradient: 'linear-gradient(to right, #1e1b4b, #7c3aed, #e879f9, #fb923c, #fde047)',
        minLabel: 'Low Light',
        maxLabel: 'High Light',
        footer: 'VIIRS DNB data, 500m resolution'
    },

    dataSource: {
        icon: '🛰️',
        provider: 'NASA Black Marble',
        description: 'VIIRS Day/Night Band nighttime lights',
        url: 'https://blackmarble.gsfc.nasa.gov/',
        urlLabel: 'NASA Black Marble',
        methodology: 'Monthly composite, cloud-free observations'
    },

    layerHandler: {
        draggable: false,
        onToggle: function(checked, config) {
            if (checked) {
                // Load nightlight layer
                loadNightlightLayer(config.version);
            } else {
                // Remove nightlight layer
                removeNightlightLayer(config.version);
            }
        }
    }
});
```

### Example 3: Population (classified)

```javascript
addLayerToDashboard({
    type: 'population',
    version: '2024',
    displayName: 'Population 0-12 months',
    versionDate: '2024',
    isLatest: true,

    symbology: {
        type: 'classified',
        icon: '👶',
        headerColor: '#EC407A',
        classes: [
            { range: '1-25', label: 'Low (1-25 infants)', color: '#F48FB1', size: '1.3em', percentage: 96.3 },
            { range: '25-50', label: 'Medium (25-50)', color: '#EC407A', size: '1.4em', percentage: 1.8 },
            { range: '50+', label: 'High (50+)', color: '#AD1457', size: '1.5em', percentage: 1.9 }
        ],
        footer: '500m grid, population ≥1 only'
    },

    dataSource: {
        icon: '📊',
        provider: 'WorldPop',
        description: 'Age-structured population estimates',
        url: 'https://www.worldpop.org/',
        urlLabel: 'WorldPop Portal',
        methodology: 'Random Forest model using census and geospatial covariates'
    },

    layerHandler: {
        draggable: true,
        dragInfo: 'Drag to region to load',
        onToggle: function(checked, config) {
            console.log('Population layer:', checked);
        }
    }
});
```

## Layer Registry

Check what layers are registered:

```javascript
// Get all versions of a layer type
const roadVersions = LayerRegistry.getVersions('roads');
console.log('Roads versions:', roadVersions); // ['2024_07_23', '2026_01_02']

// Check if specific version exists
if (LayerRegistry.hasVersion('roads', '2024_07_23')) {
    console.log('2024 roads exist in dashboard');
}

// Get metadata for a version
const metadata = LayerRegistry.getMetadata('roads', '2024_07_23');
console.log(metadata);
```

## Removing Layers

```javascript
const result = removeLayerFromDashboard('roads', '2024_07_23');

if (result.success) {
    console.log('✓ Layer removed');
}
```

## Integration with Version Check

```python
# Python: check_osm_version.py returns all versions with status
{
    'success': True,
    'versions': [
        {
            'date': '2026-01-02T03:56:55.562347',
            'date_short': '2026-01-02',
            'readable': '2 January 2026',
            'format': 'GEOJSON',
            'download_url': 'https://...',
            'size_mb': 82.9,
            'status': 'in_dashboard',  # or 'available'
            'is_latest': True,
            'local_folder': 'roads_by_region_2026_01_02'
        },
        {
            'date': '2024-07-23T14:07:41',
            'readable': '23 July 2024',
            'status': 'available',  # Not in dashboard yet
            'is_latest': False
        }
    ],
    'local_versions': ['2026-01-02'],
    'has_newer': False,
    'has_older': True
}
```

```javascript
// JavaScript: Use version check results to populate modal
fetch('http://localhost:5000/api/check-version')
    .then(r => r.json())
    .then(data => {
        data.versions.forEach(version => {
            if (version.status === 'available') {
                // Show checkbox to download
                addVersionCheckbox(version);
            } else {
                // Already in dashboard
                console.log(`✓ ${version.readable} already in dashboard`);
            }
        });
    });
```

## Best Practices

1. **Version Naming**: Use underscore format for version IDs: `2024_07_23`, `2023`, `v1_0`
2. **Standard JSON**: All data must be in JSON format (auto-converted from Geopackage)
3. **Incremental Addition**: Add versions incrementally as they're downloaded
4. **Latest Flag**: Always mark the most recent version as `isLatest: true`
5. **Consistency**: Use same symbology structure across similar layer types
6. **Error Handling**: Always check `result.success` before proceeding

## Architecture Benefits

- ✅ **Reusable**: Works for ANY layer type
- ✅ **Independent**: Self-contained, no dependencies on specific layers
- ✅ **Scalable**: Easy to add new layer types
- ✅ **Automatic**: Handles all UI updates automatically
- ✅ **Standard**: Enforces JSON format for all data
- ✅ **Traceable**: Layer Registry tracks everything

---

**Ready to use!** Just call `addLayerToDashboard(config)` with your layer configuration.
