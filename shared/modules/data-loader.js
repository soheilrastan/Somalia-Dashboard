/**
 * Lazy Data Loader Module
 * Optimizes loading of large GeoJSON files for better initial page load
 *
 * Features:
 * - On-demand loading (only loads data when needed)
 * - Caching (prevents re-downloading same data)
 * - Loading indicators
 * - Error handling with retry
 */

const DataLoader = (function() {
    'use strict';

    // Cache for loaded data
    const cache = new Map();

    // Loading states for UI feedback
    const loadingStates = new Map();

    // Base paths for different data types
    const DATA_PATHS = {
        roads: '../data_warehouse/roads',
        nightlight: '../data_warehouse/nightlight',
        population: '../data_warehouse/population/worldpop_1km/by_year',
        boundaries: '../data_warehouse/core'
    };

    /**
     * Load GeoJSON data with caching
     * @param {string} url - URL to fetch
     * @param {string} cacheKey - Key for caching
     * @returns {Promise<Object>} - GeoJSON data
     */
    async function loadGeoJSON(url, cacheKey) {
        // Return cached data if available
        if (cache.has(cacheKey)) {
            console.log(`[DataLoader] Cache hit: ${cacheKey}`);
            return cache.get(cacheKey);
        }

        // Mark as loading
        loadingStates.set(cacheKey, 'loading');
        dispatchLoadingEvent(cacheKey, 'start');

        try {
            // Add cache-busting parameter
            const cacheBuster = `t=${Date.now()}`;
            const separator = url.includes('?') ? '&' : '?';
            const fetchUrl = `${url}${separator}${cacheBuster}`;

            console.log(`[DataLoader] Fetching: ${cacheKey}`);
            const response = await fetch(fetchUrl);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            // Cache the result
            cache.set(cacheKey, data);
            loadingStates.set(cacheKey, 'loaded');
            dispatchLoadingEvent(cacheKey, 'complete', data);

            console.log(`[DataLoader] Loaded: ${cacheKey} (${data.features?.length || 0} features)`);
            return data;

        } catch (error) {
            loadingStates.set(cacheKey, 'error');
            dispatchLoadingEvent(cacheKey, 'error', null, error);
            console.error(`[DataLoader] Error loading ${cacheKey}:`, error);
            throw error;
        }
    }

    /**
     * Load roads data for a specific region and version
     * @param {string} regionName - Region name (e.g., "Bakool")
     * @param {string} folder - Folder name (e.g., "roads_by_region", "roads_by_region_latest")
     * @returns {Promise<Object>} - GeoJSON data
     */
    async function loadRoads(regionName, folder = 'roads_by_region') {
        const safeRegionName = regionName.replace(/\s+/g, '_');
        const cacheKey = `roads_${folder}_${safeRegionName}`;
        const url = `${DATA_PATHS.roads}/${folder}/${safeRegionName}_roads.geojson`;

        return loadGeoJSON(url, cacheKey);
    }

    /**
     * Load population data for a specific region and year
     * @param {string} regionName - Region name
     * @param {number} year - Year (2015, 2020, 2025, 2030)
     * @returns {Promise<Object>} - GeoJSON data
     */
    async function loadPopulation(regionName, year) {
        const safeRegionName = regionName.replace(/\s+/g, '_');
        const cacheKey = `population_${safeRegionName}_${year}`;
        const url = `${DATA_PATHS.population}/${year}/${safeRegionName}_pop_${year}.geojson`;

        return loadGeoJSON(url, cacheKey);
    }

    /**
     * Preload data for a region (call when region is locked)
     * This loads commonly used data in the background
     * @param {string} regionName - Region name
     */
    function preloadRegionData(regionName) {
        console.log(`[DataLoader] Preloading data for ${regionName}...`);

        // Preload in background (don't await)
        loadRoads(regionName, 'roads_by_region_latest').catch(() => {});
        loadPopulation(regionName, 2025).catch(() => {});
    }

    /**
     * Clear cache for a specific key or all data
     * @param {string} [cacheKey] - Optional key to clear, clears all if not provided
     */
    function clearCache(cacheKey) {
        if (cacheKey) {
            cache.delete(cacheKey);
            loadingStates.delete(cacheKey);
            console.log(`[DataLoader] Cleared cache: ${cacheKey}`);
        } else {
            cache.clear();
            loadingStates.clear();
            console.log('[DataLoader] Cleared all cache');
        }
    }

    /**
     * Get loading state for a cache key
     * @param {string} cacheKey
     * @returns {string} - 'idle', 'loading', 'loaded', or 'error'
     */
    function getLoadingState(cacheKey) {
        return loadingStates.get(cacheKey) || 'idle';
    }

    /**
     * Check if data is cached
     * @param {string} cacheKey
     * @returns {boolean}
     */
    function isCached(cacheKey) {
        return cache.has(cacheKey);
    }

    /**
     * Dispatch custom events for loading state changes
     */
    function dispatchLoadingEvent(cacheKey, state, data = null, error = null) {
        document.dispatchEvent(new CustomEvent('dataLoaderStateChange', {
            detail: { cacheKey, state, data, error }
        }));
    }

    /**
     * Get cache statistics
     * @returns {Object} - Cache stats
     */
    function getCacheStats() {
        let totalSize = 0;
        cache.forEach((data, key) => {
            if (data.features) {
                totalSize += data.features.length;
            }
        });

        return {
            entries: cache.size,
            totalFeatures: totalSize,
            keys: Array.from(cache.keys())
        };
    }

    // Public API
    return {
        loadGeoJSON,
        loadRoads,
        loadPopulation,
        preloadRegionData,
        clearCache,
        getLoadingState,
        isCached,
        getCacheStats,
        DATA_PATHS
    };

})();

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.DataLoader = DataLoader;
}

console.log('[DataLoader] Module initialized');
