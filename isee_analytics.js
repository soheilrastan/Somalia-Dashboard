// ========================================
// iSEE ANALYTICS ENGINE v2.7 (OSM FORMAT DEBUG)
// Integrated Socioeconomic and Environmental Analysis
// ========================================

function runISEEAnalytics(activeBakoolLayersParam, mapParam, layerRefs, targetRegion) {
    console.log('🔍 iSEE Analytics v2.7: Starting comprehensive analysis...');
    console.log('🔍 Function called successfully!');
    console.log('🔍 Parameters received:', { activeBakoolLayersParam, mapParam, layerRefs, targetRegion });
    console.log('🔍 LayerRefs.clippedRoadsLayer:', layerRefs.clippedRoadsLayer);
    console.log('🔍 LayerRefs.roadsData:', layerRefs.roadsData);
    console.log('🔍 LayerRefs.activeRoadsRegion:', layerRefs.activeRoadsRegion);

    // STEP 1: Scan active layers in the target region
    const activeLayers = scanActiveLayers(activeBakoolLayersParam, mapParam, layerRefs, targetRegion);
    console.log('📊 Active layers detected:', activeLayers);

    // STEP 2: Extract metadata and configure datasets
    const datasetsConfig = configureDatasets(activeLayers, targetRegion);
    console.log('⚙️ Datasets configured:', datasetsConfig);

    // STEP 3: Perform statistical analysis
    const analysisResults = performStatisticalAnalysis(datasetsConfig, targetRegion, layerRefs);
    console.log('📈 Analysis complete:', analysisResults);

    // STEP 4: Generate and display insights window
    displayInsightsWindow(analysisResults, datasetsConfig, targetRegion);
}

// STEP 1: Scan active layers
function scanActiveLayers(activeBakoolLayersParam, mapParam, layerRefs, targetRegion) {
    const layers = [];

    // Check Bakool 2022 Nightlight (only if target region is Bakool)
    if (targetRegion === 'Bakool' && activeBakoolLayersParam['bakool2022']) {
        layers.push({
            id: 'bakool2022',
            name: 'Bakool 2022 Nightlight',
            type: 'nightlight',
            layer: layerRefs.detailedNLBakool2022,
            data: layerRefs.bakoolNightlightPolygons2022,
            region: 'Bakool'
        });
    }

    // Check Bakool 2023 Nightlight (only if target region is Bakool)
    if (targetRegion === 'Bakool' && activeBakoolLayersParam['bakool2023']) {
        layers.push({
            id: 'bakool2023',
            name: 'Bakool 2023 Nightlight',
            type: 'nightlight',
            layer: layerRefs.detailedNLBakool2023,
            data: layerRefs.bakoolNightlightPolygons2023,
            region: 'Bakool'
        });
    }

    // Check Population layer
    if (layerRefs.populationLayer && mapParam.hasLayer(layerRefs.populationLayer)) {
        layers.push({
            id: 'population',
            name: 'Population Distribution',
            type: 'population',
            layer: layerRefs.populationLayer,
            data: layerRefs.populationData,
            region: targetRegion
        });
    }

    // Check MPI layer
    if (layerRefs.mpiLayer && mapParam.hasLayer(layerRefs.mpiLayer)) {
        layers.push({
            id: 'mpi',
            name: 'Multidimensional Poverty Index',
            type: 'socioeconomic',
            layer: layerRefs.mpiLayer,
            data: layerRefs.somaliaData,
            region: targetRegion
        });
    }

    // Check Roads layer (if active in the target region)
    console.log('🛣️ Checking Roads layer:', {
        hasClippedRoadsLayer: !!layerRefs.clippedRoadsLayer,
        isOnMap: layerRefs.clippedRoadsLayer ? mapParam.hasLayer(layerRefs.clippedRoadsLayer) : false,
        activeRoadsRegion: layerRefs.activeRoadsRegion,
        targetRegion: targetRegion,
        regionsMatch: layerRefs.activeRoadsRegion === targetRegion
    });

    if (layerRefs.clippedRoadsLayer &&
        mapParam.hasLayer(layerRefs.clippedRoadsLayer) &&
        layerRefs.activeRoadsRegion === targetRegion) {
        console.log('✅ Roads layer detected! Adding to analysis...');
        layers.push({
            id: 'roads',
            name: `Road Infrastructure (${targetRegion})`,
            type: 'infrastructure',
            layer: layerRefs.clippedRoadsLayer,
            data: layerRefs.roadsData,
            region: targetRegion
        });
    } else {
        console.log('❌ Roads layer NOT added to analysis');
    }

    return layers;
}

// STEP 2: Configure datasets - Extract metadata
function configureDatasets(layers, targetRegion) {
    return layers.map(layer => {
        const config = {
            id: layer.id,
            name: layer.name,
            type: layer.type,
            metadata: {}
        };

        // Extract metadata based on layer type
        if (layer.type === 'nightlight') {
            config.metadata = {
                resolution: '500m × 500m grid',
                dataSource: 'VIIRS DNB Nighttime Lights',
                year: layer.data.metadata?.year,
                totalPolygons: layer.data.metadata?.total_polygons || layer.data.features?.length,
                classification: layer.data.metadata?.classification,
                unit: 'nW/cm²/sr',
                values: extractNightlightStats(layer.data)
            };
        } else if (layer.type === 'population') {
            config.metadata = {
                resolution: '100m × 100m grid',
                dataSource: 'Meta/CIESIN High Resolution Population Density Maps',
                totalCells: layer.data.features?.length,
                unit: 'persons per cell',
                values: extractPopulationStats(layer.data)
            };
        } else if (layer.type === 'socioeconomic') {
            config.metadata = {
                dataSource: 'UNDP Global MPI',
                sourceUrl: 'https://hdr.undp.org/data-center/documentation-and-downloads',
                regions: 18,
                indicator: 'Multidimensional Poverty Index',
                unit: 'index (0-1)',
                values: extractMPIStats(layer.data, targetRegion)
            };
        } else if (layer.type === 'infrastructure') {
            // Detect if this is OSM format (multiple detection methods)
            console.log('🔍 Checking road data format:', {
                hasFeatures: !!layer.data.features,
                featureCount: layer.data.features?.length,
                firstFeature: layer.data.features?.[0],
                firstProperties: layer.data.features?.[0]?.properties,
                metadata: layer.data.metadata
            });

            // Check multiple indicators of OSM format
            const hasFclassProperty = layer.data.features?.[0]?.properties?.fclass != null;
            const hasLengthMProperty = layer.data.features?.[0]?.properties?.Length_m != null;
            const hasOSMMetadata = layer.data.metadata?.data_source?.includes('OpenStreetMap');

            const isOSMFormat = (hasFclassProperty && hasLengthMProperty) || hasOSMMetadata;

            console.log('🔍 OSM detection:', {
                hasFclassProperty,
                hasLengthMProperty,
                hasOSMMetadata,
                isOSMFormat
            });

            if (isOSMFormat) {
                // Use OSM roads extraction
                const osmStats = extractOSMRoadsStats(layer.data, layer.region);
                config.metadata = {
                    dataSource: 'OpenStreetMap Roads (OSM) - Somalia 2023',
                    sourceUrl: 'https://www.openstreetmap.org/',
                    region: layer.region,
                    totalRoads: osmStats.count,
                    unit: 'road segments',
                    values: osmStats,
                    format: 'OSM',
                    sourceYear: layer.data.metadata?.data_source || 'OpenStreetMap Somalia Roads 2023'
                };
            } else {
                // Use legacy roads extraction
                config.metadata = {
                    dataSource: 'Humanitarian Data Exchange - Somalia Roads (2021)',
                    sourceUrl: 'https://data.humdata.org/dataset/somalia-roads',
                    region: layer.region,
                    totalRoads: extractRoadsStats(layer.data, layer.region).count,
                    unit: 'road segments',
                    values: extractRoadsStats(layer.data, layer.region),
                    format: 'Legacy'
                };
            }
        }

        return config;
    });
}

// Extract nightlight statistics
function extractNightlightStats(data) {
    const values = data.features.map(f => f.properties.value).filter(v => v != null);
    const stats = calculateStats(values);
    if (stats) {
        stats.rawValues = values; // Store raw values for histogram
    }
    return stats;
}

// Extract population statistics
function extractPopulationStats(data) {
    const values = data.features.map(f => f.properties.population || 0).filter(v => v > 0);
    const stats = calculateStats(values);
    if (stats) {
        stats.rawValues = values; // Store raw values for histogram
    }
    return stats;
}

// Extract MPI statistics for a specific region
function extractMPIStats(data, targetRegion) {
    if (!data || !data.features || !targetRegion) return null;

    const regionFeature = data.features.find(f =>
        f.properties && (f.properties.name === targetRegion || f.properties.ADM1_EN === targetRegion)
    );

    if (regionFeature && regionFeature.properties) {
        return {
            mpi: regionFeature.properties.MPI_value || regionFeature.properties.mpi,
            intensity: regionFeature.properties.intensity,
            headcount: regionFeature.properties.headcount,
            regionName: targetRegion
        };
    }
    return null;
}

// Haversine formula to calculate distance between two coordinates in km
function calculateDistanceV2(coord1, coord2) {
    // GeoJSON format: [longitude, latitude]
    if (!coord1 || !coord2 || coord1.length < 2 || coord2.length < 2) {
        console.error('🛣️ Invalid coordinates:', coord1, coord2);
        return 0;
    }

    const lon1 = coord1[0];
    const lat1 = coord1[1];
    const lon2 = coord2[0];
    const lat2 = coord2[1];

    console.log('🛣️ DEBUG coords:', { coord1, coord2, lon1, lat1, lon2, lat2 });

    if (isNaN(lon1) || isNaN(lat1) || isNaN(lon2) || isNaN(lat2)) {
        console.error('🛣️ NaN in coordinates:', { lon1, lat1, lon2, lat2 });
        return 0;
    }

    const R = 6371; // Earth's radius in km
    const lat1Rad = lat1 * Math.PI / 180;
    const lat2Rad = lat2 * Math.PI / 180;
    const deltaLat = (lat2 - lat1) * Math.PI / 180;
    const deltaLon = (lon2 - lon1) * Math.PI / 180;

    console.log('🛣️ DEBUG trig values:', { lat1Rad, lat2Rad, deltaLat, deltaLon });

    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
              Math.cos(lat1Rad) * Math.cos(lat2Rad) *
              Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    console.log('🛣️ DEBUG haversine:', { a, c, sqrtA: Math.sqrt(a), sqrt1minusA: Math.sqrt(1 - a) });

    const distance = R * c;

    console.log('🛣️ DEBUG final distance:', distance);

    if (isNaN(distance)) {
        console.error('🛣️ NaN distance result:', { coord1, coord2, a, c });
        return 0;
    }

    return distance; // Distance in km
}

// Calculate length of a LineString in km
function calculateLineStringLength(coordinates) {
    console.log('🛣️ calculateLineStringLength called with', coordinates.length, 'coordinates');
    console.log('🛣️ First coordinate:', coordinates[0]);
    console.log('🛣️ Second coordinate:', coordinates[1]);

    let totalLength = 0;
    for (let i = 0; i < coordinates.length - 1; i++) {
        const dist = calculateDistanceV2(coordinates[i], coordinates[i + 1]);
        console.log(`🛣️ Distance ${i}: ${dist} km`);
        totalLength += dist;
    }
    console.log('🛣️ Total length for LineString:', totalLength);
    return totalLength;
}

// Extract roads infrastructure statistics
function extractRoadsStats(data, region) {
    console.log('🛣️ extractRoadsStats called for region:', region);
    console.log('🛣️ Roads data:', data);

    // Filter roads by region
    const regionRoads = data.features.filter(f =>
        f.properties.shapeName === region
    );

    console.log(`🛣️ Found ${regionRoads.length} roads in ${region}`);

    // Count roads and calculate length by type
    const roadTypes = {};
    const roadLengths = {}; // Length in km by type
    let totalLength = 0;

    regionRoads.forEach((road, index) => {
        const type = road.properties.TYPE || 'Unknown';
        roadTypes[type] = (roadTypes[type] || 0) + 1;

        // Calculate road length from geometry
        if (road.geometry && road.geometry.coordinates) {
            let roadLength = 0;
            if (road.geometry.type === 'LineString') {
                roadLength = calculateLineStringLength(road.geometry.coordinates);
                if (index < 3) { // Log first 3 roads for debugging
                    console.log(`🛣️ Road ${index}: ${type}, ${road.geometry.coordinates.length} coords, length: ${roadLength.toFixed(2)} km`);
                }
            } else if (road.geometry.type === 'MultiLineString') {
                // Handle MultiLineString geometries
                road.geometry.coordinates.forEach(lineString => {
                    roadLength += calculateLineStringLength(lineString);
                });
            }

            roadLengths[type] = (roadLengths[type] || 0) + roadLength;
            totalLength += roadLength;
        }
    });

    console.log('🛣️ Total length calculated:', totalLength.toFixed(2), 'km');
    console.log('🛣️ Length by type:', roadLengths);

    return {
        count: regionRoads.length,
        byType: roadTypes,
        lengthByType: roadLengths, // Length in km for each road type
        totalLength: totalLength, // Total length in km
        region: region
    };
}

// Calculate statistical metrics
function calculateStats(values) {
    if (!values || values.length === 0) return null;

    values.sort((a, b) => a - b);
    const n = values.length;
    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / n;

    const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);

    return {
        count: n,
        min: values[0],
        max: values[n - 1],
        mean: mean,
        median: values[Math.floor(n / 2)],
        stdDev: stdDev,
        q1: values[Math.floor(n * 0.25)],
        q3: values[Math.floor(n * 0.75)]
    };
}

// ========================================
// OSM ROADS ANALYSIS (OpenStreetMap Format)
// ========================================
function extractOSMRoadsStats(data, region) {
    console.log('🛣️ extractOSMRoadsStats called for region:', region);
    console.log('🛣️ OSM Roads data features count:', data.features?.length);

    // All features are for this region (pre-filtered by drag-and-drop)
    const regionRoads = data.features || [];

    // Count roads and calculate statistics by road class (fclass)
    const roadsByClass = {};
    const lengthByClass = {}; // Length in km by road class
    const roadsBySourceYear = {};
    let totalLength = 0;
    let totalRoads = 0;
    const allLengths = [];

    regionRoads.forEach((road, index) => {
        const fclass = road.properties.fclass || 'unknown';
        const lengthMeters = parseFloat(road.properties.Length_m) || 0;
        const lengthKm = lengthMeters / 1000;
        const sourceYear = road.properties.Source_Yea || 'Unknown';

        // Count by road class
        roadsByClass[fclass] = (roadsByClass[fclass] || 0) + 1;
        lengthByClass[fclass] = (lengthByClass[fclass] || 0) + lengthKm;

        // Count by source year
        roadsBySourceYear[sourceYear] = (roadsBySourceYear[sourceYear] || 0) + 1;

        totalLength += lengthKm;
        totalRoads += 1;
        allLengths.push(lengthKm);

        if (index < 3) {
            console.log(`🛣️ Road ${index}: ${fclass}, ${lengthKm.toFixed(2)} km, year: ${sourceYear}`);
        }
    });

    // Calculate road statistics
    const lengthStats = calculateStats(allLengths);

    // Calculate road density categories
    const roadClassHierarchy = {
        'motorway': 1,
        'trunk': 2,
        'primary': 3,
        'secondary': 4,
        'tertiary': 5,
        'residential': 6,
        'unclassified': 7,
        'track': 8,
        'track_grade1': 8,
        'track_grade2': 8,
        'track_grade3': 8,
        'track_grade4': 8,
        'track_grade5': 8,
        'service': 9,
        'unknown': 10
    };

    // Calculate infrastructure quality score (0-100)
    let qualityScore = 0;
    let totalWeight = 0;

    Object.keys(lengthByClass).forEach(fclass => {
        const weight = 11 - (roadClassHierarchy[fclass] || 10);
        const length = lengthByClass[fclass];
        qualityScore += weight * length;
        totalWeight += length;
    });

    qualityScore = totalWeight > 0 ? (qualityScore / totalWeight / 10 * 100) : 0;

    console.log('🛣️ Total roads:', totalRoads);
    console.log('🛣️ Total length:', totalLength.toFixed(2), 'km');
    console.log('🛣️ Quality score:', qualityScore.toFixed(1));

    return {
        count: totalRoads,
        byClass: roadsByClass,
        lengthByClass: lengthByClass,
        totalLength: totalLength,
        region: region,
        lengthStats: lengthStats,
        bySourceYear: roadsBySourceYear,
        qualityScore: qualityScore.toFixed(1),
        metadata: data.metadata || {}
    };
}

// STEP 3: Perform statistical analysis
function performStatisticalAnalysis(datasets, targetRegion, layerRefs) {
    const results = {
        summary: generateExecutiveSummary(datasets, targetRegion),
        layerAnalysis: [],
        crossLayerInsights: [],
        temporalAnalysis: null,
        recommendations: [],
        regionInfo: null
    };

    // ALWAYS include regional analysis (MPI + region size)
    if (layerRefs && layerRefs.regionLayer) {
        results.regionInfo = performBasicRegionalAnalysis(targetRegion, layerRefs);
    }

    // Analyze each layer
    datasets.forEach(dataset => {
        const analysis = analyzeLayer(dataset);
        results.layerAnalysis.push(analysis);
    });

    // Cross-layer analysis
    if (datasets.length > 1) {
        results.crossLayerInsights = performCrossLayerAnalysis(datasets);
    }

    // Temporal analysis (if multiple years available)
    const nightlightLayers = datasets.filter(d => d.type === 'nightlight');
    if (nightlightLayers.length > 1) {
        results.temporalAnalysis = performTemporalAnalysis(nightlightLayers);
    }

    // Generate recommendations
    results.recommendations = generateRecommendations(datasets, results, targetRegion);

    return results;
}

// Perform basic regional analysis (when no layers are active)
function performBasicRegionalAnalysis(regionName, layerRefs) {
    const regionInfo = {
        name: regionName,
        area: null,
        percentOfSomalia: null,
        mpiValue: null,
        mpiRank: null,
        analysis: []
    };

    // Calculate region area
    if (layerRefs.regionLayer) {
        const bounds = layerRefs.regionLayer.getBounds();
        const latDiff = bounds.getNorth() - bounds.getSouth();
        const lngDiff = bounds.getEast() - bounds.getWest();
        // Rough area estimate in km² (at Somalia's latitude ~5°N)
        regionInfo.area = Math.round(latDiff * 111 * lngDiff * 111 * Math.cos(5 * Math.PI / 180));
    }

    // Calculate percentage of Somalia (Somalia total area: ~637,657 km²)
    if (regionInfo.area) {
        regionInfo.percentOfSomalia = (regionInfo.area / 637657 * 100).toFixed(2);
    }

    // Extract MPI data if MPI layer is visible
    if (layerRefs.allRegionLayers && layerRefs.somaliaData) {
        const somaliaData = layerRefs.somaliaData;
        if (somaliaData && somaliaData.features) {
            const regionFeature = somaliaData.features.find(f =>
                f.properties && f.properties.name === regionName
            );

            if (regionFeature && regionFeature.properties) {
                regionInfo.mpiValue = regionFeature.properties.MPI_value;

                // Calculate MPI rank
                const allMPIValues = somaliaData.features
                    .map(f => ({ name: f.properties.name, mpi: f.properties.MPI_value }))
                    .filter(d => d.mpi != null)
                    .sort((a, b) => a.mpi - b.mpi);

                const rank = allMPIValues.findIndex(d => d.name === regionName) + 1;
                regionInfo.mpiRank = rank;
                regionInfo.totalRegions = allMPIValues.length;
            }
        }
    }

    // Generate analysis insights
    regionInfo.analysis.push(`📍 <strong>${regionName} Region</strong> covers approximately <strong>${regionInfo.area?.toLocaleString() || 'N/A'} km²</strong>, which represents <strong>${regionInfo.percentOfSomalia}%</strong> of Somalia's total area.`);

    if (regionInfo.mpiValue != null) {
        const mpiCategory = regionInfo.mpiValue < 0.3 ? 'low poverty' :
                           regionInfo.mpiValue < 0.5 ? 'moderate poverty' : 'high poverty';
        regionInfo.analysis.push(`📊 The region has an <strong>MPI value of ${regionInfo.mpiValue.toFixed(3)}</strong>, indicating ${mpiCategory} levels. It ranks <strong>#${regionInfo.mpiRank} out of ${regionInfo.totalRegions}</strong> regions in Somalia (lower rank = less poverty).`);
    }

    return regionInfo;
}

// Generate executive summary
function generateExecutiveSummary(datasets, targetRegion) {
    const summary = {
        region: `${targetRegion || 'Unknown'}, Somalia`,
        analysisDate: new Date().toISOString().split('T')[0],
        datasetsAnalyzed: datasets.length,
        datasetTypes: [...new Set(datasets.map(d => d.type))],
        keyFindings: []
    };

    // Add key findings based on available data
    datasets.forEach(ds => {
        if (ds.type === 'nightlight' && ds.metadata.values) {
            summary.keyFindings.push(
                `${ds.name}: Mean nightlight intensity ${ds.metadata.values.mean.toFixed(3)} nW/cm²/sr`
            );
        }
        if (ds.type === 'population' && ds.metadata.values) {
            summary.keyFindings.push(
                `Population: ${ds.metadata.totalCells} populated cells detected`
            );
        }
        if (ds.type === 'socioeconomic' && ds.metadata.values) {
            summary.keyFindings.push(
                `MPI: Multidimensional poverty index ${ds.metadata.values.mpi.toFixed(3)}`
            );
        }
    });

    return summary;
}

// Analyze individual layer
function analyzeLayer(dataset) {
    const analysis = {
        layerName: dataset.name,
        type: dataset.type,
        insights: [],
        statistics: dataset.metadata.values
    };

    // Type-specific insights
    if (dataset.type === 'nightlight' && dataset.metadata.values) {
        const stats = dataset.metadata.values;
        analysis.insights.push(`Extremely rural region with low nightlight emissions`);
        analysis.insights.push(`High variability (σ=${stats.stdDev.toFixed(3)}) indicates scattered settlements`);

        if (stats.max > 0.7) {
            analysis.insights.push(`Brightest areas (>${stats.max.toFixed(2)}) likely indicate small urban centers`);
        } else {
            analysis.insights.push(`Maximum intensity ${stats.max.toFixed(3)} suggests absence of urban centers`);
        }
    }

    if (dataset.type === 'population') {
        analysis.insights.push(`Population distributed across ${dataset.metadata.totalCells} grid cells`);
        analysis.insights.push(`High-resolution (100m) data enables precise settlement mapping`);
    }

    if (dataset.type === 'socioeconomic' && dataset.metadata.values) {
        const mpi = dataset.metadata.values.mpi;
        if (mpi > 0.4) {
            analysis.insights.push(`High poverty level (MPI=${mpi.toFixed(3)}) - Critical intervention needed`);
        } else if (mpi > 0.2) {
            analysis.insights.push(`Moderate poverty level (MPI=${mpi.toFixed(3)})`);
        }
    }

    if (dataset.type === 'infrastructure' && dataset.metadata.values) {
        const roads = dataset.metadata.values;
        const totalLength = roads.totalLength ? roads.totalLength.toFixed(2) : 'N/A';
        const isOSM = dataset.metadata.format === 'OSM';

        // ========================================
        // OSM ROADS AI-POWERED INSIGHTS
        // ========================================
        if (isOSM) {
            // Basic statistics
            analysis.insights.push(`🛣️ <strong>${roads.count.toLocaleString()} OpenStreetMap road segments</strong> analyzed in <strong>${roads.region}</strong> region with total network length of <strong>${totalLength} km</strong>`);

            // Road classification analysis
            const roadsByClass = Object.entries(roads.byClass || {}).sort((a, b) => b[1] - a[1]);
            if (roadsByClass.length > 0) {
                const topClass = roadsByClass[0];
                const topClassLength = roads.lengthByClass[topClass[0]].toFixed(2);
                const topClassPercent = (topClass[1] / roads.count * 100).toFixed(1);
                analysis.insights.push(`📊 Predominant road classification: <strong>${topClass[0]}</strong> (${topClass[1].toLocaleString()} segments, ${topClassPercent}%, ${topClassLength} km)`);
            }

            // Infrastructure quality score
            analysis.insights.push(`⭐ Infrastructure Quality Score: <strong>${roads.qualityScore}/100</strong> - ${
                parseFloat(roads.qualityScore) >= 70 ? 'Excellent road network with diverse classifications' :
                parseFloat(roads.qualityScore) >= 50 ? 'Moderate infrastructure quality' :
                parseFloat(roads.qualityScore) >= 30 ? 'Basic road network, mostly rural tracks' :
                'Limited infrastructure, primarily unpaved tracks'
            }`);

            // Road type hierarchy analysis
            const hasHighwayRoads = roads.byClass['motorway'] || roads.byClass['trunk'] || roads.byClass['primary'];
            if (hasHighwayRoads) {
                const highwayLength = (roads.lengthByClass['motorway'] || 0) +
                                     (roads.lengthByClass['trunk'] || 0) +
                                     (roads.lengthByClass['primary'] || 0);
                analysis.insights.push(`🛤️ <strong>Major highway infrastructure present</strong>: ${highwayLength.toFixed(2)} km of motorway/trunk/primary roads indicates good regional connectivity`);
            }

            const hasSecondaryTertiary = roads.byClass['secondary'] || roads.byClass['tertiary'];
            if (hasSecondaryTertiary) {
                const secondaryLength = (roads.lengthByClass['secondary'] || 0) + (roads.lengthByClass['tertiary'] || 0);
                analysis.insights.push(`🛣️ Secondary/Tertiary roads: ${secondaryLength.toFixed(2)} km providing district-level connectivity`);
            }

            // Track analysis (rural roads)
            const trackTypes = Object.keys(roads.byClass).filter(k => k.includes('track'));
            if (trackTypes.length > 0) {
                const trackLength = trackTypes.reduce((sum, type) => sum + (roads.lengthByClass[type] || 0), 0);
                const trackPercent = (trackLength / roads.totalLength * 100).toFixed(1);
                analysis.insights.push(`🚜 Rural tracks comprise ${trackPercent}% of road network (${trackLength.toFixed(2)} km) - indicates predominately rural/agricultural access roads`);
            }

            // Road density calculation (assuming average Somalia region size)
            const avgRegionSize = 35000; // km² approximate average
            const roadDensity = (roads.totalLength / avgRegionSize).toFixed(2);
            analysis.insights.push(`📏 <strong>Road density</strong>: ${roadDensity} km/km² ${
                roadDensity > 0.5 ? '(High - well-connected region)' :
                roadDensity > 0.2 ? '(Moderate - typical rural connectivity)' :
                roadDensity > 0.1 ? '(Low - sparse road network)' :
                '(Very low - limited access infrastructure)'
            }`);

            // Average road segment length analysis
            if (roads.lengthStats) {
                const avgLength = (roads.lengthStats.mean * 1000).toFixed(0); // Convert to meters
                const medianLength = (roads.lengthStats.median * 1000).toFixed(0);
                analysis.insights.push(`📐 Average road segment: ${avgLength}m (median: ${medianLength}m) - ${
                    roads.lengthStats.mean > 1 ? 'longer segments indicate inter-settlement highways' :
                    roads.lengthStats.mean > 0.5 ? 'moderate segments typical of mixed urban-rural roads' :
                    'short segments indicate dense local/residential networks'
                }`);
            }

            // AI-Powered Development Insights
            analysis.insights.push(`🤖 <strong>AI Development Insight</strong>: Based on ${roads.count.toLocaleString()} road segments with quality score ${roads.qualityScore}/100, ${roads.region} shows ${
                parseFloat(roads.qualityScore) >= 60 ? 'strong transportation infrastructure supporting economic activity and market access' :
                parseFloat(roads.qualityScore) >= 40 ? 'moderate infrastructure with potential for improvement in higher-grade roads' :
                'basic rural infrastructure requiring significant investment for economic development'
            }`);

            // Connectivity recommendation
            analysis.insights.push(`💡 <strong>Recommendation</strong>: ${
                parseFloat(roads.qualityScore) >= 60 ? 'Maintain existing infrastructure and focus on upgrading secondary roads to tertiary standards' :
                parseFloat(roads.qualityScore) >= 40 ? 'Prioritize upgrading major tracks to secondary/tertiary roads and improve connectivity between settlements' :
                'Critical need for infrastructure investment - focus on establishing paved primary/secondary road corridors'
            }`);

        } else {
            // Legacy roads format analysis
            analysis.insights.push(`${roads.count} road segments identified in ${roads.region} with total length of ${totalLength} km`);

            const roadTypes = Object.entries(roads.byType || {}).sort((a, b) => b[1] - a[1]);
            if (roadTypes.length > 0) {
                const topType = roadTypes[0];
                const topTypeLength = roads.lengthByType && roads.lengthByType[topType[0]]
                    ? roads.lengthByType[topType[0]].toFixed(2)
                    : 'N/A';
                analysis.insights.push(`Predominant road type: ${topType[0]} (${topType[1]} segments, ${(topType[1]/roads.count*100).toFixed(1)}%, ${topTypeLength} km)`);
            }

            if (roads.byType && roads.byType['Major road']) {
                const majorLength = roads.lengthByType && roads.lengthByType['Major road']
                    ? roads.lengthByType['Major road'].toFixed(2)
                    : 'N/A';
                analysis.insights.push(`Presence of major roads (${majorLength} km) indicates some connectivity infrastructure`);
            } else {
                analysis.insights.push(`Limited to secondary roads and tracks - basic infrastructure only`);
            }

            let densityMetric = 'Very Low';
            if (roads.totalLength) {
                if (roads.totalLength >= 1000) densityMetric = 'High';
                else if (roads.totalLength >= 500) densityMetric = 'Moderate';
                else if (roads.totalLength >= 200) densityMetric = 'Low';
            }
            analysis.insights.push(`Road network density: ${densityMetric} (${totalLength} km total length)`);
        }
    }

    return analysis;
}

// Cross-layer analysis
function performCrossLayerAnalysis(datasets) {
    const insights = [];

    const hasNightlight = datasets.some(d => d.type === 'nightlight');
    const hasPopulation = datasets.some(d => d.type === 'population');
    const hasMPI = datasets.some(d => d.type === 'socioeconomic');
    const hasInfrastructure = datasets.some(d => d.type === 'infrastructure');

    if (hasNightlight && hasMPI) {
        insights.push({
            title: 'Poverty-Electrification Nexus',
            finding: 'Low nightlight emissions correlate with high MPI, indicating limited infrastructure access',
            significance: 'High'
        });
    }

    if (hasNightlight && hasPopulation) {
        insights.push({
            title: 'Settlement-Electrification Pattern',
            finding: 'Nightlight distribution can serve as proxy for settlement infrastructure quality',
            significance: 'Medium'
        });
    }

    if (hasPopulation && hasMPI) {
        insights.push({
            title: 'Population-Poverty Distribution',
            finding: 'Population density mapping enables targeting of poverty interventions',
            significance: 'High'
        });
    }

    // NEW: Roads + Nightlight cross-layer analysis
    if (hasInfrastructure && hasNightlight) {
        const roadsData = datasets.find(d => d.type === 'infrastructure');
        const nightlightData = datasets.find(d => d.type === 'nightlight');
        const roadCount = roadsData?.metadata?.totalRoads || 0;
        const avgNightlight = nightlightData?.metadata?.values?.mean || 0;

        insights.push({
            title: 'Infrastructure-Electrification Correlation',
            finding: `${roadCount} road segments with average nightlight intensity of ${avgNightlight.toFixed(3)} nW/cm²/sr indicates road infrastructure exists in areas with minimal electrification`,
            significance: 'High'
        });

        insights.push({
            title: 'Rural Access vs Development',
            finding: 'Road network present but low nightlight suggests transport access without corresponding economic development or electricity infrastructure',
            significance: 'High'
        });
    }

    // NEW: Roads + MPI cross-layer analysis
    if (hasInfrastructure && hasMPI) {
        insights.push({
            title: 'Infrastructure-Poverty Relationship',
            finding: 'Road infrastructure in high-poverty region suggests connectivity alone insufficient for poverty reduction - complementary interventions needed',
            significance: 'High'
        });
    }

    // NEW: All three layers (Roads + Nightlight + MPI)
    if (hasInfrastructure && hasNightlight && hasMPI) {
        insights.push({
            title: 'Integrated Development Assessment',
            finding: 'Presence of roads with minimal electrification and high poverty indicates need for integrated development approach combining infrastructure, energy access, and economic opportunity',
            significance: 'Critical'
        });
    }

    return insights;
}

// Temporal analysis
function performTemporalAnalysis(nightlightLayers) {
    if (nightlightLayers.length < 2) return null;

    // Sort by year
    nightlightLayers.sort((a, b) => a.metadata.year - b.metadata.year);

    const older = nightlightLayers[0];
    const newer = nightlightLayers[nightlightLayers.length - 1];

    const meanChange = newer.metadata.values.mean - older.metadata.values.mean;
    const percentChange = (meanChange / older.metadata.values.mean) * 100;

    // Prepare data for time series chart
    const yearlyData = nightlightLayers.map(layer => ({
        year: layer.metadata.year,
        mean: layer.metadata.values.mean,
        min: layer.metadata.values.min,
        max: layer.metadata.values.max,
        median: layer.metadata.values.median
    }));

    return {
        period: `${older.metadata.year} - ${newer.metadata.year}`,
        meanChange: meanChange,
        percentChange: percentChange,
        trend: meanChange > 0 ? 'increasing' : meanChange < 0 ? 'decreasing' : 'stable',
        interpretation: interpretTrend(percentChange),
        yearlyData: yearlyData
    };
}

function interpretTrend(percentChange) {
    if (Math.abs(percentChange) < 1) {
        return 'Minimal change - infrastructure development remains limited';
    } else if (percentChange > 5) {
        return 'Significant increase - indicates infrastructure development or settlement expansion';
    } else if (percentChange > 0) {
        return 'Modest increase - gradual infrastructure improvement';
    } else if (percentChange < -5) {
        return 'Significant decrease - may indicate conflict, displacement, or data issues';
    } else {
        return 'Slight decrease - monitoring recommended';
    }
}

// Generate recommendations
function generateRecommendations(datasets, results, targetRegion) {
    const recommendations = [];

    const hasNightlight = datasets.some(d => d.type === 'nightlight');
    const hasMPI = datasets.some(d => d.type === 'socioeconomic');

    if (hasNightlight) {
        const nlData = datasets.find(d => d.type === 'nightlight');
        if (nlData.metadata.values && nlData.metadata.values.max < 1.0) {
            recommendations.push({
                priority: 'High',
                area: 'Infrastructure',
                recommendation: 'Expand electrification infrastructure - current coverage is minimal'
            });
        }
    }

    if (hasMPI) {
        const mpiData = datasets.find(d => d.type === 'socioeconomic');
        if (mpiData.metadata.values && mpiData.metadata.values.mpi > 0.4) {
            recommendations.push({
                priority: 'Critical',
                area: 'Poverty Alleviation',
                recommendation: 'Implement multi-sectoral poverty reduction programs targeting health, education, and living standards'
            });
        }
    }

    if (results.temporalAnalysis && results.temporalAnalysis.percentChange < -2) {
        recommendations.push({
            priority: 'High',
            area: 'Monitoring',
            recommendation: 'Investigate causes of declining nightlight emissions - potential security or displacement concerns'
        });
    }

    recommendations.push({
        priority: 'Medium',
        area: 'Data Collection',
        recommendation: 'Continue temporal monitoring to track development progress and identify emerging patterns'
    });

    return recommendations;
}

// STEP 4: Display insights window
function displayInsightsWindow(results, datasets, targetRegion) {
    // Create modal window
    const modal = document.createElement('div');
    modal.id = 'iseeAnalyticsModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        backdrop-filter: blur(5px);
    `;

    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
        border-radius: 16px;
        width: 90%;
        max-width: 1200px;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        border: 2px solid #334155;
    `;

    modalContent.innerHTML = generateInsightsHTML(results, datasets, targetRegion);

    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    // Close modal on click outside or close button
    modal.addEventListener('click', function(e) {
        if (e.target === modal || e.target.classList.contains('close-modal')) {
            document.body.removeChild(modal);
        }
    });

    // Add custom scrollbar styling
    const style = document.createElement('style');
    style.textContent = `
        #iseeAnalyticsModal *::-webkit-scrollbar {
            width: 10px;
        }
        #iseeAnalyticsModal *::-webkit-scrollbar-track {
            background: rgba(51, 65, 85, 0.3);
        }
        #iseeAnalyticsModal *::-webkit-scrollbar-thumb {
            background: #0ea5e9;
            border-radius: 5px;
        }
    `;
    document.head.appendChild(style);
}

// Generate HTML for insights window
function generateInsightsHTML(results, datasets, targetRegion) {
    return `
        <div style="padding: 30px;">
            <!-- Header -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; border-bottom: 2px solid #334155; padding-bottom: 20px;">
                <div>
                    <h2 style="color: #0ea5e9; font-size: 2em; margin: 0; display: flex; align-items: center; gap: 10px;">
                        🔍 iSEE Analytics Report
                    </h2>
                    <p style="color: #94a3b8; margin: 5px 0 0 0; font-size: 0.9em;">
                        Integrated Socioeconomic and Environmental Analysis - ${targetRegion || 'Unknown Region'}
                    </p>
                </div>
                <button class="close-modal" style="
                    background: rgba(239, 68, 68, 0.2);
                    border: 2px solid #ef4444;
                    color: #ef4444;
                    padding: 10px 20px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 1.1em;
                    font-weight: bold;
                    transition: all 0.3s;
                " onmouseover="this.style.background='rgba(239, 68, 68, 0.3)'" onmouseout="this.style.background='rgba(239, 68, 68, 0.2)'">
                    ✕ Close
                </button>
            </div>

            <!-- Regional Overview (ALWAYS SHOWN) -->
            ${results.regionInfo ? `
            <div style="background: rgba(251, 191, 36, 0.1); border-left: 4px solid #fbbf24; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                <h3 style="color: #fbbf24; margin: 0 0 15px 0; font-size: 1.4em;">📍 Regional Overview: ${results.regionInfo.name}</h3>
                <div style="color: #e8e8e8; line-height: 1.8;">
                    ${results.regionInfo.analysis.map(insight => `<p style="margin: 12px 0;">${insight}</p>`).join('')}
                </div>
            </div>
            ` : ''}

            ${results.summary.datasetsAnalyzed > 0 ? `
            <!-- Executive Summary -->
            <div style="background: rgba(14, 165, 233, 0.1); border-left: 4px solid #0ea5e9; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                <h3 style="color: #0ea5e9; margin: 0 0 15px 0; font-size: 1.4em;">📋 Executive Summary</h3>
                <div style="color: #e8e8e8; line-height: 1.8;">
                    <p><strong>Region:</strong> ${results.summary.region}</p>
                    <p><strong>Analysis Date:</strong> ${results.summary.analysisDate}</p>
                    <p><strong>Datasets Analyzed:</strong> ${results.summary.datasetsAnalyzed} (${results.summary.datasetTypes.join(', ')})</p>
                    <div style="margin-top: 15px;">
                        <strong>Key Findings:</strong>
                        <ul style="margin: 10px 0; padding-left: 20px;">
                            ${results.summary.keyFindings.map(finding => `<li>${finding}</li>`).join('')}
                        </ul>
                    </div>
                </div>
            </div>

            <!-- Layer-Specific Analysis -->
            <div style="margin-bottom: 25px;">
                <h3 style="color: #10b981; margin: 0 0 20px 0; font-size: 1.4em;">📊 Layer-Specific Analysis</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 20px;">
                    ${results.layerAnalysis.map(analysis => generateLayerCard(analysis)).join('')}
                </div>
            </div>
            ` : `
            <!-- No Active Layers Message -->
            <div style="background: rgba(59, 130, 246, 0.1); border-left: 4px solid #3b82f6; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                <h3 style="color: #3b82f6; margin: 0 0 15px 0; font-size: 1.4em;">💡 Activate Data Layers</h3>
                <p style="color: #e8e8e8; line-height: 1.8;">
                    To access detailed analytics for ${targetRegion}, activate relevant data layers (Roads, Nightlight, Population) and drop iSEE Analytics again.
                </p>
            </div>
            `}

            ${results.crossLayerInsights.length > 0 ? `
            <!-- Cross-Layer Insights -->
            <div style="background: rgba(168, 85, 247, 0.1); border-left: 4px solid #a855f7; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                <h3 style="color: #a855f7; margin: 0 0 15px 0; font-size: 1.4em;">🔗 Cross-Layer Insights</h3>
                ${results.crossLayerInsights.map(insight => `
                    <div style="margin-bottom: 15px; padding: 15px; background: rgba(168, 85, 247, 0.05); border-radius: 6px;">
                        <h4 style="color: #c084fc; margin: 0 0 8px 0;">${insight.title}</h4>
                        <p style="color: #e8e8e8; margin: 0 0 5px 0;">${insight.finding}</p>
                        <span style="color: ${insight.significance === 'Critical' ? '#dc2626' : insight.significance === 'High' ? '#ef4444' : '#fbbf24'}; font-weight: bold; font-size: 0.85em;">
                            Significance: ${insight.significance}
                        </span>
                    </div>
                `).join('')}
            </div>
            ` : ''}

            <!-- Data Sources -->
            <div style="background: rgba(59, 130, 246, 0.1); border-left: 4px solid #3b82f6; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                <h3 style="color: #3b82f6; margin: 0 0 15px 0; font-size: 1.4em;">📚 Data Sources</h3>
                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse; color: #e8e8e8;">
                        <thead>
                            <tr style="background: rgba(59, 130, 246, 0.2); border-bottom: 2px solid #3b82f6;">
                                <th style="padding: 12px; text-align: left; font-weight: bold; color: #3b82f6;">Dataset</th>
                                <th style="padding: 12px; text-align: left; font-weight: bold; color: #3b82f6;">Type</th>
                                <th style="padding: 12px; text-align: left; font-weight: bold; color: #3b82f6;">Resolution</th>
                                <th style="padding: 12px; text-align: left; font-weight: bold; color: #3b82f6;">Year</th>
                                <th style="padding: 12px; text-align: left; font-weight: bold; color: #3b82f6;">Source</th>
                            </tr>
                        </thead>
                        <tbody>
                            <!-- ALWAYS show Region Boundaries -->
                            <tr style="background: rgba(59, 130, 246, 0.05); border-bottom: 1px solid rgba(59, 130, 246, 0.1);">
                                <td style="padding: 12px; color: #e8e8e8;">Somalia Region Boundaries (ADM1)</td>
                                <td style="padding: 12px; color: #94a3b8;">Administrative Boundaries</td>
                                <td style="padding: 12px; color: #94a3b8;">Vector (Polygon)</td>
                                <td style="padding: 12px; color: #94a3b8;">2024</td>
                                <td style="padding: 12px;">
                                    <a href="https://data.humdata.org/dataset/cod-ab-som"
                                       target="_blank"
                                       style="color: #3b82f6; text-decoration: none; font-weight: bold; display: inline-flex; align-items: center; gap: 5px;"
                                       onmouseover="this.style.color='#60a5fa'"
                                       onmouseout="this.style.color='#3b82f6'">
                                        HDX <span style="font-size: 0.8em;">🔗</span>
                                    </a>
                                </td>
                            </tr>
                            <!-- ALWAYS show MPI data -->
                            <tr style="background: transparent; border-bottom: 1px solid rgba(59, 130, 246, 0.1);">
                                <td style="padding: 12px; color: #e8e8e8;">Multidimensional Poverty Index</td>
                                <td style="padding: 12px; color: #94a3b8;">Poverty Index</td>
                                <td style="padding: 12px; color: #94a3b8;">Regional (ADM1)</td>
                                <td style="padding: 12px; color: #94a3b8;">2023</td>
                                <td style="padding: 12px;">
                                    <a href="https://hdr.undp.org/data-center/documentation-and-downloads"
                                       target="_blank"
                                       style="color: #3b82f6; text-decoration: none; font-weight: bold; display: inline-flex; align-items: center; gap: 5px;"
                                       onmouseover="this.style.color='#60a5fa'"
                                       onmouseout="this.style.color='#3b82f6'">
                                        UNDP <span style="font-size: 0.8em;">🔗</span>
                                    </a>
                                </td>
                            </tr>
                            ${datasets.map((dataset, index) => {
                                // Determine type, resolution, year, and source based on dataset
                                let type, resolution, year, sourceLink, sourceName;

                                if (dataset.type === 'nightlight') {
                                    type = 'VIIRS Nighttime Lights';
                                    resolution = '500m × 500m';
                                    year = dataset.id.includes('2022') ? '2022' : '2023';
                                    sourceLink = 'https://eogdata.mines.edu/products/vnl/';
                                    sourceName = 'NOAA VIIRS';
                                } else if (dataset.type === 'infrastructure') {
                                    type = 'Road Network';
                                    resolution = 'Vector (LineString)';
                                    year = '2021';
                                    sourceLink = dataset.metadata.sourceUrl || 'https://data.humdata.org/dataset/somalia-roads';
                                    sourceName = 'HDX';
                                } else if (dataset.type === 'socioeconomic') {
                                    // Skip MPI since we already added it above
                                    return '';
                                } else if (dataset.type === 'population') {
                                    type = 'Population Density';
                                    resolution = '1km × 1km';
                                    year = '2020';
                                    sourceLink = 'https://www.worldpop.org/';
                                    sourceName = 'WorldPop';
                                } else {
                                    type = 'Unknown';
                                    resolution = 'N/A';
                                    year = 'N/A';
                                    sourceLink = '#';
                                    sourceName = 'Unknown';
                                }

                                return `
                                <tr style="background: ${(index + 2) % 2 === 0 ? 'rgba(59, 130, 246, 0.05)' : 'transparent'}; border-bottom: 1px solid rgba(59, 130, 246, 0.1);">
                                    <td style="padding: 12px; color: #e8e8e8;">${dataset.name}</td>
                                    <td style="padding: 12px; color: #94a3b8;">${type}</td>
                                    <td style="padding: 12px; color: #94a3b8;">${resolution}</td>
                                    <td style="padding: 12px; color: #94a3b8;">${year}</td>
                                    <td style="padding: 12px;">
                                        <a href="${sourceLink}"
                                           target="_blank"
                                           style="color: #3b82f6; text-decoration: none; font-weight: bold; display: inline-flex; align-items: center; gap: 5px;"
                                           onmouseover="this.style.color='#60a5fa'"
                                           onmouseout="this.style.color='#3b82f6'">
                                            ${sourceName} <span style="font-size: 0.8em;">🔗</span>
                                        </a>
                                    </td>
                                </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
                <div style="margin-top: 15px; padding: 12px; background: rgba(59, 130, 246, 0.05); border-radius: 6px; font-size: 0.85em; color: #94a3b8;">
                    <strong>Note:</strong> Region boundaries and MPI data are included in all analyses.
                    Nightlight datasets derived from NOAA's VIIRS (Visible Infrared Imaging Radiometer Suite) Day/Night Band product.
                    Administrative boundaries, road infrastructure, and MPI data from Humanitarian Data Exchange (HDX) and UNDP.
                    All data processing and analysis performed by Geo-Insight Lab, ESCWA.
                </div>
            </div>

            ${results.temporalAnalysis ? `
            <!-- Temporal Analysis -->
            <div style="background: rgba(34, 197, 94, 0.1); border-left: 4px solid #22c55e; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                <h3 style="color: #22c55e; margin: 0 0 15px 0; font-size: 1.4em;">📈 Temporal Analysis</h3>
                <div style="color: #e8e8e8; line-height: 1.8;">
                    <p><strong>Period:</strong> ${results.temporalAnalysis.period}</p>
                    <p><strong>Trend:</strong> <span style="color: ${results.temporalAnalysis.trend === 'increasing' ? '#22c55e' : results.temporalAnalysis.trend === 'decreasing' ? '#ef4444' : '#fbbf24'}; font-weight: bold;">${results.temporalAnalysis.trend.toUpperCase()}</span></p>
                    <p><strong>Change:</strong> ${results.temporalAnalysis.percentChange > 0 ? '+' : ''}${results.temporalAnalysis.percentChange.toFixed(2)}% (${results.temporalAnalysis.meanChange > 0 ? '+' : ''}${results.temporalAnalysis.meanChange.toFixed(4)} nW/cm²/sr)</p>
                    <p style="margin-top: 10px; padding: 10px; background: rgba(34, 197, 94, 0.1); border-radius: 6px;">
                        <strong>Interpretation:</strong> ${results.temporalAnalysis.interpretation}
                    </p>
                </div>

                <!-- Time Series Chart -->
                <div style="margin-top: 25px; background: rgba(15, 23, 42, 0.6); padding: 20px; border-radius: 8px;">
                    <h4 style="color: #22c55e; margin: 0 0 20px 0; font-size: 1.1em; text-align: center;">Nightlight Intensity Over Time</h4>
                    ${generateTimeSeriesChart(results.temporalAnalysis.yearlyData)}
                </div>
            </div>
            ` : ''}

            <!-- Recommendations -->
            <div style="background: rgba(251, 191, 36, 0.1); border-left: 4px solid #fbbf24; padding: 20px; border-radius: 8px;">
                <h3 style="color: #fbbf24; margin: 0 0 15px 0; font-size: 1.4em;">💡 Recommendations</h3>
                <div style="display: grid; gap: 15px;">
                    ${results.recommendations.map(rec => `
                        <div style="padding: 15px; background: rgba(251, 191, 36, 0.05); border-radius: 6px; border-left: 3px solid ${
                            rec.priority === 'Critical' ? '#ef4444' :
                            rec.priority === 'High' ? '#f59e0b' : '#22c55e'
                        };">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                                <span style="color: #fbbf24; font-weight: bold;">${rec.area}</span>
                                <span style="
                                    background: ${rec.priority === 'Critical' ? '#ef4444' : rec.priority === 'High' ? '#f59e0b' : '#22c55e'};
                                    color: white;
                                    padding: 4px 12px;
                                    border-radius: 12px;
                                    font-size: 0.75em;
                                    font-weight: bold;
                                ">${rec.priority}</span>
                            </div>
                            <p style="color: #e8e8e8; margin: 0;">${rec.recommendation}</p>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- Footer -->
            <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #334155; text-align: center; color: #64748b; font-size: 0.85em;">
                <p>Generated by iSEE Analytics • Geo-Insight Lab, ESCWA • ${new Date().toLocaleString()}</p>
                <p style="margin-top: 10px;">🔍 Integrated Socioeconomic and Environmental Analysis System</p>
            </div>
        </div>
    `;
}

// Generate layer analysis card
function generateLayerCard(analysis) {
    let statsHTML = '';
    let histogramHTML = '';

    if (analysis.statistics) {
        const stats = analysis.statistics;
        if (stats.count != null && stats.mean != null) {
            // Nightlight statistics with numerical values
            statsHTML = `
                <div style="background: rgba(14, 165, 233, 0.05); padding: 12px; border-radius: 6px; margin-top: 12px;">
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; font-size: 0.85em;">
                        <div><strong>Count:</strong> ${stats.count.toLocaleString()}</div>
                        <div><strong>Mean:</strong> ${stats.mean.toFixed(4)}</div>
                        <div><strong>Min:</strong> ${stats.min.toFixed(4)}</div>
                        <div><strong>Max:</strong> ${stats.max.toFixed(4)}</div>
                        <div><strong>Median:</strong> ${stats.median.toFixed(4)}</div>
                        <div><strong>Std Dev:</strong> ${stats.stdDev.toFixed(4)}</div>
                    </div>
                </div>
            `;

            // Generate histogram if raw values are available
            if (stats.rawValues && stats.rawValues.length > 0) {
                histogramHTML = `
                    <div style="margin-top: 15px; background: rgba(15, 23, 42, 0.6); padding: 15px; border-radius: 8px;">
                        <h5 style="color: #0ea5e9; margin: 0 0 12px 0; font-size: 0.95em; text-align: center;">Distribution Analysis</h5>
                        ${generateHistogramWithBellCurve(stats, analysis.layerName)}
                    </div>
                `;
            }
        } else if (stats.count != null && stats.byType != null) {
            // Infrastructure statistics (roads)
            const roadTypes = Object.entries(stats.byType)
                .sort((a, b) => b[1] - a[1])
                .map(([type, count]) => {
                    const length = stats.lengthByType && stats.lengthByType[type]
                        ? stats.lengthByType[type].toFixed(2)
                        : 'N/A';
                    return `<div style="display: flex; justify-content: space-between; padding: 4px 0;">
                        <span>${type}:</span>
                        <span>${count} segments (${length} km)</span>
                    </div>`;
                })
                .join('');

            const totalLength = stats.totalLength
                ? stats.totalLength.toFixed(2)
                : 'N/A';

            statsHTML = `
                <div style="background: rgba(14, 165, 233, 0.05); padding: 12px; border-radius: 6px; margin-top: 12px;">
                    <div style="font-size: 0.85em;">
                        <div style="margin-bottom: 8px;"><strong>Total Road Segments:</strong> ${stats.count.toLocaleString()}</div>
                        <div style="margin-bottom: 8px;"><strong>Total Length:</strong> ${totalLength} km</div>
                        <div style="margin-bottom: 4px;"><strong>By Type:</strong></div>
                        <div style="margin-left: 12px; color: #cbd5e1;">
                            ${roadTypes}
                        </div>
                    </div>
                </div>
            `;
        } else if (stats.mpi != null) {
            statsHTML = `
                <div style="background: rgba(14, 165, 233, 0.05); padding: 12px; border-radius: 6px; margin-top: 12px;">
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; font-size: 0.85em;">
                        <div><strong>MPI:</strong> ${stats.mpi.toFixed(3)}</div>
                        <div><strong>Intensity:</strong> ${stats.intensity?.toFixed(3) || 'N/A'}</div>
                        <div><strong>Headcount:</strong> ${stats.headcount?.toFixed(3) || 'N/A'}</div>
                    </div>
                </div>
            `;
        }
    }

    return `
        <div style="background: rgba(30, 41, 59, 0.6); border: 2px solid #334155; border-radius: 12px; padding: 20px;">
            <h4 style="color: #0ea5e9; margin: 0 0 12px 0; font-size: 1.1em;">${analysis.layerName}</h4>
            <div style="color: #cbd5e1; font-size: 0.85em; margin-bottom: 8px;">
                <span style="background: rgba(14, 165, 233, 0.2); padding: 4px 10px; border-radius: 12px;">
                    ${analysis.type}
                </span>
            </div>
            <ul style="color: #e8e8e8; margin: 0; padding-left: 20px; line-height: 1.8;">
                ${analysis.insights.map(insight => `<li>${insight}</li>`).join('')}
            </ul>
            ${statsHTML}
            ${histogramHTML}
        </div>
    `;
}

// Generate time series chart using SVG
function generateTimeSeriesChart(yearlyData) {
    if (!yearlyData || yearlyData.length === 0) return '<p style="color: #94a3b8; text-align: center;">No temporal data available</p>';

    // Chart dimensions
    const width = 700;
    const height = 350;
    const padding = { top: 40, right: 60, bottom: 60, left: 80 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Find min and max values for scaling
    const allValues = yearlyData.flatMap(d => [d.mean, d.min, d.max, d.median]);
    const minValue = Math.min(...allValues);
    const maxValue = Math.max(...allValues);
    const valueRange = maxValue - minValue;

    // Add 10% padding to y-axis
    const yMin = minValue - valueRange * 0.1;
    const yMax = maxValue + valueRange * 0.1;
    const yRange = yMax - yMin;

    // Scale functions
    const scaleX = (index) => padding.left + (index / (yearlyData.length - 1)) * chartWidth;
    const scaleY = (value) => padding.top + chartHeight - ((value - yMin) / yRange) * chartHeight;

    // Generate path for mean line
    const meanPath = yearlyData.map((d, i) =>
        `${i === 0 ? 'M' : 'L'} ${scaleX(i)} ${scaleY(d.mean)}`
    ).join(' ');

    // Generate bars for each year
    const bars = yearlyData.map((d, i) => {
        const x = scaleX(i);
        const barWidth = 40;
        const meanY = scaleY(d.mean);
        const minY = scaleY(d.min);
        const maxY = scaleY(d.max);
        const medianY = scaleY(d.median);

        return `
            <!-- Min-Max range bar -->
            <line x1="${x}" y1="${minY}" x2="${x}" y2="${maxY}"
                  stroke="#64748b" stroke-width="2" opacity="0.5"/>

            <!-- Mean bar -->
            <rect x="${x - barWidth/2}" y="${meanY}" width="${barWidth}" height="${padding.top + chartHeight - meanY}"
                  fill="#22c55e" opacity="0.7" rx="4"/>

            <!-- Median marker -->
            <circle cx="${x}" cy="${medianY}" r="5" fill="#fbbf24" stroke="#0f172a" stroke-width="2"/>

            <!-- Data point for mean -->
            <circle cx="${x}" cy="${meanY}" r="6" fill="#22c55e" stroke="#0f172a" stroke-width="2"/>

            <!-- Year label -->
            <text x="${x}" y="${padding.top + chartHeight + 25}"
                  text-anchor="middle" fill="#e8e8e8" font-size="14" font-weight="bold">
                ${d.year}
            </text>

            <!-- Mean value label -->
            <text x="${x}" y="${meanY - 15}"
                  text-anchor="middle" fill="#22c55e" font-size="12" font-weight="bold">
                ${d.mean.toFixed(3)}
            </text>
        `;
    }).join('');

    // Y-axis ticks
    const yTicks = [];
    const tickCount = 6;
    for (let i = 0; i <= tickCount; i++) {
        const value = yMin + (yRange * i / tickCount);
        const y = scaleY(value);
        yTicks.push(`
            <line x1="${padding.left - 5}" y1="${y}" x2="${padding.left}" y2="${y}"
                  stroke="#64748b" stroke-width="2"/>
            <text x="${padding.left - 10}" y="${y + 5}"
                  text-anchor="end" fill="#94a3b8" font-size="11">
                ${value.toFixed(3)}
            </text>
        `);
    }

    return `
        <svg width="100%" height="${height}" viewBox="0 0 ${width} ${height}" style="max-width: ${width}px; margin: 0 auto; display: block;">
            <!-- Background grid -->
            ${Array.from({length: tickCount + 1}, (_, i) => {
                const y = padding.top + (chartHeight * i / tickCount);
                return `<line x1="${padding.left}" y1="${y}" x2="${padding.left + chartWidth}" y2="${y}"
                        stroke="#334155" stroke-width="1" opacity="0.3" stroke-dasharray="4,4"/>`;
            }).join('')}

            <!-- Axes -->
            <line x1="${padding.left}" y1="${padding.top}"
                  x2="${padding.left}" y2="${padding.top + chartHeight}"
                  stroke="#64748b" stroke-width="2"/>
            <line x1="${padding.left}" y1="${padding.top + chartHeight}"
                  x2="${padding.left + chartWidth}" y2="${padding.top + chartHeight}"
                  stroke="#64748b" stroke-width="2"/>

            <!-- Y-axis ticks and labels -->
            ${yTicks.join('')}

            <!-- Y-axis label -->
            <text x="${padding.left - 60}" y="${padding.top + chartHeight/2}"
                  text-anchor="middle" fill="#22c55e" font-size="13" font-weight="bold"
                  transform="rotate(-90, ${padding.left - 60}, ${padding.top + chartHeight/2})">
                Nightlight Intensity (nW/cm²/sr)
            </text>

            <!-- X-axis label -->
            <text x="${padding.left + chartWidth/2}" y="${height - 10}"
                  text-anchor="middle" fill="#0ea5e9" font-size="13" font-weight="bold">
                Year
            </text>

            <!-- Data visualization -->
            ${bars}

            <!-- Mean trend line -->
            <path d="${meanPath}" fill="none" stroke="#22c55e" stroke-width="3" stroke-dasharray="5,5" opacity="0.8"/>

            <!-- Legend -->
            <g transform="translate(${width - padding.right - 150}, ${padding.top})">
                <rect x="0" y="0" width="145" height="85" fill="rgba(15, 23, 42, 0.8)" stroke="#334155" stroke-width="1" rx="6"/>

                <circle cx="15" cy="20" r="5" fill="#22c55e"/>
                <text x="30" y="24" fill="#e8e8e8" font-size="11">Mean</text>

                <circle cx="15" cy="40" r="5" fill="#fbbf24"/>
                <text x="30" y="44" fill="#e8e8e8" font-size="11">Median</text>

                <line x1="10" y1="60" x2="20" y2="60" stroke="#64748b" stroke-width="2"/>
                <text x="30" y="64" fill="#e8e8e8" font-size="11">Min-Max Range</text>
            </g>
        </svg>

        <!-- Chart interpretation -->
        <div style="margin-top: 20px; padding: 15px; background: rgba(34, 197, 94, 0.05); border-radius: 6px; border-left: 3px solid #22c55e;">
            <p style="color: #94a3b8; margin: 0; font-size: 0.9em; line-height: 1.6;">
                <strong style="color: #22c55e;">Chart Guide:</strong>
                Green bars show mean nightlight intensity for each year. Yellow dots indicate median values.
                Gray vertical lines represent the full range (min to max) of nightlight values.
                The dashed green line shows the overall trend across years.
            </p>
        </div>
    `;
}

// Generate histogram with bell curve (normal distribution overlay)
function generateHistogramWithBellCurve(stats, layerName) {
    const values = stats.rawValues;
    const mean = stats.mean;
    const median = stats.median;
    const stdDev = stats.stdDev;
    const min = stats.min;
    const max = stats.max;

    // Chart dimensions
    const width = 600;
    const height = 300;
    const padding = { top: 30, right: 40, bottom: 50, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Create histogram bins (30 bins)
    const binCount = 30;
    const binWidth = (max - min) / binCount;
    const bins = new Array(binCount).fill(0);

    // Fill bins with frequency counts
    values.forEach(value => {
        const binIndex = Math.min(Math.floor((value - min) / binWidth), binCount - 1);
        bins[binIndex]++;
    });

    // Find max frequency for scaling
    const maxFreq = Math.max(...bins);

    // Scale functions
    const scaleX = (value) => padding.left + ((value - min) / (max - min)) * chartWidth;
    const scaleY = (freq) => padding.top + chartHeight - (freq / maxFreq) * chartHeight;

    // Generate histogram bars
    const barElements = bins.map((freq, i) => {
        const x1 = scaleX(min + i * binWidth);
        const x2 = scaleX(min + (i + 1) * binWidth);
        const y = scaleY(freq);
        const barHeight = padding.top + chartHeight - y;

        return `
            <rect x="${x1}" y="${y}" width="${x2 - x1 - 1}" height="${barHeight}"
                  fill="#0ea5e9" opacity="0.7" stroke="#0284c7" stroke-width="1"/>
        `;
    }).join('');

    // Generate bell curve (normal distribution)
    const bellCurvePoints = [];
    const resolution = 100; // Number of points for smooth curve

    for (let i = 0; i <= resolution; i++) {
        const x = min + (max - min) * (i / resolution);
        // Normal distribution formula: f(x) = (1 / (σ√(2π))) * e^(-0.5 * ((x - μ) / σ)²)
        const exponent = -0.5 * Math.pow((x - mean) / stdDev, 2);
        const normalDensity = (1 / (stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(exponent);

        // Scale to match histogram frequency (approximate)
        const scaledDensity = normalDensity * values.length * binWidth;

        bellCurvePoints.push({
            x: scaleX(x),
            y: scaleY(scaledDensity)
        });
    }

    const bellCurvePath = bellCurvePoints.map((point, i) =>
        `${i === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
    ).join(' ');

    // X-axis ticks
    const xTicks = [];
    const xTickCount = 6;
    for (let i = 0; i <= xTickCount; i++) {
        const value = min + (max - min) * (i / xTickCount);
        const x = scaleX(value);
        xTicks.push(`
            <line x1="${x}" y1="${padding.top + chartHeight}" x2="${x}" y2="${padding.top + chartHeight + 5}"
                  stroke="#64748b" stroke-width="2"/>
            <text x="${x}" y="${padding.top + chartHeight + 20}"
                  text-anchor="middle" fill="#94a3b8" font-size="10">
                ${value.toFixed(3)}
            </text>
        `);
    }

    // Y-axis ticks
    const yTicks = [];
    const yTickCount = 5;
    for (let i = 0; i <= yTickCount; i++) {
        const freq = maxFreq * (i / yTickCount);
        const y = scaleY(freq);
        yTicks.push(`
            <line x1="${padding.left - 5}" y1="${y}" x2="${padding.left}" y2="${y}"
                  stroke="#64748b" stroke-width="2"/>
            <text x="${padding.left - 10}" y="${y + 4}"
                  text-anchor="end" fill="#94a3b8" font-size="10">
                ${Math.round(freq)}
            </text>
        `);
    }

    // Mean and median lines
    const meanX = scaleX(mean);
    const medianX = scaleX(median);

    return `
        <svg width="100%" height="${height}" viewBox="0 0 ${width} ${height}" style="max-width: ${width}px; margin: 0 auto; display: block;">
            <!-- Background grid -->
            ${Array.from({length: yTickCount + 1}, (_, i) => {
                const y = padding.top + (chartHeight * i / yTickCount);
                return `<line x1="${padding.left}" y1="${y}" x2="${padding.left + chartWidth}" y2="${y}"
                        stroke="#334155" stroke-width="1" opacity="0.3" stroke-dasharray="3,3"/>`;
            }).join('')}

            <!-- Histogram bars -->
            ${barElements}

            <!-- Bell curve (normal distribution) -->
            <path d="${bellCurvePath}" fill="none" stroke="#22c55e" stroke-width="2.5" opacity="0.9"/>

            <!-- Axes -->
            <line x1="${padding.left}" y1="${padding.top}"
                  x2="${padding.left}" y2="${padding.top + chartHeight}"
                  stroke="#64748b" stroke-width="2"/>
            <line x1="${padding.left}" y1="${padding.top + chartHeight}"
                  x2="${padding.left + chartWidth}" y2="${padding.top + chartHeight}"
                  stroke="#64748b" stroke-width="2"/>

            <!-- Ticks and labels -->
            ${xTicks.join('')}
            ${yTicks.join('')}

            <!-- Mean line -->
            <line x1="${meanX}" y1="${padding.top}" x2="${meanX}" y2="${padding.top + chartHeight}"
                  stroke="#fbbf24" stroke-width="2.5" stroke-dasharray="5,5" opacity="0.9"/>
            <text x="${meanX}" y="${padding.top - 5}"
                  text-anchor="middle" fill="#fbbf24" font-size="11" font-weight="bold">
                Mean: ${mean.toFixed(3)}
            </text>

            <!-- Median line -->
            <line x1="${medianX}" y1="${padding.top}" x2="${medianX}" y2="${padding.top + chartHeight}"
                  stroke="#a855f7" stroke-width="2.5" stroke-dasharray="5,5" opacity="0.9"/>
            <text x="${medianX}" y="${padding.top - 18}"
                  text-anchor="middle" fill="#a855f7" font-size="11" font-weight="bold">
                Median: ${median.toFixed(3)}
            </text>

            <!-- Y-axis label -->
            <text x="${padding.left - 45}" y="${padding.top + chartHeight/2}"
                  text-anchor="middle" fill="#0ea5e9" font-size="11" font-weight="bold"
                  transform="rotate(-90, ${padding.left - 45}, ${padding.top + chartHeight/2})">
                Frequency
            </text>

            <!-- X-axis label -->
            <text x="${padding.left + chartWidth/2}" y="${height - 10}"
                  text-anchor="middle" fill="#0ea5e9" font-size="11" font-weight="bold">
                Value (nW/cm²/sr)
            </text>

            <!-- Legend -->
            <g transform="translate(${padding.left + chartWidth - 140}, ${padding.top + 10})">
                <rect x="0" y="0" width="135" height="75" fill="rgba(15, 23, 42, 0.9)" stroke="#334155" stroke-width="1" rx="4"/>

                <rect x="10" y="15" width="20" height="10" fill="#0ea5e9" opacity="0.7" stroke="#0284c7"/>
                <text x="35" y="23" fill="#e8e8e8" font-size="10">Histogram</text>

                <line x1="10" y1="40" x2="30" y2="40" stroke="#22c55e" stroke-width="2.5"/>
                <text x="35" y="43" fill="#e8e8e8" font-size="10">Bell Curve</text>

                <line x1="10" y1="60" x2="30" y2="60" stroke="#fbbf24" stroke-width="2" stroke-dasharray="4,4"/>
                <text x="35" y="63" fill="#e8e8e8" font-size="10">Mean/Median</text>
            </g>
        </svg>

        <!-- Distribution interpretation -->
        <div style="margin-top: 12px; padding: 10px; background: rgba(14, 165, 233, 0.05); border-radius: 6px; border-left: 3px solid #0ea5e9;">
            <p style="color: #94a3b8; margin: 0; font-size: 0.85em; line-height: 1.5;">
                <strong style="color: #0ea5e9;">Distribution:</strong>
                Blue bars show data frequency. Green curve shows fitted normal distribution.
                Yellow line = mean (${mean.toFixed(3)}), Purple line = median (${median.toFixed(3)}).
                ${Math.abs(mean - median) < stdDev * 0.1 ? 'Distribution is approximately symmetric.' : 'Distribution shows skewness.'}
            </p>
        </div>
    `;
}
