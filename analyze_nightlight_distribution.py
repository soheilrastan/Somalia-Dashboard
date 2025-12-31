"""
Analyze nightlight distribution for Bakool region 2022 and 2023
Create 6-bin categorization based on data distribution
"""
import json
import numpy as np

def analyze_distribution(year):
    print(f"\n{'='*70}")
    print(f"Nightlight Distribution Analysis - Bakool {year}")
    print(f"{'='*70}")

    # Load data
    js_file = f'bakool_nightlight_{year}.js'
    with open(js_file, 'r') as f:
        content = f.read()

    # Extract JSON
    json_start = content.index('{')
    json_data = json.loads(content[json_start:-1])

    # Extract values
    values = [point['value'] for point in json_data['points']]
    values = np.array(values)

    print(f"\nBasic Statistics:")
    print(f"  Total points: {len(values):,}")
    print(f"  Min value: {values.min():.6f} nW/cm²/sr")
    print(f"  Max value: {values.max():.6f} nW/cm²/sr")
    print(f"  Mean value: {values.mean():.6f} nW/cm²/sr")
    print(f"  Median value: {np.median(values):.6f} nW/cm²/sr")
    print(f"  Std deviation: {values.std():.6f} nW/cm²/sr")

    # Percentiles
    print(f"\nPercentiles:")
    percentiles = [10, 25, 50, 75, 90, 95, 99]
    for p in percentiles:
        val = np.percentile(values, p)
        print(f"  {p}th percentile: {val:.6f} nW/cm²/sr")

    # Create 6 bins using different methods
    print(f"\n{'='*70}")
    print(f"Method 1: Equal Width Bins")
    print(f"{'='*70}")

    bins_equal_width = np.linspace(values.min(), values.max(), 7)
    counts_ew, _ = np.histogram(values, bins=bins_equal_width)

    for i in range(6):
        print(f"Bin {i+1}: {bins_equal_width[i]:.6f} - {bins_equal_width[i+1]:.6f} nW/cm²/sr")
        print(f"  Count: {counts_ew[i]:,} ({counts_ew[i]/len(values)*100:.2f}%)")

    # Method 2: Quantile-based bins (equal frequency)
    print(f"\n{'='*70}")
    print(f"Method 2: Equal Frequency Bins (Quantiles)")
    print(f"{'='*70}")

    quantiles = [0, 1/6, 2/6, 3/6, 4/6, 5/6, 1.0]
    bins_quantile = np.quantile(values, quantiles)
    counts_q, _ = np.histogram(values, bins=bins_quantile)

    for i in range(6):
        print(f"Bin {i+1}: {bins_quantile[i]:.6f} - {bins_quantile[i+1]:.6f} nW/cm²/sr")
        print(f"  Count: {counts_q[i]:,} ({counts_q[i]/len(values)*100:.2f}%)")

    # Method 3: Natural Breaks (Jenks-like, simplified)
    print(f"\n{'='*70}")
    print(f"Method 3: Data-Driven Bins (Based on Distribution)")
    print(f"{'='*70}")

    # Define bins based on data characteristics
    # Looking at the distribution, most data is concentrated in 0.25-0.50 range
    custom_bins = [
        values.min(),
        0.270,  # ~25th percentile
        0.290,  # ~50th percentile
        0.310,  # ~75th percentile
        0.350,  # ~90th percentile
        0.450,  # ~95th percentile
        values.max()
    ]

    counts_custom, _ = np.histogram(values, bins=custom_bins)

    for i in range(6):
        print(f"Bin {i+1}: {custom_bins[i]:.6f} - {custom_bins[i+1]:.6f} nW/cm²/sr")
        print(f"  Count: {counts_custom[i]:,} ({counts_custom[i]/len(values)*100:.2f}%)")

    # Method 4: Contextual Classification
    print(f"\n{'='*70}")
    print(f"Method 4: Contextual Classification (Recommended for Bakool)")
    print(f"{'='*70}")

    # Based on Bakool context - extremely rural region
    contextual_bins = [
        (0.000, 0.260, "Very Low (Background)", "#1e1b4b"),      # Deep purple
        (0.260, 0.285, "Low Rural", "#5b21b6"),                  # Dark purple
        (0.285, 0.310, "Rural", "#8b5cf6"),                      # Purple
        (0.310, 0.350, "Moderate Rural", "#a855f7"),             # Light purple
        (0.350, 0.500, "Bright Rural", "#fbbf24"),               # Yellow
        (0.500, 1.000, "Settlement/Urban", "#fde047")            # Bright yellow
    ]

    for i, (low, high, label, color) in enumerate(contextual_bins):
        count = np.sum((values >= low) & (values < high if i < 5 else values <= high))
        print(f"Bin {i+1}: {label}")
        print(f"  Range: {low:.3f} - {high:.3f} nW/cm²/sr")
        print(f"  Color: {color}")
        print(f"  Count: {count:,} ({count/len(values)*100:.2f}%)")

    return values, contextual_bins

# Analyze both years
values_2022, bins_2022 = analyze_distribution(2022)
values_2023, bins_2023 = analyze_distribution(2023)

# Comparison
print(f"\n{'='*70}")
print(f"Year-over-Year Comparison (2022 vs 2023)")
print(f"{'='*70}")

print(f"\nMean change: {values_2023.mean() - values_2022.mean():.6f} nW/cm²/sr")
print(f"  2022 mean: {values_2022.mean():.6f}")
print(f"  2023 mean: {values_2023.mean():.6f}")
print(f"  Change: {(values_2023.mean() - values_2022.mean())/values_2022.mean()*100:+.2f}%")

print(f"\nMedian change: {np.median(values_2023) - np.median(values_2022):.6f} nW/cm²/sr")
print(f"  2022 median: {np.median(values_2022):.6f}")
print(f"  2023 median: {np.median(values_2023):.6f}")
print(f"  Change: {(np.median(values_2023) - np.median(values_2022))/np.median(values_2022)*100:+.2f}%")

print(f"\nMax value change: {values_2023.max() - values_2022.max():.6f} nW/cm²/sr")
print(f"  2022 max: {values_2022.max():.6f}")
print(f"  2023 max: {values_2023.max():.6f}")
print(f"  Change: {(values_2023.max() - values_2022.max())/values_2022.max()*100:+.2f}%")

# Recommended 6-bin classification
print(f"\n{'='*70}")
print(f"RECOMMENDED 6-BIN CLASSIFICATION FOR BAKOOL")
print(f"{'='*70}")

recommended_bins = [
    {
        'bin': 1,
        'label': 'Very Low (Background)',
        'range': '0.000 - 0.260',
        'color': '#1e1b4b',
        'description': 'Background/minimal light'
    },
    {
        'bin': 2,
        'label': 'Low Rural',
        'range': '0.260 - 0.285',
        'color': '#5b21b6',
        'description': 'Very sparse rural settlements'
    },
    {
        'bin': 3,
        'label': 'Rural',
        'range': '0.285 - 0.310',
        'color': '#8b5cf6',
        'description': 'Typical rural areas'
    },
    {
        'bin': 4,
        'label': 'Moderate Rural',
        'range': '0.310 - 0.350',
        'color': '#a855f7',
        'description': 'More developed rural areas'
    },
    {
        'bin': 5,
        'label': 'Bright Rural',
        'range': '0.350 - 0.500',
        'color': '#fbbf24',
        'description': 'Rural centers/small settlements'
    },
    {
        'bin': 6,
        'label': 'Settlement/Urban',
        'range': '0.500+',
        'color': '#fde047',
        'description': 'Small towns/settlements'
    }
]

print("\nBin Details:")
for bin_info in recommended_bins:
    print(f"\n{bin_info['bin']}. {bin_info['label']}")
    print(f"   Range: {bin_info['range']} nW/cm²/sr")
    print(f"   Color: {bin_info['color']}")
    print(f"   Description: {bin_info['description']}")

# Count distribution in recommended bins for both years
print(f"\n{'='*70}")
print(f"Distribution by Recommended Bins")
print(f"{'='*70}")

bin_edges = [0.000, 0.260, 0.285, 0.310, 0.350, 0.500, 1.000]

print(f"\n{'Bin':<4} {'Label':<22} {'2022 Count':<15} {'2022 %':<10} {'2023 Count':<15} {'2023 %':<10}")
print("-" * 90)

for i, bin_info in enumerate(recommended_bins):
    if i < 5:
        count_2022 = np.sum((values_2022 >= bin_edges[i]) & (values_2022 < bin_edges[i+1]))
        count_2023 = np.sum((values_2023 >= bin_edges[i]) & (values_2023 < bin_edges[i+1]))
    else:
        count_2022 = np.sum(values_2022 >= bin_edges[i])
        count_2023 = np.sum(values_2023 >= bin_edges[i])

    pct_2022 = count_2022 / len(values_2022) * 100
    pct_2023 = count_2023 / len(values_2023) * 100

    print(f"{bin_info['bin']:<4} {bin_info['label']:<22} {count_2022:>10,}     {pct_2022:>6.2f}%    {count_2023:>10,}     {pct_2023:>6.2f}%")

print(f"\n{'='*70}")
print("Analysis Complete!")
print(f"{'='*70}")
