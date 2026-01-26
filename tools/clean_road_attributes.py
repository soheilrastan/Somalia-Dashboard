#!/usr/bin/env python3
"""
Clean Road Attributes Script
============================
Removes unnecessary attributes from road GeoJSON files to reduce file size.

Removes: name, name:en, name:so, name:so_1, osm_id, osm_type
Keeps: highway, surface, smoothness, bridge, layer, width, lanes, oneway, source
"""

import os
import json
import glob

# Attributes to remove
ATTRIBUTES_TO_REMOVE = [
    'name',
    'name:en',
    'name:so',
    'name:so_1',
    'osm_id',
    'osm_type'
]

def clean_geojson_file(filepath):
    """Clean a single GeoJSON/JS file by removing specified attributes."""
    print(f"Processing: {filepath}")

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Check if it's a JS variable assignment
    is_js_var = False
    var_name = None
    if content.strip().startswith('var '):
        is_js_var = True
        # Extract variable name and JSON content
        eq_pos = content.index('=')
        var_name = content[4:eq_pos].strip()
        json_content = content[eq_pos+1:].strip()
        if json_content.endswith(';'):
            json_content = json_content[:-1]
    else:
        json_content = content

    # Parse JSON
    try:
        data = json.loads(json_content)
    except json.JSONDecodeError as e:
        print(f"  ERROR: Could not parse JSON - {e}")
        return False, 0, 0

    # Count removed attributes
    total_removed = 0
    features_processed = 0

    # Process features
    if 'features' in data:
        for feature in data['features']:
            if 'properties' in feature and feature['properties']:
                props = feature['properties']
                for attr in ATTRIBUTES_TO_REMOVE:
                    if attr in props:
                        del props[attr]
                        total_removed += 1
                features_processed += 1

    # Write back
    json_output = json.dumps(data, separators=(',', ':'))  # Minified

    if is_js_var:
        output = f"var {var_name}={json_output};"
    else:
        output = json_output

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(output)

    print(f"  Cleaned {features_processed} features, removed {total_removed} attributes")
    return True, features_processed, total_removed

def process_folder(folder_path):
    """Process all JS files in a folder."""
    print(f"\n{'='*60}")
    print(f"Processing folder: {folder_path}")
    print(f"{'='*60}")

    js_files = glob.glob(os.path.join(folder_path, '*_roads.js'))

    if not js_files:
        print(f"No *_roads.js files found in {folder_path}")
        return

    total_files = 0
    total_features = 0
    total_attrs_removed = 0

    for filepath in sorted(js_files):
        success, features, attrs = clean_geojson_file(filepath)
        if success:
            total_files += 1
            total_features += features
            total_attrs_removed += attrs

    print(f"\nFolder Summary:")
    print(f"  Files processed: {total_files}")
    print(f"  Total features: {total_features}")
    print(f"  Total attributes removed: {total_attrs_removed}")

def main():
    base_path = os.path.dirname(os.path.abspath(__file__))

    # Process 2024 roads
    folder_2024 = os.path.join(base_path, 'roads_by_region_2024_07_23')
    if os.path.exists(folder_2024):
        process_folder(folder_2024)
    else:
        print(f"Folder not found: {folder_2024}")

    # Process Latest (2026) roads
    folder_latest = os.path.join(base_path, 'roads_by_region_latest')
    if os.path.exists(folder_latest):
        process_folder(folder_latest)
    else:
        print(f"Folder not found: {folder_latest}")

    print(f"\n{'='*60}")
    print("DONE! All road files cleaned.")
    print(f"{'='*60}")

if __name__ == '__main__':
    main()
