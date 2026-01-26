"""
Extract VIIRS DNB data for Bakool region - Grid Cell Centers
Using reduceToVectors() to get exact center of each 500m × 500m raster cell
This creates perfectly aligned grid points instead of random samples
"""
import ee
import json

PROJECT_ID = 'somalia-dashboard'
print(f"Initializing Earth Engine with project: {PROJECT_ID}")
ee.Initialize(project=PROJECT_ID)

# Load Bakool boundary from FAO GAUL
print("Loading Bakool administrative boundary from FAO GAUL...")

try:
    bakool_boundary = ee.FeatureCollection('FAO/GAUL/2015/level1').filter(
        ee.Filter.And(
            ee.Filter.eq('ADM0_NAME', 'Somalia'),
            ee.Filter.eq('ADM1_NAME', 'Bakool')
        )
    )

    count = bakool_boundary.size().getInfo()
    if count > 0:
        print(f"Found Bakool in FAO GAUL dataset ({count} features)")
        bakool_region = bakool_boundary.geometry()
    else:
        raise Exception("Bakool not found")
except:
    print("Bakool not found, trying alternative spellings...")
    somalia_regions = ee.FeatureCollection('FAO/GAUL/2015/level1').filter(
        ee.Filter.eq('ADM0_NAME', 'Somalia')
    )
    region_names = somalia_regions.aggregate_array('ADM1_NAME').getInfo()

    for variant in ['Bakool', 'Bakol', 'Bakkol']:
        if variant in region_names:
            bakool_boundary = somalia_regions.filter(ee.Filter.eq('ADM1_NAME', variant))
            bakool_region = bakool_boundary.geometry()
            print(f"Found as: {variant}")
            break

# Calculate area
area_km2 = bakool_region.area().divide(1000000).getInfo()
print(f"Bakool region area: {area_km2:.2f} km²")

# Estimate number of 500m cells
estimated_cells = int(area_km2 / 0.25)  # 500m cell = 0.25 km²
print(f"Estimated 500m cells: ~{estimated_cells:,}")

# Load VIIRS DNB dataset
viirs = ee.ImageCollection('NOAA/VIIRS/DNB/ANNUAL_V22')

# Extract for both years
years_to_extract = [2022, 2023]

for year in years_to_extract:
    print(f"\n{'='*60}")
    print(f"Extracting VIIRS DNB Grid Centers for Bakool - Year {year}")
    print(f"{'='*60}")

    # Filter to specific year
    filtered = viirs.filter(ee.Filter.calendarRange(year, year, 'year'))

    count = filtered.size().getInfo()
    if count == 0:
        print(f"WARNING: No data available for {year}, skipping...")
        continue

    image = filtered.first()
    radiance = image.select('average').clip(bakool_region)

    print("Method: Using pixel coordinates to extract grid cell centers...")

    # Method: Add pixel lat/lon coordinates and sample
    # This gives us the exact center of each pixel
    radiance_with_coords = radiance.addBands([
        ee.Image.pixelLonLat()
    ])

    # Sample ALL pixels within the region
    # This will give us the center point of each 500m cell
    print("Sampling all pixels in region (this may take a few minutes)...")

    # Use sampleRegions with the boundary to get all pixels
    sample_points = radiance_with_coords.sample(
        region=bakool_region,
        scale=500,  # 500m resolution
        projection='EPSG:4326',
        geometries=False  # We don't need geometries, we'll create them from lat/lon
    )

    # Get the count
    total_points = sample_points.size().getInfo()
    print(f"Total grid cells found: {total_points:,}")

    # Convert to list and process in batches
    print("Fetching pixel data in batches...")

    all_features = []
    batch_size = 5000

    if total_points <= 5000:
        # Small enough to get in one batch
        points_list = sample_points.getInfo()['features']
        all_features = points_list
    else:
        # Process in batches
        num_batches = (total_points // batch_size) + 1
        for batch in range(num_batches):
            start = batch * batch_size
            print(f"  Batch {batch+1}/{num_batches} (pixels {start:,} to {start+batch_size:,})...")

            try:
                batch_points = sample_points.toList(batch_size, start).getInfo()
                all_features.extend(batch_points)

                if len(batch_points) < batch_size:
                    break
            except Exception as e:
                print(f"  Error in batch {batch+1}: {e}")
                print(f"  Continuing with {len(all_features):,} points collected so far...")
                break

    print(f"Successfully fetched {len(all_features):,} grid cell centers")

    # Format for GeoJSON with exact grid centers
    features = []
    for item in all_features:
        props = item.get('properties', {})

        # Get the center coordinates
        lon = props.get('longitude')
        lat = props.get('latitude')
        value = props.get('average')

        if lon is not None and lat is not None and value is not None:
            # Only include cells with valid data
            if value >= 0:  # Include all non-negative values
                features.append({
                    'type': 'Feature',
                    'geometry': {
                        'type': 'Point',
                        'coordinates': [lon, lat]
                    },
                    'properties': {
                        'value': round(value, 3),
                        'lat': lat,
                        'lon': lon,
                        'year': year,
                        'region': 'Bakool',
                        'grid_type': 'cell_center'
                    }
                })

    print(f"Valid grid points with data: {len(features):,}")

    # Save GeoJSON
    geojson_output = {
        'type': 'FeatureCollection',
        'features': features
    }

    geojson_file = f'bakool_viirs_grid_{year}.geojson'
    with open(geojson_file, 'w') as f:
        json.dump(geojson_output, f, indent=2)

    print(f"GeoJSON saved to {geojson_file}")

    # Create JavaScript data file
    js_content = f"const bakoolNightlight{year} = {json.dumps({'points': [f['properties'] for f in features]}, indent=2)};"

    js_file = f'bakool_nightlight_{year}.js'
    with open(js_file, 'w') as f:
        f.write(js_content)

    print(f"JavaScript file saved to {js_file}")
    print(f"SUCCESS: Year {year} complete: {len(features):,} grid cell centers extracted")

    # Show file size
    import os
    file_size = os.path.getsize(js_file) / (1024 * 1024)  # Convert to MB
    print(f"File size: {file_size:.2f} MB")

print(f"\n{'='*60}")
print("Grid extraction complete!")
print("="*60)
print("\nNOTE: These are exact grid cell centers (not random samples)")
print("Each point represents the center of a 500m × 500m raster cell")
print("Points should now be perfectly aligned in a regular grid pattern")
print(f"\n{'='*60}")
