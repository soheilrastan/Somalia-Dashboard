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
                update_status['message'] = 'Saving optimized regional files...'
            elif '[OK]' in line and 'roads,' in line:
                # Each region saved, increment slightly
                if update_status['progress'] < 95:
                    update_status['progress'] = min(95, update_status['progress'] + 1)
            elif '[6/6]' in line or 'Cleaning up' in line:
                update_status['progress'] = 95
                update_status['message'] = 'Cleaning up temporary files...'
            elif 'UPDATE COMPLETE' in line:
                update_status['progress'] = 100
                update_status['message'] = 'Update completed successfully!'

        # Wait for process to complete
        process.wait()

        if process.returncode == 0:
            update_status['progress'] = 100
            update_status['message'] = 'Update completed successfully!'
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

    app.run(host='localhost', port=5000, debug=False)
