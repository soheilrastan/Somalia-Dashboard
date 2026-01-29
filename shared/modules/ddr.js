/**
 * DDR Module - Drag-Drop-Rightclick
 * ================================
 * Shared interaction module for all layers.
 * Layers POINT to this module - no code duplication.
 *
 * Features:
 * - DRAG: Drag layer item from panel
 * - DROP: Drop on map region to zoom & activate
 * - RIGHTCLICK: Context menu to view info / remove layer
 *
 * Usage:
 *   DDR.register(layerConfig);
 *   DDR.init(map, adm1Layer);
 */

console.log('[DDR] ddr.js file loading...');

const DDR = (function() {
    'use strict';

    // Module state
    let _map = null;
    let _adm1Layer = null;
    let _registeredLayers = {};
    let _draggedLayerId = null;
    let _dragGhost = null;
    let _contextMenu = null;
    let _highlightedRegion = null;

    // ========================================
    // INITIALIZATION
    // ========================================

    function init(map, adm1Layer) {
        _map = map;
        _adm1Layer = adm1Layer;

        // Create context menu element
        _createContextMenu();

        // Set up map-level event handlers
        _setupMapEvents();

        // Close context menu on click elsewhere
        document.addEventListener('click', function(e) {
            if (_contextMenu && !_contextMenu.contains(e.target)) {
                _hideContextMenu();
            }
        });

        console.log('[DDR] Module initialized');
    }

    // ========================================
    // LAYER REGISTRATION
    // ========================================

    /**
     * Register a layer with DDR functionality
     * @param {Object} config - Layer configuration
     * @param {string} config.id - Unique layer ID
     * @param {string} config.name - Display name
     * @param {string} config.region - Target region name (or 'all' for any region)
     * @param {string} config.color - Theme color (hex)
     * @param {HTMLElement} config.labelElement - The draggable label element
     * @param {HTMLInputElement} config.toggleElement - The checkbox toggle
     * @param {Object} config.leafletLayer - The Leaflet layer object
     * @param {Function} config.onActivate - Callback when layer is activated
     * @param {Function} config.onDeactivate - Callback when layer is deactivated
     */
    function register(config) {
        const { id, name, region, color, labelElement, toggleElement, leafletLayer, onActivate, onDeactivate } = config;

        if (!id || !labelElement) {
            console.error('[DDR] Invalid config: id and labelElement required');
            return;
        }

        _registeredLayers[id] = {
            id,
            name: name || id,
            region: region || 'all',
            color: color || '#3b82f6',
            labelElement,
            toggleElement,
            leafletLayer,
            onActivate: onActivate || function() {},
            onDeactivate: onDeactivate || function() {},
            isActive: false
        };

        // Set up drag events on the label
        _setupDragEvents(id);

        // Set up right-click event
        _setupRightClickEvent(id);

        console.log(`[DDR] Registered layer: ${id}`);
    }

    /**
     * Unregister a layer
     */
    function unregister(layerId) {
        if (_registeredLayers[layerId]) {
            delete _registeredLayers[layerId];
            console.log(`[DDR] Unregistered layer: ${layerId}`);
        }
    }

    // ========================================
    // DRAG FUNCTIONALITY
    // ========================================

    function _setupDragEvents(layerId) {
        const layer = _registeredLayers[layerId];
        const el = layer.labelElement;

        // Make draggable
        el.setAttribute('draggable', 'true');
        el.style.cursor = 'grab';
        el.style.userSelect = 'none';

        // Add drag handle indicator on hover
        el.addEventListener('mouseenter', function() {
            if (!el.querySelector('.ddr-drag-handle')) {
                const handle = document.createElement('span');
                handle.className = 'ddr-drag-handle';
                handle.innerHTML = '⋮⋮';
                handle.style.cssText = `
                    opacity: 0.5;
                    margin-right: 4px;
                    font-size: 0.8em;
                    color: ${layer.color};
                `;
                el.insertBefore(handle, el.firstChild);
            }
        });

        el.addEventListener('mouseleave', function() {
            const handle = el.querySelector('.ddr-drag-handle');
            if (handle && !_draggedLayerId) {
                handle.remove();
            }
        });

        // Drag start
        el.addEventListener('dragstart', function(e) {
            _draggedLayerId = layerId;

            // Create ghost element
            _dragGhost = document.createElement('div');
            _dragGhost.className = 'ddr-drag-ghost';
            _dragGhost.style.cssText = `
                position: fixed;
                background: ${layer.color}ee;
                color: white;
                padding: 8px 12px;
                border-radius: 6px;
                font-size: 0.85em;
                font-weight: 500;
                pointer-events: none;
                z-index: 10000;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                white-space: nowrap;
            `;
            _dragGhost.textContent = `📍 ${layer.name}`;
            document.body.appendChild(_dragGhost);

            // Add dragging class
            el.classList.add('ddr-dragging');
            el.style.opacity = '0.5';

            // Set drag data
            e.dataTransfer.effectAllowed = 'copy';
            e.dataTransfer.setData('text/plain', layerId);

            // Hide default drag image
            const img = new Image();
            img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
            e.dataTransfer.setDragImage(img, 0, 0);
        });

        // Drag (move ghost)
        document.addEventListener('drag', function(e) {
            if (_dragGhost && e.clientX !== 0 && e.clientY !== 0) {
                _dragGhost.style.left = (e.clientX + 15) + 'px';
                _dragGhost.style.top = (e.clientY + 15) + 'px';
            }
        });

        // Drag end (cleanup)
        el.addEventListener('dragend', function() {
            el.classList.remove('ddr-dragging');
            el.style.opacity = '1';

            if (_dragGhost) {
                _dragGhost.remove();
                _dragGhost = null;
            }

            // Reset highlighted region
            if (_highlightedRegion && _adm1Layer) {
                _adm1Layer.resetStyle(_highlightedRegion);
                _highlightedRegion = null;
            }

            _draggedLayerId = null;

            // Remove cursor classes
            if (_map) {
                _map.getContainer().classList.remove('ddr-drop-valid', 'ddr-drop-invalid');
            }
        });
    }

    // ========================================
    // MAP DROP ZONE EVENTS
    // ========================================

    function _setupMapEvents() {
        if (!_map) return;

        const container = _map.getContainer();

        // Prevent default to allow drop
        container.addEventListener('dragover', function(e) {
            if (_draggedLayerId) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';

                const layer = _registeredLayers[_draggedLayerId];
                if (!layer) return;

                // Get mouse position on map
                const rect = container.getBoundingClientRect();
                const point = L.point(e.clientX - rect.left, e.clientY - rect.top);
                const latlng = _map.containerPointToLatLng(point);

                // Find region under cursor
                let targetRegion = null;
                if (_adm1Layer) {
                    _adm1Layer.eachLayer(function(regionLayer) {
                        if (regionLayer.getBounds && regionLayer.getBounds().contains(latlng)) {
                            // More precise check with actual geometry
                            const geom = regionLayer.feature?.geometry;
                            if (geom) {
                                targetRegion = regionLayer;
                            }
                        }
                    });
                }

                // Check if valid drop zone
                const isValidDrop = _isValidDropZone(layer, targetRegion);

                // Update cursor
                container.classList.toggle('ddr-drop-valid', isValidDrop);
                container.classList.toggle('ddr-drop-invalid', !isValidDrop);

                // Highlight region
                if (targetRegion && targetRegion !== _highlightedRegion) {
                    // Reset previous
                    if (_highlightedRegion) {
                        _adm1Layer.resetStyle(_highlightedRegion);
                    }

                    // Highlight new
                    _highlightedRegion = targetRegion;
                    targetRegion.setStyle({
                        color: isValidDrop ? layer.color : '#ef4444',
                        weight: 4,
                        opacity: 1,
                        fillColor: isValidDrop ? layer.color : '#ef4444',
                        fillOpacity: 0.2,
                        dashArray: isValidDrop ? null : '10, 5'
                    });
                }
            }
        });

        container.addEventListener('dragleave', function(e) {
            // Only reset if leaving the container entirely
            if (!container.contains(e.relatedTarget)) {
                container.classList.remove('ddr-drop-valid', 'ddr-drop-invalid');
                if (_highlightedRegion && _adm1Layer) {
                    _adm1Layer.resetStyle(_highlightedRegion);
                    _highlightedRegion = null;
                }
            }
        });

        // Handle drop
        container.addEventListener('drop', function(e) {
            e.preventDefault();

            if (!_draggedLayerId) return;

            const layer = _registeredLayers[_draggedLayerId];
            if (!layer) return;

            // Get drop position
            const rect = container.getBoundingClientRect();
            const point = L.point(e.clientX - rect.left, e.clientY - rect.top);
            const latlng = _map.containerPointToLatLng(point);

            // Find target region
            let targetRegion = null;
            let regionName = null;

            if (_adm1Layer) {
                _adm1Layer.eachLayer(function(regionLayer) {
                    if (regionLayer.getBounds && regionLayer.getBounds().contains(latlng)) {
                        targetRegion = regionLayer;
                        regionName = regionLayer.feature?.properties?.name;
                    }
                });
            }

            // Check valid drop
            if (_isValidDropZone(layer, targetRegion)) {
                // Activate layer
                _activateLayer(layer.id, targetRegion, latlng);
            }

            // Cleanup
            container.classList.remove('ddr-drop-valid', 'ddr-drop-invalid');
            if (_highlightedRegion && _adm1Layer) {
                _adm1Layer.resetStyle(_highlightedRegion);
                _highlightedRegion = null;
            }
        });
    }

    function _isValidDropZone(layer, regionLayer) {
        if (!regionLayer) return false;

        const regionName = regionLayer.feature?.properties?.name;
        if (!regionName) return false;

        // If layer is for specific region, check match
        if (layer.region && layer.region !== 'all') {
            return regionName.toLowerCase().includes(layer.region.toLowerCase()) ||
                   layer.region.toLowerCase().includes(regionName.toLowerCase());
        }

        // Layer works for any region
        return true;
    }

    function _activateLayer(layerId, regionLayer, latlng) {
        const layer = _registeredLayers[layerId];
        if (!layer) return;

        // 1. Enable the Leaflet layer
        if (layer.leafletLayer && !_map.hasLayer(layer.leafletLayer)) {
            _map.addLayer(layer.leafletLayer);
        }

        // 2. Check the toggle
        if (layer.toggleElement) {
            layer.toggleElement.checked = true;
        }

        // 3. Zoom to region
        if (regionLayer) {
            _map.fitBounds(regionLayer.getBounds(), {
                padding: [50, 50],
                maxZoom: 10,
                animate: true,
                duration: 0.8
            });
        }

        // 4. Call activation callback
        layer.onActivate(regionLayer?.feature?.properties?.name);
        layer.isActive = true;

        // 5. Show success notification
        _showNotification(`✓ ${layer.name} activated`, latlng, layer.color);

        console.log(`[DDR] Layer activated: ${layerId}`);
    }

    // ========================================
    // RIGHT-CLICK CONTEXT MENU
    // ========================================

    function _createContextMenu() {
        _contextMenu = document.createElement('div');
        _contextMenu.className = 'ddr-context-menu';
        _contextMenu.style.cssText = `
            position: fixed;
            background: #1f2937;
            border: 1px solid #374151;
            border-radius: 8px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.4);
            min-width: 180px;
            z-index: 10001;
            display: none;
            overflow: hidden;
        `;
        document.body.appendChild(_contextMenu);
    }

    function _setupRightClickEvent(layerId) {
        const layer = _registeredLayers[layerId];
        const el = layer.labelElement;

        el.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            _showContextMenu(layerId, e.clientX, e.clientY);
        });
    }

    function _showContextMenu(layerId, x, y) {
        const layer = _registeredLayers[layerId];
        if (!layer || !_contextMenu) return;

        const isActive = layer.leafletLayer && _map && _map.hasLayer(layer.leafletLayer);

        _contextMenu.innerHTML = `
            <div style="padding: 10px 14px; border-bottom: 1px solid #374151; font-weight: 600; color: ${layer.color};">
                ${layer.name}
            </div>
            <div class="ddr-menu-item" data-action="toggle" style="padding: 10px 14px; cursor: pointer; color: #e5e7eb; display: flex; align-items: center; gap: 8px;">
                <span>${isActive ? '👁️‍🗨️' : '👁️'}</span>
                <span>${isActive ? 'Hide Layer' : 'Show Layer'}</span>
            </div>
            <div class="ddr-menu-item" data-action="zoom" style="padding: 10px 14px; cursor: pointer; color: #e5e7eb; display: flex; align-items: center; gap: 8px;">
                <span>🔍</span>
                <span>Zoom to Layer</span>
            </div>
            <div class="ddr-menu-item" data-action="info" style="padding: 10px 14px; cursor: pointer; color: #e5e7eb; display: flex; align-items: center; gap: 8px;">
                <span>ℹ️</span>
                <span>Layer Info</span>
            </div>
            ${isActive ? `
            <div style="border-top: 1px solid #374151;"></div>
            <div class="ddr-menu-item" data-action="remove" style="padding: 10px 14px; cursor: pointer; color: #ef4444; display: flex; align-items: center; gap: 8px;">
                <span>❌</span>
                <span>Remove from Map</span>
            </div>
            ` : ''}
        `;

        // Position menu
        _contextMenu.style.left = x + 'px';
        _contextMenu.style.top = y + 'px';
        _contextMenu.style.display = 'block';

        // Adjust if off-screen
        const rect = _contextMenu.getBoundingClientRect();
        if (rect.right > window.innerWidth) {
            _contextMenu.style.left = (x - rect.width) + 'px';
        }
        if (rect.bottom > window.innerHeight) {
            _contextMenu.style.top = (y - rect.height) + 'px';
        }

        // Add hover effects
        _contextMenu.querySelectorAll('.ddr-menu-item').forEach(item => {
            item.addEventListener('mouseenter', function() {
                this.style.background = '#374151';
            });
            item.addEventListener('mouseleave', function() {
                this.style.background = 'transparent';
            });

            item.addEventListener('click', function() {
                const action = this.dataset.action;
                _handleMenuAction(layerId, action);
                _hideContextMenu();
            });
        });
    }

    function _hideContextMenu() {
        if (_contextMenu) {
            _contextMenu.style.display = 'none';
        }
    }

    function _handleMenuAction(layerId, action) {
        const layer = _registeredLayers[layerId];
        if (!layer) return;

        switch (action) {
            case 'toggle':
                if (layer.leafletLayer && _map) {
                    if (_map.hasLayer(layer.leafletLayer)) {
                        _map.removeLayer(layer.leafletLayer);
                        if (layer.toggleElement) layer.toggleElement.checked = false;
                        layer.onDeactivate();
                        layer.isActive = false;
                    } else {
                        _map.addLayer(layer.leafletLayer);
                        if (layer.toggleElement) layer.toggleElement.checked = true;
                        layer.onActivate();
                        layer.isActive = true;
                    }
                }
                break;

            case 'zoom':
                if (layer.leafletLayer && layer.leafletLayer.getBounds) {
                    _map.fitBounds(layer.leafletLayer.getBounds(), {
                        padding: [50, 50],
                        maxZoom: 12,
                        animate: true
                    });
                }
                break;

            case 'info':
                _showLayerInfo(layerId);
                break;

            case 'remove':
                if (layer.leafletLayer && _map) {
                    _map.removeLayer(layer.leafletLayer);
                    if (layer.toggleElement) layer.toggleElement.checked = false;
                    layer.onDeactivate();
                    layer.isActive = false;
                }
                break;
        }

        console.log(`[DDR] Menu action: ${action} on ${layerId}`);
    }

    function _showLayerInfo(layerId) {
        const layer = _registeredLayers[layerId];
        if (!layer) return;

        // Create info modal
        const modal = document.createElement('div');
        modal.className = 'ddr-info-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10002;
        `;

        modal.innerHTML = `
            <div style="background: #1f2937; border-radius: 12px; padding: 24px; max-width: 400px; width: 90%; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                    <h3 style="margin: 0; color: ${layer.color}; font-size: 1.2em;">${layer.name}</h3>
                    <button class="ddr-close-btn" style="background: none; border: none; color: #9ca3af; font-size: 1.5em; cursor: pointer;">&times;</button>
                </div>
                <div style="color: #e5e7eb; font-size: 0.9em; line-height: 1.6;">
                    <p><strong>ID:</strong> ${layer.id}</p>
                    <p><strong>Region:</strong> ${layer.region === 'all' ? 'All Regions' : layer.region}</p>
                    <p><strong>Status:</strong> ${layer.isActive ? '🟢 Active' : '⚪ Inactive'}</p>
                </div>
                <div style="margin-top: 20px; text-align: right;">
                    <button class="ddr-close-btn" style="background: ${layer.color}; color: white; border: none; padding: 8px 20px; border-radius: 6px; cursor: pointer; font-weight: 500;">Close</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Close handlers
        modal.querySelectorAll('.ddr-close-btn').forEach(btn => {
            btn.addEventListener('click', () => modal.remove());
        });
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }

    // ========================================
    // UTILITIES
    // ========================================

    function _showNotification(message, latlng, color) {
        if (!_map || !latlng) return;

        const popup = L.popup({
            closeButton: false,
            autoClose: true,
            autoPan: false,
            className: 'ddr-notification-popup'
        })
        .setLatLng(latlng)
        .setContent(`<div style="background: ${color}; color: white; padding: 8px 12px; border-radius: 6px; font-weight: 500;">${message}</div>`)
        .openOn(_map);

        setTimeout(() => _map.closePopup(popup), 2000);
    }

    /**
     * Get all registered layers
     */
    function getLayers() {
        return { ..._registeredLayers };
    }

    /**
     * Check if a layer is active
     */
    function isActive(layerId) {
        return _registeredLayers[layerId]?.isActive || false;
    }

    // ========================================
    // PUBLIC API
    // ========================================

    return {
        init,
        register,
        unregister,
        getLayers,
        isActive
    };

})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DDR;
}

console.log('[DDR] DDR module fully loaded, typeof DDR =', typeof DDR);
