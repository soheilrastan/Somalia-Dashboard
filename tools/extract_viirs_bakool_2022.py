"""
Extract VIIRS DNB data for Bakool - Year 2022 only
"""
import ee
import json

PROJECT_ID = 'somalia-dashboard'
print(f"Initializing Earth Engine with project: {PROJECT_ID}")
ee.Initialize(project=PROJECT_ID)

# Define Bakool region boundary
bakool_coords = [
    [43.0, 3.5],   # Southwest
    [44.5, 3.5],   # Southeast
    [44.5, 5.0],   # Northeast
    [43.0, 5.0],   # Northwest
    [43.0, 3.5]    # Close polygon
]
bakool_region = ee.Geometry.Polygon([bakool_coords])

# Load VIIRS DNB dataset
viirs = ee.ImageCollection('NOAA/VIIRS/DNB/ANNUAL_V22')

print("Extracting VIIRS DNB data for Bakool region - Year 2022...")

# Filter to 2022
year = 2022
filtered = viirs.filter(ee.Filter.calendarRange(year, year, 'year'))
image = filtered.first()
radiance = image.select('average').clip(bakool_region)

# Sample points at 500m resolution
sample_points = radiance.sample(
    region=bakool_region,
    scale=500,
    numPixels=4000,
    geometries=True
)

# Convert to GeoJSON
geojson_data = sample_points.limit(4000).getInfo()

# Format for Leaflet
features = []
for feature in geojson_data['features']:
    coords = feature['geometry']['coordinates']
    value = feature['properties'].get('average', 0)

    if value is not None and value > 0:
        features.append({
            'type': 'Feature',
            'geometry': {
                'type': 'Point',
                'coordinates': coords
            },
            'properties': {
                'value': round(value, 2),
                'lat': coords[1],
                'lon': coords[0],
                'year': year,
                'region': 'Bakool'
            }
        })

# Create JavaScript data file
js_content = f"const bakoolNightlight2022 = {json.dumps({'points': [f['properties'] for f in features]}, indent=2)};"

js_file = 'bakool_nightlight_2022.js'
with open(js_file, 'w') as f:
    f.write(js_content)

print(f"JavaScript file saved to {js_file}")
print(f"Total points for 2022: {len(features)}")
