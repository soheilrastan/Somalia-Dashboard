        // VERSION 3.1 - Region-First Analysis Workflow (2026-01-26)
        console.log('🚀 Dashboard v3.1: Region-First Analysis Workflow');

        // ========================================
        // REGION-FIRST ANALYSIS STATE MANAGEMENT
        // ========================================
        // User must select (lock) a region before any layer operations
        // This prevents map overload and ensures focused analysis

        const regionLockState = {
            isLocked: false,
            lockedRegion: null,        // Region name (e.g., "Bakool")
            lockedRegionLayer: null,   // Leaflet layer reference
            loadedLayers: [],          // Track layers loaded for this region: [{name, layer, type}]

            // Lock a region
            lock: function(regionName, regionLayer) {
                this.isLocked = true;
                this.lockedRegion = regionName;
                this.lockedRegionLayer = regionLayer;
                this.loadedLayers = [];
                console.log(`🔒 Region locked: ${regionName}`);

                // Dispatch custom event for UI updates
                document.dispatchEvent(new CustomEvent('regionLocked', {
                    detail: { region: regionName, layer: regionLayer }
                }));
            },

            // Unlock region and clear all layers
            unlock: function() {
                const previousRegion = this.lockedRegion;

                // Remove all loaded layers from map
                this.loadedLayers.forEach(layerInfo => {
                    if (layerInfo.layer && map.hasLayer(layerInfo.layer)) {
                        map.removeLayer(layerInfo.layer);
                    }
                });

                // Reset state
                this.isLocked = false;
                this.lockedRegion = null;
                this.lockedRegionLayer = null;
                this.loadedLayers = [];

                // Reset iSEE Analytics (clear cached results and modal)
                if (typeof window.resetISEEAnalytics === 'function') {
                    window.resetISEEAnalytics();
                }

                console.log(`🔓 Region unlocked: ${previousRegion} - All layers cleared`);

                // Dispatch custom event for UI updates
                document.dispatchEvent(new CustomEvent('regionUnlocked', {
                    detail: { previousRegion: previousRegion }
                }));

                return previousRegion;
            },

            // Register a layer as loaded for current region
            addLayer: function(name, layer, type) {
                if (!this.isLocked) return false;
                this.loadedLayers.push({ name, layer, type });
                console.log(`📍 Layer added to ${this.lockedRegion}: ${name}`);
                return true;
            },

            // Remove a specific layer
            removeLayer: function(name) {
                const idx = this.loadedLayers.findIndex(l => l.name === name);
                if (idx !== -1) {
                    const layerInfo = this.loadedLayers[idx];
                    if (layerInfo.layer && map.hasLayer(layerInfo.layer)) {
                        map.removeLayer(layerInfo.layer);
                    }
                    this.loadedLayers.splice(idx, 1);
                    console.log(`🗑️ Layer removed: ${name}`);

                    // Reset iSEE Analytics when layers change (invalidate cached results)
                    if (typeof window.resetISEEAnalytics === 'function') {
                        window.resetISEEAnalytics();
                    }

                    return true;
                }
                return false;
            },

            // Check if a specific layer is loaded
            hasLayer: function(name) {
                return this.loadedLayers.some(l => l.name === name);
            },

            // Get list of loaded layer names
            getLoadedLayerNames: function() {
                return this.loadedLayers.map(l => l.name);
            }
        };

        // Mobile detection and initial setup
        const isMobile = window.innerWidth <= 767;
        const isTablet = window.innerWidth > 767 && window.innerWidth <= 1024;

        const map = L.map('map').setView([5.5, 46.2], isMobile ? 5 : 6);

        // Define base layers
        const darkMap = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap &copy; CARTO',
            subdomains: 'abcd',
            maxZoom: 20
        });

        // High-resolution satellite imagery from Google
        const satelliteMap = L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
            attribution: '&copy; Google &copy; Maxar &copy; CNES/Airbus',
            maxZoom: 22,  // Higher zoom level for detailed imagery
            subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
        });

        // Add dark map by default
        darkMap.addTo(map);

        // Track current base layer
        let currentBaseLayer = 'dark';

        function getMPIColor(mpi) {
            if (mpi >= 90) return '#7f1d1d';
            if (mpi >= 80) return '#991b1b';
            if (mpi >= 70) return '#b91c1c';
            if (mpi >= 60) return '#dc2626';
            if (mpi >= 50) return '#f97316';
            if (mpi >= 40) return '#f59e0b';
            if (mpi >= 30) return '#eab308';
            if (mpi >= 20) return '#84cc16';
            if (mpi >= 10) return '#22c55e';
            return '#047857';
        }

        // Purple to Yellow gradient for nightlight (matching uploaded image)
        function getNightlightColor(value) {
            // Normalize value to 0-1 range (assuming max is around 6.5)
            const normalized = Math.min(value / 6.5, 1.0);
            
            // Purple (low) to Yellow (high) gradient
            if (normalized <= 0.1) return '#1e1b4b';      // Very dark purple
            if (normalized <= 0.2) return '#4c1d95';      // Dark purple
            if (normalized <= 0.3) return '#7c3aed';      // Purple
            if (normalized <= 0.4) return '#a855f7';      // Light purple
            if (normalized <= 0.5) return '#c084fc';      // Very light purple
            if (normalized <= 0.6) return '#e879f9';      // Pink-purple
            if (normalized <= 0.7) return '#f472b6';      // Pink
            if (normalized <= 0.8) return '#fb923c';      // Orange
            if (normalized <= 0.9) return '#fbbf24';      // Yellow-orange
            return '#fde047';                             // Bright yellow
        }

        function getNightlightRadius(value) {
            if (value >= 5.0) return 6;
            if (value >= 2.0) return 5;
            if (value >= 1.0) return 4;
            if (value >= 0.5) return 3;
            return 2;
        }

        const regions = [
            {
                        "name": "Bakool",
                        "centroid": [
                                    4.205215058488971,
                                    43.950761230419076
                        ],
                        "mpi": 67
            },
            {
                        "name": "Gedo",
                        "centroid": [
                                    2.896358811116855,
                                    41.97794111652447
                        ],
                        "mpi": 54
            },
            {
                        "name": "Bay",
                        "centroid": [
                                    2.653014246276444,
                                    43.5664420214466
                        ],
                        "mpi": 54
            },
            {
                        "name": "Hiiraan",
                        "centroid": [
                                    4.223902020510925,
                                    45.471088875158095
                        ],
                        "mpi": 52
            },
            {
                        "name": "Middle Juba",
                        "centroid": [
                                    1.2266639437167177,
                                    42.53705440569225
                        ],
                        "mpi": 52
            },
            {
                        "name": "Lower Juba",
                        "centroid": [
                                    0.08566605270127303,
                                    41.8003224479673
                        ],
                        "mpi": 52
            },
            {
                        "name": "Middle Shebelle",
                        "centroid": [
                                    3.0215407394562375,
                                    46.01026115683792
                        ],
                        "mpi": 48
            },
            {
                        "name": "Mudug",
                        "centroid": [
                                    6.382638850271858,
                                    48.14055070382488
                        ],
                        "mpi": 39
            },
            {
                        "name": "Sanaag",
                        "centroid": [
                                    10.304667116815883,
                                    47.68170883784371
                        ],
                        "mpi": 36
            },
            {
                        "name": "Sool",
                        "centroid": [
                                    8.962469250740039,
                                    47.56422222316908
                        ],
                        "mpi": 34
            },
            {
                        "name": "Galgaduud",
                        "centroid": [
                                    5.1275676761931,
                                    46.74528416028684
                        ],
                        "mpi": 34
            },
            {
                        "name": "Banadir",
                        "centroid": [
                                    2.1095330612867316,
                                    45.424370972713525
                        ],
                        "mpi": 33
            },
            {
                        "name": "Nugaal",
                        "centroid": [
                                    8.108008811164744,
                                    48.91074435494933
                        ],
                        "mpi": 31
            },
            {
                        "name": "Bari",
                        "centroid": [
                                    10.219797011428428,
                                    50.049197181597194
                        ],
                        "mpi": 30
            },
            {
                        "name": "Togdheer",
                        "centroid": [
                                    9.108337689103951,
                                    45.72572376833259
                        ],
                        "mpi": 29
            },
            {
                        "name": "Woqooyi Galbeed",
                        "centroid": [
                                    9.879180997499015,
                                    44.55625307974828
                        ],
                        "mpi": 27
            },
            {
                        "name": "Lower Shebelle",
                        "centroid": [
                                    1.9042050934647232,
                                    44.326022703790315
                        ],
                        "mpi": 23
            },
            {
                        "name": "Awdal",
                        "centroid": [
                                    10.572749834053983,
                                    43.37616762243028
                        ],
                        "mpi": 23
            }
];

        const mpiLayer = L.layerGroup();
        const nightlightLayer = L.layerGroup();
        const mpiMarkers = []; // Store MPI markers for opacity control

        // Add MPI circles
        regions.forEach(region => {
            const color = getMPIColor(region.mpi);
            const marker = L.circleMarker(region.centroid, {
                radius: 10, fillColor: color, color: 'white',
                weight: 2.5, opacity: 1, fillOpacity: 1.0
            });
            mpiMarkers.push(marker); // Store reference to marker
            
            marker.bindTooltip(`${region.name}: MPI ${region.mpi}`, {
                permanent: false, direction: 'top', offset: [0, -10]
            });
            
            marker.bindPopup(`
                <div class="popup-header" style="background: ${color};">${region.name}</div>
                <div class="popup-body">
                    <div class="popup-metric">
                        <span class="metric-label">📊 MPI:</span>
                        <span class="metric-value" style="color: ${color};">${region.mpi}</span>
                    </div>
                    <div class="source-link">
                        📋 <a href="https://ophi.org.uk/sites/default/files/2024-12/Somalia_MPI_report_2024.pdf" target="_blank">OPHI MPI Report 2024</a>
                    </div>
                </div>
            `, {
                maxWidth: 300,
                autoPan: false,
                className: 'fixed-right-popup'
            });
            
            marker.addTo(mpiLayer);
        });

        // Add nightlight vector points with purple-to-yellow gradient
        console.log(`Loading ${nightlightData.points.length} nightlight points (purple-yellow gradient)...`);
        
        nightlightData.points.forEach((point, idx) => {
            const color = getNightlightColor(point.value);
            const radius = getNightlightRadius(point.value);
            
            const marker = L.circleMarker([point.lat, point.lon], {
                radius: radius,
                fillColor: color,
                color: color,
                weight: 1,
                opacity: 0.8,
                fillOpacity: 0.7
            });
            
            marker.bindTooltip(`${point.value.toFixed(2)} nW`, {
                permanent: false,
                direction: 'top',
                offset: [0, -5]
            });
            
            marker.bindPopup(`
                <div class="popup-header" style="background: ${color}; color: ${point.value > 3 ? '#1a1a2e' : 'white'};">💡 Nightlight Point</div>
                <div class="popup-body">
                    <div class="popup-metric">
                        <span class="metric-label">💡 Radiance:</span>
                        <span class="metric-value">${point.value.toFixed(2)} nW/cm²/sr</span>
                    </div>
                    <div class="popup-metric">
                        <span class="metric-label">📍 Location:</span>
                        <span class="metric-value" style="font-size: 0.85em;">${point.lat.toFixed(4)}°N, ${point.lon.toFixed(4)}°E</span>
                    </div>
                    <div class="popup-metric">
                        <span class="metric-label">📏 Grid Center:</span>
                        <span class="metric-value">500m × 500m</span>
                    </div>
                    <div class="source-link">
                        📋 <a href="https://eogdata.mines.edu/products/vnl/" target="_blank">VIIRS Nightlight 2023-2024</a>
                    </div>
                </div>
            `, {
                maxWidth: 300,
                autoPan: false,
                className: 'fixed-right-popup'
            });
            
            marker.addTo(nightlightLayer);
        });
        
        console.log('✓ Nightlight points loaded with purple-yellow gradient');

        // mpiLayer not added by default - user must check it
        // nightlightLayer not added by default - user must check it

        const detailedNLBakool2022 = L.layerGroup();
        const detailedNLBakool2023 = L.layerGroup();
        const detailedNLLS = L.layerGroup();

        // Add Bakool detailed nightlight 2022 (500m polygons with classification)
        console.log(`Loading ${bakoolNightlightPolygons2022.features.length} Bakool nightlight polygons (2022)...`);

        L.geoJSON(bakoolNightlightPolygons2022, {
            style: function(feature) {
                return {
                    fillColor: feature.properties.color,
                    color: feature.properties.color,
                    weight: 1,
                    opacity: 0.8,
                    fillOpacity: 0.7
                };
            },
            onEachFeature: function(feature, layer) {
                const props = feature.properties;

                layer.bindTooltip(`${props.value.toFixed(2)} nW (2022) - ${props.label}`, {
                    permanent: false,
                    direction: 'top',
                    offset: [0, -5]
                });

                layer.bindPopup(`
                    <div class="popup-header" style="background: ${props.color}; color: white;">💡 Nightlight 2022</div>
                    <div class="popup-body">
                        <div class="popup-metric">
                            <span class="metric-label">💡 Radiance:</span>
                            <span class="metric-value">${props.value.toFixed(3)} nW/cm²/sr</span>
                        </div>
                        <div class="popup-metric">
                            <span class="metric-label">🏷️ Category:</span>
                            <span class="metric-value">${props.category}</span>
                        </div>
                        <div class="popup-metric">
                            <span class="metric-label">📅 Year:</span>
                            <span class="metric-value">2022</span>
                        </div>
                        <div class="popup-metric">
                            <span class="metric-label">📍 Location:</span>
                            <span class="metric-value" style="font-size: 0.85em;">${props.lat.toFixed(4)}°N, ${props.lon.toFixed(4)}°E</span>
                        </div>
                        <div class="popup-metric">
                            <span class="metric-label">📏 Grid:</span>
                            <span class="metric-value">${props.grid_size}</span>
                        </div>
                        <div class="popup-metric">
                            <span class="metric-label">🗺️ Region:</span>
                            <span class="metric-value">Bakool</span>
                        </div>
                        <div class="source-link">
                            📋 <a href="https://developers.google.com/earth-engine/datasets/catalog/NOAA_VIIRS_DNB_ANNUAL_V22" target="_blank">VIIRS DNB Annual 2022</a>
                        </div>
                    </div>
                `, {
                    maxWidth: 300,
                    autoPan: false,
                    className: 'fixed-right-popup'
                });
            }
        }).addTo(detailedNLBakool2022);

        console.log('Bakool 2022 nightlight polygons loaded');

        // Add Bakool detailed nightlight 2023 (500m polygons with classification)
        console.log(`Loading ${bakoolNightlightPolygons2023.features.length} Bakool nightlight polygons (2023)...`);

        L.geoJSON(bakoolNightlightPolygons2023, {
            style: function(feature) {
                return {
                    fillColor: feature.properties.color,
                    color: feature.properties.color,
                    weight: 1,
                    opacity: 0.8,
                    fillOpacity: 0.7
                };
            },
            onEachFeature: function(feature, layer) {
                const props = feature.properties;

                layer.bindTooltip(`${props.value.toFixed(2)} nW (2023) - ${props.label}`, {
                    permanent: false,
                    direction: 'top',
                    offset: [0, -5]
                });

                layer.bindPopup(`
                    <div class="popup-header" style="background: ${props.color}; color: white;">💡 Nightlight 2023</div>
                    <div class="popup-body">
                        <div class="popup-metric">
                            <span class="metric-label">💡 Radiance:</span>
                            <span class="metric-value">${props.value.toFixed(3)} nW/cm²/sr</span>
                        </div>
                        <div class="popup-metric">
                            <span class="metric-label">🏷️ Category:</span>
                            <span class="metric-value">${props.category}</span>
                        </div>
                        <div class="popup-metric">
                            <span class="metric-label">📅 Year:</span>
                            <span class="metric-value">2023</span>
                        </div>
                        <div class="popup-metric">
                            <span class="metric-label">📍 Location:</span>
                            <span class="metric-value" style="font-size: 0.85em;">${props.lat.toFixed(4)}°N, ${props.lon.toFixed(4)}°E</span>
                        </div>
                        <div class="popup-metric">
                            <span class="metric-label">📏 Grid:</span>
                            <span class="metric-value">${props.grid_size}</span>
                        </div>
                        <div class="popup-metric">
                            <span class="metric-label">🗺️ Region:</span>
                            <span class="metric-value">Bakool</span>
                        </div>
                        <div class="source-link">
                            📋 <a href="https://developers.google.com/earth-engine/datasets/catalog/NOAA_VIIRS_DNB_ANNUAL_V22" target="_blank">VIIRS DNB Annual 2023</a>
                        </div>
                    </div>
                `, {
                    maxWidth: 300,
                    autoPan: false,
                    className: 'fixed-right-popup'
                });
            }
        }).addTo(detailedNLBakool2023);

        console.log('Bakool 2023 nightlight polygons loaded');

        // Add Somalia ADM1 (regional) boundaries - thicker lines
        let selectedRegion = null;  // Track selected region (visual only, not lock)

        // Define styles for region states
        const regionStyles = {
            default: {
                color: '#94a3b8',
                weight: 2.5,
                opacity: 0.7,
                fillOpacity: 0,
                dashArray: '5, 5'
            },
            hover: {
                color: '#60a5fa',
                weight: 3,
                opacity: 0.9,
                fillColor: '#60a5fa',
                fillOpacity: 0.05
            },
            locked: {
                color: '#22c55e',
                weight: 4,
                opacity: 1,
                fillColor: '#22c55e',
                fillOpacity: 0.15,
                dashArray: null
            },
            lockedPulse: {
                color: '#4ade80',
                weight: 5,
                opacity: 1,
                fillColor: '#22c55e',
                fillOpacity: 0.2,
                dashArray: null
            }
        };

        const adm1Layer = L.geoJSON(adm1Boundaries, {
            style: function(feature) {
                return regionStyles.default;
            },
            onEachFeature: function(feature, layer) {
                const regionName = feature.properties.name;

                // Hover tooltip - shows different message based on lock state
                layer.bindTooltip('', {
                    permanent: false,
                    direction: 'center',
                    className: 'region-tooltip'
                });

                // Update tooltip on hover
                layer.on('mouseover', function(e) {
                    if (regionLockState.isLocked) {
                        if (regionLockState.lockedRegion === regionName) {
                            layer.setTooltipContent(`${regionName} Region (LOCKED - Right-click to manage)`);
                        } else {
                            layer.setTooltipContent(`${regionName} Region (Unlock current region first)`);
                        }
                    } else {
                        layer.setTooltipContent(`Click to select ${regionName} for analysis`);
                    }

                    // Hover highlight only if not locked or is the locked region
                    if (!regionLockState.isLocked) {
                        layer.setStyle(regionStyles.hover);
                    }
                });

                layer.on('mouseout', function(e) {
                    if (!regionLockState.isLocked) {
                        layer.setStyle(regionStyles.default);
                    } else if (regionLockState.lockedRegion === regionName) {
                        layer.setStyle(regionStyles.locked);
                    }
                });

                // Click event - REGION LOCKING
                layer.on('click', function(e) {
                    L.DomEvent.stopPropagation(e);

                    const props = feature.properties;

                    // If already locked to this region, show info popup
                    if (regionLockState.isLocked && regionLockState.lockedRegion === regionName) {
                        const loadedLayersList = regionLockState.loadedLayers.length > 0
                            ? regionLockState.loadedLayers.map(l => `• ${l.name}`).join('<br>')
                            : '<em>No layers loaded yet</em>';

                        L.popup()
                            .setLatLng(e.latlng)
                            .setContent(`
                                <div class="popup-header" style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);">
                                    🔒 ${props.name} (Locked)
                                </div>
                                <div class="popup-body">
                                    <div class="popup-metric">
                                        <span class="metric-label">📏 Area:</span>
                                        <span class="metric-value">${Math.round(props.area_km2).toLocaleString()} km²</span>
                                    </div>
                                    <div class="popup-metric">
                                        <span class="metric-label">📊 Loaded Layers:</span>
                                    </div>
                                    <div style="margin-left: 10px; font-size: 0.85em; color: #94a3b8;">
                                        ${loadedLayersList}
                                    </div>
                                    <div style="margin-top: 12px; padding: 8px; background: rgba(34, 197, 94, 0.15); border-left: 3px solid #22c55e; border-radius: 5px; font-size: 0.8em;">
                                        <strong>Tip:</strong> Right-click to manage layers or unlock
                                    </div>
                                </div>
                            `)
                            .openOn(map);
                        return;
                    }

                    // If locked to different region, show warning
                    if (regionLockState.isLocked && regionLockState.lockedRegion !== regionName) {
                        L.popup({
                            className: 'region-locked-warning-popup'
                        })
                            .setLatLng(e.latlng)
                            .setContent(`
                                <div class="popup-header" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">
                                    ⚠️ Region Locked
                                </div>
                                <div class="popup-body">
                                    <p style="margin: 0 0 10px 0;">
                                        <strong>${regionLockState.lockedRegion}</strong> is currently selected for analysis.
                                    </p>
                                    <p style="margin: 0; font-size: 0.85em; color: #94a3b8;">
                                        Right-click on ${regionLockState.lockedRegion} to unlock before selecting ${regionName}.
                                    </p>
                                </div>
                            `)
                            .openOn(map);
                        return;
                    }

                    // Not locked - LOCK THIS REGION
                    // Reset all region styles first
                    adm1Layer.eachLayer(function(l) {
                        l.setStyle(regionStyles.default);
                    });

                    // Apply locked style
                    layer.setStyle(regionStyles.locked);

                    // Lock the region
                    regionLockState.lock(regionName, layer);

                    // Zoom to region
                    map.fitBounds(layer.getBounds(), {
                        padding: [50, 50],
                        maxZoom: 9
                    });

                    // Show confirmation popup
                    L.popup({
                        className: 'region-locked-popup'
                    })
                        .setLatLng(e.latlng)
                        .setContent(`
                            <div class="popup-header" style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);">
                                🔒 ${props.name} Selected
                            </div>
                            <div class="popup-body">
                                <div class="popup-metric">
                                    <span class="metric-label">📏 Area:</span>
                                    <span class="metric-value">${Math.round(props.area_km2).toLocaleString()} km²</span>
                                </div>
                                <div class="popup-metric">
                                    <span class="metric-label">📊 % of Somalia:</span>
                                    <span class="metric-value">${props.area_percent}%</span>
                                </div>
                                <div style="margin-top: 12px; padding: 10px; background: rgba(34, 197, 94, 0.15); border-left: 3px solid #22c55e; border-radius: 5px; font-size: 0.85em;">
                                    <strong>✓ Region locked for analysis!</strong><br>
                                    <span style="color: #94a3b8;">Now drag layers from the sidebar onto this region.</span>
                                </div>
                            </div>
                        `)
                        .openOn(map);

                    // Enable drag-drop indicators
                    updateDragDropState(true);
                });

                // Right-click context menu
                layer.on('contextmenu', function(e) {
                    L.DomEvent.stopPropagation(e);
                    L.DomEvent.preventDefault(e);

                    // Only show context menu if this is the locked region
                    if (regionLockState.isLocked && regionLockState.lockedRegion === regionName) {
                        showRegionContextMenu(e.latlng, regionName, layer);
                    } else if (!regionLockState.isLocked) {
                        // If not locked, show hint to click first
                        L.popup()
                            .setLatLng(e.latlng)
                            .setContent(`
                                <div style="padding: 8px; font-size: 0.9em;">
                                    Click to select <strong>${regionName}</strong> for analysis first.
                                </div>
                            `)
                            .openOn(map);
                    }
                });
            }
        });

        adm1Layer.addTo(map);

        // ========================================
        // GLOBAL CONTEXT MENU BLOCKER
        // ========================================
        // Block browser's default context menu on the entire map
        // This ensures our custom context menu always shows instead

        map.on('contextmenu', function(e) {
            L.DomEvent.preventDefault(e);
            L.DomEvent.stopPropagation(e);

            // If a region is locked, check if click is on the locked region
            if (regionLockState.isLocked && regionLockState.lockedRegionLayer) {
                const clickPoint = e.latlng;

                // Check if click is inside the locked region
                if (isPointInLockedRegion(clickPoint)) {
                    // Show the full context menu for the locked region
                    showRegionContextMenu(clickPoint, regionLockState.lockedRegion, regionLockState.lockedRegionLayer);
                } else {
                    // Clicked outside locked region - show hint
                    L.popup({
                        className: 'context-hint-popup',
                        closeButton: false,
                        autoClose: true
                    })
                    .setLatLng(clickPoint)
                    .setContent(`
                        <div style="padding: 8px; font-size: 0.9em; text-align: center;">
                            <span style="color: #f59e0b;">⚠️</span> Right-click on <strong>${regionLockState.lockedRegion}</strong> for options
                        </div>
                    `)
                    .openOn(map);

                    setTimeout(() => map.closePopup(), 2000);
                }
            } else {
                // No region locked - show hint to select a region
                L.popup({
                    className: 'context-hint-popup',
                    closeButton: false,
                    autoClose: true
                })
                .setLatLng(e.latlng)
                .setContent(`
                    <div style="padding: 8px; font-size: 0.9em; text-align: center;">
                        <span style="color: #3b82f6;">💡</span> Click on a region first to select it
                    </div>
                `)
                .openOn(map);

                setTimeout(() => map.closePopup(), 2000);
            }
        });

        // Also block on the map container DOM element
        map.getContainer().addEventListener('contextmenu', function(e) {
            e.preventDefault();
            e.stopPropagation();
            return false;
        });

        // ========================================
        // CONTEXT MENU FOR LOCKED REGION
        // ========================================
        let contextMenuPopup = null;

        function showRegionContextMenu(latlng, regionName, regionLayer) {
            // Build layer list HTML
            let layerListHTML = '';
            if (regionLockState.loadedLayers.length > 0) {
                layerListHTML = regionLockState.loadedLayers.map((layerInfo, idx) => `
                    <div class="context-menu-item" data-action="remove-layer" data-layer-name="${layerInfo.name}" style="padding: 6px 12px; cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
                        <span>📍 ${layerInfo.name}</span>
                        <span style="color: #ef4444; font-size: 0.85em;">✕ Remove</span>
                    </div>
                `).join('');
            } else {
                layerListHTML = '<div style="padding: 8px 12px; color: #6b7280; font-style: italic;">No layers loaded</div>';
            }

            const menuContent = `
                <div class="region-context-menu" style="min-width: 220px;">
                    <div style="padding: 10px 12px; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: white; font-weight: 600; border-radius: 8px 8px 0 0;">
                        🔒 ${regionName}
                    </div>

                    <div style="border-bottom: 1px solid #374151; padding: 4px 0;">
                        <div style="padding: 6px 12px; color: #9ca3af; font-size: 0.75em; text-transform: uppercase;">Loaded Layers</div>
                        ${layerListHTML}
                    </div>

                    <div class="context-menu-item" data-action="isee-analytics" style="padding: 10px 12px; cursor: pointer; border-bottom: 1px solid #374151;">
                        📊 iSEE Analytics
                    </div>

                    <div class="context-menu-item" data-action="remove-all" style="padding: 10px 12px; cursor: pointer; color: #f59e0b; border-bottom: 1px solid #374151;">
                        🗑️ Remove All Layers
                    </div>

                    <div class="context-menu-item" data-action="unlock" style="padding: 10px 12px; cursor: pointer; color: #ef4444;">
                        🔓 Unlock Region
                    </div>
                </div>
            `;

            // Close existing context menu
            if (contextMenuPopup) {
                map.closePopup(contextMenuPopup);
            }

            contextMenuPopup = L.popup({
                closeButton: true,
                className: 'context-menu-popup',
                maxWidth: 280,
                autoPan: true
            })
                .setLatLng(latlng)
                .setContent(menuContent)
                .openOn(map);

            // Add click handlers after popup is added to DOM
            setTimeout(() => {
                const menuItems = document.querySelectorAll('.context-menu-item');
                menuItems.forEach(item => {
                    item.addEventListener('click', function(e) {
                        const action = this.dataset.action;

                        if (action === 'remove-layer') {
                            const layerName = this.dataset.layerName;
                            regionLockState.removeLayer(layerName);
                            // Refresh menu
                            showRegionContextMenu(latlng, regionName, regionLayer);
                        } else if (action === 'isee-analytics') {
                            map.closePopup(contextMenuPopup);
                            // Trigger iSEE Analytics for this region
                            triggerISEEAnalytics(regionName, regionLayer);
                        } else if (action === 'remove-all') {
                            // Remove all layers
                            const layerNames = [...regionLockState.loadedLayers.map(l => l.name)];
                            layerNames.forEach(name => regionLockState.removeLayer(name));
                            // Refresh menu
                            showRegionContextMenu(latlng, regionName, regionLayer);
                        } else if (action === 'unlock') {
                            map.closePopup(contextMenuPopup);
                            unlockRegion();
                        }
                    });

                    // Hover effect
                    item.addEventListener('mouseenter', function() {
                        this.style.background = 'rgba(255,255,255,0.1)';
                    });
                    item.addEventListener('mouseleave', function() {
                        this.style.background = 'transparent';
                    });
                });
            }, 50);
        }

        // Unlock region function
        function unlockRegion() {
            if (!regionLockState.isLocked) return;

            const previousRegion = regionLockState.lockedRegion;
            const previousLayer = regionLockState.lockedRegionLayer;

            // Unlock and clear
            regionLockState.unlock();

            // Reset visual style
            if (previousLayer) {
                previousLayer.setStyle(regionStyles.default);
            }

            // Reset all checkbox states in layer controls
            resetLayerCheckboxes();

            // Disable drag-drop indicators
            updateDragDropState(false);

            // Zoom out to full Somalia view
            map.setView([5.5, 46.2], 6);

            // Show confirmation
            L.popup()
                .setLatLng(map.getCenter())
                .setContent(`
                    <div style="padding: 12px; text-align: center;">
                        <div style="font-size: 1.5em; margin-bottom: 8px;">🔓</div>
                        <strong>${previousRegion}</strong> unlocked<br>
                        <span style="color: #6b7280; font-size: 0.85em;">All layers cleared. Select a new region to continue.</span>
                    </div>
                `)
                .openOn(map);
        }

        // Helper to reset checkboxes when unlocking
        function resetLayerCheckboxes() {
            const checkboxIds = [
                'bakool2022Toggle', 'bakool2023Toggle', 'iseeAnalyticsToggle',
                'roadsOSMToggle', 'roadsOSMLatestToggle', 'roads2024Toggle'
            ];
            checkboxIds.forEach(id => {
                const checkbox = document.getElementById(id);
                if (checkbox) checkbox.checked = false;
            });

            // Remove layer-dropped classes
            const labels = document.querySelectorAll('.layer-dropped');
            labels.forEach(label => label.classList.remove('layer-dropped'));
        }

        // Update drag-drop visual state
        function updateDragDropState(enabled) {
            const draggableLabels = document.querySelectorAll('[draggable="true"]');
            draggableLabels.forEach(label => {
                if (enabled) {
                    label.classList.remove('drag-disabled');
                    label.style.opacity = '1';
                } else {
                    label.classList.add('drag-disabled');
                    label.style.opacity = '0.5';
                }
            });
        }

        // iSEE Analytics trigger from context menu
        // Note: Full implementation is inside setTimeout where all layer refs are available
        // This placeholder will be replaced by the real function inside setTimeout
        var triggerISEEAnalyticsImpl = null;

        function triggerISEEAnalytics(regionName, regionLayer) {
            console.log(`[iSEE] Triggering analytics for ${regionName}`);
            if (triggerISEEAnalyticsImpl) {
                triggerISEEAnalyticsImpl(regionName, regionLayer);
            } else {
                console.error('[iSEE] Analytics implementation not yet loaded');
                alert('Please wait for the dashboard to fully load before running analytics.');
            }
        }

        // ========================================
        // DRAG-DROP WARNING FUNCTIONS
        // ========================================

        // Show warning when no region is selected
        function showSelectRegionWarning() {
            L.popup({
                className: 'region-locked-warning-popup'
            })
                .setLatLng(map.getCenter())
                .setContent(`
                    <div class="popup-header" style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);">
                        📍 Select a Region First
                    </div>
                    <div class="popup-body">
                        <p style="margin: 0 0 10px 0;">
                            Click on a region to select it for analysis before loading layers.
                        </p>
                        <p style="margin: 0; font-size: 0.85em; color: #94a3b8;">
                            This ensures focused analysis and optimal performance.
                        </p>
                    </div>
                `)
                .openOn(map);
        }

        // Show warning when trying to drop layer on wrong region
        function showWrongRegionWarning(layerName, requiredRegion) {
            L.popup({
                className: 'region-locked-warning-popup'
            })
                .setLatLng(map.getCenter())
                .setContent(`
                    <div class="popup-header" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">
                        ⚠️ Region Mismatch
                    </div>
                    <div class="popup-body">
                        <p style="margin: 0 0 10px 0;">
                            <strong>${layerName}</strong> is only available for <strong>${requiredRegion}</strong>.
                        </p>
                        <p style="margin: 0; font-size: 0.85em; color: #94a3b8;">
                            Currently locked: ${regionLockState.lockedRegion || 'None'}<br>
                            Unlock and select ${requiredRegion} to use this layer.
                        </p>
                    </div>
                `)
                .openOn(map);
        }

        // Show warning when layer not available for current region
        function showLayerNotAvailableWarning(layerName, availableRegions) {
            const regionList = Array.isArray(availableRegions) ? availableRegions.join(', ') : availableRegions;
            L.popup({
                className: 'region-locked-warning-popup'
            })
                .setLatLng(map.getCenter())
                .setContent(`
                    <div class="popup-header" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);">
                        ❌ Layer Not Available
                    </div>
                    <div class="popup-body">
                        <p style="margin: 0 0 10px 0;">
                            <strong>${layerName}</strong> is not available for <strong>${regionLockState.lockedRegion}</strong>.
                        </p>
                        <p style="margin: 0; font-size: 0.85em; color: #94a3b8;">
                            Available for: ${regionList}
                        </p>
                    </div>
                `)
                .openOn(map);
        }

        // Check if a point is inside the locked region (for drag-drop validation)
        function isPointInLockedRegion(latlng) {
            if (!regionLockState.isLocked || !regionLockState.lockedRegionLayer) {
                return false;
            }

            // Use Leaflet's bounds.contains for quick check
            const bounds = regionLockState.lockedRegionLayer.getBounds();
            if (!bounds.contains(latlng)) {
                return false;
            }

            // For more precise check, use point-in-polygon with the actual geometry
            // This handles irregular region shapes better than just bounding box
            try {
                const layer = regionLockState.lockedRegionLayer;
                if (layer.feature && layer.feature.geometry) {
                    // Use Leaflet's built-in method if available, otherwise use bounds
                    if (typeof turf !== 'undefined') {
                        const point = turf.point([latlng.lng, latlng.lat]);
                        return turf.booleanPointInPolygon(point, layer.feature);
                    }
                }
            } catch (e) {
                // Fall back to bounds check
                console.log('Point-in-polygon check failed, using bounds:', e);
            }

            return bounds.contains(latlng);
        }

        // Show warning when dropping outside the locked region
        function showDropOutsideRegionWarning(layerName, latlng) {
            L.popup({
                closeButton: false,
                autoClose: true,
                autoPan: false,
                className: 'drop-invalid-popup'
            })
            .setLatLng(latlng)
            .setContent(`
                <div style="text-align: center;">
                    <span style="font-size: 1.5em;">🚫</span><br>
                    <strong>Drop not allowed here</strong><br>
                    <small style="color: #94a3b8;">Drop <em>${layerName}</em> on <strong>${regionLockState.lockedRegion}</strong> region</small>
                </div>
            `)
            .openOn(map);

            setTimeout(() => map.closePopup(), 2500);
        }

        // Store references to ALL regions for drag-drop (iSEE Analytics can now work with any region)
        let bakoolRegionLayer = null;
        let allRegionLayers = {}; // Store all region layers by name

        adm1Layer.eachLayer(function(layer) {
            if (layer.feature && layer.feature.properties &&
                layer.feature.properties.name) {
                const regionName = layer.feature.properties.name;
                allRegionLayers[regionName] = layer;

                // Keep Bakool reference for backward compatibility
                if (regionName === 'Bakool') {
                    bakoolRegionLayer = layer;
                }
            }
        });

        // ========================================
        // DDR MODULE INITIALIZATION
        // Shared Drag-Drop-Rightclick for all layers
        // ========================================
        if (typeof DDR !== 'undefined') {
            DDR.init(map, adm1Layer);
            console.log('[DDR] Module initialized with map and ADM1 layer');
        } else {
            console.warn('[DDR] DDR module not loaded');
        }

        // ========================================
        // LAYER REGISTRY INITIALIZATION
        // Auto-registers downloaded layers to UI
        // ========================================
        if (typeof LayerRegistry !== 'undefined') {
            LayerRegistry.init(map, adm1Layer, allRegionLayers);
            console.log('[LayerRegistry] Module initialized');
        } else {
            console.warn('[LayerRegistry] LayerRegistry module not loaded');
        }

        // ========================================
        // GeoAPI MODULE INITIALIZATION
        // Road data install/uninstall management
        // ========================================
        if (typeof GeoAPI !== 'undefined') {
            GeoAPI.init(map, {
                panelContainers: {
                    '2024': 'roads2024Container',
                    'latest': 'roadsLatestContainer'
                }
            });
            console.log('[GeoAPI] Module initialized');
        } else {
            console.warn('[GeoAPI] GeoAPI module not loaded');
        }

        // ========================================
        // SHARED CONTEXT MENU (Right-Click)
        // For all road layers
        // ========================================
        let layerContextMenu = null;

        function createLayerContextMenu() {
            if (layerContextMenu) return;

            layerContextMenu = document.createElement('div');
            layerContextMenu.id = 'layerContextMenu';
            layerContextMenu.style.cssText = `
                position: fixed;
                background: #1f2937;
                border: 1px solid #374151;
                border-radius: 8px;
                box-shadow: 0 10px 25px rgba(0,0,0,0.5);
                min-width: 180px;
                z-index: 10001;
                display: none;
                overflow: hidden;
                font-size: 0.9em;
            `;
            document.body.appendChild(layerContextMenu);

            // Close on click elsewhere
            document.addEventListener('click', function(e) {
                if (layerContextMenu && !layerContextMenu.contains(e.target)) {
                    layerContextMenu.style.display = 'none';
                }
            });
        }

        function showLayerContextMenu(layerId, layerName, color, x, y, options) {
            createLayerContextMenu();

            const { isActive, onToggle, onZoom, onRemove, onInfo } = options;

            layerContextMenu.innerHTML = `
                <div style="padding: 10px 14px; border-bottom: 1px solid #374151; font-weight: 600; color: ${color};">
                    ${layerName}
                </div>
                <div class="ctx-menu-item" data-action="toggle" style="padding: 10px 14px; cursor: pointer; color: #e5e7eb; display: flex; align-items: center; gap: 8px;">
                    <span>${isActive ? '👁️‍🗨️' : '👁️'}</span>
                    <span>${isActive ? 'Hide Layer' : 'Show Layer'}</span>
                </div>
                ${isActive ? `
                <div class="ctx-menu-item" data-action="zoom" style="padding: 10px 14px; cursor: pointer; color: #e5e7eb; display: flex; align-items: center; gap: 8px;">
                    <span>🔍</span>
                    <span>Zoom to Layer</span>
                </div>
                ` : ''}
                <div class="ctx-menu-item" data-action="info" style="padding: 10px 14px; cursor: pointer; color: #e5e7eb; display: flex; align-items: center; gap: 8px;">
                    <span>ℹ️</span>
                    <span>Layer Info</span>
                </div>
                ${isActive ? `
                <div style="border-top: 1px solid #374151;"></div>
                <div class="ctx-menu-item" data-action="remove" style="padding: 10px 14px; cursor: pointer; color: #ef4444; display: flex; align-items: center; gap: 8px;">
                    <span>❌</span>
                    <span>Remove from Map</span>
                </div>
                ` : ''}
            `;

            layerContextMenu.style.left = x + 'px';
            layerContextMenu.style.top = y + 'px';
            layerContextMenu.style.display = 'block';

            // Adjust if off-screen
            const rect = layerContextMenu.getBoundingClientRect();
            if (rect.right > window.innerWidth) {
                layerContextMenu.style.left = (x - rect.width) + 'px';
            }
            if (rect.bottom > window.innerHeight) {
                layerContextMenu.style.top = (y - rect.height) + 'px';
            }

            // Add hover effects and click handlers
            layerContextMenu.querySelectorAll('.ctx-menu-item').forEach(item => {
                item.addEventListener('mouseenter', function() {
                    this.style.background = '#374151';
                });
                item.addEventListener('mouseleave', function() {
                    this.style.background = 'transparent';
                });
                item.addEventListener('click', function() {
                    const action = this.dataset.action;
                    layerContextMenu.style.display = 'none';

                    switch(action) {
                        case 'toggle': onToggle && onToggle(); break;
                        case 'zoom': onZoom && onZoom(); break;
                        case 'info': onInfo && onInfo(); break;
                        case 'remove': onRemove && onRemove(); break;
                    }
                });
            });
        }

        // Update map click to deselect both region and district
        map.on('click', function() {
            if (selectedRegion) {
                adm1Layer.resetStyle(selectedRegion);
                selectedRegion = null;
            }
            if (selectedDistrict) {
                adm2Layer.resetStyle(selectedDistrict);
                selectedDistrict = null;
            }
        });
        
        // Add Somalia ADM2 (district) boundaries
        let selectedDistrict = null;  // Track selected district
        
        const adm2Layer = L.geoJSON(adm2Boundaries, {
            style: function(feature) {
                return {
                    color: '#64748b',
                    weight: 1,
                    opacity: 0.5,
                    fillOpacity: 0,
                    dashArray: '2, 4'
                };
            },
            onEachFeature: function(feature, layer) {
                // Hover tooltip
                if (feature.properties && feature.properties.name) {
                    layer.bindTooltip(feature.properties.name, {
                        permanent: false,
                        direction: 'center',
                        className: 'district-tooltip'
                    });
                }
                
                // Click event to highlight and show popup
                layer.on('click', function(e) {
                    // Reset previous selection
                    if (selectedDistrict) {
                        adm2Layer.resetStyle(selectedDistrict);
                    }
                    
                    // Highlight clicked district
                    layer.setStyle({
                        color: '#0ea5e9',
                        weight: 3,
                        opacity: 1,
                        fillColor: '#0ea5e9',
                        fillOpacity: 0.15
                    });
                    
                    selectedDistrict = layer;
                    
                    // Create popup content
                    const props = feature.properties;
                    const popupContent = `
                        <div class="popup-header" style="background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);">
                            ${props.name}
                        </div>
                        <div class="popup-body">
                            <div class="popup-metric">
                                <span class="metric-label">📍 District:</span>
                                <span class="metric-value">${props.name}</span>
                            </div>
                            <div class="popup-metric">
                                <span class="metric-label">📏 Area:</span>
                                <span class="metric-value">${Math.round(props.area_km2).toLocaleString()} km²</span>
                            </div>
                            <div class="popup-metric">
                                <span class="metric-label">📊 % of Somalia's Total Area:</span>
                                <span class="metric-value">${props.area_percent}%</span>
                            </div>
                            <div style="margin-top: 10px; padding: 10px; background: rgba(14, 165, 233, 0.15); border-left: 3px solid #0ea5e9; border-radius: 5px; font-size: 0.8em;">
                                <strong>Total Somalia:</strong> 643,247 km²
                            </div>
                        </div>
                    `;
                    
                    // Show popup at click location
                    L.popup()
                        .setLatLng(e.latlng)
                        .setContent(popupContent)
                        .openOn(map);
                    
                    // Prevent event from bubbling to map
                    L.DomEvent.stopPropagation(e);
                });
            }
        });
        


        // adm2Layer not added by default - user must check it

        // ROADS LAYER - Bakool & Lower Shebelle
        function getRoadColor(roadType) {
            switch(roadType) {
                case 'Major road': return '#C2185B';      // Dark pink
                case 'Secondary road': return '#F48FB1'; // Light pink  
                case 'Track': return '#795548';           // Brown
                default: return '#9E9E9E';                // Gray
            }
        }

        function getRoadWidth(roadType) {
            switch(roadType) {
                case 'Major road': return 4;
                case 'Secondary road': return 2.5;
                case 'Track': return 1.5;
                default: return 1;
            }
        }

        const roadsLayer = L.geoJSON(roadsData, {
            style: function(feature) {
                return {
                    color: getRoadColor(feature.properties.TYPE),
                    weight: getRoadWidth(feature.properties.TYPE),
                    opacity: 0.7,
                    lineCap: 'round',
                    lineJoin: 'round'
                };
            },
            onEachFeature: function(feature, layer) {
                const props = feature.properties;
                layer.on({
                    mouseover: function(e) {
                        e.target.setStyle({
                            weight: e.target.options.weight + 2,
                            opacity: 1.0
                        });
                    },
                    mouseout: function(e) {
                        e.target.setStyle({
                            weight: getRoadWidth(props.TYPE),
                            opacity: 0.7
                        });
                    }
                });
                
                const regionMPI = props.shapeName === 'Bakool' ? '67 (WORST)' : '23 (BEST)';
                layer.bindPopup(`
                    <div class="popup-header" style="background: ${getRoadColor(props.TYPE)};">
                        🛣️ ${props.TYPE}
                    </div>
                    <div class="popup-body">
                        <div class="popup-metric">
                            <span class="metric-label">Region:</span>
                            <span class="metric-value">${props.shapeName}</span>
                        </div>
                        <div class="popup-metric">
                            <span class="metric-label">MPI Score:</span>
                            <span class="metric-value">${regionMPI}</span>
                        </div>
                        <div class="popup-metric">
                            <span class="metric-label">Road Type:</span>
                            <span class="metric-value">${props.TYPE}</span>
                        </div>
                        <div class="source-link">
                            <strong>Data:</strong> Somalia All Roads 2021<br>
                            <span style="font-size: 0.75em; color: #64748b;">
                                ${props.shapeName === 'Bakool' ? '1,857 roads (85% tracks)' : '7,206 roads (4x more than Bakool)'}
                            </span>
                        </div>
                    </div>
                `);
            }
        });  // Not added to map by default - user must check it

        // POPULATION LAYER - Females Age 0-12 months (500m grid, 3 classes)
        // Create separate layers for each class for individual control
        let activePopClasses = new Set(['1-25', '25-50', '50+']);
        
        function getPopulationColor(popClass) {
            // 3-class pink gradient with increasing intensity
            switch(popClass) {
                case '1-25': return '#F48FB1';    // Pink (light)
                case '25-50': return '#EC407A';   // Pink (medium intensity)
                case '50+': return '#AD1457';     // Pink (high intensity/dark)
                default: return '#E0E0E0';        // Gray
            }
        }

        function getPopulationRadius(popClass) {
            // Fixed sizes for each class
            switch(popClass) {
                case '1-25': return 4;
                case '25-50': return 6;
                case '50+': return 8;
                default: return 3;
            }
        }

        const populationLayer = L.geoJSON(populationData, {
            filter: function(feature) {
                // Only show features in active classes
                return activePopClasses.has(feature.properties.pop_class);
            },
            pointToLayer: function(feature, latlng) {
                const popClass = feature.properties.pop_class;
                return L.circleMarker(latlng, {
                    radius: getPopulationRadius(popClass),
                    fillColor: getPopulationColor(popClass),
                    color: '#fff',
                    weight: 1,
                    opacity: 1,
                    fillOpacity: 0.8,
                    className: `pop-class-${popClass.replace(/\+/g, 'plus')}`
                });
            },
            onEachFeature: function(feature, layer) {
                const props = feature.properties;
                layer.on({
                    mouseover: function(e) {
                        e.target.setStyle({
                            fillOpacity: 1.0,
                            weight: 2
                        });
                    },
                    mouseout: function(e) {
                        e.target.setStyle({
                            fillOpacity: 0.8,
                            weight: 1
                        });
                    }
                });
                
                const regionMPI = props.region === 'Bakool' ? '67 (WORST)' : '23 (BEST)';
                layer.bindPopup(`
                    <div class="popup-header" style="background: ${getPopulationColor(props.pop_class)}; color: #fff;">
                        👶 ${props.age_group}
                    </div>
                    <div class="popup-body">
                        <div class="popup-metric">
                            <span class="metric-label">Population:</span>
                            <span class="metric-value">${props.pop_class}</span>
                        </div>
                        <div class="popup-metric">
                            <span class="metric-label">Region:</span>
                            <span class="metric-value">${props.region}</span>
                        </div>
                        <div class="popup-metric">
                            <span class="metric-label">MPI Score:</span>
                            <span class="metric-value">${regionMPI}</span>
                        </div>
                        <div class="popup-metric">
                            <span class="metric-label">Grid:</span>
                            <span class="metric-value">500m × 500m</span>
                        </div>
                        <div class="source-link">
                            <strong>Data:</strong> WorldPop 2025 (R2025A v1)<br>
                            <span style="font-size: 0.75em; color: #64748b;">
                                Cells with population ≥ 1
                            </span>
                        </div>
                    </div>
                `);
            }
        });  // Not added to map by default - user must check it

        // Function to refresh population layer based on active classes
        function refreshPopulationLayer() {
            map.removeLayer(populationLayer);
            populationLayer.clearLayers();
            
            populationData.features.forEach(function(feature) {
                if (activePopClasses.has(feature.properties.pop_class)) {
                    L.geoJSON(feature, populationLayer.options).addTo(populationLayer);
                }
            });
            
            if (document.getElementById('infantsToggle').checked && 
                document.getElementById('femaleToggle').checked &&
                document.getElementById('populationMainToggle').checked) {
                map.addLayer(populationLayer);
            }
        }

        // Combined Layer Control and AI Insights (side-by-side wrapper)
        const combinedControl = L.control({position: 'topleft'});
        combinedControl.onAdd = function() {
            const wrapper = L.DomUtil.create('div', 'controls-wrapper');
            wrapper.style.display = 'flex';
            wrapper.style.gap = '10px';

            // Create Layer Control div
            const layerDiv = L.DomUtil.create('div', 'layer-control collapsed', wrapper);

            layerDiv.innerHTML = `
                <div class="layer-header" style="color: #10b981; font-weight: bold; margin-bottom: 8px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; white-space: nowrap; overflow: hidden;">
                    <span style="overflow: hidden; text-overflow: ellipsis;">🗺️ Layers</span>
                    <span class="layer-toggle-icon" style="font-size: 1.2em; flex-shrink: 0;">▶</span>
                </div>
                <div class="layer-content">
                    <div style="margin-bottom: 10px; padding-bottom: 10px; border-bottom: 2px solid #334155;">
                        <label style="font-weight: bold; color: #10b981;">
                            <input type="checkbox" id="satelliteToggle"> 🛰️ Satellite Imagery
                        </label>
                    </div>

                    <label><input type="checkbox" id="mpiToggle"> Multidimensional Poverty Index, Ref. Y. 2022</label>
                    <label><input type="checkbox" id="nightlightToggle"> 💡 Nightlight Points</label>
                    <div style="margin-left: 20px; border-left: 2px solid #fbbf24; padding-left: 10px;">
                        <label style="font-size: 0.9em;"><input type="checkbox" id="nightlightOverviewToggle"> Overview (1,571)</label>
                        <label style="font-size: 0.9em; display: block; margin-top: 5px;"><span style="color: #fde047;">✨</span> Detailed (500m polygons)</label>
                        <div style="margin-left: 20px; border-left: 2px solid #a855f7; padding-left: 10px; margin-top: 5px;">
                            <label style="font-size: 0.85em; position: relative;">
                                <input type="checkbox" id="bakool2022Toggle">
                                <span style="color: #a855f7;">■</span>
                                <span id="bakool2022Label" draggable="true" style="cursor: grab; user-select: none; display: inline-flex; align-items: center; gap: 4px;">
                                    <span class="drag-handle" style="opacity: 0; transition: opacity 0.2s;">⋮⋮</span>
                                    <span>Bakool 2022 (2 polygons)</span>
                                </span>
                            </label>
                            <label style="font-size: 0.85em; display: block; margin-top: 3px; position: relative;">
                                <input type="checkbox" id="bakool2023Toggle">
                                <span style="color: #a855f7;">■</span>
                                <span id="bakool2023Label" draggable="true" style="cursor: grab; user-select: none; display: inline-flex; align-items: center; gap: 4px;">
                                    <span class="drag-handle" style="opacity: 0; transition: opacity 0.2s;">⋮⋮</span>
                                    <span>Bakool 2023 (15 polygons)</span>
                                </span>
                            </label>
                            <label style="font-size: 0.85em; color: #94a3b8; display: block; margin-top: 3px;"><input type="checkbox" disabled> Lower Shebelle <span style="color: #fbbf24; font-style: italic;">(Coming Soon)</span></label>
                        </div>
                    </div>
                    <!-- ============================================ -->
                    <!-- ROADS INFRASTRUCTURE - Hierarchical Structure -->
                    <!-- ============================================ -->
                    <div style="margin-top: 12px; border-left: 3px solid #3b82f6; padding-left: 10px;">
                        <label style="font-weight: bold; color: #3b82f6; font-size: 1em; display: block; margin-bottom: 8px;">
                            🛣️ Roads Infrastructure (OSM/HDX)
                        </label>

                        <!-- L0: Coming Soon -->
                        <div style="margin-left: 8px; margin-bottom: 8px; padding: 8px; background: rgba(107, 114, 128, 0.08); border-radius: 4px;">
                            <div style="font-size: 0.9em; color: #6b7280; font-style: italic;">
                                L0: Full Country Roads (coming soon)
                            </div>
                        </div>

                        <!-- L1: Roads by Version -->
                        <div style="margin-left: 8px; border-left: 2px solid #94a3b8; padding-left: 10px;">
                            <div style="font-size: 0.85em; color: #94a3b8; margin-bottom: 6px; font-weight: 600;">
                                L1: Roads by Version (Drag to Region)
                            </div>

                            <!-- 2023 Version -->
                            <div style="margin-bottom: 6px; padding: 6px; background: rgba(244, 143, 177, 0.1); border-left: 3px solid #F48FB1; border-radius: 4px;">
                                <label style="font-size: 0.85em; color: #F48FB1; display: flex; align-items: center; gap: 6px;">
                                    <input type="checkbox" id="roadsOSMToggle">
                                    <span id="roadsOSMLabel" class="ddr-layer-label" data-layer="roads2023" data-folder="roads_by_region" draggable="true" style="cursor: grab; user-select: none; display: inline-flex; align-items: center; gap: 4px;">
                                        <span style="opacity: 0.5;">⋮⋮</span>
                                        <span>🗓️ Roads 2023</span>
                                    </span>
                                </label>
                                <div style="margin-left: 22px; font-size: 0.7em; color: #6b7280;">Original OSM export (18 regions)</div>
                            </div>

                            <!-- 2024 Version (July) -->
                            <div id="roads2024Container" data-version="2024" style="margin-bottom: 6px; padding: 6px; background: rgba(251, 191, 36, 0.1); border-left: 3px solid #fbbf24; border-radius: 4px;">
                                <label style="font-size: 0.85em; color: #fbbf24; display: flex; align-items: center; gap: 6px;">
                                    <input type="checkbox" id="roads2024Toggle">
                                    <span id="roads2024Label" class="ddr-layer-label" data-layer="roads2024" data-folder="roads_by_region_2024_07_23" draggable="true" style="cursor: grab; user-select: none; display: inline-flex; align-items: center; gap: 4px;">
                                        <span style="opacity: 0.5;">⋮⋮</span>
                                        <span>🗓️ Roads 2024 (July)</span>
                                    </span>
                                </label>
                                <div style="margin-left: 22px; font-size: 0.7em; color: #6b7280;">HDX Geopackage - 2024-07-23</div>
                            </div>

                            <!-- Latest Version (Auto-Update) -->
                            <div id="roadsLatestContainer" data-version="latest" style="margin-bottom: 6px; padding: 6px; background: rgba(34, 197, 94, 0.1); border-left: 3px solid #22c55e; border-radius: 4px;">
                                <label style="font-size: 0.85em; color: #22c55e; display: flex; align-items: center; gap: 6px;">
                                    <input type="checkbox" id="roadsOSMLatestToggle">
                                    <span id="roadsOSMLatestLabel" class="ddr-layer-label" data-layer="roadsLatest" data-folder="roads_by_region_latest" draggable="true" style="cursor: grab; user-select: none; display: inline-flex; align-items: center; gap: 4px;">
                                        <span style="opacity: 0.5;">⋮⋮</span>
                                        <span>🔄 Roads Latest</span>
                                    </span>
                                </label>
                                <div style="margin-left: 22px; font-size: 0.7em; color: #6b7280;">Auto-updated via HDX API</div>
                            </div>
                        </div>

                        <!-- Action Buttons -->
                        <div style="margin-top: 10px; margin-left: 8px; display: flex; gap: 8px; flex-wrap: wrap;">
                            <button id="updateOSMButton" style="
                                flex: 1;
                                min-width: 120px;
                                background: rgba(34, 197, 94, 0.2);
                                border: 1px solid #22c55e;
                                color: #22c55e;
                                padding: 6px 10px;
                                border-radius: 4px;
                                cursor: pointer;
                                font-size: 0.75em;
                                font-weight: bold;
                            ">🔄 Update Latest</button>
                            <button id="checkRoadsVersionsBtn" style="
                                flex: 1;
                                min-width: 120px;
                                background: rgba(59, 130, 246, 0.2);
                                border: 1px solid #3b82f6;
                                color: #3b82f6;
                                padding: 6px 10px;
                                border-radius: 4px;
                                cursor: pointer;
                                font-size: 0.75em;
                                font-weight: bold;
                            ">📦 Geo-API</button>
                        </div>

                        <!-- Install Progress Display -->
                        <div id="roadsInstallProgress" style="display: none; margin-top: 8px; margin-left: 8px; padding: 8px; background: rgba(59, 130, 246, 0.1); border-radius: 4px; font-size: 0.75em;">
                            <div style="color: #3b82f6; font-weight: bold; margin-bottom: 4px;">
                                <span id="installStatusText">Installing...</span>
                            </div>
                            <div style="background: #1f2937; border-radius: 4px; height: 8px; overflow: hidden;">
                                <div id="installProgressBar" style="background: #3b82f6; height: 100%; width: 0%; transition: width 0.3s;"></div>
                            </div>
                            <div style="margin-top: 4px; color: #94a3b8;">
                                <span id="installStepText">Step 1 of 5: Downloading...</span>
                            </div>
                            <div style="margin-top: 2px; color: #6b7280;">
                                <span id="installRegionText">Region 0 of 18</span>
                            </div>
                        </div>
                    </div>

                    <!-- Population hierarchical structure -->
                    <div style="margin-top: 8px; border-left: 2px solid #EC407A; padding-left: 8px;">
                        <label style="font-weight: bold; color: #EC407A;">
                            <input type="checkbox" id="populationMainToggle"> Population
                        </label>

                        <!-- Female sub-level -->
                        <div style="margin-left: 12px; margin-top: 4px; border-left: 2px solid #F48FB1; padding-left: 8px;">
                            <label style="font-weight: 600; color: #F48FB1;">
                                <input type="checkbox" id="femaleToggle"> Female
                            </label>

                            <!-- Infants sub-sub-level -->
                            <div style="margin-left: 12px; margin-top: 4px; border-left: 2px solid #FCE4EC; padding-left: 8px;">
                                <label style="font-weight: 500; color: #C2185B;">
                                    <input type="checkbox" id="infantsToggle"> Infants (0-12mo)
                                </label>

                                <!-- 3 class categories -->
                                <div style="margin-left: 12px; margin-top: 4px; font-size: 0.9em;">
                                    <label style="color: #666;">
                                        <input type="checkbox" id="pop_1_25_Toggle">
                                        <span style="color: #F48FB1;">●</span> 1-25 (number of infants)
                                    </label>
                                    <label style="color: #666;">
                                        <input type="checkbox" id="pop_25_50_Toggle">
                                        <span style="color: #EC407A;">●</span> 25-50 (number of infants)
                                    </label>
                                    <label style="color: #666;">
                                        <input type="checkbox" id="pop_50plus_Toggle">
                                        <span style="color: #AD1457;">●</span> 50+ (number of infants)
                                    </label>
                                </div>
                            </div>
                        </div>

                        <!-- Male sub-level (placeholder for future) -->
                        <div style="margin-left: 12px; margin-top: 4px; border-left: 2px solid #90CAF9; padding-left: 8px;">
                            <label style="font-weight: 600; color: #90CAF9; opacity: 0.5;">
                                <input type="checkbox" id="maleToggle" disabled> Male (coming soon)
                            </label>
                        </div>
                    </div>

                    <label style="margin-top: 8px;"><input type="checkbox" id="adm1Toggle" checked> Regional Boundaries ADM1 (18)</label>
                    <label><input type="checkbox" id="adm2Toggle"> District Boundaries ADM2 (118)</label>
                </div>
            `;

            // Add click handler for collapsible layer header
            const layerHeader = layerDiv.querySelector('.layer-header');
            if (layerHeader) {
                layerHeader.addEventListener('click', function(e) {
                    e.stopPropagation();
                    e.preventDefault();
                    layerDiv.classList.toggle('collapsed');
                    const icon = this.querySelector('.layer-toggle-icon');
                    if (icon) {
                        icon.textContent = layerDiv.classList.contains('collapsed') ? '▶' : '▼';
                    }
                });
            }

            // Disable click propagation only on layer content
            const layerContent = layerDiv.querySelector('.layer-content');
            if (layerContent) {
                L.DomEvent.disableClickPropagation(layerContent);
                L.DomEvent.disableScrollPropagation(layerContent);
            }

            // Create AI Insights Control div
            const aiDiv = L.DomUtil.create('div', 'ai-insights-control collapsed', wrapper);

            // Collapsible header with fold/unfold icon
            aiDiv.innerHTML = `
                <div class="ai-header" style="color: #10b981; font-weight: bold; margin-bottom: 8px; cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
                    <span>🧠 Geo-AI Insights</span>
                    <span class="toggle-icon" style="font-size: 1.2em;">▶</span>
                </div>
                <div class="ai-content">
                    <!-- iSEE Analytics - Single entity at top -->
                    <label style="color: #94a3b8; margin-top: 8px; position: relative;">
                        <input type="checkbox" id="iseeAnalyticsToggle">
                        <span id="iseeAnalyticsLabel" draggable="true" style="cursor: grab; user-select: none; display: inline-flex; align-items: center; gap: 4px;">
                            <span class="drag-handle" style="opacity: 0; transition: opacity 0.2s;">⋮⋮</span>
                            <span>🔍 iSEE Analytics</span>
                        </span>
                    </label>

                    <!-- Separator line -->
                    <div style="border-bottom: 2px solid #334155; margin: 12px 0;"></div>

                    <!-- Remote Sensing & Detection -->
                    <div class="category-header collapsed" data-category="remote-sensing" style="color: #0ea5e9; font-weight: bold; margin-top: 8px; margin-bottom: 4px; font-size: 0.9em; cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
                        <span>🛰️ Remote Sensing & Detection</span>
                        <span class="cat-toggle" style="font-size: 0.9em;">▶</span>
                    </div>
                    <div class="category-content" data-category="remote-sensing" style="display: none; padding-left: 8px;">
                        <label><input type="checkbox" id="nightlightAnalysisToggle"> 📊 Nightlight Distribution Analysis</label>
                        <label style="color: #94a3b8;"><input type="checkbox" disabled> 🏘️ Settlement Detection 🔒</label>
                        <label style="color: #94a3b8;"><input type="checkbox" disabled> 🌾 Land Use Classification 🔒</label>
                        <label style="color: #94a3b8;"><input type="checkbox" disabled> 🔄 Change Detection Analysis 🔒</label>
                    </div>

                    <!-- Socioeconomic Analytics -->
                    <div class="category-header collapsed" data-category="socioeconomic" style="color: #0ea5e9; font-weight: bold; margin-top: 12px; margin-bottom: 4px; font-size: 0.9em; cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
                        <span>📊 Socioeconomic Analytics</span>
                        <span class="cat-toggle" style="font-size: 0.9em;">▶</span>
                    </div>
                    <div class="category-content" data-category="socioeconomic" style="display: none; padding-left: 8px;">
                        <label style="color: #94a3b8;"><input type="checkbox" disabled> 📉 Poverty Correlation Analysis 🔒</label>
                        <label style="color: #94a3b8;"><input type="checkbox" disabled> 👥 Population Density Analysis 🔒</label>
                        <label style="color: #94a3b8;"><input type="checkbox" disabled> 🏥 Healthcare Facility Coverage 🔒</label>
                        <label style="color: #94a3b8;"><input type="checkbox" disabled> 🏫 Education Infrastructure 🔒</label>
                        <label style="color: #94a3b8;"><input type="checkbox" disabled> 🏚️ Housing Quality Assessment 🔒</label>
                        <label style="color: #94a3b8;"><input type="checkbox" disabled> 🚰 WASH Facilities Coverage 🔒</label>
                        <label style="color: #94a3b8;"><input type="checkbox" disabled> 📊 Market Access Analysis 🔒</label>
                    </div>

                    <!-- Environmental & Climate Analysis -->
                    <div class="category-header collapsed" data-category="environmental" style="color: #0ea5e9; font-weight: bold; margin-top: 12px; margin-bottom: 4px; font-size: 0.9em; cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
                        <span>🌍 Environmental & Climate Analysis</span>
                        <span class="cat-toggle" style="font-size: 0.9em;">▶</span>
                    </div>
                    <div class="category-content" data-category="environmental" style="display: none; padding-left: 8px;">
                        <label style="color: #94a3b8;"><input type="checkbox" disabled> 🌍 Environmental Impact 🔒</label>
                        <label style="color: #94a3b8;"><input type="checkbox" disabled> 🌡️ Climate Vulnerability 🔒</label>
                        <label style="color: #94a3b8;"><input type="checkbox" disabled> 💧 Water Resources Mapping 🔒</label>
                        <label style="color: #94a3b8;"><input type="checkbox" disabled> 🌾 Agricultural Productivity 🔒</label>
                    </div>

                    <!-- Infrastructure & Connectivity -->
                    <div class="category-header collapsed" data-category="infrastructure" style="color: #0ea5e9; font-weight: bold; margin-top: 12px; margin-bottom: 4px; font-size: 0.9em; cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
                        <span>🏗️ Infrastructure & Connectivity</span>
                        <span class="cat-toggle" style="font-size: 0.9em;">▶</span>
                    </div>
                    <div class="category-content" data-category="infrastructure" style="display: none; padding-left: 8px;">
                        <label style="color: #94a3b8;"><input type="checkbox" disabled> 🛣️ Infrastructure Mapping 🔒</label>
                        <label style="color: #94a3b8;"><input type="checkbox" disabled> 📡 Connectivity Analysis 🔒</label>
                        <label style="color: #94a3b8;"><input type="checkbox" disabled> 🌐 Accessibility Analysis 🔒</label>
                    </div>

                    <!-- Temporal & Predictive Analytics -->
                    <div class="category-header collapsed" data-category="temporal" style="color: #0ea5e9; font-weight: bold; margin-top: 12px; margin-bottom: 4px; font-size: 0.9em; cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
                        <span>📈 Temporal & Predictive Analytics</span>
                        <span class="cat-toggle" style="font-size: 0.9em;">▶</span>
                    </div>
                    <div class="category-content" data-category="temporal" style="display: none; padding-left: 8px;">
                        <label style="color: #94a3b8;"><input type="checkbox" disabled> 📈 Temporal Trends Analysis 🔒</label>
                        <label style="color: #94a3b8;"><input type="checkbox" disabled> 🔮 Predictive Modeling 🔒</label>
                    </div>

                    <!-- Spatial Statistics -->
                    <div class="category-header collapsed" data-category="spatial-stats" style="color: #0ea5e9; font-weight: bold; margin-top: 12px; margin-bottom: 4px; font-size: 0.9em; cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
                        <span>🔬 Spatial Statistics</span>
                        <span class="cat-toggle" style="font-size: 0.9em;">▶</span>
                    </div>
                    <div class="category-content" data-category="spatial-stats" style="display: none; padding-left: 8px;">
                        <label style="color: #94a3b8;"><input type="checkbox" disabled> 📐 Spatial Autocorrelation (Moran's I) 🔒</label>
                        <label style="color: #94a3b8;"><input type="checkbox" disabled> 🎯 Hotspot Analysis (Getis-Ord Gi*) 🔒</label>
                        <label style="color: #94a3b8;"><input type="checkbox" disabled> 📍 Point Pattern Analysis 🔒</label>
                        <label style="color: #94a3b8;"><input type="checkbox" disabled> 🗺️ Kriging Interpolation 🔒</label>
                        <label style="color: #94a3b8;"><input type="checkbox" disabled> 🔗 Spatial Regression Models 🔒</label>
                        <label style="color: #94a3b8;"><input type="checkbox" disabled> 📏 Distance-Based Analysis 🔒</label>
                        <label style="color: #94a3b8;"><input type="checkbox" disabled> 🌊 Kernel Density Estimation 🔒</label>
                        <label style="color: #94a3b8;"><input type="checkbox" disabled> 🧮 Spatial Clustering (K-means) 🔒</label>
                        <label style="color: #94a3b8;"><input type="checkbox" disabled> 🎲 Geographically Weighted Regression 🔒</label>
                    </div>

                    <!-- Reporting & Customization -->
                    <div class="category-header collapsed" data-category="reporting" style="color: #0ea5e9; font-weight: bold; margin-top: 12px; margin-bottom: 4px; font-size: 0.9em; cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
                        <span>🛠️ Reporting & Customization</span>
                        <span class="cat-toggle" style="font-size: 0.9em;">▶</span>
                    </div>
                    <div class="category-content" data-category="reporting" style="display: none; padding-left: 8px;">
                        <label style="color: #94a3b8;"><input type="checkbox" disabled> 📑 Custom Report Generator 🔒</label>
                    </div>
                </div>
            `;

            // Add click handler for main collapsible header
            const aiHeader = aiDiv.querySelector('.ai-header');
            const aiContent = aiDiv.querySelector('.ai-content');

            if (aiHeader) {
                aiHeader.addEventListener('click', function(e) {
                    e.stopPropagation();
                    e.preventDefault();
                    aiDiv.classList.toggle('collapsed');
                    const icon = this.querySelector('.toggle-icon');
                    if (icon) {
                        icon.textContent = aiDiv.classList.contains('collapsed') ? '▶' : '▼';
                    }
                });
            }

            // Add click handlers for category headers
            const categoryHeaders = aiDiv.querySelectorAll('.category-header');
            categoryHeaders.forEach(header => {
                header.addEventListener('click', function(e) {
                    e.stopPropagation();
                    e.preventDefault();
                    const category = this.getAttribute('data-category');
                    const content = aiDiv.querySelector(`.category-content[data-category="${category}"]`);
                    const icon = this.querySelector('.cat-toggle');

                    if (content && icon) {
                        this.classList.toggle('collapsed');
                        if (this.classList.contains('collapsed')) {
                            content.style.display = 'none';
                            icon.textContent = '▶';
                        } else {
                            content.style.display = 'block';
                            icon.textContent = '▼';
                        }
                    }
                });
            });

            // Disable map dragging and interactions when interacting with both controls
            L.DomEvent.disableClickPropagation(wrapper);
            L.DomEvent.disableScrollPropagation(wrapper);
            L.DomEvent.disableClickPropagation(layerDiv);
            L.DomEvent.disableScrollPropagation(layerDiv);
            L.DomEvent.disableClickPropagation(aiContent);
            L.DomEvent.disableScrollPropagation(aiDiv);

            return wrapper;
        };
        combinedControl.addTo(map);

        // ==========================================
        // COMBINED INFO BOX - Data Summary + Sources
        // ==========================================
        const infoBox = L.control({position: 'topright'});
        infoBox.onAdd = function() {
            const div = L.DomUtil.create('div', 'info-box collapsed');
            div.style.width = isMobile ? '100%' : '255px';
            div.style.maxHeight = isMobile ? '40vh' : '70vh';
            div.style.overflowY = 'auto';
            div.style.position = isMobile ? 'relative' : 'absolute';
            div.style.top = isMobile ? 'auto' : '0px';
            div.style.right = isMobile ? 'auto' : '265px';
            div.style.transition = 'max-height 0.3s ease';

            div.innerHTML = `
                <div class="info-header" style="color: #10b981; font-weight: bold; margin-bottom: 8px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; white-space: nowrap; overflow: hidden;">
                    <span style="overflow: hidden; text-overflow: ellipsis;">📚 Concepts, Sources, and Methods</span>
                    <span class="info-toggle-icon" style="font-size: 1.2em; flex-shrink: 0;">▶</span>
                </div>
                <div class="info-content">
                    <!-- Level 2: Sources -->
                    <div class="info-title" style="margin-top: 5px; font-size: 1em; color: #0ea5e9; font-weight: 600;">📋 Sources</div>
                    <div class="info-text" style="line-height: 1.3; margin-bottom: 15px;">
                        <strong>🛰️ Satellite Imagery:</strong><br>
                        <a href="https://www.google.com/earth/" target="_blank" style="color: #0ea5e9; text-decoration: none; font-size: 0.85em;">Google Satellite</a><br>
                        <span style="color: #64748b; font-size: 0.75em;">High-resolution imagery (up to zoom 22) from Maxar, CNES/Airbus</span><br>

                        <strong>📊 MPI:</strong><br>
                        <a href="https://ophi.org.uk/sites/default/files/2024-12/Somalia_MPI_report_2024.pdf" target="_blank" style="color: #0ea5e9; text-decoration: none; font-size: 0.85em;">OPHI Somalia MPI Report 2024</a><br>
                        <span style="color: #64748b; font-size: 0.75em;">(SIHBS 2022)</span><br>

                        <strong>💡 Nightlight Overview:</strong><br>
                        <a href="https://eogdata.mines.edu/products/vnl/" target="_blank" style="color: #0ea5e9; text-decoration: none; font-size: 0.85em;">VIIRS Day/Night Band</a><br>
                        <span style="color: #64748b; font-size: 0.75em;">(2023-2024, sampled)</span><br>

                        <strong>✨ Nightlight Detailed (500m polygons):</strong><br>
                        <a href="https://developers.google.com/earth-engine/datasets/catalog/NOAA_VIIRS_DNB_ANNUAL_V22" target="_blank" style="color: #0ea5e9; text-decoration: none; font-size: 0.85em;">NOAA VIIRS DNB Annual V22</a><br>
                        <span style="color: #64748b; font-size: 0.75em;">Bakool 2022-2023, 500m × 500m polygons, filtered >= 0.5 nW/cm²/sr</span><br>
                        <span style="color: #94a3b8; font-size: 0.7em;">17 polygons total (brightest nightlight cells only)</span><br>

                        <strong>🛣️ Roads:</strong><br>
                        <a href="https://data.humdata.org/dataset/somalia-roads" target="_blank" style="color: #0ea5e9; text-decoration: none; font-size: 0.85em;">Somalia All Roads 2021</a><br>
                        <span style="color: #64748b; font-size: 0.75em;">Bakool & Lower Shebelle only</span><br>

                        <strong>👶 Population:</strong><br>
                        <a href="https://hub.worldpop.org/geodata/summary?id=83199" target="_blank" style="color: #0ea5e9; text-decoration: none; font-size: 0.85em;">WorldPop Age/Sex 2025</a><br>
                        <span style="color: #64748b; font-size: 0.75em;">F 0-12 months, 500m grid</span><br>

                        <strong>🗺️ Boundaries ADM1:</strong><br>
                        <a href="https://data.humdata.org/dataset/somalia-administrative-boundaries" target="_blank" style="color: #0ea5e9; text-decoration: none; font-size: 0.85em;">Somalia Admin Boundaries (HDX)</a><br>

                        <strong>🗺️ Districts ADM2:</strong><br>
                        <a href="https://www.geoboundaries.org/index.html#getdata" target="_blank" style="color: #0ea5e9; text-decoration: none; font-size: 0.85em;">geoBoundaries Somalia ADM2</a><br>
                        <span style="color: #64748b; font-size: 0.75em;">(118 districts)</span>
                    </div>

                    <!-- Level 2: Summary -->
                    <div class="info-title" style="margin-top: 5px; font-size: 1em; color: #0ea5e9; font-weight: 600;">📊 Summary</div>
                    <div class="info-text" style="margin-bottom: 10px; padding-bottom: 10px; border-bottom: 2px solid #334155; line-height: 1.3;">
                        <strong>MPI Range:</strong> 23-67<br>
                        <strong>Nightlight Overview:</strong> 1,571<br>
                        <strong>Nightlight Detailed (500m polygons):</strong><br>
                        <span style="margin-left: 10px;">• Bakool 2022: 2 cells (>= 0.5 nW)</span><br>
                        <span style="margin-left: 10px;">• Bakool 2023: 15 cells (>= 0.5 nW)</span><br>
                        <strong>Roads (2 regions):</strong> 9,063<br>
                        <strong>Population F 0-12mo:</strong> 16,478<br>
                        <strong>Coverage:</strong> Bakool & Lower Shebelle
                    </div>
                </div>
            `;

            // Add click handler for collapsible header
            const infoHeader = div.querySelector('.info-header');
            const infoContent = div.querySelector('.info-content');

            if (infoHeader) {
                infoHeader.addEventListener('click', function(e) {
                    e.stopPropagation();
                    e.preventDefault();
                    div.classList.toggle('collapsed');
                    const icon = this.querySelector('.info-toggle-icon');
                    if (icon) {
                        icon.textContent = div.classList.contains('collapsed') ? '▶' : '▼';
                    }
                });
            }

            // Disable click propagation only on content, not header
            if (infoContent) {
                L.DomEvent.disableClickPropagation(infoContent);
                L.DomEvent.disableScrollPropagation(infoContent);
            }

            return div;
        };
        infoBox.addTo(map);
        
        

        setTimeout(() => {
            // Satellite imagery toggle
            document.getElementById('satelliteToggle').addEventListener('change', function(e) {
                if (e.target.checked) {
                    // Switch to satellite view
                    map.removeLayer(darkMap);
                    map.addLayer(satelliteMap);
                    currentBaseLayer = 'satellite';
                    console.log('Switched to satellite imagery');
                } else {
                    // Switch back to dark map
                    map.removeLayer(satelliteMap);
                    map.addLayer(darkMap);
                    currentBaseLayer = 'dark';
                    console.log('Switched to dark map');
                }
            });

            // Simple layer toggles
            document.getElementById('mpiToggle').addEventListener('change', function(e) {
                e.target.checked ? map.addLayer(mpiLayer) : map.removeLayer(mpiLayer);
            });

            document.getElementById('nightlightToggle').addEventListener('change', function(e) {
                const overviewToggle = document.getElementById('nightlightOverviewToggle');
                if (e.target.checked) {
                    overviewToggle.disabled = false;
                    if (overviewToggle.checked) map.addLayer(nightlightLayer);
                } else {
                    overviewToggle.disabled = true;
                    map.removeLayer(nightlightLayer);
                }
            });
            
            document.getElementById('nightlightOverviewToggle').addEventListener('change', function(e) {
                e.target.checked ? map.addLayer(nightlightLayer) : map.removeLayer(nightlightLayer);
            });

            // Track active layers on regions to prevent duplicates
            const activeBakoolLayers = {
                'bakool2022': false,
                'bakool2023': false
            };

            // Bakool detailed nightlight toggles
            document.getElementById('bakool2022Toggle').addEventListener('change', function(e) {
                if (e.target.checked) {
                    map.addLayer(detailedNLBakool2022);
                    activeBakoolLayers['bakool2022'] = true;
                    bakool2022Label.classList.add('layer-dropped');
                } else {
                    map.removeLayer(detailedNLBakool2022);
                    activeBakoolLayers['bakool2022'] = false;
                    bakool2022Label.classList.remove('layer-dropped');
                }
            });
            document.getElementById('bakool2023Toggle').addEventListener('change', function(e) {
                if (e.target.checked) {
                    map.addLayer(detailedNLBakool2023);
                    activeBakoolLayers['bakool2023'] = true;
                    bakool2023Label.classList.add('layer-dropped');
                } else {
                    map.removeLayer(detailedNLBakool2023);
                    activeBakoolLayers['bakool2023'] = false;
                    bakool2023Label.classList.remove('layer-dropped');
                }
            });

            // iSEE Analytics checkbox toggle
            const iseeAnalyticsLabel = document.getElementById('iseeAnalyticsLabel');
            document.getElementById('iseeAnalyticsToggle').addEventListener('change', function(e) {
                if (e.target.checked) {
                    // Activate iSEE Analytics
                    iseeAnalyticsActive = true;
                    iseeAnalyticsLabel.classList.add('layer-dropped');
                } else {
                    // Deactivate iSEE Analytics
                    iseeAnalyticsActive = false;
                    iseeAnalyticsLabel.classList.remove('layer-dropped');
                }
            });

            // ========================================
            // DRAG-AND-DROP: Bakool 2022 Layer
            // ========================================

            const bakool2022Label = document.getElementById('bakool2022Label');
            let draggedLayerId = null;
            let dragGhost = null;
            let cursorIndicator = null;
            let iseeAnalyticsActive = false;

            // Shared variables for roads layers (used by iSEE Analytics)
            let clippedRoadsLayer = null;
            let activeRoadsRegion = null;
            let roadsData = null;

            // ========================================
            // iSEE ANALYTICS RESET FUNCTION
            // Call this when layers change to invalidate cached results
            // ========================================
            function resetISEEAnalytics() {
                console.log('[iSEE] Resetting analytics state - layers changed');

                // Reset active state
                iseeAnalyticsActive = false;

                // Uncheck the checkbox
                const iseeToggle = document.getElementById('iseeAnalyticsToggle');
                if (iseeToggle) iseeToggle.checked = false;

                // Remove layer-dropped class from label
                const iseeLabel = document.getElementById('iseeAnalyticsLabel');
                if (iseeLabel) iseeLabel.classList.remove('layer-dropped');

                // Remove any existing iSEE Analytics modal from DOM
                const existingModal = document.getElementById('iseeAnalyticsModal');
                if (existingModal) {
                    existingModal.remove();
                    console.log('[iSEE] Removed existing analytics modal');
                }
            }

            // Make resetISEEAnalytics available globally for regionLockState
            window.resetISEEAnalytics = resetISEEAnalytics;

            // ========================================
            // iSEE ANALYTICS IMPLEMENTATION
            // AUTOMATIC LAYER DISCOVERY - No need to add new layers manually!
            // All layers registered in regionLockState are automatically included
            // ========================================
            triggerISEEAnalyticsImpl = function(regionName, regionLayer) {
                console.log(`[iSEE] Running analytics for ${regionName}`);
                console.log(`[iSEE] Loaded layers:`, regionLockState.loadedLayers);

                // ========================================
                // AUTOMATIC LAYER DISCOVERY
                // Any layer added to regionLockState.loadedLayers is automatically included
                // Layer types: 'nightlight', 'roads', 'population', 'landcover', 'vegetation', etc.
                // ========================================

                // Build dynamic layers object from regionLockState
                // This automatically includes ALL current and future layers!
                const dynamicLayers = {};
                const layersByType = {
                    nightlight: [],
                    roads: [],
                    population: [],
                    landcover: [],
                    vegetation: [],
                    socioeconomic: [],
                    infrastructure: [],
                    other: []
                };

                // Categorize all loaded layers automatically
                regionLockState.loadedLayers.forEach(l => {
                    // Create a safe key from the layer name
                    const safeKey = l.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
                    dynamicLayers[safeKey] = {
                        active: true,
                        name: l.name,
                        layer: l.layer,
                        type: l.type,
                        region: regionName,
                        // Try to extract GeoJSON data if available
                        data: l.layer && l.layer.toGeoJSON ? l.layer.toGeoJSON() : null
                    };

                    // Also categorize by type for easier access
                    const category = layersByType[l.type] ? l.type : 'other';
                    layersByType[category].push({
                        name: l.name,
                        layer: l.layer,
                        data: l.layer && l.layer.toGeoJSON ? l.layer.toGeoJSON() : null
                    });
                });

                // Legacy support: Build activeBakoolLayers for backward compatibility
                const activeBakoolLayers = {
                    'bakool2022': dynamicLayers['bakool_nightlight_2022']?.active || false,
                    'bakool2023': dynamicLayers['bakool_nightlight_2023']?.active || false
                };

                // Also check checkbox states as backup for legacy layers
                const toggle2022 = document.getElementById('bakool2022Toggle');
                const toggle2023 = document.getElementById('bakool2023Toggle');
                if (toggle2022 && toggle2022.checked) activeBakoolLayers['bakool2022'] = true;
                if (toggle2023 && toggle2023.checked) activeBakoolLayers['bakool2023'] = true;

                // Build comprehensive layerRefs object
                // Includes both legacy references AND new dynamic layers
                const layerRefs = {
                    // ========================================
                    // NEW: Dynamic layers (auto-discovered)
                    // ========================================
                    dynamicLayers: dynamicLayers,           // All layers by safe key
                    layersByType: layersByType,             // Layers grouped by type
                    loadedLayersList: regionLockState.loadedLayers,  // Raw list

                    // ========================================
                    // LEGACY: Hardcoded references (backward compatibility)
                    // ========================================
                    detailedNLBakool2022: detailedNLBakool2022,
                    detailedNLBakool2023: detailedNLBakool2023,
                    bakoolNightlightPolygons2022: typeof bakoolNightlightPolygons2022 !== 'undefined' ? bakoolNightlightPolygons2022 : null,
                    bakoolNightlightPolygons2023: typeof bakoolNightlightPolygons2023 !== 'undefined' ? bakoolNightlightPolygons2023 : null,

                    // Region data
                    regionLayer: regionLayer,
                    allRegionLayers: allRegionLayers,
                    somaliaData: adm1Boundaries,
                    targetRegion: regionName,

                    // Roads (from dynamic or legacy)
                    clippedRoadsLayer: layersByType.roads[0]?.layer || clippedRoadsLayer,
                    activeRoadsRegion: layersByType.roads.length > 0 ? regionName : activeRoadsRegion,
                    roadsData: layersByType.roads[0]?.data || roadsData,

                    // Population and MPI
                    populationLayer: layersByType.population[0]?.layer || (typeof populationLayer !== 'undefined' ? populationLayer : null),
                    populationData: layersByType.population[0]?.data || (typeof populationData !== 'undefined' ? populationData : null),
                    mpiLayer: mpiLayer
                };

                console.log('[iSEE] Dynamic layers discovered:', Object.keys(dynamicLayers).length);
                console.log('[iSEE] Layers by type:', Object.fromEntries(
                    Object.entries(layersByType).map(([k, v]) => [k, v.length])
                ));
                console.log('[iSEE] Legacy activeBakoolLayers:', activeBakoolLayers);

                // Call the actual iSEE Analytics function
                if (typeof runISEEAnalytics === 'function') {
                    runISEEAnalytics(activeBakoolLayers, map, layerRefs, regionName);
                } else {
                    console.error('[iSEE] runISEEAnalytics function not found!');
                    alert('Error: iSEE Analytics module not loaded. Please refresh the page.');
                }
            };

            console.log('[iSEE] Analytics implementation registered (with automatic layer discovery)');

            // Drag start
            bakool2022Label.addEventListener('dragstart', function(e) {
                // REGION-FIRST: Check if a region is locked
                if (!regionLockState.isLocked) {
                    e.preventDefault();
                    showSelectRegionWarning();
                    return;
                }

                // REGION-FIRST: Only allow drop on Bakool if Bakool is locked
                if (regionLockState.lockedRegion !== 'Bakool') {
                    e.preventDefault();
                    showWrongRegionWarning('Bakool Nightlight 2022', 'Bakool');
                    return;
                }

                draggedLayerId = 'bakool2022';

                // Add dragging class to body for cursor control
                document.body.classList.add('dragging');

                // Create cursor indicator
                cursorIndicator = document.createElement('div');
                cursorIndicator.className = 'cursor-indicator';
                document.body.appendChild(cursorIndicator);

                // Create ghost element (preview while dragging)
                dragGhost = document.createElement('div');
                dragGhost.style.cssText = `
                    position: fixed;
                    background: rgba(168, 85, 247, 0.9);
                    color: white;
                    padding: 8px 12px;
                    border-radius: 6px;
                    font-size: 0.85em;
                    pointer-events: none;
                    z-index: 10000;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                `;
                dragGhost.textContent = '💡 Bakool 2022 Nightlight';
                document.body.appendChild(dragGhost);

                // Add dragging class
                bakool2022Label.classList.add('dragging-layer');

                // Store data
                e.dataTransfer.effectAllowed = 'copy';
                e.dataTransfer.setData('text/plain', 'bakool2022');

                // Hide default drag image
                const img = new Image();
                img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
                e.dataTransfer.setDragImage(img, 0, 0);
            });

            // Drag over - update ghost and cursor indicator position
            document.addEventListener('drag', function(e) {
                if (dragGhost && e.clientX !== 0 && e.clientY !== 0) {
                    dragGhost.style.left = (e.clientX + 10) + 'px';
                    dragGhost.style.top = (e.clientY + 10) + 'px';
                }
                if (cursorIndicator && e.clientX !== 0 && e.clientY !== 0) {
                    cursorIndicator.style.left = e.clientX + 'px';
                    cursorIndicator.style.top = e.clientY + 'px';
                }
            });

            // Drag end - cleanup
            bakool2022Label.addEventListener('dragend', function(e) {
                bakool2022Label.classList.remove('dragging-layer');
                document.body.classList.remove('dragging');

                if (dragGhost) {
                    document.body.removeChild(dragGhost);
                    dragGhost = null;
                }

                if (cursorIndicator) {
                    document.body.removeChild(cursorIndicator);
                    cursorIndicator = null;
                }

                draggedLayerId = null;

                // Remove highlight from Bakool region
                if (bakoolRegionLayer) {
                    adm1Layer.resetStyle(bakoolRegionLayer);
                }

                // Remove cursor classes
                mapContainer.classList.remove('drop-target');
                mapContainer.classList.remove('drop-invalid');
            });

            // Map dragover - highlight drop zones and update cursor (using DOM events)
            const mapContainer = map.getContainer();

            mapContainer.addEventListener('dragover', function(e) {
                if (draggedLayerId === 'bakool2022' && bakoolRegionLayer) {
                    e.preventDefault(); // Allow drop
                    e.stopPropagation();

                    const rect = mapContainer.getBoundingClientRect();
                    const latlng = map.containerPointToLatLng([e.clientX - rect.left, e.clientY - rect.top]);
                    const bounds = bakoolRegionLayer.getBounds();

                    if (bounds.contains(latlng)) {
                        // Check if layer is already active on this region
                        if (activeBakoolLayers['bakool2022']) {
                            // Layer already active - show warning
                            mapContainer.classList.add('drop-invalid');
                            mapContainer.classList.remove('drop-target');

                            // Deactivate cursor indicator
                            if (cursorIndicator) {
                                cursorIndicator.classList.remove('active');
                            }

                            // Update ghost with warning
                            if (dragGhost) {
                                dragGhost.style.background = 'rgba(251, 146, 60, 0.9)'; // Orange for warning
                                dragGhost.textContent = '⚠ Bakool 2022 already active';
                            }

                            // Highlight region in orange
                            bakoolRegionLayer.setStyle({
                                color: '#fb923c',
                                weight: 4,
                                opacity: 1,
                                fillColor: '#fb923c',
                                fillOpacity: 0.2,
                                dashArray: '10, 5'
                            });
                        } else {
                            // Over Bakool region - valid drop zone
                            mapContainer.classList.add('drop-target');
                            mapContainer.classList.remove('drop-invalid');

                            // Activate cursor indicator (green glow)
                            if (cursorIndicator) {
                                cursorIndicator.classList.add('active');
                            }

                            // Update ghost visual feedback
                            if (dragGhost) {
                                dragGhost.style.background = 'rgba(34, 197, 94, 0.9)'; // Green for valid
                                dragGhost.textContent = '✓ Drop to activate Bakool 2022';
                            }

                            // Highlight region
                            bakoolRegionLayer.setStyle({
                                color: '#a855f7',
                                weight: 4,
                                opacity: 1,
                                fillColor: '#a855f7',
                                fillOpacity: 0.2,
                                dashArray: '10, 5'
                            });
                        }
                    } else {
                        // Outside Bakool - invalid drop zone
                        mapContainer.classList.add('drop-invalid');
                        mapContainer.classList.remove('drop-target');

                        // Deactivate cursor indicator
                        if (cursorIndicator) {
                            cursorIndicator.classList.remove('active');
                        }

                        // Update ghost visual feedback
                        if (dragGhost) {
                            dragGhost.style.background = 'rgba(239, 68, 68, 0.9)'; // Red for invalid
                            dragGhost.textContent = '✗ Drop only on Bakool region';
                        }

                        // Reset region style
                        adm1Layer.resetStyle(bakoolRegionLayer);
                    }
                }
            });

            // Map dragleave - reset styles
            mapContainer.addEventListener('dragleave', function(e) {
                if (bakoolRegionLayer) {
                    adm1Layer.resetStyle(bakoolRegionLayer);
                }
                mapContainer.classList.remove('drop-target');
                mapContainer.classList.remove('drop-invalid');
            });

            // Drop handler for map (using DOM events)
            mapContainer.addEventListener('drop', function(e) {
                e.preventDefault();
                e.stopPropagation();

                if (draggedLayerId === 'bakool2022') {
                    // Get drop location
                    const rect = mapContainer.getBoundingClientRect();
                    const latlng = map.containerPointToLatLng([e.clientX - rect.left, e.clientY - rect.top]);

                    // Check if dropped on Bakool region
                    let droppedOnBakool = false;

                    if (bakoolRegionLayer) {
                        const bounds = bakoolRegionLayer.getBounds();
                        if (bounds.contains(latlng)) {
                            droppedOnBakool = true;
                        }
                    }

                    if (droppedOnBakool) {
                        // Reset region style
                        adm1Layer.resetStyle(bakoolRegionLayer);

                        // Check if layer is already active
                        if (activeBakoolLayers['bakool2022']) {
                            // Show warning notification - layer already active
                            const warningNotification = L.popup({
                                closeButton: false,
                                autoClose: true,
                                autoPan: false,
                                className: 'drop-warning-popup'
                            })
                            .setLatLng(latlng)
                            .setContent('⚠ Bakool 2022 is already active - Cannot add duplicate layer')
                            .openOn(map);

                            setTimeout(() => {
                                map.closePopup(warningNotification);
                            }, 3000);
                        } else {
                            // 1. Enable the layer
                            if (!map.hasLayer(detailedNLBakool2022)) {
                                map.addLayer(detailedNLBakool2022);
                                document.getElementById('bakool2022Toggle').checked = true;
                                activeBakoolLayers['bakool2022'] = true; // Mark as active

                                // REGION-FIRST: Register layer with regionLockState
                                regionLockState.addLayer('Bakool Nightlight 2022', detailedNLBakool2022, 'nightlight');
                            }

                            // 2. Add flashing green class to show layer is dropped
                            bakool2022Label.classList.add('layer-dropped');

                            // 3. Zoom to Bakool region
                            const bakoolBounds = bakoolRegionLayer.getBounds();
                            map.fitBounds(bakoolBounds, {
                                padding: [50, 50],
                                maxZoom: 10,
                                animate: true,
                                duration: 1.0
                            });

                            // 4. Show success notification
                            const notification = L.popup({
                                closeButton: false,
                                autoClose: true,
                                autoPan: false,
                                className: 'drop-success-popup'
                            })
                            .setLatLng(latlng)
                            .setContent('✓ Bakool 2022 Nightlight Layer Activated')
                            .openOn(map);

                            setTimeout(() => {
                                map.closePopup(notification);
                            }, 2000);
                        }
                    } else {
                        // Dropped outside Bakool - show warning and reset region style
                        showDropOutsideRegionWarning('Bakool 2022 Nightlight', latlng);
                        if (bakoolRegionLayer) {
                            adm1Layer.resetStyle(bakoolRegionLayer);
                        }
                    }

                    // Remove cursor classes
                    mapContainer.classList.remove('drop-target');
                    mapContainer.classList.remove('drop-invalid');
                }
            });

            // ========================================
            // DRAG-AND-DROP: Bakool 2023 Layer
            // ========================================

            const bakool2023Label = document.getElementById('bakool2023Label');
            let draggedLayerId2023 = null;
            let dragGhost2023 = null;
            let cursorIndicator2023 = null;

            // Drag start
            bakool2023Label.addEventListener('dragstart', function(e) {
                // REGION-FIRST: Check if a region is locked
                if (!regionLockState.isLocked) {
                    e.preventDefault();
                    showSelectRegionWarning();
                    return;
                }

                // REGION-FIRST: Only allow drop on Bakool if Bakool is locked
                if (regionLockState.lockedRegion !== 'Bakool') {
                    e.preventDefault();
                    showWrongRegionWarning('Bakool Nightlight 2023', 'Bakool');
                    return;
                }

                draggedLayerId2023 = 'bakool2023';

                // Add dragging class to body for cursor control
                document.body.classList.add('dragging');

                // Create cursor indicator
                cursorIndicator2023 = document.createElement('div');
                cursorIndicator2023.className = 'cursor-indicator';
                document.body.appendChild(cursorIndicator2023);

                // Create ghost element (preview while dragging)
                dragGhost2023 = document.createElement('div');
                dragGhost2023.style.cssText = `
                    position: fixed;
                    background: rgba(168, 85, 247, 0.9);
                    color: white;
                    padding: 8px 12px;
                    border-radius: 6px;
                    font-size: 0.85em;
                    pointer-events: none;
                    z-index: 10000;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                `;
                dragGhost2023.textContent = '💡 Bakool 2023 Nightlight';
                document.body.appendChild(dragGhost2023);

                // Add dragging class
                bakool2023Label.classList.add('dragging-layer');

                // Store data
                e.dataTransfer.effectAllowed = 'copy';
                e.dataTransfer.setData('text/plain', 'bakool2023');

                // Hide default drag image
                const img = new Image();
                img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
                e.dataTransfer.setDragImage(img, 0, 0);
            });

            // Drag over - update ghost and cursor indicator position
            document.addEventListener('drag', function(e) {
                if (dragGhost2023 && e.clientX !== 0 && e.clientY !== 0) {
                    dragGhost2023.style.left = (e.clientX + 10) + 'px';
                    dragGhost2023.style.top = (e.clientY + 10) + 'px';
                }
                if (cursorIndicator2023 && e.clientX !== 0 && e.clientY !== 0) {
                    cursorIndicator2023.style.left = e.clientX + 'px';
                    cursorIndicator2023.style.top = e.clientY + 'px';
                }
            });

            // Drag end - cleanup
            bakool2023Label.addEventListener('dragend', function(e) {
                bakool2023Label.classList.remove('dragging-layer');
                document.body.classList.remove('dragging');

                if (dragGhost2023) {
                    document.body.removeChild(dragGhost2023);
                    dragGhost2023 = null;
                }

                if (cursorIndicator2023) {
                    document.body.removeChild(cursorIndicator2023);
                    cursorIndicator2023 = null;
                }

                draggedLayerId2023 = null;

                // Remove highlight from Bakool region
                if (bakoolRegionLayer) {
                    adm1Layer.resetStyle(bakoolRegionLayer);
                }

                // Remove cursor classes
                mapContainer.classList.remove('drop-target');
                mapContainer.classList.remove('drop-invalid');
            });

            // Map dragover - update for Bakool 2023
            mapContainer.addEventListener('dragover', function(e) {
                if (draggedLayerId2023 === 'bakool2023' && bakoolRegionLayer) {
                    e.preventDefault();
                    e.stopPropagation();

                    const rect = mapContainer.getBoundingClientRect();
                    const latlng = map.containerPointToLatLng([e.clientX - rect.left, e.clientY - rect.top]);
                    const bounds = bakoolRegionLayer.getBounds();

                    if (bounds.contains(latlng)) {
                        // Check if layer is already active on this region
                        if (activeBakoolLayers['bakool2023']) {
                            // Layer already active - show warning
                            mapContainer.classList.add('drop-invalid');
                            mapContainer.classList.remove('drop-target');

                            if (cursorIndicator2023) {
                                cursorIndicator2023.classList.remove('active');
                            }

                            if (dragGhost2023) {
                                dragGhost2023.style.background = 'rgba(251, 146, 60, 0.9)'; // Orange for warning
                                dragGhost2023.textContent = '⚠ Bakool 2023 already active';
                            }

                            bakoolRegionLayer.setStyle({
                                color: '#fb923c',
                                weight: 4,
                                opacity: 1,
                                fillColor: '#fb923c',
                                fillOpacity: 0.2,
                                dashArray: '10, 5'
                            });
                        } else {
                            mapContainer.classList.add('drop-target');
                            mapContainer.classList.remove('drop-invalid');

                            if (cursorIndicator2023) {
                                cursorIndicator2023.classList.add('active');
                            }

                            if (dragGhost2023) {
                                dragGhost2023.style.background = 'rgba(34, 197, 94, 0.9)';
                                dragGhost2023.textContent = '✓ Drop to activate Bakool 2023';
                            }

                            bakoolRegionLayer.setStyle({
                                color: '#a855f7',
                                weight: 4,
                                opacity: 1,
                                fillColor: '#a855f7',
                                fillOpacity: 0.2,
                                dashArray: '10, 5'
                            });
                        }
                    } else {
                        mapContainer.classList.add('drop-invalid');
                        mapContainer.classList.remove('drop-target');

                        if (cursorIndicator2023) {
                            cursorIndicator2023.classList.remove('active');
                        }

                        if (dragGhost2023) {
                            dragGhost2023.style.background = 'rgba(239, 68, 68, 0.9)';
                            dragGhost2023.textContent = '✗ Drop only on Bakool region';
                        }

                        adm1Layer.resetStyle(bakoolRegionLayer);
                    }
                }
            });

            // Drop handler for Bakool 2023
            mapContainer.addEventListener('drop', function(e) {
                if (draggedLayerId2023 === 'bakool2023') {
                    e.preventDefault();
                    e.stopPropagation();

                    const rect = mapContainer.getBoundingClientRect();
                    const latlng = map.containerPointToLatLng([e.clientX - rect.left, e.clientY - rect.top]);

                    let droppedOnBakool = false;

                    if (bakoolRegionLayer) {
                        const bounds = bakoolRegionLayer.getBounds();
                        if (bounds.contains(latlng)) {
                            droppedOnBakool = true;
                        }
                    }

                    if (droppedOnBakool) {
                        adm1Layer.resetStyle(bakoolRegionLayer);

                        // Check if layer is already active
                        if (activeBakoolLayers['bakool2023']) {
                            // Show warning notification - layer already active
                            const warningNotification = L.popup({
                                closeButton: false,
                                autoClose: true,
                                autoPan: false,
                                className: 'drop-warning-popup'
                            })
                            .setLatLng(latlng)
                            .setContent('⚠ Bakool 2023 is already active - Cannot add duplicate layer')
                            .openOn(map);

                            setTimeout(() => {
                                map.closePopup(warningNotification);
                            }, 3000);
                        } else {
                            if (!map.hasLayer(detailedNLBakool2023)) {
                                map.addLayer(detailedNLBakool2023);
                                document.getElementById('bakool2023Toggle').checked = true;
                                activeBakoolLayers['bakool2023'] = true; // Mark as active

                                // REGION-FIRST: Register layer with regionLockState
                                regionLockState.addLayer('Bakool Nightlight 2023', detailedNLBakool2023, 'nightlight');
                            }

                            // Add flashing green class to show layer is dropped
                            bakool2023Label.classList.add('layer-dropped');

                            const bakoolBounds = bakoolRegionLayer.getBounds();
                            map.fitBounds(bakoolBounds, {
                                padding: [50, 50],
                                maxZoom: 10,
                                animate: true,
                                duration: 1.0
                            });

                            const notification = L.popup({
                                closeButton: false,
                                autoClose: true,
                                autoPan: false,
                                className: 'drop-success-popup'
                            })
                            .setLatLng(latlng)
                            .setContent('✓ Bakool 2023 Nightlight Layer Activated')
                            .openOn(map);

                            setTimeout(() => {
                                map.closePopup(notification);
                            }, 2000);
                        }
                    } else {
                        // Dropped outside Bakool - show warning
                        showDropOutsideRegionWarning('Bakool 2023 Nightlight', latlng);
                        if (bakoolRegionLayer) {
                            adm1Layer.resetStyle(bakoolRegionLayer);
                        }
                    }

                    mapContainer.classList.remove('drop-target');
                    mapContainer.classList.remove('drop-invalid');
                }
            });

            // ========================================
            // DRAG-AND-DROP: iSEE Analytics
            // ========================================

            // iseeAnalyticsLabel already declared above at line 1250
            // iseeAnalyticsActive already declared above at line 1271

            // Drag start
            iseeAnalyticsLabel.addEventListener('dragstart', function(e) {
                // REGION-FIRST: Check if a region is locked
                if (!regionLockState.isLocked) {
                    e.preventDefault();
                    showSelectRegionWarning();
                    return;
                }

                draggedLayerId = 'iseeAnalytics';
                document.body.classList.add('dragging');

                // Create cursor indicator
                cursorIndicator = document.createElement('div');
                cursorIndicator.className = 'cursor-indicator';
                document.body.appendChild(cursorIndicator);

                // Create ghost element
                dragGhost = document.createElement('div');
                dragGhost.style.cssText = `
                    position: fixed;
                    background: rgba(168, 85, 247, 0.9);
                    color: white;
                    padding: 8px 12px;
                    border-radius: 6px;
                    font-size: 0.85em;
                    pointer-events: none;
                    z-index: 10000;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                `;
                dragGhost.textContent = '🔍 iSEE Analytics';
                document.body.appendChild(dragGhost);

                // Add dragging class
                iseeAnalyticsLabel.classList.add('dragging-layer');

                // Store data
                e.dataTransfer.effectAllowed = 'copy';
                e.dataTransfer.setData('text/plain', 'iseeAnalytics');

                // Hide default drag image
                const img = new Image();
                img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
                e.dataTransfer.setDragImage(img, 0, 0);
            });

            // Drag over - update ghost position
            document.addEventListener('drag', function(e) {
                if (dragGhost && e.clientX !== 0 && e.clientY !== 0) {
                    dragGhost.style.left = (e.clientX + 10) + 'px';
                    dragGhost.style.top = (e.clientY + 10) + 'px';
                }
            });

            // Drag end - cleanup
            let hoveredRegionName = null; // Track which region is being hovered over

            iseeAnalyticsLabel.addEventListener('dragend', function(e) {
                iseeAnalyticsLabel.classList.remove('dragging-layer');
                document.body.classList.remove('dragging');

                if (dragGhost) {
                    document.body.removeChild(dragGhost);
                    dragGhost = null;
                }
                if (cursorIndicator) {
                    document.body.removeChild(cursorIndicator);
                    cursorIndicator = null;
                }
                draggedLayerId = null;

                // Remove highlight from ALL regions
                Object.values(allRegionLayers).forEach(function(regionLayer) {
                    adm1Layer.resetStyle(regionLayer);
                });
                hoveredRegionName = null;
            });

            // Map dragover handler for iSEE Analytics - ONLY ALLOWS DROP ON LOCKED REGION
            mapContainer.addEventListener('dragover', function(e) {
                if (draggedLayerId === 'iseeAnalytics') {
                    e.preventDefault();

                    const rect = mapContainer.getBoundingClientRect();
                    const latlng = map.containerPointToLatLng([e.clientX - rect.left, e.clientY - rect.top]);

                    // REGION-FIRST: Only allow drop on the LOCKED region
                    const isOverLockedRegion = isPointInLockedRegion(latlng);
                    const lockedRegionName = regionLockState.lockedRegion;
                    const lockedRegionLayer = regionLockState.lockedRegionLayer;

                    if (isOverLockedRegion && lockedRegionLayer) {
                        // Hovering over the locked region
                        if (iseeAnalyticsActive) {
                            // iSEE Analytics already active - show warning
                            mapContainer.classList.add('drop-invalid');
                            mapContainer.classList.remove('drop-target');

                            if (dragGhost) {
                                dragGhost.style.background = 'rgba(251, 146, 60, 0.9)'; // Orange
                                dragGhost.textContent = '⚠ iSEE Analytics already active';
                            }

                            // Highlight region in orange
                            lockedRegionLayer.setStyle({
                                color: '#fb923c',
                                weight: 4,
                                opacity: 1,
                                fillColor: '#fb923c',
                                fillOpacity: 0.2,
                                dashArray: '10, 5'
                            });

                            if (cursorIndicator) {
                                cursorIndicator.classList.remove('active');
                            }
                        } else {
                            // Valid drop zone - green feedback
                            mapContainer.classList.add('drop-target');
                            mapContainer.classList.remove('drop-invalid');

                            if (dragGhost) {
                                dragGhost.style.background = 'rgba(34, 197, 94, 0.9)'; // Green
                                dragGhost.textContent = `✓ Drop on ${lockedRegionName} to activate iSEE Analytics`;
                            }

                            // Highlight region in green
                            lockedRegionLayer.setStyle({
                                color: '#22c55e',
                                weight: 4,
                                opacity: 1,
                                fillColor: '#22c55e',
                                fillOpacity: 0.2,
                                dashArray: '10, 5'
                            });

                            // Show flashing green cursor indicator
                            if (cursorIndicator) {
                                cursorIndicator.style.left = e.clientX + 'px';
                                cursorIndicator.style.top = e.clientY + 'px';
                                cursorIndicator.classList.add('active');
                            }
                        }
                    } else {
                        // Not over the locked region - INVALID drop zone
                        mapContainer.classList.add('drop-invalid');
                        mapContainer.classList.remove('drop-target');

                        if (dragGhost) {
                            dragGhost.style.background = 'rgba(239, 68, 68, 0.9)'; // Red
                            dragGhost.textContent = `🚫 Drop only on ${lockedRegionName}`;
                        }

                        // Reset locked region style
                        if (lockedRegionLayer) {
                            adm1Layer.resetStyle(lockedRegionLayer);
                        }

                        if (cursorIndicator) {
                            cursorIndicator.classList.remove('active');
                        }
                    }

                    // Update cursor indicator position
                    if (cursorIndicator && e.clientX !== 0 && e.clientY !== 0) {
                        cursorIndicator.style.left = e.clientX + 'px';
                        cursorIndicator.style.top = e.clientY + 'px';
                    }
                }
            });

            // Map drop handler for iSEE Analytics - NOW WORKS WITH LOCKED REGION
            mapContainer.addEventListener('drop', function(e) {
                if (draggedLayerId === 'iseeAnalytics') {
                    e.preventDefault();

                    const rect = mapContainer.getBoundingClientRect();
                    const latlng = map.containerPointToLatLng([e.clientX - rect.left, e.clientY - rect.top]);

                    // REGION-FIRST: Use locked region
                    if (!regionLockState.isLocked) {
                        showSelectRegionWarning();
                        mapContainer.classList.remove('drop-target', 'drop-invalid');
                        return;
                    }

                    // CHECK: Drop must be ON the locked region, not anywhere else
                    if (!isPointInLockedRegion(latlng)) {
                        showDropOutsideRegionWarning('iSEE Analytics', latlng);
                        mapContainer.classList.remove('drop-target', 'drop-invalid');
                        return;
                    }

                    const droppedRegion = regionLockState.lockedRegion;
                    const droppedRegionLayer = regionLockState.lockedRegionLayer;

                    if (droppedRegion) {
                        // Reset region style
                        adm1Layer.resetStyle(droppedRegionLayer);

                        // Check if already active
                        if (iseeAnalyticsActive) {
                            // Show warning notification
                            const warningNotification = L.popup({
                                closeButton: false,
                                autoClose: true,
                                autoPan: false,
                                className: 'drop-warning-popup'
                            })
                            .setLatLng(latlng)
                            .setContent('⚠ iSEE Analytics is already active - Cannot add duplicate')
                            .openOn(map);

                            setTimeout(() => {
                                map.closePopup(warningNotification);
                            }, 3000);
                        } else {
                            // Activate iSEE Analytics
                            iseeAnalyticsActive = true;

                            // Check the checkbox
                            document.getElementById('iseeAnalyticsToggle').checked = true;

                            // Add flashing green class to show layer is dropped
                            iseeAnalyticsLabel.classList.add('layer-dropped');

                            // Zoom to the dropped region
                            const regionBounds = droppedRegionLayer.getBounds();
                            map.fitBounds(regionBounds, {
                                padding: [50, 50],
                                maxZoom: 10,
                                animate: true,
                                duration: 1.0
                            });

                            // Show success notification
                            const notification = L.popup({
                                closeButton: false,
                                autoClose: true,
                                autoPan: false,
                                className: 'drop-success-popup'
                            })
                            .setLatLng(latlng)
                            .setContent(`✓ iSEE Analytics Activated on ${droppedRegion}`)
                            .openOn(map);

                            setTimeout(() => {
                                map.closePopup(notification);

                                // ========================================
                                // RUN iSEE ANALYTICS ENGINE
                                // ========================================
                                console.log('='.repeat(60));
                                console.log('DEBUG: About to call runISEEAnalytics');
                                console.log('Type of runISEEAnalytics:', typeof runISEEAnalytics);
                                console.log('Target Region:', droppedRegion);
                                console.log('='.repeat(60));

                                if (typeof runISEEAnalytics === 'function') {
                                    // Prepare layer references to pass to analytics function
                                    const layerRefs = {
                                        detailedNLBakool2022: detailedNLBakool2022,
                                        detailedNLBakool2023: detailedNLBakool2023,
                                        bakoolNightlightPolygons2022: bakoolNightlightPolygons2022,
                                        bakoolNightlightPolygons2023: bakoolNightlightPolygons2023,
                                        regionLayer: droppedRegionLayer,
                                        allRegionLayers: allRegionLayers,
                                        somaliaData: adm1Boundaries,  // Pass MPI/region data for basic analysis
                                        // Roads 2023 layer references for iSEE Analytics
                                        clippedRoadsLayer: clippedRoadsLayer,
                                        activeRoadsRegion: activeRoadsRegion,
                                        roadsData: roadsData,
                                        // Population layer references for iSEE Analytics
                                        populationLayer: populationLayer,
                                        populationData: populationData,
                                        // MPI layer reference for iSEE Analytics
                                        mpiLayer: mpiLayer
                                    };

                                    // Call runISEEAnalytics with region parameter
                                    runISEEAnalytics(activeBakoolLayers, map, layerRefs, droppedRegion);
                                } else {
                                    console.error('ERROR: runISEEAnalytics is not defined!');
                                    alert('Error: iSEE Analytics function not loaded. Please refresh the page.');
                                }
                            }, 2000);
                        }
                    } else {
                        // Dropped outside any region - reset all regions
                        Object.values(allRegionLayers).forEach(function(regionLayer) {
                            adm1Layer.resetStyle(regionLayer);
                        });
                    }

                    // Remove cursor classes
                    mapContainer.classList.remove('drop-target');
                    mapContainer.classList.remove('drop-invalid');
                }
            });

            // ========================================
            // SHARED HELPER FUNCTIONS FOR ROAD LAYERS
            // ========================================

            // Note: clippedRoadsLayer, activeRoadsRegion, roadsData declared above (near line 1522)
            // for use by iSEE Analytics

            // Helper function: Point-in-polygon detection using ray casting algorithm
            function isPointInPolygon(point, layer) {
                const coords = layer.getLatLngs();
                if (!coords || coords.length === 0) return false;

                // Handle MultiPolygon or Polygon
                const polygons = Array.isArray(coords[0][0]) ? coords : [coords];

                for (let poly of polygons) {
                    const ring = Array.isArray(poly[0]) ? poly[0] : poly;
                    let inside = false;

                    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
                        const xi = ring[i].lng, yi = ring[i].lat;
                        const xj = ring[j].lng, yj = ring[j].lat;

                        const intersect = ((yi > point.lat) !== (yj > point.lat))
                            && (point.lng < (xj - xi) * (point.lat - yi) / (yj - yi) + xi);
                        if (intersect) inside = !inside;
                    }

                    if (inside) return true;
                }
                return false;
            }

            // ========================================
            // DRAG-AND-DROP: Roads OSM Layer (2023)
            // ========================================

            const roadsOSMLabel = document.getElementById('roadsOSMLabel');
            const roadsOSMToggle = document.getElementById('roadsOSMToggle');

            // Right-click context menu for Roads OSM 2023
            roadsOSMLabel.addEventListener('contextmenu', function(e) {
                e.preventDefault();
                const isActive = activeRoadsOSMLayer && map.hasLayer(activeRoadsOSMLayer);

                showLayerContextMenu('roadsOSM', 'Roads OSM 2023', '#F48FB1', e.clientX, e.clientY, {
                    isActive,
                    onToggle: function() {
                        if (isActive) {
                            map.removeLayer(activeRoadsOSMLayer);
                            roadsOSMToggle.checked = false;
                            roadsOSMLabel.classList.remove('layer-dropped');
                        } else if (activeRoadsOSMLayer) {
                            map.addLayer(activeRoadsOSMLayer);
                            roadsOSMToggle.checked = true;
                            roadsOSMLabel.classList.add('layer-dropped');
                        }
                    },
                    onZoom: function() {
                        if (activeRoadsOSMLayer) {
                            map.fitBounds(activeRoadsOSMLayer.getBounds(), { padding: [50, 50] });
                        }
                    },
                    onRemove: function() {
                        if (activeRoadsOSMLayer) {
                            map.removeLayer(activeRoadsOSMLayer);
                            activeRoadsOSMLayer = null;
                            activeRoadsOSMRegion = null;
                            roadsOSMToggle.checked = false;
                            roadsOSMLabel.classList.remove('layer-dropped');
                        }
                    },
                    onInfo: function() {
                        alert(`Roads OSM 2023\n\nSource: OpenStreetMap via HDX\nRegion: ${activeRoadsOSMRegion || 'Not loaded'}\nFeatures: ${activeRoadsOSMLayer ? activeRoadsOSMLayer.getLayers().length : 0} roads`);
                    }
                });
            });

            roadsOSMLabel.addEventListener('dragstart', function(e) {
                // REGION-FIRST: Check if a region is locked
                if (!regionLockState.isLocked) {
                    e.preventDefault();
                    showSelectRegionWarning();
                    return;
                }

                draggedLayerId = 'roadsOSM';

                // Add dragging class to body for cursor control
                document.body.classList.add('dragging');

                // Create cursor indicator
                cursorIndicator = document.createElement('div');
                cursorIndicator.className = 'cursor-indicator';
                document.body.appendChild(cursorIndicator);

                // Create ghost element (preview while dragging)
                dragGhost = document.createElement('div');
                dragGhost.style.cssText = `
                    position: fixed;
                    background: rgba(244, 143, 177, 0.9);
                    color: white;
                    padding: 8px 12px;
                    border-radius: 6px;
                    font-size: 0.85em;
                    pointer-events: none;
                    z-index: 10000;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                `;
                dragGhost.textContent = '🛣️ Roads OSM - Drop on any region';
                document.body.appendChild(dragGhost);

                // Add dragging class
                roadsOSMLabel.classList.add('dragging-layer');

                // Store data
                e.dataTransfer.effectAllowed = 'copy';
                e.dataTransfer.setData('text/plain', 'roadsOSM');

                // Hide default drag image
                const img = new Image();
                img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
                e.dataTransfer.setDragImage(img, 0, 0);
            });

            // Update ghost position for Roads OSM
            document.addEventListener('drag', function(e) {
                if (dragGhost && draggedLayerId === 'roadsOSM' && e.clientX !== 0 && e.clientY !== 0) {
                    dragGhost.style.left = (e.clientX + 10) + 'px';
                    dragGhost.style.top = (e.clientY + 10) + 'px';
                }
            });

            // Drag end - cleanup for Roads OSM
            roadsOSMLabel.addEventListener('dragend', function(e) {
                roadsOSMLabel.classList.remove('dragging-layer');
                document.body.classList.remove('dragging');

                if (dragGhost) {
                    document.body.removeChild(dragGhost);
                    dragGhost = null;
                }
                if (cursorIndicator) {
                    document.body.removeChild(cursorIndicator);
                    cursorIndicator = null;
                }
                draggedLayerId = null;

                // Remove highlight from all regions
                Object.values(allRegionLayers).forEach(regionLayer => {
                    adm1Layer.resetStyle(regionLayer);
                });
            });

            // Map dragover handler for Roads OSM
            mapContainer.addEventListener('dragover', function(e) {
                if (draggedLayerId === 'roadsOSM') {
                    e.preventDefault();

                    const rect = mapContainer.getBoundingClientRect();
                    const latlng = map.containerPointToLatLng([e.clientX - rect.left, e.clientY - rect.top]);

                    // REGION-FIRST: Only allow drop on the LOCKED region
                    const isOverLockedRegion = isPointInLockedRegion(latlng);
                    const lockedRegionName = regionLockState.lockedRegion;

                    if (isOverLockedRegion) {
                        // Valid drop zone (over the locked region)
                        mapContainer.classList.add('drop-target');
                        mapContainer.classList.remove('drop-invalid');

                        if (dragGhost) {
                            dragGhost.style.background = 'rgba(34, 197, 94, 0.9)'; // Green (ready)
                            dragGhost.textContent = `✓ Drop to load OSM Roads for ${lockedRegionName}`;
                        }

                        // Highlight only the locked region in green
                        if (regionLockState.lockedRegionLayer) {
                            regionLockState.lockedRegionLayer.setStyle({
                                color: '#22c55e',
                                weight: 4,
                                opacity: 1,
                                fillColor: '#22c55e',
                                fillOpacity: 0.2,
                                dashArray: '10, 5'
                            });
                        }

                        // Show flashing green cursor indicator
                        if (cursorIndicator) {
                            cursorIndicator.style.left = e.clientX + 'px';
                            cursorIndicator.style.top = e.clientY + 'px';
                            cursorIndicator.style.borderColor = '#22c55e';
                            cursorIndicator.classList.add('active');
                        }
                    } else {
                        // Outside locked region - INVALID drop zone
                        mapContainer.classList.add('drop-invalid');
                        mapContainer.classList.remove('drop-target');

                        if (dragGhost) {
                            dragGhost.style.background = 'rgba(239, 68, 68, 0.9)'; // Red
                            dragGhost.textContent = `🚫 Drop only on ${lockedRegionName}`;
                        }

                        // Reset locked region style (remove highlight)
                        if (regionLockState.lockedRegionLayer) {
                            adm1Layer.resetStyle(regionLockState.lockedRegionLayer);
                        }

                        if (cursorIndicator) {
                            cursorIndicator.classList.remove('active');
                        }
                    }
                }
            });

            // Global variable to store active Roads OSM layer
            let activeRoadsOSMLayer = null;
            let activeRoadsOSMRegion = null;

            // Map drop handler for Roads OSM
            mapContainer.addEventListener('drop', function(e) {
                if (draggedLayerId === 'roadsOSM') {
                    e.preventDefault();

                    const rect = mapContainer.getBoundingClientRect();
                    const latlng = map.containerPointToLatLng([e.clientX - rect.left, e.clientY - rect.top]);

                    // REGION-FIRST: Use locked region instead of detecting drop location
                    if (!regionLockState.isLocked) {
                        showSelectRegionWarning();
                        mapContainer.classList.remove('drop-target', 'drop-invalid');
                        return;
                    }

                    // CHECK: Drop must be ON the locked region, not anywhere else
                    if (!isPointInLockedRegion(latlng)) {
                        showDropOutsideRegionWarning('Roads OSM 2023', latlng);
                        mapContainer.classList.remove('drop-target', 'drop-invalid');
                        return;
                    }

                    const droppedRegion = regionLockState.lockedRegion;
                    const droppedRegionLayer = regionLockState.lockedRegionLayer;

                    if (droppedRegion) {
                        // DUPLICATE CHECK: Check if Roads OSM is already loaded for this region
                        const roadsOSMLayerName = `Roads OSM - ${droppedRegion}`;
                        if (regionLockState.hasLayer(roadsOSMLayerName)) {
                            L.popup({
                                closeButton: false,
                                autoClose: true,
                                autoPan: false,
                                className: 'drop-warning-popup'
                            })
                            .setLatLng(latlng)
                            .setContent(`⚠️ Roads OSM already loaded for ${droppedRegion}`)
                            .openOn(map);

                            setTimeout(() => map.closePopup(), 2500);
                            mapContainer.classList.remove('drop-target', 'drop-invalid');
                            return;
                        }

                        // Reset region styles
                        Object.values(allRegionLayers).forEach(regionLayer => {
                            adm1Layer.resetStyle(regionLayer);
                        });

                        // Remove any previously loaded Roads OSM layer
                        if (activeRoadsOSMLayer) {
                            map.removeLayer(activeRoadsOSMLayer);
                            regionLockState.removeLayer(`Roads OSM - ${activeRoadsOSMRegion}`);
                            activeRoadsOSMLayer = null;
                        }

                        // Show loading notification
                        const loadingPopup = L.popup({
                            closeButton: false,
                            autoClose: false,
                            autoPan: false,
                            className: 'drop-warning-popup'
                        })
                        .setLatLng(latlng)
                        .setContent(`⏳ Loading OSM Roads for ${droppedRegion}...`)
                        .openOn(map);

                        // Convert region name to safe filename
                        const safeRegionName = droppedRegion.replace(/ /g, '_').replace(/\//g, '_');
                        const roadsFilePath = `../data_warehouse/roads/roads_by_region/${safeRegionName}_roads.js`;

                        // Dynamically load the roads file using fetch and eval
                        const roadsVarName = safeRegionName.toLowerCase() + 'Roads';
                        console.log('🔍 Loading roads file:', roadsFilePath);
                        console.log('🔍 Expected variable name:', roadsVarName);

                        fetch(roadsFilePath + '?t=' + new Date().getTime())
                            .then(response => {
                                if (!response.ok) {
                                    throw new Error(`Failed to load ${roadsFilePath}: ${response.status}`);
                                }
                                return response.text();
                            })
                            .then(scriptContent => {
                                console.log('✓ Roads file downloaded, executing JavaScript...');

                                // Execute the JavaScript code in global scope using indirect eval
                                // (1, eval) creates an indirect eval which runs in global scope
                                (1, eval)(scriptContent);

                                // Now access the variable
                                const loadedRoadsData = window[roadsVarName];

                                if (loadedRoadsData && loadedRoadsData.features) {
                                    console.log(`✓ Found ${roadsVarName}!`);
                                    console.log(`✓ Data contains ${loadedRoadsData.features.length} road features`);

                                    // Create Leaflet GeoJSON layer using unified RoadSymbology module
                                    activeRoadsOSMLayer = L.geoJSON(loadedRoadsData, {
                                    style: function(feature) {
                                        // Use RoadSymbology module if available
                                        if (typeof RoadSymbology !== 'undefined') {
                                            return RoadSymbology.getStyle(feature);
                                        }
                                        // Fallback styling
                                        return { color: '#94a3b8', weight: 1.5, opacity: 0.8 };
                                    },
                                    onEachFeature: function(feature, layer) {
                                        // Use RoadSymbology module for popup if available
                                        if (typeof RoadSymbology !== 'undefined') {
                                            layer.bindPopup(RoadSymbology.getPopupContent(feature, { source: 'OSM 2023' }));
                                        } else {
                                            const props = feature.properties;
                                            layer.bindPopup(`<strong>${props.name || 'Road'}</strong><br>Type: ${props.fclass || props.highway || 'unknown'}`);
                                        }
                                    }
                                }).addTo(map);

                                activeRoadsOSMRegion = droppedRegion;

                                // REGION-FIRST: Register layer with regionLockState
                                regionLockState.addLayer(`Roads OSM - ${droppedRegion}`, activeRoadsOSMLayer, 'roads');

                                // Close loading popup
                                map.closePopup(loadingPopup);

                                // Show success notification
                                const successPopup = L.popup({
                                    closeButton: false,
                                    autoClose: true,
                                    autoPan: false,
                                    className: 'drop-success-popup'
                                })
                                .setLatLng(latlng)
                                .setContent(`✓ Loaded ${loadedRoadsData.metadata.total_roads.toLocaleString()} OSM Roads for ${droppedRegion}`)
                                .openOn(map);

                                setTimeout(() => {
                                    map.closePopup(successPopup);
                                }, 3000);

                                // Zoom to region
                                const regionBounds = droppedRegionLayer.getBounds();
                                map.fitBounds(regionBounds, {
                                    padding: [50, 50],
                                    maxZoom: 10,
                                    animate: true,
                                    duration: 1.0
                                });

                                    // Mark Roads OSM label as dropped
                                    roadsOSMLabel.classList.add('layer-dropped');

                                    // Update checkbox
                                    document.getElementById('roadsOSMToggle').checked = true;

                                    // Update global variables for manual iSEE Analytics trigger
                                    // (Roads data is now available for when user drags iSEE Analytics label)
                                    clippedRoadsLayer = activeRoadsOSMLayer;
                                    activeRoadsRegion = droppedRegion;
                                    roadsData = loadedRoadsData; // Set global roadsData from loaded data

                                    console.log('✅ Roads loaded! Now drag "iSEE Analytics" label to analyze this region.');
                                    console.log('📊 Roads data has metadata:', !!roadsData.metadata);
                                    console.log('📊 Roads data:', roadsData);
                                } else {
                                    // Variable not found after eval
                                    console.log(`❌ ${roadsVarName} not found in window after eval`);
                                    map.closePopup(loadingPopup);
                                    const errorPopup = L.popup({
                                        closeButton: false,
                                        autoClose: true,
                                        autoPan: false,
                                        className: 'drop-invalid-popup'
                                    })
                                    .setLatLng(latlng)
                                    .setContent(`❌ Failed to load roads data for ${droppedRegion}`)
                                    .openOn(map);

                                    setTimeout(() => {
                                        map.closePopup(errorPopup);
                                    }, 2500);
                                }
                            })
                            .catch(error => {
                                console.error('❌ Error loading roads file:', error);
                                map.closePopup(loadingPopup);
                                const errorPopup = L.popup({
                                    closeButton: false,
                                    autoClose: true,
                                    autoPan: false,
                                    className: 'drop-invalid-popup'
                                })
                                .setLatLng(latlng)
                                .setContent(`❌ Roads data not available for ${droppedRegion}`)
                                .openOn(map);

                                setTimeout(() => {
                                    map.closePopup(errorPopup);
                                }, 2500);
                            });
                    } else {
                        // Dropped outside Somalia
                        const invalidPopup = L.popup({
                            closeButton: false,
                            autoClose: true,
                            autoPan: false,
                            className: 'drop-invalid-popup'
                        })
                        .setLatLng(latlng)
                        .setContent('❌ Please drop Roads OSM on a region in Somalia')
                        .openOn(map);

                        setTimeout(() => {
                            map.closePopup(invalidPopup);
                        }, 2500);
                    }

                    // Remove cursor classes
                    mapContainer.classList.remove('drop-target');
                    mapContainer.classList.remove('drop-invalid');
                }
            });

            // Roads OSM 2023 checkbox toggle
            document.getElementById('roadsOSMToggle').addEventListener('change', function(e) {
                if (e.target.checked) {
                    if (activeRoadsOSMLayer) {
                        map.addLayer(activeRoadsOSMLayer);
                        roadsOSMLabel.classList.add('layer-dropped');
                    }
                } else {
                    if (activeRoadsOSMLayer) {
                        map.removeLayer(activeRoadsOSMLayer);
                        roadsOSMLabel.classList.remove('layer-dropped');
                    }
                }
            });

            // ========================================
            // Roads OSM Latest (Auto-Update) Layer
            // ========================================

            let activeRoadsOSMLatestLayer = null;
            let activeRoadsOSMLatestRegion = null;
            const roadsOSMLatestLabel = document.querySelector('#roadsOSMLatestLabel');

            // Map drop handler for Roads OSM Latest
            mapContainer.addEventListener('drop', function(e) {
                if (draggedLayerId === 'roadsOSMLatest') {
                    e.preventDefault();

                    const rect = mapContainer.getBoundingClientRect();
                    const latlng = map.containerPointToLatLng([e.clientX - rect.left, e.clientY - rect.top]);

                    // REGION-FIRST: Use locked region instead of detecting drop location
                    if (!regionLockState.isLocked) {
                        showSelectRegionWarning();
                        mapContainer.classList.remove('drop-target', 'drop-invalid');
                        return;
                    }

                    // CHECK: Drop must be ON the locked region, not anywhere else
                    if (!isPointInLockedRegion(latlng)) {
                        showDropOutsideRegionWarning('Roads OSM Latest', latlng);
                        mapContainer.classList.remove('drop-target', 'drop-invalid');
                        return;
                    }

                    const droppedRegion = regionLockState.lockedRegion;
                    const droppedRegionLayer = regionLockState.lockedRegionLayer;

                    if (droppedRegion) {
                        // DUPLICATE CHECK: Check if Roads Latest is already loaded for this region
                        const roadsLatestLayerName = `Roads Latest - ${droppedRegion}`;
                        if (regionLockState.hasLayer(roadsLatestLayerName)) {
                            L.popup({
                                closeButton: false,
                                autoClose: true,
                                autoPan: false,
                                className: 'drop-warning-popup'
                            })
                            .setLatLng(latlng)
                            .setContent(`⚠️ Roads Latest already loaded for ${droppedRegion}`)
                            .openOn(map);

                            setTimeout(() => map.closePopup(), 2500);
                            mapContainer.classList.remove('drop-target', 'drop-invalid');
                            return;
                        }

                        // Reset region styles
                        Object.values(allRegionLayers).forEach(regionLayer => {
                            adm1Layer.resetStyle(regionLayer);
                        });

                        // Remove any previously loaded Roads OSM Latest layer
                        if (activeRoadsOSMLatestLayer) {
                            map.removeLayer(activeRoadsOSMLatestLayer);
                            regionLockState.removeLayer(`Roads Latest - ${activeRoadsOSMLatestRegion}`);
                            activeRoadsOSMLatestLayer = null;
                        }

                        // Show loading notification
                        const loadingPopup = L.popup({
                            closeButton: false,
                            autoClose: false,
                            autoPan: false,
                            className: 'drop-warning-popup'
                        })
                        .setLatLng(latlng)
                        .setContent(`⏳ Loading Latest OSM Roads for ${droppedRegion}...`)
                        .openOn(map);

                        // Convert region name to safe filename
                        const safeRegionName = droppedRegion.replace(/ /g, '_').replace(/\//g, '_');
                        const roadsFilePath = `../data_warehouse/roads/roads_by_region_latest/${safeRegionName}_roads.geojson`;

                        // Fetch GeoJSON file directly
                        fetch(roadsFilePath + '?t=' + new Date().getTime())
                            .then(response => {
                                if (!response.ok) {
                                    throw new Error(`No updated roads available for ${droppedRegion}. Please click "Update Roads from HDX API" first.`);
                                }
                                return response.json();
                            })
                            .then(loadedRoadsData => {
                                if (loadedRoadsData && loadedRoadsData.features) {
                                    // Create Leaflet GeoJSON layer
                                    activeRoadsOSMLatestLayer = L.geoJSON(loadedRoadsData, {
                                        style: function(feature) {
                                            // Color roads by type (highway property from OSM)
                                            const highway = feature.properties.highway || 'unknown';
                                            let color = '#94a3b8'; // Default gray

                                            if (highway === 'primary') color = '#ef4444'; // Red
                                            else if (highway === 'secondary') color = '#f97316'; // Orange
                                            else if (highway === 'tertiary') color = '#fbbf24'; // Yellow
                                            else if (highway === 'trunk') color = '#dc2626'; // Dark red
                                            else if (highway === 'motorway') color = '#7c2d12'; // Brown
                                            else if (highway === 'residential') color = '#cbd5e1'; // Light gray
                                            else if (highway === 'track') color = '#78716c'; // Dark gray
                                            else if (highway === 'footway' || highway === 'path') color = '#a8a29e'; // Light brown

                                            const style = {
                                                color: color,
                                                weight: highway === 'primary' || highway === 'trunk' || highway === 'motorway' ? 3 :
                                                       highway === 'secondary' || highway === 'tertiary' ? 2 : 1,
                                                opacity: 0.8
                                            };

                                            // Add dotted line for tracks
                                            if (highway === 'track') {
                                                style.dashArray = '5, 10';
                                            }

                                            return style;
                                        },
                                        onEachFeature: function(feature, layer) {
                                            if (feature.properties) {
                                                const highway = feature.properties.highway || 'Unknown';
                                                const name = feature.properties.name || 'Unnamed road';
                                                const surface = feature.properties.surface || 'Unknown';
                                                layer.bindPopup(`
                                                    <strong>${name}</strong><br>
                                                    <strong>Type:</strong> ${highway}<br>
                                                    <strong>Surface:</strong> ${surface}<br>
                                                    <em>Latest OSM Data via HDX</em>
                                                `);
                                            }
                                        }
                                    }).addTo(map);

                                    // Store active region
                                    activeRoadsOSMLatestRegion = droppedRegion;

                                    // REGION-FIRST: Register layer with regionLockState
                                    regionLockState.addLayer(`Roads Latest - ${droppedRegion}`, activeRoadsOSMLatestLayer, 'roads');

                                    // Update checkbox state
                                    document.getElementById('roadsOSMLatestToggle').checked = true;

                                    // Mark as dropped
                                    roadsOSMLatestLabel.classList.add('layer-dropped');
                                    roadsOSMLatestLabel.title = `Loaded for ${droppedRegion}`;

                                    // Update label
                                    const labelSpan = roadsOSMLatestLabel.querySelector('span:last-child');
                                    if (labelSpan) {
                                        labelSpan.textContent = `🔄 Roads OSM Latest - ${droppedRegion}`;
                                    }

                                    // Close loading popup and show success
                                    map.closePopup(loadingPopup);
                                    L.popup({
                                        closeButton: false,
                                        autoClose: true,
                                        className: 'drop-success-popup'
                                    })
                                    .setLatLng(latlng)
                                    .setContent(`✓ Latest OSM Roads loaded for ${droppedRegion}<br><small>${loadedRoadsData.features.length} road segments</small>`)
                                    .openOn(map);

                                    setTimeout(() => map.closePopup(), 3000);
                                } else {
                                    throw new Error('Invalid roads data format');
                                }
                            })
                            .catch(error => {
                                console.error('Error loading latest roads:', error);
                                map.closePopup(loadingPopup);
                                L.popup({
                                    closeButton: true,
                                    autoClose: false,
                                    className: 'drop-error-popup'
                                })
                                .setLatLng(latlng)
                                .setContent(`❌ ${error.message}`)
                                .openOn(map);
                            });
                    }

                    // Remove cursor classes
                    mapContainer.classList.remove('drop-target');
                    mapContainer.classList.remove('drop-invalid');
                }
            });

            // Roads OSM Latest checkbox toggle
            document.getElementById('roadsOSMLatestToggle').addEventListener('change', function(e) {
                if (e.target.checked) {
                    if (activeRoadsOSMLatestLayer) {
                        map.addLayer(activeRoadsOSMLatestLayer);
                        roadsOSMLatestLabel.classList.add('layer-dropped');
                    }
                } else {
                    if (activeRoadsOSMLatestLayer) {
                        map.removeLayer(activeRoadsOSMLatestLayer);
                        roadsOSMLatestLabel.classList.remove('layer-dropped');
                    }
                }
            });

            // Right-click context menu for Roads OSM Latest
            roadsOSMLatestLabel.addEventListener('contextmenu', function(e) {
                e.preventDefault();
                const isActive = activeRoadsOSMLatestLayer && map.hasLayer(activeRoadsOSMLatestLayer);

                showLayerContextMenu('roadsOSMLatest', 'Roads OSM Latest', '#22c55e', e.clientX, e.clientY, {
                    isActive,
                    onToggle: function() {
                        const toggle = document.getElementById('roadsOSMLatestToggle');
                        if (isActive) {
                            map.removeLayer(activeRoadsOSMLatestLayer);
                            toggle.checked = false;
                            roadsOSMLatestLabel.classList.remove('layer-dropped');
                        } else if (activeRoadsOSMLatestLayer) {
                            map.addLayer(activeRoadsOSMLatestLayer);
                            toggle.checked = true;
                            roadsOSMLatestLabel.classList.add('layer-dropped');
                        }
                    },
                    onZoom: function() {
                        if (activeRoadsOSMLatestLayer) {
                            map.fitBounds(activeRoadsOSMLatestLayer.getBounds(), { padding: [50, 50] });
                        }
                    },
                    onRemove: function() {
                        if (activeRoadsOSMLatestLayer) {
                            map.removeLayer(activeRoadsOSMLatestLayer);
                            activeRoadsOSMLatestLayer = null;
                            activeRoadsOSMLatestRegion = null;
                            document.getElementById('roadsOSMLatestToggle').checked = false;
                            roadsOSMLatestLabel.classList.remove('layer-dropped');
                        }
                    },
                    onInfo: function() {
                        alert(`Roads OSM Latest\n\nSource: OpenStreetMap via HDX API\nAuto-updated from latest data\nRegion: ${activeRoadsOSMLatestRegion || 'Not loaded'}\nFeatures: ${activeRoadsOSMLatestLayer ? activeRoadsOSMLatestLayer.getLayers().length : 0} roads`);
                    }
                });
            });

            // Enable drag for Roads OSM Latest label with full visual feedback
            roadsOSMLatestLabel.addEventListener('dragstart', function(e) {
                // REGION-FIRST: Check if a region is locked
                if (!regionLockState.isLocked) {
                    e.preventDefault();
                    showSelectRegionWarning();
                    return;
                }

                draggedLayerId = 'roadsOSMLatest';

                // Add dragging class to body for cursor control
                document.body.classList.add('dragging');

                // Create cursor indicator
                cursorIndicator = document.createElement('div');
                cursorIndicator.className = 'cursor-indicator';
                document.body.appendChild(cursorIndicator);

                // Create ghost element (preview while dragging)
                dragGhost = document.createElement('div');
                dragGhost.style.cssText = `
                    position: fixed;
                    background: rgba(34, 197, 94, 0.9);
                    color: white;
                    padding: 8px 12px;
                    border-radius: 6px;
                    font-size: 0.85em;
                    pointer-events: none;
                    z-index: 10000;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                `;
                dragGhost.textContent = '🔄 Roads OSM Latest - Drop on any region';
                document.body.appendChild(dragGhost);

                // Add dragging class
                roadsOSMLatestLabel.classList.add('dragging-layer');

                // Store data
                e.dataTransfer.effectAllowed = 'copy';
                e.dataTransfer.setData('text/plain', 'roadsOSMLatest');

                // Hide default drag image
                const img = new Image();
                img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
                e.dataTransfer.setDragImage(img, 0, 0);
            });

            // Update ghost position for Roads OSM Latest
            document.addEventListener('drag', function(e) {
                if (dragGhost && draggedLayerId === 'roadsOSMLatest' && e.clientX !== 0 && e.clientY !== 0) {
                    dragGhost.style.left = (e.clientX + 10) + 'px';
                    dragGhost.style.top = (e.clientY + 10) + 'px';
                }
            });

            // Drag end - cleanup for Roads OSM Latest
            roadsOSMLatestLabel.addEventListener('dragend', function(e) {
                roadsOSMLatestLabel.classList.remove('dragging-layer');
                document.body.classList.remove('dragging');

                if (dragGhost) {
                    document.body.removeChild(dragGhost);
                    dragGhost = null;
                }
                if (cursorIndicator) {
                    document.body.removeChild(cursorIndicator);
                    cursorIndicator = null;
                }
                draggedLayerId = null;

                // Remove highlight from all regions
                Object.values(allRegionLayers).forEach(regionLayer => {
                    adm1Layer.resetStyle(regionLayer);
                });
            });

            // Map dragover handler for Roads OSM Latest
            mapContainer.addEventListener('dragover', function(e) {
                if (draggedLayerId === 'roadsOSMLatest') {
                    e.preventDefault();

                    const rect = mapContainer.getBoundingClientRect();
                    const latlng = map.containerPointToLatLng([e.clientX - rect.left, e.clientY - rect.top]);

                    // REGION-FIRST: Only allow drop on the LOCKED region
                    const isOverLockedRegion = isPointInLockedRegion(latlng);
                    const lockedRegionName = regionLockState.lockedRegion;

                    // Highlight only if over locked region
                    if (isOverLockedRegion && regionLockState.lockedRegionLayer) {
                        regionLockState.lockedRegionLayer.setStyle({
                            fillColor: '#22c55e',
                            fillOpacity: 0.4,
                            weight: 3,
                            color: '#22c55e'
                        });
                        mapContainer.classList.add('drop-target');
                        mapContainer.classList.remove('drop-invalid');
                    } else {
                        // Reset locked region style
                        if (regionLockState.lockedRegionLayer) {
                            adm1Layer.resetStyle(regionLockState.lockedRegionLayer);
                        }
                        mapContainer.classList.remove('drop-target');
                        mapContainer.classList.add('drop-invalid');
                    }
                }
            });

            // ========================================
            // DRAG-AND-DROP: Roads 2024 Layer (July 2024 HDX Export)
            // ========================================
            const roads2024Label = document.querySelector('#roads2024Label');
            const roads2024Toggle = document.getElementById('roads2024Toggle');
            let activeRoads2024Layer = null;
            let activeRoads2024Region = null;

            if (roads2024Label) {
                // Toggle handler for Roads 2024
                roads2024Toggle?.addEventListener('change', function(e) {
                    if (e.target.checked) {
                        if (activeRoads2024Layer) {
                            map.addLayer(activeRoads2024Layer);
                            roads2024Label.classList.add('layer-dropped');
                        }
                    } else {
                        if (activeRoads2024Layer) {
                            map.removeLayer(activeRoads2024Layer);
                            roads2024Label.classList.remove('layer-dropped');
                        }
                    }
                });

                // Right-click context menu for Roads 2024
                roads2024Label.addEventListener('contextmenu', function(e) {
                    e.preventDefault();
                    const isActive = activeRoads2024Layer && map.hasLayer(activeRoads2024Layer);

                    showLayerContextMenu('roads2024', 'Roads 2024 (July)', '#fbbf24', e.clientX, e.clientY, {
                        isActive,
                        onToggle: function() {
                            if (isActive) {
                                map.removeLayer(activeRoads2024Layer);
                                roads2024Toggle.checked = false;
                                roads2024Label.classList.remove('layer-dropped');
                            } else if (activeRoads2024Layer) {
                                map.addLayer(activeRoads2024Layer);
                                roads2024Toggle.checked = true;
                                roads2024Label.classList.add('layer-dropped');
                            }
                        },
                        onZoom: function() {
                            if (activeRoads2024Layer) {
                                map.fitBounds(activeRoads2024Layer.getBounds(), { padding: [50, 50] });
                            }
                        },
                        onRemove: function() {
                            if (activeRoads2024Layer) {
                                map.removeLayer(activeRoads2024Layer);
                                activeRoads2024Layer = null;
                                activeRoads2024Region = null;
                                roads2024Toggle.checked = false;
                                roads2024Label.classList.remove('layer-dropped');
                            }
                        },
                        onInfo: function() {
                            alert(`Roads 2024 (July)\n\nSource: HDX Geopackage\nDate: 2024-07-23\nRegion: ${activeRoads2024Region || 'Not loaded'}\nFeatures: ${activeRoads2024Layer ? activeRoads2024Layer.getLayers().length : 0} roads`);
                        }
                    });
                });

                // Drag start for Roads 2024
                roads2024Label.addEventListener('dragstart', function(e) {
                    // REGION-FIRST: Check if a region is locked
                    if (!regionLockState.isLocked) {
                        e.preventDefault();
                        showSelectRegionWarning();
                        return;
                    }

                    draggedLayerId = 'roads2024';

                    document.body.classList.add('dragging');

                    cursorIndicator = document.createElement('div');
                    cursorIndicator.className = 'cursor-indicator';
                    document.body.appendChild(cursorIndicator);

                    dragGhost = document.createElement('div');
                    dragGhost.style.cssText = `
                        position: fixed;
                        background: rgba(251, 191, 36, 0.9);
                        color: #1f2937;
                        padding: 8px 12px;
                        border-radius: 6px;
                        font-size: 0.85em;
                        font-weight: bold;
                        pointer-events: none;
                        z-index: 10000;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                    `;
                    dragGhost.textContent = '🗓️ Roads 2024 - Drop on any region';
                    document.body.appendChild(dragGhost);

                    roads2024Label.classList.add('dragging-layer');

                    e.dataTransfer.effectAllowed = 'copy';
                    e.dataTransfer.setData('text/plain', 'roads2024');

                    const img = new Image();
                    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
                    e.dataTransfer.setDragImage(img, 0, 0);
                });

                // Update ghost position for Roads 2024
                document.addEventListener('drag', function(e) {
                    if (dragGhost && draggedLayerId === 'roads2024' && e.clientX !== 0 && e.clientY !== 0) {
                        dragGhost.style.left = (e.clientX + 10) + 'px';
                        dragGhost.style.top = (e.clientY + 10) + 'px';
                    }
                });

                // Drag end for Roads 2024
                roads2024Label.addEventListener('dragend', function(e) {
                    roads2024Label.classList.remove('dragging-layer');
                    document.body.classList.remove('dragging');

                    if (dragGhost) {
                        document.body.removeChild(dragGhost);
                        dragGhost = null;
                    }
                    if (cursorIndicator) {
                        document.body.removeChild(cursorIndicator);
                        cursorIndicator = null;
                    }
                    draggedLayerId = null;

                    Object.values(allRegionLayers).forEach(regionLayer => {
                        adm1Layer.resetStyle(regionLayer);
                    });
                });

                // Map dragover handler for Roads 2024
                mapContainer.addEventListener('dragover', function(e) {
                    if (draggedLayerId === 'roads2024') {
                        e.preventDefault();

                        const rect = mapContainer.getBoundingClientRect();
                        const latlng = map.containerPointToLatLng([e.clientX - rect.left, e.clientY - rect.top]);

                        // REGION-FIRST: Only allow drop on the LOCKED region
                        const isOverLockedRegion = isPointInLockedRegion(latlng);
                        const lockedRegionName = regionLockState.lockedRegion;

                        if (isOverLockedRegion && regionLockState.lockedRegionLayer) {
                            regionLockState.lockedRegionLayer.setStyle({
                                fillColor: '#fbbf24',
                                fillOpacity: 0.4,
                                weight: 3,
                                color: '#fbbf24'
                            });
                            mapContainer.classList.add('drop-target');
                            mapContainer.classList.remove('drop-invalid');

                            if (dragGhost) {
                                dragGhost.style.background = 'rgba(251, 191, 36, 0.95)';
                                dragGhost.textContent = `✓ Drop to load 2024 Roads for ${lockedRegionName}`;
                            }
                        } else {
                            // Reset locked region style
                            if (regionLockState.lockedRegionLayer) {
                                adm1Layer.resetStyle(regionLockState.lockedRegionLayer);
                            }
                            mapContainer.classList.remove('drop-target');
                            mapContainer.classList.add('drop-invalid');

                            if (dragGhost) {
                                dragGhost.style.background = 'rgba(239, 68, 68, 0.9)';
                                dragGhost.textContent = `🚫 Drop only on ${lockedRegionName}`;
                            }
                        }
                    }
                });

                // Drop handler for Roads 2024
                mapContainer.addEventListener('drop', function(e) {
                    if (draggedLayerId !== 'roads2024') return;

                    e.preventDefault();

                    const rect = mapContainer.getBoundingClientRect();
                    const latlng = map.containerPointToLatLng([e.clientX - rect.left, e.clientY - rect.top]);

                    // REGION-FIRST: Use locked region instead of detecting drop location
                    if (!regionLockState.isLocked) {
                        showSelectRegionWarning();
                        mapContainer.classList.remove('drop-target', 'drop-invalid');
                        return;
                    }

                    // CHECK: Drop must be ON the locked region, not anywhere else
                    if (!isPointInLockedRegion(latlng)) {
                        showDropOutsideRegionWarning('Roads 2024', latlng);
                        mapContainer.classList.remove('drop-target', 'drop-invalid');
                        return;
                    }

                    const droppedRegion = regionLockState.lockedRegion;
                    const droppedRegionLayer = regionLockState.lockedRegionLayer;

                    if (droppedRegion) {
                        // DUPLICATE CHECK: Check if Roads 2024 is already loaded for this region
                        const roads2024LayerName = `Roads 2024 - ${droppedRegion}`;
                        if (regionLockState.hasLayer(roads2024LayerName)) {
                            L.popup({
                                closeButton: false,
                                autoClose: true,
                                autoPan: false,
                                className: 'drop-warning-popup'
                            })
                            .setLatLng(latlng)
                            .setContent(`⚠️ Roads 2024 already loaded for ${droppedRegion}`)
                            .openOn(map);

                            setTimeout(() => map.closePopup(), 2500);
                            mapContainer.classList.remove('drop-target', 'drop-invalid');
                            return;
                        }

                        // Remove existing 2024 roads layer (if different region was loaded before)
                        if (activeRoads2024Layer) {
                            map.removeLayer(activeRoads2024Layer);
                            regionLockState.removeLayer(`Roads 2024 - ${activeRoads2024Region}`);
                            activeRoads2024Layer = null;
                        }

                        // Show loading popup
                        const loadingPopup = L.popup({
                            closeButton: false,
                            autoClose: false,
                            autoPan: false,
                            className: 'loading-popup'
                        })
                        .setLatLng(latlng)
                        .setContent(`⏳ Loading 2024 Roads for ${droppedRegion}...`)
                        .openOn(map);

                        // Load roads from roads_by_region_2024_07_23 folder using fetch (GeoJSON)
                        const safeRegionName = droppedRegion.replace(/ /g, '_');
                        const roadsFilePath = `../data_warehouse/roads/roads_by_region_2024_07_23/${safeRegionName}_roads.geojson`;

                        fetch(roadsFilePath)
                            .then(response => {
                                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                                return response.json();
                            })
                            .then(loadedData => {
                                map.closePopup(loadingPopup);

                                if (loadedData && loadedData.features) {
                                    // Create layer using unified RoadSymbology module
                                    activeRoads2024Layer = L.geoJSON(loadedData, {
                                        style: function(feature) {
                                            // Use RoadSymbology module if available
                                            if (typeof RoadSymbology !== 'undefined') {
                                                return RoadSymbology.getStyle(feature);
                                            }
                                            // Fallback styling
                                            return { color: '#fbbf24', weight: 1.5, opacity: 0.8 };
                                        },
                                        onEachFeature: function(feature, layer) {
                                            // Use RoadSymbology module for popup if available
                                            if (typeof RoadSymbology !== 'undefined') {
                                                layer.bindPopup(RoadSymbology.getPopupContent(feature, { source: 'OSM 2024-07-23' }));
                                            } else {
                                                const props = feature.properties || {};
                                                layer.bindPopup(`<strong>${props.name || 'Road'}</strong><br>Type: ${props.highway || 'unknown'}`);
                                            }
                                        }
                                    }).addTo(map);

                                    activeRoads2024Region = droppedRegion;

                                    // REGION-FIRST: Register layer with regionLockState
                                    regionLockState.addLayer(`Roads 2024 - ${droppedRegion}`, activeRoads2024Layer, 'roads');

                                    // Update checkbox
                                    if (roads2024Toggle) roads2024Toggle.checked = true;
                                    roads2024Label.classList.add('layer-dropped');

                                    // Zoom to region
                                    map.fitBounds(droppedRegionLayer.getBounds(), {
                                        padding: [50, 50],
                                        maxZoom: 11
                                    });

                                    // Success popup
                                    L.popup({
                                        closeButton: false,
                                        autoClose: true,
                                        autoPan: false,
                                        className: 'drop-success-popup'
                                    })
                                    .setLatLng(latlng)
                                    .setContent(`✓ 2024 Roads loaded for ${droppedRegion}<br><small>${loadedData.features.length} road segments</small>`)
                                    .openOn(map);

                                    setTimeout(() => map.closePopup(), 3000);

                                    console.log(`[Roads 2024] Loaded ${loadedData.features.length} roads for ${droppedRegion}`);
                                } else {
                                    L.popup({
                                        closeButton: true,
                                        className: 'error-popup'
                                    })
                                    .setLatLng(latlng)
                                    .setContent(`❌ Could not parse 2024 roads data for ${droppedRegion}`)
                                    .openOn(map);
                                }
                            })
                            .catch(error => {
                                map.closePopup(loadingPopup);
                                console.error(`[Roads 2024] Error loading ${roadsFilePath}:`, error);

                                L.popup({
                                    closeButton: true,
                                    className: 'error-popup'
                                })
                                .setLatLng(latlng)
                                .setContent(`❌ No 2024 roads data for ${droppedRegion}<br><small>File not found: ${roadsFilePath}</small>`)
                                .openOn(map);
                            });
                    }

                    // Reset region styles
                    Object.values(allRegionLayers).forEach(regionLayer => {
                        adm1Layer.resetStyle(regionLayer);
                    });

                    mapContainer.classList.remove('drop-target', 'drop-invalid');
                });
            }

            document.getElementById('adm1Toggle').addEventListener('change', function(e) {
                e.target.checked ? map.addLayer(adm1Layer) : map.removeLayer(adm1Layer);
            });
            document.getElementById('adm2Toggle').addEventListener('change', function(e) {
                e.target.checked ? map.addLayer(adm2Layer) : map.removeLayer(adm2Layer);
            });
            
            // Hierarchical population controls
            // Main population toggle
            document.getElementById('populationMainToggle').addEventListener('change', function(e) {
                const isChecked = e.target.checked;
                document.getElementById('femaleToggle').checked = isChecked;
                document.getElementById('infantsToggle').checked = isChecked;
                document.getElementById('pop_1_25_Toggle').checked = isChecked;
                document.getElementById('pop_25_50_Toggle').checked = isChecked;
                document.getElementById('pop_50plus_Toggle').checked = isChecked;
                
                if (isChecked) {
                    activePopClasses = new Set(['1-25', '25-50', '50+']);
                    refreshPopulationLayer();
                } else {
                    map.removeLayer(populationLayer);
                }
            });
            
            // Female toggle
            document.getElementById('femaleToggle').addEventListener('change', function(e) {
                const isChecked = e.target.checked;
                document.getElementById('infantsToggle').checked = isChecked;
                document.getElementById('pop_1_25_Toggle').checked = isChecked;
                document.getElementById('pop_25_50_Toggle').checked = isChecked;
                document.getElementById('pop_50plus_Toggle').checked = isChecked;
                
                if (isChecked && document.getElementById('populationMainToggle').checked) {
                    activePopClasses = new Set(['1-25', '25-50', '50+']);
                    refreshPopulationLayer();
                } else {
                    map.removeLayer(populationLayer);
                }
            });
            
            // Infants toggle
            document.getElementById('infantsToggle').addEventListener('change', function(e) {
                const isChecked = e.target.checked;
                document.getElementById('pop_1_25_Toggle').checked = isChecked;
                document.getElementById('pop_25_50_Toggle').checked = isChecked;
                document.getElementById('pop_50plus_Toggle').checked = isChecked;
                
                if (isChecked && document.getElementById('femaleToggle').checked && 
                    document.getElementById('populationMainToggle').checked) {
                    activePopClasses = new Set(['1-25', '25-50', '50+']);
                    refreshPopulationLayer();
                } else {
                    map.removeLayer(populationLayer);
                }
            });
            
            // Individual class toggles
            document.getElementById('pop_1_25_Toggle').addEventListener('change', function(e) {
                if (e.target.checked) {
                    activePopClasses.add('1-25');
                } else {
                    activePopClasses.delete('1-25');
                }
                refreshPopulationLayer();
            });
            
            document.getElementById('pop_25_50_Toggle').addEventListener('change', function(e) {
                if (e.target.checked) {
                    activePopClasses.add('25-50');
                } else {
                    activePopClasses.delete('25-50');
                }
                refreshPopulationLayer();
            });
            
            document.getElementById('pop_50plus_Toggle').addEventListener('change', function(e) {
                if (e.target.checked) {
                    activePopClasses.add('50+');
                } else {
                    activePopClasses.delete('50+');
                }
                refreshPopulationLayer();
            });
        }, 100);

        // ==========================================
        // NIGHTLIGHT DISTRIBUTION ANALYSIS WINDOW
        // ==========================================
        let analysisWindow = null;

        document.getElementById('nightlightAnalysisToggle').addEventListener('change', function(e) {
            if (e.target.checked) {
                showNightlightAnalysis();
            } else {
                if (analysisWindow) {
                    analysisWindow.close();
                    analysisWindow = null;
                }
            }
        });

        function showNightlightAnalysis() {
            const analysisHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nightlight Distribution Analysis - Bakool Region</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            color: #e5e7eb;
            padding: 20px;
            margin: 0;
            line-height: 1.6;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: rgba(30, 41, 59, 0.95);
            border-radius: 12px;
            padding: 30px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }
        h1 {
            color: #10b981;
            border-bottom: 3px solid #10b981;
            padding-bottom: 15px;
            margin-bottom: 20px;
        }
        h2 {
            color: #0ea5e9;
            margin-top: 30px;
            border-left: 4px solid #0ea5e9;
            padding-left: 15px;
        }
        h3 {
            color: #fbbf24;
            margin-top: 20px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            background: rgba(15, 23, 42, 0.6);
            border-radius: 8px;
            overflow: hidden;
        }
        th {
            background: linear-gradient(135deg, #0ea5e9 0%, #10b981 100%);
            color: white;
            padding: 12px;
            text-align: left;
            font-weight: 600;
        }
        td {
            padding: 10px 12px;
            border-bottom: 1px solid rgba(100, 116, 139, 0.3);
        }
        tr:hover {
            background: rgba(59, 130, 246, 0.1);
        }
        .summary-box {
            background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(14, 165, 233, 0.1) 100%);
            border: 2px solid #10b981;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        .key-stat {
            display: inline-block;
            background: rgba(14, 165, 233, 0.2);
            padding: 8px 15px;
            border-radius: 6px;
            margin: 5px;
            font-weight: 600;
        }
        .expand-btn {
            background: linear-gradient(135deg, #10b981 0%, #0ea5e9 100%);
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 600;
            margin: 10px 0;
            transition: transform 0.2s;
        }
        .expand-btn:hover {
            transform: scale(1.05);
        }
        .expandable {
            display: none;
            margin-top: 20px;
        }
        .expandable.show {
            display: block;
            animation: fadeIn 0.3s;
        }
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        .color-swatch {
            display: inline-block;
            width: 20px;
            height: 20px;
            border-radius: 4px;
            margin-right: 8px;
            vertical-align: middle;
            border: 1px solid rgba(255,255,255,0.3);
        }
        .positive { color: #10b981; }
        .highlight { background: rgba(251, 191, 36, 0.2); padding: 2px 6px; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🧠 Geo-AI Insights: Nightlight Distribution Analysis</h1>
        <p style="color: #94a3b8; font-size: 0.95em;">Bakool Region, Somalia | VIIRS DNB Annual Composite (2022-2023)</p>

        <div class="summary-box">
            <h2 style="margin-top: 0;">📊 Executive Summary</h2>
            <p><strong>Key Finding:</strong> Bakool region shows <span class="positive">+10.92% increase</span> in average nightlight intensity from 2022 to 2023, indicating economic growth and increased electrification.</p>

            <h3>Critical Statistics:</h3>
            <span class="key-stat">📈 Mean: 0.295 → 0.327 nW/cm²/sr (+10.92%)</span>
            <span class="key-stat">📊 Median: 0.295 → 0.327 nW/cm²/sr (+10.85%)</span>
            <span class="key-stat">⭐ Max: 0.655 → 0.807 nW/cm²/sr (+23.21%)</span>

            <button class="expand-btn" onclick="toggleSection('fullStats')">📖 Read More - Full Statistical Analysis</button>
        </div>

        <div id="fullStats" class="expandable">
            <h2>📈 Complete Year-over-Year Comparison</h2>
            <table>
                <tr>
                    <th>Metric</th>
                    <th>2022</th>
                    <th>2023</th>
                    <th>Change</th>
                </tr>
                <tr>
                    <td><strong>Mean</strong></td>
                    <td>0.295 nW/cm²/sr</td>
                    <td>0.327 nW/cm²/sr</td>
                    <td class="positive">+10.92%</td>
                </tr>
                <tr>
                    <td><strong>Median</strong></td>
                    <td>0.295 nW/cm²/sr</td>
                    <td>0.327 nW/cm²/sr</td>
                    <td class="positive">+10.85%</td>
                </tr>
                <tr>
                    <td><strong>Maximum</strong></td>
                    <td>0.655 nW/cm²/sr</td>
                    <td>0.807 nW/cm²/sr</td>
                    <td class="positive">+23.21%</td>
                </tr>
                <tr>
                    <td><strong>Minimum</strong></td>
                    <td>0.238 nW/cm²/sr</td>
                    <td>0.254 nW/cm²/sr</td>
                    <td class="positive">+6.72%</td>
                </tr>
                <tr>
                    <td><strong>Std Deviation</strong></td>
                    <td>0.013</td>
                    <td>0.017</td>
                    <td class="positive">+27% (more variation)</td>
                </tr>
            </table>

            <h3>Percentile Analysis</h3>
            <table>
                <tr>
                    <th>Percentile</th>
                    <th>2022</th>
                    <th>2023</th>
                    <th>Change</th>
                </tr>
                <tr><td>25th</td><td>0.286</td><td>0.316</td><td class="positive">+10.5%</td></tr>
                <tr><td>50th (Median)</td><td>0.295</td><td>0.327</td><td class="positive">+10.8%</td></tr>
                <tr><td>75th</td><td>0.303</td><td>0.338</td><td class="positive">+11.6%</td></tr>
                <tr><td>90th</td><td>0.311</td><td>0.348</td><td class="positive">+11.9%</td></tr>
                <tr><td>95th</td><td>0.316</td><td>0.354</td><td class="positive">+12.0%</td></tr>
                <tr><td>99th</td><td>0.325</td><td>0.365</td><td class="positive">+12.3%</td></tr>
            </table>

            <h2>🎯 Recommended Classification</h2>
            <table>
                <tr>
                    <th>Bin</th>
                    <th>Category</th>
                    <th>Range</th>
                    <th>Color</th>
                    <th>2022 Count</th>
                    <th>2022 %</th>
                    <th>2023 Count</th>
                    <th>2023 %</th>
                </tr>
                <tr>
                    <td>1</td>
                    <td>Very Low (Background)</td>
                    <td>0.000 - 0.260</td>
                    <td><span class="color-swatch" style="background: #1e1b4b;"></span>#1e1b4b</td>
                    <td>297</td>
                    <td>0.28%</td>
                    <td>2</td>
                    <td>0.00%</td>
                </tr>
                <tr>
                    <td>2</td>
                    <td>Low Rural</td>
                    <td>0.260 - 0.285</td>
                    <td><span class="color-swatch" style="background: #5b21b6;"></span>#5b21b6</td>
                    <td>21,870</td>
                    <td>20.99%</td>
                    <td>325</td>
                    <td>0.31%</td>
                </tr>
                <tr class="highlight">
                    <td>3</td>
                    <td>Rural</td>
                    <td>0.285 - 0.310</td>
                    <td><span class="color-swatch" style="background: #8b5cf6;"></span>#8b5cf6</td>
                    <td>68,779</td>
                    <td><strong>66.00%</strong></td>
                    <td>13,900</td>
                    <td>13.34%</td>
                </tr>
                <tr class="highlight">
                    <td>4</td>
                    <td>Moderate Rural</td>
                    <td>0.310 - 0.350</td>
                    <td><span class="color-swatch" style="background: #a855f7;"></span>#a855f7</td>
                    <td>13,240</td>
                    <td>12.70%</td>
                    <td>81,442</td>
                    <td><strong>78.15%</strong></td>
                </tr>
                <tr>
                    <td>5</td>
                    <td>Bright Rural</td>
                    <td>0.350 - 0.500</td>
                    <td><span class="color-swatch" style="background: #fbbf24;"></span>#fbbf24</td>
                    <td>23</td>
                    <td>0.02%</td>
                    <td>8,527</td>
                    <td>8.18%</td>
                </tr>
                <tr>
                    <td>6</td>
                    <td>Settlement/Urban</td>
                    <td>0.500+</td>
                    <td><span class="color-swatch" style="background: #fde047;"></span>#fde047</td>
                    <td>2</td>
                    <td>0.00%</td>
                    <td>15</td>
                    <td>0.01%</td>
                </tr>
            </table>
        </div>

        <button class="expand-btn" onclick="toggleSection('findings')">💡 Read More - Key Findings & Interpretation</button>

        <div id="findings" class="expandable">
            <h2>💡 Key Findings</h2>

            <h3>1. Overall Brightening (2022 → 2023)</h3>
            <p>Average nightlight intensity increased by <strong class="positive">10.92%</strong>, indicating economic growth and increased electrification in Bakool region.</p>

            <h3>2. Dramatic Shift to Higher Categories</h3>
            <ul>
                <li><strong>2022:</strong> 66% of area was in "Rural" category (0.285-0.310)</li>
                <li><strong>2023:</strong> 78% of area shifted to "Moderate Rural" (0.310-0.350)</li>
                <li><strong class="positive">370x increase</strong> in "Bright Rural" areas (23 → 8,527 cells)</li>
                <li><strong class="positive">7.5x increase</strong> in "Settlement/Urban" areas (2 → 15 cells)</li>
            </ul>

            <h3>3. Distribution Pattern Evolution</h3>
            <p><strong>2022:</strong> Highly concentrated (66%) in lowest rural category<br>
            <strong>2023:</strong> Shifted to moderate rural category (78%) - showing upward development trajectory</p>

            <h3>4. Regional Context</h3>
            <p>Despite improvements, Bakool remains <strong>extremely rural</strong> with maximum values (0.807 nW/cm²/sr) far below typical urban centers (which would show 10+ nW/cm²/sr). This is consistent with Bakool being a pastoral/agricultural region with limited urban infrastructure.</p>

            <h2>🔍 Interpretation</h2>

            <div class="summary-box">
                <h3 style="color: #10b981; margin-top: 0;">Positive Development Trend</h3>
                <p>Bakool region shows clear signs of development between 2022-2023:</p>
                <ul>
                    <li>✅ Reduced "background" areas (297 → 2 cells) - nearly eliminated</li>
                    <li>✅ Major shift from basic rural to moderate rural lighting</li>
                    <li>✅ Emergence of brighter rural centers (370x increase)</li>
                    <li>✅ More visible settlements (7.5x increase)</li>
                    <li>✅ Consistent improvements across all percentiles (+10-12%)</li>
                </ul>

                <h3 style="color: #fbbf24;">Development Indicators</h3>
                <p>The nightlight data suggests:</p>
                <ul>
                    <li>📱 Increased electrification and grid coverage</li>
                    <li>🏘️ Growth of existing settlements</li>
                    <li>💡 Improved street lighting and public infrastructure</li>
                    <li>🏪 Expansion of commercial activities</li>
                    <li>👥 Potential population growth or concentration in certain areas</li>
                </ul>
            </div>
        </div>

        <hr style="border: 1px solid rgba(100, 116, 139, 0.3); margin: 30px 0;">

        <p style="text-align: center; color: #64748b; font-size: 0.9em;">
            🤖 Generated by Geo-AI Insights | Data: NOAA VIIRS DNB Annual V22 | Analysis Date: ${new Date().toLocaleDateString()}
        </p>
    </div>

    <script>
        function toggleSection(sectionId) {
            const section = document.getElementById(sectionId);
            section.classList.toggle('show');

            // Update button text
            event.target.textContent = section.classList.contains('show')
                ? event.target.textContent.replace('Read More', 'Show Less')
                : event.target.textContent.replace('Show Less', 'Read More');
        }
    </script>
</body>
</html>
            `;

            analysisWindow = window.open('', 'Nightlight Analysis', 'width=1200,height=800,scrollbars=yes,resizable=yes');
            analysisWindow.document.write(analysisHTML);
            analysisWindow.document.close();

            // Uncheck the checkbox if window is closed
            analysisWindow.onbeforeunload = function() {
                document.getElementById('nightlightAnalysisToggle').checked = false;
                analysisWindow = null;
            };
        }

        // Legend with gradient bars for both MPI and Nightlight
        const legend = L.control({position: 'topright'});
        legend.onAdd = function() {
            const div = L.DomUtil.create('div', 'legend collapsed');
            div.style.width = isMobile ? '100%' : '255px';
            div.style.maxHeight = isMobile ? '50vh' : '70vh';
            div.style.overflowY = 'auto';
            div.style.position = isMobile ? 'relative' : 'absolute';
            div.style.top = isMobile ? 'auto' : '0px';
            div.style.right = isMobile ? 'auto' : '0px';
            div.style.transition = 'max-height 0.3s ease';

            // Build MPI region list HTML
            let mpiRegionsHtml = '';
            const sorted = [...regions].sort((a, b) => b.mpi - a.mpi);
            sorted.forEach(r => {
                mpiRegionsHtml += `<div class="legend-item">
                    <div class="legend-color" style="background: ${getMPIColor(r.mpi)};"></div>
                    <div class="legend-label">${r.name}</div>
                    <div class="legend-value">${r.mpi}</div>
                </div>`;
            });

            let html = `
                <div class="legend-header" style="color: #10b981; font-weight: bold; margin-bottom: 8px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; white-space: nowrap; overflow: hidden;">
                    <span style="overflow: hidden; text-overflow: ellipsis;">🎨 Symbology</span>
                    <span class="legend-toggle-icon" style="font-size: 1.2em; flex-shrink: 0;">▶</span>
                </div>
                <div class="legend-content">
                    <!-- ========== MPI SECTION (Collapsible) ========== -->
                    <div class="symbology-section" data-section="mpi" style="margin-bottom: 8px; border-bottom: 1px solid #334155; padding-bottom: 8px;">
                        <div class="symbology-section-header" style="color: #0ea5e9; font-weight: bold; font-size: 0.9em; cursor: pointer; display: flex; justify-content: space-between; align-items: center; padding: 4px 0;">
                            <span>📊 MPI Gradient</span>
                            <span class="section-toggle" style="font-size: 0.9em; transition: transform 0.2s;">▶</span>
                        </div>
                        <div class="symbology-section-content" style="display: none; padding-top: 8px;">
                            <div style="font-size: 0.75em; margin-bottom: 8px; color: #94a3b8;">
                                <div style="display: flex; justify-content: space-between; width: 200px; margin-bottom: 2px;">
                                    <span style="color: #047857; font-weight: bold; font-size: 1.1em;">0</span>
                                    <span style="color: #7f1d1d; font-weight: bold; font-size: 1.1em;">100</span>
                                </div>
                                <div style="display: flex; align-items: center; margin: 4px 0;">
                                    <div style="width: 200px; height: 20px; background: linear-gradient(to right, #047857, #22c55e, #84cc16, #eab308, #f59e0b, #f97316, #dc2626, #b91c1c, #991b1b, #7f1d1d); border-radius: 4px;"></div>
                                </div>
                                <div style="display: flex; justify-content: space-between; width: 200px;">
                                    <span style="color: #047857;">●</span>
                                    <span>Better (Low MPI)</span>
                                    <span>Worse (High MPI)</span>
                                    <span style="color: #7f1d1d;">●</span>
                                </div>
                            </div>
                            <div class="mpi-regions-list" style="max-height: 200px; overflow-y: auto;">
                                ${mpiRegionsHtml}
                            </div>
                        </div>
                    </div>

                    <!-- ========== NIGHTLIGHT SECTION (Collapsible) ========== -->
                    <div class="symbology-section" data-section="nightlight" style="margin-bottom: 8px; border-bottom: 1px solid #334155; padding-bottom: 8px;">
                        <div class="symbology-section-header" style="color: #f59e0b; font-weight: bold; font-size: 0.9em; cursor: pointer; display: flex; justify-content: space-between; align-items: center; padding: 4px 0;">
                            <span>💡 Nightlight Intensity</span>
                            <span class="section-toggle" style="font-size: 0.9em; transition: transform 0.2s;">▶</span>
                        </div>
                        <div class="symbology-section-content" style="display: none; padding-top: 8px;">
                            <div style="font-size: 0.7em; margin-bottom: 8px; color: #94a3b8; font-style: italic;">
                                See Symbology Standardization Method (<span style="color: #a855f7; cursor: pointer; text-decoration: underline;" onclick="SSMModule.show('nightlight')">SSM</span>)
                            </div>
                            <div style="font-size: 0.75em; margin-bottom: 8px; color: #94a3b8;">
                                <div style="display: flex; justify-content: space-between; width: 200px; margin-bottom: 2px;">
                                    <span style="color: #ffffff; font-weight: bold; font-size: 1.1em;">&lt;0.1</span>
                                    <span style="color: #ffffff; font-weight: bold; font-size: 1.1em;">&gt;100</span>
                                </div>
                                <div style="display: flex; align-items: center; margin: 4px 0;">
                                    <div class="gradient-bar"></div>
                                </div>
                                <div style="display: flex; justify-content: space-between; width: 200px;">
                                    <span>Low Light</span>
                                    <span>High Light</span>
                                </div>
                            </div>
                            <div style="font-size: 0.7em; line-height: 1.6; margin-top: 8px;">
                                <div><span style="color: #1e1b4b;">●</span> &lt;0.1: Very low</div>
                                <div><span style="color: #4c1d95;">●</span> 0.1 - 2: Low</div>
                                <div><span style="color: #7c3aed;">●</span> 2 - 4: Rural</div>
                                <div><span style="color: #a78bfa;">●</span> 4 - 6: Low Urban</div>
                                <div><span style="color: #e879f9;">●</span> 6 - 10: Urban</div>
                                <div><span style="color: #fb923c;">●</span> 10 - 50: High Urban</div>
                                <div><span style="color: #fde047;">●</span> 50 - 100: Commercial/Industrial</div>
                                <div><span style="color: #fef9c3;">●</span> &gt;100: Major Industrial (e.g., Refineries)</div>
                            </div>
                            <div style="font-size: 0.6em; color: #64748b; margin-top: 10px; padding-top: 8px; border-top: 1px dashed #334155; line-height: 1.5;">
                                <strong style="color: #94a3b8;">Unit:</strong> NanoWatts/sr/cm² reflecting a unit of radiance, where NanoWatts is the measure of radiant power (energy per second). One nanowatt is 10⁻⁹ watts, indicating a very small amount of light; per Steradian (sr) where a steradian is the SI unit for a 3D solid angle (the "cone" of light) it measures how spread out the light is as it radiates from the source; and per Square Centimetre cm² represents the unit area of the surface being measured (the light source).
                            </div>
                        </div>
                    </div>

                    <!-- ========== ROADS SECTION (Collapsible) ========== -->
                    <div class="symbology-section" data-section="roads" style="margin-bottom: 8px; border-bottom: 1px solid #334155; padding-bottom: 8px;">
                        <div class="symbology-section-header" style="color: #f97316; font-weight: bold; font-size: 0.9em; cursor: pointer; display: flex; justify-content: space-between; align-items: center; padding: 4px 0;">
                            <span>🛣️ Roads</span>
                            <span class="section-toggle" style="font-size: 0.9em; transition: transform 0.2s;">▶</span>
                        </div>
                        <div class="symbology-section-content" style="display: none; padding-top: 8px;">
                            <div style="font-size: 0.7em; margin-bottom: 8px; color: #94a3b8; font-style: italic;">
                                See Symbology Standardization Method (<span id="ssmLink" style="color: #60a5fa; cursor: pointer; text-decoration: underline;" onclick="SSMModule.show('roads')">SSM</span>)
                            </div>
                            <div style="font-size: 0.7em; line-height: 1.8; margin-top: 8px;">
                                <div><span style="color: #7c2d12; font-weight: bold;">━━━━━━━━━━━━━━━━</span> Trunk</div>
                                <div><span style="color: #dc2626; font-weight: bold;">━━━━━━━━━━━━━━━━</span> Primary</div>
                                <div><span style="color: #f97316; font-weight: bold;">━━━━━━━━━━━━━━━━</span> Secondary</div>
                                <div><span style="color: #fbbf24; font-weight: bold;">━━━━━━━━━━━━━━━━</span> Tertiary</div>
                                <div><span style="color: #60a5fa; font-weight: bold;">━━━━━━━━━━━━━━━━</span> Residential</div>
                                <div><span style="color: #cbd5e1; font-weight: bold;">━━━━━━━━━━━━━━━━</span> Service</div>
                                <div><span style="color: #94a3b8; font-weight: bold;">━━━━━━━━━━━━━━━━</span> Unclassified</div>
                                <div><span style="color: #78716c; font-weight: bold;">━━ ━━ ━━ ━━ ━━ ━━ ━━</span> Track</div>
                                <div><span style="color: #a8a29e; font-weight: bold;">━━ ━━ ━━ ━━ ━━ ━━ ━━</span> Path</div>
                                <div><span style="color: #a8a29e; font-weight: bold;">━━ ━━ ━━ ━━ ━━ ━━ ━━</span> Footway</div>
                                <div><span style="color: #d4d4d8; font-weight: bold;">━━ ━━ ━━ ━━ ━━ ━━ ━━</span> Pedestrian</div>
                                <div><span style="color: #d4d4d8; font-weight: bold;">━━ ━━ ━━ ━━ ━━ ━━ ━━</span> Steps</div>
                                <div><span style="color: #fca5a5; font-weight: bold;">━━ ━━ ━━ ━━ ━━ ━━ ━━</span> Construction</div>
                            </div>
                        </div>
                    </div>

                    <!-- ========== POPULATION SECTION (Collapsible) ========== -->
                    <div class="symbology-section" data-section="population" style="margin-bottom: 0;">
                        <div class="symbology-section-header" style="color: #EC407A; font-weight: bold; font-size: 0.9em; cursor: pointer; display: flex; justify-content: space-between; align-items: center; padding: 4px 0;">
                            <span>👶 Population F 0-12 months</span>
                            <span class="section-toggle" style="font-size: 0.9em; transition: transform 0.2s;">▶</span>
                        </div>
                        <div class="symbology-section-content" style="display: none; padding-top: 8px;">
                            <div style="font-size: 0.7em; line-height: 1.8; margin-top: 8px;">
                                <div><span style="color: #F48FB1; font-size: 1.3em;">●</span> 1-25 (number of infants) - 96.3%</div>
                                <div><span style="color: #EC407A; font-size: 1.4em;">●</span> 25-50 (number of infants) - 1.8%</div>
                                <div><span style="color: #AD1457; font-size: 1.5em;">●</span> 50+ (number of infants) - 1.9%</div>
                            </div>
                            <div style="font-size: 0.65em; color: #64748b; margin-top: 8px; line-height: 1.4;">
                                Bakool: 5,362 cells | Lower Shebelle: 11,116 cells<br>
                                500m grid, pop ≥1 only
                            </div>
                        </div>
                    </div>
                </div>
            `;
            div.innerHTML = html;

            // Add click handler for collapsible main header
            const legendHeader = div.querySelector('.legend-header');
            const legendContent = div.querySelector('.legend-content');

            if (legendHeader) {
                legendHeader.addEventListener('click', function(e) {
                    e.stopPropagation();
                    e.preventDefault();
                    div.classList.toggle('collapsed');
                    const icon = this.querySelector('.legend-toggle-icon');
                    if (icon) {
                        icon.textContent = div.classList.contains('collapsed') ? '▶' : '▼';
                    }
                });
            }

            // ========================================
            // COLLAPSIBLE SYMBOLOGY SECTIONS
            // ========================================
            // Add click handlers for each collapsible section
            const sectionHeaders = div.querySelectorAll('.symbology-section-header');
            sectionHeaders.forEach(header => {
                header.addEventListener('click', function(e) {
                    e.stopPropagation();
                    e.preventDefault();

                    const section = this.parentElement;
                    const content = section.querySelector('.symbology-section-content');
                    const toggle = this.querySelector('.section-toggle');

                    if (content && toggle) {
                        const isExpanded = content.style.display !== 'none';

                        if (isExpanded) {
                            // Collapse
                            content.style.display = 'none';
                            toggle.textContent = '▶';
                            toggle.style.transform = 'rotate(0deg)';
                        } else {
                            // Expand
                            content.style.display = 'block';
                            toggle.textContent = '▼';
                            toggle.style.transform = 'rotate(0deg)';
                        }
                    }
                });

                // Add hover effect
                header.addEventListener('mouseenter', function() {
                    this.style.backgroundColor = 'rgba(255,255,255,0.05)';
                    this.style.borderRadius = '4px';
                });
                header.addEventListener('mouseleave', function() {
                    this.style.backgroundColor = 'transparent';
                });
            });

            // Disable click propagation only on content, not header
            if (legendContent) {
                L.DomEvent.disableClickPropagation(legendContent);
                L.DomEvent.disableScrollPropagation(legendContent);
            }

            return div;
        };
        legend.addTo(map);

        // ========================================
        // SSM MODULE - Now loaded from modules/ssm-module.js
        // Usage: SSMModule.show('roads') or SSMModule.show('nightlight')
        // To add new methodologies: SSMModule.register('id', config)
        // See modules/ssm-module.js for full API documentation
        // ========================================

        // ========================================
        // MEASURING TOOL
        // ========================================
        
        let measureActive = false;
        let measurePoints = [];
        let measureLine = null;
        let measureMarkers = [];
        let totalDistance = 0;

        function activateMeasure() {
            measureActive = true;
            measurePoints = [];
            totalDistance = 0;
            clearMeasure();
            map.getContainer().style.cursor = 'crosshair';
            document.getElementById('measureBtn').style.background = 'rgba(236, 64, 122, 0.95)';
            document.getElementById('measureBtn').innerHTML = '📏 Stop Measuring';
            
            // Disable popups on all layers
            if (mpiLayer) mpiLayer.closePopup();
            if (nightlightLayer) nightlightLayer.closePopup();
            if (roadsLayer) roadsLayer.closePopup();
            if (populationLayer) populationLayer.closePopup();
            if (adm1Layer) adm1Layer.closePopup();
            if (adm2Layer) adm2Layer.closePopup();
            
            // Disable ALL click events on layers
            map.eachLayer(function(layer) {
                if (layer.off) {
                    // Store original click handler
                    if (!layer._originalClickHandler && layer._events && layer._events.click) {
                        layer._originalClickHandler = layer._events.click;
                    }
                    // Remove click handlers
                    layer.off('click');
                }
            });
            
            // Show instruction at TOP CENTER below buttons
            const instruction = document.createElement('div');
            instruction.id = 'measureInstruction';
            instruction.style.position = 'absolute';
            instruction.style.left = '50%';
            instruction.style.transform = 'translateX(-50%)';
            instruction.style.top = '60px';
            instruction.style.zIndex = '1000';
            instruction.style.pointerEvents = 'none'; // Don't block map clicks
            instruction.innerHTML = `
                <div style="background: rgba(30, 41, 59, 0.95); padding: 12px; border-radius: 8px; border: 2px solid #0ea5e9; text-align: center;">
                    <strong style="color: #0ea5e9; font-size: 1.1em;">📏 Measuring Mode Active</strong><br>
                    <span style="font-size: 0.85em; color: #94a3b8; line-height: 1.6;">
                        Click to add points • Distance in meters/km • Double-click to finish
                    </span>
                </div>
            `;
            document.getElementById('map').appendChild(instruction);
            window.measureInstruction = instruction;
        }

        function deactivateMeasure() {
            measureActive = false;
            map.getContainer().style.cursor = '';
            document.getElementById('measureBtn').style.background = 'rgba(14, 165, 233, 0.95)';
            document.getElementById('measureBtn').innerHTML = '📏 Measure Distance';
            
            // Re-enable click events on layers by restoring handlers
            map.eachLayer(function(layer) {
                if (layer._originalClickHandler && layer.on) {
                    // Restore original click handlers
                    layer._originalClickHandler.forEach(function(handler) {
                        layer.on('click', handler.fn, handler.ctx);
                    });
                }
            });
            
            if (window.measureInstruction) {
                window.measureInstruction.remove();
                window.measureInstruction = null;
            }
        }

        function clearMeasure() {
            // Remove markers
            measureMarkers.forEach(marker => map.removeLayer(marker));
            measureMarkers = [];
            
            // Remove line
            if (measureLine) {
                map.removeLayer(measureLine);
                measureLine = null;
            }
            
            measurePoints = [];
            totalDistance = 0;
        }

        function calculateDistance(latlng1, latlng2) {
            // Haversine formula for distance in meters
            const R = 6371000; // Earth radius in meters
            const lat1 = latlng1.lat * Math.PI / 180;
            const lat2 = latlng2.lat * Math.PI / 180;
            const dLat = (latlng2.lat - latlng1.lat) * Math.PI / 180;
            const dLon = (latlng2.lng - latlng1.lng) * Math.PI / 180;
            
            const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                      Math.cos(lat1) * Math.cos(lat2) *
                      Math.sin(dLon/2) * Math.sin(dLon/2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            
            return R * c; // Distance in meters
        }

        function formatDistance(meters) {
            if (meters < 1000) {
                return Math.round(meters) + ' m';  // Rounded to 1m
            } else {
                return (meters / 1000).toFixed(2) + ' km';
            }
        }

        // Add measure button to BOTTOM LEFT (next to zoom controls)
        const measureBtn = L.control({position: 'bottomleft'});
        measureBtn.onAdd = function() {
            const div = L.DomUtil.create('div', 'measure-button-container');
            div.style.position = 'absolute';
            div.style.bottom = '12px';
            div.style.left = '90px';
            div.style.zIndex = '1000';
            div.style.display = 'flex';
            div.style.gap = '10px';
            div.innerHTML = `
                <button id="measureBtn" style="
                    background: rgba(14, 165, 233, 0.95);
                    color: white;
                    border: 2px solid #0ea5e9;
                    padding: 10px 15px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: bold;
                    font-size: 0.9em;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.3);
                    transition: all 0.3s;
                    white-space: nowrap;
                ">📏 Measure Distance</button>
                <button id="clearMeasureBtn" style="
                    background: rgba(127, 29, 29, 0.95);
                    color: white;
                    border: 2px solid #7f1d1d;
                    padding: 10px 15px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: bold;
                    font-size: 0.9em;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.3);
                    transition: all 0.3s;
                    white-space: nowrap;
                ">🗑️ Clear</button>
            `;
            return div;
        };

        // Add to map using Leaflet control system at bottomleft
        measureBtn.addTo(map);

        // Get the container and disable Leaflet events
        const measureContainer = document.querySelector('.measure-button-container');
        if (measureContainer) {
            L.DomEvent.disableClickPropagation(measureContainer);
            L.DomEvent.disableScrollPropagation(measureContainer);
        }

        // Button event listeners
        setTimeout(() => {
            document.getElementById('measureBtn').addEventListener('click', function(e) {
                // Stop event from propagating to map
                e.stopPropagation();
                if (e.target) {
                    e.target.blur(); // Remove focus from button
                }
                
                if (measureActive) {
                    deactivateMeasure();
                } else {
                    activateMeasure();
                }
            });
            
            document.getElementById('clearMeasureBtn').addEventListener('click', function(e) {
                // Stop event from propagating to map
                e.stopPropagation();
                if (e.target) {
                    e.target.blur(); // Remove focus from button
                }
                
                clearMeasure();
                if (measureActive) {
                    deactivateMeasure();
                }
            });
            
            // Prevent map clicks on button container
            const btnContainer = document.querySelector('.measure-button-container');
            if (btnContainer) {
                btnContainer.addEventListener('click', function(e) {
                    e.stopPropagation();
                });
                btnContainer.addEventListener('dblclick', function(e) {
                    e.stopPropagation();
                });
            }
        }, 100);

        // Map click handler for measuring - HIGH PRIORITY
        // This runs BEFORE layer click handlers
        map.on('click', function(e) {
            // If measuring mode is NOT active, return and allow normal popups
            if (!measureActive) return;
            
            // STOP propagation to prevent layer popups
            L.DomEvent.stopPropagation(e.originalEvent);
            
            // Measuring mode IS active - add measurement point
            measurePoints.push(e.latlng);
            
            // Add marker
            const marker = L.circleMarker(e.latlng, {
                radius: 6,
                fillColor: '#0ea5e9',
                color: '#fff',
                weight: 2,
                opacity: 1,
                fillOpacity: 1
            }).addTo(map);
            measureMarkers.push(marker);
            
            // Calculate distance if more than one point
            if (measurePoints.length > 1) {
                const prevPoint = measurePoints[measurePoints.length - 2];
                const currentPoint = measurePoints[measurePoints.length - 1];
                const segmentDistance = calculateDistance(prevPoint, currentPoint);
                totalDistance += segmentDistance;
                
                // Remove old line
                if (measureLine) {
                    map.removeLayer(measureLine);
                }
                
                // Draw new line
                measureLine = L.polyline(measurePoints, {
                    color: '#0ea5e9',
                    weight: 3,
                    opacity: 0.8,
                    dashArray: '10, 5'
                }).addTo(map);
                
                // Add label with segment distance
                const midpoint = L.latLng(
                    (prevPoint.lat + currentPoint.lat) / 2,
                    (prevPoint.lng + currentPoint.lng) / 2
                );
                
                const label = L.marker(midpoint, {
                    icon: L.divIcon({
                        className: 'distance-label',
                        html: `<div style="color: #0ea5e9; font-weight: bold; font-size: 0.9em; white-space: nowrap; text-shadow: 1px 1px 2px rgba(0,0,0,0.8), -1px -1px 2px rgba(0,0,0,0.8), 1px -1px 2px rgba(0,0,0,0.8), -1px 1px 2px rgba(0,0,0,0.8);">
                            ${formatDistance(segmentDistance)}
                        </div>`,
                        iconSize: [0, 0]
                    })
                }).addTo(map);
                measureMarkers.push(label);
                
                // Add total distance label at last point
                const totalLabel = L.marker(currentPoint, {
                    icon: L.divIcon({
                        className: 'distance-label-total',
                        html: `<div style="color: #EC407A; font-weight: bold; font-size: 1em; white-space: nowrap; margin-top: 20px; text-shadow: 1px 1px 2px rgba(0,0,0,0.8), -1px -1px 2px rgba(0,0,0,0.8), 1px -1px 2px rgba(0,0,0,0.8), -1px 1px 2px rgba(0,0,0,0.8);">
                            📏 Total: ${formatDistance(totalDistance)}
                        </div>`,
                        iconSize: [0, 0]
                    })
                }).addTo(map);
                measureMarkers.push(totalLabel);
            }
        });

        // Double-click to finish measuring
        map.on('dblclick', function(e) {
            if (!measureActive) return;
            L.DomEvent.stopPropagation(e);
            deactivateMeasure();
        });

        // ========================================
        // CLEAR CACHE & RELOAD BUTTON
        // ========================================

        const clearCacheBtn = L.control({position: 'bottomright'});
        clearCacheBtn.onAdd = function() {
            const div = L.DomUtil.create('div', 'clear-cache-container');
            div.style.marginBottom = '5px';
            div.innerHTML = `
                <button id="clearCacheBtn" style="
                    background: rgba(168, 85, 247, 0.95);
                    color: white;
                    border: 2px solid #a855f7;
                    padding: 8px 12px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: bold;
                    font-size: 0.8em;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.3);
                    transition: all 0.3s;
                    white-space: nowrap;
                " title="Clear browser cache and reload the page">
                    🔄 Clear Cache
                </button>
            `;

            // Prevent map interactions when clicking button
            L.DomEvent.disableClickPropagation(div);
            L.DomEvent.disableScrollPropagation(div);

            return div;
        };

        clearCacheBtn.addTo(map);

        // Add event listener for the button
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(function() {
                const btn = document.getElementById('clearCacheBtn');
                if (btn) {
                    btn.addEventListener('click', function() {
                        // Change button text to show it's working
                        this.innerHTML = '⏳ Clearing...';
                        this.disabled = true;

                        // Clear various cache types
                        if ('caches' in window) {
                            caches.keys().then(function(names) {
                                for (let name of names) {
                                    caches.delete(name);
                                }
                            });
                        }

                        // Clear localStorage and sessionStorage
                        try {
                            localStorage.clear();
                            sessionStorage.clear();
                        } catch(e) {
                            console.log('Storage clear failed:', e);
                        }

                        // Force reload from server (bypass cache)
                        setTimeout(function() {
                            window.location.reload(true);
                        }, 500);
                    });

                    // Hover effect
                    btn.addEventListener('mouseenter', function() {
                        this.style.background = 'rgba(168, 85, 247, 1)';
                        this.style.transform = 'scale(1.05)';
                    });

                    btn.addEventListener('mouseleave', function() {
                        this.style.background = 'rgba(168, 85, 247, 0.95)';
                        this.style.transform = 'scale(1)';
                    });
                }
            }, 500);

            // ========================================
            // OSM Update Button Handler
            // ========================================
            setTimeout(function() {
                const updateBtn = document.getElementById('updateOSMButton');
                if (updateBtn) {
                    updateBtn.addEventListener('click', async function() {
                        // Disable button during update
                        updateBtn.disabled = true;
                        updateBtn.style.opacity = '0.6';
                        updateBtn.style.cursor = 'not-allowed';
                        const originalHTML = updateBtn.innerHTML;
                        updateBtn.innerHTML = '⏳ Checking server...';

                        // Create progress modal
                        const modal = document.createElement('div');
                        modal.style.cssText = `
                            position: fixed;
                            top: 0;
                            left: 0;
                            width: 100%;
                            height: 100%;
                            background: rgba(0, 0, 0, 0.8);
                            z-index: 20000;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                        `;

                        const modalContent = document.createElement('div');
                        modalContent.style.cssText = `
                            background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
                            border-radius: 16px;
                            padding: 30px;
                            max-width: 600px;
                            width: 90%;
                            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8);
                            border: 2px solid #22c55e;
                            color: white;
                        `;

                        modalContent.innerHTML = `
                            <div style="text-align: center;">
                                <div id="updateIcon" style="font-size: 3em; margin-bottom: 15px;">🔄</div>
                                <h2 style="margin: 0 0 20px 0; color: #22c55e;">OSM Roads Auto-Update</h2>

                                <div id="updateProgress" style="text-align: left; background: rgba(34, 197, 94, 0.1); padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                                    <div id="statusMessage" style="font-size: 0.95em; margin-bottom: 15px;">
                                        Initializing update...
                                    </div>

                                    <div style="background: rgba(0,0,0,0.3); border-radius: 8px; height: 30px; overflow: hidden; margin-bottom: 15px;">
                                        <div id="progressBar" style="background: linear-gradient(90deg, #22c55e, #10b981); height: 100%; width: 0%; transition: width 0.3s; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.85em;">
                                            <span id="progressText">0%</span>
                                        </div>
                                    </div>

                                    <div id="detailsBox" style="background: rgba(14, 165, 233, 0.15); padding: 12px; border-radius: 6px; border-left: 3px solid #0ea5e9;">
                                        <strong style="color: #0ea5e9;">📋 Process Steps:</strong>
                                        <ul style="margin: 8px 0 0 0; padding-left: 20px; font-size: 0.9em; line-height: 1.6;">
                                            <li id="step1">Downloading from HDX API...</li>
                                            <li id="step2" style="opacity: 0.5;">Extracting GeoJSON data</li>
                                            <li id="step3" style="opacity: 0.5;">Splitting by 18 regions</li>
                                            <li id="step4" style="opacity: 0.5;">Optimizing file sizes</li>
                                            <li id="step5" style="opacity: 0.5;">Saving updated files</li>
                                        </ul>
                                    </div>
                                </div>

                                <div id="actionButtons" style="margin-top: 20px;">
                                    <button id="cancelUpdateBtn" style="
                                        background: rgba(239, 68, 68, 0.9);
                                        color: white;
                                        border: 2px solid #ef4444;
                                        padding: 12px 30px;
                                        border-radius: 8px;
                                        cursor: pointer;
                                        font-weight: bold;
                                        font-size: 1em;
                                        transition: all 0.3s;
                                    " onmouseover="this.style.background='rgba(239, 68, 68, 1)'; this.style.transform='scale(1.05)';"
                                       onmouseout="this.style.background='rgba(239, 68, 68, 0.9)'; this.style.transform='scale(1)';">
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        `;

                        modal.appendChild(modalContent);
                        document.body.appendChild(modal);

                        // Check if update server is running
                        try {
                            const healthCheck = await fetch('http://localhost:5000/api/health');

                            if (!healthCheck.ok) {
                                throw new Error('Server not responding');
                            }

                            // ========================================
                            // SUBROUTINE: Version Check (check_osm_roads_version)
                            // ========================================
                            document.getElementById('statusMessage').innerHTML = '✓ Server connected. Checking version...';
                            updateBtn.innerHTML = '⏳ Checking version...';

                            const versionCheckResponse = await fetch('http://localhost:5000/api/check-version');
                            const versionCheck = await versionCheckResponse.json();

                            // Check if versions match (handle both field name variations)
                            const versionsMatch = versionCheck.is_same || (versionCheck.update_needed === false);

                            if (versionCheck.success && versionsMatch) {
                                // Versions match - show "already up to date" modal
                                document.getElementById('updateIcon').textContent = '✓';
                                document.getElementById('statusMessage').innerHTML = `
                                    <div style="text-align: center; color: #22c55e;">
                                        <strong style="font-size: 1.2em;">✓ Roads Already Up to Date!</strong>
                                    </div>
                                `;

                                document.getElementById('updateProgress').innerHTML = `
                                    <div style="text-align: left; padding: 15px; background: rgba(34, 197, 94, 0.15); border-radius: 8px; border-left: 3px solid #22c55e;">
                                        <div style="margin-bottom: 12px;">
                                            <strong style="color: #0ea5e9;">📅 HDX Version:</strong>
                                            <div style="margin-left: 20px; color: #94a3b8; font-family: monospace;">${versionCheck.hdx_version || 'Unknown'}</div>
                                        </div>
                                        <div style="margin-bottom: 12px;">
                                            <strong style="color: #0ea5e9;">💾 Local Version:</strong>
                                            <div style="margin-left: 20px; color: #94a3b8; font-family: monospace;">${versionCheck.local_version || 'Unknown'}</div>
                                        </div>
                                        <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.1);">
                                            <strong style="color: #22c55e;">✓ Both versions match</strong><br>
                                            <span style="color: #94a3b8; font-size: 0.9em;">No update needed - your roads data is current!</span>
                                        </div>
                                    </div>
                                `;

                                document.getElementById('actionButtons').innerHTML = `
                                    <button id="closeVersionModal" style="
                                        background: rgba(34, 197, 94, 0.9);
                                        color: white;
                                        border: 2px solid #22c55e;
                                        padding: 12px 30px;
                                        border-radius: 8px;
                                        cursor: pointer;
                                        font-weight: bold;
                                        font-size: 1em;
                                        transition: all 0.3s;
                                    " onmouseover="this.style.background='rgba(34, 197, 94, 1)'; this.style.transform='scale(1.05)';"
                                       onmouseout="this.style.background='rgba(34, 197, 94, 0.9)'; this.style.transform='scale(1)';">
                                        OK
                                    </button>
                                `;

                                document.getElementById('closeVersionModal').addEventListener('click', function() {
                                    document.body.removeChild(modal);
                                    updateBtn.disabled = false;
                                    updateBtn.style.opacity = '1';
                                    updateBtn.style.cursor = 'pointer';
                                    updateBtn.innerHTML = originalHTML;
                                });

                                return; // Stop here - no update needed
                            }

                            // Versions different or no local version - show update info and proceed
                            const needsUpdate = versionCheck.needs_update || versionCheck.update_needed;
                            if (versionCheck.success && needsUpdate) {
                                document.getElementById('statusMessage').innerHTML = `
                                    <div style="margin-bottom: 10px;">
                                        <strong style="color: #f59e0b;">🔄 Update Available</strong>
                                    </div>
                                    <div style="font-size: 0.85em; color: #94a3b8; line-height: 1.5;">
                                        <strong>HDX Version:</strong> ${versionCheck.hdx_version || 'Unknown'}<br>
                                        <strong>Local Version:</strong> ${versionCheck.local_version || 'Not downloaded'}<br>
                                        <div style="margin-top: 8px; color: #22c55e;">Proceeding with download...</div>
                                    </div>
                                `;
                            }

                            // Server is running, trigger update
                            document.getElementById('statusMessage').innerHTML = '✓ Server connected. Starting update...';
                            updateBtn.innerHTML = '⏳ Updating...';

                            const response = await fetch('http://localhost:5000/api/update-roads', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' }
                            });

                            const result = await response.json();

                            if (result.success) {
                                // Poll for status updates
                                const statusInterval = setInterval(async () => {
                                    try {
                                        const statusResponse = await fetch('http://localhost:5000/api/update-status');
                                        const status = await statusResponse.json();

                                        // Update progress bar
                                        const progressBar = document.getElementById('progressBar');
                                        const progressText = document.getElementById('progressText');
                                        if (progressBar && progressText) {
                                            progressBar.style.width = status.progress + '%';
                                            progressText.textContent = status.progress + '%';
                                        }

                                        // Update status message with detailed info
                                        const statusMsg = document.getElementById('statusMessage');
                                        if (statusMsg) {
                                            let detailedMessage = status.message;

                                            // Add file info during download phase (25-45%)
                                            if (status.progress >= 25 && status.progress < 50) {
                                                detailedMessage += '<br><br><div style="background: rgba(0,0,0,0.3); padding: 10px; border-radius: 6px; margin-top: 10px;">';
                                                detailedMessage += '<strong>📦 File:</strong> hotosm_som_roads_lines_geojson.zip<br>';
                                                detailedMessage += '<strong>💾 Size:</strong> ~83 MB<br>';
                                                detailedMessage += '<strong>📍 Saving to:</strong> roads_by_region_latest/<br>';
                                                const downloadPercent = ((status.progress - 25) / 20) * 100;
                                                const estimatedTime = Math.ceil((100 - downloadPercent) * 0.1); // rough estimate
                                                detailedMessage += '<strong>⏱️ Est. time:</strong> ~' + estimatedTime + ' minutes';
                                                detailedMessage += '</div>';
                                            }

                                            statusMsg.innerHTML = detailedMessage;
                                        }

                                        // Update step indicators
                                        if (status.progress >= 20) document.getElementById('step1').style.opacity = '1';
                                        if (status.progress >= 40) document.getElementById('step2').style.opacity = '1';
                                        if (status.progress >= 60) document.getElementById('step3').style.opacity = '1';
                                        if (status.progress >= 80) document.getElementById('step4').style.opacity = '1';
                                        if (status.progress >= 100) document.getElementById('step5').style.opacity = '1';

                                        // Check if completed
                                        if (!status.running && status.progress === 100) {
                                            clearInterval(statusInterval);

                                            // Show success
                                            document.getElementById('updateIcon').textContent = '✅';
                                            document.getElementById('statusMessage').innerHTML = '<strong style="color: #22c55e;">✓ Update completed successfully!</strong>';
                                            document.getElementById('actionButtons').innerHTML = `
                                                <button id="closeSuccessBtn" style="
                                                    background: rgba(34, 197, 94, 0.9);
                                                    color: white;
                                                    border: 2px solid #22c55e;
                                                    padding: 12px 30px;
                                                    border-radius: 8px;
                                                    cursor: pointer;
                                                    font-weight: bold;
                                                    font-size: 1em;
                                                    transition: all 0.3s;
                                                " onmouseover="this.style.background='rgba(34, 197, 94, 1)'; this.style.transform='scale(1.05)';"
                                                   onmouseout="this.style.background='rgba(34, 197, 94, 0.9)'; this.style.transform='scale(1)';">
                                                    Done
                                                </button>
                                            `;

                                            document.getElementById('closeSuccessBtn').addEventListener('click', function() {
                                                document.body.removeChild(modal);
                                                updateBtn.disabled = false;
                                                updateBtn.style.opacity = '1';
                                                updateBtn.style.cursor = 'pointer';
                                                updateBtn.innerHTML = originalHTML;
                                            });
                                        } else if (!status.running && status.error) {
                                            clearInterval(statusInterval);

                                            // Show error
                                            document.getElementById('updateIcon').textContent = '❌';
                                            document.getElementById('statusMessage').innerHTML = `<strong style="color: #ef4444;">Error: ${status.error}</strong>`;
                                            document.getElementById('actionButtons').innerHTML = `
                                                <button id="closeErrorBtn" style="
                                                    background: rgba(239, 68, 68, 0.9);
                                                    color: white;
                                                    border: 2px solid #ef4444;
                                                    padding: 12px 30px;
                                                    border-radius: 8px;
                                                    cursor: pointer;
                                                    font-weight: bold;
                                                    font-size: 1em;
                                                    transition: all 0.3s;
                                                " onmouseover="this.style.background='rgba(239, 68, 68, 1)'; this.style.transform='scale(1.05)';"
                                                   onmouseout="this.style.background='rgba(239, 68, 68, 0.9)'; this.style.transform='scale(1)';">
                                                    Close
                                                </button>
                                            `;

                                            document.getElementById('closeErrorBtn').addEventListener('click', function() {
                                                document.body.removeChild(modal);
                                                updateBtn.disabled = false;
                                                updateBtn.style.opacity = '1';
                                                updateBtn.style.cursor = 'pointer';
                                                updateBtn.innerHTML = originalHTML;
                                            });
                                        }
                                    } catch (err) {
                                        console.error('Status check error:', err);
                                    }
                                }, 1000); // Check every second

                                // Cancel button - also resets server
                                document.getElementById('cancelUpdateBtn').addEventListener('click', async function() {
                                    clearInterval(statusInterval);

                                    // Call reset API to clear stuck update
                                    try {
                                        await fetch('http://localhost:5000/api/reset', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' }
                                        });
                                    } catch (err) {
                                        console.error('Reset error:', err);
                                    }

                                    document.body.removeChild(modal);
                                    updateBtn.disabled = false;
                                    updateBtn.style.opacity = '1';
                                    updateBtn.style.cursor = 'pointer';
                                    updateBtn.innerHTML = originalHTML;
                                });

                            } else {
                                throw new Error(result.message || 'Failed to start update');
                            }

                        } catch (error) {
                            // Server not running - show setup instructions
                            modalContent.innerHTML = `
                                <div style="text-align: center;">
                                    <div style="font-size: 3em; margin-bottom: 15px;">⚙️</div>
                                    <h2 style="margin: 0 0 20px 0; color: #f59e0b;">Update Server Required</h2>

                                    <div style="text-align: left; background: rgba(245, 158, 11, 0.1); padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                                        <p style="margin: 0 0 15px 0; font-size: 0.95em;">To enable automatic background updates, please start the update server:</p>

                                        <div style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 6px; margin-bottom: 15px;">
                                            <strong style="color: #0ea5e9;">Step 1: Install dependencies</strong>
                                            <code style="display: block; background: rgba(0,0,0,0.4); padding: 8px; border-radius: 4px; color: #22c55e; font-weight: bold; margin-top: 8px;">pip install flask flask-cors</code>
                                        </div>

                                        <div style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 6px; margin-bottom: 15px;">
                                            <strong style="color: #0ea5e9;">Step 2: Start the server</strong>
                                            <code style="display: block; background: rgba(0,0,0,0.4); padding: 8px; border-radius: 4px; color: #22c55e; font-weight: bold; margin-top: 8px;">python update_server.py</code>
                                        </div>

                                        <div style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 6px;">
                                            <strong style="color: #0ea5e9;">Step 3: Click the update button again</strong>
                                            <p style="margin: 8px 0 0 0; font-size: 0.9em; opacity: 0.8;">The dashboard will automatically connect and update in the background</p>
                                        </div>
                                    </div>

                                    <div style="margin-top: 20px;">
                                        <button id="closeSetupModal" style="
                                            background: rgba(245, 158, 11, 0.9);
                                            color: white;
                                            border: 2px solid #f59e0b;
                                            padding: 12px 30px;
                                            border-radius: 8px;
                                            cursor: pointer;
                                            font-weight: bold;
                                            font-size: 1em;
                                            transition: all 0.3s;
                                        " onmouseover="this.style.background='rgba(245, 158, 11, 1)'; this.style.transform='scale(1.05)';"
                                           onmouseout="this.style.background='rgba(245, 158, 11, 0.9)'; this.style.transform='scale(1)';">
                                            Got it!
                                        </button>
                                    </div>
                                </div>
                            `;

                            document.getElementById('closeSetupModal').addEventListener('click', function() {
                                document.body.removeChild(modal);
                            });

                            updateBtn.disabled = false;
                            updateBtn.style.opacity = '1';
                            updateBtn.style.cursor = 'pointer';
                            updateBtn.innerHTML = originalHTML;
                        }

                        // ESC key to close
                        const escHandler = function(e) {
                            if (e.key === 'Escape') {
                                if (document.body.contains(modal)) {
                                    document.body.removeChild(modal);
                                    updateBtn.disabled = false;
                                    updateBtn.style.opacity = '1';
                                    updateBtn.style.cursor = 'pointer';
                                    updateBtn.innerHTML = originalHTML;
                                }
                                document.removeEventListener('keydown', escHandler);
                            }
                        };
                        document.addEventListener('keydown', escHandler);
                    });
                }
            }, 500);

            // ========================================
            // Open Source Geo-API Handler
            // ========================================
            setTimeout(function() {
                const checkVersionsBtn = document.getElementById('checkRoadsVersionsBtn');
                if (checkVersionsBtn) {
                    checkVersionsBtn.addEventListener('click', async function() {
                        // Show loading state
                        const originalHTML = checkVersionsBtn.innerHTML;
                        checkVersionsBtn.innerHTML = '⏳ Checking...';
                        checkVersionsBtn.disabled = true;
                        checkVersionsBtn.style.opacity = '0.6';
                        checkVersionsBtn.style.cursor = 'not-allowed';

                        try {
                            // Call backend version check
                            const response = await fetch('http://localhost:5000/api/check-version');

                            if (!response.ok) {
                                throw new Error('Server not responding');
                            }

                            const data = await response.json();

                            if (!data.success) {
                                throw new Error(data.message || 'Failed to check versions');
                            }

                            // Create version modal
                            showVersionModal(data);

                        } catch (error) {
                            // Show error modal
                            const modal = document.createElement('div');
                            modal.style.cssText = `
                                position: fixed;
                                top: 0;
                                left: 0;
                                width: 100%;
                                height: 100%;
                                background: rgba(0, 0, 0, 0.8);
                                z-index: 20000;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                            `;

                            const modalContent = document.createElement('div');
                            modalContent.style.cssText = `
                                background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
                                border-radius: 16px;
                                padding: 30px;
                                max-width: 600px;
                                width: 90%;
                                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8);
                                border: 2px solid #ef4444;
                                color: white;
                            `;

                            modalContent.innerHTML = `
                                <div style="text-align: center;">
                                    <div style="font-size: 3em; margin-bottom: 15px;">⚙️</div>
                                    <h2 style="margin: 0 0 20px 0; color: #f59e0b;">Update Server Required</h2>

                                    <div style="text-align: left; background: rgba(245, 158, 11, 0.1); padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                                        <p style="margin: 0 0 15px 0; font-size: 0.95em;">To check for OSM roads versions, please start the update server:</p>

                                        <div style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 6px; margin-bottom: 15px;">
                                            <strong style="color: #0ea5e9;">Step 1: Install dependencies</strong>
                                            <code style="display: block; background: rgba(0,0,0,0.4); padding: 8px; border-radius: 4px; color: #22c55e; font-weight: bold; margin-top: 8px;">pip install requests</code>
                                        </div>

                                        <div style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 6px; margin-bottom: 15px;">
                                            <strong style="color: #0ea5e9;">Step 2: Start the server</strong>
                                            <code style="display: block; background: rgba(0,0,0,0.4); padding: 8px; border-radius: 4px; color: #22c55e; font-weight: bold; margin-top: 8px;">python update_server.py</code>
                                        </div>

                                        <div style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 6px;">
                                            <strong style="color: #0ea5e9;">Step 3: Click the check button again</strong>
                                            <p style="margin: 8px 0 0 0; font-size: 0.9em; opacity: 0.8;">The dashboard will show all available versions from HDX</p>
                                        </div>
                                    </div>

                                    <div style="margin-top: 20px;">
                                        <button id="closeErrorModal" style="
                                            background: rgba(245, 158, 11, 0.9);
                                            color: white;
                                            border: 2px solid #f59e0b;
                                            padding: 12px 30px;
                                            border-radius: 8px;
                                            cursor: pointer;
                                            font-weight: bold;
                                            font-size: 1em;
                                            transition: all 0.3s;
                                        " onmouseover="this.style.background='rgba(245, 158, 11, 1)'; this.style.transform='scale(1.05)';"
                                           onmouseout="this.style.background='rgba(245, 158, 11, 0.9)'; this.style.transform='scale(1)';">
                                            Got it!
                                        </button>
                                    </div>
                                </div>
                            `;

                            modal.appendChild(modalContent);
                            document.body.appendChild(modal);

                            document.getElementById('closeErrorModal').addEventListener('click', function() {
                                document.body.removeChild(modal);
                            });
                        } finally {
                            // Reset button state
                            checkVersionsBtn.innerHTML = originalHTML;
                            checkVersionsBtn.disabled = false;
                            checkVersionsBtn.style.opacity = '1';
                            checkVersionsBtn.style.cursor = 'pointer';
                        }
                    });
                }
            }, 500);

            // ========================================
            // Show Version Modal Function
            // ========================================
            function showVersionModal(data) {
                const modal = document.createElement('div');
                modal.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.85);
                    z-index: 20000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                `;

                const modalContent = document.createElement('div');
                modalContent.style.cssText = `
                    background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
                    border-radius: 16px;
                    padding: 30px;
                    max-width: 700px;
                    width: 90%;
                    max-height: 80vh;
                    overflow-y: auto;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.9);
                    border: 2px solid #3b82f6;
                    color: white;
                `;

                // Build versions HTML
                // MODULAR FILTER: For each date, prefer GeoJSON if in_dashboard, otherwise show available formats
                // This ensures we don't show redundant formats for dates we already have
                let versionsHTML = '';
                let hasDownloadable = false;

                // Group versions by date
                const versionsByDate = {};
                data.versions.forEach(version => {
                    const dateKey = version.date_short;
                    if (!versionsByDate[dateKey]) {
                        versionsByDate[dateKey] = [];
                    }
                    versionsByDate[dateKey].push(version);
                });

                // Process each date - intelligently select what to show
                const processedVersions = [];
                Object.keys(versionsByDate).sort().reverse().forEach(dateKey => {
                    const versionsForDate = versionsByDate[dateKey];
                    const hasLocalForDate = versionsForDate.some(v => v.status === 'in_dashboard');

                    if (hasLocalForDate) {
                        // Date is in dashboard - show only ONE entry (prefer GeoJSON)
                        const geojsonVersion = versionsForDate.find(v => v.format === 'GEOJSON' && v.status === 'in_dashboard');
                        const anyLocalVersion = versionsForDate.find(v => v.status === 'in_dashboard');
                        processedVersions.push(geojsonVersion || anyLocalVersion);
                    } else {
                        // Date not in dashboard - show available formats (prefer GeoJSON if both available)
                        const geojsonVersion = versionsForDate.find(v => v.format === 'GEOJSON');
                        const geopackageVersion = versionsForDate.find(v => v.format === 'GEOPACKAGE');

                        if (geojsonVersion) {
                            processedVersions.push(geojsonVersion);
                        } else if (geopackageVersion) {
                            // Only Geopackage available - mark it needs conversion
                            geopackageVersion.needsConversion = true;
                            processedVersions.push(geopackageVersion);
                        }
                    }
                });

                processedVersions.forEach(version => {
                    const statusColor = version.status === 'in_dashboard' ? '#22c55e' : '#f59e0b';
                    const statusIcon = version.status === 'in_dashboard' ? '✓' : '📥';
                    const statusText = version.status === 'in_dashboard' ? 'In Dashboard' : 'Available';
                    const latestBadge = version.is_latest ? '<span style="background: #f59e0b; padding: 2px 8px; border-radius: 4px; font-size: 0.75em; margin-left: 8px;">LATEST</span>' : '';
                    const olderBadge = !version.is_latest && version.status !== 'in_dashboard' ? '<span style="background: #6366f1; padding: 2px 8px; border-radius: 4px; font-size: 0.75em; margin-left: 8px;">OLDER</span>' : '';
                    const disabled = version.status === 'in_dashboard' ? 'disabled' : '';
                    const checkboxStyle = version.status === 'in_dashboard' ? 'opacity: 0.5; cursor: not-allowed;' : 'cursor: pointer;';
                    const conversionNote = version.needsConversion ? '<div style="color: #f59e0b; margin-top: 5px;">⚠️ Will be converted to GeoJSON during download</div>' : '';

                    // Determine version key for uninstall based on local_folder
                    // Use actual folder name for proper deletion
                    let versionKey = version.local_folder || 'latest';
                    let versionLabel = version.readable || 'Unknown';

                    // Simplified version key for known versions (for UI display)
                    if (version.local_folder === 'roads_by_region_2024_07_23' || version.date_short === '2024_07_23') {
                        versionKey = '2024';
                        versionLabel = 'Roads 2024 (July)';
                    } else if (version.local_folder === 'roads_by_region_latest') {
                        versionKey = 'latest';
                        versionLabel = 'Roads Latest (2026)';
                    }
                    console.log(`[GeoAPI Modal] Version: ${version.readable}, date_short: ${version.date_short}, local_folder: ${version.local_folder}, versionKey: ${versionKey}`);

                    // Uninstall button - only shown when in dashboard
                    const uninstallBtn = version.status === 'in_dashboard' ? `
                        <button class="uninstall-version-btn" data-version="${versionKey}" data-folder="${version.local_folder || ''}" style="
                            background: rgba(239, 68, 68, 0.15);
                            border: 1px solid #ef4444;
                            color: #ef4444;
                            padding: 4px 10px;
                            border-radius: 4px;
                            cursor: pointer;
                            font-size: 0.75em;
                            font-weight: bold;
                            margin-left: 8px;
                            transition: all 0.2s;
                        " onmouseover="this.style.background='rgba(239, 68, 68, 0.3)';" onmouseout="this.style.background='rgba(239, 68, 68, 0.15)';">
                            🗑️ Uninstall
                        </button>
                    ` : '';

                    if (version.status !== 'in_dashboard') {
                        hasDownloadable = true;
                    }

                    versionsHTML += `
                        <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 8px; margin-bottom: 12px; border-left: 4px solid ${statusColor};">
                            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                                <div style="display: flex; align-items: center; gap: 10px;">
                                    <input type="checkbox" id="version-${version.date}" class="version-checkbox" ${disabled}
                                           style="${checkboxStyle}" data-version='${JSON.stringify(version)}'>
                                    <label for="version-${version.date}" style="font-weight: bold; font-size: 1.1em; ${disabled ? 'opacity: 0.7;' : ''}">
                                        📦 ${version.readable}${latestBadge}${olderBadge}
                                    </label>
                                </div>
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <div style="background: ${statusColor}; padding: 4px 12px; border-radius: 6px; font-size: 0.85em; font-weight: bold;">
                                        ${statusIcon} ${statusText}
                                    </div>
                                    ${uninstallBtn}
                                </div>
                            </div>
                            <div style="font-size: 0.9em; color: #94a3b8; margin-left: 28px;">
                                <div>📊 Format: ${version.format}${version.needsConversion ? ' → GeoJSON' : ''}</div>
                                <div>💾 Size: ${version.size_mb.toFixed(2)} MB</div>
                                ${version.local_folder ? `<div>📁 Folder: ${version.local_folder}</div>` : ''}
                                ${conversionNote}
                            </div>
                        </div>
                    `;
                });

                modalContent.innerHTML = `
                    <div style="text-align: center;">
                        <div style="font-size: 3em; margin-bottom: 15px;">📦</div>
                        <h2 style="margin: 0 0 10px 0; color: #3b82f6;">Open Source Geo-API (Application Programming Interface)</h2>
                        <p style="margin: 0 0 25px 0; color: #94a3b8; font-size: 0.95em;">Select versions to download and integrate</p>

                        <div id="versionsContainer" style="text-align: left; margin-bottom: 25px;">
                            ${versionsHTML}
                        </div>

                        ${hasDownloadable ? `
                            <div style="background: rgba(59, 130, 246, 0.1); padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 3px solid #3b82f6;">
                                <div style="display: flex; align-items: center; gap: 10px;">
                                    <input type="checkbox" id="selectAllVersions" style="cursor: pointer;">
                                    <label for="selectAllVersions" style="font-weight: bold; color: #3b82f6; cursor: pointer;">
                                        Select All Available Versions
                                    </label>
                                </div>
                            </div>
                        ` : `
                            <div style="background: rgba(34, 197, 94, 0.1); padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 3px solid #22c55e;">
                                <div style="color: #22c55e; font-weight: bold;">
                                    ✓ All available versions are already in your dashboard!
                                </div>
                            </div>
                        `}

                        <div style="display: flex; gap: 15px; justify-content: center; flex-wrap: wrap;">
                            ${hasDownloadable ? `
                                <button id="downloadSelectedBtn" style="
                                    background: rgba(34, 197, 94, 0.9);
                                    color: white;
                                    border: 2px solid #22c55e;
                                    padding: 12px 30px;
                                    border-radius: 8px;
                                    cursor: pointer;
                                    font-weight: bold;
                                    font-size: 1em;
                                    transition: all 0.3s;
                                " onmouseover="this.style.background='rgba(34, 197, 94, 1)'; this.style.transform='scale(1.05)';"
                                   onmouseout="this.style.background='rgba(34, 197, 94, 0.9)'; this.style.transform='scale(1)';">
                                    ⬇️ Download Selected
                                </button>
                            ` : ''}
                            <button id="searchHDXBtn" style="
                                background: rgba(168, 85, 247, 0.9);
                                color: white;
                                border: 2px solid #a855f7;
                                padding: 12px 30px;
                                border-radius: 8px;
                                cursor: pointer;
                                font-weight: bold;
                                font-size: 1em;
                                transition: all 0.3s;
                            " onmouseover="this.style.background='rgba(168, 85, 247, 1)'; this.style.transform='scale(1.05)';"
                               onmouseout="this.style.background='rgba(168, 85, 247, 0.9)'; this.style.transform='scale(1)';">
                                🔍 Search HDX for Road Data
                            </button>
                            <button id="closeVersionModal" style="
                                background: rgba(100, 116, 139, 0.9);
                                color: white;
                                border: 2px solid #64748b;
                                padding: 12px 30px;
                                border-radius: 8px;
                                cursor: pointer;
                                font-weight: bold;
                                font-size: 1em;
                                transition: all 0.3s;
                            " onmouseover="this.style.background='rgba(100, 116, 139, 1)'; this.style.transform='scale(1.05)';"
                               onmouseout="this.style.background='rgba(100, 116, 139, 0.9)'; this.style.transform='scale(1)';">
                                Close
                            </button>
                        </div>
                    </div>
                `;

                modal.appendChild(modalContent);
                document.body.appendChild(modal);

                // Setup "Select All" functionality
                if (hasDownloadable) {
                    const selectAllCheckbox = document.getElementById('selectAllVersions');
                    const versionCheckboxes = document.querySelectorAll('.version-checkbox:not([disabled])');

                    selectAllCheckbox.addEventListener('change', function() {
                        versionCheckboxes.forEach(cb => {
                            cb.checked = this.checked;
                        });
                    });

                    // Update "Select All" when individual checkboxes change
                    versionCheckboxes.forEach(cb => {
                        cb.addEventListener('change', function() {
                            const allChecked = Array.from(versionCheckboxes).every(checkbox => checkbox.checked);
                            selectAllCheckbox.checked = allChecked;
                        });
                    });
                }

                // Uninstall buttons handler - Using GeoAPI Module
                document.querySelectorAll('.uninstall-version-btn').forEach(btn => {
                    btn.addEventListener('click', async function() {
                        const versionKey = this.dataset.version;
                        const folderName = this.dataset.folder || '';

                        // Determine display label and folder path
                        let versionLabel, folderPath;
                        if (versionKey === '2024') {
                            versionLabel = 'Roads 2024 (July)';
                            folderPath = 'data_warehouse/roads/roads_by_region_2024_07_23';
                        } else if (versionKey === 'latest') {
                            versionLabel = 'Roads Latest (2026)';
                            folderPath = 'data_warehouse/roads/roads_by_region_latest';
                        } else {
                            // Custom version - use folder name
                            versionLabel = `Roads (${folderName})`;
                            folderPath = `data_warehouse/roads/${folderName}`;
                        }

                        if (!confirm(`Are you sure you want to uninstall ${versionLabel}?\n\nThis will:\n• Remove the layer from the map\n• Remove from the Layers panel\n• Delete all 18 region files from ${folderPath}\n\nYou can reinstall later from the Geo-API panel.`)) {
                            return;
                        }

                        this.disabled = true;
                        this.innerHTML = '⏳ Removing...';

                        try {
                            // Use GeoAPI module for complete uninstall
                            if (typeof GeoAPI !== 'undefined') {
                                const result = await GeoAPI.uninstall(versionKey);

                                if (result.success) {
                                    alert(`✅ ${versionLabel} uninstalled successfully!\n\n• Layer removed from map\n• Entry removed from panel\n• ${result.filesRemoved || 18} files deleted`);

                                    // Close modal and refresh
                                    document.body.removeChild(modal);
                                    // Don't reopen - the version is now uninstalled
                                } else {
                                    throw new Error(result.error || 'Uninstall failed');
                                }
                            } else {
                                // Fallback if GeoAPI not loaded
                                const response = await fetch('http://localhost:5000/uninstall-roads', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ version: versionKey, folder: folderName })
                                });

                                if (response.ok) {
                                    const result = await response.json();

                                    // Manual removal from map
                                    if (versionKey === '2024') {
                                        if (typeof activeRoads2024Layer !== 'undefined' && activeRoads2024Layer && map.hasLayer(activeRoads2024Layer)) {
                                            map.removeLayer(activeRoads2024Layer);
                                        }
                                        window.activeRoads2024Layer = null;
                                        const container = document.getElementById('roads2024Container');
                                        if (container) container.remove();
                                    } else {
                                        if (typeof activeRoadsOSMLatestLayer !== 'undefined' && activeRoadsOSMLatestLayer && map.hasLayer(activeRoadsOSMLatestLayer)) {
                                            map.removeLayer(activeRoadsOSMLatestLayer);
                                        }
                                        window.activeRoadsOSMLatestLayer = null;
                                        const container = document.getElementById('roadsLatestContainer');
                                        if (container) container.remove();
                                    }

                                    alert(`✅ ${versionLabel} uninstalled successfully!\n\nRemoved ${result.filesDeleted || 18} files.`);
                                    document.body.removeChild(modal);
                                } else {
                                    throw new Error('Server returned error');
                                }
                            }
                        } catch (error) {
                            console.error('Uninstall error:', error);
                            alert('❌ Could not uninstall roads.\n\nMake sure the update server is running (python update_server.py)');
                            this.disabled = false;
                            this.innerHTML = '🗑️ Uninstall';
                        }
                    });
                });

                // Close button handler
                document.getElementById('closeVersionModal').addEventListener('click', function() {
                    document.body.removeChild(modal);
                });

                // Search HDX button handler - Uses GeoAPI.search()
                document.getElementById('searchHDXBtn').addEventListener('click', async function() {
                    const btn = this;
                    const originalHTML = btn.innerHTML;
                    btn.innerHTML = '⏳ Searching HDX...';
                    btn.disabled = true;

                    try {
                        // Use GeoAPI module if available
                        if (typeof GeoAPI !== 'undefined') {
                            const results = await GeoAPI.search();
                            showHDXSearchResults(results, modal);
                        } else {
                            // Fallback - direct API call via backend
                            const response = await fetch('http://localhost:5000/api/search-hdx', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    country: 'somalia',
                                    resourceTypes: ['geojson', 'json', 'gpkg'],
                                    query: 'roads'
                                })
                            });

                            if (response.ok) {
                                const data = await response.json();
                                showHDXSearchResults(data.results || [], modal);
                            } else {
                                throw new Error('HDX search failed');
                            }
                        }
                    } catch (error) {
                        console.error('HDX search error:', error);
                        alert('⚠️ Could not search HDX.\n\nMake sure the update server is running (python update_server.py)\n\nHDX search requires internet connection.');
                    } finally {
                        btn.innerHTML = originalHTML;
                        btn.disabled = false;
                    }
                });

                // Download selected button handler
                if (hasDownloadable) {
                    document.getElementById('downloadSelectedBtn').addEventListener('click', async function() {
                        const selectedVersions = Array.from(document.querySelectorAll('.version-checkbox:checked:not([disabled])'))
                            .map(cb => JSON.parse(cb.dataset.version));

                        if (selectedVersions.length === 0) {
                            alert('Please select at least one version to download.');
                            return;
                        }

                        // Close version modal and start download process
                        document.body.removeChild(modal);
                        await startMultiVersionDownload(selectedVersions);
                    });
                }

                // ESC key to close
                const escHandler = function(e) {
                    if (e.key === 'Escape' && document.body.contains(modal)) {
                        document.body.removeChild(modal);
                        document.removeEventListener('keydown', escHandler);
                    }
                };
                document.addEventListener('keydown', escHandler);
            }

            // ========================================
            // HDX Search Results Display Function
            // Uses GeoAPI module for search
            // ========================================
            function showHDXSearchResults(results, parentModal) {
                // Create search results modal (overlay on existing modal)
                const searchModal = document.createElement('div');
                searchModal.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.9);
                    z-index: 21000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                `;

                const searchContent = document.createElement('div');
                searchContent.style.cssText = `
                    background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
                    border-radius: 16px;
                    padding: 30px;
                    max-width: 800px;
                    width: 90%;
                    max-height: 80vh;
                    overflow-y: auto;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.9);
                    border: 2px solid #a855f7;
                    color: white;
                `;

                // Build results HTML
                let resultsHTML = '';
                if (results.length === 0) {
                    resultsHTML = `
                        <div style="text-align: center; padding: 40px;">
                            <div style="font-size: 3em; margin-bottom: 15px;">🔍</div>
                            <h3 style="color: #f59e0b;">No road datasets found</h3>
                            <p style="color: #94a3b8;">Try searching with different keywords or check your internet connection.</p>
                        </div>
                    `;
                } else {
                    results.slice(0, 10).forEach((dataset, index) => {
                        const lastUpdated = dataset.lastUpdated ? new Date(dataset.lastUpdated).toLocaleDateString() : 'Unknown';
                        const resourcesHTML = (dataset.resources || []).slice(0, 3).map(r => `
                            <div style="display: inline-block; background: rgba(168, 85, 247, 0.2); padding: 3px 8px; border-radius: 4px; margin: 2px; font-size: 0.75em;">
                                ${r.format} (${r.size ? (r.size / 1024 / 1024).toFixed(1) + 'MB' : 'unknown size'})
                            </div>
                        `).join('');

                        resultsHTML += `
                            <div class="hdx-result-item" data-index="${index}" style="
                                background: rgba(255,255,255,0.05);
                                padding: 15px;
                                border-radius: 8px;
                                margin-bottom: 12px;
                                border-left: 4px solid #a855f7;
                                cursor: pointer;
                                transition: all 0.2s;
                            " onmouseover="this.style.background='rgba(168, 85, 247, 0.15)';"
                               onmouseout="this.style.background='rgba(255,255,255,0.05)';">
                                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                                    <div style="flex: 1;">
                                        <div style="font-weight: bold; font-size: 1.05em; margin-bottom: 5px;">
                                            📦 ${dataset.title || dataset.name || 'Unknown Dataset'}
                                        </div>
                                        <div style="font-size: 0.85em; color: #94a3b8; margin-bottom: 8px;">
                                            ${dataset.description ? dataset.description.substring(0, 150) + '...' : 'No description available'}
                                        </div>
                                        <div style="font-size: 0.8em; color: #64748b;">
                                            📅 Updated: ${lastUpdated} | 🏢 ${dataset.organization || 'Unknown org'}
                                        </div>
                                        <div style="margin-top: 8px;">
                                            ${resourcesHTML}
                                        </div>
                                    </div>
                                    <div style="margin-left: 15px;">
                                        <a href="https://data.humdata.org/dataset/${dataset.name || dataset.id}" target="_blank"
                                           style="
                                               display: inline-block;
                                               background: rgba(168, 85, 247, 0.3);
                                               color: #a855f7;
                                               padding: 6px 12px;
                                               border-radius: 6px;
                                               text-decoration: none;
                                               font-size: 0.85em;
                                               font-weight: bold;
                                           " onclick="event.stopPropagation();">
                                            View on HDX →
                                        </a>
                                    </div>
                                </div>
                            </div>
                        `;
                    });
                }

                searchContent.innerHTML = `
                    <div style="text-align: center; margin-bottom: 20px;">
                        <div style="font-size: 2.5em; margin-bottom: 10px;">🔍</div>
                        <h2 style="margin: 0 0 5px 0; color: #a855f7;">HDX Road Data Search</h2>
                        <p style="margin: 0; color: #94a3b8; font-size: 0.9em;">Found ${results.length} road-related datasets for Somalia</p>
                    </div>

                    <div style="max-height: 50vh; overflow-y: auto; margin-bottom: 20px;">
                        ${resultsHTML}
                    </div>

                    <div style="display: flex; gap: 15px; justify-content: center;">
                        <button id="closeSearchResults" style="
                            background: rgba(100, 116, 139, 0.9);
                            color: white;
                            border: 2px solid #64748b;
                            padding: 12px 30px;
                            border-radius: 8px;
                            cursor: pointer;
                            font-weight: bold;
                            font-size: 1em;
                            transition: all 0.3s;
                        " onmouseover="this.style.background='rgba(100, 116, 139, 1)'; this.style.transform='scale(1.05)';"
                           onmouseout="this.style.background='rgba(100, 116, 139, 0.9)'; this.style.transform='scale(1)';">
                            ← Back to Versions
                        </button>
                    </div>
                `;

                searchModal.appendChild(searchContent);
                document.body.appendChild(searchModal);

                // Close handler
                document.getElementById('closeSearchResults').addEventListener('click', function() {
                    document.body.removeChild(searchModal);
                });

                // ESC to close
                const escHandler = function(e) {
                    if (e.key === 'Escape' && document.body.contains(searchModal)) {
                        document.body.removeChild(searchModal);
                        document.removeEventListener('keydown', escHandler);
                    }
                };
                document.addEventListener('keydown', escHandler);

                console.log('[GeoAPI] HDX search results displayed:', results.length, 'datasets');
            }

            // ========================================
            // Multi-Version Download Function
            // ========================================
            async function startMultiVersionDownload(versions) {
                // Create download progress modal
                const modal = document.createElement('div');
                modal.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.85);
                    z-index: 20000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                `;

                const modalContent = document.createElement('div');
                modalContent.style.cssText = `
                    background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
                    border-radius: 16px;
                    padding: 30px;
                    max-width: 700px;
                    width: 90%;
                    max-height: 80vh;
                    overflow-y: auto;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.9);
                    border: 2px solid #22c55e;
                    color: white;
                `;

                modalContent.innerHTML = `
                    <div style="text-align: center;">
                        <div id="downloadIcon" style="font-size: 3em; margin-bottom: 15px;">⬇️</div>
                        <h2 style="margin: 0 0 20px 0; color: #22c55e;">Downloading Versions</h2>

                        <div id="downloadProgress" style="text-align: left;">
                            <div id="versionsStatus" style="margin-bottom: 20px;">
                                <!-- Version status will be added here -->
                            </div>

                            <div style="background: rgba(34, 197, 94, 0.1); padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                                <div id="currentStatus" style="font-size: 0.95em; margin-bottom: 10px; font-weight: bold; color: #22c55e;">
                                    Preparing downloads...
                                </div>
                                <div style="background: rgba(0,0,0,0.3); border-radius: 8px; height: 25px; overflow: hidden;">
                                    <div id="overallProgressBar" style="background: linear-gradient(90deg, #22c55e, #10b981); height: 100%; width: 0%; transition: width 0.3s; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.85em;">
                                        <span id="overallProgressText">0%</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div id="actionButtons" style="margin-top: 20px;">
                            <button id="cancelDownloadBtn" style="
                                background: rgba(239, 68, 68, 0.9);
                                color: white;
                                border: 2px solid #ef4444;
                                padding: 12px 30px;
                                border-radius: 8px;
                                cursor: pointer;
                                font-weight: bold;
                                font-size: 1em;
                                transition: all 0.3s;
                            " onmouseover="this.style.background='rgba(239, 68, 68, 1)'; this.style.transform='scale(1.05)';"
                               onmouseout="this.style.background='rgba(239, 68, 68, 0.9)'; this.style.transform='scale(1)';">
                                Cancel
                            </button>
                        </div>
                    </div>
                `;

                modal.appendChild(modalContent);
                document.body.appendChild(modal);

                // Add version status items
                const versionsStatusContainer = document.getElementById('versionsStatus');
                versions.forEach(version => {
                    const versionItem = document.createElement('div');
                    versionItem.id = `version-status-${version.date}`;
                    versionItem.style.cssText = `
                        background: rgba(255,255,255,0.05);
                        padding: 12px;
                        border-radius: 6px;
                        margin-bottom: 10px;
                        border-left: 4px solid #94a3b8;
                    `;
                    versionItem.innerHTML = `
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span id="icon-${version.date}" style="font-size: 1.2em;">⏳</span>
                            <div style="flex: 1;">
                                <div style="font-weight: bold;">${version.readable}</div>
                                <div style="font-size: 0.85em; color: #94a3b8;" id="status-${version.date}">Waiting...</div>
                            </div>
                        </div>
                    `;
                    versionsStatusContainer.appendChild(versionItem);
                });

                // Download versions sequentially
                let completed = 0;
                const total = versions.length;

                for (const version of versions) {
                    const versionItem = document.getElementById(`version-status-${version.date}`);
                    const icon = document.getElementById(`icon-${version.date}`);
                    const status = document.getElementById(`status-${version.date}`);
                    const currentStatus = document.getElementById('currentStatus');

                    // Update status
                    versionItem.style.borderLeftColor = '#3b82f6';
                    icon.textContent = '⏬';
                    status.textContent = 'Downloading...';
                    currentStatus.textContent = `Downloading ${version.readable}...`;

                    try {
                        // Start download (runs in background)
                        const startResponse = await fetch('http://localhost:5000/api/download-version', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                version_date: version.date,
                                resource_url: version.download_url,
                                format_type: version.format
                            })
                        });

                        const startResult = await startResponse.json();

                        if (!startResult.success) {
                            throw new Error(startResult.message || 'Failed to start download');
                        }

                        // Poll for progress until complete
                        let downloadComplete = false;
                        while (!downloadComplete) {
                            await new Promise(resolve => setTimeout(resolve, 500)); // Poll every 500ms

                            const statusResponse = await fetch('http://localhost:5000/api/download-status');
                            const downloadStatus = await statusResponse.json();

                            // Update UI with progress
                            status.textContent = downloadStatus.message || 'Processing...';
                            currentStatus.textContent = downloadStatus.message || `Downloading ${version.readable}...`;

                            // Update progress bar
                            const progressPct = downloadStatus.progress || 0;
                            document.getElementById('overallProgressBar').style.width = progressPct + '%';
                            document.getElementById('overallProgressText').textContent = progressPct + '%';

                            if (downloadStatus.step === 'complete' || downloadStatus.progress >= 100) {
                                downloadComplete = true;
                                versionItem.style.borderLeftColor = '#22c55e';
                                icon.textContent = '✓';
                                status.textContent = 'Downloaded successfully';
                                completed++;

                                // AUTO-REGISTER NEW LAYER TO UI
                                // This adds the downloaded version to the layer panel dynamically
                                if (typeof LayerRegistry !== 'undefined') {
                                    const dateFormatted = version.date.split('T')[0];
                                    const folderDate = dateFormatted.replace(/-/g, '_');
                                    const layerId = `roads_${folderDate}`;

                                    LayerRegistry.registerDownloadedLayer({
                                        id: layerId,
                                        name: `Roads ${dateFormatted.substring(0, 7).replace('-', '/')}`,
                                        thematic: 'roads',
                                        folder: `../data_warehouse/roads/roads_by_region_${folderDate}`,
                                        date: dateFormatted,
                                        color: '#fbbf24',  // Yellow/gold for archived versions
                                        source: 'HDX - Humanitarian OpenStreetMap Team',
                                        featureCount: downloadStatus.total_features || 0
                                    });

                                    console.log(`[Geo-API] Registered new layer: ${layerId}`);
                                }
                            } else if (downloadStatus.step === 'error' || downloadStatus.error) {
                                throw new Error(downloadStatus.error || 'Download failed');
                            }
                        }

                    } catch (error) {
                        // Error
                        versionItem.style.borderLeftColor = '#ef4444';
                        icon.textContent = '❌';
                        status.textContent = `Error: ${error.message}`;
                    }
                }

                // All done
                document.getElementById('downloadIcon').textContent = '✅';
                document.getElementById('currentStatus').textContent = `Completed ${completed} of ${total} downloads`;
                document.getElementById('actionButtons').innerHTML = `
                    <button id="closeDownloadModal" style="
                        background: rgba(34, 197, 94, 0.9);
                        color: white;
                        border: 2px solid #22c55e;
                        padding: 12px 30px;
                        border-radius: 8px;
                        cursor: pointer;
                        font-weight: bold;
                        font-size: 1em;
                        transition: all 0.3s;
                        margin-right: 10px;
                    " onmouseover="this.style.background='rgba(34, 197, 94, 1)'; this.style.transform='scale(1.05)';"
                       onmouseout="this.style.background='rgba(34, 197, 94, 0.9)'; this.style.transform='scale(1)';">
                        Done - Close
                    </button>
                    <button id="reloadDashboard" style="
                        background: rgba(59, 130, 246, 0.2);
                        color: #3b82f6;
                        border: 2px solid #3b82f6;
                        padding: 12px 20px;
                        border-radius: 8px;
                        cursor: pointer;
                        font-weight: bold;
                        font-size: 0.9em;
                        transition: all 0.3s;
                    " onmouseover="this.style.background='rgba(59, 130, 246, 0.3)';"
                       onmouseout="this.style.background='rgba(59, 130, 246, 0.2)';">
                        Reload Dashboard
                    </button>
                `;

                document.getElementById('closeDownloadModal').addEventListener('click', function() {
                    document.body.removeChild(modal);
                    // Layers already registered - no reload needed!
                });

                document.getElementById('reloadDashboard').addEventListener('click', function() {
                    document.body.removeChild(modal);
                    location.reload();
                });
            }
        });

        // ========================================
        // REGION-FIRST INITIALIZATION
        // ========================================
        // On page load, disable drag-drop until a region is selected

        (function initRegionFirstMode() {
            // Disable all draggable elements initially
            updateDragDropState(false);

            // Add select region hint
            const hint = document.createElement('div');
            hint.className = 'select-region-hint';
            hint.id = 'selectRegionHint';
            hint.innerHTML = '📍 Click on a region to begin analysis';
            document.body.appendChild(hint);

            // Add region lock indicator (hidden by default)
            const indicator = document.createElement('div');
            indicator.className = 'region-lock-indicator';
            indicator.id = 'regionLockIndicator';
            indicator.innerHTML = '🔒 <span id="lockedRegionName"></span> selected';
            document.body.appendChild(indicator);

            // Listen for region lock events
            document.addEventListener('regionLocked', function(e) {
                const regionName = e.detail.region;

                // Hide hint
                hint.classList.add('hidden');

                // Show lock indicator
                document.getElementById('lockedRegionName').textContent = regionName;
                indicator.classList.add('visible');

                // Enable drag-drop
                updateDragDropState(true);

                console.log(`[Region-First] ${regionName} locked - drag-drop enabled`);
            });

            document.addEventListener('regionUnlocked', function(e) {
                // Show hint again
                hint.classList.remove('hidden');

                // Hide lock indicator
                indicator.classList.remove('visible');

                // Disable drag-drop
                updateDragDropState(false);

                console.log('[Region-First] Region unlocked - drag-drop disabled');
            });

            console.log('[Region-First] Mode initialized - waiting for region selection');
        })();
