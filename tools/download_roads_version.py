#!/usr/bin/env python3
"""
Download and process specific OSM roads version from HDX
Supports both GeoJSON and Geopackage formats with automatic conversion
"""

import requests
import zipfile
import json
import geopandas as gpd
from pathlib import Path
from datetime import datetime
import sys
import shutil

def download_roads_version(version_date, resource_url, format_type='GeoJSON'):
    """
    Download a specific version of OSM roads from HDX

    Args:
        version_date: Date string in format 'YYYY-MM-DD' (e.g., '2024-07-23')
        resource_url: Direct download URL from HDX
        format_type: 'GeoJSON' or 'Geopackage'

    Returns:
        Path to output directory
    """

    # Convert date to folder-safe format (remove time portion and invalid characters)
    # Handle dates like '2024-07-23T14:07:41' -> '2024_07_23'
    date_only = version_date.split('T')[0]  # Remove time portion
    folder_date = date_only.replace('-', '_').replace(':', '_')
    output_dir = Path(f'roads_by_region_{folder_date}')
    temp_dir = Path('temp_roads_download')

    print("=" * 70)
    print(f"  Downloading OSM Roads - {version_date}")
    print("=" * 70)
    print(f"Format: {format_type}")
    print(f"Output: {output_dir}")
    print()

    # Step 1: Download file
    print(f"[1/7] Downloading {format_type} file from HDX...")
    print(f"URL: {resource_url}")

    response = requests.get(resource_url, stream=True, timeout=300)
    response.raise_for_status()

    total_size = int(response.headers.get('content-length', 0))
    # Use sanitized folder_date for zip filename (no colons allowed on Windows)
    zip_path = temp_dir / f'roads_{folder_date}.zip'
    temp_dir.mkdir(exist_ok=True)

    downloaded = 0
    with open(zip_path, 'wb') as f:
        for chunk in response.iter_content(chunk_size=8192):
            f.write(chunk)
            downloaded += len(chunk)
            if total_size > 0:
                progress = (downloaded / total_size) * 100
                print(f"\rProgress: {progress:.1f}% ({downloaded / (1024*1024):.1f} MB / {total_size / (1024*1024):.1f} MB)", end='', flush=True)

    print(f"\n[OK] Downloaded {downloaded / (1024*1024):.1f} MB")
    print()

    # Step 2: Extract
    print("[2/7] Extracting archive...")
    with zipfile.ZipFile(zip_path, 'r') as zip_ref:
        zip_ref.extractall(temp_dir)
    print("[OK] Extracted")
    print()

    # Step 3: Find roads file
    print("[3/7] Locating roads data file...")

    if format_type == 'Geopackage':
        # Find .gpkg file with roads/lines
        roads_files = list(temp_dir.glob('**/roads*.gpkg'))
        if not roads_files:
            roads_files = list(temp_dir.glob('**/*.gpkg'))

        if not roads_files:
            raise FileNotFoundError("No .gpkg file found in archive")

        roads_file = roads_files[0]
        print(f"[OK] Found: {roads_file.name}")
        print()

        # Step 4: Convert Geopackage to GeoJSON
        print("[4/7] Converting Geopackage to GeoJSON...")
        print("Reading Geopackage (this may take a few minutes)...")

        # Read geopackage - find the lines layer
        import fiona
        layers = fiona.listlayers(roads_file)
        print(f"Available layers: {layers}")

        # Find lines layer
        lines_layer = None
        for layer in layers:
            if 'lines' in layer.lower() or 'road' in layer.lower():
                lines_layer = layer
                break

        if not lines_layer:
            lines_layer = layers[0]  # Use first layer if no match

        print(f"Reading layer: {lines_layer}")
        gdf = gpd.read_file(roads_file, layer=lines_layer)

        print(f"[OK] Loaded {len(gdf):,} road features")
        print(f"Geometry type: {gdf.geometry.type.unique()}")
        print(f"CRS: {gdf.crs}")
        print()

        # Convert to WGS84 if needed
        if gdf.crs and gdf.crs.to_epsg() != 4326:
            print("Converting to WGS84 (EPSG:4326)...")
            gdf = gdf.to_crs('EPSG:4326')
            print("[OK] Converted")
            print()

        # Save as GeoJSON
        geojson_path = temp_dir / f'roads_{folder_date}.geojson'
        print(f"Writing GeoJSON to {geojson_path.name}...")
        gdf.to_file(geojson_path, driver='GeoJSON')
        print("[OK] Converted to GeoJSON")
        print()

    else:  # GeoJSON format
        # Find .geojson file
        geojson_files = list(temp_dir.glob('**/*.geojson'))
        if not geojson_files:
            raise FileNotFoundError("No .geojson file found in archive")

        geojson_path = geojson_files[0]
        print(f"[OK] Found: {geojson_path.name}")
        print()

        print("[4/7] Loading GeoJSON...")
        gdf = gpd.read_file(geojson_path)
        print(f"[OK] Loaded {len(gdf):,} road features")
        print()

    # Step 5: Load region boundaries
    print("[5/7] Loading Somalia region boundaries...")
    boundaries_path = Path('layers/boundaries/adm1/somalia_adm1_boundaries.geojson')

    if not boundaries_path.exists():
        raise FileNotFoundError("layers/boundaries/adm1/somalia_adm1_boundaries.geojson not found")

    regions = gpd.read_file(boundaries_path)
    print(f"[OK] Loaded {len(regions)} regions")
    print()

    # Step 6: Split roads by region
    print("[6/7] Splitting roads by 18 regions...")
    print("This may take several minutes...")
    print()

    output_dir.mkdir(exist_ok=True)

    for idx, region in regions.iterrows():
        region_name = region['name']
        region_name_safe = region_name.replace(' ', '_')

        print(f"Processing: {region_name}...", end='', flush=True)

        # Spatial join - find roads in this region
        roads_in_region = gdf[gdf.intersects(region.geometry)]

        num_roads = len(roads_in_region)
        print(f" {num_roads:,} roads", end='', flush=True)

        if num_roads > 0:
            # Save as GeoJSON
            geojson_file = output_dir / f'{region_name_safe}_roads.geojson'
            roads_in_region.to_file(geojson_file, driver='GeoJSON')

            # Save as JavaScript variable
            js_file = output_dir / f'{region_name_safe}_roads.js'
            with open(geojson_file, 'r', encoding='utf-8') as f:
                geojson_data = json.load(f)

            with open(js_file, 'w', encoding='utf-8') as f:
                var_name = f"{region_name_safe.lower()}Roads{folder_date.replace('_', '')}"
                f.write(f"const {var_name} = ")
                json.dump(geojson_data, f)
                f.write(';')

            print(f" ✓")
        else:
            print(f" (no roads)")

    print()
    print(f"[OK] Created {len(list(output_dir.glob('*.geojson')))} regional files")
    print()

    # Step 7: Write version metadata
    print("[7/7] Writing version metadata...")

    version_file = output_dir / '.version.json'
    version_data = {
        'last_modified': date_only + 'T00:00:00',
        'updated_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'format': format_type,
        'source': 'HDX - Humanitarian OpenStreetMap Team',
        'url': resource_url,
        'total_features': len(gdf),
        'regions': len(regions)
    }

    with open(version_file, 'w') as f:
        json.dump(version_data, f, indent=2)

    print(f"[OK] Version file created")
    print()

    # Cleanup
    print("Cleaning up temporary files...")
    shutil.rmtree(temp_dir)
    print("[OK] Cleanup complete")
    print()

    print("=" * 70)
    print("  DOWNLOAD COMPLETE!")
    print("=" * 70)
    print(f"Output directory: {output_dir}")
    print(f"Total files: {len(list(output_dir.glob('*')))} (36 regional + 1 version file)")
    print(f"Version: {version_date}")
    print("=" * 70)

    return output_dir


# ============================================================================
# MAIN - Download 2024 version
# ============================================================================

if __name__ == '__main__':
    # 2024 Geopackage version details
    VERSION_DATE = '2024-07-23'
    RESOURCE_URL = 'https://export.hotosm.org/downloads/21e780f0-92c7-4b5b-a421-1734fbc9c2f1/hotosm_som_roads_gpkg.zip'
    FORMAT = 'Geopackage'

    try:
        output_dir = download_roads_version(VERSION_DATE, RESOURCE_URL, FORMAT)
        print()
        print(f"SUCCESS! Roads data for {VERSION_DATE} is ready.")
        print(f"Location: {output_dir.absolute()}")

    except Exception as e:
        print()
        print(f"ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
