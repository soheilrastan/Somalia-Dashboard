"""
Convert Bakool nightlight points to 500m × 500m polygons
Following user's specification:
- Remove all values < 0.5 (to reduce data size)
- Classify remaining values:
  - 0.5 - 2.0: Rural Light (#a855f7)
  - 2.0 - 10.0: Urban Light (#fbbf24)
  - > 10.0: Industrial/Major Urban (#fde047)
"""
import json
import math

def create_500m_polygon(lat, lon):
    """Create a 500m × 500m polygon centered on the point"""
    lat_offset = 500 / 111320
    lon_offset = 500 / (111320 * math.cos(math.radians(lat)))

    polygon = [
        [lon - lon_offset/2, lat - lat_offset/2],
        [lon + lon_offset/2, lat - lat_offset/2],
        [lon + lon_offset/2, lat + lat_offset/2],
        [lon - lon_offset/2, lat + lat_offset/2],
        [lon - lon_offset/2, lat - lat_offset/2]
    ]
    return polygon

def classify_nightlight(value):
    """Classify nightlight value per user specification"""
    if value < 0.5:
        return None  # Remove from dataset
    elif value < 2.0:
        return {
            'category': 'Rural Light',
            'color': '#a855f7',
            'label': 'Rural'
        }
    elif value < 10.0:
        return {
            'category': 'Urban Light',
            'color': '#fbbf24',
            'label': 'Urban'
        }
    else:
        return {
            'category': 'Industrial/Major Urban',
            'color': '#fde047',
            'label': 'Industrial'
        }

# Process both years
years = [2022, 2023]

for year in years:
    print(f"\n{'='*60}")
    print(f"Processing Bakool {year} - Points to Polygons (Filtered)")
    print(f"{'='*60}")

    js_file = f'bakool_nightlight_{year}.js'

    with open(js_file, 'r') as f:
        content = f.read()

    json_start = content.index('{')
    json_data = json.loads(content[json_start:-1])

    points = json_data['points']
    print(f"Original points: {len(points):,}")

    features = []
    removed_count = 0
    category_counts = {
        'Rural Light': 0,
        'Urban Light': 0,
        'Industrial/Major Urban': 0
    }

    for point in points:
        value = point['value']
        lat = point['lat']
        lon = point['lon']

        classification = classify_nightlight(value)

        if classification is None:
            removed_count += 1
            continue

        polygon_coords = create_500m_polygon(lat, lon)
        category_counts[classification['category']] += 1

        feature = {
            'type': 'Feature',
            'geometry': {
                'type': 'Polygon',
                'coordinates': [polygon_coords]
            },
            'properties': {
                'value': round(value, 3),
                'category': classification['category'],
                'color': classification['color'],
                'label': classification['label'],
                'lat': lat,
                'lon': lon,
                'year': year,
                'region': 'Bakool',
                'grid_size': '500m x 500m'
            }
        }

        features.append(feature)

    print(f"\nFiltering Results:")
    print(f"  Removed (< 0.5 nW/cm2/sr): {removed_count:,} points")
    print(f"  Kept: {len(features):,} polygons")
    print(f"\nClassification Breakdown:")
    print(f"  Rural Light (0.5-2.0): {category_counts['Rural Light']:,}")
    print(f"  Urban Light (2.0-10.0): {category_counts['Urban Light']:,}")
    print(f"  Industrial/Major Urban (>10.0): {category_counts['Industrial/Major Urban']:,}")

    geojson_output = {
        'type': 'FeatureCollection',
        'metadata': {
            'year': year,
            'region': 'Bakool',
            'grid_size': '500m x 500m',
            'filter_threshold': '0.5 nW/cm2/sr',
            'classification': {
                'rural_light': f'0.5-2.0 nW/cm2/sr ({category_counts["Rural Light"]:,} cells)',
                'urban_light': f'2.0-10.0 nW/cm2/sr ({category_counts["Urban Light"]:,} cells)',
                'industrial': f'>10.0 nW/cm2/sr ({category_counts["Industrial/Major Urban"]:,} cells)'
            },
            'total_polygons': len(features),
            'removed_background': removed_count
        },
        'features': features
    }

    geojson_file = f'bakool_nightlight_polygons_{year}_filtered.geojson'
    with open(geojson_file, 'w') as f:
        json.dump(geojson_output, f, indent=2)

    print(f"\nSUCCESS: GeoJSON saved: {geojson_file}")

    js_content = f"const bakoolNightlightPolygons{year} = {json.dumps(geojson_output, indent=2)};"

    js_output_file = f'bakool_nightlight_polygons_{year}.js'
    with open(js_output_file, 'w') as f:
        f.write(js_content)

    print(f"SUCCESS: JavaScript file saved: {js_output_file}")

    import os
    geojson_size = os.path.getsize(geojson_file) / 1024
    js_size = os.path.getsize(js_output_file) / 1024
    original_size = os.path.getsize(js_file) / (1024 * 1024)

    print(f"\nFile Sizes:")
    print(f"  Original (points): {original_size:.2f} MB")
    if js_size < 1024:
        print(f"  New (polygons): {js_size:.2f} KB")
    else:
        print(f"  New (polygons): {js_size/1024:.2f} MB")
    reduction = ((original_size * 1024 - js_size) / (original_size * 1024)) * 100
    print(f"  Size reduction: {reduction:.1f}%")

print(f"\n{'='*60}")
print("Conversion Complete!")
print("="*60)
print("\nNote: This filtered dataset contains only the brightest")
print("nightlight cells in Bakool (>= 0.5 nW/cm2/sr), representing")
print("the most lit areas in this extremely rural region.")
print(f"{'='*60}\n")
