#!/usr/bin/env python3
"""
OSM Roads Auto-Update Script
Downloads latest Somalia roads from HDX and processes by region
"""

import requests
import zipfile
import json
import os
import shutil
from pathlib import Path
import geopandas as gpd
from shapely.geometry import shape
import time

# HDX API endpoint for Somalia roads dataset
HDX_DATASET_URL = "https://data.humdata.org/api/3/action/package_show?id=hotosm_som_roads"
HDX_BASE_URL = "https://data.humdata.org"

# Somalia regions (ADM1)
REGIONS = [
    'Awdal', 'Bakool', 'Banadir', 'Bari', 'Bay', 'Galgaduud', 'Gedo',
    'Hiiraan', 'Lower_Juba', 'Lower_Shebelle', 'Middle_Juba', 'Middle_Shebelle',
    'Mudug', 'Nugaal', 'Sanaag', 'Sool', 'Togdheer', 'Woqooyi_Galbeed'
]

def download_latest_roads():
    """Download the latest GeoJSON roads file from HDX"""
    print("=" * 70)
    print("  Somalia Roads OSM Auto-Updater")
    print("=" * 70)
    print("\n[1/6] Fetching latest dataset info from HDX...")

    try:
        response = requests.get(HDX_DATASET_URL)
        response.raise_for_status()
        dataset_info = response.json()

        # Find the GeoJSON file
        resources = dataset_info['result']['resources']
        geojson_resource = None

        for resource in resources:
            if 'geojson' in resource['format'].lower() and 'lines' in resource['name'].lower():
                geojson_resource = resource
                break

        if not geojson_resource:
            print("[ERROR] GeoJSON lines file not found in dataset!")
            return None

        download_url = geojson_resource['url']
        file_name = geojson_resource['name']
        last_modified = geojson_resource.get('last_modified', 'Unknown')

        print(f"[OK] Found: {file_name}")
        print(f"[OK] Last modified: {last_modified}")
        print(f"[OK] Size: {geojson_resource.get('size', 'Unknown')}")

        # Download the file
        print(f"\n[2/6] Downloading {file_name}...")
        zip_path = Path('temp_osm_roads.zip')

        response = requests.get(download_url, stream=True)
        response.raise_for_status()

        total_size = int(response.headers.get('content-length', 0))
        downloaded = 0

        with open(zip_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)
                    downloaded += len(chunk)
                    if total_size > 0:
                        percent = (downloaded / total_size) * 100
                        print(f"\r  Progress: {percent:.1f}% ({downloaded / 1024 / 1024:.1f} MB)", end='')

        print("\n[OK] Download complete!")

        # Extract the zip file
        print("\n[3/6] Extracting GeoJSON...")
        extract_dir = Path('temp_osm_extract')
        extract_dir.mkdir(exist_ok=True)

        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(extract_dir)

        # Find the extracted GeoJSON file
        geojson_files = list(extract_dir.glob('*.geojson'))
        if not geojson_files:
            print("[ERROR] No GeoJSON file found in extracted archive!")
            return None

        geojson_path = geojson_files[0]
        print(f"[OK] Extracted: {geojson_path.name}")

        # Cleanup zip file
        zip_path.unlink()

        return geojson_path

    except Exception as e:
        print(f"[ERROR] Error downloading roads data: {e}")
        return None

def load_region_boundaries():
    """Load Somalia ADM1 boundaries from data.js"""
    print("\n[4/6] Loading region boundaries...")

    # Read data.js and extract ADM1 boundaries
    with open('data.js', 'r', encoding='utf-8') as f:
        content = f.read()

    # Find the adm1Boundaries object
    start = content.find('const adm1Boundaries = ')
    if start == -1:
        print("[ERROR] Could not find adm1Boundaries in data.js!")
        return None

    start = content.find('{', start)
    end = content.find('};', start) + 1

    boundaries_json = content[start:end]
    boundaries = json.loads(boundaries_json)

    print(f"[OK] Loaded {len(boundaries['features'])} region boundaries")
    return boundaries

def split_roads_by_region(roads_path, boundaries):
    """Split roads GeoJSON into separate regional files"""
    print("\n[5/6] Splitting roads by region...")

    # Load roads data
    print("  Loading roads data...")
    with open(roads_path, 'r', encoding='utf-8') as f:
        roads_data = json.load(f)

    total_roads = len(roads_data['features'])
    print(f"  Total roads: {total_roads:,}")

    # Create output directory for latest roads (separate from 2023 data)
    output_dir = Path('roads_by_region_latest')
    output_dir.mkdir(exist_ok=True)

    # Process each region
    region_roads = {region: [] for region in REGIONS}

    print("  Assigning roads to regions...")
    for i, road in enumerate(roads_data['features']):
        if (i + 1) % 1000 == 0:
            print(f"\r    Processed: {i+1:,}/{total_roads:,}", end='')

        road_geom = shape(road['geometry'])

        # Check which region this road belongs to
        for boundary_feature in boundaries['features']:
            region_name = boundary_feature['properties']['name'].replace(' ', '_')
            if region_name in REGIONS:
                boundary_geom = shape(boundary_feature['geometry'])

                if road_geom.intersects(boundary_geom):
                    region_roads[region_name].append(road)
                    break

    print(f"\r    Processed: {total_roads:,}/{total_roads:,}")

    # Save regional files
    print("\n  Saving regional files...")
    saved_count = 0

    for region in REGIONS:
        roads = region_roads[region]

        if len(roads) == 0:
            print(f"    [WARNING]  {region}: No roads found")
            continue

        # Create GeoJSON
        regional_geojson = {
            "type": "FeatureCollection",
            "features": roads
        }

        # Optimize coordinates (reduce to 6 decimals)
        for feature in regional_geojson['features']:
            if feature['geometry']['type'] == 'LineString':
                feature['geometry']['coordinates'] = [
                    [round(coord[0], 6), round(coord[1], 6)]
                    for coord in feature['geometry']['coordinates']
                ]
            elif feature['geometry']['type'] == 'MultiLineString':
                feature['geometry']['coordinates'] = [
                    [[round(coord[0], 6), round(coord[1], 6)] for coord in line]
                    for line in feature['geometry']['coordinates']
                ]

        # Save GeoJSON file
        geojson_file = output_dir / f"{region}_roads.geojson"
        with open(geojson_file, 'w', encoding='utf-8') as f:
            json.dump(regional_geojson, f, separators=(',', ':'))

        geojson_size = geojson_file.stat().st_size / 1024 / 1024

        # Create JavaScript file
        js_file = output_dir / f"{region}_roads.js"
        with open(js_file, 'w', encoding='utf-8') as f:
            f.write(f"const {region.lower()}RoadsData = ")
            json.dump(regional_geojson, f, separators=(',', ':'))
            f.write(';')

        js_size = js_file.stat().st_size / 1024 / 1024

        print(f"    [OK] {region}: {len(roads):,} roads, {geojson_size:.1f} MB (GeoJSON), {js_size:.1f} MB (JS)")
        saved_count += 1

    print(f"\n  [OK] Saved {saved_count} regional road files")

    return saved_count

def cleanup_temp_files():
    """Remove temporary files"""
    print("\n[6/6] Cleaning up temporary files...")

    temp_dir = Path('temp_osm_extract')
    if temp_dir.exists():
        shutil.rmtree(temp_dir)
        print("  [OK] Removed temporary extraction directory")

    temp_zip = Path('temp_osm_roads.zip')
    if temp_zip.exists():
        temp_zip.unlink()
        print("  [OK] Removed temporary zip file")

def main():
    start_time = time.time()

    # Download latest roads
    roads_path = download_latest_roads()
    if not roads_path:
        return

    # Load region boundaries
    boundaries = load_region_boundaries()
    if not boundaries:
        cleanup_temp_files()
        return

    # Split roads by region
    saved_count = split_roads_by_region(roads_path, boundaries)

    # Cleanup
    cleanup_temp_files()

    elapsed = time.time() - start_time

    print("\n" + "=" * 70)
    print("  UPDATE COMPLETE!")
    print("=" * 70)
    print(f"\n[OK] Updated {saved_count} regional road files")
    print(f"[OK] Time elapsed: {elapsed:.1f} seconds")
    print(f"\n[FILES] Files saved to: roads_by_region/")
    print(f"\n[INFO] Next steps:")
    print(f"   1. Run 'python optimize_roads_js.py' to further optimize files")
    print(f"   2. Commit and push changes to GitHub")
    print(f"   3. Refresh your dashboard to see updated roads")

if __name__ == '__main__':
    main()
