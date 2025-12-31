"""
Convert Bakool nightlight points to 500m × 500m polygons

IMPORTANT NOTE: Bakool is extremely rural with very low nightlight values
- 2022 range: 0.238 - 0.776 nW/cm²/sr
- 2023 range: 0.254 - 0.903 nW/cm²/sr
- Most values are 0.3-0.5 (99,875 out of 104,211 points)

User requested removing < 0.5, but this would remove 99.98% of data.
Instead, using Bakool-adjusted thresholds based on local distribution:
- Remove values < 0.25 (background noise)
- 0.25 - 0.35: Low Rural Light (#5b21b6 - dark purple)
- 0.35 - 0.50: Rural Light (#a855f7 - purple)
- 0.50 - 0.70: Bright Rural/Small Town (#fbbf24 - yellow)
- > 0.70: Urban Center (#fde047 - bright yellow)
"""
import json
import math

def create_500m_polygon(lat, lon):
    """
    Create a 500m × 500m polygon centered on the point
    Returns coordinates in [lon, lat] format for GeoJSON
    """
    # Convert 500m to degrees (approximate)
    # At the equator: 1 degree ≈ 111,320 meters
    # For Somalia (latitude ~4-5°), this is close enough

    # 500m in degrees latitude (constant)
    lat_offset = 500 / 111320  # ~0.00449°

    # 500m in degrees longitude (varies by latitude)
    # At latitude L: 1 degree longitude = 111,320 * cos(L) meters
    lon_offset = 500 / (111320 * math.cos(math.radians(lat)))  # ~0.00449° at equator

    # Create polygon coordinates (counterclockwise from bottom-left)
    polygon = [
        [lon - lon_offset/2, lat - lat_offset/2],  # Bottom-left
        [lon + lon_offset/2, lat - lat_offset/2],  # Bottom-right
        [lon + lon_offset/2, lat + lat_offset/2],  # Top-right
        [lon - lon_offset/2, lat + lat_offset/2],  # Top-left
        [lon - lon_offset/2, lat - lat_offset/2]   # Close polygon
    ]

    return polygon

def classify_nightlight(value):
    """
    Classify nightlight value using Bakool-adjusted thresholds
    Bakool is extremely rural - max value is only 0.903 nW/cm²/sr
    """
    if value < 0.25:
        return None  # Remove background noise
    elif value < 0.35:
        return {
            'category': 'Low Rural Light',
            'color': '#5b21b6',  # Dark purple
            'label': 'Low Rural'
        }
    elif value < 0.50:
        return {
            'category': 'Rural Light',
            'color': '#a855f7',  # Purple
            'label': 'Rural'
        }
    elif value < 0.70:
        return {
            'category': 'Bright Rural / Small Town',
            'color': '#fbbf24',  # Yellow
            'label': 'Small Town'
        }
    else:
        return {
            'category': 'Urban Center',
            'color': '#fde047',  # Bright yellow
            'label': 'Urban'
        }

# Process both years
years = [2022, 2023]

for year in years:
    print(f"\n{'='*60}")
    print(f"Processing Bakool {year} - Converting Points to Polygons")
    print(f"{'='*60}")

    # Load the JavaScript file
    js_file = f'bakool_nightlight_{year}.js'

    with open(js_file, 'r') as f:
        content = f.read()

    # Extract JSON data (remove the "const bakoolNightlight{year} = " part)
    json_start = content.index('{')
    json_data = json.loads(content[json_start:-1])  # -1 to remove trailing semicolon

    points = json_data['points']
    print(f"Original points: {len(points):,}")

    # Convert to polygons with classification
    features = []
    removed_count = 0
    category_counts = {
        'Low Rural Light': 0,
        'Rural Light': 0,
        'Bright Rural / Small Town': 0,
        'Urban Center': 0
    }

    for point in points:
        value = point['value']
        lat = point['lat']
        lon = point['lon']

        # Classify the point
        classification = classify_nightlight(value)

        if classification is None:
            removed_count += 1
            continue

        # Create 500m × 500m polygon
        polygon_coords = create_500m_polygon(lat, lon)

        # Count by category
        category_counts[classification['category']] += 1

        # Create feature
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
                'grid_size': '500m × 500m'
            }
        }

        features.append(feature)

    print(f"\nFiltering Results:")
    print(f"  • Removed (< 0.25 nW/cm²/sr): {removed_count:,} points")
    print(f"  • Kept: {len(features):,} polygons")
    print(f"\nClassification Breakdown:")
    print(f"  Low Rural Light (0.25-0.35): {category_counts['Low Rural Light']:,}")
    print(f"  Rural Light (0.35-0.50): {category_counts['Rural Light']:,}")
    print(f"  Bright Rural/Small Town (0.50-0.70): {category_counts['Bright Rural / Small Town']:,}")
    print(f"  Urban Center (>0.70): {category_counts['Urban Center']:,}")

    # Create GeoJSON
    geojson_output = {
        'type': 'FeatureCollection',
        'metadata': {
            'year': year,
            'region': 'Bakool',
            'grid_size': '500m × 500m',
            'classification': {
                'low_rural': f'0.25-0.35 nW/cm²/sr ({category_counts["Low Rural Light"]:,} cells)',
                'rural': f'0.35-0.50 nW/cm²/sr ({category_counts["Rural Light"]:,} cells)',
                'small_town': f'0.50-0.70 nW/cm²/sr ({category_counts["Bright Rural / Small Town"]:,} cells)',
                'urban': f'>0.70 nW/cm²/sr ({category_counts["Urban Center"]:,} cells)'
            },
            'total_polygons': len(features),
            'removed_background': removed_count
        },
        'features': features
    }

    # Save GeoJSON
    geojson_file = f'bakool_nightlight_polygons_{year}.geojson'
    with open(geojson_file, 'w') as f:
        json.dump(geojson_output, f, indent=2)

    print(f"\nSUCCESS: GeoJSON saved: {geojson_file}")

    # Create JavaScript file for dashboard
    js_content = f"const bakoolNightlightPolygons{year} = {json.dumps(geojson_output, indent=2)};"

    js_output_file = f'bakool_nightlight_polygons_{year}.js'
    with open(js_output_file, 'w') as f:
        f.write(js_content)

    print(f"SUCCESS: JavaScript file saved: {js_output_file}")

    # Show file sizes
    import os
    geojson_size = os.path.getsize(geojson_file) / (1024 * 1024)
    js_size = os.path.getsize(js_output_file) / (1024 * 1024)

    original_size = os.path.getsize(js_file) / (1024 * 1024)
    reduction = ((original_size - js_size) / original_size) * 100

    print(f"\nFile Sizes:")
    print(f"  • Original (points): {original_size:.2f} MB")
    print(f"  • New (polygons): {js_size:.2f} MB")
    print(f"  • GeoJSON: {geojson_size:.2f} MB")
    print(f"  • Size reduction: {reduction:.1f}%")

print(f"\n{'='*60}")
print("Conversion Complete!")
print("="*60)
print("\nNext Steps:")
print("1. Update index.html to load the new polygon files")
print("2. Update script.js to render polygons instead of points")
print("3. Add category-based styling with the classification colors")
print(f"{'='*60}\n")
