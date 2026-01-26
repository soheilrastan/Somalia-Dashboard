# Somalia Dashboard - Project Architecture Schema
## Geo-Insights Laboratory, ESCWA, United Nations
### Version 3.0 | January 2026

---

## Visual Architecture Diagram

```
+==============================================================================+
|                         SOMALIA DASHBOARD v3.0                               |
|                    Geo-Insights Laboratory - ESCWA                           |
+==============================================================================+

+----------------------------------+  +----------------------------------+
|           FRONTEND               |  |            BACKEND               |
|        (Browser-Based)           |  |         (Python Servers)         |
+----------------------------------+  +----------------------------------+
|                                  |  |                                  |
|  +----------------------------+  |  |  +----------------------------+  |
|  |     PRESENTATION LAYER    |  |  |  |      API SERVER            |  |
|  |----------------------------|  |  |  |      (Flask :5000)         |  |
|  | index_v3.0.html           |  |  |  |----------------------------|  |
|  | styles_v3.0.css           |  |  |  | update_server.py           |  |
|  | Leaflet.js (Maps)         |  |  |  |  - /api/search-hdx         |  |
|  +----------------------------+  |  |  |  - /api/download-version   |  |
|               |                  |  |  |  - /uninstall-roads        |  |
|               v                  |  |  |  - /api/osm-version        |  |
|  +----------------------------+  |  |  +----------------------------+  |
|  |   APPLICATION LAYER       |  |  |               |                  |
|  |   (script_v3.0.js)        |  |  |               v                  |
|  |----------------------------|  |  |  +----------------------------+  |
|  | - Map initialization      |  |  |  |    STATIC FILE SERVER     |  |
|  | - Layer toggling          |  |  |  |    (http.server :8000)     |  |
|  | - Drag-and-drop UX        |  |  |  |----------------------------|  |
|  | - Event handlers          |  |  |  | Serves: HTML, JS, CSS,    |  |
|  | - Region detection        |  |  |  | GeoJSON, Data files       |  |
|  +----------------------------+  |  |  +----------------------------+  |
|               |                  |  |                                  |
|               v                  |  +----------------------------------+
|  +----------------------------+  |
|  |    MODULAR SUBROUTINES    |  |  +----------------------------------+
|  |      (IIFE Modules)       |  |  |          DATA WAREHOUSE         |
|  |----------------------------|  |  |        (File-Based Storage)     |
|  | ddr.js                    |  |  +----------------------------------+
|  | road-symbology.js         |  |  |                                  |
|  | layer-registry.js         |  |  |  +----------------------------+  |
|  | geo-api.js                |  |  |  |   ADMINISTRATIVE DATA      |  |
|  | isee_analytics.js         |  |  |  |----------------------------|  |
|  +----------------------------+  |  |  | data.js                    |  |
|                                  |  |  |  - adm1Boundaries          |  |
+----------------------------------+  |  |  - populationData          |  |
                                      |  |  - nightlightData          |  |
                                      |  +----------------------------+  |
                                      |               |                  |
                                      |               v                  |
                                      |  +----------------------------+  |
                                      |  |     ROADS DATA             |  |
                                      |  |----------------------------|  |
                                      |  | roads_by_region/           |  |
                                      |  |  - {Region}_roads.js (x18) |  |
                                      |  |  - {Region}_roads.geojson  |  |
                                      |  | roads_by_region_latest/    |  |
                                      |  | roads_by_region_2024_07_23/|  |
                                      |  +----------------------------+  |
                                      |               |                  |
                                      |               v                  |
                                      |  +----------------------------+  |
                                      |  |   NIGHTLIGHT DATA          |  |
                                      |  |----------------------------|  |
                                      |  | bakool_nightlight_2022.js  |  |
                                      |  | bakool_nightlight_2023.js  |  |
                                      |  | bakool_viirs_*.geojson     |  |
                                      |  +----------------------------+  |
                                      |                                  |
                                      +----------------------------------+

+==============================================================================+
|                           LAUNCHER SYSTEM                                    |
+==============================================================================+
|                                                                              |
|  +------------------------+     +------------------------+                   |
|  |  HTML Launcher         |---->|  Batch Scripts         |                   |
|  |  (One-Click Start)     |     |  (start_dashboard.bat) |                   |
|  +------------------------+     +------------------------+                   |
|            |                              |                                  |
|            v                              v                                  |
|  +------------------------+     +------------------------+                   |
|  |  URL Protocol Handler  |     |  VBScript Silent       |                   |
|  |  (Windows Registry)    |     |  (launch_silent.vbs)   |                   |
|  +------------------------+     +------------------------+                   |
|                                                                              |
+==============================================================================+
```

---

## Folder Structure

```
Somalia Dashboard/
│
├── 📁 FRONTEND (Presentation + Application)
│   ├── index_v3.0.html              # Main dashboard HTML
│   ├── styles_v3.0.css              # Stylesheet
│   ├── script_v3.0.js               # Main application logic
│   └── 🚀_Geo_Insights_Dashboard_Launch.html  # One-click launcher
│
├── 📁 MODULAR SUBROUTINES (JavaScript IIFE Modules)
│   ├── ddr.js                       # Data-Driven Rendering Module
│   ├── road-symbology.js            # Road Styling & Bridging Table
│   ├── layer-registry.js            # Layer State Management
│   ├── geo-api.js                   # GeoAPI Install/Uninstall Module
│   └── isee_analytics.js            # iSEE Statistical Analysis Engine
│
├── 📁 BACKEND (Python Servers)
│   ├── update_server.py             # Flask API Server (port 5000)
│   └── [Python http.server]         # Static file server (port 8000)
│
├── 📁 DATA WAREHOUSE
│   │
│   ├── 📁 Core Data
│   │   └── data.js                  # ADM1 boundaries, population, nightlights
│   │
│   ├── 📁 Roads Data
│   │   ├── roads_by_region/         # OSM 2023 (18 regions)
│   │   │   ├── Awdal_roads.js
│   │   │   ├── Bakool_roads.js
│   │   │   └── ... (18 regions)
│   │   ├── roads_by_region_latest/  # Latest OSM download
│   │   └── roads_by_region_2024_07_23/  # Archived 2024 version
│   │
│   └── 📁 Nightlight Data
│       ├── bakool_nightlight_2022.js
│       ├── bakool_nightlight_2023.js
│       ├── bakool_nightlight_polygons_2022.js
│       └── bakool_nightlight_polygons_2023.js
│
├── 📁 LAUNCHER SYSTEM
│   ├── start_dashboard.bat          # 6-phase server launcher
│   ├── setup_one_click.bat          # URL protocol installer
│   └── launch_silent.vbs            # Silent process launcher
│
├── 📁 DATA PROCESSING TOOLS (Python)
│   ├── extract_viirs_bakool.py      # VIIRS nightlight extraction
│   ├── process_roads_by_region.py   # Road data processing
│   ├── clean_road_attributes.py     # Attribute cleaning
│   ├── check_osm_version.py         # OSM version checker
│   └── download_roads_version.py    # HDX downloader
│
└── 📁 LEGACY/BACKUP
    └── v2.8_backup/                 # Previous version backup
```

---

## Modular Subroutines - Detailed Schema

### 1. DDR Module (Data-Driven Rendering)
**File:** `ddr.js`

```
+------------------------------------------+
|              DDR MODULE                  |
|        Data-Driven Rendering             |
+------------------------------------------+
|                                          |
|  EXPORTS:                                |
|  ├── DDR.init(map, adm1Layer)           |
|  ├── DDR.render(layerId, data, options) |
|  ├── DDR.clear(layerId)                 |
|  └── DDR.getActiveRegion()              |
|                                          |
|  RESPONSIBILITIES:                       |
|  ├── Dynamic layer rendering            |
|  ├── Region-based data clipping         |
|  ├── Performance optimization           |
|  └── Memory management                  |
|                                          |
+------------------------------------------+
```

### 2. Road Symbology Module
**File:** `road-symbology.js`

```
+------------------------------------------+
|        ROAD SYMBOLOGY MODULE             |
|       Unified Road Styling               |
+------------------------------------------+
|                                          |
|  EXPORTS:                                |
|  ├── RoadSymbology.getStyle(feature)    |
|  ├── RoadSymbology.getClass(feature)    |
|  ├── RoadSymbology.getColor(feature)    |
|  ├── RoadSymbology.getPopupContent()    |
|  └── RoadSymbology.getLegendHTML()      |
|                                          |
|  BRIDGING TABLE:                         |
|  ├── trunk, trunk_link     → Trunk      |
|  ├── primary, primary_link → Primary    |
|  ├── secondary             → Secondary  |
|  ├── tertiary              → Tertiary   |
|  ├── residential           → Residential|
|  ├── track, track_grade*   → Track      |
|  └── ... (12 standard classes)          |
|                                          |
|  ROAD CLASSES (12):                      |
|  ├── Trunk     (#7c2d12, 4.5px, solid)  |
|  ├── Primary   (#dc2626, 4.0px, solid)  |
|  ├── Secondary (#f97316, 3.0px, solid)  |
|  ├── Tertiary  (#fbbf24, 2.5px, solid)  |
|  ├── Residential (#60a5fa, 2.0px)       |
|  ├── Track     (#78716c, 1.5px, dotted) |
|  └── ... (6 more classes)               |
|                                          |
+------------------------------------------+
```

### 3. Layer Registry Module
**File:** `layer-registry.js`

```
+------------------------------------------+
|        LAYER REGISTRY MODULE             |
|        Layer State Management            |
+------------------------------------------+
|                                          |
|  EXPORTS:                                |
|  ├── LayerRegistry.init()               |
|  ├── LayerRegistry.register(id, layer)  |
|  ├── LayerRegistry.unregister(id)       |
|  ├── LayerRegistry.get(id)              |
|  ├── LayerRegistry.isActive(id)         |
|  ├── LayerRegistry.setActive(id, bool)  |
|  └── LayerRegistry.getAll()             |
|                                          |
|  TRACKS:                                 |
|  ├── Layer instances                    |
|  ├── Active/inactive state              |
|  ├── Layer metadata                     |
|  └── Layer dependencies                 |
|                                          |
+------------------------------------------+
```

### 4. GeoAPI Module
**File:** `geo-api.js`

```
+------------------------------------------+
|           GEOAPI MODULE                  |
|      Road Data Install/Uninstall         |
+------------------------------------------+
|                                          |
|  EXPORTS:                                |
|  ├── GeoAPI.init()                      |
|  ├── GeoAPI.install(version, region)    |
|  ├── GeoAPI.uninstall(version)          |
|  ├── GeoAPI.search(query)               |
|  ├── GeoAPI.getInstalledVersions()      |
|  └── GeoAPI.checkForUpdates()           |
|                                          |
|  VERSION CONFIG:                         |
|  ├── '2023' → roads_by_region/          |
|  ├── '2024' → roads_by_region_2024.../  |
|  └── 'latest' → roads_by_region_latest/ |
|                                          |
|  BACKEND ENDPOINTS:                      |
|  ├── POST /api/download-version         |
|  ├── DELETE /uninstall-roads            |
|  └── GET /api/search-hdx                |
|                                          |
+------------------------------------------+
```

### 5. iSEE Analytics Module
**File:** `isee_analytics.js`

```
+------------------------------------------+
|        iSEE ANALYTICS MODULE             |
|   Integrated Socioeconomic & Environ.    |
+------------------------------------------+
|                                          |
|  EXPORTS:                                |
|  └── runISEEAnalytics(layers, map,      |
|                       refs, region)      |
|                                          |
|  ANALYSIS PIPELINE:                      |
|  ├── Step 1: scanActiveLayers()         |
|  ├── Step 2: configureDatasets()        |
|  ├── Step 3: performStatisticalAnalysis |
|  └── Step 4: displayInsightsWindow()    |
|                                          |
|  SUPPORTED LAYER TYPES:                  |
|  ├── nightlight (VIIRS DNB)             |
|  ├── population (Meta/CIESIN)           |
|  ├── socioeconomic (MPI/UNDP)           |
|  └── infrastructure (OSM Roads)         |
|                                          |
|  STATISTICS:                             |
|  ├── Mean, Median, StdDev, Min, Max     |
|  ├── Road length by class               |
|  ├── Temporal change analysis           |
|  └── Cross-layer correlations           |
|                                          |
+------------------------------------------+
```

---

## Backend API Schema

### Flask API Server (Port 5000)

```
+------------------------------------------+
|         UPDATE_SERVER.PY                 |
|           Flask API Server               |
+------------------------------------------+
|                                          |
|  ENDPOINTS:                              |
|                                          |
|  GET /api/osm-version                    |
|  └── Returns current OSM data version   |
|                                          |
|  GET /api/search-hdx?q={query}           |
|  └── Searches HDX for Somalia datasets  |
|                                          |
|  POST /api/download-version              |
|  ├── Body: { version, regions[] }       |
|  └── Downloads & processes road data    |
|                                          |
|  DELETE /uninstall-roads                 |
|  ├── Body: { version }                  |
|  └── Removes road data files            |
|                                          |
|  GET /health                             |
|  └── Server health check                |
|                                          |
+------------------------------------------+
```

---

## Data Flow Diagram

```
+----------------+     +-----------------+     +------------------+
|   USER ACTION  |---->|   FRONTEND JS   |---->|   LEAFLET MAP    |
| (Toggle Layer) |     | (script_v3.0)   |     | (Visualization)  |
+----------------+     +-----------------+     +------------------+
                              |
                              v
                       +-------------+
                       |   MODULES   |
                       +-------------+
                       | DDR         |---> Renders data to region
                       | Symbology   |---> Applies road styling
                       | Registry    |---> Tracks layer state
                       | GeoAPI      |---> Manages installations
                       | iSEE        |---> Statistical analysis
                       +-------------+
                              |
                              v
                       +-------------+
                       | DATA LAYER  |
                       +-------------+
                       | data.js     |
                       | roads/*.js  |
                       | nightlight/ |
                       +-------------+
                              |
           +------------------+------------------+
           |                                     |
           v                                     v
    +--------------+                    +----------------+
    | LOCAL FILES  |                    | BACKEND API    |
    | (GeoJSON/JS) |                    | (Flask :5000)  |
    +--------------+                    +----------------+
                                               |
                                               v
                                        +-------------+
                                        | EXTERNAL    |
                                        | DATA SOURCE |
                                        +-------------+
                                        | HDX CKAN    |
                                        | OpenStreetMap|
                                        +-------------+
```

---

## Module Dependencies

```
script_v3.0.js (Main Application)
    │
    ├── ddr.js (DDR Module)
    │   └── Depends on: Leaflet, adm1Layer
    │
    ├── road-symbology.js (Symbology Module)
    │   └── No dependencies (standalone)
    │
    ├── layer-registry.js (Registry Module)
    │   └── No dependencies (standalone)
    │
    ├── geo-api.js (GeoAPI Module)
    │   └── Depends on: Backend API (Flask)
    │
    └── isee_analytics.js (Analytics Module)
        └── Depends on: All layer data, Leaflet
```

---

## Technology Stack Summary

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Presentation** | HTML5, CSS3 | Structure, Styling |
| **Mapping** | Leaflet.js | Interactive maps |
| **Application** | Vanilla JS (IIFE) | Logic, Modules |
| **API Server** | Flask (Python) | REST endpoints |
| **File Server** | http.server | Static files |
| **Data Format** | GeoJSON, JS | Spatial data |
| **Launcher** | Batch, VBScript | Windows automation |

---

## Design Patterns Used

1. **IIFE (Immediately Invoked Function Expression)** - All modules use this pattern for encapsulation
2. **Module Pattern** - Each module exposes a public API via return object
3. **Bridging Table** - Road symbology uses a lookup table for attribute standardization
4. **Observer Pattern** - Layer registry notifies subscribers of state changes
5. **Factory Pattern** - Layer creation functions produce configured Leaflet layers

---

*Document Version: 1.0 | January 2026 | ESCWA Geo-Insights Lab*
