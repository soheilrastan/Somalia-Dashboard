/**
 * GeoAPI Module - Road Data Management
 * =====================================
 * Independent module for managing road data installations.
 * Handles install, uninstall, and search for road data.
 *
 * Features:
 * - INSTALL: Download and integrate road data from HDX
 * - UNINSTALL: Remove road data from map, panel, and memory
 * - SEARCH: Find new road data versions from HDX
 *
 * Usage:
 *   GeoAPI.init(map, config);
 *   GeoAPI.uninstall('2024');
 *   GeoAPI.search();
 */

console.log('[GeoAPI] geo-api.js file loading...');

const GeoAPI = (function() {
    'use strict';

    // Module state
    let _map = null;
    let _config = {};
    let _installedVersions = {};
    let _layerReferences = {};
    let _panelElements = {};

    // Version configuration
    const VERSION_CONFIG = {
        '2023': {
            key: '2023',
            name: 'Roads 2023',
            displayName: 'Roads 2023',
            folder: 'roads_by_region',
            color: '#f97316',
            layerVar: 'activeRoadsOSMLayer',
            toggleId: 'roadsOSMToggle',
            labelId: 'roadsOSMLabel',
            panelContainerId: 'roads2023Container'
        },
        '2024': {
            key: '2024',
            name: 'Roads 2024 (July)',
            displayName: 'Roads 2024 (July)',
            folder: 'roads_by_region_2024_07_23',
            color: '#fbbf24',  // Gold/yellow to match panel
            layerVar: 'activeRoads2024Layer',
            toggleId: 'roads2024Toggle',
            labelId: 'roads2024Label',
            panelContainerId: 'roads2024Container'
        },
        'latest': {
            key: 'latest',
            name: 'Roads Latest',
            displayName: 'Roads 2026 (Latest)',
            folder: 'roads_by_region_latest',
            color: '#22c55e',  // Green to match panel
            layerVar: 'activeRoadsOSMLatestLayer',
            toggleId: 'roadsOSMLatestToggle',
            labelId: 'roadsOSMLatestLabel',
            panelContainerId: 'roadsLatestContainer'
        }
    };

    // HDX Configuration
    const HDX_CONFIG = {
        baseUrl: 'https://data.humdata.org',
        searchUrl: 'https://data.humdata.org/api/3/action/package_search',
        country: 'somalia',
        resourceTypes: ['geojson', 'json', 'gpkg', 'geopackage'],
        preferredFormats: ['geojson', 'json', 'gpkg'] // In order of preference
    };

    // ========================================
    // INITIALIZATION
    // ========================================

    /**
     * Initialize GeoAPI module
     * @param {L.Map} map - Leaflet map instance
     * @param {Object} config - Configuration options
     */
    function init(map, config = {}) {
        _map = map;
        _config = config;

        // Scan for installed versions
        _scanInstalledVersions();

        // Store references to layer variables (from global scope)
        _captureLayerReferences();

        // Store references to panel elements
        _capturePanelElements();

        console.log('[GeoAPI] Module initialized');
        console.log('[GeoAPI] Installed versions:', Object.keys(_installedVersions));
    }

    /**
     * Scan filesystem to detect installed versions
     */
    function _scanInstalledVersions() {
        // This will be updated by the check-version API
        _installedVersions = {};
    }

    /**
     * Capture references to layer variables from global scope
     */
    function _captureLayerReferences() {
        // These are set by the main script when layers are created
        _layerReferences = {
            '2023': () => window.activeRoadsOSMLayer,
            '2024': () => window.activeRoads2024Layer,
            'latest': () => window.activeRoadsOSMLatestLayer
        };
    }

    /**
     * Capture references to panel elements
     */
    function _capturePanelElements() {
        for (const [key, config] of Object.entries(VERSION_CONFIG)) {
            _panelElements[key] = {
                toggle: document.getElementById(config.toggleId),
                label: document.getElementById(config.labelId),
                container: document.getElementById(config.panelContainerId)
            };
        }
    }

    // ========================================
    // UNINSTALL FUNCTIONALITY
    // ========================================

    /**
     * Uninstall a road version
     * @param {string} versionKey - '2023', '2024', or 'latest'
     * @returns {Promise<Object>} - Result of uninstall operation
     */
    async function uninstall(versionKey) {
        console.log(`[GeoAPI] ========================================`);
        console.log(`[GeoAPI] UNINSTALL REQUESTED FOR: "${versionKey}"`);
        console.log(`[GeoAPI] ========================================`);

        const versionConfig = VERSION_CONFIG[versionKey];
        if (!versionConfig) {
            console.error(`[GeoAPI] Unknown version: ${versionKey}`);
            console.error(`[GeoAPI] Available versions: ${Object.keys(VERSION_CONFIG).join(', ')}`);
            return { success: false, error: 'Unknown version' };
        }

        console.log(`[GeoAPI] Version config found:`, versionConfig);
        console.log(`[GeoAPI] Panel container ID to remove: ${versionConfig.panelContainerId}`);
        console.log(`[GeoAPI] Layer variable: ${versionConfig.layerVar}`);

        try {
            // 1. Remove layer from map
            console.log(`[GeoAPI] Step 1: Removing layer from map...`);
            _removeLayerFromMap(versionKey);

            // 2. Clear layer data from memory
            console.log(`[GeoAPI] Step 2: Clearing layer memory...`);
            _clearLayerMemory(versionKey);

            // 3. Remove from panel UI
            console.log(`[GeoAPI] Step 3: Removing from panel UI...`);
            _removeFromPanel(versionKey);

            // 4. Delete files via API
            console.log(`[GeoAPI] Step 4: Deleting files via API...`);
            const deleteResult = await _deleteFiles(versionKey, versionConfig.folder);

            // 5. Update installed versions state
            delete _installedVersions[versionKey];

            console.log(`[GeoAPI] Successfully uninstalled: ${versionKey}`);

            return {
                success: true,
                version: versionKey,
                filesRemoved: deleteResult.filesRemoved || 0,
                message: `${versionConfig.name} uninstalled successfully`
            };

        } catch (error) {
            console.error(`[GeoAPI] Uninstall error:`, error);
            return {
                success: false,
                version: versionKey,
                error: error.message
            };
        }
    }

    /**
     * Remove layer from map
     */
    function _removeLayerFromMap(versionKey) {
        if (!_map) {
            console.warn('[GeoAPI] Map not initialized');
            return;
        }

        const layerGetter = _layerReferences[versionKey];
        if (!layerGetter) return;

        const layer = layerGetter();
        if (layer && _map.hasLayer(layer)) {
            _map.removeLayer(layer);
            console.log(`[GeoAPI] Removed layer from map: ${versionKey}`);
        }

        // Also try to remove from global variable
        const config = VERSION_CONFIG[versionKey];
        if (config && window[config.layerVar]) {
            if (_map.hasLayer(window[config.layerVar])) {
                _map.removeLayer(window[config.layerVar]);
            }
        }
    }

    /**
     * Clear layer data from memory
     */
    function _clearLayerMemory(versionKey) {
        const config = VERSION_CONFIG[versionKey];
        if (!config) return;

        // Clear the global layer variable
        if (window[config.layerVar]) {
            window[config.layerVar] = null;
            console.log(`[GeoAPI] Cleared memory: ${config.layerVar}`);
        }

        // Clear any cached data based on version
        switch (versionKey) {
            case '2023':
                if (window.loadedRoadsData) {
                    window.loadedRoadsData = null;
                }
                break;
            case '2024':
                if (window.loadedRoads2024Data) {
                    window.loadedRoads2024Data = null;
                }
                break;
            case 'latest':
                if (window.loadedRoadsLatestData) {
                    window.loadedRoadsLatestData = null;
                }
                break;
        }
    }

    /**
     * Remove version entry from panel UI
     * Completely removes the element from DOM and memory
     * IMPORTANT: Only removes the EXACT container for the specified version
     */
    function _removeFromPanel(versionKey) {
        const config = VERSION_CONFIG[versionKey];
        if (!config) {
            console.error(`[GeoAPI] No config found for version: ${versionKey}`);
            return;
        }

        console.log(`[GeoAPI] Removing panel element for version: ${versionKey}`);
        console.log(`[GeoAPI] Looking for container ID: ${config.panelContainerId}`);

        // Method 1: Direct container ID lookup (MOST RELIABLE)
        const container = document.getElementById(config.panelContainerId);
        if (container) {
            console.log(`[GeoAPI] Found container by ID: ${config.panelContainerId}`);
            container.remove();
            console.log(`[GeoAPI] Successfully removed panel container: ${config.panelContainerId}`);
            return; // Done
        }

        // Method 2: Find by EXACT data-version attribute match
        const dataVersionContainer = document.querySelector(`[data-version="${versionKey}"]`);
        if (dataVersionContainer) {
            // Double-check this is the right container
            const containsCorrectToggle = dataVersionContainer.querySelector(`#${config.toggleId}`);
            if (containsCorrectToggle) {
                console.log(`[GeoAPI] Found container by data-version: ${versionKey}`);
                dataVersionContainer.remove();
                console.log(`[GeoAPI] Successfully removed panel by data-version: ${versionKey}`);
                return;
            } else {
                console.warn(`[GeoAPI] Found data-version but toggle mismatch, skipping`);
            }
        }

        // Method 3: Find by toggle ID and traverse up ONLY to parent with matching ID or data-version
        const toggle = document.getElementById(config.toggleId);
        if (toggle) {
            console.log(`[GeoAPI] Found toggle: ${config.toggleId}, traversing to find container`);
            let current = toggle;
            for (let i = 0; i < 6 && current; i++) {
                current = current.parentElement;
                if (current) {
                    // ONLY match if ID or data-version is EXACT match
                    if (current.id === config.panelContainerId) {
                        console.log(`[GeoAPI] Found container by ID traversal: ${config.panelContainerId}`);
                        current.remove();
                        console.log(`[GeoAPI] Successfully removed by traversal`);
                        return;
                    }
                    if (current.dataset && current.dataset.version === versionKey) {
                        console.log(`[GeoAPI] Found container by data-version traversal: ${versionKey}`);
                        current.remove();
                        console.log(`[GeoAPI] Successfully removed by data-version traversal`);
                        return;
                    }
                }
            }

            // Fallback: just disable the toggle
            console.warn(`[GeoAPI] Could not find container, disabling toggle as fallback`);
            toggle.checked = false;
            toggle.disabled = true;
        }

        console.log(`[GeoAPI] Panel removal complete for: ${versionKey}`);
    }

    /**
     * Delete files via backend API
     */
    async function _deleteFiles(versionKey, folder) {
        try {
            const response = await fetch('http://localhost:5000/uninstall-roads', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    version: versionKey,
                    folder: folder
                })
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const result = await response.json();
            console.log(`[GeoAPI] Files deleted:`, result);
            return result;

        } catch (error) {
            console.error(`[GeoAPI] Delete files error:`, error);
            // Still return success if layer was removed from map
            // Files might already be deleted or API might be down
            return { filesRemoved: 0 };
        }
    }

    // ========================================
    // INSTALL FUNCTIONALITY
    // ========================================

    /**
     * Install a road version
     * @param {string} versionKey - Version to install
     * @param {string} sourceUrl - URL to download from (optional)
     */
    async function install(versionKey, sourceUrl = null) {
        console.log(`[GeoAPI] Installing version: ${versionKey}`);

        const versionConfig = VERSION_CONFIG[versionKey];
        if (!versionConfig) {
            return { success: false, error: 'Unknown version' };
        }

        try {
            // 1. Download data if URL provided
            if (sourceUrl) {
                await _downloadData(versionKey, sourceUrl);
            }

            // 2. Re-add to panel UI
            _addToPanel(versionKey);

            // 3. Update installed versions
            _installedVersions[versionKey] = {
                installedAt: new Date().toISOString(),
                folder: versionConfig.folder
            };

            console.log(`[GeoAPI] Successfully installed: ${versionKey}`);

            return {
                success: true,
                version: versionKey,
                message: `${versionConfig.name} installed successfully`
            };

        } catch (error) {
            console.error(`[GeoAPI] Install error:`, error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Download data from URL
     */
    async function _downloadData(versionKey, url) {
        // This would use the backend API to download and process
        const response = await fetch('http://localhost:5000/download-roads', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ version: versionKey, url: url })
        });

        if (!response.ok) {
            throw new Error('Download failed');
        }

        return await response.json();
    }

    /**
     * Add version entry to panel UI
     */
    function _addToPanel(versionKey) {
        // Re-show the panel element if it was hidden
        const config = VERSION_CONFIG[versionKey];
        if (!config) return;

        const container = document.getElementById(config.panelContainerId);
        if (container) {
            container.style.display = '';
        }

        const toggle = document.getElementById(config.toggleId);
        if (toggle) {
            const toggleRow = toggle.closest('.layer-toggle-row') || toggle.parentElement;
            if (toggleRow) {
                toggleRow.style.display = '';
            }
        }
    }

    // ========================================
    // SEARCH FUNCTIONALITY
    // ========================================

    /**
     * Search HDX for road data
     * @returns {Promise<Array>} - Array of available datasets
     */
    async function search() {
        console.log('[GeoAPI] Searching HDX for road data...');

        try {
            const results = await _searchHDX();
            console.log(`[GeoAPI] Found ${results.length} datasets`);
            return results;

        } catch (error) {
            console.error('[GeoAPI] Search error:', error);
            return [];
        }
    }

    /**
     * Search HDX API
     */
    async function _searchHDX() {
        // Use backend proxy to avoid CORS
        const response = await fetch('http://localhost:5000/api/search-hdx', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                country: HDX_CONFIG.country,
                resourceTypes: HDX_CONFIG.resourceTypes,
                query: 'roads'
            })
        });

        if (!response.ok) {
            throw new Error('HDX search failed');
        }

        const data = await response.json();
        return _processHDXResults(data);
    }

    /**
     * Process and filter HDX results
     */
    function _processHDXResults(data) {
        if (!data.results) return [];

        return data.results
            .filter(dataset => {
                // Filter for road-related datasets
                const name = (dataset.name || '').toLowerCase();
                const title = (dataset.title || '').toLowerCase();
                return name.includes('road') || title.includes('road');
            })
            .map(dataset => ({
                id: dataset.id,
                name: dataset.name,
                title: dataset.title,
                description: dataset.notes,
                lastUpdated: dataset.metadata_modified,
                resources: _filterResources(dataset.resources),
                organization: dataset.organization?.title
            }))
            .sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated));
    }

    /**
     * Filter resources by preferred formats
     */
    function _filterResources(resources) {
        if (!resources) return [];

        return resources
            .filter(r => {
                const format = (r.format || '').toLowerCase();
                return HDX_CONFIG.preferredFormats.some(f => format.includes(f));
            })
            .sort((a, b) => {
                // Sort by format preference
                const aFormat = (a.format || '').toLowerCase();
                const bFormat = (b.format || '').toLowerCase();
                const aIndex = HDX_CONFIG.preferredFormats.findIndex(f => aFormat.includes(f));
                const bIndex = HDX_CONFIG.preferredFormats.findIndex(f => bFormat.includes(f));
                return aIndex - bIndex;
            })
            .map(r => ({
                id: r.id,
                name: r.name,
                format: r.format,
                url: r.url,
                size: r.size,
                lastModified: r.last_modified
            }));
    }

    // ========================================
    // STATUS & UTILITIES
    // ========================================

    /**
     * Check if a version is installed
     */
    function isInstalled(versionKey) {
        return !!_installedVersions[versionKey];
    }

    /**
     * Get all installed versions
     */
    function getInstalledVersions() {
        return { ..._installedVersions };
    }

    /**
     * Get version configuration
     */
    function getVersionConfig(versionKey) {
        return VERSION_CONFIG[versionKey] || null;
    }

    /**
     * Get all version configurations
     */
    function getAllVersionConfigs() {
        return { ...VERSION_CONFIG };
    }

    /**
     * Refresh installed versions status from API
     */
    async function refreshStatus() {
        try {
            const response = await fetch('http://localhost:5000/api/check-version');
            if (response.ok) {
                const data = await response.json();
                // Update installed versions based on API response
                for (const version of data.versions || []) {
                    if (version.status === 'in_dashboard') {
                        _installedVersions[version.key] = {
                            folder: version.folder,
                            date: version.date
                        };
                    }
                }
            }
        } catch (error) {
            console.error('[GeoAPI] Status refresh error:', error);
        }
    }

    /**
     * Update Geo-API modal badges after uninstall
     */
    function updateModalBadges() {
        // Find all version cards in the modal
        document.querySelectorAll('.version-card, [data-version]').forEach(card => {
            const versionKey = card.dataset.version;
            if (!versionKey) return;

            const statusBadge = card.querySelector('.status-badge, .version-status');
            const uninstallBtn = card.querySelector('.uninstall-version-btn');
            const installBtn = card.querySelector('.install-version-btn');

            if (isInstalled(versionKey)) {
                if (statusBadge) {
                    statusBadge.textContent = 'In Dashboard';
                    statusBadge.style.background = 'rgba(34, 197, 94, 0.2)';
                    statusBadge.style.color = '#22c55e';
                }
                if (uninstallBtn) uninstallBtn.style.display = '';
                if (installBtn) installBtn.style.display = 'none';
            } else {
                if (statusBadge) {
                    statusBadge.textContent = 'Available';
                    statusBadge.style.background = 'rgba(59, 130, 246, 0.2)';
                    statusBadge.style.color = '#60a5fa';
                }
                if (uninstallBtn) uninstallBtn.style.display = 'none';
                if (installBtn) installBtn.style.display = '';
            }
        });
    }

    // ========================================
    // PUBLIC API
    // ========================================

    return {
        init,
        install,
        uninstall,
        search,
        isInstalled,
        getInstalledVersions,
        getVersionConfig,
        getAllVersionConfigs,
        refreshStatus,
        updateModalBadges,
        VERSION_CONFIG,
        HDX_CONFIG
    };

})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GeoAPI;
}

console.log('[GeoAPI] GeoAPI module fully loaded, typeof GeoAPI =', typeof GeoAPI);
