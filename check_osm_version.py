#!/usr/bin/env python3
"""
OSM Roads Version Check Subroutine
Independent module to check HDX version against local version
"""

import requests
import json
from pathlib import Path
from datetime import datetime

# ============================================================================
# SUBROUTINE: check_osm_roads_version()
# Purpose: Check if HDX has newer version than locally downloaded roads
# Returns: dict with version comparison results
# ============================================================================

def check_osm_roads_version():
    """
    Check OSM roads version from HDX API and compare with local version.

    Returns:
        dict: {
            'success': bool,
            'hdx_version': str (date),
            'local_version': str (date),
            'is_same': bool,
            'needs_update': bool,
            'message': str,
            'error': str (if failed)
        }
    """

    result = {
        'success': False,
        'hdx_version': None,
        'local_version': None,
        'is_same': False,
        'needs_update': False,
        'message': '',
        'error': None
    }

    try:
        # Step 1: Get HDX version (last_modified date)
        print("[VERSION CHECK] Fetching HDX dataset metadata...", flush=True)

        hdx_api_url = 'https://data.humdata.org/api/3/action/package_show'
        params = {'id': 'hotosm_som_roads'}

        response = requests.get(hdx_api_url, params=params, timeout=10)
        response.raise_for_status()

        dataset_info = response.json()

        if not dataset_info.get('success'):
            result['error'] = 'HDX API returned unsuccessful response'
            result['message'] = 'Failed to fetch HDX metadata'
            return result

        # Find GeoJSON lines resource
        resources = dataset_info['result']['resources']
        geojson_resource = None

        for resource in resources:
            if 'geojson' in resource['format'].lower() and 'lines' in resource['name'].lower():
                geojson_resource = resource
                break

        if not geojson_resource:
            result['error'] = 'GeoJSON lines file not found in HDX dataset'
            result['message'] = 'Could not find roads file in HDX'
            return result

        # Extract HDX version (last_modified date)
        hdx_last_modified = geojson_resource.get('last_modified', None)

        if not hdx_last_modified:
            result['error'] = 'No last_modified field in HDX resource'
            result['message'] = 'HDX version date not available'
            return result

        result['hdx_version'] = hdx_last_modified
        print(f"[VERSION CHECK] HDX version: {hdx_last_modified}", flush=True)

        # Step 2: Get local version from .version.json
        version_file = Path('roads_by_region_latest/.version.json')

        if version_file.exists():
            with open(version_file, 'r') as f:
                local_version_data = json.load(f)
                result['local_version'] = local_version_data.get('last_modified', None)
                local_updated_at = local_version_data.get('updated_at', 'Unknown')

                print(f"[VERSION CHECK] Local version: {result['local_version']}", flush=True)
                print(f"[VERSION CHECK] Downloaded on: {local_updated_at}", flush=True)
        else:
            result['local_version'] = None
            print(f"[VERSION CHECK] No local version file found (never downloaded)", flush=True)

        # Step 3: Compare versions
        if result['local_version'] is None:
            result['needs_update'] = True
            result['is_same'] = False
            result['message'] = f"No local roads data. HDX version: {hdx_last_modified}"
            print(f"[VERSION CHECK] Result: NEEDS DOWNLOAD", flush=True)
        elif result['hdx_version'] == result['local_version']:
            result['needs_update'] = False
            result['is_same'] = True
            result['message'] = f"Versions match! Both dated: {hdx_last_modified}"
            print(f"[VERSION CHECK] Result: UP TO DATE ✓", flush=True)
        else:
            result['needs_update'] = True
            result['is_same'] = False
            result['message'] = f"Update available! HDX: {hdx_last_modified}, Local: {result['local_version']}"
            print(f"[VERSION CHECK] Result: UPDATE AVAILABLE", flush=True)

        result['success'] = True
        return result

    except requests.exceptions.Timeout:
        result['error'] = 'HDX API request timed out'
        result['message'] = 'Could not connect to HDX (timeout)'
        print(f"[VERSION CHECK] ERROR: Timeout", flush=True)
        return result

    except requests.exceptions.RequestException as e:
        result['error'] = str(e)
        result['message'] = 'Network error connecting to HDX'
        print(f"[VERSION CHECK] ERROR: {e}", flush=True)
        return result

    except Exception as e:
        result['error'] = str(e)
        result['message'] = f'Unexpected error: {str(e)}'
        print(f"[VERSION CHECK] ERROR: {e}", flush=True)
        return result


# ============================================================================
# MAIN (for standalone testing)
# ============================================================================

if __name__ == '__main__':
    print("=" * 70)
    print("  OSM Roads Version Check - Standalone Test")
    print("=" * 70)
    print()

    result = check_osm_roads_version()

    print()
    print("=" * 70)
    print("  RESULTS:")
    print("=" * 70)
    print(f"Success: {result['success']}")
    print(f"HDX Version: {result['hdx_version']}")
    print(f"Local Version: {result['local_version']}")
    print(f"Versions Match: {result['is_same']}")
    print(f"Needs Update: {result['needs_update']}")
    print(f"Message: {result['message']}")
    if result['error']:
        print(f"Error: {result['error']}")
    print("=" * 70)
