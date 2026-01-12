# OSM Roads Auto-Update Feature

This dashboard includes an automatic background update system for OpenStreetMap roads data from HDX.

## How It Works

1. **One-Time Setup**: Start a local update server
2. **Click Button**: Click "🔄 Update Roads from HDX API" in the dashboard
3. **Watch Progress**: Monitor real-time progress with live status updates
4. **Done**: All 18 regional road files are automatically updated

## Setup Instructions

### Step 1: Install Dependencies

Open a terminal and run:

```bash
pip install flask flask-cors
```

### Step 2: Start the Update Server

In your project directory, run:

```bash
python update_server.py
```

You should see:

```
======================================================================
  Somalia Dashboard - OSM Roads Update Server
======================================================================

✓ Server starting on http://localhost:5000
✓ Dashboard can now trigger automatic updates

Keep this terminal open while using the dashboard.
Press Ctrl+C to stop the server.

======================================================================
```

**Important**: Keep this terminal window open while using the dashboard.

### Step 3: Use the Dashboard

1. Open your dashboard in a browser
2. Click the "🔄 Update Roads from HDX API" button in the Layers panel
3. Watch the progress bar as the update runs in the background

## What Happens During Update

The system automatically:

1. **Downloads** latest roads from HDX API (`hotosm_som_roads_lines_geojson.zip`)
2. **Extracts** the GeoJSON data from the archive
3. **Splits** roads by all 18 Somalia regions using spatial intersection
4. **Optimizes** file sizes by reducing coordinate precision to 6 decimals
5. **Saves** both `.geojson` and `.js` files for each region

## Features

- **Real-time Progress Bar**: Shows current operation and percentage
- **Live Status Updates**: Updates every second from the backend
- **Step-by-Step Indicators**: See which step is currently running
- **Error Handling**: Clear error messages if something goes wrong
- **Cancellable**: Stop the update at any time

## File Size Optimization

The update process automatically optimizes files using techniques learned from previous optimization work:

- Coordinate precision: 6 decimals (~11 cm accuracy)
- JSON minification: No whitespace
- Result: ~74% file size reduction

## Technical Details

### Architecture

```
Dashboard (Browser)  →  HTTP API  →  Update Server (Python)
     script.js       →  localhost:5000  →  update_server.py
                                              ↓
                                         update_osm_roads.py
                                              ↓
                                         HDX API
```

### API Endpoints

- `GET /api/health` - Check if server is running
- `POST /api/update-roads` - Trigger update process
- `GET /api/update-status` - Get current progress

### Files Updated

After a successful update, these files will be modified:

```
roads_by_region/
  ├── Awdal_roads.geojson
  ├── Awdal_roads.js
  ├── Bakool_roads.geojson
  ├── Bakool_roads.js
  ├── ... (18 regions × 2 formats = 36 files)
```

## Troubleshooting

### Server Not Running

If you see "Update Server Required" modal:

1. Make sure you ran `pip install flask flask-cors`
2. Start the server with `python update_server.py`
3. Check that port 5000 is not in use by another application

### Update Fails

If the update fails:

1. Check your internet connection (downloads from HDX)
2. Ensure you have write permissions in the project directory
3. Check the server terminal for detailed error messages
4. Try running `python update_osm_roads.py` directly to see full logs

### Port 5000 Already in Use

If port 5000 is occupied, you can change it:

1. Edit `update_server.py`, line 86: `app.run(host='localhost', port=5000, ...)`
2. Change `5000` to another port (e.g., `5001`)
3. Edit `script.js`, lines 3962 and 3972: change `localhost:5000` to your new port
4. Restart the server

## Manual Update (Without Server)

If you prefer not to run the server, you can still update manually:

```bash
python update_osm_roads.py
```

This runs the same update process but without the dashboard integration.

## Production Deployment

For production deployment on GitHub Pages or other static hosts:

1. Run updates locally: `python update_osm_roads.py`
2. Commit updated files: `git add roads_by_region/ && git commit -m "Update OSM roads"`
3. Push to GitHub: `git push`
4. GitHub Pages will automatically rebuild with new data

**Note**: The auto-update button only works locally. For production, use the manual process above.

## Future Enhancements

Possible improvements:

- Scheduled automatic updates (daily/weekly)
- GitHub Actions integration for automated updates
- Cloud-hosted update service
- Email notifications when updates complete
- Diff viewer to see what changed

---

**Questions?** Check the main README or open an issue on GitHub.
