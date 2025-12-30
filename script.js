        // Mobile detection and initial setup
        const isMobile = window.innerWidth <= 767;
        const isTablet = window.innerWidth > 767 && window.innerWidth <= 1024;

        const map = L.map('map').setView([5.5, 46.2], isMobile ? 5 : 6);
        
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap &copy; CARTO',
            subdomains: 'abcd',
            maxZoom: 20
        }).addTo(map);

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
        nightlightLayer.addTo(map);

        const detailedNLBakool = L.layerGroup();
        const detailedNLLS = L.layerGroup();
        
        
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
        
        
        
        adm2Layer.addTo(map);

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
        }).addTo(map);

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
        }).addTo(map);
        
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

        // Layer control
        const layerControl = L.control({position: 'topleft'});
        layerControl.onAdd = function() {
            const div = L.DomUtil.create('div', 'layer-control');

            // Add collapsible header for mobile
            const headerHTML = isMobile ? `
                <div onclick="this.parentElement.classList.toggle('collapsed')"
                     style="color: #0ea5e9; font-weight: bold; margin-bottom: 8px; cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
                    <span>🗺️ Layers</span>
                    <span style="font-size: 1.2em;">▼</span>
                </div>
            ` : `<div style="color: #0ea5e9; font-weight: bold; margin-bottom: 8px;">🗺️ Layers</div>`;

            div.innerHTML = headerHTML + `

                <label><input type="checkbox" id="mpiToggle" checked> MPI - Regions (18)</label>
                <label><input type="checkbox" id="nightlightToggle" checked> 💡 Nightlight Points</label>
                <div style="margin-left: 20px; border-left: 2px solid #fbbf24; padding-left: 10px;">
                    <label style="font-size: 0.9em;"><input type="checkbox" id="nightlightOverviewToggle" checked> Overview (1,571)</label>
                    <label style="font-size: 0.9em; display: block; margin-top: 5px;"><span style="color: #fde047;">✨</span> Detailed (500m)</label>
                    <div style="margin-left: 20px; border-left: 2px solid #a855f7; padding-left: 10px; margin-top: 5px;">
                        <label style="font-size: 0.85em; color: #94a3b8;"><input type="checkbox" disabled> Bakool <span style="color: #fbbf24; font-style: italic;">(Coming Soon)</span></label>
                        <label style="font-size: 0.85em; color: #94a3b8; display: block; margin-top: 3px;"><input type="checkbox" disabled> Lower Shebelle <span style="color: #fbbf24; font-style: italic;">(Coming Soon)</span></label>
                    </div>
                </div>
                <label><input type="checkbox" id="roadsToggle" checked> Roads (9,063)</label>
                
                <!-- Population hierarchical structure -->
                <div style="margin-top: 8px; border-left: 2px solid #EC407A; padding-left: 8px;">
                    <label style="font-weight: bold; color: #EC407A;">
                        <input type="checkbox" id="populationMainToggle" checked> Population
                    </label>
                    
                    <!-- Female sub-level -->
                    <div style="margin-left: 12px; margin-top: 4px; border-left: 2px solid #F48FB1; padding-left: 8px;">
                        <label style="font-weight: 600; color: #F48FB1;">
                            <input type="checkbox" id="femaleToggle" checked> Female
                        </label>
                        
                        <!-- Infants sub-sub-level -->
                        <div style="margin-left: 12px; margin-top: 4px; border-left: 2px solid #FCE4EC; padding-left: 8px;">
                            <label style="font-weight: 500; color: #C2185B;">
                                <input type="checkbox" id="infantsToggle" checked> Infants (0-12mo)
                            </label>
                            
                            <!-- 3 class categories -->
                            <div style="margin-left: 12px; margin-top: 4px; font-size: 0.9em;">
                                <label style="color: #666;">
                                    <input type="checkbox" id="pop_1_25_Toggle" checked> 
                                    <span style="color: #F48FB1;">●</span> 1-25 (number of infants)
                                </label>
                                <label style="color: #666;">
                                    <input type="checkbox" id="pop_25_50_Toggle" checked> 
                                    <span style="color: #EC407A;">●</span> 25-50 (number of infants)
                                </label>
                                <label style="color: #666;">
                                    <input type="checkbox" id="pop_50plus_Toggle" checked> 
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
                <label><input type="checkbox" id="adm2Toggle" checked> District Boundaries ADM2 (118)</label>
            `;

            // Disable map dragging and interactions when interacting with the control
            L.DomEvent.disableClickPropagation(div);
            L.DomEvent.disableScrollPropagation(div);

            return div;
        };
        layerControl.addTo(map);

        // ==========================================
                
        // ==========================================
        
        // ==========================================
        // COMBINED INFO BOX - Data Summary + Sources
        // ==========================================
        const infoBox = L.control({position: 'topright'});
        infoBox.onAdd = function() {
            const div = L.DomUtil.create('div', 'info-box square');
            div.style.width = isMobile ? '100%' : '280px';
            div.style.height = isMobile ? 'auto' : '70vh';
            div.style.maxHeight = isMobile ? '40vh' : '70vh';
            div.style.overflowY = 'auto';
            div.style.position = isMobile ? 'relative' : 'absolute';
            div.style.top = isMobile ? 'auto' : '10px';
            div.style.right = isMobile ? 'auto' : '280px'; // Position directly adjacent to the legend with no gap

            const infoHeaderHTML = isMobile ? `
                <div onclick="this.parentElement.classList.toggle('collapsed')"
                     style="cursor: pointer; display: flex; justify-content: space-between; align-items: center;"
                     class="info-title">
                    <span>📊 Data Summary</span>
                    <span style="font-size: 1.2em;">▼</span>
                </div>
            ` : '<div class="info-title">📊 Data Summary</div>';

            div.innerHTML = infoHeaderHTML + `
                <div class="info-text" style="margin-bottom: 10px; padding-bottom: 10px; border-bottom: 2px solid #334155; line-height: 1.3;">
                    <strong>MPI Range:</strong> 23-67<br>
                    <strong>Nightlight Overview:</strong> 1,571<br>
                    <strong>Nightlight Detailed (500m):</strong> <span style="color: #fbbf24; font-style: italic;">Coming Soon</span><br>
                    <strong>Roads (2 regions):</strong> 9,063<br>
                    <strong>Population F 0-12mo:</strong> 16,478<br>
                    <strong>Coverage:</strong> Bakool & Lower Shebelle
                </div>
                
                <div class="info-title" style="margin-top: 5px;">📋 Data Sources</div>
                <div class="info-text" style="line-height: 1.3;">
                    <strong>📊 MPI:</strong><br>
                    <a href="https://ophi.org.uk/sites/default/files/2024-12/Somalia_MPI_report_2024.pdf" target="_blank" style="color: #0ea5e9; text-decoration: none; font-size: 0.85em;">OPHI Somalia MPI Report 2024</a><br>
                    <span style="color: #64748b; font-size: 0.75em;">(SIHBS 2022)</span><br>
                    
                    <strong>💡 Nightlight Overview:</strong><br>
                    <a href="https://eogdata.mines.edu/products/vnl/" target="_blank" style="color: #0ea5e9; text-decoration: none; font-size: 0.85em;">VIIRS Day/Night Band</a><br>
                    <span style="color: #64748b; font-size: 0.75em;">(2023-2024, sampled)</span><br>
                    
                    <strong>✨ Nightlight Detailed (500m):</strong><br>
                    <span style="color: #fbbf24; font-size: 0.85em; font-weight: bold;">⏳ COMING SOON</span><br>
                    <span style="color: #94a3b8; font-size: 0.75em;">Real VIIRS 2023/2024 via Google Earth Engine</span><br>
                    <span style="color: #64748b; font-size: 0.7em;">
                    Source: <a href="https://developers.google.com/earth-engine/datasets/catalog/NOAA_VIIRS_DNB_ANNUAL_V22" target="_blank" style="color: #0ea5e9;">NOAA/VIIRS/DNB/ANNUAL_V22</a><br>
                    500m resolution, clipped to regions
                    </span><br>
                    
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
            `;
            return div;
        };
        infoBox.addTo(map);
        
        

        setTimeout(() => {
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
            document.getElementById('roadsToggle').addEventListener('change', function(e) {
                e.target.checked ? map.addLayer(roadsLayer) : map.removeLayer(roadsLayer);
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


        // Legend with gradient bars for both MPI and Nightlight
        const legend = L.control({position: 'topright'});
        legend.onAdd = function() {
            const div = L.DomUtil.create('div', 'legend');
            div.style.width = isMobile ? '100%' : '280px';
            div.style.height = isMobile ? 'auto' : '70vh';
            div.style.maxHeight = isMobile ? '50vh' : '70vh';
            div.style.overflowY = 'auto';
            div.style.position = isMobile ? 'relative' : 'absolute';
            div.style.top = isMobile ? 'auto' : '10px';
            div.style.right = isMobile ? 'auto' : '0px';

            const legendHeaderHTML = isMobile ? `
                <div onclick="this.parentElement.classList.toggle('collapsed')"
                     style="color: #0ea5e9; font-weight: bold; margin-bottom: 8px; cursor: pointer; display: flex; justify-content: space-between; align-items: center;"
                     class="legend-title">
                    <span>🌍 MPI by Region</span>
                    <span style="font-size: 1.2em;">▼</span>
                </div>
            ` : '<div class="legend-title">🌍 MPI by Region</div>';

            let html = legendHeaderHTML;
            
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
                </div>
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
            `;
            div.innerHTML = html;
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

        // Add measure button to TOP CENTER
        const measureBtn = L.control({position: 'topcenter'});
        measureBtn.onAdd = function() {
            const div = L.DomUtil.create('div', 'measure-button-container');
            div.style.position = 'absolute';
            div.style.left = '50%';
            div.style.transform = 'translateX(-50%)';
            div.style.top = '10px';
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
        
        // Add to map container (not Leaflet control system)
        const measureContainer = measureBtn.onAdd();
        document.getElementById('map').appendChild(measureContainer);
        
        // Disable all Leaflet events on the button container
        L.DomEvent.disableClickPropagation(measureContainer);
        L.DomEvent.disableScrollPropagation(measureContainer);

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
