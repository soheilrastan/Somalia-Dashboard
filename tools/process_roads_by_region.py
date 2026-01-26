"""
Process OSM Roads data by clipping to ADM1 regions
Extract only essential fields: fclass, Length_m, Source_Yea
Creates separate lightweight JSON files per region
"""
import json
from shapely.geometry import shape, LineString, MultiLineString, Point
from shapely.ops import unary_union
import os
import sys

# Force UTF-8 encoding for Windows console
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

print("="*60)
print("Processing Roads by Region - ADM1 Clip")
print("="*60)

# Load ADM1 boundaries from data.js
print("\n[1/4] Loading ADM1 boundaries from data.js...")
with open('data.js', 'r', encoding='utf-8') as f:
    data_js = f.read()

# Extract the adm1Boundaries JSON from the JavaScript file
import re
match = re.search(r'const adm1Boundaries = ({.*?});', data_js, re.DOTALL)
if not match:
    print("❌ ERROR: Could not find adm1Boundaries in data.js")
    exit(1)

adm1_data = json.loads(match.group(1))
print(f"✓ Loaded {len(adm1_data['features'])} regions")

# Create region polygons dictionary
region_polygons = {}
for feature in adm1_data['features']:
    region_name = feature['properties'].get('name') or feature['properties'].get('ADM1_EN')
    if region_name:
        region_polygons[region_name] = shape(feature['geometry'])
        print(f"  • {region_name}")

# Load Roads data
print(f"\n[2/4] Loading Roads data (this may take a while - 610MB file)...")
with open('Roads_json.json', 'r', encoding='utf-8') as f:
    roads_data = json.load(f)

total_roads = len(roads_data['features'])
print(f"✓ Loaded {total_roads:,} road segments")

# Process roads by region
print("\n[3/4] Clipping roads to regions...")
roads_by_region = {region: [] for region in region_polygons.keys()}
unassigned_count = 0

for i, road in enumerate(roads_data['features']):
    if (i + 1) % 1000 == 0:
        print(f"  Processing road {i+1:,}/{total_roads:,} ({(i+1)/total_roads*100:.1f}%)")

    try:
        # Convert ESRI JSON format to GeoJSON format
        # ESRI format: {"paths": [[[x,y], [x,y]...]]}
        # GeoJSON format: {"type": "LineString", "coordinates": [[x,y], [x,y]...]}

        esri_geom = road['geometry']
        if 'paths' not in esri_geom or not esri_geom['paths']:
            continue

        # For LineString, take the first path
        coords = esri_geom['paths'][0]
        if not coords:
            continue

        geojson_geom = {
            'type': 'LineString',
            'coordinates': coords
        }

        # Get road geometry using GeoJSON format
        road_geom = shape(geojson_geom)

        # Get centroid for point-in-polygon test (faster than full intersection)
        centroid = road_geom.centroid

        # Find which region contains this road
        assigned = False
        for region_name, region_poly in region_polygons.items():
            if region_poly.contains(centroid):
                # Extract only essential fields
                simplified_road = {
                    'type': 'Feature',
                    'geometry': geojson_geom,
                    'properties': {
                        'fclass': road['attributes'].get('fclass', 'unknown'),
                        'Length_m': road['attributes'].get('Length_m', 0),
                        'Source_Yea': road['attributes'].get('Source_Yea', '2023')
                    }
                }
                roads_by_region[region_name].append(simplified_road)
                assigned = True
                break

        if not assigned:
            unassigned_count += 1

    except Exception as e:
        print(f"  ⚠ Warning: Error processing road {i+1}: {e}")
        continue

print(f"\n✓ Road processing complete")
print(f"  • Assigned: {total_roads - unassigned_count:,}")
print(f"  • Unassigned: {unassigned_count:,}")

# Save separate files per region
print("\n[4/4] Saving regional road files...")

output_dir = 'roads_by_region'
os.makedirs(output_dir, exist_ok=True)

region_stats = []

for region_name, roads in roads_by_region.items():
    if len(roads) > 0:
        # Create GeoJSON for this region
        region_geojson = {
            'type': 'FeatureCollection',
            'metadata': {
                'region': region_name,
                'total_roads': len(roads),
                'data_source': 'OpenStreetMap Somalia Roads 2023',
                'fields': ['fclass', 'Length_m', 'Source_Yea']
            },
            'features': roads
        }

        # Save GeoJSON
        safe_name = region_name.replace(' ', '_').replace('/', '_')
        geojson_file = os.path.join(output_dir, f'{safe_name}_roads.geojson')

        with open(geojson_file, 'w', encoding='utf-8') as f:
            json.dump(region_geojson, f, indent=2)

        # Create JavaScript version
        js_content = f"var {safe_name.lower()}Roads = {json.dumps(region_geojson, indent=2)};"
        js_file = os.path.join(output_dir, f'{safe_name}_roads.js')

        with open(js_file, 'w', encoding='utf-8') as f:
            f.write(js_content)

        # Calculate file sizes
        geojson_size = os.path.getsize(geojson_file) / (1024 * 1024)
        js_size = os.path.getsize(js_file) / (1024 * 1024)

        region_stats.append({
            'region': region_name,
            'roads': len(roads),
            'geojson_size': geojson_size,
            'js_size': js_size
        })

        print(f"  ✓ {region_name}: {len(roads):,} roads ({js_size:.2f} MB)")

# Print summary
print("\n" + "="*60)
print("PROCESSING COMPLETE - SUMMARY")
print("="*60)

region_stats.sort(key=lambda x: x['roads'], reverse=True)

print(f"\nTotal Regions: {len(region_stats)}")
print(f"\nTop 10 Regions by Road Count:")
for i, stat in enumerate(region_stats[:10], 1):
    print(f"  {i:2}. {stat['region']:<25} {stat['roads']:>6,} roads ({stat['js_size']:>6.2f} MB)")

total_size = sum(s['js_size'] for s in region_stats)
print(f"\nTotal file size (all regions): {total_size:.2f} MB")
print(f"Original file size: 610.00 MB")
print(f"Size reduction: {(1 - total_size/610)*100:.1f}%")

print(f"\n✓ All files saved to '{output_dir}/' directory")
print("\nFiles created per region:")
print("  • [RegionName]_roads.geojson - GeoJSON format")
print("  • [RegionName]_roads.js - JavaScript format for dashboard")
