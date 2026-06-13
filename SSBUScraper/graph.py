#!/usr/bin/env python3

# Reads results.csv and plots tier score vs matchup average.
# Characters above the trend line are underrated; below are overrated.

# Run: venv/bin/python graph.py

import csv
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import numpy as np

# Set to True to use tier rank (1=best, 84=worst) on the X-axis,
# or False to use tier score (continuous float from ssbwiki panel).
USE_RANK = False

TIER_COLORS = {
    "S+": "#ff4444",
    "S":  "#ff8c00",
    "S-": "#ffc107",
    "A+": "#8bc34a",
    "A":  "#4caf50",
    "A-": "#009688",
    "B+": "#2196f3",
    "B-": "#3f51b5",
    "C+": "#9c27b0",
    "C-": "#e91e63",
    "D":  "#795548",
    "E":  "#9e9e9e",
}

def load_results(path="results.csv"):
    rows = []
    with open(path, newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            if not r["matchup_avg"]:
                continue
            rows.append({
                "name":       r["name"],
                "tier":       r["tier"],
                "tier_score": float(r["tier_score"]),
                "matchup_avg": float(r["matchup_avg"]),
                "rank":       int(r["rank"]),
            })
    return rows

def main():
    rows = load_results()

    matchup_avgs = np.array([r["matchup_avg"] for r in rows])

    if USE_RANK:
        x_vals = np.array([r["rank"] for r in rows])
        x_label = "Tier Rank (1 = best)"
    else:
        x_vals = np.array([r["tier_score"] for r in rows])
        x_label = "Tier Score (ssbwiki panel ranking)"

    # Fit trend line
    coeffs = np.polyfit(x_vals, matchup_avgs, 1)
    trend  = np.poly1d(coeffs)
    x_line = np.linspace(x_vals.min(), x_vals.max(), 200)

    # Gap from trend (positive = above = underrated)
    x_key = "rank" if USE_RANK else "tier_score"
    top_under = sorted(rows, key=lambda r: -(matchup_avgs[rows.index(r)] - trend(r[x_key])))[:6]
    top_over  = sorted(rows, key=lambda r:  (matchup_avgs[rows.index(r)] - trend(r[x_key])))[:6]
    label_set = {r["name"] for r in top_under + top_over}

    fig, ax = plt.subplots(figsize=(14, 8))
    fig.patch.set_facecolor("#1a1a2e")
    ax.set_facecolor("#16213e")

    # Trend line
    ax.plot(x_line, trend(x_line), color="#ffffff", linewidth=1.2,
            linestyle="--", alpha=0.4, label="Trend line", zorder=1)

    # Scatter points
    for r in rows:
        color = TIER_COLORS.get(r["tier"], "#aaaaaa")
        ax.scatter(r[x_key], r["matchup_avg"],
                   color=color, s=60, zorder=3, alpha=0.85, edgecolors="#00000044", linewidths=0.5)

    # Labels for outliers only
    for r in rows:
        if r["name"] not in label_set:
            continue
        gap = r["matchup_avg"] - trend(r[x_key])
        color = TIER_COLORS.get(r["tier"], "#aaaaaa")
        offset_y = 0.025 if gap > 0 else -0.035
        ax.annotate(
            r["name"],
            xy=(r[x_key], r["matchup_avg"]),
            xytext=(r[x_key], r["matchup_avg"] + offset_y),
            fontsize=7.5,
            color=color,
            fontweight="bold",
            ha="center",
            zorder=5,
        )

    # Shaded regions
    ax.axhspan(matchup_avgs.max(), trend(x_vals).max() + 0.15,
               alpha=0.04, color="#00ff88", label="Underrated zone")
    ax.axhspan(trend(x_vals).min() - 0.05, matchup_avgs.min(),
               alpha=0.04, color="#ff4444", label="Overrated zone")

    # Legend for tiers
    legend_patches = [
        mpatches.Patch(color=c, label=t) for t, c in TIER_COLORS.items()
        if any(r["tier"] == t for r in rows)
    ]
    ax.legend(handles=legend_patches, title="Tier", title_fontsize=8,
              fontsize=7, loc="lower right", framealpha=0.3,
              facecolor="#1a1a2e", edgecolor="#555555", labelcolor="white")

    # Axes styling
    ax.set_xlabel(x_label, color="#cccccc", fontsize=11)
    ax.set_ylabel("Matchup Average (eventhubs community)", color="#cccccc", fontsize=11)
    ax.set_title("SSBU: Tier Rank vs Community Matchup Average",
                 color="white", fontsize=14, fontweight="bold", pad=14)
    ax.tick_params(colors="#aaaaaa")
    ax.spines[:].set_color("#333355")
    ax.grid(color="#222244", linewidth=0.5, zorder=0)

    if USE_RANK:
        ax.invert_xaxis()  # rank 1 (best) on the right, rank 84 on the left
        right_x, left_x = x_vals.min(), x_vals.max()
    else:
        right_x, left_x = x_vals.max(), x_vals.min()

    # Annotate quadrants — "good" corner is top-right, "underrated" is top-left
    ax.text(right_x * 0.98, matchup_avgs.max() * 0.999,
            "← community agrees they're good",
            color="#aaffaa", fontsize=7.5, ha="right", alpha=0.6)
    ax.text(left_x * 1.02, matchup_avgs.max() * 0.999,
            "UNDERRATED →",
            color="#00ff88", fontsize=8, ha="left", fontweight="bold", alpha=0.7)
    ax.text(right_x * 0.98, matchup_avgs.min() * 1.001,
            "OVERRATED",
            color="#ff6666", fontsize=8, ha="right", fontweight="bold", alpha=0.7)

    plt.tight_layout()
    out = "graph.png"
    plt.savefig(out, dpi=150, bbox_inches="tight", facecolor=fig.get_facecolor())
    print(f"Saved → {out}")
    import subprocess, sys
    if sys.platform == "darwin":
        subprocess.run(["open", out])

if __name__ == "__main__":
    main()
