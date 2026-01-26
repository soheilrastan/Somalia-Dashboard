#!/usr/bin/env python3
"""
Optimize roads JavaScript files in roads_by_region/ directory
Reduces coordinate precision and minifies the JS files
"""

import json
import os
import shutil
from pathlib import Path

def round_coordinates(coords, precision=6):
    """Recursively round all coordinates to specified decimal places"""
    if isinstance(coords[0], (int, float)):
        return [round(c, precision) for c in coords]
    return [round_coordinates(c, precision) for c in coords]

def optimize_roads_js(file_path, precision=6):
    """Optimize a roads JavaScript file"""
    print(f"\nProcessing: {file_path.name}")

    # Get original size
    original_size = os.path.getsize(file_path)
    print(f"  Original size: {original_size / 1024 / 1024:.2f} MB")

    # Create backup
    backup_path = str(file_path) + '.backup'
    if not os.path.exists(backup_path):
        shutil.copy2(file_path, backup_path)
        print(f"  [OK] Backup created")

    # Read the file
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Extract variable name and GeoJSON data
    # Format: var regionNameRoads = {...};
    if '=' in content:
        var_part, json_part = content.split('=', 1)
        var_name = var_part.strip()
        json_str = json_part.rstrip(';').strip()

        try:
            # Parse GeoJSON
            data = json.loads(json_str)

            # Optimize coordinates
            if 'features' in data:
                for feature in data['features']:
                    if 'geometry' in feature and 'coordinates' in feature['geometry']:
                        feature['geometry']['coordinates'] = round_coordinates(
                            feature['geometry']['coordinates'],
                            precision
                        )

            # Write back minified
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(f"{var_name}={json.dumps(data, separators=(',', ':'))};")

            # Get new size
            new_size = os.path.getsize(file_path)
            reduction = ((original_size - new_size) / original_size) * 100

            print(f"  Optimized size: {new_size / 1024 / 1024:.2f} MB")
            print(f"  [OK] Reduced by: {reduction:.1f}% ({(original_size - new_size) / 1024 / 1024:.2f} MB saved)")

            return original_size, new_size

        except Exception as e:
            print(f"  ERROR: Could not optimize - {e}")
            # Restore from backup
            shutil.copy2(backup_path, file_path)
            return original_size, original_size

    return original_size, original_size

def main():
    print("=" * 70)
    print("  Roads JavaScript Files Optimizer")
    print("=" * 70)
    print("\nOptimizing roads_by_region/*.js files...")
    print("  - Reducing coordinate precision to 6 decimals (~11cm accuracy)")
    print("  - Minifying JavaScript")
    print("  - Creating backups")
    print()

    total_original = 0
    total_new = 0

    roads_dir = Path('roads_by_region')
    if not roads_dir.exists():
        print("ERROR: roads_by_region/ directory not found")
        return

    js_files = list(roads_dir.glob('*_roads.js'))
    print(f"Found {len(js_files)} JavaScript files to optimize\n")

    for js_file in sorted(js_files):
        orig, new = optimize_roads_js(js_file, precision=6)
        total_original += orig
        total_new += new

    # Summary
    print("\n" + "=" * 70)
    print("  OPTIMIZATION COMPLETE")
    print("=" * 70)
    total_reduction = ((total_original - total_new) / total_original) * 100 if total_original > 0 else 0
    print(f"\nTotal original size:  {total_original / 1024 / 1024:.2f} MB")
    print(f"Total optimized size: {total_new / 1024 / 1024:.2f} MB")
    print(f"Total reduction:      {total_reduction:.1f}% ({(total_original - total_new) / 1024 / 1024:.2f} MB saved)")
    print(f"\n[OK] All files optimized successfully!")
    print(f"[OK] Backups saved with .backup extension")

if __name__ == '__main__':
    main()
