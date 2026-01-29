#!/usr/bin/env python3
"""
Generate Coming Soon dashboards for all 22 Arab countries
Each country gets an index.html that loads the shared dashboard
"""

import os
from pathlib import Path

# All 22 Arab League countries with their configuration
COUNTRIES = {
    'algeria': {
        'name': 'Algeria',
        'name_ar': 'الجزائر',
        'flag': '🇩🇿',
        'center': [28.0, 3.0],
        'zoom': 5,
        'bounds': [[19.0, -9.0], [37.0, 12.0]]
    },
    'bahrain': {
        'name': 'Bahrain',
        'name_ar': 'البحرين',
        'flag': '🇧🇭',
        'center': [26.0, 50.5],
        'zoom': 10,
        'bounds': [[25.5, 50.3], [26.4, 50.8]]
    },
    'comoros': {
        'name': 'Comoros',
        'name_ar': 'جزر القمر',
        'flag': '🇰🇲',
        'center': [-12.0, 44.0],
        'zoom': 9,
        'bounds': [[-13.0, 43.0], [-11.0, 45.0]]
    },
    'djibouti': {
        'name': 'Djibouti',
        'name_ar': 'جيبوتي',
        'flag': '🇩🇯',
        'center': [11.5, 42.5],
        'zoom': 8,
        'bounds': [[10.9, 41.7], [12.7, 43.5]]
    },
    'egypt': {
        'name': 'Egypt',
        'name_ar': 'مصر',
        'flag': '🇪🇬',
        'center': [26.0, 30.0],
        'zoom': 6,
        'bounds': [[22.0, 25.0], [32.0, 35.0]]
    },
    'iraq': {
        'name': 'Iraq',
        'name_ar': 'العراق',
        'flag': '🇮🇶',
        'center': [33.0, 44.0],
        'zoom': 6,
        'bounds': [[29.0, 38.5], [37.5, 48.5]]
    },
    'jordan': {
        'name': 'Jordan',
        'name_ar': 'الأردن',
        'flag': '🇯🇴',
        'center': [31.0, 36.5],
        'zoom': 7,
        'bounds': [[29.0, 34.8], [33.5, 39.3]]
    },
    'kuwait': {
        'name': 'Kuwait',
        'name_ar': 'الكويت',
        'flag': '🇰🇼',
        'center': [29.3, 47.5],
        'zoom': 8,
        'bounds': [[28.5, 46.5], [30.2, 48.5]]
    },
    'lebanon': {
        'name': 'Lebanon',
        'name_ar': 'لبنان',
        'flag': '🇱🇧',
        'center': [33.8, 35.8],
        'zoom': 8,
        'bounds': [[33.0, 35.0], [34.7, 36.7]]
    },
    'libya': {
        'name': 'Libya',
        'name_ar': 'ليبيا',
        'flag': '🇱🇾',
        'center': [27.0, 17.0],
        'zoom': 5,
        'bounds': [[19.5, 9.0], [33.5, 25.5]]
    },
    'mauritania': {
        'name': 'Mauritania',
        'name_ar': 'موريتانيا',
        'flag': '🇲🇷',
        'center': [20.0, -10.0],
        'zoom': 5,
        'bounds': [[14.7, -17.1], [27.3, -4.8]]
    },
    'morocco': {
        'name': 'Morocco',
        'name_ar': 'المغرب',
        'flag': '🇲🇦',
        'center': [32.0, -6.0],
        'zoom': 6,
        'bounds': [[27.5, -13.5], [36.0, -1.0]]
    },
    'oman': {
        'name': 'Oman',
        'name_ar': 'عمان',
        'flag': '🇴🇲',
        'center': [21.0, 57.0],
        'zoom': 6,
        'bounds': [[16.5, 52.0], [26.5, 60.0]]
    },
    'palestine': {
        'name': 'Palestine',
        'name_ar': 'فلسطين',
        'flag': '🇵🇸',
        'center': [31.9, 35.2],
        'zoom': 9,
        'bounds': [[31.2, 34.2], [32.6, 35.6]]
    },
    'qatar': {
        'name': 'Qatar',
        'name_ar': 'قطر',
        'flag': '🇶🇦',
        'center': [25.3, 51.2],
        'zoom': 8,
        'bounds': [[24.4, 50.7], [26.2, 51.7]]
    },
    'saudi': {
        'name': 'Saudi Arabia',
        'name_ar': 'المملكة العربية السعودية',
        'flag': '🇸🇦',
        'center': [24.0, 45.0],
        'zoom': 5,
        'bounds': [[16.0, 34.5], [32.2, 55.7]]
    },
    'sudan': {
        'name': 'Sudan',
        'name_ar': 'السودان',
        'flag': '🇸🇩',
        'center': [15.5, 30.0],
        'zoom': 5,
        'bounds': [[8.6, 21.8], [22.2, 38.6]]
    },
    'syria': {
        'name': 'Syria',
        'name_ar': 'سوريا',
        'flag': '🇸🇾',
        'center': [35.0, 38.0],
        'zoom': 6,
        'bounds': [[32.3, 35.7], [37.3, 42.4]]
    },
    'tunisia': {
        'name': 'Tunisia',
        'name_ar': 'تونس',
        'flag': '🇹🇳',
        'center': [34.0, 9.5],
        'zoom': 6,
        'bounds': [[30.2, 7.5], [37.5, 11.6]]
    },
    'uae': {
        'name': 'United Arab Emirates',
        'name_ar': 'الإمارات العربية المتحدة',
        'flag': '🇦🇪',
        'center': [24.0, 54.0],
        'zoom': 7,
        'bounds': [[22.6, 51.5], [26.1, 56.4]]
    },
    'yemen': {
        'name': 'Yemen',
        'name_ar': 'اليمن',
        'flag': '🇾🇪',
        'center': [15.5, 48.0],
        'zoom': 6,
        'bounds': [[12.0, 42.5], [19.0, 54.0]]
    }
}

# HTML template
HTML_TEMPLATE = '''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate, max-age=0">
    <meta name="version" content="4.1">
    <title>Geo-Insights: {name} Dashboard - ESCWA, UN</title>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <link rel="stylesheet" href="../_shared/styles.css?v=4.1" />
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="display: flex; align-items: center; justify-content: center; gap: 15px;">
                <a href="https://dataportal.unescwa.org/gis/landing" target="_blank" style="text-decoration: none;">
                    <img src="../somalia/adp_logo.png" alt="Arab Development Portal" style="height: 44px; vertical-align: middle;">
                </a>
                <span style="color: inherit;">Geo-Insights: {name} Dashboard, ESCWA, UN</span>
                <a href="../../country-selector.html" title="Back to Country Selector" style="text-decoration: none; font-size: 1.5rem; margin-left: 5px; display: flex; align-items: center; gap: 6px;">🌍<span style="font-size: 0.6rem; color: #0ea5e9; font-weight: 500;">← Countries</span></a>
            </h1>
            <div class="subtitle">By Geo-Insight Lab, ESCWA, 2026 <span style="font-size: 0.7em; opacity: 0.5;">(v4.1)</span></div>
        </div>
        <div id="map"></div>
    </div>

    <script>
        window.COUNTRY_CODE = '{code}';
        window.COUNTRY_NAME = '{name}';
        window.COUNTRY_NAME_AR = '{name_ar}';
        window.COUNTRY_FLAG = '{flag}';
        window.COUNTRY_CENTER = [{center_lat}, {center_lon}];
        window.COUNTRY_ZOOM = {zoom};
        window.COUNTRY_BOUNDS = [[{bounds_sw_lat}, {bounds_sw_lon}], [{bounds_ne_lat}, {bounds_ne_lon}]];
    </script>
    <script src="../_shared/dashboard-coming-soon.js?v=4.1"></script>
</body>
</html>
'''

def generate_country_dashboard(code, config, output_dir):
    """Generate index.html for a single country"""
    html = HTML_TEMPLATE.format(
        code=code,
        name=config['name'],
        name_ar=config['name_ar'],
        flag=config['flag'],
        center_lat=config['center'][0],
        center_lon=config['center'][1],
        zoom=config['zoom'],
        bounds_sw_lat=config['bounds'][0][0],
        bounds_sw_lon=config['bounds'][0][1],
        bounds_ne_lat=config['bounds'][1][0],
        bounds_ne_lon=config['bounds'][1][1]
    )

    country_dir = output_dir / code
    country_dir.mkdir(exist_ok=True)

    index_path = country_dir / 'index.html'
    with open(index_path, 'w', encoding='utf-8') as f:
        f.write(html)

    print(f"[OK] Generated: {code}/index.html ({config['name']})")
    return index_path

def main():
    # Get the countries directory
    script_dir = Path(__file__).parent
    countries_dir = script_dir.parent / 'countries'

    print("=" * 50)
    print("Generating Coming Soon Dashboards for 21 Countries")
    print("=" * 50)
    print()

    generated = []
    for code, config in COUNTRIES.items():
        if code == 'somalia':
            print(f"[SKIP] somalia (already has full dashboard)")
            continue

        path = generate_country_dashboard(code, config, countries_dir)
        generated.append(code)

    print()
    print("=" * 50)
    print(f"Generated {len(generated)} country dashboards")
    print("=" * 50)
    print()
    print("To test, open in browser:")
    print("  countries/yemen/index.html")
    print("  countries/egypt/index.html")
    print("  countries/jordan/index.html")

if __name__ == '__main__':
    main()
