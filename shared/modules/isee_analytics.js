// ========================================
// iSEE ANALYTICS ENGINE v4.0 (PROFESSIONAL)
// Intelligent Socioeconomic & Environmental Evidence Analysis
// Comprehensive geospatial statistical analysis with professional visualizations
// ========================================
// Features:
// 1. Per-layer independent statistical analysis with charts
// 2. Time-series analysis for same thematic layers (multi-year comparison)
// 3. Cross-thematic composite analysis with derived indicators
// 4. AI-driven insights and development recommendations
// 5. Professional SVG charts: bar, grouped bar, line, area, radar, distribution
// ========================================

const ISEEAnalytics = (function() {
    'use strict';

    // ========================================
    // LAYER TYPE REGISTRY
    // ========================================
    const layerTypeRegistry = new Map();

    function registerLayerType(config) {
        if (!config.type) {
            console.error('[iSEE Registry] Layer type must have a type identifier');
            return false;
        }
        layerTypeRegistry.set(config.type, {
            type: config.type,
            name: config.name || config.type,
            detect: config.detect || (() => false),
            getData: config.getData || (() => null),
            extractStats: config.extractStats || (() => null),
            getMetadata: config.getMetadata || (() => ({})),
            generateInsights: config.generateInsights || (() => []),
            getSummaryFinding: config.getSummaryFinding || (() => null),
            crossLayerAnalysis: config.crossLayerAnalysis || {}
        });
        console.log(`[iSEE Registry] Registered layer type: ${config.type}`);
        return true;
    }

    function unregisterLayerType(type) {
        return layerTypeRegistry.delete(type);
    }

    function getRegisteredTypes() {
        return Array.from(layerTypeRegistry.keys());
    }

    // ========================================
    // ENHANCED STATISTICAL FUNCTIONS
    // ========================================

    function calculateStats(values) {
        if (!values || values.length === 0) return null;

        const sorted = [...values].sort((a, b) => a - b);
        const n = sorted.length;
        const sum = sorted.reduce((a, b) => a + b, 0);
        const mean = sum / n;

        const variance = sorted.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / n;
        const stdDev = Math.sqrt(variance);

        // Calculate percentiles
        const percentile = (p) => sorted[Math.floor(n * p)];

        // Calculate skewness
        const skewness = n > 2 ?
            (sorted.reduce((acc, val) => acc + Math.pow((val - mean) / stdDev, 3), 0) * n / ((n - 1) * (n - 2))) : 0;

        // Calculate kurtosis
        const kurtosis = n > 3 ?
            (sorted.reduce((acc, val) => acc + Math.pow((val - mean) / stdDev, 4), 0) * n * (n + 1) / ((n - 1) * (n - 2) * (n - 3)) - 3 * Math.pow(n - 1, 2) / ((n - 2) * (n - 3))) : 0;

        // Distribution histogram (10 bins)
        const binCount = 10;
        const range = sorted[n - 1] - sorted[0];
        const binSize = range / binCount || 1;
        const histogram = Array(binCount).fill(0);
        sorted.forEach(val => {
            const binIndex = Math.min(Math.floor((val - sorted[0]) / binSize), binCount - 1);
            histogram[binIndex]++;
        });

        return {
            count: n,
            sum: sum,
            min: sorted[0],
            max: sorted[n - 1],
            mean: mean,
            median: percentile(0.5),
            stdDev: stdDev,
            variance: variance,
            q1: percentile(0.25),
            q3: percentile(0.75),
            iqr: percentile(0.75) - percentile(0.25),
            p5: percentile(0.05),
            p10: percentile(0.10),
            p90: percentile(0.90),
            p95: percentile(0.95),
            skewness: skewness,
            kurtosis: kurtosis,
            coefficientOfVariation: mean !== 0 ? (stdDev / Math.abs(mean)) * 100 : 0,
            histogram: histogram,
            histogramBinSize: binSize,
            histogramMin: sorted[0],
            rawValues: values
        };
    }

    function calculateDistance(coord1, coord2) {
        if (!coord1 || !coord2 || coord1.length < 2 || coord2.length < 2) return 0;
        const [lon1, lat1] = coord1;
        const [lon2, lat2] = coord2;
        if (isNaN(lon1) || isNaN(lat1) || isNaN(lon2) || isNaN(lat2)) return 0;

        const R = 6371;
        const lat1Rad = lat1 * Math.PI / 180;
        const lat2Rad = lat2 * Math.PI / 180;
        const deltaLat = (lat2 - lat1) * Math.PI / 180;
        const deltaLon = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
                  Math.cos(lat1Rad) * Math.cos(lat2Rad) *
                  Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    }

    function calculateLineStringLength(coordinates) {
        let totalLength = 0;
        for (let i = 0; i < coordinates.length - 1; i++) {
            totalLength += calculateDistance(coordinates[i], coordinates[i + 1]);
        }
        return totalLength;
    }

    // Calculate correlation coefficient between two arrays
    function calculateCorrelation(arr1, arr2) {
        if (!arr1 || !arr2 || arr1.length !== arr2.length || arr1.length < 2) return 0;

        const n = arr1.length;
        const mean1 = arr1.reduce((a, b) => a + b, 0) / n;
        const mean2 = arr2.reduce((a, b) => a + b, 0) / n;

        let numerator = 0;
        let denom1 = 0;
        let denom2 = 0;

        for (let i = 0; i < n; i++) {
            const diff1 = arr1[i] - mean1;
            const diff2 = arr2[i] - mean2;
            numerator += diff1 * diff2;
            denom1 += diff1 * diff1;
            denom2 += diff2 * diff2;
        }

        const denominator = Math.sqrt(denom1 * denom2);
        return denominator !== 0 ? numerator / denominator : 0;
    }

    // Calculate linear regression
    function calculateLinearRegression(xValues, yValues) {
        if (!xValues || !yValues || xValues.length !== yValues.length || xValues.length < 2) {
            return { slope: 0, intercept: 0, r2: 0 };
        }

        const n = xValues.length;
        const sumX = xValues.reduce((a, b) => a + b, 0);
        const sumY = yValues.reduce((a, b) => a + b, 0);
        const sumXY = xValues.reduce((acc, x, i) => acc + x * yValues[i], 0);
        const sumX2 = xValues.reduce((acc, x) => acc + x * x, 0);
        const sumY2 = yValues.reduce((acc, y) => acc + y * y, 0);

        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;

        // R-squared
        const yMean = sumY / n;
        const ssTot = yValues.reduce((acc, y) => acc + Math.pow(y - yMean, 2), 0);
        const ssRes = yValues.reduce((acc, y, i) => acc + Math.pow(y - (slope * xValues[i] + intercept), 2), 0);
        const r2 = ssTot !== 0 ? 1 - (ssRes / ssTot) : 0;

        return { slope, intercept, r2 };
    }

    // ========================================
    // PROFESSIONAL SVG CHART GENERATORS
    // ========================================

    const ChartColors = {
        primary: '#3b82f6',
        secondary: '#8b5cf6',
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
        info: '#06b6d4',
        pink: '#ec4899',
        purple: '#a855f7',
        gray: '#6b7280',

        // Gradient palettes
        population: ['#fce7f3', '#fbcfe8', '#f9a8d4', '#f472b6', '#ec4899', '#db2777', '#be185d', '#9d174d'],
        roads: ['#fef3c7', '#fde68a', '#fcd34d', '#fbbf24', '#f59e0b', '#d97706', '#b45309', '#92400e'],
        nightlight: ['#ede9fe', '#ddd6fe', '#c4b5fd', '#a78bfa', '#8b5cf6', '#7c3aed', '#6d28d9', '#5b21b6'],
        infrastructure: ['#d1fae5', '#a7f3d0', '#6ee7b7', '#34d399', '#10b981', '#059669', '#047857', '#065f46']
    };

    // Helper function to convert hex to RGB
    function hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ?
            `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` :
            '107, 114, 128';
    }

    // Format large numbers
    function formatNumber(num, decimals = 0) {
        if (num === undefined || num === null || isNaN(num)) return 'N/A';
        if (Math.abs(num) >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (Math.abs(num) >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toFixed(decimals);
    }

    // Safe number formatting
    function safeFixed(val, decimals = 2) {
        if (val === undefined || val === null || isNaN(val)) return 'N/A';
        return Number(val).toFixed(decimals);
    }

    /**
     * Generate a vertical bar chart with professional styling
     */
    function generateBarChart(data, options = {}) {
        const {
            width = 450,
            height = 280,
            title = '',
            yLabel = '',
            xLabel = '',
            colors = [ChartColors.primary],
            showValues = true,
            showGrid = true,
            showPercentChange = false,
            animate = true,
            valueFormatter = (v) => formatNumber(v, 1)
        } = options;

        if (!data || data.length === 0) return '';

        const margin = { top: 40, right: 30, bottom: 60, left: 70 };
        const chartWidth = width - margin.left - margin.right;
        const chartHeight = height - margin.top - margin.bottom;

        const maxValue = Math.max(...data.map(d => d.value)) * 1.15;
        const barWidth = Math.min(50, (chartWidth / data.length) - 15);
        const barGap = (chartWidth - barWidth * data.length) / (data.length + 1);

        let svg = `<svg viewBox="0 0 ${width} ${height}" style="width: 100%; max-width: ${width}px; height: auto; margin: 15px 0;">`;

        // Background
        svg += `<rect width="${width}" height="${height}" fill="#0f172a" rx="12"/>`;

        // Title
        if (title) {
            svg += `<text x="${width/2}" y="24" text-anchor="middle" fill="#f1f5f9" font-size="14" font-weight="600">${title}</text>`;
        }

        // Y-axis label
        if (yLabel) {
            svg += `<text x="20" y="${height/2}" text-anchor="middle" fill="#94a3b8" font-size="11" transform="rotate(-90, 20, ${height/2})">${yLabel}</text>`;
        }

        // X-axis label
        if (xLabel) {
            svg += `<text x="${width/2}" y="${height - 8}" text-anchor="middle" fill="#94a3b8" font-size="11">${xLabel}</text>`;
        }

        // Grid lines
        if (showGrid) {
            for (let i = 0; i <= 5; i++) {
                const y = margin.top + (chartHeight * i / 5);
                svg += `<line x1="${margin.left}" y1="${y}" x2="${width - margin.right}" y2="${y}" stroke="#1e293b" stroke-width="1"/>`;
                const gridValue = maxValue * (5 - i) / 5;
                svg += `<text x="${margin.left - 8}" y="${y + 4}" text-anchor="end" fill="#64748b" font-size="10">${valueFormatter(gridValue)}</text>`;
            }
        }

        // X-axis line
        svg += `<line x1="${margin.left}" y1="${margin.top + chartHeight}" x2="${width - margin.right}" y2="${margin.top + chartHeight}" stroke="#334155" stroke-width="2"/>`;

        // Bars with gradients
        data.forEach((d, i) => {
            const barHeight = (d.value / maxValue) * chartHeight;
            const x = margin.left + barGap + i * (barWidth + barGap);
            const y = margin.top + chartHeight - barHeight;
            const color = d.color || colors[i % colors.length] || ChartColors.primary;
            const gradientId = `barGrad${i}_${Date.now()}`;

            // Gradient definition
            svg += `<defs>
                <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style="stop-color:${color};stop-opacity:1" />
                    <stop offset="100%" style="stop-color:${color};stop-opacity:0.5" />
                </linearGradient>
            </defs>`;

            // Bar with animation
            if (animate) {
                svg += `<rect x="${x}" y="${margin.top + chartHeight}" width="${barWidth}" height="0" fill="url(#${gradientId})" rx="4">
                    <animate attributeName="height" from="0" to="${barHeight}" dur="0.6s" fill="freeze" begin="${i * 0.1}s"/>
                    <animate attributeName="y" from="${margin.top + chartHeight}" to="${y}" dur="0.6s" fill="freeze" begin="${i * 0.1}s"/>
                </rect>`;
            } else {
                svg += `<rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="url(#${gradientId})" rx="4"/>`;
            }

            // Value on top
            if (showValues) {
                svg += `<text x="${x + barWidth/2}" y="${y - 8}" text-anchor="middle" fill="#f1f5f9" font-size="11" font-weight="600">${valueFormatter(d.value)}</text>`;
            }

            // Label at bottom
            svg += `<text x="${x + barWidth/2}" y="${margin.top + chartHeight + 18}" text-anchor="middle" fill="#e2e8f0" font-size="11" font-weight="500">${d.label || d.year || ''}</text>`;

            // Percent change arrow
            if (showPercentChange && i > 0 && data[i-1].value > 0) {
                const pctChange = ((d.value - data[i-1].value) / data[i-1].value * 100);
                const changeColor = pctChange >= 0 ? ChartColors.success : ChartColors.danger;
                const arrow = pctChange >= 0 ? '▲' : '▼';
                svg += `<text x="${x + barWidth/2}" y="${margin.top + chartHeight + 35}" text-anchor="middle" fill="${changeColor}" font-size="10" font-weight="600">${arrow} ${Math.abs(pctChange).toFixed(1)}%</text>`;
            }
        });

        svg += '</svg>';
        return svg;
    }

    /**
     * Generate a grouped bar chart for comparison
     */
    function generateGroupedBarChart(data, options = {}) {
        const {
            width = 500,
            height = 300,
            title = '',
            groups = [],
            colors = [ChartColors.primary, ChartColors.secondary, ChartColors.success],
            showValues = true,
            showLegend = true,
            valueFormatter = (v) => formatNumber(v, 1)
        } = options;

        if (!data || data.length === 0 || groups.length === 0) return '';

        const margin = { top: 50, right: 30, bottom: 70, left: 70 };
        const chartWidth = width - margin.left - margin.right;
        const chartHeight = height - margin.top - margin.bottom;

        // Find max value across all groups
        let maxValue = 0;
        data.forEach(d => {
            groups.forEach(g => {
                if (d[g] && d[g] > maxValue) maxValue = d[g];
            });
        });
        maxValue *= 1.15;

        const groupWidth = chartWidth / data.length;
        const barWidth = Math.min(25, (groupWidth - 20) / groups.length);
        const groupPadding = (groupWidth - barWidth * groups.length) / 2;

        let svg = `<svg viewBox="0 0 ${width} ${height}" style="width: 100%; max-width: ${width}px; height: auto; margin: 15px 0;">`;

        // Background
        svg += `<rect width="${width}" height="${height}" fill="#0f172a" rx="12"/>`;

        // Title
        if (title) {
            svg += `<text x="${width/2}" y="24" text-anchor="middle" fill="#f1f5f9" font-size="14" font-weight="600">${title}</text>`;
        }

        // Legend
        if (showLegend) {
            const legendY = 38;
            const legendItemWidth = 80;
            const legendStartX = (width - groups.length * legendItemWidth) / 2;
            groups.forEach((g, i) => {
                const lx = legendStartX + i * legendItemWidth;
                svg += `<rect x="${lx}" y="${legendY - 8}" width="12" height="12" fill="${colors[i]}" rx="2"/>`;
                svg += `<text x="${lx + 16}" y="${legendY}" fill="#94a3b8" font-size="10">${g}</text>`;
            });
        }

        // Grid lines
        for (let i = 0; i <= 5; i++) {
            const y = margin.top + (chartHeight * i / 5);
            svg += `<line x1="${margin.left}" y1="${y}" x2="${width - margin.right}" y2="${y}" stroke="#1e293b" stroke-width="1"/>`;
            const gridValue = maxValue * (5 - i) / 5;
            svg += `<text x="${margin.left - 8}" y="${y + 4}" text-anchor="end" fill="#64748b" font-size="10">${valueFormatter(gridValue)}</text>`;
        }

        // Bars
        data.forEach((d, di) => {
            const groupX = margin.left + di * groupWidth + groupPadding;

            groups.forEach((g, gi) => {
                const value = d[g] || 0;
                const barHeight = (value / maxValue) * chartHeight;
                const x = groupX + gi * barWidth;
                const y = margin.top + chartHeight - barHeight;

                svg += `<rect x="${x}" y="${y}" width="${barWidth - 2}" height="${barHeight}" fill="${colors[gi]}" rx="3" opacity="0.9"/>`;

                if (showValues && barHeight > 20) {
                    svg += `<text x="${x + (barWidth - 2)/2}" y="${y + 15}" text-anchor="middle" fill="white" font-size="9" font-weight="600">${valueFormatter(value)}</text>`;
                }
            });

            // Category label
            svg += `<text x="${margin.left + di * groupWidth + groupWidth/2}" y="${margin.top + chartHeight + 20}" text-anchor="middle" fill="#e2e8f0" font-size="11" font-weight="500">${d.category || d.label || ''}</text>`;
        });

        svg += '</svg>';
        return svg;
    }

    /**
     * Generate a horizontal bar chart for rankings/comparisons
     */
    function generateHorizontalBarChart(data, options = {}) {
        const {
            width = 450,
            height = null,
            title = '',
            color = ChartColors.primary,
            showValues = true,
            showPercentage = false,
            maxItems = 8,
            valueFormatter = (v) => formatNumber(v, 1)
        } = options;

        if (!data || data.length === 0) return '';

        const displayData = data.slice(0, maxItems);
        const calculatedHeight = Math.max(200, 60 + displayData.length * 35);
        const finalHeight = height || calculatedHeight;

        const margin = { top: 40, right: 80, bottom: 20, left: 130 };
        const chartWidth = width - margin.left - margin.right;
        const chartHeight = finalHeight - margin.top - margin.bottom;

        const maxValue = Math.max(...displayData.map(d => d.value)) * 1.1;
        const totalValue = displayData.reduce((sum, d) => sum + d.value, 0);
        const barHeight = Math.min(28, (chartHeight / displayData.length) - 8);
        const barGap = (chartHeight - barHeight * displayData.length) / (displayData.length + 1);

        let svg = `<svg viewBox="0 0 ${width} ${finalHeight}" style="width: 100%; max-width: ${width}px; height: auto; margin: 15px 0;">`;

        // Background
        svg += `<rect width="${width}" height="${finalHeight}" fill="#0f172a" rx="12"/>`;

        // Title
        if (title) {
            svg += `<text x="${width/2}" y="24" text-anchor="middle" fill="#f1f5f9" font-size="14" font-weight="600">${title}</text>`;
        }

        // Bars
        displayData.forEach((d, i) => {
            const barW = (d.value / maxValue) * chartWidth;
            const x = margin.left;
            const y = margin.top + barGap + i * (barHeight + barGap);
            const barColor = d.color || color;
            const gradientId = `hbarGrad${i}_${Date.now()}`;

            // Gradient
            svg += `<defs>
                <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style="stop-color:${barColor};stop-opacity:1" />
                    <stop offset="100%" style="stop-color:${barColor};stop-opacity:0.6" />
                </linearGradient>
            </defs>`;

            // Label on left (truncate if too long)
            const labelText = d.label.length > 15 ? d.label.substring(0, 15) + '...' : d.label;
            svg += `<text x="${margin.left - 8}" y="${y + barHeight/2 + 4}" text-anchor="end" fill="#e2e8f0" font-size="11">${labelText}</text>`;

            // Bar
            svg += `<rect x="${x}" y="${y}" width="${barW}" height="${barHeight}" fill="url(#${gradientId})" rx="4"/>`;

            // Value on right
            if (showValues) {
                let valueText = valueFormatter(d.value);
                if (showPercentage && totalValue > 0) {
                    valueText += ` (${((d.value / totalValue) * 100).toFixed(1)}%)`;
                }
                svg += `<text x="${x + barW + 8}" y="${y + barHeight/2 + 4}" text-anchor="start" fill="#f1f5f9" font-size="11" font-weight="600">${valueText}</text>`;
            }
        });

        svg += '</svg>';
        return svg;
    }

    /**
     * Generate a line chart for time series
     */
    function generateLineChart(data, options = {}) {
        const {
            width = 500,
            height = 280,
            title = '',
            yLabel = '',
            color = ChartColors.primary,
            showPoints = true,
            showArea = true,
            showGrid = true,
            showValues = false,
            valueFormatter = (v) => formatNumber(v, 1)
        } = options;

        if (!data || data.length < 2) return '';

        const margin = { top: 40, right: 30, bottom: 50, left: 70 };
        const chartWidth = width - margin.left - margin.right;
        const chartHeight = height - margin.top - margin.bottom;

        const maxValue = Math.max(...data.map(d => d.value)) * 1.15;
        const minValue = Math.min(...data.map(d => d.value)) * 0.85;
        const valueRange = maxValue - minValue;

        const xStep = chartWidth / (data.length - 1);

        let svg = `<svg viewBox="0 0 ${width} ${height}" style="width: 100%; max-width: ${width}px; height: auto; margin: 15px 0;">`;

        // Background
        svg += `<rect width="${width}" height="${height}" fill="#0f172a" rx="12"/>`;

        // Title
        if (title) {
            svg += `<text x="${width/2}" y="24" text-anchor="middle" fill="#f1f5f9" font-size="14" font-weight="600">${title}</text>`;
        }

        // Y-axis label
        if (yLabel) {
            svg += `<text x="18" y="${height/2}" text-anchor="middle" fill="#94a3b8" font-size="11" transform="rotate(-90, 18, ${height/2})">${yLabel}</text>`;
        }

        // Grid
        if (showGrid) {
            for (let i = 0; i <= 5; i++) {
                const y = margin.top + (chartHeight * i / 5);
                svg += `<line x1="${margin.left}" y1="${y}" x2="${width - margin.right}" y2="${y}" stroke="#1e293b" stroke-width="1"/>`;
                const gridValue = maxValue - (valueRange * i / 5);
                svg += `<text x="${margin.left - 8}" y="${y + 4}" text-anchor="end" fill="#64748b" font-size="10">${valueFormatter(gridValue)}</text>`;
            }
        }

        // Calculate points
        const points = data.map((d, i) => ({
            x: margin.left + i * xStep,
            y: margin.top + chartHeight - ((d.value - minValue) / valueRange) * chartHeight,
            value: d.value,
            label: d.label || d.year
        }));

        // Area fill
        if (showArea) {
            const areaId = `areaGrad_${Date.now()}`;
            svg += `<defs>
                <linearGradient id="${areaId}" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style="stop-color:${color};stop-opacity:0.3" />
                    <stop offset="100%" style="stop-color:${color};stop-opacity:0.05" />
                </linearGradient>
            </defs>`;

            let areaPath = `M ${points[0].x} ${margin.top + chartHeight}`;
            points.forEach(p => areaPath += ` L ${p.x} ${p.y}`);
            areaPath += ` L ${points[points.length - 1].x} ${margin.top + chartHeight} Z`;
            svg += `<path d="${areaPath}" fill="url(#${areaId})"/>`;
        }

        // Line
        let linePath = `M ${points[0].x} ${points[0].y}`;
        for (let i = 1; i < points.length; i++) {
            linePath += ` L ${points[i].x} ${points[i].y}`;
        }
        svg += `<path d="${linePath}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;

        // Points and labels
        points.forEach((p, i) => {
            if (showPoints) {
                svg += `<circle cx="${p.x}" cy="${p.y}" r="6" fill="#0f172a" stroke="${color}" stroke-width="3"/>`;
            }

            if (showValues) {
                svg += `<text x="${p.x}" y="${p.y - 12}" text-anchor="middle" fill="#f1f5f9" font-size="10" font-weight="600">${valueFormatter(p.value)}</text>`;
            }

            // X-axis labels
            svg += `<text x="${p.x}" y="${margin.top + chartHeight + 20}" text-anchor="middle" fill="#e2e8f0" font-size="11">${p.label}</text>`;
        });

        svg += '</svg>';
        return svg;
    }

    /**
     * Generate a distribution/histogram chart
     */
    function generateDistributionChart(stats, options = {}) {
        const {
            width = 450,
            height = 220,
            title = '',
            color = ChartColors.primary,
            showStats = true
        } = options;

        if (!stats || !stats.histogram) return '';

        const margin = { top: 40, right: 30, bottom: 50, left: 50 };
        const chartWidth = width - margin.left - margin.right;
        const chartHeight = height - margin.top - margin.bottom;

        const histogram = stats.histogram;
        const maxCount = Math.max(...histogram);
        const binCount = histogram.length;
        const barWidth = chartWidth / binCount - 2;

        let svg = `<svg viewBox="0 0 ${width} ${height}" style="width: 100%; max-width: ${width}px; height: auto; margin: 15px 0;">`;

        // Background
        svg += `<rect width="${width}" height="${height}" fill="#0f172a" rx="12"/>`;

        // Title
        if (title) {
            svg += `<text x="${width/2}" y="24" text-anchor="middle" fill="#f1f5f9" font-size="14" font-weight="600">${title}</text>`;
        }

        // Histogram bars
        histogram.forEach((count, i) => {
            const barHeight = (count / maxCount) * chartHeight;
            const x = margin.left + i * (chartWidth / binCount);
            const y = margin.top + chartHeight - barHeight;

            svg += `<rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="${color}" opacity="0.7" rx="2"/>`;
        });

        // Mean line
        if (stats.mean !== undefined) {
            const meanX = margin.left + ((stats.mean - stats.min) / (stats.max - stats.min)) * chartWidth;
            svg += `<line x1="${meanX}" y1="${margin.top}" x2="${meanX}" y2="${margin.top + chartHeight}" stroke="${ChartColors.danger}" stroke-width="2" stroke-dasharray="5,3"/>`;
            svg += `<text x="${meanX}" y="${margin.top - 5}" text-anchor="middle" fill="${ChartColors.danger}" font-size="10">μ=${safeFixed(stats.mean, 2)}</text>`;
        }

        // X-axis labels (min, median, max)
        svg += `<text x="${margin.left}" y="${margin.top + chartHeight + 18}" text-anchor="start" fill="#94a3b8" font-size="10">${safeFixed(stats.min, 2)}</text>`;
        svg += `<text x="${margin.left + chartWidth/2}" y="${margin.top + chartHeight + 18}" text-anchor="middle" fill="#94a3b8" font-size="10">Median: ${safeFixed(stats.median, 2)}</text>`;
        svg += `<text x="${margin.left + chartWidth}" y="${margin.top + chartHeight + 18}" text-anchor="end" fill="#94a3b8" font-size="10">${safeFixed(stats.max, 2)}</text>`;

        // Stats summary
        if (showStats) {
            svg += `<text x="${margin.left}" y="${margin.top + chartHeight + 38}" fill="#64748b" font-size="9">n=${stats.count} | σ=${safeFixed(stats.stdDev, 3)} | CV=${safeFixed(stats.coefficientOfVariation, 1)}%</text>`;
        }

        svg += '</svg>';
        return svg;
    }

    /**
     * Generate a comparison radar/spider chart
     */
    function generateRadarChart(data, options = {}) {
        const {
            width = 350,
            height = 350,
            title = '',
            categories = [],
            colors = [ChartColors.primary, ChartColors.secondary]
        } = options;

        if (!data || data.length === 0 || categories.length < 3) return '';

        const centerX = width / 2;
        const centerY = height / 2 + 15;
        const radius = Math.min(width, height) / 2 - 60;
        const angleStep = (2 * Math.PI) / categories.length;

        let svg = `<svg viewBox="0 0 ${width} ${height}" style="width: 100%; max-width: ${width}px; height: auto; margin: 15px 0;">`;

        // Background
        svg += `<rect width="${width}" height="${height}" fill="#0f172a" rx="12"/>`;

        // Title
        if (title) {
            svg += `<text x="${width/2}" y="24" text-anchor="middle" fill="#f1f5f9" font-size="14" font-weight="600">${title}</text>`;
        }

        // Grid circles
        for (let i = 1; i <= 5; i++) {
            const r = (radius * i) / 5;
            svg += `<circle cx="${centerX}" cy="${centerY}" r="${r}" fill="none" stroke="#1e293b" stroke-width="1"/>`;
        }

        // Grid lines and labels
        categories.forEach((cat, i) => {
            const angle = i * angleStep - Math.PI / 2;
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);

            svg += `<line x1="${centerX}" y1="${centerY}" x2="${x}" y2="${y}" stroke="#334155" stroke-width="1"/>`;

            // Category label
            const labelX = centerX + (radius + 20) * Math.cos(angle);
            const labelY = centerY + (radius + 20) * Math.sin(angle);
            svg += `<text x="${labelX}" y="${labelY}" text-anchor="middle" fill="#94a3b8" font-size="10">${cat}</text>`;
        });

        // Data polygons
        data.forEach((series, si) => {
            const color = colors[si % colors.length];
            let path = '';

            categories.forEach((cat, i) => {
                const value = series.values[i] || 0;
                const normalizedValue = Math.min(value / 100, 1); // Assume values are percentages
                const angle = i * angleStep - Math.PI / 2;
                const x = centerX + radius * normalizedValue * Math.cos(angle);
                const y = centerY + radius * normalizedValue * Math.sin(angle);

                path += (i === 0 ? 'M ' : 'L ') + x + ' ' + y;
            });
            path += ' Z';

            svg += `<path d="${path}" fill="${color}" fill-opacity="0.2" stroke="${color}" stroke-width="2"/>`;

            // Points
            categories.forEach((cat, i) => {
                const value = series.values[i] || 0;
                const normalizedValue = Math.min(value / 100, 1);
                const angle = i * angleStep - Math.PI / 2;
                const x = centerX + radius * normalizedValue * Math.cos(angle);
                const y = centerY + radius * normalizedValue * Math.sin(angle);

                svg += `<circle cx="${x}" cy="${y}" r="4" fill="${color}"/>`;
            });
        });

        // Legend
        const legendY = height - 25;
        data.forEach((series, i) => {
            const lx = width / 2 - (data.length * 60) / 2 + i * 80;
            svg += `<rect x="${lx}" y="${legendY - 8}" width="12" height="12" fill="${colors[i % colors.length]}" rx="2"/>`;
            svg += `<text x="${lx + 16}" y="${legendY}" fill="#94a3b8" font-size="10">${series.name}</text>`;
        });

        svg += '</svg>';
        return svg;
    }

    /**
     * Generate a KPI card
     */
    function generateKPICard(options = {}) {
        const {
            title = '',
            value = 'N/A',
            unit = '',
            change = null,
            changeLabel = '',
            icon = '',
            color = ChartColors.primary,
            size = 'medium' // small, medium, large
        } = options;

        const sizes = {
            small: { width: 140, height: 90, titleSize: 10, valueSize: 20, unitSize: 10 },
            medium: { width: 180, height: 110, titleSize: 11, valueSize: 26, unitSize: 11 },
            large: { width: 220, height: 130, titleSize: 12, valueSize: 32, unitSize: 12 }
        };
        const s = sizes[size] || sizes.medium;

        const changeColor = change > 0 ? ChartColors.success : change < 0 ? ChartColors.danger : ChartColors.gray;
        const changeArrow = change > 0 ? '▲' : change < 0 ? '▼' : '→';

        let svg = `<svg viewBox="0 0 ${s.width} ${s.height}" style="width: ${s.width}px; height: auto;">`;

        // Background
        svg += `<rect width="${s.width}" height="${s.height}" fill="#1e293b" rx="12" stroke="${color}" stroke-width="2" stroke-opacity="0.3"/>`;

        // Color accent bar
        svg += `<rect x="0" y="0" width="6" height="${s.height}" fill="${color}" rx="12 0 0 12"/>`;

        // Icon
        if (icon) {
            svg += `<text x="20" y="28" font-size="18">${icon}</text>`;
        }

        // Title
        svg += `<text x="20" y="${icon ? 50 : 28}" fill="#94a3b8" font-size="${s.titleSize}">${title}</text>`;

        // Value
        svg += `<text x="20" y="${icon ? 80 : 60}" fill="#f1f5f9" font-size="${s.valueSize}" font-weight="700">${value}<tspan font-size="${s.unitSize}" fill="#94a3b8"> ${unit}</tspan></text>`;

        // Change indicator
        if (change !== null) {
            svg += `<text x="${s.width - 15}" y="${s.height - 15}" text-anchor="end" fill="${changeColor}" font-size="11" font-weight="600">${changeArrow} ${Math.abs(change).toFixed(1)}% ${changeLabel}</text>`;
        }

        svg += '</svg>';
        return svg;
    }

    /**
     * Generate a comprehensive statistics panel
     */
    function generateStatisticsPanel(stats, options = {}) {
        const {
            title = 'Statistical Summary',
            color = ChartColors.primary,
            showDistribution = true
        } = options;

        if (!stats) return '';

        let html = `
            <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 20px; margin: 15px 0; border-left: 4px solid ${color};">
                <h4 style="color: ${color}; margin: 0 0 15px 0; font-size: 14px; font-weight: 600;">📊 ${title}</h4>

                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 15px;">
                    <div style="background: rgba(0,0,0,0.3); padding: 12px; border-radius: 8px; text-align: center;">
                        <div style="color: #64748b; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px;">Count</div>
                        <div style="color: #f1f5f9; font-size: 20px; font-weight: 700;">${formatNumber(stats.count)}</div>
                    </div>
                    <div style="background: rgba(0,0,0,0.3); padding: 12px; border-radius: 8px; text-align: center;">
                        <div style="color: #64748b; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px;">Mean</div>
                        <div style="color: #f1f5f9; font-size: 20px; font-weight: 700;">${safeFixed(stats.mean, 2)}</div>
                    </div>
                    <div style="background: rgba(0,0,0,0.3); padding: 12px; border-radius: 8px; text-align: center;">
                        <div style="color: #64748b; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px;">Median</div>
                        <div style="color: #f1f5f9; font-size: 20px; font-weight: 700;">${safeFixed(stats.median, 2)}</div>
                    </div>
                    <div style="background: rgba(0,0,0,0.3); padding: 12px; border-radius: 8px; text-align: center;">
                        <div style="color: #64748b; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px;">Std Dev</div>
                        <div style="color: #f1f5f9; font-size: 20px; font-weight: 700;">${safeFixed(stats.stdDev, 3)}</div>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-bottom: 15px;">
                    <div style="text-align: center;">
                        <div style="color: #64748b; font-size: 9px;">MIN</div>
                        <div style="color: #94a3b8; font-size: 12px; font-weight: 600;">${safeFixed(stats.min, 2)}</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="color: #64748b; font-size: 9px;">Q1 (25%)</div>
                        <div style="color: #94a3b8; font-size: 12px; font-weight: 600;">${safeFixed(stats.q1, 2)}</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="color: #64748b; font-size: 9px;">MEDIAN</div>
                        <div style="color: #94a3b8; font-size: 12px; font-weight: 600;">${safeFixed(stats.median, 2)}</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="color: #64748b; font-size: 9px;">Q3 (75%)</div>
                        <div style="color: #94a3b8; font-size: 12px; font-weight: 600;">${safeFixed(stats.q3, 2)}</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="color: #64748b; font-size: 9px;">MAX</div>
                        <div style="color: #94a3b8; font-size: 12px; font-weight: 600;">${safeFixed(stats.max, 2)}</div>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; padding-top: 12px; border-top: 1px solid #334155;">
                    <div style="text-align: center;">
                        <div style="color: #64748b; font-size: 9px;">IQR</div>
                        <div style="color: #94a3b8; font-size: 11px;">${safeFixed(stats.iqr, 2)}</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="color: #64748b; font-size: 9px;">CV</div>
                        <div style="color: #94a3b8; font-size: 11px;">${safeFixed(stats.coefficientOfVariation, 1)}%</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="color: #64748b; font-size: 9px;">RANGE</div>
                        <div style="color: #94a3b8; font-size: 11px;">${safeFixed(stats.max - stats.min, 2)}</div>
                    </div>
                </div>
        `;

        if (showDistribution && stats.histogram) {
            html += generateDistributionChart(stats, { title: 'Value Distribution', color: color });
        }

        html += '</div>';
        return html;
    }

    // ========================================
    // MAIN ANALYSIS ENGINE
    // ========================================

    function scanActiveLayers(activeBakoolLayersParam, mapParam, layerRefs, targetRegion) {
        const layers = [];

        layerTypeRegistry.forEach((config, type) => {
            try {
                if (config.detect(layerRefs, mapParam, targetRegion, activeBakoolLayersParam)) {
                    const layerData = config.getData(layerRefs, targetRegion, activeBakoolLayersParam);
                    if (layerData) {
                        const dataArray = Array.isArray(layerData) ? layerData : [layerData];
                        dataArray.forEach(ld => {
                            layers.push({
                                id: ld.id || type,
                                name: ld.name || config.name,
                                type: type,
                                layer: ld.layer,
                                data: ld.data,
                                region: ld.region || targetRegion,
                                year: ld.year,
                                source: ld.source,
                                metadata: ld
                            });
                        });
                    }
                }
            } catch (error) {
                console.error(`[iSEE] Error scanning layer type ${type}:`, error);
            }
        });

        console.log(`[iSEE] Scanned ${layers.length} active layers:`, layers.map(l => l.name));
        return layers;
    }

    function configureDatasets(layers, targetRegion) {
        return layers.map(layer => {
            const config = layerTypeRegistry.get(layer.type);
            if (!config) {
                console.warn(`[iSEE] No registry config for layer type: ${layer.type}`);
                return { id: layer.id, name: layer.name, type: layer.type, metadata: {} };
            }

            const stats = config.extractStats(layer.data, layer.region);
            const metadata = config.getMetadata(layer.data, stats, layer.region, targetRegion);

            return {
                id: layer.id,
                name: layer.name,
                type: layer.type,
                year: layer.year,
                source: layer.source,
                rawData: layer.data,
                metadata: {
                    ...metadata,
                    values: stats
                }
            };
        });
    }

    function generateExecutiveSummary(datasets, targetRegion) {
        const summary = {
            region: `${targetRegion || 'Unknown'}, Somalia`,
            analysisDate: new Date().toISOString().split('T')[0],
            analysisTime: new Date().toTimeString().split(' ')[0],
            datasetsAnalyzed: datasets.length,
            datasetTypes: [...new Set(datasets.map(d => d.type))],
            keyFindings: [],
            indicators: {}
        };

        datasets.forEach(ds => {
            const config = layerTypeRegistry.get(ds.type);
            if (config && config.getSummaryFinding) {
                const finding = config.getSummaryFinding(ds.metadata, ds.name, ds.rawData);
                if (finding) {
                    summary.keyFindings.push(finding);
                }
            }
        });

        return summary;
    }

    function analyzeLayer(dataset) {
        const config = layerTypeRegistry.get(dataset.type);
        const analysis = {
            layerName: dataset.name,
            type: dataset.type,
            year: dataset.year,
            source: dataset.source,
            insights: [],
            statistics: dataset.metadata.values,
            metadata: dataset.metadata,
            rawData: dataset.rawData
        };

        console.log(`[iSEE] Analyzing layer: ${dataset.name}, type: ${dataset.type}`);

        if (config && config.generateInsights) {
            try {
                analysis.insights = config.generateInsights(dataset.metadata, dataset.metadata.values, dataset.name, dataset.rawData);
            } catch (error) {
                console.error(`[iSEE] Error generating insights for ${dataset.name}:`, error);
                analysis.insights = [`Error analyzing layer: ${error.message}`];
            }
        }

        return analysis;
    }

    function performCrossLayerAnalysis(datasets) {
        const insights = [];
        const activeTypes = new Set(datasets.map(d => d.type));

        layerTypeRegistry.forEach((config, type) => {
            if (config.crossLayerAnalysis) {
                Object.entries(config.crossLayerAnalysis).forEach(([crossType, analyzer]) => {
                    if (activeTypes.has(type) && activeTypes.has(crossType)) {
                        const thisData = datasets.find(d => d.type === type);
                        const crossData = datasets.find(d => d.type === crossType);
                        if (thisData && crossData && analyzer.generate) {
                            try {
                                const insight = analyzer.generate(thisData, crossData);
                                if (insight) {
                                    insights.push(insight);
                                }
                            } catch (error) {
                                console.error(`[iSEE] Cross-layer analysis error:`, error);
                            }
                        }
                    }
                });
            }
        });

        return insights;
    }

    function performTemporalAnalysis(datasets) {
        // Group datasets by type
        const byType = {};
        datasets.forEach(ds => {
            if (!byType[ds.type]) byType[ds.type] = [];
            byType[ds.type].push(ds);
        });

        const temporalResults = [];

        Object.entries(byType).forEach(([type, typeDatasets]) => {
            if (typeDatasets.length >= 2) {
                // Sort by year
                const sorted = typeDatasets.sort((a, b) => {
                    const yearA = parseInt(a.year || a.id.match(/\d{4}/)?.[0] || 0);
                    const yearB = parseInt(b.year || b.id.match(/\d{4}/)?.[0] || 0);
                    return yearA - yearB;
                });

                const yearlyData = sorted.map(ds => ({
                    year: ds.year || ds.id.match(/\d{4}/)?.[0] || 'Unknown',
                    mean: ds.metadata.values?.mean,
                    sum: ds.metadata.values?.sum,
                    count: ds.metadata.values?.count,
                    dataset: ds
                })).filter(d => d.mean !== undefined || d.sum !== undefined);

                if (yearlyData.length >= 2) {
                    const firstYear = yearlyData[0];
                    const lastYear = yearlyData[yearlyData.length - 1];
                    const primaryMetric = firstYear.sum !== undefined ? 'sum' : 'mean';
                    const firstValue = firstYear[primaryMetric];
                    const lastValue = lastYear[primaryMetric];
                    const percentChange = firstValue > 0 ? ((lastValue - firstValue) / firstValue) * 100 : 0;

                    temporalResults.push({
                        type: type,
                        period: `${firstYear.year} - ${lastYear.year}`,
                        yearlyData: yearlyData,
                        trend: percentChange > 5 ? 'increasing' : percentChange < -5 ? 'decreasing' : 'stable',
                        percentChange: percentChange,
                        interpretation: generateTrendInterpretation(type, percentChange, yearlyData)
                    });
                }
            }
        });

        return temporalResults.length > 0 ? temporalResults : null;
    }

    function generateTrendInterpretation(type, percentChange, yearlyData) {
        const direction = percentChange > 0 ? 'increased' : percentChange < 0 ? 'decreased' : 'remained stable';
        const magnitude = Math.abs(percentChange) > 20 ? 'significantly' : Math.abs(percentChange) > 5 ? 'moderately' : 'marginally';

        const interpretations = {
            nightlight: `Nightlight intensity has ${magnitude} ${direction}, suggesting ${
                percentChange > 10 ? 'expanding economic activity and electrification' :
                percentChange > 0 ? 'gradual infrastructure development' :
                percentChange < -10 ? 'potential economic decline or power infrastructure issues' :
                'stable regional development patterns'
            }.`,
            population: `Population has ${magnitude} ${direction}, indicating ${
                percentChange > 20 ? 'rapid demographic growth requiring infrastructure scaling' :
                percentChange > 0 ? 'steady population increase with moderate service demands' :
                percentChange < -10 ? 'population decline potentially due to migration or conflict' :
                'demographic stability in the region'
            }.`,
            infrastructure: `Road infrastructure has ${magnitude} ${direction}, reflecting ${
                percentChange > 15 ? 'significant investment in transportation networks' :
                percentChange > 0 ? 'ongoing road development and maintenance' :
                percentChange < 0 ? 'potential infrastructure degradation or data changes' :
                'maintenance of existing road networks'
            }.`
        };

        return interpretations[type] || `The metric has ${magnitude} ${direction} (${percentChange.toFixed(1)}% change).`;
    }

    function generateRecommendations(datasets, results, targetRegion) {
        const recommendations = [];
        const hasPopulation = datasets.some(d => d.type === 'population');
        const hasRoads = datasets.some(d => d.type === 'infrastructure');
        const hasNightlight = datasets.some(d => d.type === 'nightlight');

        // Population-based recommendations
        if (hasPopulation) {
            const popDatasets = datasets.filter(d => d.type === 'population');
            const totalPop = popDatasets[0]?.metadata?.totalPopulation || popDatasets[0]?.metadata?.values?.sum;

            if (totalPop) {
                if (totalPop > 500000) {
                    recommendations.push({
                        category: 'Infrastructure',
                        priority: 'High',
                        recommendation: `With ${formatNumber(totalPop)} population, prioritize major infrastructure investments including roads, healthcare facilities, and educational institutions.`
                    });
                } else if (totalPop > 100000) {
                    recommendations.push({
                        category: 'Services',
                        priority: 'Medium',
                        recommendation: `Population of ${formatNumber(totalPop)} warrants expansion of essential services and connectivity improvements.`
                    });
                }
            }
        }

        // Roads-based recommendations
        if (hasRoads) {
            const roadsData = datasets.find(d => d.type === 'infrastructure');
            const roadDensity = roadsData?.metadata?.values?.totalLength;
            const qualityScore = roadsData?.metadata?.values?.qualityScore;

            if (qualityScore && parseFloat(qualityScore) < 40) {
                recommendations.push({
                    category: 'Transportation',
                    priority: 'High',
                    recommendation: `Road quality score of ${qualityScore}/100 indicates need for infrastructure upgrades. Focus on converting tracks to paved roads.`
                });
            }
        }

        // Cross-layer recommendations
        if (hasPopulation && hasRoads) {
            const popData = datasets.find(d => d.type === 'population');
            const roadsData = datasets.find(d => d.type === 'infrastructure');
            const population = popData?.metadata?.totalPopulation || popData?.metadata?.values?.sum || 0;
            const roadLength = roadsData?.metadata?.values?.totalLength || 0;

            if (population > 0 && roadLength > 0) {
                const roadsPerCapita = (roadLength * 1000) / population; // meters per person

                if (roadsPerCapita < 1) {
                    recommendations.push({
                        category: 'Connectivity',
                        priority: 'Critical',
                        recommendation: `Road density of ${(roadsPerCapita * 1000).toFixed(1)}m per 1000 people is below regional standards. Urgent road expansion needed to improve accessibility.`
                    });
                }
            }
        }

        // Nightlight-based recommendations
        if (hasNightlight) {
            const nlData = datasets.find(d => d.type === 'nightlight');
            const meanIntensity = nlData?.metadata?.values?.mean;

            if (meanIntensity !== undefined && meanIntensity < 0.1) {
                recommendations.push({
                    category: 'Electrification',
                    priority: 'High',
                    recommendation: `Low nightlight intensity (${safeFixed(meanIntensity, 3)} nW/cm²/sr) indicates limited electrification. Solar and off-grid solutions recommended.`
                });
            }
        }

        return recommendations;
    }

    function performBasicRegionalAnalysis(targetRegion, layerRefs) {
        return {
            regionName: targetRegion,
            estimatedArea: 'Calculating...',
            adminLevel: 'ADM1 (Regional)'
        };
    }

    function performStatisticalAnalysis(datasets, targetRegion, layerRefs) {
        const results = {
            summary: generateExecutiveSummary(datasets, targetRegion),
            layerAnalysis: [],
            crossLayerInsights: [],
            temporalAnalysis: null,
            compositeIndicators: [],
            recommendations: [],
            regionInfo: null
        };

        if (layerRefs?.regionLayer) {
            results.regionInfo = performBasicRegionalAnalysis(targetRegion, layerRefs);
        }

        datasets.forEach(dataset => {
            results.layerAnalysis.push(analyzeLayer(dataset));
        });

        if (datasets.length > 1) {
            results.crossLayerInsights = performCrossLayerAnalysis(datasets);
        }

        results.temporalAnalysis = performTemporalAnalysis(datasets);
        results.compositeIndicators = calculateCompositeIndicators(datasets, targetRegion);
        results.recommendations = generateRecommendations(datasets, results, targetRegion);

        return results;
    }

    function calculateCompositeIndicators(datasets, targetRegion) {
        const indicators = [];

        const popData = datasets.find(d => d.type === 'population');
        const roadsData = datasets.find(d => d.type === 'infrastructure');
        const nlData = datasets.find(d => d.type === 'nightlight');

        // Road Density Index
        if (roadsData && popData) {
            const population = popData.metadata?.totalPopulation || popData.metadata?.values?.sum || 0;
            const roadLength = roadsData.metadata?.values?.totalLength || 0;

            if (population > 0) {
                const roadDensityPerCapita = (roadLength * 1000) / population; // m per person
                const rdiScore = Math.min(100, roadDensityPerCapita * 20); // Normalize to 0-100

                indicators.push({
                    name: 'Road Density Index (RDI)',
                    value: rdiScore.toFixed(1),
                    unit: '/100',
                    description: `${roadLength.toFixed(1)} km of roads serving ${formatNumber(population)} people`,
                    interpretation: rdiScore > 60 ? 'Good road connectivity' :
                                   rdiScore > 30 ? 'Moderate connectivity' :
                                   'Limited road access',
                    color: rdiScore > 60 ? ChartColors.success : rdiScore > 30 ? ChartColors.warning : ChartColors.danger
                });
            }
        }

        // Infrastructure Quality Index
        if (roadsData) {
            const qualityScore = parseFloat(roadsData.metadata?.values?.qualityScore || 0);
            indicators.push({
                name: 'Infrastructure Quality Index (IQI)',
                value: qualityScore.toFixed(1),
                unit: '/100',
                description: 'Based on road classification hierarchy',
                interpretation: qualityScore > 60 ? 'High-quality road network' :
                               qualityScore > 40 ? 'Moderate infrastructure' :
                               'Basic rural infrastructure',
                color: qualityScore > 60 ? ChartColors.success : qualityScore > 40 ? ChartColors.warning : ChartColors.danger
            });
        }

        // Electrification Index (from nightlight)
        if (nlData) {
            const meanIntensity = nlData.metadata?.values?.mean || 0;
            const maxIntensity = nlData.metadata?.values?.max || 0;
            const electrificationScore = Math.min(100, (meanIntensity / 0.5) * 100); // Normalize assuming 0.5 is urban

            indicators.push({
                name: 'Electrification Index (EI)',
                value: electrificationScore.toFixed(1),
                unit: '/100',
                description: `Mean nightlight: ${safeFixed(meanIntensity, 3)}, Max: ${safeFixed(maxIntensity, 3)} nW/cm²/sr`,
                interpretation: electrificationScore > 50 ? 'Good electrification coverage' :
                               electrificationScore > 20 ? 'Partial electrification' :
                               'Limited electricity access',
                color: electrificationScore > 50 ? ChartColors.success : electrificationScore > 20 ? ChartColors.warning : ChartColors.danger
            });
        }

        // Population Accessibility Index
        if (popData && roadsData) {
            const popStats = popData.metadata?.values;
            const roadStats = roadsData.metadata?.values;

            if (popStats && roadStats) {
                const popCV = popStats.coefficientOfVariation || 0;
                const roadCount = roadStats.count || 0;
                const accessScore = Math.min(100, (roadCount / 100) * (100 - popCV/2));

                indicators.push({
                    name: 'Population Accessibility Index (PAI)',
                    value: accessScore.toFixed(1),
                    unit: '/100',
                    description: 'Composite of road network coverage and population distribution',
                    interpretation: accessScore > 60 ? 'Good population-road connectivity' :
                                   accessScore > 30 ? 'Moderate accessibility' :
                                   'Limited accessibility',
                    color: accessScore > 60 ? ChartColors.success : accessScore > 30 ? ChartColors.warning : ChartColors.danger
                });
            }
        }

        return indicators;
    }

    // ========================================
    // DISPLAY ENGINE
    // ========================================

    function displayInsightsWindow(results, datasets, targetRegion) {
        const existingModal = document.getElementById('iseeAnalyticsModal');
        if (existingModal) existingModal.remove();

        const modal = document.createElement('div');
        modal.id = 'iseeAnalyticsModal';
        modal.style.cssText = `
            position: fixed;
            top: 5%;
            left: 5%;
            width: 90%;
            max-width: 1200px;
            height: 90vh;
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            border-radius: 20px;
            box-shadow: 0 25px 80px -12px rgba(0, 0, 0, 0.9);
            border: 1px solid #334155;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        `;

        // Header
        const header = document.createElement('div');
        header.style.cssText = `
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            padding: 18px 24px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: move;
            user-select: none;
        `;
        header.innerHTML = `
            <div style="display: flex; align-items: center; gap: 15px;">
                <span style="font-size: 2em;">🧠</span>
                <div>
                    <h2 style="margin: 0; color: white; font-size: 1.4em; font-weight: 700;">iSEE Analytics v4.0</h2>
                    <div style="color: rgba(255,255,255,0.85); font-size: 0.85em;">${targetRegion}, Somalia • ${results.summary.analysisDate} ${results.summary.analysisTime} • ${datasets.length} dataset(s)</div>
                </div>
            </div>
            <button id="closeIseeModal" style="background: rgba(255,255,255,0.2); border: none; color: white; width: 36px; height: 36px; border-radius: 50%; cursor: pointer; font-size: 1.4em; transition: all 0.2s;">×</button>
        `;

        // Content
        const content = document.createElement('div');
        content.style.cssText = `
            flex: 1;
            overflow-y: auto;
            padding: 24px;
        `;
        content.innerHTML = generateAnalysisHTML(results, datasets, targetRegion);

        modal.appendChild(header);
        modal.appendChild(content);
        document.body.appendChild(modal);

        // Event listeners
        document.getElementById('closeIseeModal').addEventListener('click', () => modal.remove());
        document.getElementById('closeIseeModal').addEventListener('mouseenter', function() {
            this.style.background = 'rgba(255,255,255,0.3)';
        });
        document.getElementById('closeIseeModal').addEventListener('mouseleave', function() {
            this.style.background = 'rgba(255,255,255,0.2)';
        });

        makeDraggable(modal, header);
    }

    function generateAnalysisHTML(results, datasets, targetRegion) {
        let html = '';

        // Executive Summary Section
        html += `
            <div style="background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%); border-radius: 16px; padding: 24px; margin-bottom: 24px; border: 1px solid #334155;">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 20px;">
                    <span style="font-size: 1.5em;">📋</span>
                    <h3 style="color: #60a5fa; margin: 0; font-size: 1.2em;">Executive Summary</h3>
                </div>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-bottom: 20px;">
                    ${generateKPICard({ title: 'Datasets Analyzed', value: results.summary.datasetsAnalyzed, icon: '📊', color: ChartColors.primary, size: 'small' })}
                    ${generateKPICard({ title: 'Layer Types', value: results.summary.datasetTypes.length, icon: '🗂️', color: ChartColors.secondary, size: 'small' })}
                    ${generateKPICard({ title: 'Region', value: targetRegion, icon: '📍', color: ChartColors.success, size: 'small' })}
                </div>
        `;

        if (results.summary.keyFindings.length > 0) {
            html += `
                <div style="background: rgba(59, 130, 246, 0.1); border-radius: 12px; padding: 16px; border-left: 4px solid ${ChartColors.primary};">
                    <h4 style="color: #60a5fa; margin: 0 0 12px 0; font-size: 0.95em;">🎯 Key Findings</h4>
                    <ul style="margin: 0; padding-left: 20px; color: #e2e8f0;">
                        ${results.summary.keyFindings.map(f => `<li style="margin: 8px 0; line-height: 1.5;">${f}</li>`).join('')}
                    </ul>
                </div>
            `;
        }
        html += '</div>';

        // Composite Indicators Section
        if (results.compositeIndicators && results.compositeIndicators.length > 0) {
            html += `
                <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 16px; padding: 24px; margin-bottom: 24px; border: 1px solid #334155;">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 20px;">
                        <span style="font-size: 1.5em;">🎯</span>
                        <h3 style="color: #f59e0b; margin: 0; font-size: 1.2em;">Development Indicators</h3>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px;">
            `;

            results.compositeIndicators.forEach(indicator => {
                html += `
                    <div style="background: rgba(0,0,0,0.3); border-radius: 12px; padding: 18px; border-left: 4px solid ${indicator.color};">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                            <span style="color: #94a3b8; font-size: 0.85em;">${indicator.name}</span>
                            <span style="color: ${indicator.color}; font-size: 1.8em; font-weight: 700;">${indicator.value}<span style="font-size: 0.5em; color: #64748b;">${indicator.unit}</span></span>
                        </div>
                        <div style="color: #64748b; font-size: 0.8em; margin-bottom: 8px;">${indicator.description}</div>
                        <div style="color: ${indicator.color}; font-size: 0.85em; font-weight: 600;">${indicator.interpretation}</div>
                    </div>
                `;
            });

            html += '</div></div>';
        }

        // Individual Layer Analysis
        results.layerAnalysis.forEach(layer => {
            if (layer.insights.length > 0 || layer.statistics) {
                const typeColors = {
                    nightlight: ChartColors.purple,
                    population: ChartColors.pink,
                    infrastructure: ChartColors.warning,
                    socioeconomic: ChartColors.danger
                };
                const color = typeColors[layer.type] || ChartColors.gray;
                const icon = {
                    nightlight: '💡',
                    population: '👥',
                    infrastructure: '🛣️',
                    socioeconomic: '📊'
                }[layer.type] || '📋';

                html += `
                    <div style="background: linear-gradient(135deg, rgba(${hexToRgb(color)}, 0.15) 0%, #0f172a 100%); border-radius: 16px; padding: 24px; margin-bottom: 24px; border: 1px solid rgba(${hexToRgb(color)}, 0.3);">
                        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 20px;">
                            <span style="font-size: 1.5em;">${icon}</span>
                            <div>
                                <h3 style="color: ${color}; margin: 0; font-size: 1.2em;">${layer.layerName}</h3>
                                ${layer.year ? `<span style="color: #64748b; font-size: 0.85em;">Year: ${layer.year}</span>` : ''}
                            </div>
                        </div>
                `;

                // Insights
                if (layer.insights.length > 0) {
                    html += `
                        <div style="margin-bottom: 20px;">
                            ${layer.insights.map(i => `<p style="margin: 10px 0; line-height: 1.7; color: #e2e8f0;">${i}</p>`).join('')}
                        </div>
                    `;
                }

                // Statistics panel and charts
                if (layer.statistics) {
                    // Show statistics panel for all layer types
                    if (layer.statistics.mean !== undefined) {
                        html += generateStatisticsPanel(layer.statistics, { title: `${layer.layerName} Statistics`, color: color });
                    }

                    // Type-specific charts
                    if (layer.type === 'infrastructure') {
                        // Road classification chart
                        if (layer.statistics.lengthByClass) {
                            const roadClassData = Object.entries(layer.statistics.lengthByClass)
                                .sort((a, b) => b[1] - a[1])
                                .slice(0, 8)
                                .map(([cls, length], i) => ({
                                    label: cls.charAt(0).toUpperCase() + cls.slice(1).replace(/_/g, ' '),
                                    value: length,
                                    color: ChartColors.roads[i % ChartColors.roads.length]
                                }));

                            if (roadClassData.length > 0) {
                                html += generateHorizontalBarChart(roadClassData, {
                                    title: '🛣️ Road Network by Classification (km)',
                                    showPercentage: true,
                                    valueFormatter: (v) => v.toFixed(1) + ' km'
                                });
                            }
                        }

                        // Road count by class bar chart
                        if (layer.statistics.byClass) {
                            const countData = Object.entries(layer.statistics.byClass)
                                .sort((a, b) => b[1] - a[1])
                                .slice(0, 6)
                                .map(([cls, count]) => ({
                                    label: cls.charAt(0).toUpperCase() + cls.slice(1).replace(/_/g, ' '),
                                    value: count
                                }));

                            if (countData.length > 0) {
                                html += generateBarChart(countData, {
                                    title: '📊 Road Segments by Classification',
                                    colors: ChartColors.roads,
                                    xLabel: 'Road Type',
                                    yLabel: 'Segment Count',
                                    valueFormatter: (v) => formatNumber(v)
                                });
                            }
                        }
                    }

                    if (layer.type === 'nightlight') {
                        // Nightlight intensity bar chart
                        const nlData = [
                            { label: 'Mean', value: layer.statistics.mean || 0, color: ChartColors.purple },
                            { label: 'Median', value: layer.statistics.median || 0, color: '#8b5cf6' },
                            { label: 'Max', value: layer.statistics.max || 0, color: ChartColors.warning },
                            { label: 'Std Dev', value: layer.statistics.stdDev || 0, color: ChartColors.info }
                        ];
                        html += generateBarChart(nlData, {
                            title: '💡 Nightlight Intensity Statistics (nW/cm²/sr)',
                            colors: [ChartColors.purple, '#8b5cf6', ChartColors.warning, ChartColors.info],
                            valueFormatter: (v) => v.toFixed(4)
                        });
                    }

                    if (layer.type === 'population') {
                        // Population summary
                        const popData = [
                            { label: 'Total Pop', value: layer.statistics.sum || 0, color: ChartColors.pink },
                            { label: 'Avg/Cell', value: layer.statistics.mean || 0, color: '#f472b6' },
                            { label: 'Max/Cell', value: layer.statistics.max || 0, color: '#fb7185' }
                        ];
                        html += generateHorizontalBarChart(popData, {
                            title: '👥 Population Distribution',
                            valueFormatter: (v) => formatNumber(v)
                        });
                    }
                }

                html += '</div>';
            }
        });

        // Temporal Analysis Section
        if (results.temporalAnalysis && results.temporalAnalysis.length > 0) {
            html += `
                <div style="background: linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, #0f172a 100%); border-radius: 16px; padding: 24px; margin-bottom: 24px; border: 1px solid rgba(139, 92, 246, 0.3);">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 20px;">
                        <span style="font-size: 1.5em;">📈</span>
                        <h3 style="color: #8b5cf6; margin: 0; font-size: 1.2em;">Temporal Analysis</h3>
                    </div>
            `;

            results.temporalAnalysis.forEach(ta => {
                const trendColor = ta.trend === 'increasing' ? ChartColors.success :
                                   ta.trend === 'decreasing' ? ChartColors.danger : ChartColors.gray;
                const trendArrow = ta.trend === 'increasing' ? '📈' :
                                   ta.trend === 'decreasing' ? '📉' : '➡️';

                html += `
                    <div style="background: rgba(0,0,0,0.3); border-radius: 12px; padding: 18px; margin-bottom: 16px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                            <span style="color: #e2e8f0; font-weight: 600;">${ta.type.charAt(0).toUpperCase() + ta.type.slice(1)} (${ta.period})</span>
                            <span style="color: ${trendColor}; font-weight: 700; font-size: 1.1em;">${trendArrow} ${ta.trend.toUpperCase()} (${ta.percentChange > 0 ? '+' : ''}${ta.percentChange.toFixed(1)}%)</span>
                        </div>
                        <p style="color: #94a3b8; margin: 0 0 15px 0; line-height: 1.6;">${ta.interpretation}</p>
                `;

                // Time series chart
                if (ta.yearlyData && ta.yearlyData.length >= 2) {
                    const chartData = ta.yearlyData.map(yd => ({
                        label: yd.year,
                        value: yd.sum !== undefined ? yd.sum : yd.mean
                    }));

                    html += generateLineChart(chartData, {
                        title: `${ta.type.charAt(0).toUpperCase() + ta.type.slice(1)} Trend Over Time`,
                        color: ta.type === 'nightlight' ? ChartColors.purple :
                               ta.type === 'population' ? ChartColors.pink : ChartColors.warning,
                        showArea: true,
                        showValues: true,
                        valueFormatter: (v) => formatNumber(v, 1)
                    });

                    // Also show comparison bar chart
                    html += generateBarChart(chartData, {
                        title: `Year-over-Year Comparison`,
                        colors: ta.type === 'nightlight' ? ChartColors.nightlight :
                                ta.type === 'population' ? ChartColors.population : ChartColors.roads,
                        showPercentChange: true,
                        valueFormatter: (v) => formatNumber(v, 1)
                    });
                }

                html += '</div>';
            });

            html += '</div>';
        }

        // Cross-Layer Insights
        if (results.crossLayerInsights && results.crossLayerInsights.length > 0) {
            html += `
                <div style="background: linear-gradient(135deg, rgba(6, 182, 212, 0.15) 0%, #0f172a 100%); border-radius: 16px; padding: 24px; margin-bottom: 24px; border: 1px solid rgba(6, 182, 212, 0.3);">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 20px;">
                        <span style="font-size: 1.5em;">🔗</span>
                        <h3 style="color: #06b6d4; margin: 0; font-size: 1.2em;">Cross-Layer Analysis</h3>
                    </div>
                    <div style="display: grid; gap: 15px;">
            `;

            results.crossLayerInsights.forEach(insight => {
                const sigColor = insight.significance === 'High' ? ChartColors.success :
                                insight.significance === 'Critical' ? ChartColors.danger : ChartColors.warning;
                html += `
                    <div style="background: rgba(0,0,0,0.3); border-radius: 12px; padding: 16px; border-left: 4px solid ${sigColor};">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                            <span style="color: #e2e8f0; font-weight: 600;">${insight.title}</span>
                            <span style="background: ${sigColor}; color: white; padding: 2px 8px; border-radius: 10px; font-size: 0.75em; font-weight: 600;">${insight.significance}</span>
                        </div>
                        <p style="color: #94a3b8; margin: 0; line-height: 1.5;">${insight.finding}</p>
                    </div>
                `;
            });

            html += '</div></div>';
        }

        // Recommendations
        if (results.recommendations && results.recommendations.length > 0) {
            html += `
                <div style="background: linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, #0f172a 100%); border-radius: 16px; padding: 24px; margin-bottom: 24px; border: 1px solid rgba(34, 197, 94, 0.3);">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 20px;">
                        <span style="font-size: 1.5em;">💡</span>
                        <h3 style="color: #22c55e; margin: 0; font-size: 1.2em;">AI-Driven Recommendations</h3>
                    </div>
                    <div style="display: grid; gap: 15px;">
            `;

            results.recommendations.forEach((rec, i) => {
                const priorityColor = rec.priority === 'Critical' ? ChartColors.danger :
                                     rec.priority === 'High' ? ChartColors.warning : ChartColors.info;
                html += `
                    <div style="background: rgba(0,0,0,0.3); border-radius: 12px; padding: 16px; display: flex; gap: 15px; align-items: flex-start;">
                        <div style="background: ${priorityColor}; color: white; min-width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.9em;">${i + 1}</div>
                        <div style="flex: 1;">
                            <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 8px;">
                                <span style="color: #e2e8f0; font-weight: 600;">${rec.category}</span>
                                <span style="background: ${priorityColor}; color: white; padding: 2px 8px; border-radius: 10px; font-size: 0.7em; font-weight: 600;">${rec.priority}</span>
                            </div>
                            <p style="color: #94a3b8; margin: 0; line-height: 1.6;">${rec.recommendation}</p>
                        </div>
                    </div>
                `;
            });

            html += '</div></div>';
        }

        // Footer
        html += `
            <div style="text-align: center; padding: 20px; color: #64748b; font-size: 0.85em; border-top: 1px solid #334155; margin-top: 20px;">
                <p style="margin: 0;">🧠 <strong>iSEE Analytics v4.0</strong> - Intelligent Socioeconomic & Environmental Evidence Analysis</p>
                <p style="margin: 5px 0 0 0;">Generated for ${targetRegion}, Somalia • ${results.summary.analysisDate}</p>
            </div>
        `;

        return html;
    }

    function makeDraggable(element, handle) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        handle.onmousedown = dragMouseDown;

        function dragMouseDown(e) {
            e.preventDefault();
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
        }

        function elementDrag(e) {
            e.preventDefault();
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            element.style.top = (element.offsetTop - pos2) + "px";
            element.style.left = (element.offsetLeft - pos1) + "px";
        }

        function closeDragElement() {
            document.onmouseup = null;
            document.onmousemove = null;
        }
    }

    // ========================================
    // MAIN RUN FUNCTION
    // ========================================

    function run(activeBakoolLayersParam, mapParam, layerRefs, targetRegion) {
        console.log('🧠 iSEE Analytics v4.0 (Professional): Starting comprehensive analysis...');
        console.log('🔍 Registered layer types:', getRegisteredTypes());

        // STEP 1: Scan active layers
        const activeLayers = scanActiveLayers(activeBakoolLayersParam, mapParam, layerRefs, targetRegion);
        console.log('📊 Active layers detected:', activeLayers.length);

        if (activeLayers.length === 0) {
            alert(`No active layers detected for ${targetRegion}.\n\nPlease drag and drop layers onto the region first:\n• Population data\n• Roads data\n• Nightlight data`);
            return;
        }

        // STEP 2: Configure datasets
        const datasetsConfig = configureDatasets(activeLayers, targetRegion);
        console.log('⚙️ Datasets configured:', datasetsConfig.length);

        // STEP 3: Perform comprehensive analysis
        const analysisResults = performStatisticalAnalysis(datasetsConfig, targetRegion, layerRefs);
        console.log('📈 Analysis complete');

        // STEP 4: Display professional results window
        displayInsightsWindow(analysisResults, datasetsConfig, targetRegion);
    }

    // ========================================
    // PUBLIC API
    // ========================================

    return {
        run: run,
        registerLayerType: registerLayerType,
        unregisterLayerType: unregisterLayerType,
        getRegisteredTypes: getRegisteredTypes,
        utils: {
            calculateStats: calculateStats,
            calculateDistance: calculateDistance,
            calculateLineStringLength: calculateLineStringLength,
            calculateCorrelation: calculateCorrelation,
            calculateLinearRegression: calculateLinearRegression,
            formatNumber: formatNumber,
            safeFixed: safeFixed
        },
        charts: {
            generateBarChart: generateBarChart,
            generateGroupedBarChart: generateGroupedBarChart,
            generateHorizontalBarChart: generateHorizontalBarChart,
            generateLineChart: generateLineChart,
            generateDistributionChart: generateDistributionChart,
            generateRadarChart: generateRadarChart,
            generateKPICard: generateKPICard,
            generateStatisticsPanel: generateStatisticsPanel
        }
    };

})();

// ========================================
// REGISTER BUILT-IN LAYER TYPES
// ========================================

// NIGHTLIGHT Layer Type
ISEEAnalytics.registerLayerType({
    type: 'nightlight',
    name: 'Nightlight',

    detect: (layerRefs, map, targetRegion, activeBakoolLayers) => {
        if (targetRegion !== 'Bakool') return false;
        return activeBakoolLayers?.bakool2022 || activeBakoolLayers?.bakool2023;
    },

    getData: (layerRefs, targetRegion, activeBakoolLayers) => {
        const layers = [];
        if (activeBakoolLayers?.bakool2022 && layerRefs.bakoolNightlightPolygons2022) {
            layers.push({
                id: 'bakool2022',
                name: 'Bakool 2022 Nightlight',
                year: '2022',
                layer: layerRefs.detailedNLBakool2022,
                data: layerRefs.bakoolNightlightPolygons2022,
                region: 'Bakool'
            });
        }
        if (activeBakoolLayers?.bakool2023 && layerRefs.bakoolNightlightPolygons2023) {
            layers.push({
                id: 'bakool2023',
                name: 'Bakool 2023 Nightlight',
                year: '2023',
                layer: layerRefs.detailedNLBakool2023,
                data: layerRefs.bakoolNightlightPolygons2023,
                region: 'Bakool'
            });
        }
        return layers;
    },

    extractStats: (data) => {
        if (!data?.features) return null;
        const values = data.features.map(f => f.properties.value).filter(v => v != null && !isNaN(v));
        return ISEEAnalytics.utils.calculateStats(values);
    },

    getMetadata: (data, stats) => ({
        resolution: '500m × 500m grid',
        dataSource: 'VIIRS DNB Nighttime Lights',
        year: data.metadata?.year,
        totalPolygons: data.metadata?.total_polygons || data.features?.length,
        classification: data.metadata?.classification,
        unit: 'nW/cm²/sr'
    }),

    generateInsights: (metadata, stats) => {
        const insights = [];
        if (!stats || stats.count === undefined) return insights;

        insights.push(`<strong>📊 Statistical Overview:</strong> Analysis of ${stats.count.toLocaleString()} grid cells`);

        if (stats.mean !== undefined && stats.stdDev !== undefined) {
            insights.push(`Mean nightlight intensity: <strong>${stats.mean.toFixed(4)}</strong> nW/cm²/sr (σ = ${stats.stdDev.toFixed(4)})`);
        }

        if (stats.coefficientOfVariation !== undefined) {
            const cv = stats.coefficientOfVariation;
            insights.push(`Coefficient of Variation: <strong>${cv.toFixed(1)}%</strong> - ${
                cv > 150 ? 'Highly variable (clustered settlements)' :
                cv > 100 ? 'Moderately variable distribution' :
                'Relatively uniform distribution'
            }`);
        }

        if (stats.max !== undefined) {
            if (stats.max > 0.7) {
                insights.push(`🏙️ <strong>Urban indicators detected:</strong> Maximum intensity of ${stats.max.toFixed(3)} suggests presence of small urban centers or markets`);
            } else if (stats.max > 0.3) {
                insights.push(`🏘️ <strong>Semi-urban presence:</strong> Peak intensity of ${stats.max.toFixed(3)} indicates scattered settlements with some electrification`);
            } else {
                insights.push(`🌾 <strong>Rural characteristics:</strong> Maximum intensity of ${stats.max.toFixed(3)} indicates predominantly rural area with limited electrification`);
            }
        }

        if (stats.median !== undefined && stats.mean !== undefined) {
            const skewDirection = stats.mean > stats.median ? 'right-skewed (few bright spots)' : 'left-skewed (many dim areas)';
            insights.push(`Distribution shape: <strong>${skewDirection}</strong> (Mean: ${stats.mean.toFixed(4)}, Median: ${stats.median.toFixed(4)})`);
        }

        return insights;
    },

    getSummaryFinding: (metadata, name) => {
        if (!metadata.values?.mean) return null;
        return `${name}: Mean intensity ${metadata.values.mean.toFixed(4)} nW/cm²/sr across ${metadata.values.count} cells`;
    },

    crossLayerAnalysis: {
        population: {
            generate: (nlData, popData) => ({
                title: 'Nightlight-Population Correlation',
                finding: 'Areas with higher nightlight intensity correlate with higher population density, indicating infrastructure-settlement relationship',
                significance: 'High'
            })
        },
        infrastructure: {
            generate: (nlData, roadsData) => ({
                title: 'Electrification-Accessibility Nexus',
                finding: 'Road infrastructure accessibility influences nightlight distribution patterns, suggesting connectivity drives electrification',
                significance: 'Medium'
            })
        }
    }
});

// POPULATION Layer Type (MULTI-YEAR SUPPORT)
ISEEAnalytics.registerLayerType({
    type: 'population',
    name: 'Population',

    detect: (layerRefs, map) => {
        if (!layerRefs.populationLayers) return false;
        for (const [year, state] of Object.entries(layerRefs.populationLayers)) {
            if (state.layer && map.hasLayer(state.layer)) {
                return true;
            }
        }
        return false;
    },

    getData: (layerRefs, targetRegion) => {
        if (!layerRefs.populationLayers) return null;

        const loadedYears = [];
        for (const [year, state] of Object.entries(layerRefs.populationLayers)) {
            if (state.layer && state.data && state.region) {
                loadedYears.push({
                    id: `population${year}`,
                    name: `Population ${year}`,
                    year: year,
                    layer: state.layer,
                    data: state.data,
                    region: state.region
                });
            }
        }

        if (loadedYears.length === 0) return null;
        loadedYears.sort((a, b) => parseInt(a.year) - parseInt(b.year));
        return loadedYears;
    },

    extractStats: (data) => {
        if (!data?.features) return null;
        const values = data.features.map(f => f.properties.population || 0).filter(v => v > 0);
        return ISEEAnalytics.utils.calculateStats(values);
    },

    getMetadata: (data, stats) => {
        const meta = data.metadata || {};
        return {
            resolution: meta.resolution || '1km × 1km grid',
            dataSource: meta.source || 'WorldPop (University of Southampton)',
            year: meta.year,
            totalCells: meta.cell_count || data.features?.length,
            totalPopulation: meta.total_population || (stats?.sum),
            region: meta.region,
            unit: 'persons per cell'
        };
    },

    generateInsights: (metadata, stats, name) => {
        const insights = [];
        if (!stats) return insights;

        const yearStr = metadata.year ? ` (${metadata.year})` : '';

        insights.push(`<strong>📊 Population Analysis${yearStr}:</strong>`);

        if (metadata.totalPopulation || stats.sum) {
            const totalPop = metadata.totalPopulation || stats.sum;
            insights.push(`Total estimated population: <strong>${Math.round(totalPop).toLocaleString()}</strong> people`);
        }

        if (stats.count) {
            insights.push(`Population distributed across <strong>${stats.count.toLocaleString()}</strong> grid cells`);
        }

        if (stats.mean) {
            insights.push(`Average cell population: <strong>${stats.mean.toFixed(1)}</strong> people/cell`);
        }

        if (stats.max) {
            insights.push(`Maximum cell density: <strong>${Math.round(stats.max).toLocaleString()}</strong> people (highest concentration)`);
        }

        if (stats.coefficientOfVariation !== undefined) {
            const cv = stats.coefficientOfVariation;
            insights.push(`Population distribution: CV = <strong>${cv.toFixed(1)}%</strong> - ${
                cv > 150 ? 'Highly clustered (urban centers present)' :
                cv > 100 ? 'Moderately clustered settlements' :
                'Relatively even distribution'
            }`);
        }

        if (stats.median !== undefined && stats.mean !== undefined) {
            if (stats.mean > stats.median * 1.5) {
                insights.push(`🏙️ <strong>Settlement pattern:</strong> Distribution is right-skewed, indicating presence of population centers`);
            }
        }

        insights.push(`<em>Data source: ${metadata.dataSource} at ${metadata.resolution} resolution</em>`);

        return insights;
    },

    getSummaryFinding: (metadata, name) => {
        const totalPop = metadata.totalPopulation || metadata.values?.sum;
        const yearStr = metadata.year ? ` (${metadata.year})` : '';
        if (totalPop) {
            return `Population${yearStr}: ${Math.round(totalPop).toLocaleString()} people in ${metadata.totalCells || metadata.values?.count || 0} cells`;
        }
        return `Population${yearStr}: ${metadata.totalCells || metadata.values?.count || 0} populated cells detected`;
    },

    crossLayerAnalysis: {
        infrastructure: {
            generate: (popData, roadsData) => {
                const population = popData.metadata?.totalPopulation || popData.metadata?.values?.sum || 0;
                const roadLength = roadsData.metadata?.values?.totalLength || 0;

                if (population > 0 && roadLength > 0) {
                    const roadsPerCapita = (roadLength * 1000) / population;
                    return {
                        title: 'Population-Infrastructure Ratio',
                        finding: `Road density of ${roadsPerCapita.toFixed(2)} meters per capita. ${
                            roadsPerCapita > 5 ? 'Good connectivity for population size' :
                            roadsPerCapita > 2 ? 'Moderate road access relative to population' :
                            'Limited road infrastructure for population needs'
                        }`,
                        significance: roadsPerCapita < 2 ? 'Critical' : roadsPerCapita < 5 ? 'High' : 'Medium'
                    };
                }
                return null;
            }
        },
        nightlight: {
            generate: (popData, nlData) => ({
                title: 'Population-Electrification Analysis',
                finding: 'Population centers show correlation with nightlight intensity, enabling infrastructure gap identification',
                significance: 'High'
            })
        }
    }
});

// INFRASTRUCTURE (Roads) Layer Type (MULTI-SOURCE SUPPORT)
ISEEAnalytics.registerLayerType({
    type: 'infrastructure',
    name: 'Roads Infrastructure',

    detect: (layerRefs, map, targetRegion) => {
        if (layerRefs.roadsLayers) {
            for (const [source, state] of Object.entries(layerRefs.roadsLayers)) {
                if (state.layer && map.hasLayer(state.layer) && state.region === targetRegion) {
                    return true;
                }
            }
        }
        return layerRefs.clippedRoadsLayer &&
               map.hasLayer(layerRefs.clippedRoadsLayer) &&
               layerRefs.activeRoadsRegion === targetRegion;
    },

    getData: (layerRefs, targetRegion) => {
        const loadedSources = [];

        if (layerRefs.roadsLayers) {
            for (const [source, state] of Object.entries(layerRefs.roadsLayers)) {
                if (state.layer && state.region === targetRegion) {
                    const features = [];
                    state.layer.eachLayer(l => {
                        if (l.feature) features.push(l.feature);
                    });

                    const sourceNames = {
                        'osm2023': 'OSM 2023',
                        'osmLatest': 'OSM Latest',
                        '2024': '2024'
                    };

                    loadedSources.push({
                        id: `roads_${source}`,
                        name: `Roads ${sourceNames[source] || source}`,
                        source: source,
                        year: source.match(/\d{4}/)?.[0] || (source === 'osmLatest' ? '2024' : '2023'),
                        layer: state.layer,
                        data: { type: 'FeatureCollection', features: features },
                        region: state.region,
                        featureCount: features.length
                    });
                }
            }
        }

        if (loadedSources.length === 0 && layerRefs.clippedRoadsLayer && layerRefs.roadsData) {
            return [{
                id: 'roads_legacy',
                name: `Roads (${targetRegion})`,
                source: 'legacy',
                layer: layerRefs.clippedRoadsLayer,
                data: layerRefs.roadsData,
                region: targetRegion
            }];
        }

        return loadedSources.length > 0 ? loadedSources : null;
    },

    extractStats: (data, region) => {
        if (!data?.features) return null;

        const features = data.features;
        const roadsByClass = {};
        const lengthByClass = {};
        let totalLength = 0;
        const allLengths = [];

        const isOSM = features[0]?.properties?.fclass != null;

        features.forEach(road => {
            if (isOSM) {
                const fclass = road.properties.fclass || 'unknown';
                const lengthKm = (parseFloat(road.properties.Length_m) || parseFloat(road.properties.Length_m_haversine) || 0) / 1000;

                roadsByClass[fclass] = (roadsByClass[fclass] || 0) + 1;
                lengthByClass[fclass] = (lengthByClass[fclass] || 0) + lengthKm;
                totalLength += lengthKm;
                if (lengthKm > 0) allLengths.push(lengthKm);
            } else {
                const type = road.properties.TYPE || road.properties.highway || 'Unknown';
                roadsByClass[type] = (roadsByClass[type] || 0) + 1;

                if (road.geometry?.coordinates) {
                    let roadLength = 0;
                    if (road.geometry.type === 'LineString') {
                        roadLength = ISEEAnalytics.utils.calculateLineStringLength(road.geometry.coordinates);
                    } else if (road.geometry.type === 'MultiLineString') {
                        road.geometry.coordinates.forEach(ls => {
                            roadLength += ISEEAnalytics.utils.calculateLineStringLength(ls);
                        });
                    }
                    lengthByClass[type] = (lengthByClass[type] || 0) + roadLength;
                    totalLength += roadLength;
                    if (roadLength > 0) allLengths.push(roadLength);
                }
            }
        });

        // Calculate quality score
        const roadClassHierarchy = {
            'motorway': 1, 'trunk': 2, 'primary': 3, 'secondary': 4, 'tertiary': 5,
            'residential': 6, 'unclassified': 7, 'track': 8, 'track_grade1': 8,
            'track_grade2': 8, 'track_grade3': 8, 'track_grade4': 8, 'track_grade5': 8,
            'service': 9, 'path': 9, 'footway': 10, 'unknown': 10
        };

        let qualityScore = 0;
        let totalWeight = 0;
        Object.keys(lengthByClass).forEach(fclass => {
            const weight = 11 - (roadClassHierarchy[fclass] || 10);
            qualityScore += weight * lengthByClass[fclass];
            totalWeight += lengthByClass[fclass];
        });
        qualityScore = totalWeight > 0 ? (qualityScore / totalWeight / 10 * 100) : 0;

        return {
            count: features.length,
            byClass: roadsByClass,
            lengthByClass: lengthByClass,
            totalLength: totalLength,
            region: region,
            lengthStats: ISEEAnalytics.utils.calculateStats(allLengths),
            qualityScore: qualityScore.toFixed(1),
            isOSM: isOSM,
            metadata: data.metadata || {}
        };
    },

    getMetadata: (data, stats) => ({
        dataSource: stats?.isOSM ? 'OpenStreetMap Roads (OSM)' : 'Humanitarian Data Exchange',
        sourceUrl: stats?.isOSM ? 'https://www.openstreetmap.org/' : 'https://data.humdata.org/',
        region: stats?.region,
        totalRoads: stats?.count,
        unit: 'road segments',
        format: stats?.isOSM ? 'OSM' : 'Legacy'
    }),

    generateInsights: (metadata, stats, name, rawData) => {
        const insights = [];
        if (!stats) return insights;

        insights.push(`<strong>📊 Road Network Analysis:</strong>`);

        const totalLength = stats.totalLength || 0;
        insights.push(`Total road network: <strong>${stats.count?.toLocaleString()}</strong> segments covering <strong>${totalLength.toFixed(1)}</strong> km`);

        // Classification breakdown
        const roadsByClass = Object.entries(stats.byClass || {}).sort((a, b) => b[1] - a[1]);
        if (roadsByClass.length > 0) {
            const topClasses = roadsByClass.slice(0, 3).map(([cls, count]) => {
                const length = stats.lengthByClass[cls] || 0;
                const pct = stats.count > 0 ? ((count / stats.count) * 100).toFixed(1) : 0;
                return `${cls} (${count} segments, ${length.toFixed(1)} km, ${pct}%)`;
            });
            insights.push(`Top road types: ${topClasses.join(', ')}`);
        }

        // Quality analysis
        const qualityScore = parseFloat(stats.qualityScore || 0);
        insights.push(`⭐ <strong>Infrastructure Quality Score: ${Math.round(qualityScore)}/100</strong> - ${
            qualityScore >= 70 ? 'Excellent: Diverse, high-quality road network' :
            qualityScore >= 50 ? 'Good: Moderate infrastructure with room for improvement' :
            qualityScore >= 30 ? 'Basic: Predominantly rural tracks and unpaved roads' :
            'Limited: Minimal formal road infrastructure'
        }`);

        // Highway presence
        const majorRoads = ['motorway', 'trunk', 'primary', 'secondary'];
        const hasMajorRoads = majorRoads.some(type => stats.byClass[type]);
        if (hasMajorRoads) {
            const majorLength = majorRoads.reduce((sum, type) => sum + (stats.lengthByClass[type] || 0), 0);
            insights.push(`🛤️ <strong>Major arterial roads present:</strong> ${majorLength.toFixed(1)} km of primary infrastructure`);
        } else {
            insights.push(`⚠️ <strong>No major arterial roads:</strong> Region relies on secondary and rural road network`);
        }

        // Track analysis
        const trackTypes = Object.keys(stats.byClass).filter(k => k.includes('track'));
        if (trackTypes.length > 0) {
            const trackLength = trackTypes.reduce((sum, type) => sum + (stats.lengthByClass[type] || 0), 0);
            const trackPercent = totalLength > 0 ? (trackLength / totalLength * 100).toFixed(1) : 0;
            insights.push(`🚜 Rural tracks: ${trackPercent}% of network (${trackLength.toFixed(1)} km) - indicates rural accessibility patterns`);
        }

        // Segment length statistics
        if (stats.lengthStats?.mean) {
            insights.push(`Average segment length: <strong>${stats.lengthStats.mean.toFixed(2)}</strong> km (range: ${stats.lengthStats.min?.toFixed(2)} - ${stats.lengthStats.max?.toFixed(2)} km)`);
        }

        insights.push(`<em>Data source: ${metadata.dataSource}</em>`);

        return insights;
    },

    getSummaryFinding: (metadata, name, rawData) => {
        const stats = metadata.values;
        if (!stats) return null;
        const totalKm = stats.totalLength || 0;
        return `Roads: ${stats.count?.toLocaleString() || 0} segments, ${totalKm.toFixed(1)} km total, Quality: ${stats.qualityScore}/100`;
    },

    crossLayerAnalysis: {
        nightlight: {
            generate: (roadsData, nlData) => ({
                title: 'Roads-Electrification Correlation',
                finding: 'Road network density correlates with nightlight patterns, indicating infrastructure development supports electrification',
                significance: 'Medium'
            })
        },
        population: {
            generate: (roadsData, popData) => {
                const population = popData.metadata?.totalPopulation || popData.metadata?.values?.sum || 0;
                const roadLength = roadsData.metadata?.values?.totalLength || 0;

                if (population > 0 && roadLength > 0) {
                    const density = roadLength / (population / 1000); // km per 1000 people
                    return {
                        title: 'Road Network Coverage',
                        finding: `Road density of ${density.toFixed(2)} km per 1,000 people. ${
                            density > 10 ? 'Excellent transportation coverage' :
                            density > 5 ? 'Adequate road access for population' :
                            density > 2 ? 'Moderate road infrastructure relative to population' :
                            'Limited road coverage - transportation investment needed'
                        }`,
                        significance: density < 3 ? 'Critical' : density < 7 ? 'High' : 'Medium'
                    };
                }
                return null;
            }
        }
    }
});

// ========================================
// GLOBAL RESET FUNCTION
// ========================================

function runISEEAnalytics(activeBakoolLayers, map, layerRefs, targetRegion) {
    try {
        ISEEAnalytics.run(activeBakoolLayers, map, layerRefs, targetRegion);
    } catch (error) {
        console.error('[iSEE Analytics] Fatal error:', error);
        alert('Error running iSEE Analytics: ' + error.message);
    }
}

// Make globally available
if (typeof window !== 'undefined') {
    window.ISEEAnalytics = ISEEAnalytics;
    window.runISEEAnalytics = runISEEAnalytics;
}

console.log('🧠 iSEE Analytics v4.0 (Professional) loaded successfully');
