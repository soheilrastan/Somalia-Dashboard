# R2A: Rendering-2-Analytics Speed Architecture
## Version 4.1 - Geo-Insights Dashboard

**Date:** 2026-01-29
**Status:** Specification
**Keyword:** `GEO-INSIGHTS-ARCH`, `R2A-SPEED`

---

## 1. Executive Summary

R2A (Rendering-2-Analytics) is a performance optimization architecture that separates **visualization** (fast, lightweight) from **analytics** (heavy, on-demand). This enables:

- **Instant layer loading** (< 0.5 seconds vs 5-15 seconds)
- **Scalability to 22 Arab countries** without code duplication
- **Single template** with dynamic `${COUNTRY}` pointer
- **Backend analytics processing** for complex calculations

---

## 2. Core Principles

### 2.1 ONE Template, 22 Countries

```
User clicks flag → URL: template/index.html?country=yemen → Same code, different data
```

**NO code duplication.** Each country only has:
- `config.json` (country-specific settings)
- Data files (tiles, geodata)

### 2.2 Visualization vs Analytics Separation

| Layer | Location | Size | Purpose |
|-------|----------|------|---------|
| **WebP Tile** | Frontend | ~150 KB | Visual display only |
| **Hover GeoJSON** | Frontend | ~500 KB | Interaction (simplified) |
| **Full GeoJSON** | Backend | ~40 MB | Analytics processing |

### 2.3 On-Demand Analytics

Analytics are **never** calculated during layer load. Only when user explicitly triggers iSEE Analytics does the backend process the full data.

---

## 3. File Structure

```
Somalia Dashboard/
├── countries/
│   ├── template/                      # ONE template for ALL countries
│   │   ├── index.html                 # Dynamic ${COUNTRY} pointer
│   │   ├── script.js                  # Dynamic ${COUNTRY} pointer
│   │   └── styles.css                 # Universal (no changes needed)
│   │
│   ├── somalia/
│   │   └── config.json                # ONLY config per country
│   ├── yemen/
│   │   └── config.json
│   ├── egypt/
│   │   └── config.json
│   └── ... (22 countries, each ONLY has config.json)
│
├── data_warehouse/
│   ├── tiles/                         # Pre-rendered WebP images
│   │   ├── somalia/
│   │   │   └── L1/
│   │   │       ├── Bakool/
│   │   │       │   ├── roads_osm_2024.webp
│   │   │       │   ├── roads_osm_2024.hover.geojson
│   │   │       │   ├── roads_osm_2024.meta.json
│   │   │       │   ├── population_2020.webp
│   │   │       │   ├── population_2020.hover.geojson
│   │   │       │   ├── population_2020.meta.json
│   │   │       │   └── ...
│   │   │       ├── Bay/
│   │   │       └── ... (18 regions)
│   │   ├── yemen/
│   │   │   └── L1/
│   │   │       └── ... (22 governorates)
│   │   └── ... (22 countries)
│   │
│   └── geodata/                       # Full GeoJSON (backend only)
│       ├── somalia/
│       │   └── L1/
│       │       └── Bakool/
│       │           ├── roads_osm_2024.full.geojson
│       │           ├── population_2020.full.geojson
│       │           └── ...
│       └── ...
│
├── shared/
│   └── modules/
│       ├── r2a-loader.js              # NEW: Dynamic tile loader
│       ├── isee_analytics.js          # Updated: calls backend API
│       ├── ddr.js                     # Updated: uses R2A loader
│       ├── l1-clip.js
│       ├── layer-registry.js
│       ├── road-symbology.js
│       ├── ssm-module.js
│       ├── geo-api.js
│       └── data-loader.js
│
├── backend/
│   ├── api.py                         # Updated: /api/analytics/isee endpoint
│   └── analytics_worker.py            # NEW: Background analytics processor
│
├── tools/
│   ├── generate_tiles.py              # NEW: GeoJSON → WebP + hover + meta
│   ├── process_worldpop.py
│   └── update_osm_roads.py
│
└── country-selector.html              # Updated: points to template?country=X
```

---

## 4. Dynamic Template System

### 4.1 URL Parameter

```
countries/template/index.html?country=somalia
countries/template/index.html?country=yemen
countries/template/index.html?country=egypt
```

### 4.2 JavaScript Implementation

```javascript
// countries/template/script.js

// ============================================
// DYNAMIC COUNTRY POINTER
// ============================================

// Get country from URL parameter (default: somalia)
const COUNTRY = new URLSearchParams(window.location.search).get('country') || 'somalia';

// Load country-specific configuration
let CONFIG = null;
async function loadConfig() {
    const response = await fetch(`../../countries/${COUNTRY}/config.json`);
    CONFIG = await response.json();
    console.log(`[R2A] Loaded config for: ${CONFIG.country.name}`);
    return CONFIG;
}

// Dynamic paths based on country
const PATHS = {
    get tiles() { return `../../data_warehouse/tiles/${COUNTRY}`; },
    get geodata() { return `../../data_warehouse/geodata/${COUNTRY}`; },
    get config() { return `../../countries/${COUNTRY}/config.json`; }
};

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    // Load config first
    await loadConfig();

    // Update page title with country name
    document.title = `${CONFIG.country.name} - Geo-Insights Dashboard`;

    // Initialize map with country bounds
    initMap(CONFIG.country.bounds);

    // Load L1 boundaries
    loadBoundaries();
});
```

### 4.3 country-selector.html Update

```javascript
// All countries point to SAME template with different parameter
const countryDashboards = {
    'algeria': { url: 'countries/template/index.html?country=algeria', status: 'coming' },
    'bahrain': { url: 'countries/template/index.html?country=bahrain', status: 'coming' },
    'comoros': { url: 'countries/template/index.html?country=comoros', status: 'coming' },
    'djibouti': { url: 'countries/template/index.html?country=djibouti', status: 'coming' },
    'egypt': { url: 'countries/template/index.html?country=egypt', status: 'coming' },
    'iraq': { url: 'countries/template/index.html?country=iraq', status: 'coming' },
    'jordan': { url: 'countries/template/index.html?country=jordan', status: 'coming' },
    'kuwait': { url: 'countries/template/index.html?country=kuwait', status: 'coming' },
    'lebanon': { url: 'countries/template/index.html?country=lebanon', status: 'coming' },
    'libya': { url: 'countries/template/index.html?country=libya', status: 'coming' },
    'mauritania': { url: 'countries/template/index.html?country=mauritania', status: 'coming' },
    'morocco': { url: 'countries/template/index.html?country=morocco', status: 'coming' },
    'oman': { url: 'countries/template/index.html?country=oman', status: 'coming' },
    'palestine': { url: 'countries/template/index.html?country=palestine', status: 'coming' },
    'qatar': { url: 'countries/template/index.html?country=qatar', status: 'coming' },
    'saudi': { url: 'countries/template/index.html?country=saudi', status: 'coming' },
    'somalia': { url: 'countries/template/index.html?country=somalia', status: 'alpha' },
    'sudan': { url: 'countries/template/index.html?country=sudan', status: 'coming' },
    'syria': { url: 'countries/template/index.html?country=syria', status: 'coming' },
    'tunisia': { url: 'countries/template/index.html?country=tunisia', status: 'coming' },
    'uae': { url: 'countries/template/index.html?country=uae', status: 'coming' },
    'yemen': { url: 'countries/template/index.html?country=yemen', status: 'coming' }
};
```

---

## 5. Config.json Template

Each country has ONE file: `countries/{country}/config.json`

```json
{
    "version": "4.1",
    "country": {
        "code": "somalia",
        "name": "Somalia",
        "name_ar": "الصومال",
        "iso3": "SOM",
        "bounds": [[−1.5, 41.0], [12.0, 51.5]],
        "center": [5.15, 46.2],
        "zoom": 6
    },
    "administrative": {
        "L1": {
            "name": "Region",
            "name_local": "Gobol",
            "count": 18,
            "boundary_file": "layers/Som_Admbnda_Adm1_UNDP.geojson",
            "name_field": "admin1Name"
        },
        "L2": {
            "name": "District",
            "name_local": "Degmo",
            "count": 74,
            "boundary_file": "layers/Som_Admbnda_Adm2_UNDP.geojson",
            "name_field": "admin2Name"
        }
    },
    "regions": [
        "Awdal", "Bakool", "Banadir", "Bari", "Bay", "Galgaduud",
        "Gedo", "Hiiraan", "Jubbada Dhexe", "Jubbada Hoose",
        "Mudug", "Nugaal", "Sanaag", "Shabeellaha Dhexe",
        "Shabeellaha Hoose", "Sool", "Togdheer", "Woqooyi Galbeed"
    ],
    "data_sources": {
        "population": {
            "provider": "WorldPop",
            "resolution": "1km",
            "years": [2020, 2021, 2022, 2023, 2024]
        },
        "roads": {
            "provider": "OpenStreetMap",
            "last_update": "2024-12-01"
        },
        "nightlight": {
            "provider": "VIIRS",
            "years": [2020, 2021, 2022, 2023]
        }
    },
    "paths": {
        "tiles": "../../data_warehouse/tiles/somalia",
        "geodata": "../../data_warehouse/geodata/somalia",
        "boundaries": "../../layers"
    }
}
```

---

## 6. Tile Generation System

### 6.1 Python Script: `tools/generate_tiles.py`

```python
#!/usr/bin/env python3
"""
R2A Tile Generator
Converts GeoJSON to WebP tiles + hover GeoJSON + metadata

Usage:
    python generate_tiles.py --country somalia
    python generate_tiles.py --country somalia --region Bakool
    python generate_tiles.py --country all
"""

import argparse
import json
import os
from pathlib import Path

import geopandas as gpd
import matplotlib.pyplot as plt
from PIL import Image
from shapely.geometry import shape

# Symbology mappings (imported from road-symbology.js logic)
ROAD_COLORS = {
    'motorway': '#e74c3c',
    'trunk': '#e67e22',
    'primary': '#f1c40f',
    'secondary': '#2ecc71',
    'tertiary': '#3498db',
    'residential': '#9b59b6',
    'unclassified': '#95a5a6',
    'track': '#7f8c8d',
    'path': '#bdc3c7'
}

def generate_tile(geojson_path, output_dir, layer_type, region, bounds):
    """Generate WebP tile + hover GeoJSON + meta.json from full GeoJSON"""

    # Load full GeoJSON
    gdf = gpd.read_file(geojson_path)

    # 1. Generate WebP image with symbology
    fig, ax = plt.subplots(figsize=(10, 10), dpi=150)
    ax.set_xlim(bounds[0][1], bounds[1][1])  # lon
    ax.set_ylim(bounds[0][0], bounds[1][0])  # lat
    ax.set_aspect('equal')
    ax.axis('off')

    # Apply symbology based on layer type
    if layer_type == 'roads':
        for highway_type, color in ROAD_COLORS.items():
            subset = gdf[gdf['highway'] == highway_type]
            if not subset.empty:
                subset.plot(ax=ax, color=color, linewidth=0.5)
    elif layer_type == 'population':
        gdf.plot(ax=ax, column='population', cmap='YlOrRd', legend=False)
    else:
        gdf.plot(ax=ax, color='#3498db', alpha=0.7)

    # Save as WebP
    webp_path = output_dir / f'{layer_type}.webp'
    plt.savefig(webp_path, format='webp', bbox_inches='tight',
                pad_inches=0, transparent=True, dpi=150)
    plt.close()

    # 2. Generate simplified hover GeoJSON (geometry + minimal properties)
    hover_gdf = gdf.copy()
    # Keep only essential columns
    essential_cols = ['geometry', 'name', 'id', 'type', 'highway', 'population']
    hover_gdf = hover_gdf[[c for c in essential_cols if c in hover_gdf.columns]]
    # Simplify geometry (reduce precision)
    hover_gdf['geometry'] = hover_gdf['geometry'].simplify(0.001)

    hover_path = output_dir / f'{layer_type}.hover.geojson'
    hover_gdf.to_file(hover_path, driver='GeoJSON')

    # 3. Generate meta.json
    meta = {
        "layer": layer_type,
        "region": region,
        "country": str(output_dir).split('/tiles/')[1].split('/')[0],
        "visualization": {
            "webp": str(webp_path.relative_to(output_dir.parent.parent.parent)),
            "bounds": bounds,
            "size_kb": round(webp_path.stat().st_size / 1024, 1)
        },
        "hover": {
            "geojson": str(hover_path.relative_to(output_dir.parent.parent.parent)),
            "size_kb": round(hover_path.stat().st_size / 1024, 1),
            "feature_count": len(hover_gdf)
        },
        "geodata": {
            "path": str(geojson_path),
            "size_mb": round(geojson_path.stat().st_size / (1024*1024), 1),
            "feature_count": len(gdf),
            "properties": list(gdf.columns)
        },
        "generated_at": datetime.now().isoformat()
    }

    meta_path = output_dir / f'{layer_type}.meta.json'
    with open(meta_path, 'w') as f:
        json.dump(meta, f, indent=2)

    print(f"Generated: {webp_path.name} ({meta['visualization']['size_kb']} KB)")
    return meta

def main():
    parser = argparse.ArgumentParser(description='R2A Tile Generator')
    parser.add_argument('--country', required=True, help='Country code or "all"')
    parser.add_argument('--region', help='Specific region (optional)')
    parser.add_argument('--layer', help='Specific layer type (optional)')
    args = parser.parse_args()

    # Load country config
    config_path = Path(f'countries/{args.country}/config.json')
    with open(config_path) as f:
        config = json.load(f)

    regions = [args.region] if args.region else config['regions']

    for region in regions:
        print(f"\nProcessing {args.country}/{region}...")
        # Generate tiles for each layer type
        # ... implementation details

    print("\nTile generation complete!")

if __name__ == '__main__':
    main()
```

---

## 7. R2A Loader Module

### 7.1 Frontend: `shared/modules/r2a-loader.js`

```javascript
/**
 * R2A Loader - Rendering-2-Analytics Layer Loader
 *
 * Loads lightweight WebP tiles for instant visualization,
 * with invisible hover layer for interaction.
 * Full analytics processed on backend only.
 */

class R2ALoader {
    constructor(map, country) {
        this.map = map;
        this.country = country;
        this.loadedLayers = new Map(); // layerId -> { image, hover, meta }
        this.basePath = `../../data_warehouse/tiles/${country}`;
    }

    /**
     * Load a layer tile (WebP + hover overlay)
     * @param {string} region - Region name (e.g., "Bakool")
     * @param {string} layerType - Layer type (e.g., "roads_osm_2024")
     * @returns {Promise<object>} Layer object with image and hover layer
     */
    async loadTile(region, layerType) {
        const tilePath = `${this.basePath}/L1/${region}`;

        // 1. Load metadata
        const metaUrl = `${tilePath}/${layerType}.meta.json`;
        const meta = await fetch(metaUrl).then(r => r.json());

        // 2. Create WebP image overlay (VISIBLE - instant load)
        const imageUrl = `${tilePath}/${layerType}.webp`;
        const imageOverlay = L.imageOverlay(imageUrl, meta.visualization.bounds, {
            opacity: 0.9,
            interactive: false, // Image doesn't need interaction
            className: 'r2a-tile'
        });

        // 3. Load hover GeoJSON (INVISIBLE - for interaction only)
        const hoverUrl = `${tilePath}/${layerType}.hover.geojson`;
        const hoverData = await fetch(hoverUrl).then(r => r.json());
        const hoverLayer = L.geoJSON(hoverData, {
            style: {
                fillOpacity: 0,
                stroke: false,
                interactive: true
            },
            onEachFeature: (feature, layer) => {
                // Add hover tooltip
                if (feature.properties.name) {
                    layer.bindTooltip(feature.properties.name);
                }
                // Add click handler
                layer.on('click', (e) => {
                    this.onFeatureClick(feature, e);
                });
            }
        });

        // 4. Add to map (image first, then hover on top)
        imageOverlay.addTo(this.map);
        hoverLayer.addTo(this.map);

        // 5. Store reference with metadata
        const layerId = `${region}_${layerType}`;
        const layerObj = {
            id: layerId,
            image: imageOverlay,
            hover: hoverLayer,
            meta: meta,
            region: region,
            type: layerType
        };
        this.loadedLayers.set(layerId, layerObj);

        console.log(`[R2A] Loaded ${layerId} (${meta.visualization.size_kb} KB)`);
        return layerObj;
    }

    /**
     * Remove a layer
     */
    removeTile(region, layerType) {
        const layerId = `${region}_${layerType}`;
        const layer = this.loadedLayers.get(layerId);

        if (layer) {
            this.map.removeLayer(layer.image);
            this.map.removeLayer(layer.hover);
            this.loadedLayers.delete(layerId);
            console.log(`[R2A] Removed ${layerId}`);
        }
    }

    /**
     * Handle feature click
     */
    onFeatureClick(feature, event) {
        console.log('[R2A] Feature clicked:', feature.properties);
        // Can trigger popup, selection, etc.
    }

    /**
     * Get all loaded layers for analytics
     */
    getLayersForAnalytics() {
        return Array.from(this.loadedLayers.values()).map(layer => ({
            geodataPath: layer.meta.geodata.path,
            type: layer.type,
            region: layer.region,
            featureCount: layer.meta.geodata.feature_count
        }));
    }

    /**
     * Upgrade to full vector (for power users who need editing)
     */
    async upgradeToVector(region, layerType) {
        const layerId = `${region}_${layerType}`;
        const layer = this.loadedLayers.get(layerId);

        if (!layer) {
            console.error(`[R2A] Layer ${layerId} not found`);
            return null;
        }

        // Show loading indicator
        showLoadingIndicator(`Loading full vector data for ${layerType}...`);

        // Fetch full GeoJSON from backend
        const fullDataUrl = `/api/geodata/${this.country}/${region}/${layerType}`;
        const fullData = await fetch(fullDataUrl).then(r => r.json());

        // Remove image and hover layers
        this.map.removeLayer(layer.image);
        this.map.removeLayer(layer.hover);

        // Create full vector layer with styling
        const vectorLayer = L.geoJSON(fullData, {
            style: getStyleForLayerType(layerType),
            onEachFeature: (feature, lyr) => {
                // Full interactivity
                lyr.bindPopup(generatePopupContent(feature));
            }
        });
        vectorLayer.addTo(this.map);

        // Update stored reference
        layer.vector = vectorLayer;
        layer.upgraded = true;

        hideLoadingIndicator();
        console.log(`[R2A] Upgraded ${layerId} to full vector`);
        return vectorLayer;
    }
}

// Export for use in other modules
window.R2ALoader = R2ALoader;
```

---

## 8. Backend Analytics API

### 8.1 Flask Endpoint: `/api/analytics/isee`

```python
# backend/api.py - Add this endpoint

from flask import Flask, request, jsonify
from concurrent.futures import ThreadPoolExecutor
import uuid
import json
from pathlib import Path

app = Flask(__name__)
executor = ThreadPoolExecutor(max_workers=4)

# Store for async job results
analytics_jobs = {}

@app.route('/api/analytics/isee', methods=['POST'])
def trigger_isee_analytics():
    """
    Trigger iSEE Analytics processing on backend.

    Request body:
    {
        "country": "somalia",
        "region": "Bakool",
        "layers": [
            {"type": "roads_osm_2024", "geodataPath": "..."},
            {"type": "population_2020", "geodataPath": "..."}
        ]
    }

    Returns:
    {
        "job_id": "abc123",
        "status": "processing"
    }
    """
    data = request.json
    job_id = str(uuid.uuid4())[:8]

    # Submit job to background worker
    future = executor.submit(
        process_isee_analytics,
        job_id,
        data['country'],
        data['region'],
        data['layers']
    )

    analytics_jobs[job_id] = {
        'status': 'processing',
        'future': future,
        'created_at': datetime.now().isoformat()
    }

    return jsonify({
        'job_id': job_id,
        'status': 'processing',
        'poll_url': f'/api/analytics/status/{job_id}'
    })

@app.route('/api/analytics/status/<job_id>')
def get_analytics_status(job_id):
    """Check status of analytics job"""
    if job_id not in analytics_jobs:
        return jsonify({'error': 'Job not found'}), 404

    job = analytics_jobs[job_id]

    if job['future'].done():
        try:
            result = job['future'].result()
            return jsonify({
                'job_id': job_id,
                'status': 'complete',
                'result': result
            })
        except Exception as e:
            return jsonify({
                'job_id': job_id,
                'status': 'error',
                'error': str(e)
            })

    return jsonify({
        'job_id': job_id,
        'status': 'processing'
    })

def process_isee_analytics(job_id, country, region, layers):
    """
    Background worker for iSEE Analytics processing.
    Loads full GeoJSON files and calculates statistics.
    """
    import geopandas as gpd

    results = {
        'country': country,
        'region': region,
        'layers': [],
        'cross_layer': {}
    }

    for layer_info in layers:
        geodata_path = Path(layer_info['geodataPath'])
        gdf = gpd.read_file(geodata_path)

        layer_stats = {
            'type': layer_info['type'],
            'feature_count': len(gdf),
            'statistics': {}
        }

        # Calculate statistics based on layer type
        if 'roads' in layer_info['type']:
            layer_stats['statistics'] = calculate_road_statistics(gdf)
        elif 'population' in layer_info['type']:
            layer_stats['statistics'] = calculate_population_statistics(gdf)
        elif 'nightlight' in layer_info['type']:
            layer_stats['statistics'] = calculate_nightlight_statistics(gdf)

        results['layers'].append(layer_stats)

    # Cross-layer analysis if multiple layers
    if len(layers) > 1:
        results['cross_layer'] = calculate_cross_layer_analysis(results['layers'])

    # Save report
    report_path = Path(f'data_warehouse/reports/{job_id}.json')
    report_path.parent.mkdir(exist_ok=True)
    with open(report_path, 'w') as f:
        json.dump(results, f, indent=2)

    return results

def calculate_road_statistics(gdf):
    """Calculate road-specific statistics"""
    return {
        'total_length_km': gdf.geometry.length.sum() / 1000,
        'by_type': gdf.groupby('highway').size().to_dict(),
        'surface_distribution': gdf.groupby('surface').size().to_dict() if 'surface' in gdf.columns else {}
    }

def calculate_population_statistics(gdf):
    """Calculate population-specific statistics"""
    return {
        'total_population': gdf['population'].sum(),
        'mean_density': gdf['population'].mean(),
        'max_density': gdf['population'].max(),
        'min_density': gdf['population'].min()
    }
```

---

## 9. Updated iSEE Analytics Frontend

```javascript
// shared/modules/isee_analytics.js - Update to use backend

class ISEEAnalytics {
    constructor(r2aLoader) {
        this.r2aLoader = r2aLoader;
        this.currentJobId = null;
    }

    /**
     * Trigger analytics (now calls backend)
     */
    async analyze() {
        const layers = this.r2aLoader.getLayersForAnalytics();

        if (layers.length === 0) {
            showNotification('No layers loaded for analysis', 'warning');
            return;
        }

        // Show loading UI
        this.showAnalyzingUI();

        // Call backend API
        const response = await fetch('/api/analytics/isee', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                country: this.r2aLoader.country,
                region: regionLockState.lockedRegion,
                layers: layers
            })
        });

        const { job_id, poll_url } = await response.json();
        this.currentJobId = job_id;

        // Poll for results
        this.pollForResults(poll_url);
    }

    /**
     * Poll backend for results
     */
    async pollForResults(pollUrl) {
        const checkStatus = async () => {
            const response = await fetch(pollUrl);
            const data = await response.json();

            if (data.status === 'complete') {
                this.displayResults(data.result);
            } else if (data.status === 'error') {
                this.showError(data.error);
            } else {
                // Still processing, check again in 1 second
                setTimeout(checkStatus, 1000);
            }
        };

        checkStatus();
    }

    /**
     * Display analytics results
     */
    displayResults(results) {
        this.hideAnalyzingUI();
        // ... existing display logic
    }
}
```

---

## 10. Adding a New Country - Simplified Checklist

With R2A architecture, adding a new country is much simpler:

### 10.1 Required Steps (3 steps only!)

```bash
# Step 1: Create config.json (copy from somalia, edit values)
cp countries/somalia/config.json countries/yemen/config.json
# Edit: country name, regions list, bounds, center coordinates

# Step 2: Download/process source data
# (boundaries, population, roads - same as before)

# Step 3: Generate tiles
python tools/generate_tiles.py --country yemen

# DONE! Dashboard automatically works via:
# countries/template/index.html?country=yemen
```

### 10.2 What You DON'T Need To Do

- ❌ Copy index.html, script.js, styles.css
- ❌ Update any JavaScript code
- ❌ Create country-specific folders for dashboard
- ❌ Modify shared modules

---

## 11. Performance Benchmarks

| Metric | Before (v4.0) | After (R2A v4.1) | Improvement |
|--------|---------------|------------------|-------------|
| Layer load time | 5-15 seconds | < 0.5 seconds | **30x faster** |
| Data transfer | 40 MB | 150 KB | **267x smaller** |
| Memory usage | High | Low | **90% reduction** |
| Right-click remove | 1-2 seconds | Instant | **Instant** |
| Add new country | 5+ files | 1 config + 1 script | **80% less work** |

---

## 12. Keywords for Future Sessions

When starting a new conversation about R2A architecture:

```
"Keyword: R2A-SPEED - Please read docs/R2A_ARCHITECTURE.md"
```

Or combined with main architecture:

```
"Keyword: GEO-INSIGHTS-ARCH R2A-SPEED - I want to optimize layer loading..."
```

---

## 13. Version History

| Version | Date | Changes |
|---------|------|---------|
| 4.1.0 | 2026-01-29 | Initial R2A architecture specification |

---

**Document End**
