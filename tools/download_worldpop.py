#!/usr/bin/env python3
"""
WorldPop Somalia Data Downloader
================================
Downloads 1km resolution population data from WorldPop for key years.
Data source: WorldPop Global2 R2025A (2015-2030)

Usage:
    python download_worldpop.py

Years downloaded: 2015, 2020, 2025, 2030 (5-year intervals)

Geo-Insights Lab, ESCWA, United Nations
January 2026
"""

import os
import sys
import urllib.request
import time

# Force UTF-8 output on Windows
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Configuration
YEARS = [2015, 2020, 2025, 2030]  # 5-year intervals as requested
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'data_warehouse', 'population', 'worldpop_1km', 'raw')

# WorldPop URL pattern for Somalia (ISO3: SOM)
# Correct structure discovered: /R2025A/{YEAR}/SOM/v1/1km_ua/constrained/
# Filename pattern: som_pop_{YEAR}_CN_1km_R2025A_UA_v1.tif
BASE_URL = "https://data.worldpop.org/GIS/Population/Global_2015_2030/R2025A"

def get_download_url(year):
    """Generate download URL for a specific year"""
    # Pattern: som_pop_YYYY_CN_1km_R2025A_UA_v1.tif
    filename = f"som_pop_{year}_CN_1km_R2025A_UA_v1.tif"
    url = f"{BASE_URL}/{year}/SOM/v1/1km_ua/constrained/{filename}"
    return url, filename

def download_file(url, output_path, year):
    """Download file with progress reporting"""
    print(f"\n{'='*60}")
    print(f"Downloading WorldPop Somalia {year}")
    print(f"{'='*60}")
    print(f"URL: {url}")
    print(f"Output: {output_path}")

    if os.path.exists(output_path):
        size_mb = os.path.getsize(output_path) / (1024 * 1024)
        print(f"[SKIP] File already exists ({size_mb:.1f} MB)")
        return True

    try:
        start_time = time.time()

        # Create request with user agent
        request = urllib.request.Request(
            url,
            headers={'User-Agent': 'Mozilla/5.0 (ESCWA Geo-Insights Lab)'}
        )

        print("Connecting...")

        with urllib.request.urlopen(request, timeout=300) as response:
            total_size = response.headers.get('Content-Length')
            if total_size:
                total_size = int(total_size)
                print(f"File size: {total_size / (1024*1024):.1f} MB")

            # Download with progress
            downloaded = 0
            block_size = 1024 * 1024  # 1 MB blocks

            with open(output_path, 'wb') as f:
                while True:
                    block = response.read(block_size)
                    if not block:
                        break
                    f.write(block)
                    downloaded += len(block)

                    if total_size:
                        percent = (downloaded / total_size) * 100
                        mb_done = downloaded / (1024 * 1024)
                        mb_total = total_size / (1024 * 1024)
                        print(f"\r  Progress: {percent:5.1f}% ({mb_done:.1f}/{mb_total:.1f} MB)", end='', flush=True)
                    else:
                        mb_done = downloaded / (1024 * 1024)
                        print(f"\r  Downloaded: {mb_done:.1f} MB", end='', flush=True)

        elapsed = time.time() - start_time
        final_size = os.path.getsize(output_path) / (1024 * 1024)
        speed = final_size / elapsed if elapsed > 0 else 0

        print(f"\n[SUCCESS] Downloaded {final_size:.1f} MB in {elapsed:.1f}s ({speed:.1f} MB/s)")
        return True

    except urllib.error.HTTPError as e:
        print(f"\n[ERROR] HTTP Error {e.code}: {e.reason}")
        if e.code == 404:
            print(f"  File not found. The {year} data may not be available yet.")
        return False

    except urllib.error.URLError as e:
        print(f"\n[ERROR] URL Error: {e.reason}")
        return False

    except Exception as e:
        print(f"\n[ERROR] {type(e).__name__}: {e}")
        if os.path.exists(output_path):
            os.remove(output_path)  # Remove partial download
        return False

def main():
    print("=" * 60)
    print("WorldPop Somalia Data Downloader")
    print("Geo-Insights Lab, ESCWA, United Nations")
    print("=" * 60)
    print(f"\nYears to download: {YEARS}")
    print(f"Output directory: {os.path.abspath(OUTPUT_DIR)}")

    # Create output directory
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Download each year
    results = {}
    for year in YEARS:
        url, filename = get_download_url(year)
        output_path = os.path.join(OUTPUT_DIR, filename)
        success = download_file(url, output_path, year)
        results[year] = success

    # Summary
    print("\n" + "=" * 60)
    print("DOWNLOAD SUMMARY")
    print("=" * 60)

    for year, success in results.items():
        status = "[OK]" if success else "[FAILED]"
        print(f"  {year}: {status}")

    successful = sum(1 for s in results.values() if s)
    print(f"\nCompleted: {successful}/{len(YEARS)} files")

    if successful == len(YEARS):
        print("\nAll downloads completed successfully!")
        print("Next step: Run process_worldpop.py to convert to GeoJSON")
    elif successful > 0:
        print(f"\n{successful} files downloaded. Some years may not be available.")
        print("Proceed with available data using process_worldpop.py")
    else:
        print("\nAll downloads failed. Check the errors above.")
        print("You may need to download manually from:")
        print("  https://hub.worldpop.org/geodata/listing?id=136")

    return 0 if successful > 0 else 1

if __name__ == '__main__':
    sys.exit(main())
