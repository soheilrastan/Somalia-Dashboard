#!/usr/bin/env python3
"""
GeoJSON Optimization Script for Somalia Dashboard
Reduces file sizes by:
1. Reducing coordinate precision (7 decimals -> 5 decimals = ~1m accuracy)
2. Minifying JSON (removing whitespace)
3. Creating backup before modification
"""

import json
import os
import shutil
from pathlib import Path

def round_coordinates(coords, precision=5):
    """Recursively round all coordinates to specified decimal places"""
    if isinstance(coords[0], (int, float)):
        return [round(c, precision) for c in coords]
    return [round_coordinates(c, precision) for c in coords]

def optimize_geojson(file_path, precision=5):
    """Optimize a GeoJSON file"""
    print(f"\nProcessing: {file_path}")

    # Get original size
    original_size = os.path.getsize(file_path)
    print(f"  Original size: {original_size / 1024 / 1024:.2f} MB")

    # Create backup
    backup_path = str(file_path) + '.backup'
    if not os.path.exists(backup_path):
        shutil.copy2(file_path, backup_path)
        print(f"  [OK] Backup created: {backup_path}")

    # Load GeoJSON
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # Optimize coordinates
    if 'features' in data:
        for feature in data['features']:
            if 'geometry' in feature and 'coordinates' in feature['geometry']:
                feature['geometry']['coordinates'] = round_coordinates(
                    feature['geometry']['coordinates'],
                    precision
                )
    elif 'coordinates' in data:
        data['coordinates'] = round_coordinates(data['coordinates'], precision)

    # Write optimized version (minified)
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, separators=(',', ':'))

    # Get new size
    new_size = os.path.getsize(file_path)
    reduction = ((original_size - new_size) / original_size) * 100

    print(f"  Optimized size: {new_size / 1024 / 1024:.2f} MB")
    print(f"  [OK] Reduced by: {reduction:.1f}% ({(original_size - new_size) / 1024 / 1024:.2f} MB saved)")

    return original_size, new_size

def optimize_javascript_geojson(file_path, precision=5):
    """Optimize embedded GeoJSON in JavaScript files"""
    print(f"\nProcessing JS file: {file_path}")

    # Get original size
    original_size = os.path.getsize(file_path)
    print(f"  Original size: {original_size / 1024 / 1024:.2f} MB")

    # Create backup
    backup_path = str(file_path) + '.backup'
    if not os.path.exists(backup_path):
        shutil.copy2(file_path, backup_path)
        print(f"  [OK] Backup created")

    # Read file
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Process each variable assignment
    import re

    # Find all const/var variable = {GeoJSON} patterns
    pattern = r'(const|var)\s+(\w+)\s*=\s*(\{.*?\});'

    def optimize_json_match(match):
        prefix = match.group(1)  # const or var
        var_name = match.group(2)
        json_str = match.group(3)

        try:
            # Parse JSON
            data = json.loads(json_str)

            # Optimize coordinates if it's GeoJSON
            if isinstance(data, dict):
                if 'features' in data:
                    for feature in data.get('features', []):
                        if 'geometry' in feature and 'coordinates' in feature['geometry']:
                            feature['geometry']['coordinates'] = round_coordinates(
                                feature['geometry']['coordinates'],
                                precision
                            )
                elif 'coordinates' in data:
                    data['coordinates'] = round_coordinates(data['coordinates'], precision)

            # Return minified version
            return f"{prefix} {var_name}={json.dumps(data, separators=(',', ':'))};"
        except:
            # If parsing fails, return original
            return match.group(0)

    # Apply optimization
    optimized_content = re.sub(pattern, optimize_json_match, content, flags=re.DOTALL)

    # Write back
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(optimized_content)

    # Get new size
    new_size = os.path.getsize(file_path)
    reduction = ((original_size - new_size) / original_size) * 100

    print(f"  Optimized size: {new_size / 1024 / 1024:.2f} MB")
    print(f"  [OK] Reduced by: {reduction:.1f}% ({(original_size - new_size) / 1024 / 1024:.2f} MB saved)")

    return original_size, new_size

def main():
    print("=" * 70)
    print("  Somalia Dashboard GeoJSON Optimizer")
    print("=" * 70)
    print("\nThis script will:")
    print("  - Reduce coordinate precision (7 -> 5 decimals = ~1m accuracy)")
    print("  - Minify JSON (remove whitespace)")
    print("  - Create backups (.backup extension)")
    print()

    total_original = 0
    total_new = 0

    # Optimize VIIRS GeoJSON files
    viirs_files = [
        'bakool_viirs_500m_2022_full.geojson',
        'bakool_viirs_500m_2023_full.geojson',
        'bakool_viirs_500m_2023.geojson'
    ]

    print("\n[1/3] Optimizing VIIRS nightlight files...")
    for file in viirs_files:
        if os.path.exists(file):
            orig, new = optimize_geojson(file, precision=5)
            total_original += orig
            total_new += new

    # Optimize roads GeoJSON files in roads_by_region/
    print("\n[2/3] Optimizing regional roads GeoJSON files...")
    roads_dir = Path('roads_by_region')
    if roads_dir.exists():
        for geojson_file in roads_dir.glob('*.geojson'):
            orig, new = optimize_geojson(str(geojson_file), precision=6)
            total_original += orig
            total_new += new

    # Optimize data.js (contains multiple embedded GeoJSON objects)
    print("\n[3/3] Optimizing data.js...")
    if os.path.exists('data.js'):
        orig, new = optimize_javascript_geojson('data.js', precision=5)
        total_original += orig
        total_new += new

    # Summary
    print("\n" + "=" * 70)
    print("  OPTIMIZATION COMPLETE")
    print("=" * 70)
    total_reduction = ((total_original - total_new) / total_original) * 100
    print(f"\nTotal original size:  {total_original / 1024 / 1024:.2f} MB")
    print(f"Total optimized size: {total_new / 1024 / 1024:.2f} MB")
    print(f"Total reduction:      {total_reduction:.1f}% ({(total_original - total_new) / 1024 / 1024:.2f} MB saved)")
    print(f"\n[OK] All files optimized successfully!")
    print(f"[OK] Backups saved with .backup extension")
    print(f"\nNote: Coordinate precision reduced to 5-6 decimals (~1m accuracy)")
    print("      This is more than sufficient for regional-level visualization.")

if __name__ == '__main__':
    main()
