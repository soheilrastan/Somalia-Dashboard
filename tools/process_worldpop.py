#!/usr/bin/env python3
"""
WorldPop Somalia Data Processor
===============================
Converts GeoTIFF raster to GeoJSON vector and clips by L1 regions.

FOLDER STRUCTURE (scalable for future L2 clipping):
----------------------------------------------------
data_warehouse/population/worldpop_1km/
├── raw/                      # Original GeoTIFFs
├── vector/                   # Full Somalia GeoJSON
└── by_year/                  # Pre-clipped by L1 (Year → Region)
    ├── 2015/
    │   ├── Bakool_pop_2015.geojson
    │   └── ... (18 L1 regions)
    ├── 2020/
    ├── 2025/
    └── 2030/

OPTIMIZATION: Only converts cells with population > 0 (reduces size by ~89%)

Geo-Insights Lab, ESCWA, United Nations - January 2026
"""

import os
import sys
import json
import time

# Force UTF-8 output on Windows
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

import numpy as np
import rasterio
from rasterio.transform import xy
import geopandas as gpd
from shapely.geometry import box
import warnings
warnings.filterwarnings('ignore')

# =============================================================================
# CONFIGURATION
# =============================================================================

BASE_DIR = os.path.join(os.path.dirname(__file__), '..', 'data_warehouse', 'population', 'worldpop_1km')
RAW_DIR = os.path.join(BASE_DIR, 'raw')
VECTOR_DIR = os.path.join(BASE_DIR, 'vector')
BY_YEAR_DIR = os.path.join(BASE_DIR, 'by_year')  # Changed from by_region to by_year

# Somalia L1 boundaries
BOUNDARIES_FILE = os.path.join(os.path.dirname(__file__), '..', 'layers', 'boundaries', 'adm1', 'somalia_adm1_boundaries.geojson')

# Years to process
YEARS = [2015, 2020, 2025, 2030]

# Minimum population threshold (cells with pop <= this are SKIPPED)
MIN_POPULATION = 0.0  # Include any cell with population > 0

def get_tif_path(year):
    """Get path to GeoTIFF file for a year"""
    return os.path.join(RAW_DIR, f"som_pop_{year}_CN_1km_R2025A_UA_v1.tif")

def raster_to_vector(tif_path, year):
    """Convert GeoTIFF to GeoDataFrame (only cells with population > 0)"""
    print(f"\n  Reading: {os.path.basename(tif_path)}")

    with rasterio.open(tif_path) as src:
        data = src.read(1)
        transform = src.transform
        crs = src.crs
        nodata = src.nodata

        rows, cols = data.shape
        total_cells = cols * rows
        print(f"  Raster: {cols} x {rows} = {total_cells:,} cells")

    # Filter: only cells with population > MIN_POPULATION
    if nodata is not None:
        nodata_mask = (data == nodata) | np.isnan(data)
    else:
        nodata_mask = np.isnan(data)

    valid_mask = (~nodata_mask) & (data > MIN_POPULATION)
    valid_count = np.sum(valid_mask)

    print(f"  Valid cells (pop > {MIN_POPULATION}): {valid_count:,} ({100*valid_count/total_cells:.1f}%)")
    print(f"  Skipped: {total_cells - valid_count:,} cells (nodata/zero)")

    if valid_count == 0:
        print("  [WARN] No valid cells!")
        return None

    # Convert only valid cells to polygons
    print(f"  Converting {valid_count:,} cells to polygons...")
    valid_rows, valid_cols = np.where(valid_mask)

    polygons = []
    populations = []
    start = time.time()

    for i, (row, col) in enumerate(zip(valid_rows, valid_cols)):
        if i > 0 and i % 50000 == 0:
            elapsed = time.time() - start
            print(f"    {i:,}/{valid_count:,} ({100*i/valid_count:.0f}%) - {elapsed:.1f}s")

        x_min, y_max = xy(transform, row, col, offset='ul')
        x_max, y_min = xy(transform, row + 1, col + 1, offset='ul')
        polygons.append(box(x_min, y_min, x_max, y_max))
        populations.append(float(data[row, col]))

    print(f"  Done: {len(polygons):,} polygons in {time.time()-start:.1f}s")

    gdf = gpd.GeoDataFrame({
        'population': populations,
        'year': year
    }, geometry=polygons, crs=crs)

    print(f"  Total population: {gdf['population'].sum():,.0f}")
    return gdf

def clip_by_l1_regions(gdf, year, boundaries_gdf):
    """Clip GeoDataFrame by each L1 region and save to by_year/{year}/"""

    # Create year folder: by_year/2020/
    year_dir = os.path.join(BY_YEAR_DIR, str(year))
    os.makedirs(year_dir, exist_ok=True)

    print(f"\n  Clipping to {len(boundaries_gdf)} L1 regions...")
    print(f"  Output: {year_dir}/")

    results = {}
    for _, region in boundaries_gdf.iterrows():
        region_name = region['name']
        safe_name = region_name.replace(' ', '_')

        try:
            clipped = gpd.clip(gdf, region.geometry)
        except Exception as e:
            print(f"    [ERR] {region_name}: {e}")
            results[region_name] = 0
            continue

        if len(clipped) == 0:
            results[region_name] = 0
            continue

        total_pop = clipped['population'].sum()

        # Save as GeoJSON with metadata
        output_path = os.path.join(year_dir, f"{safe_name}_pop_{year}.geojson")

        geojson_data = {
            "type": "FeatureCollection",
            "metadata": {
                "region": region_name,
                "admin_level": 1,
                "year": year,
                "source": "WorldPop Global2 R2025A",
                "type": "Total Population (Constrained)",
                "resolution": "1km",
                "total_population": round(total_pop),
                "cell_count": len(clipped),
                "generated": time.strftime("%Y-%m-%d")
            },
            "features": json.loads(clipped.to_json())["features"]
        }

        with open(output_path, 'w') as f:
            json.dump(geojson_data, f, separators=(',', ':'))

        size_kb = os.path.getsize(output_path) / 1024
        print(f"    {region_name}: {len(clipped):,} cells, {total_pop:,.0f} pop ({size_kb:.0f} KB)")
        results[region_name] = len(clipped)

    return results

def process_year(year, boundaries_gdf):
    """Process one year: raster → vector → clip by L1"""
    print(f"\n{'='*60}")
    print(f"YEAR: {year}")
    print(f"{'='*60}")

    tif_path = get_tif_path(year)
    if not os.path.exists(tif_path):
        print(f"[ERROR] Not found: {tif_path}")
        return None

    # Convert raster to vector
    gdf = raster_to_vector(tif_path, year)
    if gdf is None:
        return None

    # Save full Somalia vector (optional)
    vector_path = os.path.join(VECTOR_DIR, f"somalia_pop_{year}.geojson")
    os.makedirs(VECTOR_DIR, exist_ok=True)

    geojson_data = {
        "type": "FeatureCollection",
        "metadata": {
            "country": "Somalia",
            "year": year,
            "source": "WorldPop Global2 R2025A",
            "type": "Total Population (Constrained)",
            "resolution": "1km",
            "total_population": round(gdf['population'].sum()),
            "cell_count": len(gdf),
            "generated": time.strftime("%Y-%m-%d")
        },
        "features": json.loads(gdf.to_json())["features"]
    }

    print(f"\n  Saving full Somalia: {os.path.basename(vector_path)}")
    with open(vector_path, 'w') as f:
        json.dump(geojson_data, f, separators=(',', ':'))
    print(f"  Size: {os.path.getsize(vector_path)/(1024*1024):.1f} MB")

    # Clip by L1 regions
    results = clip_by_l1_regions(gdf, year, boundaries_gdf)
    return results

def main():
    print("=" * 60)
    print("WorldPop Somalia Processor")
    print("Raster → Vector → Clip by L1 Regions")
    print("=" * 60)
    print(f"\nYears: {YEARS}")
    print(f"Output: {BY_YEAR_DIR}/{{year}}/{{Region}}_pop_{{year}}.geojson")

    # Load L1 boundaries
    print(f"\nLoading L1 boundaries...")
    if not os.path.exists(BOUNDARIES_FILE):
        print(f"[ERROR] Not found: {BOUNDARIES_FILE}")
        return 1

    boundaries_gdf = gpd.read_file(BOUNDARIES_FILE)
    print(f"Found {len(boundaries_gdf)} regions")

    # Process each year
    os.makedirs(BY_YEAR_DIR, exist_ok=True)
    start = time.time()

    for year in YEARS:
        process_year(year, boundaries_gdf)

    # Summary
    print(f"\n{'='*60}")
    print("COMPLETE")
    print(f"{'='*60}")
    print(f"Time: {time.time()-start:.1f}s")
    print(f"\nFolder structure:")
    print(f"  {BY_YEAR_DIR}/")
    for year in YEARS:
        year_dir = os.path.join(BY_YEAR_DIR, str(year))
        if os.path.exists(year_dir):
            files = [f for f in os.listdir(year_dir) if f.endswith('.geojson')]
            print(f"    {year}/ - {len(files)} regions")

    return 0

if __name__ == '__main__':
    sys.exit(main())
