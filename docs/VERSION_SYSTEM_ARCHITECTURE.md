# Version Management System - Complete Architecture

## Overview

Universal system for managing multiple versions of ANY layer type (Roads, Population, Nightlight, MPI, etc.) with automatic dashboard integration.

---

## System Components

### 1. Backend (Python)

#### `check_osm_version.py`
**Purpose**: Multi-version detection and status checking

**Returns**:
```python
{
    'success': True,
    'versions': [
        {
            'date': '2026-01-02T03:56:55',
            'date_short': '2026-01-02',
            'readable': '2 January 2026',
            'format': 'GEOJSON',
            'download_url': 'https://...',
            'size_mb': 82.9,
            'status': 'in_dashboard' | 'available',
            'is_latest': True,
            'local_folder': 'roads_by_region_2026_01_02'
        }
    ],
    'local_versions': ['2026-01-02'],
    'has_newer': False,
    'has_older': True,
    'message': 'Up to date! 2 version(s) available on HDX.'
}
```

#### `download_roads_version.py`
**Purpose**: Download and convert ANY version (GeoJSON or Geopackage)

**Features**:
- Downloads from HDX
- Auto-converts Geopackage → JSON
- Splits by 18 regions
- Creates version metadata
- Progress tracking

#### `generate_roads_symbology.py`
**Purpose**: Auto-generate symbology from actual data

**Process**:
1. Scans all regional GeoJSON files
2. Discovers unique `highway` types
3. Counts features per type
4. Generates color scheme
5. Outputs `symbology.json`

---

### 2. Frontend (JavaScript)

#### `layer_manager.js`
**Purpose**: Universal layer management system

**Main Function**:
```javascript
addLayerToDashboard(config) → {success: bool, message: str}
```

**Handles**:
- ✅ Layers Panel (with checkboxes/drag-drop)
- ✅ Symbology Container (auto-generated HTML)
- ✅ Data Sources Container (with links)
- ✅ Layer Registry (tracks all versions)

**Sub-routines**:
- `addToLayersPanel()` - Creates layer UI
- `addToSymbologyContainer()` - Generates symbology HTML
- `addToDataSourcesContainer()` - Adds source info
- `removeLayerFromDashboard()` - Cleanup

---

## Workflow: "Check Archives and Updates"

### User Flow

```
User clicks: "Check OSM Roads Archives and Updates"
           ↓
    Modal appears showing:
    ✓ 2 January 2026 (In Dashboard) [Latest]
    ☐ 23 July 2024 (Available to download)
           ↓
    User selects version(s) to download
           ↓
    Download starts with progress:
    [1/7] Downloading... 45.2 MB / 112.8 MB (40%)
    [2/7] Extracting...
    [3/7] Converting Geopackage → JSON...
    [4/7] Splitting by 18 regions...
    [5/7] Generating symbology...
    [6/7] Writing metadata...
    [7/7] Integrating to dashboard...
           ↓
    ✓ Complete! Layer added to dashboard
    - Layers panel updated
    - Symbology added
    - Data source added
```

### Technical Flow

```
[Frontend] Check button clicked
     ↓
[Backend] check_osm_version.py
     ↓ Returns all versions with status
[Frontend] Show modal with checkboxes
     ↓ User selects versions
[Backend] download_roads_version.py (for each selected)
     ↓ Download + Convert + Split
[Backend] generate_roads_symbology.py
     ↓ Auto-generate symbology
[Frontend] addLayerToDashboard(config)
     ↓ Adds to Layers + Symbology + Data Sources
[LayerRegistry] Tracks new version
     ↓
✓ Done - User can now use the layer
```

---

## Modal Design

### Title
**"🔄 OSM Roads: Archives and Updates"**

### Content

```
Current Status:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ 2 January 2026        [In Dashboard] [Latest]
  Size: 82.9 MB | Format: GeoJSON


Available Versions:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
☐ 23 July 2024          [Available to Download]
  Size: 112.8 MB | Format: Geopackage → JSON
  Note: Older version for historical comparison


[Download Selected (1)]  [Cancel]

ℹ️ Downloaded versions will be:
  • Added to Layers panel with version date
  • Symbology auto-generated and displayed
  • Data source information added
  • Preserved for historical analysis
```

---

## Data Structure

### Version Folder Structure

```
roads_by_region_2026_01_02/
├── .version.json
├── Awdal_roads.geojson
├── Awdal_roads.js
├── Bakool_roads.geojson
├── Bakool_roads.js
├── ... (18 regions × 2 files)
└── symbology.json

roads_by_region_2024_07_23/
├── .version.json
├── Awdal_roads.geojson
├── ... (same structure)
```

### `.version.json` Format

```json
{
    "last_modified": "2024-07-23T14:07:41",
    "updated_at": "2026-01-21 15:30:45",
    "format": "Geopackage",
    "source": "HDX - Humanitarian OpenStreetMap Team",
    "url": "https://export.hotosm.org/downloads/...",
    "total_features": 234567,
    "regions": 18
}
```

### `symbology.json` Format

```json
{
    "version_date": "2024-07-23",
    "total_features": 234567,
    "total_regions": 18,
    "highway_types": [
        {
            "type": "motorway",
            "count": 145,
            "color": "#7c2d12",
            "weight": 3,
            "opacity": 0.8
        },
        {
            "type": "track",
            "count": 8923,
            "color": "#78716c",
            "weight": 1,
            "opacity": 0.8,
            "dashArray": "5, 10"
        }
    ],
    "generated_at": "2026-01-21 15:31:12"
}
```

---

## Layer Configuration Example

### Roads OSM 2024

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
            { label: 'Motorway', color: '#7c2d12', weight: 1.2, count: 145 },
            { label: 'Primary', color: '#ef4444', weight: 1.1, count: 2341 },
            { label: 'Track', color: '#78716c', weight: 1, count: 8923, dashArray: '5, 10' }
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
        onToggle: (checked) => { /* handle */ },
        onDragStart: (e, config) => { /* handle */ }
    }
});
```

---

## API Endpoints

### Check Version
```
GET /api/check-version
Response: {versions: [...], local_versions: [...], has_newer: bool, has_older: bool}
```

### Download Version
```
POST /api/download-version
Body: {version_date: '2024-07-23', format: 'Geopackage'}
Response: {success: bool, folder: str, message: str}
```

### List Local Versions
```
GET /api/list-versions
Response: {versions: [{date: str, folder: str, format: str}]}
```

### Generate Symbology
```
POST /api/generate-symbology
Body: {folder: 'roads_by_region_2024_07_23'}
Response: {success: bool, symbology: {...}}
```

---

## Benefits

### For Users
- ✅ **Easy**: One-click download and integration
- ✅ **Visual**: Automatic symbology generation
- ✅ **Documented**: Data sources auto-added
- ✅ **Historical**: Keep multiple versions
- ✅ **Flexible**: Choose what to download

### For Developers
- ✅ **Reusable**: Works for ANY layer type
- ✅ **Modular**: Independent sub-routines
- ✅ **Scalable**: Easy to add new layer types
- ✅ **Standard**: JSON format enforced
- ✅ **Maintainable**: Clear architecture

---

## Future Extensions

### Planned Features
1. **Auto-update notifications**: Alert when new versions available
2. **Comparison mode**: Compare two versions side-by-side
3. **Export capability**: Export specific version to Shapefile/GeoJSON
4. **Bulk operations**: Download multiple versions at once
5. **Version diff**: Show what changed between versions

### Other Layer Types

**Same system works for**:
- Population (WorldPop, LandScan)
- Nightlight (VIIRS, DMSP)
- Land Cover (ESA, MODIS)
- Climate Data (ERA5, CHIRPS)
- Any geospatial dataset with versions!

---

## Status

✅ **Backend**: `check_osm_version.py` updated (multi-version support with priority selection)
✅ **Backend**: `download_roads_version.py` ready (Geopackage → GeoJSON conversion)
✅ **Backend**: `generate_roads_symbology.py` ready (auto-symbology)
✅ **Frontend**: `layer_manager.js` complete (universal system)
✅ **Frontend**: Version selection modal complete (with conversion indicators)
✅ **Integration**: All components connected via update_server.py API
✅ **API**: `/api/check-version` and `/api/download-version` endpoints working

---

## How to Use This Pattern for Other Layers

### Step 1: Copy and Configure `check_osm_version.py`

```python
# Change these for your layer type:
HDX_DATASET_ID = 'your_hdx_dataset_id'
LOCAL_FOLDER_PREFIX = 'your_layer_prefix_'
RESOURCE_NAME_FILTERS = ['your', 'filter', 'keywords']
ACCEPTED_FORMATS = ['GEOJSON', 'GEOPACKAGE', 'GPKG']
```

### Step 2: Copy and Configure `download_roads_version.py`

Modify the processing logic for your layer's data structure.

### Step 3: Add API Endpoint in `update_server.py`

```python
@app.route('/api/check-your-layer-version', methods=['GET'])
def check_your_layer_version():
    from check_your_layer_version import check_your_layer_version
    return jsonify(check_your_layer_version())
```

### Step 4: Add Frontend Modal Button

Add a "Check Archives & Updates" button for your layer in the dashboard.

---

**Integrated into v3.0 dashboard - Ready for production!**
