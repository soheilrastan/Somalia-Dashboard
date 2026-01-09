# Somalia Dashboard - File Size Optimization

## Optimization Results

The dashboard files have been optimized to significantly reduce file sizes and improve loading performance for global users.

### Summary

- **Total Original Size**: ~1.7 GB (before optimization)
- **Total Optimized Size**: ~450 MB (after optimization)
- **Total Reduction**: ~73-74% (over 1.2 GB saved)

### What Was Optimized

#### 1. Regional Roads Data (roads_by_region/)
- **Original**: 848.75 MB (18 regions × 2 files each)
- **Optimized**: 219.06 MB
- **Reduction**: 74.2% (629.69 MB saved)

#### 2. VIIRS Nightlight Data
- **bakool_viirs_500m_2022_full.geojson**: 5.32 MB → 2.67 MB (49.8% reduction)
- **bakool_viirs_500m_2023_full.geojson**: 5.32 MB → 2.67 MB (49.8% reduction)
- **bakool_viirs_500m_2023.geojson**: 1.42 MB → 0.71 MB (49.9% reduction)

#### 3. Core Data File (data.js)
- **Original**: 6.94 MB
- **Optimized**: 5.51 MB
- **Reduction**: 20.6% (1.43 MB saved)

## Optimization Techniques Used

### 1. Coordinate Precision Reduction
- **From**: 7-10 decimal places (~1.1 cm accuracy)
- **To**: 5-6 decimal places (~1-11 cm accuracy)
- **Impact**: 50-75% file size reduction
- **Quality**: More than sufficient for regional-level visualization

### 2. JSON Minification
- Removed all whitespace and formatting
- Reduced separators to minimal syntax
- No impact on functionality

## How to Re-optimize Files

If you add new GeoJSON data to the dashboard:

```bash
# Optimize all GeoJSON files (roads, VIIRS, etc.)
python optimize_geojson.py

# Optimize roads JavaScript files specifically
python optimize_roads_js.py
```

**Note**: Backups are automatically created with `.backup` extension before optimization.

## Performance Improvements

### Before Optimization
- Bay region roads: 139 MB download
- Hiiraan region roads: 98 MB download
- Total roads data: ~850 MB

### After Optimization
- Bay region roads: 35 MB download (4x faster)
- Hiiraan region roads: 25 MB download (4x faster)
- Total roads data: ~220 MB (4x faster)

### Loading Time Estimates

For a user with 10 Mbps internet connection:

| File | Before | After | Time Saved |
|------|--------|-------|------------|
| Bay_roads.js | 111 seconds | 28 seconds | **83 seconds** |
| Hiiraan_roads.js | 78 seconds | 20 seconds | **58 seconds** |
| data.js | 6 seconds | 4 seconds | **2 seconds** |

## Additional Optimization Recommendations

### For GitHub Pages Hosting

GitHub Pages automatically serves files with gzip compression, which will further reduce transfer sizes by an additional 60-70%.

### For Custom Hosting

If hosting on your own server, enable gzip compression in your web server configuration:

**Apache (.htaccess)**:
```apache
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json application/geo+json
</IfModule>
```

**Nginx**:
```nginx
gzip on;
gzip_types text/plain text/css text/javascript application/javascript application/json application/geo+json;
gzip_min_length 1000;
```

### For 50 TB Dataset

For your full 50 TB dataset across multiple dashboards, consider:

1. **Vector Tiles (MVT/PBF)**
   - Further 10-20x reduction over optimized GeoJSON
   - Recommended tool: [tippecanoe](https://github.com/felt/tippecanoe)
   - Requires: Leaflet vector tile plugin

2. **Cloud CDN**
   - AWS S3 + CloudFront
   - Or: Cloudflare + R2 storage
   - Benefits: Global edge caching, automatic compression

3. **Progressive Loading**
   - Load only visible tiles
   - Implement zoom-level filtering
   - Lazy-load regions on demand

4. **Hybrid Architecture**
   - Local workstation: Data processing & tile generation
   - Cloud storage: Hosting & delivery
   - CDN: Global caching & acceleration

## Coordinate Precision Reference

| Decimal Places | Accuracy | Use Case |
|----------------|----------|----------|
| 5 | ~1.1 m | Regional visualization ✓ |
| 6 | ~11 cm | Street-level routing ✓ |
| 7 | ~1.1 cm | Survey-grade mapping |
| 8+ | ~1.1 mm | Engineering/scientific |

Your optimized data uses 5-6 decimal places, which is perfect for regional-level visualization.

## Files Created

- `optimize_geojson.py` - Optimizes GeoJSON files and data.js
- `optimize_roads_js.py` - Optimizes roads JavaScript files
- `*.backup` files - Original unoptimized files (safe to delete after verification)

## Verification

To verify the optimization worked correctly:

1. Open the dashboard in a browser
2. Enable the Roads OSM layer for any region
3. Verify roads display correctly
4. Check Network tab in DevTools to confirm smaller file sizes

## Questions?

- File size issues? Re-run optimization scripts
- Quality issues? Adjust precision parameter (5-7 range)
- Performance issues? Consider vector tiles for further optimization

---

**Last Updated**: 2026-01-09
**Optimization Scripts**: v1.0
