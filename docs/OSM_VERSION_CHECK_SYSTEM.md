# OSM Roads Version Check System
## Complete Tracing Documentation

Created: 2026-01-21
Version: 3.0

---

## System Overview

Independent subroutine system to check if HDX has a newer version of OSM roads data than what's currently downloaded locally.

---

## Architecture

```
User clicks "Update Roads from HDX API" button
    ↓
Dashboard calls: fetch('http://localhost:5000/api/check-version')
    ↓
update_server.py → /api/check-version endpoint
    ↓
check_osm_version.py → check_osm_roads_version()
    ↓
Returns comparison result
    ↓
Dashboard displays message with version dates
    ↓
If needs update: proceed with download
If same version: show "already up to date" message
```

---

## Files and Components

### 1. check_osm_version.py (NEW - Independent Subroutine)
**Location**: `c:\Users\10145080\Downloads\Somalia Dashboard\check_osm_version.py`

**Main Function**: `check_osm_roads_version()`

**Purpose**: Check HDX version against local version

**Process**:
1. Fetches HDX dataset metadata via API
2. Extracts `last_modified` date from GeoJSON resource
3. Reads local `.version.json` file (if exists)
4. Compares HDX version vs local version
5. Returns structured result

**Returns**:
```python
{
    'success': bool,              # True if check succeeded
    'hdx_version': str,           # HDX last_modified date
    'local_version': str,         # Local last_modified date (or None)
    'is_same': bool,              # True if versions match
    'needs_update': bool,         # True if update recommended
    'message': str,               # Human-readable message
    'error': str                  # Error message (if failed)
}
```

**Example Output**:
```
Versions match! Both dated: 2026-01-02T03:56:55.562347
```

**Standalone Testing**:
```bash
python check_osm_version.py
```

---

### 2. update_osm_roads.py (MODIFIED - Added Version Writing)
**Location**: `c:\Users\10145080\Downloads\Somalia Dashboard\update_osm_roads.py`

**Changes Made**:
- Line 103: `download_latest_roads()` now returns dict: `{'path': Path, 'last_modified': str}`
- Line 237-254: New function `write_version_file(last_modified)`
- Line 277-278: Calls `write_version_file()` after successful download

**New Function**: `write_version_file(last_modified)`

**Purpose**: Write version metadata after successful download

**Creates**: `roads_by_region_latest/.version.json`

**Content**:
```json
{
  "last_modified": "2026-01-02T03:56:55.562347",
  "updated_at": "2026-01-14 15:38:40"
}
```

---

### 3. .version.json (Version Metadata File)
**Location**: `roads_by_region_latest/.version.json`

**Created By**: `update_osm_roads.py::write_version_file()`

**Read By**: `check_osm_version.py::check_osm_roads_version()`

**Fields**:
- `last_modified`: HDX dataset last modified date (ISO format from HDX API)
- `updated_at`: Local download timestamp (YYYY-MM-DD HH:MM:SS)

**Purpose**: Persistent storage of version information for comparison

---

### 4. update_server.py (MODIFIED - Added Version Check Endpoint)
**Location**: `c:\Users\10145080\Downloads\Somalia Dashboard\update_server.py`

**New Endpoint**: `/api/check-version` (GET)

**Lines**: 197-212

**Purpose**: Expose version check to dashboard via HTTP API

**Response**:
```json
{
  "success": true,
  "hdx_version": "2026-01-02T03:56:55.562347",
  "local_version": "2026-01-02T03:56:55.562347",
  "is_same": true,
  "needs_update": false,
  "message": "Versions match! Both dated: 2026-01-02T03:56:55.562347"
}
```

**Usage**:
```javascript
fetch('http://localhost:5000/api/check-version')
    .then(r => r.json())
    .then(data => console.log(data.message));
```

---

## Integration Points

### Dashboard Integration (Next Step)

**Location**: `script_v3.0.js` - Update button event handler

**Current Button**: Line ~900 - `#updateOSMButton`

**Integration Flow**:

```javascript
// BEFORE clicking update button, call version check
document.getElementById('updateOSMButton').addEventListener('click', async function() {
    // Step 1: Version Check (NEW)
    const versionCheck = await fetch('http://localhost:5000/api/check-version');
    const versionResult = await versionCheck.json();

    if (versionResult.success) {
        if (versionResult.is_same) {
            // Show "Already up to date" modal
            showVersionMatchModal(versionResult);
            return; // Don't proceed with download
        } else {
            // Show "Update available" and proceed
            showUpdateAvailableModal(versionResult);
            // Continue with existing update flow...
        }
    }

    // Step 2: Existing update flow continues...
});
```

**Modal Messages**:

1. **Versions Match** (Green):
   ```
   ✓ Roads Already Up to Date

   HDX Version: 2026-01-02
   Local Version: 2026-01-02
   Last Downloaded: 2026-01-14 15:38:40

   Both versions match - no update needed!
   ```

2. **Update Available** (Blue):
   ```
   🔄 Update Available

   HDX Version: 2026-01-15
   Local Version: 2026-01-02

   New roads data available. Proceed with download?
   [Yes, Update Now] [Cancel]
   ```

3. **Never Downloaded** (Yellow):
   ```
   📥 No Local Data Found

   HDX Version: 2026-01-02

   Roads data not yet downloaded. Proceed?
   [Yes, Download] [Cancel]
   ```

---

## Tracing the Complete Flow

### User Action: Click "Update Roads from HDX API"

**Step 1**: Button Click
```
Location: index_v3.0.html → Layers container
Element ID: updateOSMButton
Event: click
```

**Step 2**: Version Check Request
```
JavaScript: fetch('http://localhost:5000/api/check-version')
Server: update_server.py:197 → check_version()
Subroutine: check_osm_version.py → check_osm_roads_version()
```

**Step 3**: HDX API Call
```
URL: https://data.humdata.org/api/3/action/package_show?id=hotosm_som_roads
Response: JSON with resources array
Extract: resources[].last_modified (for GeoJSON lines file)
```

**Step 4**: Local Version Read
```
File: roads_by_region_latest/.version.json
Fields: last_modified, updated_at
```

**Step 5**: Comparison Logic
```python
if local_version is None:
    needs_update = True
    message = "No local roads data. HDX version: {hdx_version}"
elif hdx_version == local_version:
    needs_update = False
    is_same = True
    message = "Versions match! Both dated: {hdx_version}"
else:
    needs_update = True
    is_same = False
    message = "Update available! HDX: {hdx_version}, Local: {local_version}"
```

**Step 6**: Display Result
```
Dashboard: Show modal with message
User Decision:
  - If is_same: "Already up to date" → Stop
  - If needs_update: "Proceed with download?" → Continue to download
```

**Step 7**: If User Proceeds with Download
```
Trigger: fetch('http://localhost:5000/api/update-roads', {method: 'POST'})
Server: update_server.py → run_update_script()
Script: update_osm_roads.py → main()
Download: HDX GeoJSON → Split by region → Save 36 files
Version Write: write_version_file(last_modified)
Result: .version.json updated with new version
```

---

## Testing the System

### 1. Test Version Check Standalone
```bash
cd "c:\Users\10145080\Downloads\Somalia Dashboard"
python check_osm_version.py
```

**Expected Output**:
```
======================================================================
  OSM Roads Version Check - Standalone Test
======================================================================

[VERSION CHECK] Fetching HDX dataset metadata...
[VERSION CHECK] HDX version: 2026-01-02T03:56:55.562347
[VERSION CHECK] Local version: 2026-01-02T03:56:55.562347
[VERSION CHECK] Downloaded on: 2026-01-14 15:38:40
[VERSION CHECK] Result: UP TO DATE ✓

======================================================================
  RESULTS:
======================================================================
Success: True
HDX Version: 2026-01-02T03:56:55.562347
Local Version: 2026-01-02T03:56:55.562347
Versions Match: True
Needs Update: False
Message: Versions match! Both dated: 2026-01-02T03:56:55.562347
======================================================================
```

### 2. Test API Endpoint
```bash
# Start server
python update_server.py

# In another terminal or browser:
curl http://localhost:5000/api/check-version
```

**Expected Response**:
```json
{
  "success": true,
  "hdx_version": "2026-01-02T03:56:55.562347",
  "local_version": "2026-01-02T03:56:55.562347",
  "is_same": true,
  "needs_update": false,
  "message": "Versions match! Both dated: 2026-01-02T03:56:55.562347",
  "error": null
}
```

### 3. Test Full Update Flow
```bash
# Start server
python update_server.py

# Open dashboard
# Click "Update Roads from HDX API"
# Should see version check modal first
# Then proceed with download if needed
```

---

## Troubleshooting

### Issue: "No local version file found"
**Cause**: `.version.json` doesn't exist (never downloaded)
**Solution**: Normal for first-time use - proceed with download

### Issue: "HDX API request timed out"
**Cause**: Network connection issue or HDX is down
**Solution**: Check internet connection, try again later

### Issue: "Version check failed"
**Cause**: Server not running or `check_osm_version.py` not found
**Solution**:
1. Ensure `update_server.py` is running
2. Verify `check_osm_version.py` exists in same directory

---

## Future Enhancements

1. **Auto-check on page load**: Check version when dashboard loads
2. **Version badge**: Display version/date in UI permanently
3. **Update notification**: Show banner if update available
4. **Schedule checks**: Periodic background version checking
5. **Version history**: Track all past downloads in log file

---

## Summary

**Subroutine Name**: `check_osm_roads_version()`

**Traceable Components**:
1. `check_osm_version.py` - Independent module
2. `update_server.py::check_version()` - API endpoint
3. `.version.json` - Persistent storage
4. `update_osm_roads.py::write_version_file()` - Version writer

**Integration Point**: Dashboard update button → Version check → User decision → Download (if needed)

**Result**: User sees clear message about version status before downloading

---

*End of Documentation*
