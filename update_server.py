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
    """Run the update_osm_roads.py script in background"""
    global update_status

    try:
        update_status['running'] = True
        update_status['progress'] = 0
        update_status['message'] = 'Starting update...'
        update_status['error'] = None

        # Run the update script
        script_path = os.path.join(os.path.dirname(__file__), 'update_osm_roads.py')

        update_status['progress'] = 10
        update_status['message'] = 'Downloading latest roads from HDX...'

        # Execute the script
        result = subprocess.run(
            [sys.executable, script_path],
            capture_output=True,
            text=True,
            cwd=os.path.dirname(__file__)
        )

        if result.returncode == 0:
            update_status['progress'] = 100
            update_status['message'] = 'Update completed successfully!'
            update_status['running'] = False
        else:
            update_status['error'] = result.stderr
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
    print("\n✓ Server starting on http://localhost:5000")
    print("✓ Dashboard can now trigger automatic updates")
    print("\nKeep this terminal open while using the dashboard.")
    print("Press Ctrl+C to stop the server.\n")
    print("=" * 70)

    # Check if flask_cors is installed
    try:
        import flask_cors
    except ImportError:
        print("\n⚠️  WARNING: flask-cors not installed")
        print("Install with: pip install flask flask-cors")
        print()

    app.run(host='localhost', port=5000, debug=False)
