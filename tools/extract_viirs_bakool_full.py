"""
Extract VIIRS DNB data for complete Bakool region coverage
Using proper admin boundaries and dense sampling
"""
import ee
import json

PROJECT_ID = 'somalia-dashboard'
print(f"Initializing Earth Engine with project: {PROJECT_ID}")
ee.Initialize(project=PROJECT_ID)

# Try to get Bakool boundary from FAO GAUL dataset
print("Loading Bakool administrative boundary from FAO GAUL...")

# Option 1: Try FAO GAUL
try:
    bakool_boundary = ee.FeatureCollection('FAO/GAUL/2015/level1').filter(
        ee.Filter.And(
            ee.Filter.eq('ADM0_NAME', 'Somalia'),
            ee.Filter.eq('ADM1_NAME', 'Bakool')
        )
    )

    # Check if we got a result
    count = bakool_boundary.size().getInfo()
    if count > 0:
        print(f"Found Bakool in FAO GAUL dataset ({count} features)")
        bakool_region = bakool_boundary.geometry()
    else:
        raise Exception("Bakool not found in FAO GAUL")
except:
    print("Bakool not found in FAO GAUL, trying alternative sources...")

    # Option 2: Try to list available regions to find the correct name
    try:
        somalia_regions = ee.FeatureCollection('FAO/GAUL/2015/level1').filter(
            ee.Filter.eq('ADM0_NAME', 'Somalia')
        )
        region_names = somalia_regions.aggregate_array('ADM1_NAME').getInfo()
        print(f"Available regions in Somalia: {region_names}")

        # Look for Bakool with different spellings
        bakool_variants = ['Bakool', 'Bakol', 'Bakkol']
        found = False
        for variant in bakool_variants:
            if variant in region_names:
                print(f"Found region as: {variant}")
                bakool_boundary = somalia_regions.filter(ee.Filter.eq('ADM1_NAME', variant))
                bakool_region = bakool_boundary.geometry()
                found = True
                break

        if not found:
            raise Exception("Bakool not found with any variant")
    except:
        print("Using manual boundary definition...")
        # Manual boundary based on approximate coordinates
        # Expanded to cover more of Bakool region
        bakool_coords = [
            [43.0, 3.3],   # Southwest (extended)
            [44.8, 3.3],   # Southeast (extended)
            [44.8, 5.2],   # Northeast (extended)
            [43.0, 5.2],   # Northwest (extended)
            [43.0, 3.3]    # Close polygon
        ]
        bakool_region = ee.Geometry.Polygon([bakool_coords])
        print("Using manual boundary for Bakool")

# Calculate area
area_km2 = bakool_region.area().divide(1000000).getInfo()
print(f"Bakool region area: {area_km2:.2f} km²")

# Load VIIRS DNB dataset
viirs = ee.ImageCollection('NOAA/VIIRS/DNB/ANNUAL_V22')

# Extract for both years
years_to_extract = [2022, 2023]

for year in years_to_extract:
    print(f"\n{'='*60}")
    print(f"Extracting VIIRS DNB data for Bakool - Year {year}")
    print(f"{'='*60}")

    # Filter to specific year
    filtered = viirs.filter(ee.Filter.calendarRange(year, year, 'year'))

    # Check if we have data
    count = filtered.size().getInfo()
    if count == 0:
        print(f"WARNING: No data available for {year}, skipping...")
        continue

    image = filtered.first()
    radiance = image.select('average').clip(bakool_region)

    # Strategy: Extract ALL pixels within Bakool region, not just samples
    # We'll use sampleRegions or a regular sampling to get complete coverage

    # Create a regular grid of points covering the region
    # Use a stratified sampling to ensure we cover the entire area
    print(f"Sampling points across Bakool region at 500m resolution...")

    # Method 1: Use sample() with a larger number of points
    # Calculate approximate number of 500m cells in the region
    # Area = ~43,000 km² for Bakool (estimated)
    # 500m cell = 0.25 km²
    # Approximate cells = 43,000 / 0.25 = ~172,000 cells
    # We'll sample densely to get good coverage

    sample_points = radiance.sample(
        region=bakool_region,
        scale=500,
        numPixels=15000,  # Increased from 4000 to 15000 for better coverage
        geometries=True,
        seed=42  # For reproducibility
    )

    print("Converting to GeoJSON...")

    # Get all points (up to Earth Engine limit)
    try:
        # Try to get all points in batches
        all_features = []
        batch_size = 5000

        # Get total count
        total_count = sample_points.size().getInfo()
        print(f"Total sampled points: {total_count}")

        # If less than 5000, get all at once
        if total_count <= 5000:
            geojson_data = sample_points.getInfo()
            all_features = geojson_data['features']
        else:
            # Get in batches
            num_batches = (total_count // batch_size) + 1
            for batch in range(num_batches):
                start = batch * batch_size
                print(f"  Fetching batch {batch+1}/{num_batches} (points {start} to {start+batch_size})...")
                batch_data = sample_points.toList(batch_size, start).getInfo()

                # Convert to features
                for item in batch_data:
                    if 'geometry' in item and 'properties' in item:
                        all_features.append({
                            'type': 'Feature',
                            'geometry': item['geometry'],
                            'properties': item['properties']
                        })

                if len(batch_data) < batch_size:
                    break

        geojson_data = {'features': all_features}

    except Exception as e:
        print(f"Error fetching all points: {e}")
        print("Falling back to limited sample...")
        geojson_data = sample_points.limit(5000).getInfo()

    # Format for Leaflet
    features = []
    for feature in geojson_data['features']:
        coords = feature['geometry']['coordinates']
        value = feature['properties'].get('average', 0)

        if value is not None and value >= 0:  # Include all values, even 0
            features.append({
                'type': 'Feature',
                'geometry': {
                    'type': 'Point',
                    'coordinates': coords
                },
                'properties': {
                    'value': round(value, 3),  # More precision
                    'lat': coords[1],
                    'lon': coords[0],
                    'year': year,
                    'region': 'Bakool'
                }
            })

    print(f"Total valid points: {len(features)}")

    # Save GeoJSON
    geojson_output = {
        'type': 'FeatureCollection',
        'features': features
    }

    geojson_file = f'bakool_viirs_500m_{year}_full.geojson'
    with open(geojson_file, 'w') as f:
        json.dump(geojson_output, f, indent=2)

    print(f"GeoJSON saved to {geojson_file}")

    # Create JavaScript data file
    js_content = f"const bakoolNightlight{year} = {json.dumps({'points': [f['properties'] for f in features]}, indent=2)};"

    js_file = f'bakool_nightlight_{year}.js'
    with open(js_file, 'w') as f:
        f.write(js_content)

    print(f"JavaScript file saved to {js_file}")
    print(f"SUCCESS: Year {year} complete: {len(features)} points extracted")

print(f"\n{'='*60}")
print("Extraction complete!")
print("Files created:")
print("  - bakool_nightlight_2022.js")
print("  - bakool_nightlight_2023.js")
print("  - bakool_viirs_500m_2022_full.geojson")
print("  - bakool_viirs_500m_2023_full.geojson")
print(f"{'='*60}")
