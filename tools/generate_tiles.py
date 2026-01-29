#!/usr/bin/env python3
"""
R2A Tile Generator - Version 4.1
================================
Converts GeoJSON data to lightweight WebP tiles for instant visualization.

Generates three files per layer:
1. {layer}.webp         - Pre-rendered image with symbology (for display)
2. {layer}.hover.geojson - Simplified GeoJSON (for interaction)
3. {layer}.meta.json    - Metadata linking to full geodata

Usage:
    python generate_tiles.py --country somalia
    python generate_tiles.py --country somalia --region Bakool
    python generate_tiles.py --country somalia --region Bakool --layer roads
    python generate_tiles.py --country all

Requirements:
    pip install geopandas matplotlib pillow shapely

Author: Geo-Insights Lab, ESCWA
Date: 2026-01-29
Keyword: R2A-SPEED, GEO-INSIGHTS-ARCH
"""

import argparse
import json
import os
import sys
from datetime import datetime
from pathlib import Path

try:
    import geopandas as gpd
    import matplotlib.pyplot as plt
    from matplotlib.colors import LinearSegmentedColormap
    from PIL import Image
    from shapely.geometry import box
except ImportError as e:
    print(f"Missing required package: {e}")
    print("Install with: pip install geopandas matplotlib pillow shapely")
    sys.exit(1)


# ============================================
# SYMBOLOGY CONFIGURATION
# ============================================
# Matches road-symbology.js for consistency

ROAD_COLORS = {
    'motorway': '#e74c3c',
    'motorway_link': '#e74c3c',
    'trunk': '#e67e22',
    'trunk_link': '#e67e22',
    'primary': '#f1c40f',
    'primary_link': '#f1c40f',
    'secondary': '#2ecc71',
    'secondary_link': '#2ecc71',
    'tertiary': '#3498db',
    'tertiary_link': '#3498db',
    'residential': '#9b59b6',
    'living_street': '#9b59b6',
    'unclassified': '#95a5a6',
    'service': '#7f8c8d',
    'track': '#a0522d',
    'path': '#bdc3c7',
    'footway': '#bdc3c7',
    'cycleway': '#1abc9c',
    'default': '#666666'
}

ROAD_WIDTHS = {
    'motorway': 2.0,
    'trunk': 1.8,
    'primary': 1.5,
    'secondary': 1.2,
    'tertiary': 1.0,
    'residential': 0.8,
    'unclassified': 0.6,
    'track': 0.5,
    'path': 0.3,
    'default': 0.5
}

# Population color ramp (yellow to red)
POPULATION_CMAP = LinearSegmentedColormap.from_list(
    'population', ['#ffffcc', '#ffeda0', '#fed976', '#feb24c', '#fd8d3c', '#fc4e2a', '#e31a1c', '#b10026']
)

# Nightlight color ramp (dark blue to yellow)
NIGHTLIGHT_CMAP = LinearSegmentedColormap.from_list(
    'nightlight', ['#0c0c3a', '#1a1a5e', '#2d2d82', '#4040a6', '#6666cc', '#9999e6', '#ccccff', '#ffff99']
)


class TileGenerator:
    """Generates R2A tiles from GeoJSON data"""

    def __init__(self, base_path: Path):
        self.base_path = base_path
        self.tiles_path = base_path / 'data_warehouse' / 'tiles'
        self.geodata_path = base_path / 'data_warehouse' / 'geodata'
        self.countries_path = base_path / 'countries'

    def load_config(self, country: str) -> dict:
        """Load country configuration"""
        config_path = self.countries_path / country / 'config.json'
        if not config_path.exists():
            raise FileNotFoundError(f"Config not found: {config_path}")

        with open(config_path, 'r', encoding='utf-8') as f:
            return json.load(f)

    def get_region_bounds(self, gdf: gpd.GeoDataFrame) -> list:
        """Get bounding box from GeoDataFrame as [[minY, minX], [maxY, maxX]]"""
        bounds = gdf.total_bounds  # [minx, miny, maxx, maxy]
        return [[bounds[1], bounds[0]], [bounds[3], bounds[2]]]

    def generate_road_tile(self, gdf: gpd.GeoDataFrame, output_path: Path, bounds: list, dpi: int = 150):
        """Generate WebP tile for road layer with symbology"""
        fig, ax = plt.subplots(figsize=(12, 12), dpi=dpi)

        # Set map bounds
        ax.set_xlim(bounds[0][1], bounds[1][1])  # lon (X)
        ax.set_ylim(bounds[0][0], bounds[1][0])  # lat (Y)
        ax.set_aspect('equal')
        ax.axis('off')
        fig.patch.set_alpha(0)
        ax.patch.set_alpha(0)

        # Plot roads by type (order matters for layering)
        road_order = ['track', 'path', 'footway', 'service', 'unclassified',
                      'residential', 'tertiary', 'secondary', 'primary', 'trunk', 'motorway']

        highway_col = 'highway' if 'highway' in gdf.columns else 'fclass' if 'fclass' in gdf.columns else None

        if highway_col:
            for road_type in road_order:
                subset = gdf[gdf[highway_col] == road_type]
                if not subset.empty:
                    color = ROAD_COLORS.get(road_type, ROAD_COLORS['default'])
                    width = ROAD_WIDTHS.get(road_type, ROAD_WIDTHS['default'])
                    subset.plot(ax=ax, color=color, linewidth=width, alpha=0.9)

            # Plot any remaining road types not in our list
            other_types = gdf[~gdf[highway_col].isin(road_order)]
            if not other_types.empty:
                other_types.plot(ax=ax, color=ROAD_COLORS['default'],
                                linewidth=ROAD_WIDTHS['default'], alpha=0.7)
        else:
            # No highway column, plot all roads with default style
            gdf.plot(ax=ax, color=ROAD_COLORS['default'], linewidth=0.5, alpha=0.8)

        # Save as WebP with transparency
        plt.savefig(output_path, format='webp', bbox_inches='tight',
                    pad_inches=0, transparent=True, dpi=dpi)
        plt.close()

        return output_path.stat().st_size

    def generate_population_tile(self, gdf: gpd.GeoDataFrame, output_path: Path, bounds: list, dpi: int = 150):
        """Generate WebP tile for population layer"""
        fig, ax = plt.subplots(figsize=(12, 12), dpi=dpi)

        ax.set_xlim(bounds[0][1], bounds[1][1])
        ax.set_ylim(bounds[0][0], bounds[1][0])
        ax.set_aspect('equal')
        ax.axis('off')
        fig.patch.set_alpha(0)
        ax.patch.set_alpha(0)

        # Find population column
        pop_col = None
        for col in ['population', 'pop', 'pop_count', 'value', 'dn']:
            if col in gdf.columns:
                pop_col = col
                break

        if pop_col and gdf[pop_col].notna().any():
            gdf.plot(ax=ax, column=pop_col, cmap=POPULATION_CMAP, alpha=0.8, legend=False)
        else:
            gdf.plot(ax=ax, color='#feb24c', alpha=0.6)

        plt.savefig(output_path, format='webp', bbox_inches='tight',
                    pad_inches=0, transparent=True, dpi=dpi)
        plt.close()

        return output_path.stat().st_size

    def generate_nightlight_tile(self, gdf: gpd.GeoDataFrame, output_path: Path, bounds: list, dpi: int = 150):
        """Generate WebP tile for nightlight layer"""
        fig, ax = plt.subplots(figsize=(12, 12), dpi=dpi)

        ax.set_xlim(bounds[0][1], bounds[1][1])
        ax.set_ylim(bounds[0][0], bounds[1][0])
        ax.set_aspect('equal')
        ax.axis('off')
        fig.patch.set_facecolor('#0c0c3a')
        ax.patch.set_facecolor('#0c0c3a')

        # Find radiance column
        rad_col = None
        for col in ['radiance', 'avg_rad', 'value', 'dn']:
            if col in gdf.columns:
                rad_col = col
                break

        if rad_col and gdf[rad_col].notna().any():
            gdf.plot(ax=ax, column=rad_col, cmap=NIGHTLIGHT_CMAP, alpha=0.9, legend=False)
        else:
            gdf.plot(ax=ax, color='#ffff99', alpha=0.5)

        plt.savefig(output_path, format='webp', bbox_inches='tight',
                    pad_inches=0, transparent=True, dpi=dpi)
        plt.close()

        return output_path.stat().st_size

    def generate_generic_tile(self, gdf: gpd.GeoDataFrame, output_path: Path, bounds: list,
                              color: str = '#3498db', dpi: int = 150):
        """Generate WebP tile for generic layer"""
        fig, ax = plt.subplots(figsize=(12, 12), dpi=dpi)

        ax.set_xlim(bounds[0][1], bounds[1][1])
        ax.set_ylim(bounds[0][0], bounds[1][0])
        ax.set_aspect('equal')
        ax.axis('off')
        fig.patch.set_alpha(0)
        ax.patch.set_alpha(0)

        # Determine geometry type for styling
        geom_type = gdf.geometry.iloc[0].geom_type if not gdf.empty else 'Polygon'

        if 'Point' in geom_type:
            gdf.plot(ax=ax, color=color, markersize=5, alpha=0.8)
        elif 'Line' in geom_type:
            gdf.plot(ax=ax, color=color, linewidth=0.8, alpha=0.8)
        else:
            gdf.plot(ax=ax, color=color, edgecolor='#2c3e50', linewidth=0.3, alpha=0.7)

        plt.savefig(output_path, format='webp', bbox_inches='tight',
                    pad_inches=0, transparent=True, dpi=dpi)
        plt.close()

        return output_path.stat().st_size

    def generate_hover_geojson(self, gdf: gpd.GeoDataFrame, output_path: Path,
                               simplify_tolerance: float = 0.001) -> tuple:
        """Generate simplified GeoJSON for hover interaction"""
        hover_gdf = gdf.copy()

        # Keep only essential columns for interaction
        essential_cols = ['geometry']
        optional_cols = ['name', 'id', 'highway', 'fclass', 'type', 'admin1Name', 'admin2Name',
                         'population', 'pop', 'radiance', 'surface', 'lanes']

        for col in optional_cols:
            if col in hover_gdf.columns:
                essential_cols.append(col)

        hover_gdf = hover_gdf[[c for c in essential_cols if c in hover_gdf.columns]]

        # Simplify geometry to reduce file size
        if simplify_tolerance > 0:
            hover_gdf['geometry'] = hover_gdf['geometry'].simplify(simplify_tolerance, preserve_topology=True)

        # Save as GeoJSON
        hover_gdf.to_file(output_path, driver='GeoJSON')

        return output_path.stat().st_size, len(hover_gdf)

    def generate_meta_json(self, output_path: Path, layer_name: str, region: str, country: str,
                           webp_path: Path, hover_path: Path, full_geojson_path: Path,
                           bounds: list, feature_count: int, gdf_columns: list) -> None:
        """Generate metadata JSON linking all files"""
        meta = {
            "version": "4.1",
            "layer": layer_name,
            "region": region,
            "country": country,
            "generated_at": datetime.now().isoformat(),

            "visualization": {
                "webp": str(webp_path.relative_to(self.base_path)),
                "bounds": bounds,
                "size_kb": round(webp_path.stat().st_size / 1024, 1)
            },

            "hover": {
                "geojson": str(hover_path.relative_to(self.base_path)),
                "size_kb": round(hover_path.stat().st_size / 1024, 1),
                "feature_count": feature_count
            },

            "geodata": {
                "path": str(full_geojson_path.relative_to(self.base_path)) if full_geojson_path.exists() else str(full_geojson_path),
                "size_mb": round(full_geojson_path.stat().st_size / (1024 * 1024), 2) if full_geojson_path.exists() else 0,
                "feature_count": feature_count,
                "properties": gdf_columns
            }
        }

        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(meta, f, indent=2, ensure_ascii=False)

    def detect_layer_type(self, file_path: Path, gdf: gpd.GeoDataFrame) -> str:
        """Detect layer type from filename or content"""
        name_lower = file_path.stem.lower()

        if any(x in name_lower for x in ['road', 'highway', 'osm_roads']):
            return 'roads'
        elif any(x in name_lower for x in ['pop', 'population', 'worldpop']):
            return 'population'
        elif any(x in name_lower for x in ['night', 'light', 'viirs', 'radiance']):
            return 'nightlight'
        elif any(x in name_lower for x in ['health', 'hospital', 'clinic']):
            return 'health'
        elif any(x in name_lower for x in ['school', 'education']):
            return 'education'
        elif any(x in name_lower for x in ['water', 'river', 'lake']):
            return 'water'
        elif any(x in name_lower for x in ['boundary', 'admin', 'border']):
            return 'boundary'
        else:
            return 'generic'

    def process_geojson(self, geojson_path: Path, output_dir: Path, country: str, region: str) -> dict:
        """Process a single GeoJSON file into R2A tiles"""
        print(f"  Processing: {geojson_path.name}")

        # Load GeoJSON
        try:
            gdf = gpd.read_file(geojson_path)
        except Exception as e:
            print(f"    ERROR: Failed to load {geojson_path}: {e}")
            return None

        if gdf.empty:
            print(f"    SKIP: Empty GeoJSON")
            return None

        # Detect layer type
        layer_type = self.detect_layer_type(geojson_path, gdf)
        layer_name = geojson_path.stem

        # Get bounds
        bounds = self.get_region_bounds(gdf)

        # Create output directory
        output_dir.mkdir(parents=True, exist_ok=True)

        # Generate WebP tile
        webp_path = output_dir / f"{layer_name}.webp"
        try:
            if layer_type == 'roads':
                self.generate_road_tile(gdf, webp_path, bounds)
            elif layer_type == 'population':
                self.generate_population_tile(gdf, webp_path, bounds)
            elif layer_type == 'nightlight':
                self.generate_nightlight_tile(gdf, webp_path, bounds)
            else:
                self.generate_generic_tile(gdf, webp_path, bounds)
        except Exception as e:
            print(f"    ERROR generating WebP: {e}")
            return None

        # Generate hover GeoJSON
        hover_path = output_dir / f"{layer_name}.hover.geojson"
        hover_size, feature_count = self.generate_hover_geojson(gdf, hover_path)

        # Generate meta JSON
        meta_path = output_dir / f"{layer_name}.meta.json"
        self.generate_meta_json(
            meta_path, layer_name, region, country,
            webp_path, hover_path, geojson_path,
            bounds, feature_count, list(gdf.columns)
        )

        webp_size_kb = round(webp_path.stat().st_size / 1024, 1)
        hover_size_kb = round(hover_size / 1024, 1)
        original_size_mb = round(geojson_path.stat().st_size / (1024 * 1024), 2)

        print(f"    OK: {layer_name}")
        print(f"        WebP: {webp_size_kb} KB | Hover: {hover_size_kb} KB | Original: {original_size_mb} MB")
        print(f"        Compression: {round(original_size_mb * 1024 / webp_size_kb, 1)}x smaller")

        return {
            'layer': layer_name,
            'type': layer_type,
            'webp_kb': webp_size_kb,
            'hover_kb': hover_size_kb,
            'original_mb': original_size_mb,
            'features': feature_count
        }

    def process_region(self, country: str, region: str, layer_filter: str = None) -> list:
        """Process all layers for a region"""
        print(f"\n{'='*60}")
        print(f"Processing: {country} / {region}")
        print(f"{'='*60}")

        results = []

        # Look for GeoJSON files in various locations
        search_paths = [
            self.base_path / 'data_warehouse' / 'roads' / 'roads_by_region' / 'osm',
            self.base_path / 'data_warehouse' / 'population' / 'worldpop_1km' / 'by_year',
            self.base_path / 'data_warehouse' / 'nightlight' / 'viirs',
            self.geodata_path / country / 'L1' / region,
        ]

        output_dir = self.tiles_path / country / 'L1' / region

        for search_path in search_paths:
            if not search_path.exists():
                continue

            # Find GeoJSON files matching the region
            for geojson_file in search_path.rglob('*.geojson'):
                # Check if file matches region name
                if region.lower().replace(' ', '_') in geojson_file.stem.lower() or \
                   region.lower().replace(' ', '') in geojson_file.stem.lower():

                    # Apply layer filter if specified
                    if layer_filter and layer_filter.lower() not in geojson_file.stem.lower():
                        continue

                    result = self.process_geojson(geojson_file, output_dir, country, region)
                    if result:
                        results.append(result)

        if not results:
            print(f"  No GeoJSON files found for region: {region}")

        return results

    def process_country(self, country: str, region_filter: str = None, layer_filter: str = None) -> dict:
        """Process all regions for a country"""
        config = self.load_config(country)
        regions = config.get('regions', [])

        if region_filter:
            regions = [r for r in regions if r.lower() == region_filter.lower()]

        if not regions:
            print(f"No regions found for country: {country}")
            return {}

        print(f"\n{'#'*60}")
        print(f"# COUNTRY: {config['country']['name']} ({country})")
        print(f"# Regions: {len(regions)}")
        print(f"{'#'*60}")

        all_results = {}
        for region in regions:
            results = self.process_region(country, region, layer_filter)
            if results:
                all_results[region] = results

        return all_results


def main():
    parser = argparse.ArgumentParser(
        description='R2A Tile Generator - Convert GeoJSON to WebP tiles',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python generate_tiles.py --country somalia
  python generate_tiles.py --country somalia --region Bakool
  python generate_tiles.py --country somalia --region Bakool --layer roads
  python generate_tiles.py --list-countries
        """
    )

    parser.add_argument('--country', '-c', help='Country code (e.g., somalia, yemen) or "all"')
    parser.add_argument('--region', '-r', help='Specific region name (optional)')
    parser.add_argument('--layer', '-l', help='Layer type filter (e.g., roads, population)')
    parser.add_argument('--list-countries', action='store_true', help='List available countries')
    parser.add_argument('--dpi', type=int, default=150, help='DPI for tile generation (default: 150)')

    args = parser.parse_args()

    # Determine base path (script is in tools/)
    base_path = Path(__file__).parent.parent

    generator = TileGenerator(base_path)

    # List countries
    if args.list_countries:
        countries_path = base_path / 'countries'
        print("\nAvailable countries:")
        for country_dir in sorted(countries_path.iterdir()):
            if country_dir.is_dir() and (country_dir / 'config.json').exists():
                config = generator.load_config(country_dir.name)
                print(f"  {country_dir.name}: {config['country']['name']} ({len(config.get('regions', []))} regions)")
        return

    # Require country argument
    if not args.country:
        parser.print_help()
        return

    # Process
    start_time = datetime.now()

    if args.country.lower() == 'all':
        countries_path = base_path / 'countries'
        for country_dir in sorted(countries_path.iterdir()):
            if country_dir.is_dir() and (country_dir / 'config.json').exists():
                if country_dir.name != 'template':  # Skip template folder
                    generator.process_country(country_dir.name, args.region, args.layer)
    else:
        generator.process_country(args.country, args.region, args.layer)

    elapsed = datetime.now() - start_time
    print(f"\n{'='*60}")
    print(f"Tile generation complete!")
    print(f"Time elapsed: {elapsed}")
    print(f"{'='*60}")


if __name__ == '__main__':
    main()
