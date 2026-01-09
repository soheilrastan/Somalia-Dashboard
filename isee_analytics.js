// ========================================
// iSEE ANALYTICS ENGINE
// Integrated Socioeconomic and Environmental Analysis
// ========================================

function runISEEAnalytics(activeBakoolLayersParam, mapParam, layerRefs) {
    console.log('🔍 iSEE Analytics: Starting comprehensive analysis...');
    console.log('🔍 Function called successfully!');
    console.log('🔍 Parameters received:', { activeBakoolLayersParam, mapParam, layerRefs });

    // STEP 1: Scan active layers in Bakool region
    const activeLayers = scanActiveLayers(activeBakoolLayersParam, mapParam, layerRefs);
    console.log('📊 Active layers detected:', activeLayers);

    // STEP 2: Extract metadata and configure datasets
    const datasetsConfig = configureDatasets(activeLayers);
    console.log('⚙️ Datasets configured:', datasetsConfig);

    // STEP 3: Perform statistical analysis
    const analysisResults = performStatisticalAnalysis(datasetsConfig);
    console.log('📈 Analysis complete:', analysisResults);

    // STEP 4: Generate and display insights window
    displayInsightsWindow(analysisResults, datasetsConfig);
}

// STEP 1: Scan active layers
function scanActiveLayers(activeBakoolLayersParam, mapParam, layerRefs) {
    const layers = [];

    // Check Bakool 2022 Nightlight
    if (activeBakoolLayersParam['bakool2022']) {
        layers.push({
            id: 'bakool2022',
            name: 'Bakool 2022 Nightlight',
            type: 'nightlight',
            layer: layerRefs.detailedNLBakool2022,
            data: layerRefs.bakoolNightlightPolygons2022
        });
    }

    // Check Bakool 2023 Nightlight
    if (activeBakoolLayersParam['bakool2023']) {
        layers.push({
            id: 'bakool2023',
            name: 'Bakool 2023 Nightlight',
            type: 'nightlight',
            layer: layerRefs.detailedNLBakool2023,
            data: layerRefs.bakoolNightlightPolygons2023
        });
    }

    // Check Population layer
    if (layerRefs.populationLayer && mapParam.hasLayer(layerRefs.populationLayer)) {
        layers.push({
            id: 'population',
            name: 'Population Distribution',
            type: 'population',
            layer: layerRefs.populationLayer,
            data: layerRefs.populationData
        });
    }

    // Check MPI layer
    if (layerRefs.mpiLayer && mapParam.hasLayer(layerRefs.mpiLayer)) {
        layers.push({
            id: 'mpi',
            name: 'Multidimensional Poverty Index',
            type: 'socioeconomic',
            layer: layerRefs.mpiLayer,
            data: layerRefs.somaliaData
        });
    }

    // Check Roads layer (if active in Bakool region)
    if (layerRefs.clippedRoadsLayer &&
        mapParam.hasLayer(layerRefs.clippedRoadsLayer) &&
        layerRefs.activeRoadsRegion === 'Bakool') {
        layers.push({
            id: 'roads',
            name: 'Road Infrastructure (Bakool)',
            type: 'infrastructure',
            layer: layerRefs.clippedRoadsLayer,
            data: layerRefs.roadsData,
            region: 'Bakool'
        });
    }

    return layers;
}

// STEP 2: Configure datasets - Extract metadata
function configureDatasets(layers) {
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
                regions: 18,
                indicator: 'Multidimensional Poverty Index',
                unit: 'index (0-1)',
                values: extractMPIStats(layer.data)
            };
        } else if (layer.type === 'infrastructure') {
            config.metadata = {
                dataSource: 'Somalia All Roads 2021',
                region: layer.region,
                totalRoads: extractRoadsStats(layer.data, layer.region).count,
                unit: 'road segments',
                values: extractRoadsStats(layer.data, layer.region)
            };
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

// Extract MPI statistics
function extractMPIStats(data) {
    const bakoolFeature = data.features.find(f =>
        f.properties.name === 'Bakool' || f.properties.ADM1_EN === 'Bakool'
    );

    if (bakoolFeature && bakoolFeature.properties.mpi != null) {
        return {
            mpi: bakoolFeature.properties.mpi,
            intensity: bakoolFeature.properties.intensity,
            headcount: bakoolFeature.properties.headcount
        };
    }
    return null;
}

// Extract roads infrastructure statistics
function extractRoadsStats(data, region) {
    // Filter roads by region
    const regionRoads = data.features.filter(f =>
        f.properties.shapeName === region
    );

    // Count roads by type
    const roadTypes = {};
    regionRoads.forEach(road => {
        const type = road.properties.TYPE || 'Unknown';
        roadTypes[type] = (roadTypes[type] || 0) + 1;
    });

    // Calculate total length (approximation based on number of coordinates)
    let totalCoordinates = 0;
    regionRoads.forEach(road => {
        if (road.geometry && road.geometry.coordinates) {
            totalCoordinates += road.geometry.coordinates.length;
        }
    });

    return {
        count: regionRoads.length,
        byType: roadTypes,
        totalCoordinates: totalCoordinates,
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

// STEP 3: Perform statistical analysis
function performStatisticalAnalysis(datasets) {
    const results = {
        summary: generateExecutiveSummary(datasets),
        layerAnalysis: [],
        crossLayerInsights: [],
        temporalAnalysis: null,
        recommendations: []
    };

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
    results.recommendations = generateRecommendations(datasets, results);

    return results;
}

// Generate executive summary
function generateExecutiveSummary(datasets) {
    const summary = {
        region: 'Bakool, Somalia',
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
        analysis.insights.push(`${roads.count} road segments identified in ${roads.region}`);

        // Analyze road types
        const roadTypes = Object.entries(roads.byType).sort((a, b) => b[1] - a[1]);
        const topType = roadTypes[0];
        analysis.insights.push(`Predominant road type: ${topType[0]} (${topType[1]} segments, ${(topType[1]/roads.count*100).toFixed(1)}%)`);

        // Infrastructure quality assessment
        if (roads.byType['Major road']) {
            analysis.insights.push(`Presence of major roads indicates some connectivity infrastructure`);
        } else {
            analysis.insights.push(`Limited to secondary roads and tracks - basic infrastructure only`);
        }

        // Road density indicator
        const roadDensity = roads.count < 100 ? 'Very Low' : roads.count < 500 ? 'Low' : roads.count < 1000 ? 'Moderate' : 'High';
        analysis.insights.push(`Road network density: ${roadDensity} (${roads.count} total segments)`);
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
function generateRecommendations(datasets, results) {
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
function displayInsightsWindow(results, datasets) {
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

    modalContent.innerHTML = generateInsightsHTML(results, datasets);

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
function generateInsightsHTML(results, datasets) {
    return `
        <div style="padding: 30px;">
            <!-- Header -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; border-bottom: 2px solid #334155; padding-bottom: 20px;">
                <div>
                    <h2 style="color: #0ea5e9; font-size: 2em; margin: 0; display: flex; align-items: center; gap: 10px;">
                        🔍 iSEE Analytics Report
                    </h2>
                    <p style="color: #94a3b8; margin: 5px 0 0 0; font-size: 0.9em;">
                        Integrated Socioeconomic and Environmental Analysis
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
                            ${datasets.map((dataset, index) => `
                                <tr style="background: ${index % 2 === 0 ? 'rgba(59, 130, 246, 0.05)' : 'transparent'}; border-bottom: 1px solid rgba(59, 130, 246, 0.1);">
                                    <td style="padding: 12px; color: #e8e8e8;">${dataset.name}</td>
                                    <td style="padding: 12px; color: #94a3b8;">VIIRS Nighttime Lights</td>
                                    <td style="padding: 12px; color: #94a3b8;">500m × 500m</td>
                                    <td style="padding: 12px; color: #94a3b8;">${dataset.id.includes('2022') ? '2022' : '2023'}</td>
                                    <td style="padding: 12px;">
                                        <a href="https://eogdata.mines.edu/products/vnl/"
                                           target="_blank"
                                           style="color: #3b82f6; text-decoration: none; font-weight: bold; display: inline-flex; align-items: center; gap: 5px;"
                                           onmouseover="this.style.color='#60a5fa'"
                                           onmouseout="this.style.color='#3b82f6'">
                                            NOAA VIIRS <span style="font-size: 0.8em;">🔗</span>
                                        </a>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                <div style="margin-top: 15px; padding: 12px; background: rgba(59, 130, 246, 0.05); border-radius: 6px; font-size: 0.85em; color: #94a3b8;">
                    <strong>Note:</strong> All datasets are derived from NOAA's VIIRS (Visible Infrared Imaging Radiometer Suite) Day/Night Band nighttime lights product.
                    Data processing and analysis performed by Geo-Insight Lab, ESCWA.
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
                .map(([type, count]) => `<div>${type}: ${count}</div>`)
                .join('');

            statsHTML = `
                <div style="background: rgba(14, 165, 233, 0.05); padding: 12px; border-radius: 6px; margin-top: 12px;">
                    <div style="font-size: 0.85em;">
                        <div style="margin-bottom: 8px;"><strong>Total Road Segments:</strong> ${stats.count.toLocaleString()}</div>
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
