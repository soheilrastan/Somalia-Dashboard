        // VERSION 2.8 - OSM Analytics Fixed (2026-01-09)
        console.log('🚀 Dashboard v2.8: Roads OSM with iSEE Analytics working!');

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

        mpiLayer.addTo(map);
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
        let selectedRegion = null;  // Track selected region
        
        const adm1Layer = L.geoJSON(adm1Boundaries, {
            style: function(feature) {
                return {
                    color: '#94a3b8',
                    weight: 2.5,
                    opacity: 0.7,
                    fillOpacity: 0,
                    dashArray: '5, 5'
                };
            },
            onEachFeature: function(feature, layer) {
                // Hover tooltip
                if (feature.properties && feature.properties.name) {
                    layer.bindTooltip(feature.properties.name + ' Region', {
                        permanent: false,
                        direction: 'center',
                        className: 'region-tooltip'
                    });
                }
                
                // Click event to highlight and show popup
                layer.on('click', function(e) {
                    // Reset previous selection
                    if (selectedRegion) {
                        adm1Layer.resetStyle(selectedRegion);
                    }
                    
                    // Highlight clicked region
                    layer.setStyle({
                        color: '#f59e0b',
                        weight: 4,
                        opacity: 1,
                        fillColor: '#f59e0b',
                        fillOpacity: 0.1
                    });
                    
                    selectedRegion = layer;
                    
                    // Create popup content
                    const props = feature.properties;
                    const popupContent = `
                        <div class="popup-header" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">
                            ${props.name} Region
                        </div>
                        <div class="popup-body">
                            <div class="popup-metric">
                                <span class="metric-label">🗺️ Region (ADM1):</span>
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
                            <div style="margin-top: 10px; padding: 10px; background: rgba(245, 158, 11, 0.15); border-left: 3px solid #f59e0b; border-radius: 5px; font-size: 0.8em;">
                                <strong>Total Somalia:</strong> 640,627 km²
                            </div>
                        </div>
                    `;
                    
                    // Show popup at click location
                    L.popup()
                        .setLatLng(e.latlng)
                        .setContent(popupContent)
                        .openOn(map);
                    
                    // Prevent event from bubbling
                    L.DomEvent.stopPropagation(e);
                });
            }
        });
        
        adm1Layer.addTo(map);

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

                    <label><input type="checkbox" id="mpiToggle" checked> Multidimensional Poverty Index, Ref. Y. 2022</label>
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
                    <label style="font-size: 0.85em;">
                        <input type="checkbox" id="roadsToggle">
                        <span style="color: #F48FB1;">■</span>
                        <span id="roadsLabel" draggable="true" style="cursor: grab; user-select: none; display: inline-flex; align-items: center; gap: 4px;">
                            <span class="drag-handle" style="opacity: 0; transition: opacity 0.2s;">⋮⋮</span>
                            <span>Roads (9,063 - 2 regions)</span>
                        </span>
                    </label>

                    <!-- Roads OSM category -->
                    <div style="margin-top: 8px; margin-bottom: 8px; padding: 10px; background: rgba(244, 143, 177, 0.1); border-left: 3px solid #F48FB1; border-radius: 4px;">
                        <label style="font-weight: bold; color: #F48FB1; display: block; margin-bottom: 5px;">
                            <input type="checkbox" id="roadsOSMToggle">
                            <span id="roadsOSMLabel" draggable="true" style="cursor: grab; user-select: none; display: inline-flex; align-items: center; gap: 4px;">
                                <span class="drag-handle" style="opacity: 0; transition: opacity 0.2s;">⋮⋮</span>
                                <span>🛣️ Roads OSM</span>
                            </span>
                        </label>
                        <div style="margin-left: 12px; font-size: 0.85em; color: #94a3b8; margin-top: 5px;">
                            OpenStreetMap Road Network, 2023
                        </div>

                        <!-- OSM Update Button -->
                        <button id="updateOSMButton" style="
                            margin-left: 12px;
                            margin-top: 10px;
                            background: rgba(34, 197, 94, 0.2);
                            border: 2px solid #22c55e;
                            color: #22c55e;
                            padding: 6px 12px;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 0.8em;
                            font-weight: bold;
                            transition: all 0.3s;
                            width: calc(100% - 12px);
                        " onmouseover="this.style.background='rgba(34, 197, 94, 0.3)'" onmouseout="this.style.background='rgba(34, 197, 94, 0.2)'">
                            🔄 Update Roads from HDX API
                        </button>
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

            // Drag start
            bakool2022Label.addEventListener('dragstart', function(e) {
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
                        // Dropped outside Bakool - reset region style
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

            // Map dragover handler for iSEE Analytics - NOW WORKS WITH ANY REGION
            mapContainer.addEventListener('dragover', function(e) {
                if (draggedLayerId === 'iseeAnalytics') {
                    e.preventDefault();

                    const rect = mapContainer.getBoundingClientRect();
                    const latlng = map.containerPointToLatLng([e.clientX - rect.left, e.clientY - rect.top]);

                    // Detect which region we're hovering over using point-in-polygon
                    let overRegion = null;
                    let overRegionLayer = null;

                    for (let regionName in allRegionLayers) {
                        const regionLayer = allRegionLayers[regionName];
                        if (isPointInPolygon(latlng, regionLayer)) {
                            overRegion = regionName;
                            overRegionLayer = regionLayer;
                            break;
                        }
                    }

                    if (overRegion) {
                        // Hovering over a valid region
                        if (iseeAnalyticsActive) {
                            // iSEE Analytics already active - show warning
                            mapContainer.classList.add('drop-invalid');
                            mapContainer.classList.remove('drop-target');

                            if (dragGhost) {
                                dragGhost.style.background = 'rgba(251, 146, 60, 0.9)'; // Orange
                                dragGhost.textContent = '⚠ iSEE Analytics already active';
                            }

                            // Highlight region in orange
                            overRegionLayer.setStyle({
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
                                dragGhost.textContent = `✓ Drop on ${overRegion} to activate iSEE Analytics`;
                            }

                            // Highlight region in green
                            overRegionLayer.setStyle({
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

                        // Update hoveredRegionName
                        if (hoveredRegionName !== overRegion) {
                            // Reset previously hovered region
                            if (hoveredRegionName && allRegionLayers[hoveredRegionName]) {
                                adm1Layer.resetStyle(allRegionLayers[hoveredRegionName]);
                            }
                            hoveredRegionName = overRegion;
                        }
                    } else {
                        // Not over any region
                        mapContainer.classList.remove('drop-target');
                        mapContainer.classList.remove('drop-invalid');

                        if (dragGhost) {
                            dragGhost.style.background = 'rgba(168, 85, 247, 0.9)'; // Purple (neutral)
                            dragGhost.textContent = '🔍 iSEE Analytics - Drop on any region';
                        }

                        // Reset all region styles
                        if (hoveredRegionName && allRegionLayers[hoveredRegionName]) {
                            adm1Layer.resetStyle(allRegionLayers[hoveredRegionName]);
                        }
                        hoveredRegionName = null;

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

            // Map drop handler for iSEE Analytics - NOW WORKS WITH ANY REGION
            mapContainer.addEventListener('drop', function(e) {
                if (draggedLayerId === 'iseeAnalytics') {
                    e.preventDefault();

                    const rect = mapContainer.getBoundingClientRect();
                    const latlng = map.containerPointToLatLng([e.clientX - rect.left, e.clientY - rect.top]);

                    // Detect which region was dropped on using point-in-polygon
                    let droppedRegion = null;
                    let droppedRegionLayer = null;

                    for (let regionName in allRegionLayers) {
                        const regionLayer = allRegionLayers[regionName];
                        if (isPointInPolygon(latlng, regionLayer)) {
                            droppedRegion = regionName;
                            droppedRegionLayer = regionLayer;
                            break;
                        }
                    }

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
                                        clippedRoadsLayer: clippedRoadsLayer,
                                        activeRoadsRegion: activeRoadsRegion,
                                        roadsData: roadsData,
                                        regionLayer: droppedRegionLayer,
                                        allRegionLayers: allRegionLayers,
                                        somaliaData: adm1Boundaries  // Pass MPI/region data for basic analysis
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
            // DRAG-AND-DROP: Roads Layer (Multi-Region with Auto-Clipping)
            // ========================================

            const roadsLabel = document.getElementById('roadsLabel');
            let clippedRoadsLayer = null;
            let activeRoadsRegion = null; // Track which region has roads displayed
            let roadsData = null; // Store roads GeoJSON data with metadata

            // Store region references
            let lowerShebelleRegionLayer = null;

            // Find Lower Shebelle region layer
            adm1Layer.eachLayer(function(layer) {
                if (layer.feature && layer.feature.properties &&
                    layer.feature.properties.name === 'Lower Shebelle') {
                    lowerShebelleRegionLayer = layer;
                }
            });

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

            // Drag start for Roads
            roadsLabel.addEventListener('dragstart', function(e) {
                draggedLayerId = 'roads';

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
                dragGhost.textContent = '🛣️ Roads (2 regions)';
                document.body.appendChild(dragGhost);

                // Add dragging class
                roadsLabel.classList.add('dragging-layer');

                // Store data
                e.dataTransfer.effectAllowed = 'copy';
                e.dataTransfer.setData('text/plain', 'roads');

                // Hide default drag image
                const img = new Image();
                img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
                e.dataTransfer.setDragImage(img, 0, 0);
            });

            // Update ghost position
            document.addEventListener('drag', function(e) {
                if (dragGhost && draggedLayerId === 'roads' && e.clientX !== 0 && e.clientY !== 0) {
                    dragGhost.style.left = (e.clientX + 10) + 'px';
                    dragGhost.style.top = (e.clientY + 10) + 'px';
                }
            });

            // Drag end - cleanup
            roadsLabel.addEventListener('dragend', function(e) {
                roadsLabel.classList.remove('dragging-layer');
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

                // Remove highlight from regions
                if (bakoolRegionLayer) {
                    adm1Layer.resetStyle(bakoolRegionLayer);
                }
                if (lowerShebelleRegionLayer) {
                    adm1Layer.resetStyle(lowerShebelleRegionLayer);
                }
            });

            // Map dragover handler for Roads
            mapContainer.addEventListener('dragover', function(e) {
                if (draggedLayerId === 'roads') {
                    e.preventDefault();

                    const rect = mapContainer.getBoundingClientRect();
                    const latlng = map.containerPointToLatLng([e.clientX - rect.left, e.clientY - rect.top]);

                    let overBakool = false;
                    let overLowerShebelle = false;

                    // Check ONLY Bakool and Lower Shebelle with precise point-in-polygon
                    if (bakoolRegionLayer && isPointInPolygon(latlng, bakoolRegionLayer)) {
                        overBakool = true;
                    }

                    if (lowerShebelleRegionLayer && !overBakool && isPointInPolygon(latlng, lowerShebelleRegionLayer)) {
                        overLowerShebelle = true;
                    }

                    if (overBakool || overLowerShebelle) {
                        // Valid drop zone
                        mapContainer.classList.add('drop-target');
                        mapContainer.classList.remove('drop-invalid');

                        if (dragGhost) {
                            dragGhost.style.background = 'rgba(34, 197, 94, 0.9)'; // Green
                            if (overBakool) {
                                dragGhost.textContent = '✓ Drop to show Bakool roads (1,857)';
                            } else {
                                dragGhost.textContent = '✓ Drop to show Lower Shebelle roads (7,206)';
                            }
                        }

                        // Highlight the region
                        if (overBakool) {
                            bakoolRegionLayer.setStyle({
                                color: '#22c55e',
                                weight: 4,
                                opacity: 1,
                                fillColor: '#22c55e',
                                fillOpacity: 0.2,
                                dashArray: '10, 5'
                            });
                            if (lowerShebelleRegionLayer) {
                                adm1Layer.resetStyle(lowerShebelleRegionLayer);
                            }
                        } else if (overLowerShebelle) {
                            lowerShebelleRegionLayer.setStyle({
                                color: '#22c55e',
                                weight: 4,
                                opacity: 1,
                                fillColor: '#22c55e',
                                fillOpacity: 0.2,
                                dashArray: '10, 5'
                            });
                            if (bakoolRegionLayer) {
                                adm1Layer.resetStyle(bakoolRegionLayer);
                            }
                        }

                        // Show flashing green cursor indicator
                        if (cursorIndicator) {
                            cursorIndicator.style.left = e.clientX + 'px';
                            cursorIndicator.style.top = e.clientY + 'px';
                            cursorIndicator.classList.add('active');
                        }
                    } else {
                        // Outside valid regions - invalid drop zone
                        mapContainer.classList.add('drop-invalid');
                        mapContainer.classList.remove('drop-target');

                        if (dragGhost) {
                            dragGhost.style.background = 'rgba(239, 68, 68, 0.9)'; // Red
                            dragGhost.textContent = '✗ Drop on Bakool or Lower Shebelle';
                        }

                        // Reset region styles
                        if (bakoolRegionLayer) {
                            adm1Layer.resetStyle(bakoolRegionLayer);
                        }
                        if (lowerShebelleRegionLayer) {
                            adm1Layer.resetStyle(lowerShebelleRegionLayer);
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

            // Map drop handler for Roads
            mapContainer.addEventListener('drop', function(e) {
                if (draggedLayerId === 'roads') {
                    e.preventDefault();

                    // Check if Roads layer is already dropped
                    if (roadsLabel.classList.contains('layer-dropped')) {
                        // Show warning notification
                        const rect = mapContainer.getBoundingClientRect();
                        const latlng = map.containerPointToLatLng([e.clientX - rect.left, e.clientY - rect.top]);

                        const warningPopup = L.popup({
                            closeButton: false,
                            autoClose: true,
                            autoPan: false,
                            className: 'drop-warning-popup'
                        })
                        .setLatLng(latlng)
                        .setContent(`⚠️ Roads layer already active in ${activeRoadsRegion}`)
                        .openOn(map);

                        setTimeout(() => {
                            map.closePopup(warningPopup);
                        }, 2500);
                        return; // Exit early
                    }

                    const rect = mapContainer.getBoundingClientRect();
                    const latlng = map.containerPointToLatLng([e.clientX - rect.left, e.clientY - rect.top]);

                    let droppedOnBakool = false;
                    let droppedOnLowerShebelle = false;
                    let targetRegion = null;

                    // Use PRECISE point-in-polygon detection (same as dragover)
                    if (bakoolRegionLayer && isPointInPolygon(latlng, bakoolRegionLayer)) {
                        droppedOnBakool = true;
                        targetRegion = 'Bakool';
                    }

                    // Check Lower Shebelle only if not over Bakool (mutually exclusive)
                    if (lowerShebelleRegionLayer && !droppedOnBakool && isPointInPolygon(latlng, lowerShebelleRegionLayer)) {
                        droppedOnLowerShebelle = true;
                        targetRegion = 'Lower Shebelle'; // Match data spelling
                    }

                    // Only proceed if dropped on a valid region
                    if (droppedOnBakool || droppedOnLowerShebelle) {
                        // Reset region styles
                        if (bakoolRegionLayer) {
                            adm1Layer.resetStyle(bakoolRegionLayer);
                        }
                        if (lowerShebelleRegionLayer) {
                            adm1Layer.resetStyle(lowerShebelleRegionLayer);
                        }

                        // Remove existing clipped roads layer if any
                        if (clippedRoadsLayer && map.hasLayer(clippedRoadsLayer)) {
                            map.removeLayer(clippedRoadsLayer);
                        }

                        // ========================================
                        // AUTO-CLIP ROADS TO TARGET REGION
                        // ========================================
                        console.log('🛣️ Clipping roads to:', targetRegion);

                        // Filter roads data for the target region
                        const filteredFeatures = roadsData.features.filter(feature =>
                            feature.properties.shapeName === targetRegion
                        );

                        console.log(`✓ Found ${filteredFeatures.length} roads in ${targetRegion}`);

                        // Create new clipped layer
                        const clippedData = {
                            type: 'FeatureCollection',
                            features: filteredFeatures
                        };

                        clippedRoadsLayer = L.geoJSON(clippedData, {
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
                                layer.bindPopup(`
                                    <div style="font-family: 'Segoe UI', sans-serif;">
                                        <div style="font-weight: bold; color: #F48FB1; font-size: 1.1em; margin-bottom: 8px;">
                                            🛣️ Road
                                        </div>
                                        <div style="margin: 6px 0;">
                                            <span style="color: #94a3b8; font-size: 0.85em;">Type:</span><br>
                                            <span class="metric-value">${props.TYPE}</span>
                                        </div>
                                        <div style="margin: 6px 0;">
                                            <span style="color: #94a3b8; font-size: 0.85em;">Region:</span><br>
                                            <span class="metric-value">${props.shapeName}</span>
                                        </div>
                                        <div class="source-link">
                                            <strong>Data:</strong> Somalia All Roads 2021 (Clipped to ${targetRegion})
                                        </div>
                                    </div>
                                `, { maxWidth: 300 });
                            }
                        });

                        // Add clipped layer to map
                        map.addLayer(clippedRoadsLayer);

                        // Update active region tracker
                        activeRoadsRegion = targetRegion;

                        // Check the checkbox
                        document.getElementById('roadsToggle').checked = true;

                        // Add visual feedback
                        roadsLabel.classList.add('layer-dropped');

                        // Zoom to the region
                        const targetLayer = droppedOnBakool ? bakoolRegionLayer : lowerShebelleRegionLayer;
                        const targetBounds = targetLayer.getBounds();
                        map.fitBounds(targetBounds, {
                            padding: [50, 50],
                            maxZoom: 10,
                            animate: true,
                            duration: 1.0
                        });

                        // Show success notification
                        const regionDisplayName = droppedOnBakool ? 'Bakool' : 'Lower Shebelle';
                        const notification = L.popup({
                            closeButton: false,
                            autoClose: true,
                            autoPan: false,
                            className: 'drop-success-popup'
                        })
                        .setLatLng(latlng)
                        .setContent(`✓ Roads Layer Clipped to ${regionDisplayName} (${filteredFeatures.length} roads)`)
                        .openOn(map);

                        setTimeout(() => {
                            map.closePopup(notification);
                        }, 3000);
                    } else {
                        // Dropped on invalid region (e.g., Bay) - show warning
                        if (bakoolRegionLayer) {
                            adm1Layer.resetStyle(bakoolRegionLayer);
                        }
                        if (lowerShebelleRegionLayer) {
                            adm1Layer.resetStyle(lowerShebelleRegionLayer);
                        }

                        // Show warning notification
                        const warningPopup = L.popup({
                            closeButton: false,
                            autoClose: true,
                            autoPan: false,
                            className: 'drop-invalid-popup'
                        })
                        .setLatLng(latlng)
                        .setContent('❌ Roads can only be dropped on Bakool or Lower Shebelle')
                        .openOn(map);

                        setTimeout(() => {
                            map.closePopup(warningPopup);
                        }, 2500);
                    }

                    // Remove cursor classes
                    mapContainer.classList.remove('drop-target');
                    mapContainer.classList.remove('drop-invalid');
                }
            });

            // Enhanced Roads checkbox toggle - handle clipped layer
            document.getElementById('roadsToggle').addEventListener('change', function(e) {
                if (e.target.checked) {
                    if (clippedRoadsLayer) {
                        map.addLayer(clippedRoadsLayer);
                    } else {
                        // If no clipped layer exists, use full roads layer
                        map.addLayer(roadsLayer);
                    }
                } else {
                    if (clippedRoadsLayer) {
                        map.removeLayer(clippedRoadsLayer);
                    } else {
                        map.removeLayer(roadsLayer);
                    }
                    // Remove visual feedback
                    roadsLabel.classList.remove('layer-dropped');
                    activeRoadsRegion = null;
                }
            });

            // ========================================
            // DRAG-AND-DROP: Roads OSM Layer
            // ========================================
            const roadsOSMLabel = document.getElementById('roadsOSMLabel');

            roadsOSMLabel.addEventListener('dragstart', function(e) {
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

                    // Check which region we're hovering over
                    let currentRegion = null;
                    Object.values(allRegionLayers).forEach(regionLayer => {
                        if (isPointInPolygon(latlng, regionLayer)) {
                            currentRegion = regionLayer.feature.properties.name;
                        }
                    });

                    if (currentRegion) {
                        // Valid drop zone (any region in Somalia)
                        mapContainer.classList.add('drop-target');
                        mapContainer.classList.remove('drop-invalid');

                        if (dragGhost) {
                            dragGhost.style.background = 'rgba(34, 197, 94, 0.9)'; // Green (ready)
                            dragGhost.textContent = `✓ Drop to load OSM Roads for ${currentRegion}`;
                        }

                        // Highlight the region in green
                        Object.values(allRegionLayers).forEach(regionLayer => {
                            if (regionLayer.feature.properties.name === currentRegion) {
                                regionLayer.setStyle({
                                    color: '#22c55e',
                                    weight: 4,
                                    opacity: 1,
                                    fillColor: '#22c55e',
                                    fillOpacity: 0.2,
                                    dashArray: '10, 5'
                                });
                            } else {
                                adm1Layer.resetStyle(regionLayer);
                            }
                        });

                        // Show flashing green cursor indicator
                        if (cursorIndicator) {
                            cursorIndicator.style.left = e.clientX + 'px';
                            cursorIndicator.style.top = e.clientY + 'px';
                            cursorIndicator.style.borderColor = '#22c55e';
                            cursorIndicator.classList.add('active');
                        }
                    } else {
                        // Outside Somalia
                        mapContainer.classList.add('drop-invalid');
                        mapContainer.classList.remove('drop-target');

                        if (dragGhost) {
                            dragGhost.style.background = 'rgba(239, 68, 68, 0.9)'; // Red
                            dragGhost.textContent = '✗ Drop on any region in Somalia';
                        }

                        // Reset all regions
                        Object.values(allRegionLayers).forEach(regionLayer => {
                            adm1Layer.resetStyle(regionLayer);
                        });

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

                    // Check which region was dropped on
                    let droppedRegion = null;
                    let droppedRegionLayer = null;
                    Object.values(allRegionLayers).forEach(regionLayer => {
                        if (isPointInPolygon(latlng, regionLayer)) {
                            droppedRegion = regionLayer.feature.properties.name;
                            droppedRegionLayer = regionLayer;
                        }
                    });

                    if (droppedRegion) {
                        // Reset region styles
                        Object.values(allRegionLayers).forEach(regionLayer => {
                            adm1Layer.resetStyle(regionLayer);
                        });

                        // Remove any previously loaded Roads OSM layer
                        if (activeRoadsOSMLayer) {
                            map.removeLayer(activeRoadsOSMLayer);
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
                        const roadsFilePath = `roads_by_region/${safeRegionName}_roads.js`;

                        // Dynamically load the roads file using fetch and eval
                        const roadsVarName = safeRegionName.toLowerCase().replace(/ /g, '_') + 'Roads';
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

                                    // Create Leaflet GeoJSON layer
                                    activeRoadsOSMLayer = L.geoJSON(loadedRoadsData, {
                                    style: function(feature) {
                                        // Color roads by type (fclass)
                                        const fclass = feature.properties.fclass || 'unknown';
                                        let color = '#94a3b8'; // Default gray

                                        if (fclass === 'primary') color = '#ef4444'; // Red
                                        else if (fclass === 'secondary') color = '#f97316'; // Orange
                                        else if (fclass === 'tertiary') color = '#fbbf24'; // Yellow
                                        else if (fclass === 'trunk') color = '#dc2626'; // Dark red
                                        else if (fclass === 'motorway') color = '#7c2d12'; // Brown
                                        else if (fclass === 'residential') color = '#cbd5e1'; // Light gray
                                        else if (fclass === 'track') color = '#78716c'; // Dark gray

                                        return {
                                            color: color,
                                            weight: fclass === 'primary' || fclass === 'trunk' || fclass === 'motorway' ? 3 :
                                                   fclass === 'secondary' || fclass === 'tertiary' ? 2 : 1,
                                            opacity: 0.8
                                        };
                                    },
                                    onEachFeature: function(feature, layer) {
                                        const props = feature.properties;
                                        const popupContent = `
                                            <div style="font-size: 0.9em;">
                                                <strong>🛣️ Road Classification:</strong> ${props.fclass || 'Unknown'}<br>
                                                <strong>📏 Length:</strong> ${props.Length_m ? (props.Length_m / 1000).toFixed(2) + ' km' : 'N/A'}<br>
                                                <strong>📅 Source Year:</strong> ${props.Source_Yea || 'N/A'}
                                            </div>
                                        `;
                                        layer.bindPopup(popupContent);
                                    }
                                }).addTo(map);

                                activeRoadsOSMRegion = droppedRegion;

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

            // Roads OSM checkbox toggle
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

            let html = `
                <div class="legend-header" style="color: #10b981; font-weight: bold; margin-bottom: 8px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; white-space: nowrap; overflow: hidden;">
                    <span style="overflow: hidden; text-overflow: ellipsis;">🎨 Symbology</span>
                    <span class="legend-toggle-icon" style="font-size: 1.2em; flex-shrink: 0;">▶</span>
                </div>
                <div class="legend-content">
                    <div style="margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px solid #334155;">
                        <div style="color: #0ea5e9; font-weight: bold; margin-bottom: 6px; font-size: 0.9em;">📊 MPI Gradient</div>
                        <div style="font-size: 0.75em; margin-bottom: 8px; color: #94a3b8;">
                            <div style="display: flex; align-items: center; margin: 8px 0;">
                                <div style="width: 200px; height: 20px; background: linear-gradient(to right, #047857, #22c55e, #84cc16, #eab308, #f59e0b, #f97316, #dc2626, #b91c1c, #991b1b, #7f1d1d); border-radius: 4px;"></div>
                            </div>
                            <div style="display: flex; justify-content: space-between; width: 200px;">
                                <span style="color: #047857;">●</span>
                                <span>Better (Low MPI)</span>
                                <span>Worse (High MPI)</span>
                                <span style="color: #7f1d1d;">●</span>
                            </div>
                        </div>
                    </div>`;

            const sorted = [...regions].sort((a, b) => b.mpi - a.mpi);
            sorted.forEach(r => {
                html += `<div class="legend-item">
                    <div class="legend-color" style="background: ${getMPIColor(r.mpi)};"></div>
                    <div class="legend-label">${r.name}</div>
                    <div class="legend-value">${r.mpi}</div>
                </div>`;
            });

            html += `
                <div style="margin-top: 12px; padding-top: 10px; border-top: 1px solid #334155;">
                    <div style="color: #f59e0b; font-weight: bold; margin-bottom: 6px; font-size: 0.9em;">💡 Nightlight Intensity</div>
                    <div style="font-size: 0.75em; margin-bottom: 8px; color: #94a3b8;">
                        <div style="display: flex; align-items: center; margin: 8px 0;">
                            <div class="gradient-bar"></div>
                        </div>
                        <div style="display: flex; justify-content: space-between; width: 200px;">
                            <span>Low Light</span>
                            <span>High Light</span>
                        </div>
                    </div>
                    <div style="font-size: 0.7em; line-height: 1.6; margin-top: 8px;">
                        <div><span style="color: #1e1b4b;">●</span> 0.0-0.7: Very low</div>
                        <div><span style="color: #7c3aed;">●</span> 0.7-2.0: Low</div>
                        <div><span style="color: #e879f9;">●</span> 2.0-4.0: Medium</div>
                        <div><span style="color: #fb923c;">●</span> 4.0-5.5: High</div>
                        <div><span style="color: #fde047;">●</span> 5.5+: Very high</div>
                    </div>
                </div>
                <div style="margin-top: 12px; padding-top: 10px; border-top: 1px solid #334155;">
                    <div style="color: #F48FB1; font-weight: bold; margin-bottom: 6px; font-size: 0.9em;">🛣️ Road Types (Bakool & Lower Shebelle)</div>
                    <div style="font-size: 0.7em; line-height: 1.8; margin-top: 8px;">
                        <div><span style="color: #C2185B; font-weight: bold;">━━━</span> Major road (251 roads)</div>
                        <div><span style="color: #F48FB1; font-weight: bold;">━━━</span> Secondary road (2,914 roads)</div>
                        <div><span style="color: #795548; font-weight: bold;">━━━</span> Track (5,898 roads)</div>
                    </div>
                    <div style="font-size: 0.65em; color: #64748b; margin-top: 8px; line-height: 1.4;">
                        Bakool: 1,857 roads (85% tracks)<br>
                        Lower Shebelle: 7,206 roads (4x more)
                    </div>
                </div>
                <div style="margin-top: 12px; padding-top: 10px; border-top: 1px solid #334155;">
                    <div style="color: #EC407A; font-weight: bold; margin-bottom: 6px; font-size: 0.9em;">👶 Population F 0-12 months (3 classes)</div>
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
            `;
            div.innerHTML = html;

            // Add click handler for collapsible header
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

            // Disable click propagation only on content, not header
            if (legendContent) {
                L.DomEvent.disableClickPropagation(legendContent);
                L.DomEvent.disableScrollPropagation(legendContent);
            }

            return div;
        };
        legend.addTo(map);

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

                                        // Update status message
                                        const statusMsg = document.getElementById('statusMessage');
                                        if (statusMsg) {
                                            statusMsg.textContent = status.message;
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

                                // Cancel button
                                document.getElementById('cancelUpdateBtn').addEventListener('click', function() {
                                    clearInterval(statusInterval);
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
        });
