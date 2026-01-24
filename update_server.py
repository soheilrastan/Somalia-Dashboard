#!/usr/bin/env python3
"""
Simple Flask server to handle OSM roads updates from the dashboard
Run this server alongside your dashboard to enable automatic updates
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
import threading
import subprocess
import os
import sys

app = Flask(__name__)
CORS(app)  # Enable CORS for dashboard requests

# Track update status
update_status = {
    'running': False,
    'progress': 0,
    'message': 'Ready',
    'error': None
}

# Track download progress (for version downloads)
download_status = {
    'running': False,
    'progress': 0,
    'step': '',
    'message': 'Ready',
    'error': None,
    'bytes_downloaded': 0,
    'total_bytes': 0
}

def run_update_script():
    """Run the update_osm_roads.py script in background with live progress"""
    global update_status

    try:
        update_status['running'] = True
        update_status['progress'] = 0
        update_status['message'] = 'Starting update...'
        update_status['error'] = None

        # Run the update script
        script_path = os.path.join(os.path.dirname(__file__), 'update_osm_roads.py')

        # Execute the script with real-time output streaming (unbuffered)
        process = subprocess.Popen(
            [sys.executable, '-u', script_path],  # -u flag for unbuffered output
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            cwd=os.path.dirname(__file__),
            bufsize=0,  # Unbuffered
            universal_newlines=True
        )

        # Read output line by line and update progress
        for line in process.stdout:
            line = line.strip()

            # Parse progress from different steps
            if '[1/6]' in line or 'Fetching latest dataset' in line:
                update_status['progress'] = 15
                update_status['message'] = 'Fetching latest dataset from HDX...'
            elif '[2/6]' in line or 'Downloading' in line:
                update_status['progress'] = 25
                update_status['message'] = 'Downloading roads file...'
            elif 'Progress:' in line:
                # Parse download progress
                try:
                    percent = line.split('Progress:')[1].split('%')[0].strip()
                    download_percent = float(percent)
                    # Map download progress (0-100) to overall progress (25-45)
                    update_status['progress'] = int(25 + (download_percent * 0.20))
                except:
                    pass
            elif '[3/6]' in line or 'Extracting' in line:
                update_status['progress'] = 50
                update_status['message'] = 'Extracting GeoJSON data...'
            elif '[4/6]' in line or 'Loading region boundaries' in line:
                update_status['progress'] = 60
                update_status['message'] = 'Loading region boundaries...'
            elif '[5/6]' in line or 'Splitting roads by region' in line:
                update_status['progress'] = 65
                update_status['message'] = 'Splitting roads by 18 regions...'
            elif 'Assigning roads to regions' in line:
                update_status['progress'] = 70
                update_status['message'] = 'Processing road assignments...'
            elif 'Processed:' in line:
                # Parse processing progress
                try:
                    parts = line.split('/')
                    if len(parts) >= 2:
                        current = int(parts[0].split(':')[-1].strip().replace(',', ''))
                        total = int(parts[1].strip().replace(',', ''))
                        if total > 0:
                            process_percent = (current / total) * 100
                            # Map processing (0-100) to overall progress (70-85)
                            update_status['progress'] = int(70 + (process_percent * 0.15))
                except:
                    pass
            elif 'Saving regional files' in line:
                update_status['progress'] = 85
                update_status['message'] = 'Saving optimized regional files (18 regions)...'
            elif '[OK]' in line and 'roads,' in line:
                # Each region saved, increment progress
                # 18 regions total, map 85% -> 94% (1 region = ~0.5%)
                if update_status['progress'] >= 85 and update_status['progress'] < 94:
                    update_status['progress'] = min(94, update_status['progress'] + 1)
                    # Extract region name for detailed message
                    try:
                        region_name = line.split('[OK]')[1].split(':')[0].strip()
                        update_status['message'] = f'Saved {region_name} region files...'
                    except:
                        pass
            elif '[6/6]' in line or 'Cleaning up' in line:
                update_status['progress'] = 95
                update_status['message'] = 'Cleaning up temporary files...'
            elif 'UPDATE COMPLETE' in line:
                update_status['progress'] = 100
                update_status['message'] = 'Files ready! All 36 regional files saved to roads_by_region_latest/'

        # Wait for process to complete
        process.wait()

        if process.returncode == 0:
            # Verify files were actually created before showing 100%
            from pathlib import Path
            output_dir = Path('roads_by_region_latest')

            if output_dir.exists():
                # Count created files
                geojson_files = list(output_dir.glob('*.geojson'))
                js_files = list(output_dir.glob('*.js'))
                total_files = len(geojson_files) + len(js_files)

                if total_files >= 36:  # 18 regions × 2 formats
                    update_status['progress'] = 100
                    update_status['message'] = f'Update complete! {total_files} files ready in roads_by_region_latest/'
                else:
                    update_status['progress'] = 99
                    update_status['message'] = f'Partial completion: {total_files}/36 files created'
            else:
                update_status['progress'] = 99
                update_status['message'] = 'Warning: Output directory not found'

            update_status['running'] = False
        else:
            stderr_output = process.stderr.read()
            update_status['error'] = stderr_output
            update_status['message'] = 'Update failed'
            update_status['running'] = False

    except Exception as e:
        update_status['error'] = str(e)
        update_status['message'] = f'Error: {str(e)}'
        update_status['running'] = False

@app.route('/api/update-roads', methods=['POST'])
def update_roads():
    """Trigger OSM roads update"""
    global update_status

    if update_status['running']:
        return jsonify({
            'success': False,
            'message': 'Update already in progress'
        }), 400

    # Start update in background thread
    thread = threading.Thread(target=run_update_script)
    thread.daemon = True
    thread.start()

    return jsonify({
        'success': True,
        'message': 'Update started'
    })

@app.route('/api/update-status', methods=['GET'])
def get_status():
    """Get current update status"""
    return jsonify(update_status)

@app.route('/api/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'ok'})

@app.route('/api/reset', methods=['POST'])
def reset_update():
    """Reset/cancel any stuck update"""
    global update_status

    update_status['running'] = False
    update_status['progress'] = 0
    update_status['message'] = 'Ready'
    update_status['error'] = None

    return jsonify({
        'success': True,
        'message': 'Update status reset successfully'
    })

@app.route('/api/check-version', methods=['GET'])
def check_version():
    """Check OSM roads version (HDX vs local) - Multi-version support"""
    try:
        # Run the check script directly to avoid any caching issues
        import subprocess
        import json

        script_code = '''
import sys
import os
print("CWD:", os.getcwd(), file=sys.stderr)
sys.path.insert(0, ".")
import check_osm_version
print("FILE:", check_osm_version.__file__, file=sys.stderr)
result = check_osm_version.check_osm_roads_version()
print("KEYS:", list(result.keys()), file=sys.stderr)
import json
print(json.dumps(result))
'''
        proc = subprocess.run(
            [sys.executable, '-c', script_code],
            capture_output=True,
            text=True,
            cwd=os.path.dirname(__file__)
        )

        if proc.returncode == 0:
            # Parse the JSON output
            result = json.loads(proc.stdout.strip().split('\n')[-1])
            print(f"[API] check-version returned keys: {list(result.keys())}", flush=True)
            return jsonify(result)
        else:
            print(f"[API] Error: {proc.stderr}", flush=True)
            return jsonify({
                'success': False,
                'error': proc.stderr,
                'message': 'Version check script failed'
            }), 500

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'message': f'Version check failed: {str(e)}'
        }), 500

def run_download_with_progress(version_date, resource_url, format_type):
    """Run download in background with progress tracking"""
    global download_status
    import requests
    from pathlib import Path
    import zipfile
    import shutil

    try:
        download_status['running'] = True
        download_status['progress'] = 0
        download_status['error'] = None

        # Sanitize date for folder name
        date_only = version_date.split('T')[0]
        folder_date = date_only.replace('-', '_')
        output_dir = Path(f'roads_by_region_{folder_date}')
        temp_dir = Path('temp_roads_download')

        # Step 1: Start download
        download_status['step'] = 'downloading'
        download_status['message'] = 'Connecting to HDX server...'
        download_status['progress'] = 5

        response = requests.get(resource_url, stream=True, timeout=300)
        response.raise_for_status()

        total_size = int(response.headers.get('content-length', 0))
        download_status['total_bytes'] = total_size

        zip_path = temp_dir / f'roads_{folder_date}.zip'
        temp_dir.mkdir(exist_ok=True)

        # Download with progress
        downloaded = 0
        with open(zip_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
                downloaded += len(chunk)
                download_status['bytes_downloaded'] = downloaded
                if total_size > 0:
                    pct = (downloaded / total_size) * 100
                    download_status['progress'] = int(5 + (pct * 0.40))  # 5-45%
                    download_status['message'] = f'Downloading: {downloaded/(1024*1024):.1f} MB / {total_size/(1024*1024):.1f} MB ({pct:.0f}%)'

        # Step 2: Extract
        download_status['step'] = 'extracting'
        download_status['progress'] = 50
        download_status['message'] = 'Extracting archive...'

        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(temp_dir)

        # Step 3: Process with geopandas
        download_status['step'] = 'processing'
        download_status['progress'] = 55
        download_status['message'] = 'Loading and processing data...'

        # Import here to avoid startup delay
        import geopandas as gpd
        import json

        if format_type.upper() in ['GEOPACKAGE', 'GPKG']:
            import pyogrio
            gpkg_files = list(temp_dir.glob('**/*.gpkg'))
            if not gpkg_files:
                raise FileNotFoundError("No .gpkg file found")

            download_status['message'] = 'Converting Geopackage to GeoJSON (this may take a few minutes)...'
            # Use pyogrio to list layers
            layers = pyogrio.list_layers(gpkg_files[0])
            layer_names = [l[0] for l in layers]  # layers is list of (name, geometry_type) tuples
            lines_layer = next((l for l in layer_names if 'lines' in l.lower() or 'road' in l.lower()), layer_names[0])
            gdf = gpd.read_file(gpkg_files[0], layer=lines_layer, engine='pyogrio')
        else:
            geojson_files = list(temp_dir.glob('**/*.geojson'))
            if not geojson_files:
                raise FileNotFoundError("No .geojson file found")
            gdf = gpd.read_file(geojson_files[0])

        download_status['progress'] = 65
        download_status['message'] = f'Loaded {len(gdf):,} road features'

        # Convert CRS if needed
        if gdf.crs and gdf.crs.to_epsg() != 4326:
            download_status['message'] = 'Converting coordinate system...'
            gdf = gdf.to_crs('EPSG:4326')

        # Step 4: Split by region
        download_status['step'] = 'splitting'
        download_status['progress'] = 70
        download_status['message'] = 'Loading region boundaries...'

        boundaries_path = Path('layers/boundaries/adm1/somalia_adm1_boundaries.geojson')
        if not boundaries_path.exists():
            raise FileNotFoundError("layers/boundaries/adm1/somalia_adm1_boundaries.geojson not found")

        regions = gpd.read_file(boundaries_path)
        output_dir.mkdir(exist_ok=True)

        total_regions = len(regions)
        for idx, region in regions.iterrows():
            region_name = region['name']
            region_name_safe = region_name.replace(' ', '_')

            progress_pct = 70 + int((idx / total_regions) * 25)  # 70-95%
            download_status['progress'] = progress_pct
            download_status['message'] = f'Processing region {idx+1}/{total_regions}: {region_name}...'

            roads_in_region = gdf[gdf.intersects(region.geometry)]

            if len(roads_in_region) > 0:
                geojson_file = output_dir / f'{region_name_safe}_roads.geojson'
                roads_in_region.to_file(geojson_file, driver='GeoJSON')

                js_file = output_dir / f'{region_name_safe}_roads.js'
                with open(geojson_file, 'r', encoding='utf-8') as f:
                    geojson_data = json.load(f)
                with open(js_file, 'w', encoding='utf-8') as f:
                    var_name = f"{region_name_safe.lower()}Roads{folder_date.replace('_', '')}"
                    f.write(f"const {var_name} = ")
                    json.dump(geojson_data, f)
                    f.write(';')

        # Step 5: Write metadata
        download_status['step'] = 'finalizing'
        download_status['progress'] = 96
        download_status['message'] = 'Writing version metadata...'

        from datetime import datetime
        version_file = output_dir / '.version.json'
        version_data = {
            'last_modified': date_only + 'T00:00:00',
            'updated_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'format': format_type,
            'source': 'HDX - Humanitarian OpenStreetMap Team',
            'url': resource_url,
            'total_features': len(gdf),
            'regions': len(regions)
        }
        with open(version_file, 'w') as f:
            json.dump(version_data, f, indent=2)

        # Cleanup
        download_status['progress'] = 98
        download_status['message'] = 'Cleaning up temporary files...'
        shutil.rmtree(temp_dir)

        # Done!
        download_status['step'] = 'complete'
        download_status['progress'] = 100
        download_status['message'] = f'Download complete! Created {len(list(output_dir.glob("*.geojson")))} regional files'
        download_status['running'] = False
        download_status['result_folder'] = str(output_dir)
        download_status['total_features'] = len(gdf)  # For LayerRegistry

    except Exception as e:
        download_status['error'] = str(e)
        download_status['message'] = f'Error: {str(e)}'
        download_status['running'] = False
        download_status['step'] = 'error'

@app.route('/api/download-version', methods=['POST'])
def download_version():
    """Start downloading a specific version of OSM roads (runs in background)"""
    global download_status

    try:
        data = request.get_json()
        version_date = data.get('version_date')
        resource_url = data.get('resource_url')
        format_type = data.get('format_type', 'GeoJSON')

        if not version_date or not resource_url:
            return jsonify({
                'success': False,
                'message': 'Missing required parameters: version_date, resource_url'
            }), 400

        if download_status['running']:
            return jsonify({
                'success': False,
                'message': 'Download already in progress'
            }), 400

        # Reset status
        download_status['running'] = True
        download_status['progress'] = 0
        download_status['step'] = 'starting'
        download_status['message'] = 'Starting download...'
        download_status['error'] = None
        download_status['bytes_downloaded'] = 0
        download_status['total_bytes'] = 0

        # Start download in background thread
        thread = threading.Thread(
            target=run_download_with_progress,
            args=(version_date, resource_url, format_type)
        )
        thread.daemon = True
        thread.start()

        return jsonify({
            'success': True,
            'message': 'Download started',
            'status_url': '/api/download-status'
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'message': f'Download failed: {str(e)}'
        }), 500

@app.route('/api/download-status', methods=['GET'])
def get_download_status():
    """Get current download progress"""
    return jsonify(download_status)

@app.route('/api/search-hdx', methods=['POST'])
def search_hdx():
    """Search HDX for road datasets in Somalia"""
    import requests

    try:
        data = request.get_json() or {}
        country = data.get('country', 'somalia')
        query = data.get('query', 'roads')

        print(f"[HDX SEARCH] Searching for '{query}' in '{country}'...")

        # HDX CKAN API search
        hdx_url = 'https://data.humdata.org/api/3/action/package_search'
        params = {
            'q': f'{query} {country}',
            'fq': f'groups:{country}',
            'rows': 25,
            'sort': 'metadata_modified desc'
        }

        response = requests.get(hdx_url, params=params, timeout=30)

        if response.status_code == 200:
            hdx_data = response.json()
            results = hdx_data.get('result', {}).get('results', [])

            # Filter and process results
            processed_results = []
            for dataset in results:
                name = (dataset.get('name', '') or '').lower()
                title = (dataset.get('title', '') or '').lower()

                # Filter for road-related datasets
                if 'road' in name or 'road' in title or 'transport' in name or 'transport' in title:
                    # Get resources (prefer GeoJSON)
                    resources = []
                    for r in dataset.get('resources', []):
                        fmt = (r.get('format', '') or '').lower()
                        if fmt in ['geojson', 'json', 'gpkg', 'geopackage', 'shp', 'shapefile']:
                            resources.append({
                                'id': r.get('id'),
                                'name': r.get('name'),
                                'format': r.get('format'),
                                'url': r.get('url'),
                                'size': r.get('size'),
                                'last_modified': r.get('last_modified')
                            })

                    if resources:  # Only include if it has useful resources
                        processed_results.append({
                            'id': dataset.get('id'),
                            'name': dataset.get('name'),
                            'title': dataset.get('title'),
                            'description': dataset.get('notes', '')[:300] if dataset.get('notes') else '',
                            'lastUpdated': dataset.get('metadata_modified'),
                            'organization': dataset.get('organization', {}).get('title'),
                            'resources': resources[:5]  # Limit resources
                        })

            # Sort by last updated
            processed_results.sort(key=lambda x: x.get('lastUpdated', ''), reverse=True)

            print(f"[HDX SEARCH] Found {len(processed_results)} road datasets")

            return jsonify({
                'success': True,
                'results': processed_results,
                'total': len(processed_results)
            })

        else:
            print(f"[HDX SEARCH] API error: {response.status_code}")
            return jsonify({'success': False, 'error': f'HDX API returned {response.status_code}'}), 500

    except requests.exceptions.Timeout:
        print("[HDX SEARCH] Timeout connecting to HDX")
        return jsonify({'success': False, 'error': 'Timeout connecting to HDX'}), 504
    except Exception as e:
        print(f"[HDX SEARCH] Error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/uninstall-roads', methods=['POST'])
def uninstall_roads():
    """Uninstall (delete) road files for a specific version"""
    try:
        data = request.get_json()
        version = data.get('version', '')

        if version == '2024':
            folder = 'roads_by_region_2024_07_23'
        elif version == 'latest' or version == '2026':
            folder = 'roads_by_region_latest'
        else:
            return jsonify({'error': 'Invalid version. Use "2024" or "latest"'}), 400

        folder_path = os.path.join(os.path.dirname(__file__), folder)

        if not os.path.exists(folder_path):
            return jsonify({'error': f'Folder {folder} does not exist'}), 404

        # Delete all *_roads.js files in the folder
        files_deleted = 0
        for filename in os.listdir(folder_path):
            if filename.endswith('_roads.js'):
                file_path = os.path.join(folder_path, filename)
                try:
                    os.remove(file_path)
                    files_deleted += 1
                    print(f"[UNINSTALL] Deleted: {filename}")
                except Exception as e:
                    print(f"[UNINSTALL] Error deleting {filename}: {e}")

        print(f"[UNINSTALL] Completed: {files_deleted} files deleted from {folder}")

        return jsonify({
            'success': True,
            'version': version,
            'folder': folder,
            'filesDeleted': files_deleted
        })

    except Exception as e:
        print(f"[UNINSTALL] Error: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("=" * 70)
    print("  Somalia Dashboard - OSM Roads Update Server")
    print("=" * 70)
    print("\n[OK] Server starting on http://localhost:5000")
    print("[OK] Dashboard can now trigger automatic updates")
    print("\nKeep this terminal open while using the dashboard.")
    print("Press Ctrl+C to stop the server.\n")
    print("=" * 70)

    # Check if flask_cors is installed
    try:
        import flask_cors
    except ImportError:
        print("\n[WARNING] flask-cors not installed")
        print("Install with: pip install flask flask-cors")
        print()

    app.run(host='localhost', port=5000, debug=False, use_reloader=False)
