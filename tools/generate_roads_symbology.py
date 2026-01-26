#!/usr/bin/env python3
"""
Auto-generate symbology for OSM roads data
Scans actual data to discover highway types and generate color scheme
"""

import json
import geopandas as gpd
from pathlib import Path
from collections import Counter

# Color scheme for OSM highway types
HIGHWAY_COLORS = {
    'motorway': '#7c2d12',       # Brown
    'trunk': '#dc2626',          # Dark red
    'primary': '#ef4444',        # Red
    'secondary': '#f97316',      # Orange
    'tertiary': '#fbbf24',       # Yellow
    'residential': '#cbd5e1',    # Light gray
    'track': '#78716c',          # Dark gray (with dashes)
    'unclassified': '#94a3b8',   # Gray
    'footway': '#a8a29e',        # Light brown
    'path': '#a8a29e',           # Light brown
    'service': '#e2e8f0',        # Very light gray
    'cycleway': '#3b82f6',       # Blue
    'living_street': '#d1d5db',  # Medium gray
    'pedestrian': '#9ca3af',     # Gray
    'bridleway': '#92400e',      # Dark brown
    'steps': '#6b7280',          # Dark gray
    'construction': '#f59e0b',   # Amber
    'proposed': '#fde047',       # Light yellow
    'default': '#94a3b8'         # Default gray
}

# Line weights
HIGHWAY_WEIGHTS = {
    'motorway': 3,
    'trunk': 3,
    'primary': 3,
    'secondary': 2,
    'tertiary': 2,
    'residential': 1,
    'track': 1,
    'unclassified': 1,
    'default': 1
}

def generate_symbology(roads_folder):
    """
    Generate symbology by scanning actual road data

    Args:
        roads_folder: Path to folder containing regional road files

    Returns:
        dict with symbology information
    """

    roads_folder = Path(roads_folder)

    if not roads_folder.exists():
        raise FileNotFoundError(f"Roads folder not found: {roads_folder}")

    print(f"Scanning roads data in: {roads_folder}")
    print()

    # Find all GeoJSON files
    geojson_files = list(roads_folder.glob('*_roads.geojson'))

    if not geojson_files:
        raise FileNotFoundError("No road GeoJSON files found")

    print(f"Found {len(geojson_files)} regional files")
    print()

    # Collect all highway types across all regions
    highway_counter = Counter()
    total_features = 0

    print("Analyzing highway types per region:")
    print("-" * 50)

    for geojson_file in geojson_files:
        region_name = geojson_file.stem.replace('_roads', '')

        # Read file
        gdf = gpd.read_file(geojson_file)
        total_features += len(gdf)

        # Count highway types
        if 'highway' in gdf.columns:
            region_highways = gdf['highway'].value_counts()
            highway_counter.update(region_highways.to_dict())

            # Show top 3 types for this region
            top3 = region_highways.head(3)
            summary = ', '.join([f"{k}: {v}" for k, v in top3.items()])
            print(f"{region_name:20} {len(gdf):5,} roads - {summary}")

    print("-" * 50)
    print(f"Total: {total_features:,} road features")
    print()

    # Generate symbology
    print("Highway type distribution (overall):")
    print("-" * 50)

    symbology_items = []

    for highway_type, count in highway_counter.most_common():
        color = HIGHWAY_COLORS.get(highway_type, HIGHWAY_COLORS['default'])
        weight = HIGHWAY_WEIGHTS.get(highway_type, HIGHWAY_WEIGHTS['default'])

        # Add dash array for tracks
        style = {
            'type': highway_type,
            'count': count,
            'color': color,
            'weight': weight,
            'opacity': 0.8
        }

        if highway_type == 'track':
            style['dashArray'] = '5, 10'

        symbology_items.append(style)

        percent = (count / total_features) * 100
        dash_indicator = " (dashed)" if highway_type == 'track' else ""
        print(f"{highway_type:20} {count:6,} ({percent:5.1f}%){dash_indicator}")

    print("-" * 50)
    print()

    # Generate version info from .version.json if exists
    version_file = roads_folder / '.version.json'
    version_data = {}

    if version_file.exists():
        with open(version_file, 'r') as f:
            version_data = json.load(f)

    # Create complete symbology object
    symbology = {
        'folder': str(roads_folder),
        'version_date': version_data.get('last_modified', 'Unknown'),
        'total_features': total_features,
        'total_regions': len(geojson_files),
        'highway_types': symbology_items,
        'color_scheme': HIGHWAY_COLORS,
        'generated_at': version_data.get('updated_at', 'Unknown')
    }

    # Save symbology file
    symbology_file = roads_folder / 'symbology.json'
    with open(symbology_file, 'w') as f:
        json.dump(symbology, f, indent=2)

    print(f"✓ Symbology saved to: {symbology_file}")
    print()

    return symbology


# ============================================================================
# MAIN
# ============================================================================

if __name__ == '__main__':
    import sys

    if len(sys.argv) > 1:
        folder = sys.argv[1]
    else:
        # Default to 2024 version
        folder = 'roads_by_region_2024_07_23'

    try:
        print("=" * 70)
        print("  OSM Roads Symbology Generator")
        print("=" * 70)
        print()

        symbology = generate_symbology(folder)

        print("=" * 70)
        print("  COMPLETE!")
        print("=" * 70)
        print(f"Generated symbology for {symbology['total_regions']} regions")
        print(f"Total highway types: {len(symbology['highway_types'])}")
        print(f"Total features: {symbology['total_features']:,}")
        print("=" * 70)

    except Exception as e:
        print(f"\nERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
