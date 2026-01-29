/**
 * R2A Loader - Rendering-2-Analytics Layer Loader
 * Version 4.1
 *
 * Loads lightweight WebP tiles for instant visualization,
 * with invisible hover layer for interaction.
 * Full analytics processed on backend only.
 *
 * Keywords: R2A-SPEED, GEO-INSIGHTS-ARCH
 */

class R2ALoader {
    constructor(map, country) {
        this.map = map;
        this.country = country;
        this.loadedLayers = new Map(); // layerId -> { image, hover, meta }
        this.basePath = `../../data_warehouse/tiles/${country}`;
        this.loadingIndicator = null;

        console.log(`[R2A Loader] Initialized for country: ${country}`);
    }

    /**
     * Show loading indicator
     */
    showLoading(message = 'Loading...') {
        if (this.loadingIndicator) {
            this.hideLoading();
        }

        this.loadingIndicator = document.createElement('div');
        this.loadingIndicator.className = 'r2a-loading';
        this.loadingIndicator.textContent = message;
        document.body.appendChild(this.loadingIndicator);
    }

    /**
     * Hide loading indicator
     */
    hideLoading() {
        if (this.loadingIndicator) {
            document.body.removeChild(this.loadingIndicator);
            this.loadingIndicator = null;
        }
    }

    /**
     * Load a layer tile (WebP + hover overlay)
     * @param {string} region - Region name (e.g., "Bakool")
     * @param {string} layerType - Layer type (e.g., "roads_osm_2024")
     * @returns {Promise<object>} Layer object with image and hover layer
     */
    async loadTile(region, layerType) {
        const layerId = `${region}_${layerType}`;

        // Check if already loaded
        if (this.loadedLayers.has(layerId)) {
            console.log(`[R2A] Layer already loaded: ${layerId}`);
            return this.loadedLayers.get(layerId);
        }

        this.showLoading(`Loading ${layerType}...`);

        try {
            const tilePath = `${this.basePath}/L1/${region}`;

            // 1. Load metadata first
            const metaUrl = `${tilePath}/${layerType}.meta.json`;
            let meta;
            try {
                const metaResponse = await fetch(metaUrl);
                if (!metaResponse.ok) {
                    throw new Error(`Meta not found: ${metaResponse.status}`);
                }
                meta = await metaResponse.json();
            } catch (err) {
                console.warn(`[R2A] Meta not found for ${layerId}, using fallback`);
                // Use region bounds as fallback
                meta = {
                    visualization: {
                        bounds: null, // Will be set from region
                        size_kb: 0
                    },
                    hover: {
                        feature_count: 0
                    }
                };
            }

            // 2. Create WebP image overlay (VISIBLE - instant load)
            const imageUrl = `${tilePath}/${layerType}.webp`;
            let imageOverlay = null;

            // Try to load image
            try {
                const imageResponse = await fetch(imageUrl, { method: 'HEAD' });
                if (imageResponse.ok && meta.visualization.bounds) {
                    imageOverlay = L.imageOverlay(imageUrl, meta.visualization.bounds, {
                        opacity: 0.9,
                        interactive: false,
                        className: 'r2a-tile'
                    });
                }
            } catch (err) {
                console.warn(`[R2A] Image not found for ${layerId}`);
            }

            // 3. Load hover GeoJSON (INVISIBLE - for interaction only)
            const hoverUrl = `${tilePath}/${layerType}.hover.geojson`;
            let hoverLayer = null;

            try {
                const hoverResponse = await fetch(hoverUrl);
                if (hoverResponse.ok) {
                    const hoverData = await hoverResponse.json();
                    hoverLayer = L.geoJSON(hoverData, {
                        style: {
                            fillOpacity: 0,
                            stroke: false,
                            interactive: true
                        },
                        onEachFeature: (feature, layer) => {
                            // Add hover tooltip
                            const name = feature.properties.name
                                || feature.properties.NAME
                                || feature.properties.highway
                                || layerType;

                            if (name) {
                                layer.bindTooltip(name, {
                                    sticky: true,
                                    direction: 'top'
                                });
                            }

                            // Add click handler
                            layer.on('click', (e) => {
                                this.onFeatureClick(feature, e, layerId);
                            });
                        }
                    });
                }
            } catch (err) {
                console.warn(`[R2A] Hover GeoJSON not found for ${layerId}`);
            }

            // 4. Add to map (image first, then hover on top)
            if (imageOverlay) {
                imageOverlay.addTo(this.map);
            }
            if (hoverLayer) {
                hoverLayer.addTo(this.map);
            }

            // 5. Store reference with metadata
            const layerObj = {
                id: layerId,
                image: imageOverlay,
                hover: hoverLayer,
                meta: meta,
                region: region,
                type: layerType,
                upgraded: false
            };
            this.loadedLayers.set(layerId, layerObj);

            this.hideLoading();
            console.log(`[R2A] Loaded ${layerId} (${meta.visualization?.size_kb || 0} KB)`);
            return layerObj;

        } catch (error) {
            this.hideLoading();
            console.error(`[R2A] Failed to load ${layerId}:`, error);
            throw error;
        }
    }

    /**
     * Load a full GeoJSON layer (fallback when tiles not available)
     * @param {string} region - Region name
     * @param {string} layerType - Layer type
     * @param {string} geojsonPath - Path to GeoJSON file
     * @param {Function} styleFunction - Leaflet style function
     * @returns {Promise<object>} Layer object
     */
    async loadGeoJSON(region, layerType, geojsonPath, styleFunction) {
        const layerId = `${region}_${layerType}`;

        if (this.loadedLayers.has(layerId)) {
            console.log(`[R2A] Layer already loaded: ${layerId}`);
            return this.loadedLayers.get(layerId);
        }

        this.showLoading(`Loading ${layerType}...`);

        try {
            const response = await fetch(geojsonPath);
            if (!response.ok) {
                throw new Error(`GeoJSON not found: ${response.status}`);
            }

            const geojsonData = await response.json();

            const layer = L.geoJSON(geojsonData, {
                style: styleFunction,
                onEachFeature: (feature, lyr) => {
                    const name = feature.properties.name
                        || feature.properties.NAME
                        || feature.properties.highway
                        || layerType;

                    if (name) {
                        lyr.bindTooltip(name, {
                            sticky: true,
                            direction: 'top'
                        });
                    }

                    lyr.on('click', (e) => {
                        this.onFeatureClick(feature, e, layerId);
                    });
                }
            });

            layer.addTo(this.map);

            const layerObj = {
                id: layerId,
                image: null,
                hover: null,
                vector: layer,
                meta: {
                    geodata: {
                        feature_count: geojsonData.features?.length || 0
                    }
                },
                region: region,
                type: layerType,
                upgraded: true // Already full vector
            };

            this.loadedLayers.set(layerId, layerObj);

            this.hideLoading();
            console.log(`[R2A] Loaded GeoJSON ${layerId} (${geojsonData.features?.length || 0} features)`);
            return layerObj;

        } catch (error) {
            this.hideLoading();
            console.error(`[R2A] Failed to load GeoJSON ${layerId}:`, error);
            throw error;
        }
    }

    /**
     * Remove a layer
     */
    removeTile(region, layerType) {
        const layerId = `${region}_${layerType}`;
        const layer = this.loadedLayers.get(layerId);

        if (layer) {
            if (layer.image) {
                this.map.removeLayer(layer.image);
            }
            if (layer.hover) {
                this.map.removeLayer(layer.hover);
            }
            if (layer.vector) {
                this.map.removeLayer(layer.vector);
            }
            this.loadedLayers.delete(layerId);
            console.log(`[R2A] Removed ${layerId}`);
            return true;
        }
        return false;
    }

    /**
     * Remove layer by ID
     */
    removeById(layerId) {
        const layer = this.loadedLayers.get(layerId);

        if (layer) {
            if (layer.image) {
                this.map.removeLayer(layer.image);
            }
            if (layer.hover) {
                this.map.removeLayer(layer.hover);
            }
            if (layer.vector) {
                this.map.removeLayer(layer.vector);
            }
            this.loadedLayers.delete(layerId);
            console.log(`[R2A] Removed ${layerId}`);
            return true;
        }
        return false;
    }

    /**
     * Remove all layers
     */
    removeAll() {
        this.loadedLayers.forEach((layer, layerId) => {
            if (layer.image) {
                this.map.removeLayer(layer.image);
            }
            if (layer.hover) {
                this.map.removeLayer(layer.hover);
            }
            if (layer.vector) {
                this.map.removeLayer(layer.vector);
            }
        });
        this.loadedLayers.clear();
        console.log('[R2A] All layers removed');
    }

    /**
     * Handle feature click
     */
    onFeatureClick(feature, event, layerId) {
        console.log('[R2A] Feature clicked:', feature.properties);

        // Dispatch custom event for external handlers
        document.dispatchEvent(new CustomEvent('r2a:featureClick', {
            detail: {
                feature: feature,
                layerId: layerId,
                latlng: event.latlng
            }
        }));
    }

    /**
     * Get all loaded layers for analytics
     */
    getLayersForAnalytics() {
        return Array.from(this.loadedLayers.values()).map(layer => ({
            id: layer.id,
            geodataPath: layer.meta?.geodata?.path || null,
            type: layer.type,
            region: layer.region,
            featureCount: layer.meta?.geodata?.feature_count
                || layer.meta?.hover?.feature_count
                || 0
        }));
    }

    /**
     * Check if a layer is loaded
     */
    hasLayer(region, layerType) {
        const layerId = `${region}_${layerType}`;
        return this.loadedLayers.has(layerId);
    }

    /**
     * Get a loaded layer
     */
    getLayer(region, layerType) {
        const layerId = `${region}_${layerType}`;
        return this.loadedLayers.get(layerId);
    }

    /**
     * Upgrade to full vector (for power users who need editing)
     */
    async upgradeToVector(region, layerType) {
        const layerId = `${region}_${layerType}`;
        const layer = this.loadedLayers.get(layerId);

        if (!layer) {
            console.error(`[R2A] Layer ${layerId} not found`);
            return null;
        }

        if (layer.upgraded) {
            console.log(`[R2A] Layer ${layerId} already upgraded`);
            return layer.vector;
        }

        this.showLoading(`Loading full vector data for ${layerType}...`);

        try {
            // Fetch full GeoJSON from backend
            const fullDataUrl = `/api/geodata/${this.country}/${region}/${layerType}`;
            const response = await fetch(fullDataUrl);

            if (!response.ok) {
                throw new Error(`Full data not available: ${response.status}`);
            }

            const fullData = await response.json();

            // Remove image and hover layers
            if (layer.image) {
                this.map.removeLayer(layer.image);
            }
            if (layer.hover) {
                this.map.removeLayer(layer.hover);
            }

            // Create full vector layer
            const vectorLayer = L.geoJSON(fullData, {
                onEachFeature: (feature, lyr) => {
                    lyr.bindPopup(this.generatePopupContent(feature));
                }
            });
            vectorLayer.addTo(this.map);

            // Update stored reference
            layer.vector = vectorLayer;
            layer.upgraded = true;

            this.hideLoading();
            console.log(`[R2A] Upgraded ${layerId} to full vector`);
            return vectorLayer;

        } catch (error) {
            this.hideLoading();
            console.error(`[R2A] Failed to upgrade ${layerId}:`, error);
            return null;
        }
    }

    /**
     * Generate popup content for a feature
     */
    generatePopupContent(feature) {
        const props = feature.properties;
        let content = '<div class="popup-body">';

        for (const [key, value] of Object.entries(props)) {
            if (value !== null && value !== undefined && key !== 'geometry') {
                content += `
                    <div class="popup-metric">
                        <span class="metric-label">${key}:</span>
                        <span class="metric-value">${value}</span>
                    </div>
                `;
            }
        }

        content += '</div>';
        return content;
    }

    /**
     * Get statistics about loaded layers
     */
    getStats() {
        let totalSize = 0;
        let totalFeatures = 0;

        this.loadedLayers.forEach(layer => {
            totalSize += layer.meta?.visualization?.size_kb || 0;
            totalFeatures += layer.meta?.hover?.feature_count || layer.meta?.geodata?.feature_count || 0;
        });

        return {
            layerCount: this.loadedLayers.size,
            totalSizeKB: totalSize,
            totalFeatures: totalFeatures,
            layers: Array.from(this.loadedLayers.keys())
        };
    }
}

// Export for use in other modules
window.R2ALoader = R2ALoader;

console.log('[R2A Loader] Module loaded');
