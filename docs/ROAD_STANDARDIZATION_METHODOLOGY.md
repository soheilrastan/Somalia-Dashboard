# Road Classification Standardization Methodology
## Somalia Dashboard - Geo-Insights Laboratory, ESCWA

---

### The Problem

OpenStreetMap road data for Somalia came from multiple years (2023, 2024, 2026) with **inconsistent attribute schemas**:

| Year | Attribute Name | Example Values |
|------|---------------|----------------|
| 2023 | `fclass` | trunk, primary, secondary, track_grade1 |
| 2024 | `highway` | trunk, primary, residential, service |
| 2026 | `highway` | trunk_link, secondary_link, footway |

Additionally, `_link` variants (e.g., `trunk_link`, `primary_link`) existed across years, creating visual fragmentation in the map display.

---

### The Solution: Bridging Table Architecture

We implemented a **centralized Road Symbology Module** (`road-symbology.js`) that acts as a single source of truth for all road styling.

#### 1. Standard Classes (12 Unified Categories)

| Standard Class | Color | Weight | Style | Description |
|---------------|-------|--------|-------|-------------|
| **Trunk** | #7c2d12 (Brown) | 4.5 | Solid | Major Highways |
| **Primary** | #dc2626 (Red) | 4.0 | Solid | Primary Roads |
| **Secondary** | #f97316 (Orange) | 3.0 | Solid | Secondary Roads |
| **Tertiary** | #fbbf24 (Yellow) | 2.5 | Solid | Tertiary Roads |
| **Residential** | #60a5fa (Blue) | 2.0 | Solid | Residential Roads |
| **Service** | #cbd5e1 (Lt Gray) | 1.5 | Solid | Driveways, Parking |
| **Unclassified** | #94a3b8 (Gray) | 1.5 | Solid | Minor Roads |
| **Track** | #78716c (Brown) | 1.5 | Dotted | Unpaved/Rural |
| **Path** | #a8a29e (Tan) | 1.0 | Dotted | Walking Trails |
| **Footway** | #a8a29e (Tan) | 1.0 | Dotted | Sidewalks |
| **Pedestrian** | #d4d4d8 (Lt Gray) | 1.0 | Dotted | Pedestrian Zones |
| **Unknown** | #6b7280 (Med Gray) | 1.0 | Solid | Fallback |

#### 2. Bridging Table (Attribute Mapping)

The bridging table maps all source attributes to standard classes:

```
trunk        -> Trunk
trunk_link   -> Trunk       (aggregated)
primary      -> Primary
primary_link -> Primary     (aggregated)
secondary    -> Secondary
secondary_link -> Secondary (aggregated)
tertiary     -> Tertiary
tertiary_link -> Tertiary   (aggregated)
track        -> Track
track_grade1 -> Track       (all grades unified)
track_grade2 -> Track
...
```

**Key Decision:** Link roads (`_link`) are aggregated into their parent class for visual simplicity. A `trunk_link` displays identically to `trunk`.

---

### Implementation Flow

```
Feature Properties
       |
       v
+------------------+
| getRawType()     |  Checks: fclass -> highway -> TYPE
+------------------+
       |
       v
+------------------+
| BRIDGING_TABLE   |  Maps raw value to Standard Class
+------------------+
       |
       v
+------------------+
| ROAD_CLASSES     |  Returns: color, weight, opacity, dashArray
+------------------+
       |
       v
    Leaflet Style
```

---

### Usage Pattern

All road layers now call the same module:

```javascript
style: function(feature) {
    return RoadSymbology.getStyle(feature);
}
```

This ensures:
- **Consistency**: Same class = same color across all years
- **Maintainability**: Change color once, applies everywhere
- **Extensibility**: Add new classes without touching layer code

---

### Lessons Learned

1. **Schema drift is inevitable** - OSM attribute names change between exports
2. **Aggregation simplifies UX** - Users don't need to distinguish `trunk` from `trunk_link`
3. **Centralized styling prevents bugs** - No more hardcoded colors scattered across files
4. **Dotted lines for unpaved** - Visual distinction between paved and unpaved roads aids interpretation

---

*Document Version: 1.0 | January 2026 | ESCWA Geo-Insights Lab*
