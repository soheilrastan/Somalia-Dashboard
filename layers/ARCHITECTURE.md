# Modular Layer Architecture

## CRITICAL PRINCIPLE
**Each layer POINTS to shared containers - NO code duplication per layer.**

The system optimizes by pointing to thematics that hold the codes. When adding new layers:
- DO NOT add codes to each layer
- DO point to shared Symbology, Sources, Methodology, and Concept containers

## Folder Structure

```
layers/
├── ARCHITECTURE.md          # This file - READ FIRST
├── boundaries/
│   ├── adm0/               # Level 0 (Country)
│   ├── adm1/               # Level 1 (Regions)
│   └── adm2/               # Level 2 (Districts)
├── roads/
│   └── config.json         # POINTS to shared containers
├── nightlight/
│   └── config.json         # POINTS to shared containers
├── population/
│   └── config.json         # POINTS to shared containers
└── shared/
    ├── symbology/          # Rendering styles (colors, weights, etc.)
    │   └── roads.json
    ├── sources/            # Data source documentation
    │   └── osm_hdx.json
    ├── methodology/        # Processing methodology
    │   └── osm_extraction.json
    └── concepts/           # Thematic context
        └── infrastructure.json
```

## Layer Config Template

Each layer has ONE `config.json` that links to shared resources:

```json
{
  "layer": {
    "id": "layer_id",
    "name": "Layer Display Name",
    "thematic": "Infrastructure|Population|Environment|etc",
    "level": "L0|L1|L2"
  },

  "links": {
    "symbology": "../shared/symbology/filename.json",
    "sources": "../shared/sources/filename.json",
    "methodology": "../shared/methodology/filename.json",
    "concept": "../shared/concepts/filename.json"
  }
}
```

## Adding a New Layer

1. Create folder: `layers/{layer_name}/`
2. Create `config.json` that POINTS to shared containers
3. If new symbology needed: add to `shared/symbology/`
4. If new data source: add to `shared/sources/`
5. If new methodology: add to `shared/methodology/`
6. If new thematic concept: add to `shared/concepts/`

## Why This Architecture?

- **Optimization**: Code reuse across many layers
- **Consistency**: Shared symbology ensures visual coherence
- **Maintainability**: Update one file, affect all related layers
- **Scalability**: Adding new layers is configuration, not coding
- **Documentation**: Sources and methodology are centralized

## Shared Container Types

| Container | Purpose | Example |
|-----------|---------|---------|
| Symbology | Colors, weights, styles | `roads.json` defines all road type colors |
| Sources | Data provider, license, attribution | `osm_hdx.json` for all OSM layers |
| Methodology | Processing steps, tools used | `osm_extraction.json` for OSM workflow |
| Concepts | Thematic context, SDG alignment | `infrastructure.json` for transport layers |

---
**REMEMBER**: We do not add codes to each layer - we optimize by pointing to thematics.
