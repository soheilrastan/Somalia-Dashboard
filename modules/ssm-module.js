/**
 * SSM Module (Symbology Standardization Method)
 * ==============================================
 * Centralized module for displaying methodology documentation popups.
 *
 * This module provides a scalable way to show methodology documentation
 * for any layer symbology in the dashboard. Each methodology is registered
 * with a unique ID and its content is stored in a registry.
 *
 * Usage:
 *   SSMModule.show('roads');           // Show Roads methodology
 *   SSMModule.show('nightlight');      // Show Nightlight methodology
 *   SSMModule.show('mpi');             // Show MPI methodology
 *   SSMModule.register('customId', {   // Register new methodology
 *       title: 'My Title',
 *       icon: '📊',
 *       accentColor: '#f97316',
 *       sections: [...]
 *   });
 *
 * @module SSMModule
 * @version 1.0
 * @author Geo-Insights Laboratory, ESCWA, United Nations
 */

console.log('[SSMModule] Loading SSM (Symbology Standardization Method) Module...');

var SSMModule = (function() {
    'use strict';

    // ========================================
    // METHODOLOGY REGISTRY
    // ========================================
    // Each methodology has: id, title, icon, accentColor, sections
    // Sections can be: problem, solution, table, infoBox, bridging, dataSource, benefits, custom

    const methodologies = {};

    // ========================================
    // DEFAULT STYLES
    // ========================================
    const defaultStyles = {
        modal: {
            background: 'rgba(0, 0, 0, 0.9)',
            zIndex: 20000
        },
        content: {
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            borderRadius: '16px',
            maxWidth: '850px',
            maxHeight: '85vh'
        }
    };

    // ========================================
    // SECTION RENDERERS
    // ========================================

    /**
     * Render a problem section (red themed)
     */
    function renderProblemSection(section) {
        return `
            <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 8px; padding: 15px; margin-bottom: 20px;">
                <h3 style="margin: 0 0 10px 0; color: #f87171; font-size: 1.1em;">📋 ${section.title || 'The Problem'}</h3>
                <p style="margin: 0; color: #cbd5e1; line-height: 1.6; font-size: 0.9em;">
                    ${section.content}
                </p>
            </div>
        `;
    }

    /**
     * Render a solution section (green themed)
     */
    function renderSolutionSection(section) {
        return `
            <div style="background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 8px; padding: 15px; margin-bottom: 20px;">
                <h3 style="margin: 0 0 10px 0; color: #22c55e; font-size: 1.1em;">✅ ${section.title || 'The Solution'}</h3>
                <p style="margin: 0; color: #cbd5e1; line-height: 1.6; font-size: 0.9em;">
                    ${section.content}
                </p>
            </div>
        `;
    }

    /**
     * Render a data table with headers and rows
     */
    function renderTableSection(section) {
        const accentColor = section.accentColor || '#fbbf24';
        let tableHTML = `
            <div style="margin-bottom: 20px;">
                <h3 style="margin: 0 0 10px 0; color: ${accentColor}; font-size: 1em;">${section.icon || '📊'} ${section.title}</h3>
                <table style="width: 100%; border-collapse: collapse; font-size: ${section.fontSize || '0.85em'};">
                    <thead>
                        <tr style="background: rgba(${hexToRgb(accentColor)}, 0.2);">
        `;

        // Render headers
        section.headers.forEach(header => {
            tableHTML += `<th style="padding: ${section.compact ? '6px' : '10px'}; text-align: ${header.align || 'left'}; border-bottom: 2px solid ${accentColor}; color: ${accentColor};">${header.label}</th>`;
        });

        tableHTML += `</tr></thead><tbody style="color: #e2e8f0;">`;

        // Render rows
        section.rows.forEach((row, idx) => {
            const bgStyle = idx % 2 === 0 ? 'background: rgba(0,0,0,0.2);' : '';
            tableHTML += `<tr style="${bgStyle}">`;
            row.forEach((cell, cellIdx) => {
                const align = section.headers[cellIdx]?.align || 'left';
                tableHTML += `<td style="padding: ${section.compact ? '6px' : '8px'}; border-bottom: 1px solid #334155; text-align: ${align};">${cell}</td>`;
            });
            tableHTML += `</tr>`;
        });

        tableHTML += `</tbody></table></div>`;
        return tableHTML;
    }

    /**
     * Render an info box (customizable color)
     */
    function renderInfoBoxSection(section) {
        const color = section.color || '#60a5fa';
        const rgbColor = hexToRgb(color);
        return `
            <div style="background: rgba(${rgbColor}, 0.1); border: 1px solid rgba(${rgbColor}, 0.3); border-radius: 8px; padding: 15px; margin-bottom: 20px;">
                <h3 style="margin: 0 0 10px 0; color: ${color}; font-size: 1em;">${section.icon || 'ℹ️'} ${section.title}</h3>
                <div style="color: #cbd5e1; line-height: 1.6; font-size: 0.9em;">
                    ${section.content}
                </div>
            </div>
        `;
    }

    /**
     * Render a bridging/mapping table (two columns with mappings)
     */
    function renderBridgingSection(section) {
        const color = section.color || '#60a5fa';
        const rgbColor = hexToRgb(color);

        let mappingsHTML = '';
        const columns = section.columns || 2;
        const mappingsPerColumn = Math.ceil(section.mappings.length / columns);

        mappingsHTML += `<div style="display: grid; grid-template-columns: repeat(${columns}, 1fr); gap: 10px; font-size: 0.8em; font-family: monospace;">`;

        for (let col = 0; col < columns; col++) {
            mappingsHTML += `<div style="color: #94a3b8;">`;
            const start = col * mappingsPerColumn;
            const end = Math.min(start + mappingsPerColumn, section.mappings.length);

            for (let i = start; i < end; i++) {
                const m = section.mappings[i];
                mappingsHTML += `<div>${m.from} → <span style="color: ${m.toColor};">${m.to}</span>`;
                if (m.note) {
                    mappingsHTML += ` <em style="color: #64748b;">(${m.note})</em>`;
                }
                mappingsHTML += `</div>`;
            }
            mappingsHTML += `</div>`;
        }
        mappingsHTML += `</div>`;

        return `
            <div style="background: rgba(${rgbColor}, 0.1); border: 1px solid rgba(${rgbColor}, 0.3); border-radius: 8px; padding: 15px; margin-bottom: 20px;">
                <h3 style="margin: 0 0 10px 0; color: ${color}; font-size: 1em;">${section.icon || '🔗'} ${section.title}</h3>
                ${mappingsHTML}
                ${section.note ? `<p style="margin: 10px 0 0 0; color: #94a3b8; font-size: 0.8em;"><strong style="color: #fbbf24;">Note:</strong> ${section.note}</p>` : ''}
            </div>
        `;
    }

    /**
     * Render a data sources section
     */
    function renderDataSourceSection(section) {
        const color = section.color || '#a78bfa';
        const rgbColor = hexToRgb(color);

        let sourcesHTML = '';
        section.sources.forEach(source => {
            sourcesHTML += `<div style="margin-bottom: 10px;"><strong style="color: #fbbf24;">${source.name}:</strong> ${source.description}</div>`;
            if (source.links) {
                source.links.forEach(link => {
                    sourcesHTML += `<div style="margin-left: 15px; color: #94a3b8;">• <a href="${link.url}" target="_blank" style="color: #60a5fa; text-decoration: none;">${link.label}</a></div>`;
                });
            }
            if (source.items) {
                source.items.forEach(item => {
                    sourcesHTML += `<div style="margin-left: 15px; color: #94a3b8;">• ${item}</div>`;
                });
            }
        });

        return `
            <div style="background: rgba(${rgbColor}, 0.1); border: 1px solid rgba(${rgbColor}, 0.3); border-radius: 8px; padding: 15px; margin-bottom: 20px;">
                <h3 style="margin: 0 0 10px 0; color: ${color}; font-size: 1em;">📁 ${section.title || 'Data Sources'}</h3>
                <div style="font-size: 0.85em; color: #cbd5e1; line-height: 1.8;">
                    ${sourcesHTML}
                </div>
            </div>
        `;
    }

    /**
     * Render a benefits section
     */
    function renderBenefitsSection(section) {
        let benefitsHTML = '';
        section.items.forEach(item => {
            benefitsHTML += `<li><strong style="color: #22c55e;">${item.label}:</strong> ${item.description}</li>`;
        });

        return `
            <div style="background: rgba(34, 197, 94, 0.05); border-left: 4px solid #22c55e; padding: 15px; margin-bottom: 15px;">
                <h3 style="margin: 0 0 10px 0; color: #22c55e; font-size: 1em;">✨ ${section.title || 'Benefits'}</h3>
                <ul style="margin: 0; padding-left: 20px; color: #cbd5e1; font-size: 0.85em; line-height: 1.8;">
                    ${benefitsHTML}
                </ul>
            </div>
        `;
    }

    /**
     * Render custom HTML content
     */
    function renderCustomSection(section) {
        return `
            <div style="margin-bottom: 20px;">
                ${section.html}
            </div>
        `;
    }

    /**
     * Render a gradient legend section (for continuous data like nightlight)
     */
    function renderGradientLegendSection(section) {
        const color = section.color || '#a78bfa';
        const rgbColor = hexToRgb(color);

        let legendHTML = `<div style="display: flex; flex-direction: column; gap: 8px;">`;

        // Add gradient bar if provided
        if (section.gradient) {
            legendHTML += `
                <div style="height: 20px; border-radius: 4px; background: linear-gradient(to right, ${section.gradient.join(', ')}); margin-bottom: 8px;"></div>
            `;
        }

        // Add legend items
        section.items.forEach(item => {
            legendHTML += `
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="color: ${item.color}; font-size: 1.2em;">●</span>
                    <span style="color: #e2e8f0;">${item.range}</span>
                    <span style="color: #94a3b8; font-size: 0.85em;">- ${item.description}</span>
                </div>
            `;
        });

        legendHTML += `</div>`;

        return `
            <div style="background: rgba(${rgbColor}, 0.1); border: 1px solid rgba(${rgbColor}, 0.3); border-radius: 8px; padding: 15px; margin-bottom: 20px;">
                <h3 style="margin: 0 0 15px 0; color: ${color}; font-size: 1em;">${section.icon || '🎨'} ${section.title}</h3>
                ${legendHTML}
                ${section.note ? `<p style="margin: 15px 0 0 0; color: #94a3b8; font-size: 0.8em;">${section.note}</p>` : ''}
            </div>
        `;
    }

    /**
     * Render section based on type
     */
    function renderSection(section) {
        switch (section.type) {
            case 'problem':
                return renderProblemSection(section);
            case 'solution':
                return renderSolutionSection(section);
            case 'table':
                return renderTableSection(section);
            case 'infoBox':
                return renderInfoBoxSection(section);
            case 'bridging':
                return renderBridgingSection(section);
            case 'dataSource':
                return renderDataSourceSection(section);
            case 'benefits':
                return renderBenefitsSection(section);
            case 'gradientLegend':
                return renderGradientLegendSection(section);
            case 'custom':
                return renderCustomSection(section);
            default:
                console.warn(`[SSMModule] Unknown section type: ${section.type}`);
                return '';
        }
    }

    // ========================================
    // HELPER FUNCTIONS
    // ========================================

    /**
     * Convert hex color to RGB values
     */
    function hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ?
            `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` :
            '255, 255, 255';
    }

    // ========================================
    // MAIN FUNCTIONS
    // ========================================

    /**
     * Register a new methodology
     * @param {string} id - Unique identifier for the methodology
     * @param {object} config - Methodology configuration
     */
    function register(id, config) {
        if (!id || !config) {
            console.error('[SSMModule] Invalid registration: id and config are required');
            return false;
        }

        methodologies[id] = {
            id: id,
            title: config.title || 'Untitled Methodology',
            icon: config.icon || '📄',
            accentColor: config.accentColor || '#f97316',
            subtitle: config.subtitle || 'Geo-Insights Laboratory | ESCWA, United Nations',
            version: config.version || '1.0',
            sections: config.sections || []
        };

        console.log(`[SSMModule] Registered methodology: ${id}`);
        return true;
    }

    /**
     * Show a methodology modal
     * @param {string} id - Methodology ID to display
     */
    function show(id) {
        const methodology = methodologies[id];

        if (!methodology) {
            console.error(`[SSMModule] Methodology not found: ${id}`);
            alert(`Methodology "${id}" not found. Please ensure it is registered.`);
            return false;
        }

        // Remove existing modal if any
        const existing = document.getElementById('ssmModal');
        if (existing) existing.remove();

        // Create modal backdrop
        const modal = document.createElement('div');
        modal.id = 'ssmModal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: ${defaultStyles.modal.background};
            z-index: ${defaultStyles.modal.zIndex};
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        // Create modal content
        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            background: ${defaultStyles.content.background};
            border-radius: ${defaultStyles.content.borderRadius};
            padding: 30px;
            max-width: ${defaultStyles.content.maxWidth};
            width: 95%;
            max-height: ${defaultStyles.content.maxHeight};
            overflow-y: auto;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.9);
            border: 2px solid ${methodology.accentColor};
            color: white;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;

        // Render sections
        let sectionsHTML = '';
        methodology.sections.forEach(section => {
            sectionsHTML += renderSection(section);
        });

        // Build modal HTML
        modalContent.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 2px solid ${methodology.accentColor}; padding-bottom: 15px;">
                <h2 style="margin: 0; font-size: 1.5em; color: ${methodology.accentColor};">
                    ${methodology.icon} ${methodology.title}
                </h2>
                <button id="closeSSMModal" style="
                    background: rgba(239, 68, 68, 0.2);
                    border: 1px solid rgba(239, 68, 68, 0.5);
                    color: #f87171;
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    cursor: pointer;
                    font-size: 1.2em;
                    transition: all 0.2s;
                ">✕</button>
            </div>

            <div style="color: #94a3b8; font-size: 0.85em; margin-bottom: 20px;">
                <strong style="color: #60a5fa;">${methodology.subtitle}</strong> | January 2026
            </div>

            ${sectionsHTML}

            <div style="text-align: center; color: #64748b; font-size: 0.75em; margin-top: 20px; padding-top: 15px; border-top: 1px solid #334155;">
                SSM v${methodology.version} | Geo-Insights Laboratory | ESCWA, United Nations | January 2026
            </div>
        `;

        modal.appendChild(modalContent);
        document.body.appendChild(modal);

        // Event handlers
        document.getElementById('closeSSMModal').addEventListener('click', function() {
            modal.remove();
        });

        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                modal.remove();
            }
        });

        const escHandler = function(e) {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);

        console.log(`[SSMModule] Displaying methodology: ${id}`);
        return true;
    }

    /**
     * Check if a methodology is registered
     * @param {string} id - Methodology ID
     */
    function has(id) {
        return !!methodologies[id];
    }

    /**
     * Get list of all registered methodology IDs
     */
    function list() {
        return Object.keys(methodologies);
    }

    /**
     * Get methodology config (for debugging/inspection)
     * @param {string} id - Methodology ID
     */
    function get(id) {
        return methodologies[id] || null;
    }

    // ========================================
    // REGISTER BUILT-IN METHODOLOGIES
    // ========================================

    // Roads SSM
    register('roads', {
        title: 'Symbology Standardization Method (SSM)',
        icon: '🛣️',
        accentColor: '#f97316',
        subtitle: 'Geo-Insights Laboratory',
        version: '1.0',
        sections: [
            {
                type: 'problem',
                title: 'The Problem',
                content: `OpenStreetMap road data for Somalia comes from multiple years (2023, 2024, 2026) with <strong style="color: #fbbf24;">inconsistent attribute schemas</strong>.
                    Different years use different attribute names (<code style="background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 3px;">fclass</code> vs <code style="background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 3px;">highway</code>)
                    and include <code style="background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 3px;">_link</code> variants that fragment visual display.`
            },
            {
                type: 'table',
                title: 'Schema Variations Across Years',
                icon: '📊',
                accentColor: '#fbbf24',
                headers: [
                    { label: 'Year', align: 'left' },
                    { label: 'Attribute', align: 'left' },
                    { label: 'Example Values', align: 'left' }
                ],
                rows: [
                    ['2023', '<code style="color: #60a5fa;">fclass</code>', 'trunk, primary, secondary, track_grade1'],
                    ['2024', '<code style="color: #60a5fa;">highway</code>', 'trunk, primary, residential, service'],
                    ['2026', '<code style="color: #60a5fa;">highway</code>', 'trunk_link, secondary_link, footway']
                ]
            },
            {
                type: 'solution',
                title: 'The Solution: Bridging Table Architecture',
                content: `We implemented a <strong style="color: #22c55e;">centralized Road Symbology Module</strong> that acts as a single source of truth for all road styling.
                    All raw attribute values are mapped through a <strong style="color: #fbbf24;">bridging table</strong> to 12 standardized classes with consistent colors and styles.`
            },
            {
                type: 'table',
                title: '12 Unified Standard Classes',
                icon: '🎨',
                accentColor: '#f97316',
                compact: true,
                fontSize: '0.8em',
                headers: [
                    { label: 'Class', align: 'left' },
                    { label: 'Color', align: 'center' },
                    { label: 'Weight', align: 'center' },
                    { label: 'Style', align: 'center' },
                    { label: 'Description', align: 'left' }
                ],
                rows: [
                    ['<strong>Trunk</strong>', '<span style="display: inline-block; width: 40px; height: 4px; background: #7c2d12; border-radius: 2px;"></span>', '4.5', 'Solid', 'Major Highways'],
                    ['<strong>Primary</strong>', '<span style="display: inline-block; width: 40px; height: 4px; background: #dc2626; border-radius: 2px;"></span>', '4.0', 'Solid', 'Primary Roads'],
                    ['<strong>Secondary</strong>', '<span style="display: inline-block; width: 40px; height: 3px; background: #f97316; border-radius: 2px;"></span>', '3.0', 'Solid', 'Secondary Roads'],
                    ['<strong>Tertiary</strong>', '<span style="display: inline-block; width: 40px; height: 2.5px; background: #fbbf24; border-radius: 2px;"></span>', '2.5', 'Solid', 'Tertiary Roads'],
                    ['<strong>Residential</strong>', '<span style="display: inline-block; width: 40px; height: 2px; background: #60a5fa; border-radius: 2px;"></span>', '2.0', 'Solid', 'Residential Roads'],
                    ['<strong>Service</strong>', '<span style="display: inline-block; width: 40px; height: 1.5px; background: #cbd5e1; border-radius: 2px;"></span>', '1.5', 'Solid', 'Driveways, Parking'],
                    ['<strong>Unclassified</strong>', '<span style="display: inline-block; width: 40px; height: 1.5px; background: #94a3b8; border-radius: 2px;"></span>', '1.5', 'Solid', 'Minor Roads'],
                    ['<strong>Track</strong>', '<span style="display: inline-block; width: 40px; height: 1.5px; background: repeating-linear-gradient(90deg, #78716c 0, #78716c 4px, transparent 4px, transparent 8px); border-radius: 2px;"></span>', '1.5', 'Dotted', 'Unpaved/Rural'],
                    ['<strong>Path/Footway</strong>', '<span style="display: inline-block; width: 40px; height: 1px; background: repeating-linear-gradient(90deg, #a8a29e 0, #a8a29e 3px, transparent 3px, transparent 6px); border-radius: 2px;"></span>', '1.0', 'Dotted', 'Walking Trails, Sidewalks'],
                    ['<strong>Pedestrian</strong>', '<span style="display: inline-block; width: 40px; height: 1px; background: repeating-linear-gradient(90deg, #d4d4d8 0, #d4d4d8 3px, transparent 3px, transparent 6px); border-radius: 2px;"></span>', '1.0', 'Dotted', 'Pedestrian Zones']
                ]
            },
            {
                type: 'bridging',
                title: 'Bridging Table (Attribute Mapping)',
                icon: '🔗',
                color: '#60a5fa',
                columns: 2,
                mappings: [
                    { from: 'trunk', to: 'Trunk', toColor: '#7c2d12' },
                    { from: 'trunk_link', to: 'Trunk', toColor: '#7c2d12', note: 'aggregated' },
                    { from: 'primary', to: 'Primary', toColor: '#dc2626' },
                    { from: 'primary_link', to: 'Primary', toColor: '#dc2626', note: 'aggregated' },
                    { from: 'secondary', to: 'Secondary', toColor: '#f97316' },
                    { from: 'secondary_link', to: 'Secondary', toColor: '#f97316' },
                    { from: 'tertiary', to: 'Tertiary', toColor: '#fbbf24' },
                    { from: 'residential', to: 'Residential', toColor: '#60a5fa' },
                    { from: 'track', to: 'Track', toColor: '#78716c' },
                    { from: 'track_grade1', to: 'Track', toColor: '#78716c', note: 'unified' },
                    { from: 'track_grade2', to: 'Track', toColor: '#78716c' },
                    { from: 'footway', to: 'Footway', toColor: '#a8a29e' }
                ],
                note: 'Link roads (<code style="background: rgba(0,0,0,0.3); padding: 1px 4px; border-radius: 2px;">_link</code>) are aggregated into their parent class for visual simplicity.'
            },
            {
                type: 'dataSource',
                title: 'Data Sources',
                color: '#a78bfa',
                sources: [
                    {
                        name: 'OpenStreetMap (OSM)',
                        description: 'Primary source for all road network data',
                        links: [
                            { label: 'HDX Somalia Roads Dataset', url: 'https://data.humdata.org/dataset/hotosm_som_roads' }
                        ],
                        items: ['Extracted via Humanitarian OpenStreetMap Team (HOT)']
                    },
                    {
                        name: 'Versions Available',
                        description: '',
                        items: [
                            '2023 (Historical baseline)',
                            '2024 (Mid-term update)',
                            '2026 (Latest available)'
                        ]
                    }
                ]
            },
            {
                type: 'benefits',
                title: 'Benefits of SSM',
                items: [
                    { label: 'Consistency', description: 'Same class = same color across all years' },
                    { label: 'Maintainability', description: 'Change color once, applies everywhere' },
                    { label: 'Extensibility', description: 'Add new classes without touching layer code' },
                    { label: 'Visual Clarity', description: 'Dotted lines distinguish unpaved from paved roads' }
                ]
            }
        ]
    });

    // Nightlight SSM (placeholder - can be expanded)
    register('nightlight', {
        title: 'Nightlight Intensity Classification (SSM)',
        icon: '💡',
        accentColor: '#a855f7',
        subtitle: 'Geo-Insights Laboratory',
        version: '1.0',
        sections: [
            {
                type: 'problem',
                title: 'The Problem',
                content: `VIIRS nighttime light data provides continuous radiance values in <strong style="color: #fbbf24;">NanoWatts/sr/cm²</strong>.
                    Raw values are difficult to interpret without meaningful classification thresholds that relate to human activity patterns.`
            },
            {
                type: 'solution',
                title: 'The Solution: Radiance Classification',
                content: `We developed an <strong style="color: #22c55e;">8-tier classification system</strong> that maps radiance values to human activity levels,
                    from very low background light to major industrial activity.`
            },
            {
                type: 'gradientLegend',
                title: 'Intensity Classification',
                icon: '🎨',
                color: '#a855f7',
                gradient: ['#1e1b4b', '#4c1d95', '#7c3aed', '#a78bfa', '#e879f9', '#fb923c', '#fde047', '#fef9c3'],
                items: [
                    { color: '#1e1b4b', range: '< 0.1', description: 'Very Low (background)' },
                    { color: '#4c1d95', range: '0.1 - 2', description: 'Low (sparse settlement)' },
                    { color: '#7c3aed', range: '2 - 4', description: 'Rural (villages)' },
                    { color: '#a78bfa', range: '4 - 6', description: 'Low Urban (small towns)' },
                    { color: '#e879f9', range: '6 - 10', description: 'Urban (town centers)' },
                    { color: '#fb923c', range: '10 - 50', description: 'High Urban (city cores)' },
                    { color: '#fde047', range: '50 - 100', description: 'Commercial/Industrial' },
                    { color: '#fef9c3', range: '> 100', description: 'Major Industrial (e.g., Refineries)' }
                ],
                note: '<strong style="color: #fbbf24;">Unit:</strong> NanoWatts/sr/cm² - a measure of radiance where NanoWatts is radiant power (10⁻⁹ watts), per Steradian (3D solid angle), per Square Centimetre (measurement area).'
            },
            {
                type: 'dataSource',
                title: 'Data Sources',
                color: '#a78bfa',
                sources: [
                    {
                        name: 'VIIRS DNB',
                        description: 'Visible Infrared Imaging Radiometer Suite Day/Night Band',
                        items: [
                            'NASA/NOAA Suomi NPP satellite',
                            '500m spatial resolution',
                            'Annual composites (cloud-free)'
                        ]
                    },
                    {
                        name: 'Processing',
                        description: '',
                        items: [
                            'Earth Observation Group (EOG)',
                            'Stray light corrected',
                            'Background noise removed'
                        ]
                    }
                ]
            },
            {
                type: 'benefits',
                title: 'Benefits of Classification',
                items: [
                    { label: 'Interpretability', description: 'Raw values become meaningful activity indicators' },
                    { label: 'Comparability', description: 'Consistent thresholds across years and regions' },
                    { label: 'Visual Hierarchy', description: 'Color gradient intuitively shows intensity progression' },
                    { label: 'Analysis Ready', description: 'Classes suitable for statistical summaries' }
                ]
            }
        ]
    });

    // ========================================
    // PUBLIC API
    // ========================================
    return {
        register,
        show,
        has,
        list,
        get
    };

})();

// Global function for onclick handlers
window.openSSMModal = function(methodologyId) {
    methodologyId = methodologyId || 'roads';  // Default to roads for backward compatibility
    SSMModule.show(methodologyId);
};

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SSMModule;
}

console.log('[SSMModule] SSM Module loaded. Registered methodologies:', SSMModule.list());
