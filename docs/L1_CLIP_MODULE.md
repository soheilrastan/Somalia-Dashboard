# L1Clip Module Documentation
## Admin Level 1 Regional Clipping for Somalia Dashboard

---

## Overview

The **L1Clip Module** provides centralized spatial filtering/clipping functionality for any GeoJSON data against Somalia's Admin Level 1 (regional) boundaries. This enables runtime filtering of data layers by region without pre-processing.

---

## Why This Module?

### Problem
- Each layer (roads, population, nightlight) had **inline clipping code**
- Duplicated logic across 6+ layers (~100 lines each)
- Inconsistent clipping methods
- Adding new layers required copying/pasting clipping code

### Solution
- **Single module** handles all L1 clipping
- Any layer calls `L1Clip.filterByRegion(regionName, data)`
- Consistent behavior across all layers
- Adding 100 new layers = 100 one-liners

---

## Installation

The module is loaded automatically in `index_v3.1.html`:

```html
<script src="../modules/l1-clip.js?v=3.1&t=..."></script>
```

---

## API Reference

### Initialization

```javascript
// Initialize the module (must be called once before use)
await L1Clip.init();

// Optional: Use custom boundaries file
await L1Clip.init('/path/to/custom/boundaries.geojson');

// Check if initialized
L1Clip.isInitialized();  // Returns: boolean
```

### Point Operations

```javascript
// Check if a point is within a specific region
L1Clip.isPointInRegion('Bakool', [lat, lng]);      // Returns: boolean
L1Clip.isPointInRegion('Bakool', {lat: 4.0, lng: 44.0});  // Also works

// Detect which region a point belongs to
L1Clip.getRegionForPoint([4.0, 44.0]);  // Returns: 'Bakool' or null
```

### Data Filtering

```javascript
// Filter GeoJSON to only features within a region
const filtered = L1Clip.filterByRegion('Bakool', geojsonData);

// filtered = {
//   type: 'FeatureCollection',
//   features: [...],  // Only features in Bakool
//   metadata: {
//     region: 'Bakool',
//     originalCount: 5000,
//     filteredCount: 312,
//     filterMode: 'intersects',
//     timestamp: '2026-01-28T...'
//   }
// }

// Filter options
const filtered = L1Clip.filterByRegion('Bakool', geojsonData, {
    mode: 'intersects'  // 'intersects' (default) or 'within'
});
```

### Region Information

```javascript
// Get all region names
L1Clip.getRegionNames();
// Returns: ['Awdal', 'Bakool', 'Banadir', ...]

// Get all regions with properties
L1Clip.getRegions();
// Returns: [
//   { name: 'Bakool', area_km2: 26962, area_percent: 4.2 },
//   { name: 'Bay', area_km2: 35156, area_percent: 5.5 },
//   ...
// ]

// Get Leaflet bounds for a region
const bounds = L1Clip.getRegionBounds('Bakool');
map.fitBounds(bounds);

// Get GeoJSON feature for a region
const feature = L1Clip.getRegionFeature('Bakool');
L.geoJSON(feature).addTo(map);
```

### Utility Functions

```javascript
// Convert region name to safe filename
L1Clip.toSafeFilename('Lower Juba');  // Returns: 'Lower_Juba'

// Convert safe filename back to region name
L1Clip.fromSafeFilename('Lower_Juba');  // Returns: 'Lower Juba'
```

---

## Supported Geometry Types

The module correctly handles all GeoJSON geometry types:

| Geometry Type | Filtering Logic |
|--------------|-----------------|
| Point | Checks if point is inside region polygon |
| MultiPoint | Includes if ANY point is inside region |
| LineString | Checks endpoints and midpoints |
| MultiLineString | Includes if ANY line intersects region |
| Polygon | Checks centroid and vertices |
| MultiPolygon | Includes if ANY polygon intersects region |

---

## Somalia Regions (L1)

The module includes all 18 Admin Level 1 regions:

| Region | Area (km²) | % of Total |
|--------|-----------|------------|
| Awdal | 21,374 | 3.3% |
| Bakool | 26,962 | 4.2% |
| Banadir | 370 | 0.1% |
| Bari | 70,088 | 11.0% |
| Bay | 35,156 | 5.5% |
| Galgaduud | 46,126 | 7.2% |
| Gedo | 60,389 | 9.5% |
| Hiiraan | 34,696 | 5.4% |
| Lower Juba | 42,876 | 6.7% |
| Lower Shebelle | 25,285 | 4.0% |
| Middle Juba | 9,191 | 1.4% |
| Middle Shebelle | 22,663 | 3.6% |
| Mudug | 72,933 | 11.4% |
| Nugaal | 26,180 | 4.1% |
| Sanaag | 54,812 | 8.6% |
| Sool | 25,036 | 3.9% |
| Togdheer | 38,663 | 6.1% |
| Woqooyi Galbeed | 28,836 | 4.5% |

---

## Usage Examples

### Example 1: Filter Population Data by Region

```javascript
// Load population GeoJSON
const response = await fetch('data/somalia_population.geojson');
const populationData = await response.json();

// Filter to Bakool region
const bakoolPopulation = L1Clip.filterByRegion('Bakool', populationData);

// Create Leaflet layer
L.geoJSON(bakoolPopulation).addTo(map);

console.log(`Loaded ${bakoolPopulation.metadata.filteredCount} settlements in Bakool`);
```

### Example 2: Runtime Region Detection

```javascript
// On map click, detect which region
map.on('click', function(e) {
    const region = L1Clip.getRegionForPoint(e.latlng);

    if (region) {
        alert(`You clicked on ${region}`);
    } else {
        alert('Outside Somalia');
    }
});
```

### Example 3: Validate Drop Zone

```javascript
// In drag-drop handler
mapContainer.addEventListener('drop', function(e) {
    const latlng = map.mouseEventToLatLng(e);
    const region = document.getElementById('regionSelect').value;

    if (!L1Clip.isPointInRegion(region, latlng)) {
        showWarning(`Please drop on ${region}`);
        return;
    }

    // Process drop...
});
```

---

## Migration Guide

### Before (Inline Clipping)
```javascript
// Each layer had ~50-100 lines of clipping code
function loadPopulationLayer(regionName) {
    fetch('population.geojson')
        .then(response => response.json())
        .then(data => {
            // Inline point-in-polygon check
            const filtered = data.features.filter(f => {
                const coords = f.geometry.coordinates;
                // ... 30 lines of ray casting algorithm ...
                return isInRegion;
            });
            // ... more code ...
        });
}
```

### After (Using L1Clip)
```javascript
async function loadPopulationLayer(regionName) {
    await L1Clip.init();  // Only needed once

    const response = await fetch('population.geojson');
    const data = await response.json();

    const filtered = L1Clip.filterByRegion(regionName, data);

    L.geoJSON(filtered).addTo(map);
}
```

---

## Testing

A test page is available at `test_l1_clip.html`:

1. Open `test_l1_clip.html` in browser
2. Click "Initialize L1Clip Module"
3. Select a region from dropdown
4. Click on map to test point-in-region
5. Load random test data and filter

---

## Future Extensions

### L2Clip Module (Admin Level 2 - Districts)
The same architecture can be extended for district-level clipping:

```javascript
// Future API
await L2Clip.init();
L2Clip.filterByDistrict('Bakool', 'Xudur', geojsonData);
L2Clip.getDistrictsInRegion('Bakool');  // ['Xudur', 'Tayeeglow', ...]
```

---

## Performance Notes

- **Initialization**: ~100-200ms (loads 1.1MB boundaries file)
- **Point test**: <1ms per point
- **Filter 10,000 points**: ~50-100ms
- **Filter 100,000 points**: ~500ms-1s

For very large datasets, consider pre-clipping at data preparation time.

---

*Document Version: 1.0 | January 28, 2026 | ESCWA Geo-Insights Lab*
