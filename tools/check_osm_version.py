#!/usr/bin/env python3
"""
=============================================================================
MODULAR VERSION CHECK SYSTEM - Template for ALL Thematic Layers
=============================================================================
This is a TEMPLATE pattern that can be reused for any HDX dataset:
- OSM Roads
- Buildings
- Nightlights
- Health Facilities
- etc.

PATTERN:
1. Query HDX API for dataset resources
2. Find ALL versions (different dates, different formats)
3. Compare with local versions (date-based folders)
4. Return structured data for frontend modal

To use for another layer, copy this file and change:
- HDX_DATASET_ID
- LOCAL_FOLDER_PREFIX
- RESOURCE_FILTERS
=============================================================================
"""

import requests
import json
from pathlib import Path
from datetime import datetime
import glob
import os

# =============================================================================
# CONFIGURATION - Change these for different layers
# =============================================================================

# HDX dataset identifier (from URL: data.humdata.org/dataset/[THIS_ID])
HDX_DATASET_ID = 'hotosm_som_roads'

# Prefix for local version folders (relative to project root)
# When run from tools folder, need to go up one level then into data_warehouse/roads
LOCAL_FOLDER_PREFIX = '../data_warehouse/roads/roads_by_region_'

# Resource name filters (lowercase) - files containing ANY of these
RESOURCE_NAME_FILTERS = ['roads', 'lines']

# Accepted formats
ACCEPTED_FORMATS = ['GEOJSON', 'GEOPACKAGE', 'GPKG']

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def format_date(date_str):
    """Convert ISO date to human-readable format: '23 July 2024'"""
    try:
        dt = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
        return dt.strftime('%d %B %Y')
    except:
        return date_str

def get_date_part(date_str):
    """Extract YYYY_MM_DD from ISO datetime (underscore format for folder names)"""
    if 'T' in date_str:
        return date_str.split('T')[0].replace('-', '_')
    return date_str.replace('-', '_')

def normalize_format(fmt):
    """Normalize format name"""
    fmt = fmt.upper()
    if fmt == 'GPKG':
        return 'GEOPACKAGE'
    return fmt

# =============================================================================
# MAIN SUBROUTINE: check_osm_roads_version()
# =============================================================================

def check_osm_roads_version():
    """
    Check ALL OSM roads versions from HDX API and compare with local versions.

    This is a MODULAR subroutine that can be adapted for any HDX dataset.

    Returns:
        dict: {
            'success': bool,
            'versions': [{
                'date': str (ISO format),
                'readable': str (human readable),
                'format': str (GeoJSON, GEOPACKAGE),
                'download_url': str,
                'size_mb': float,
                'status': 'in_dashboard' | 'available',
                'is_latest': bool,
                'local_folder': str (if exists),
                'resource_id': str (HDX resource ID)
            }],
            'local_versions': [str] (list of version dates in dashboard),
            'has_newer': bool,
            'has_older': bool,
            'message': str,
            'error': str (if failed)
        }
    """

    result = {
        'success': False,
        'versions': [],
        'local_versions': [],
        'has_newer': False,
        'has_older': False,
        'message': '',
        'error': None
    }

    try:
        # =====================================================================
        # STEP 1: Query HDX API for ALL resources
        # =====================================================================
        print(f"[VERSION CHECK] Fetching HDX dataset: {HDX_DATASET_ID}...", flush=True)

        hdx_api_url = 'https://data.humdata.org/api/3/action/package_show'
        params = {'id': HDX_DATASET_ID}

        response = requests.get(hdx_api_url, params=params, timeout=15)
        response.raise_for_status()

        dataset_info = response.json()

        if not dataset_info.get('success'):
            result['error'] = 'HDX API returned unsuccessful response'
            result['message'] = 'Failed to fetch HDX metadata'
            return result

        resources = dataset_info['result']['resources']
        print(f"[VERSION CHECK] Found {len(resources)} total resources on HDX", flush=True)

        # =====================================================================
        # STEP 2: Filter and organize resources by DATE
        # =====================================================================
        # Group by (date, format) to avoid duplicates
        hdx_versions = {}

        for resource in resources:
            name = resource.get('name', '').lower()
            fmt = normalize_format(resource.get('format', ''))

            # Check if this resource matches our filters
            name_match = any(f in name for f in RESOURCE_NAME_FILTERS)
            format_match = fmt in ACCEPTED_FORMATS

            if name_match and format_match:
                date = resource.get('last_modified')
                size = resource.get('size', 0)

                if date and size > 0:
                    date_part = get_date_part(date)

                    # Create unique key: date + format
                    key = f"{date_part}_{fmt}"

                    # Only keep one resource per date+format (largest size wins)
                    if key not in hdx_versions or size > hdx_versions[key]['size']:
                        hdx_versions[key] = {
                            'date': date,
                            'date_part': date_part,
                            'format': fmt,
                            'name': resource.get('name'),
                            'url': resource.get('download_url') or resource.get('url'),
                            'size': size,
                            'resource_id': resource.get('id')
                        }
                        print(f"[VERSION CHECK] HDX: {date_part} - {fmt} ({size/(1024*1024):.1f} MB)", flush=True)

        if not hdx_versions:
            result['error'] = 'No matching resources found in HDX dataset'
            result['message'] = 'Could not find any roads data in HDX'
            return result

        print(f"[VERSION CHECK] Found {len(hdx_versions)} unique version(s) on HDX", flush=True)

        # =====================================================================
        # STEP 3: Get LOCAL versions from file system
        # =====================================================================
        local_versions = {}

        # Scan for all roads_by_region_* folders
        for folder_path in glob.glob(f'{LOCAL_FOLDER_PREFIX}*'):
            if not os.path.isdir(folder_path):
                continue

            version_file = Path(folder_path) / '.version.json'

            if version_file.exists():
                try:
                    with open(version_file, 'r') as f:
                        version_data = json.load(f)
                        version_date = version_data.get('last_modified')

                        if version_date:
                            date_part = get_date_part(version_date)

                            # Extract just the folder name (e.g., 'roads_by_region_2024_07_23')
                            folder_name = Path(folder_path).name

                            local_versions[date_part] = {
                                'folder': folder_name,
                                'folder_path': folder_path,  # Keep full path for internal use
                                'date': version_date,
                                'updated_at': version_data.get('updated_at'),
                                'format': version_data.get('format', 'GeoJSON')
                            }

                            print(f"[VERSION CHECK] Local: {folder_name} -> {date_part}", flush=True)
                except Exception as e:
                    print(f"[VERSION CHECK] Error reading {version_file}: {e}", flush=True)

        result['local_versions'] = list(local_versions.keys())
        print(f"[VERSION CHECK] Found {len(local_versions)} local version(s)", flush=True)

        # =====================================================================
        # STEP 4: Build unified version list with PRIORITY SELECTION
        # =====================================================================
        # PRIORITY LOGIC:
        # 1. Group all versions by DATE
        # 2. For each date: prefer GeoJSON, fallback to Geopackage
        # 3. Only return ONE version per date (the best format available)
        # =====================================================================

        # Group by date first
        versions_by_date = {}
        for key, hdx_data in hdx_versions.items():
            date_part = hdx_data['date_part']
            if date_part not in versions_by_date:
                versions_by_date[date_part] = {}
            versions_by_date[date_part][hdx_data['format']] = hdx_data

        print(f"[VERSION CHECK] Grouped into {len(versions_by_date)} unique date(s)", flush=True)

        # Find the latest date
        all_dates = list(versions_by_date.keys())
        latest_date = max(all_dates) if all_dates else None

        # Build final version list - ONE per date with priority selection
        all_versions = []

        for date_part in sorted(versions_by_date.keys(), reverse=True):
            formats_for_date = versions_by_date[date_part]

            # PRIORITY: GeoJSON first, then Geopackage
            selected_format = None
            needs_conversion = False

            if 'GEOJSON' in formats_for_date:
                selected_format = 'GEOJSON'
                needs_conversion = False
                print(f"[VERSION CHECK] {date_part}: Selected GEOJSON (preferred)", flush=True)
            elif 'GEOPACKAGE' in formats_for_date:
                selected_format = 'GEOPACKAGE'
                needs_conversion = True  # Will need conversion to GeoJSON
                print(f"[VERSION CHECK] {date_part}: Selected GEOPACKAGE (will convert to GeoJSON)", flush=True)

            if selected_format:
                hdx_data = formats_for_date[selected_format]

                # Determine status
                is_in_dashboard = date_part in local_versions
                is_latest = date_part == latest_date

                version_info = {
                    'date': hdx_data['date'],
                    'date_short': date_part,
                    'readable': format_date(hdx_data['date']),
                    'format': selected_format,
                    'format_display': f"{selected_format}" + (" (will convert to GeoJSON)" if needs_conversion else ""),
                    'needs_conversion': needs_conversion,
                    'download_url': hdx_data['url'],
                    'size_mb': round(hdx_data['size'] / (1024 * 1024), 2),
                    'status': 'in_dashboard' if is_in_dashboard else 'available',
                    'is_latest': is_latest,
                    'local_folder': local_versions[date_part]['folder'] if is_in_dashboard else None,
                    'resource_id': hdx_data['resource_id']
                }

                all_versions.append(version_info)

        # Already sorted by date (newest first) in the loop above

        # =====================================================================
        # STEP 5: Determine has_newer and has_older flags
        # =====================================================================
        if local_versions:
            latest_local = max(local_versions.keys())

            # Check if any HDX version is newer than our latest local
            result['has_newer'] = any(
                v['date_short'] > latest_local and v['status'] == 'available'
                for v in all_versions
            )

            # Check if any HDX version is older than our latest local and not downloaded
            result['has_older'] = any(
                v['date_short'] < latest_local and v['status'] == 'available'
                for v in all_versions
            )
        else:
            # No local versions - everything is "newer"
            result['has_newer'] = len(all_versions) > 0
            result['has_older'] = False

        result['versions'] = all_versions
        result['success'] = True

        # Build message
        available_count = sum(1 for v in all_versions if v['status'] == 'available')
        in_dashboard_count = sum(1 for v in all_versions if v['status'] == 'in_dashboard')

        if not local_versions:
            result['message'] = f"No local roads data. {len(all_versions)} version(s) available on HDX."
        elif result['has_newer']:
            result['message'] = f"Newer version available! {available_count} downloadable, {in_dashboard_count} in dashboard."
        elif result['has_older']:
            result['message'] = f"Up to date! {available_count} older version(s) available for download."
        else:
            result['message'] = f"All available versions are in your dashboard!"

        print(f"[VERSION CHECK] Result: {result['message']}", flush=True)
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
        import traceback
        traceback.print_exc()
        return result


# =============================================================================
# MAIN (for standalone testing)
# =============================================================================

if __name__ == '__main__':
    print("=" * 70)
    print("  MODULAR VERSION CHECK - OSM Roads")
    print("=" * 70)
    print()
    print(f"  HDX Dataset: {HDX_DATASET_ID}")
    print(f"  Local Prefix: {LOCAL_FOLDER_PREFIX}")
    print(f"  Filters: {RESOURCE_NAME_FILTERS}")
    print()
    print("=" * 70)
    print()

    result = check_osm_roads_version()

    print()
    print("=" * 70)
    print("  RESULTS:")
    print("=" * 70)
    print(f"Success: {result['success']}")
    print(f"Message: {result['message']}")
    print(f"Has Newer: {result['has_newer']}")
    print(f"Has Older: {result['has_older']}")
    print(f"Local Versions: {result['local_versions']}")
    print()
    print("HDX Versions:")
    for v in result['versions']:
        status_icon = '[IN DASH]' if v['status'] == 'in_dashboard' else '[AVAIL]'
        latest_tag = ' [LATEST]' if v['is_latest'] else ''
        print(f"  {status_icon} {v['readable']} - {v['format']} ({v['size_mb']} MB){latest_tag}")
        print(f"      Status: {v['status']}")
        if v['local_folder']:
            print(f"      Folder: {v['local_folder']}")
    print()
    if result['error']:
        print(f"Error: {result['error']}")
    print("=" * 70)
