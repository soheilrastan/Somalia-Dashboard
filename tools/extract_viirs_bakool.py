"""
Extract VIIRS DNB Annual Median Radiance for Bakool Region, Somalia (2012-2024)
Data Source: NOAA/VIIRS/DNB/ANNUAL_V22
https://developers.google.com/earth-engine/datasets/catalog/NOAA_VIIRS_DNB_ANNUAL_V22
"""

import ee
import json
import geojson

# Initialize Earth Engine
# Google Earth Engine requires a Google Cloud Project
# To create a project:
# 1. Go to: https://console.cloud.google.com/
# 2. Click "Select a project" → "NEW PROJECT"
# 3. Enter a project name (e.g., "ee-somalia-dashboard")
# 4. Click "Create"
# 5. Copy the Project ID and paste it below

# OPTION 1: Set your project ID here
PROJECT_ID = 'somalia-dashboard'  # Replace with your actual project ID

# OPTION 2: Or use an environment variable
import os
if not PROJECT_ID:
    PROJECT_ID = os.environ.get('EARTHENGINE_PROJECT', None)

if not PROJECT_ID:
    print("\n" + "="*60)
    print("ERROR: No Google Cloud Project ID specified!")
    print("="*60)
    print("\nTo use Google Earth Engine, you need a Google Cloud Project.")
    print("\nSteps to create a project:")
    print("1. Visit: https://console.cloud.google.com/")
    print("2. Click 'Select a project' → 'NEW PROJECT'")
    print("3. Enter project name: 'ee-somalia-dashboard'")
    print("4. Click 'Create'")
    print("5. Copy the Project ID")
    print("6. Edit this script and set PROJECT_ID = 'your-project-id'")
    print("\nNote: Earth Engine is free for research and education!")
    print("="*60 + "\n")
    exit(1)

print(f"Initializing Earth Engine with project: {PROJECT_ID}")
ee.Initialize(project=PROJECT_ID)

# Define Bakool region boundary
# Based on the centroid from script.js: [4.205215058488971, 43.950761230419076]
# We'll create a simple polygon boundary for Bakool region
# You can replace this with actual boundary coordinates if you have them

# Option 1: Load from FAO GAUL dataset (Global Administrative Unit Layers)
# This is a common source for administrative boundaries in Earth Engine
somalia = ee.FeatureCollection('FAO/GAUL/2015/level1').filter(
    ee.Filter.And(
        ee.Filter.eq('ADM0_NAME', 'Somalia'),
        ee.Filter.eq('ADM1_NAME', 'Bakool')
    )
)

# Option 2: If FAO GAUL doesn't have Bakool, try alternative boundary sources
# Uncomment below if Option 1 doesn't work:
# somalia_all = ee.FeatureCollection('FAO/GAUL/2015/level1').filter(
#     ee.Filter.eq('ADM0_NAME', 'Somalia')
# )
# print("Available regions:", somalia_all.aggregate_array('ADM1_NAME').getInfo())

# Alternative: Manual boundary creation based on approximate coordinates
# This is a rough approximation - replace with actual boundary if available
bakool_coords = [
    [43.0, 3.5],   # Southwest
    [44.5, 3.5],   # Southeast
    [44.5, 5.0],   # Northeast
    [43.0, 5.0],   # Northwest
    [43.0, 3.5]    # Close polygon
]
bakool_manual = ee.Geometry.Polygon([bakool_coords])

# Choose which boundary to use (comment/uncomment as needed)
# bakool_region = somalia  # Use if FAO GAUL has Bakool
bakool_region = bakool_manual  # Use manual boundary

# Load VIIRS DNB dataset
viirs = ee.ImageCollection('NOAA/VIIRS/DNB/ANNUAL_V22')

# Years available in the dataset (2014-2023 based on GEE catalog)
# Note: The dataset starts from 2014, not 2012
years = list(range(2014, 2024))  # 2014 to 2023

print("Extracting VIIRS DNB data for Bakool region...")
print(f"Years: {years[0]} to {years[-1]}")

# Extract annual median values
results = []

for year in years:
    print(f"Processing year {year}...")

    # Filter to specific year
    filtered = viirs.filter(ee.Filter.calendarRange(year, year, 'year'))

    # Check if we have data for this year
    count = filtered.size().getInfo()
    if count == 0:
        print(f"  WARNING: No data available for {year}, skipping...")
        continue

    image = filtered.first()

    # Select the average band (annual average radiance in nanoWatts/cm²/sr)
    # Available bands: average, average_masked, cf_cvg, cvg, maximum, median, median_masked, minimum
    radiance = image.select('average')  # or use 'median' for median values

    # Clip to Bakool region
    clipped = radiance.clip(bakool_region)

    # Get statistics for the region
    stats = clipped.reduceRegion(
        reducer=ee.Reducer.mean().combine(
            reducer2=ee.Reducer.median(),
            sharedInputs=True
        ).combine(
            reducer2=ee.Reducer.min(),
            sharedInputs=True
        ).combine(
            reducer2=ee.Reducer.max(),
            sharedInputs=True
        ).combine(
            reducer2=ee.Reducer.stdDev(),
            sharedInputs=True
        ),
        geometry=bakool_region,
        scale=500,  # 500m resolution
        maxPixels=1e9
    )

    # Get the stats
    stats_dict = stats.getInfo()

    result = {
        'year': year,
        'mean_radiance': stats_dict.get('average_mean'),
        'median_radiance': stats_dict.get('average_median'),
        'min_radiance': stats_dict.get('average_min'),
        'max_radiance': stats_dict.get('average_max'),
        'std_radiance': stats_dict.get('average_stdDev'),
        'unit': 'nanoWatts/cm²/sr'
    }

    results.append(result)
    print(f"Year {year}: Mean={result['mean_radiance']:.4f}, Median={result['median_radiance']:.4f}")

# Save results to JSON
output_file = 'bakool_viirs_annual_2014_2023.json'
with open(output_file, 'w') as f:
    json.dump({
        'region': 'Bakool',
        'country': 'Somalia',
        'dataset': 'NOAA/VIIRS/DNB/ANNUAL_V22',
        'band': 'avg_rad',
        'unit': 'nanoWatts/cm²/sr',
        'years': results
    }, f, indent=2)

print(f"\nResults saved to {output_file}")

# Optional: Extract detailed 500m grid points with values
# This will create a GeoJSON with point features for visualization
print("\nExtracting detailed 500m grid points...")

# Sample points from the most recent year (2023)
latest_year = 2023
latest_filtered = viirs.filter(ee.Filter.calendarRange(latest_year, latest_year, 'year'))
if latest_filtered.size().getInfo() == 0:
    print(f"No data available for {latest_year}, trying 2022...")
    latest_year = 2022
    latest_filtered = viirs.filter(ee.Filter.calendarRange(latest_year, latest_year, 'year'))

latest_image = latest_filtered.first()
latest_radiance = latest_image.select('average').clip(bakool_region)

# Convert to points - sample at 500m resolution
# Limit to 4000 points to avoid the 5000 element query limit
sample_points = latest_radiance.sample(
    region=bakool_region,
    scale=500,
    numPixels=4000,  # Limit to 4000 points to stay under GEE limit
    geometries=True
)

# Convert to GeoJSON (limit to first 4000 features)
geojson_data = sample_points.limit(4000).getInfo()

# Format for Leaflet
features = []
for feature in geojson_data['features']:
    coords = feature['geometry']['coordinates']
    value = feature['properties'].get('average', 0)

    if value is not None and value > 0:  # Only include cells with light
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
                'year': latest_year,
                'region': 'Bakool'
            }
        })

# Save GeoJSON
geojson_output = {
    'type': 'FeatureCollection',
    'features': features
}

geojson_file = 'bakool_viirs_500m_2023.geojson'
with open(geojson_file, 'w') as f:
    json.dump(geojson_output, f, indent=2)

print(f"GeoJSON saved to {geojson_file}")
print(f"  Total points: {len(features)}")

# Create JavaScript data file for direct use in the dashboard
js_content = f"const bakoolNightlightDetailed = {json.dumps({'points': [f['properties'] for f in features]}, indent=2)};"

js_file = 'bakool_nightlight_detailed.js'
with open(js_file, 'w') as f:
    f.write(js_content)

print(f"JavaScript file saved to {js_file}")
print("\nDone! You can now use this data in your dashboard.")
print("\nNote: VIIRS data is available from 2014-2023, not 2012-2024 as requested.")
print("      The dataset starts in 2014 (first full year of VIIRS operation).")
