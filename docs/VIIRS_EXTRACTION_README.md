# VIIRS DNB Nighttime Light Extraction for Bakool Region

This guide explains how to extract annual median nighttime light (DNB radiance) values for the Bakool region of Somalia from Google Earth Engine.

## Dataset Information

- **Dataset**: NOAA/VIIRS/DNB/ANNUAL_V22
- **Source**: [Google Earth Engine Catalog](https://developers.google.com/earth-engine/datasets/catalog/NOAA_VIIRS_DNB_ANNUAL_V22)
- **Band**: `avg_rad` (annual median radiance)
- **Unit**: nanoWatts/cm²/sr
- **Resolution**: 500m × 500m
- **Temporal Coverage**: 2014-2023 (VIIRS data starts in 2014, not 2012)

## Setup Instructions

### 1. Install Python Dependencies

```bash
pip install -r requirements.txt
```

### 2. Authenticate with Google Earth Engine

You need a Google Earth Engine account. Sign up at [https://earthengine.google.com/](https://earthengine.google.com/)

Then authenticate:

```bash
earthengine authenticate
```

This will open a browser window to authorize access. Follow the instructions.

### 3. Run the Extraction Script

```bash
python extract_viirs_bakool.py
```

## Output Files

The script generates three files:

### 1. `bakool_viirs_annual_2014_2023.json`
Annual statistics (mean, median, min, max, standard deviation) for each year from 2014 to 2023.

Example structure:
```json
{
  "region": "Bakool",
  "country": "Somalia",
  "dataset": "NOAA/VIIRS/DNB/ANNUAL_V22",
  "years": [
    {
      "year": 2014,
      "mean_radiance": 1.234,
      "median_radiance": 0.876,
      "min_radiance": 0.001,
      "max_radiance": 15.678,
      "unit": "nanoWatts/cm²/sr"
    }
  ]
}
```

### 2. `bakool_viirs_500m_2023.geojson`
GeoJSON file with 500m grid points for the most recent year (2023). Contains up to 10,000 sample points with radiance values > 0.

### 3. `bakool_nightlight_detailed.js`
JavaScript data file ready to be included in the dashboard, formatted like the existing `nightlightData` variable.

## Using the Data in the Dashboard

### Option 1: Add to HTML
Add the JavaScript file to your HTML:

```html
<script src="bakool_nightlight_detailed.js"></script>
```

### Option 2: Update script.js
Add the layer toggle functionality in `script.js` (around line 291):

```javascript
// Add detailed nightlight for Bakool
bakoolNightlightDetailed.points.forEach((point) => {
    const color = getNightlightColor(point.value);
    const radius = getNightlightRadius(point.value);

    const marker = L.circleMarker([point.lat, point.lon], {
        radius: radius,
        fillColor: color,
        color: color,
        weight: 1,
        opacity: 0.8,
        fillOpacity: 0.7
    });

    marker.bindTooltip(`${point.value.toFixed(2)} nW`, {
        permanent: false,
        direction: 'top',
        offset: [0, -5]
    });

    marker.addTo(detailedNLBakool);
});
```

### Option 3: Enable the Layer Control
Update the layer control checkbox in `script.js` (line 675) from disabled to enabled:

```javascript
<label style="font-size: 0.85em;"><input type="checkbox" id="bakoolDetailedToggle">
Bakool (500m)</label>
```

Then add the toggle event listener:

```javascript
document.getElementById('bakoolDetailedToggle').addEventListener('change', function(e) {
    e.target.checked ? map.addLayer(detailedNLBakool) : map.removeLayer(detailedNLBakool);
});
```

## Important Notes

1. **Year Range**: The VIIRS DNB dataset starts in 2014, not 2012. The first Suomi-NPP VIIRS satellite was launched in October 2011, but the first full year of data is 2014.

2. **Boundary Accuracy**: The script uses an approximate boundary for Bakool. For more accurate results, you can:
   - Replace the `bakool_coords` with actual boundary coordinates
   - Use a shapefile and upload it to Earth Engine
   - Use Somalia administrative boundaries from Earth Engine's catalog

3. **Data Volume**: The script limits sampling to 10,000 points to keep file sizes manageable. You can adjust the `numPixels` parameter for more/fewer points.

4. **Processing Time**: Extraction may take 5-15 minutes depending on Google Earth Engine's server load.

5. **Rate Limits**: Google Earth Engine has usage quotas. If you hit limits, wait and try again later.

## Customization

### Extract All Years as Detailed Points
To extract 500m grid points for all years (not just 2023), modify the script to loop through all years:

```python
for year in years:
    image = viirs.filter(ee.Filter.calendarRange(year, year, 'year')).first()
    # ... rest of sampling code
```

### Use Actual Bakool Boundary
If you have a shapefile or GeoJSON of Bakool's boundary:

```python
# Upload to Earth Engine Asset or use geemap
import geemap
bakool_boundary = geemap.geojson_to_ee('path/to/bakool.geojson')
bakool_region = bakool_boundary
```

## Troubleshooting

**Error: "User memory limit exceeded"**
- Reduce `numPixels` parameter
- Increase `scale` parameter (e.g., from 500 to 1000)

**Error: "No features found"**
- Check that the boundary coordinates are correct
- Verify the region name matches Earth Engine's dataset

**Error: "Authentication failed"**
- Run `earthengine authenticate` again
- Make sure you're signed up for Google Earth Engine

## Data Citation

When using this data, please cite:

> NOAA. (2014-2023). VIIRS Day/Night Band Annual Median Radiance. Google Earth Engine. https://developers.google.com/earth-engine/datasets/catalog/NOAA_VIIRS_DNB_ANNUAL_V22

## Contact

For issues or questions about the extraction script, please refer to the Google Earth Engine documentation:
- [GEE Python API Guide](https://developers.google.com/earth-engine/guides/python_install)
- [VIIRS DNB Dataset](https://developers.google.com/earth-engine/datasets/catalog/NOAA_VIIRS_DNB_ANNUAL_V22)
