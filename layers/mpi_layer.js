/**
 * MPI (Multidimensional Poverty Index) LAYER MODULE
 * Independent, reusable module for MPI visualization
 *
 * Features:
 * - Regional choropleth styling
 * - Gradient color scheme
 * - Checkbox toggle
 * - Interactive popups
 *
 * Version: 1.0
 * Date: 2026-01-21
 */

const MPILayer = {
    // State management
    state: {
        layer: null,
        isActive: false
    },

    // Configuration
    config: {
        // MPI color gradient (green = low/better, red = high/worse)
        getColor(mpi) {
            if (mpi >= 90) return '#7f1d1d';  // Very high
            if (mpi >= 80) return '#991b1b';
            if (mpi >= 70) return '#b91c1c';
            if (mpi >= 60) return '#dc2626';
            if (mpi >= 50) return '#f97316';  // Medium
            if (mpi >= 40) return '#f59e0b';
            if (mpi >= 30) return '#eab308';
            if (mpi >= 20) return '#84cc16';
            if (mpi >= 10) return '#22c55e';
            return '#047857';                   // Low (best)
        }
    },

    /**
     * Initialize MPI layer
     * @param {object} options - Configuration options
     * @returns {object} - {success: bool, message: str}
     */
    init(options = {}) {
        console.log('[MPILayer] Initializing...');

        try {
            // Setup checkbox toggle
            this.setupCheckbox(options);

            // Create initial layer (hidden by default)
            if (options.regionsData && options.adm1Layer) {
                this.createLayer(options.regionsData, options.adm1Layer, options.map);
            }

            console.log('[MPILayer] ✓ Initialized');
            return { success: true, message: 'MPI layer initialized' };

        } catch (error) {
            console.error('[MPILayer] Error initializing:', error);
            return { success: false, message: error.message };
        }
    },

    /**
     * Create MPI layer with styling
     */
    createLayer(regionsData, adm1Layer, map) {
        // MPI layer is actually styling applied to existing adm1Layer
        // We just need to toggle the styling on/off
        this.state.regionsData = regionsData;
        this.state.adm1Layer = adm1Layer;
        this.state.map = map;

        console.log('[MPILayer] Layer created (styling ready)');
    },

    /**
     * Setup checkbox toggle
     */
    setupCheckbox(options) {
        const checkboxId = options.checkboxId || 'mpiCheckbox';
        const checkbox = document.getElementById(checkboxId);

        if (!checkbox) {
            console.warn('[MPILayer] Checkbox not found');
            return;
        }

        const self = this;

        checkbox.addEventListener('change', function() {
            if (this.checked) {
                self.show();
            } else {
                self.hide();
            }
        });

        console.log('[MPILayer] ✓ Checkbox setup');
    },

    /**
     * Show MPI layer (apply coloring to regions)
     */
    show() {
        if (!this.state.adm1Layer || !this.state.regionsData) {
            console.warn('[MPILayer] Cannot show - layer not initialized');
            return { success: false };
        }

        const self = this;

        this.state.adm1Layer.eachLayer(function(layer) {
            const regionName = layer.feature.properties.name;
            const regionData = self.state.regionsData.find(r => r.name === regionName);

            if (regionData) {
                const color = self.config.getColor(regionData.mpi);
                layer.setStyle({
                    fillColor: color,
                    fillOpacity: 0.7,
                    color: '#ffffff',
                    weight: 2
                });

                // Update popup with MPI info
                layer.bindPopup(`
                    <div style="font-size: 0.9em;">
                        <strong>📊 Region:</strong> ${regionName}<br>
                        <strong>MPI Value:</strong> ${regionData.mpi}<br>
                        <em style="color: #94a3b8;">Multidimensional Poverty Index</em>
                    </div>
                `);
            }
        });

        this.state.isActive = true;
        console.log('[MPILayer] ✓ Shown');

        return { success: true };
    },

    /**
     * Hide MPI layer (reset to default styling)
     */
    hide() {
        if (!this.state.adm1Layer) {
            return { success: false };
        }

        this.state.adm1Layer.eachLayer(function(layer) {
            layer.setStyle({
                fillColor: '#1e293b',
                fillOpacity: 0.3,
                color: '#64748b',
                weight: 1
            });

            // Reset popup to just show name
            const regionName = layer.feature.properties.name;
            layer.bindPopup(`<strong>${regionName}</strong>`);
        });

        this.state.isActive = false;
        console.log('[MPILayer] Hidden');

        return { success: true };
    },

    /**
     * Update MPI data (for future versions)
     */
    updateData(newRegionsData) {
        this.state.regionsData = newRegionsData;

        if (this.state.isActive) {
            this.hide();
            this.show();
        }

        console.log('[MPILayer] Data updated');
        return { success: true };
    },

    /**
     * Get current state
     */
    getState() {
        return {
            isActive: this.state.isActive,
            hasData: !!this.state.regionsData
        };
    }
};

// Export
window.MPILayer = MPILayer;
console.log('✓ MPI Layer Module loaded');
