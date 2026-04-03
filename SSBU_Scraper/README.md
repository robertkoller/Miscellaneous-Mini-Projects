# SSBU Scraper

Scrapes the Super Smash Bros. Ultimate tier list from [ssbwiki.com](https://www.ssbwiki.com/Tier_list) and community matchup ratings from [eventhubs.com](https://www.eventhubs.com), then compares where the panel placed each character against how the community rates their actual matchups.

## What it does

1. **scraper.py** — Fetches the ssbwiki tier list (rank, tier label, tier score) for all ~84 characters, then hits eventhubs for each character's matchup chart (win/loss/even counts and average matchup score). Outputs a summary table to stdout and saves `results.csv`.

2. **graph.py** — Reads `results.csv` and plots tier rank/score (X-axis) vs. matchup average (Y-axis) with a trend line. Characters above the line have better matchups than their tier suggests (underrated); below means the opposite (overrated). Saves `graph.png` and opens it automatically on Mac.

## Setup

```bash
cd SSBU_Scraper
python3 -m venv venv
venv/bin/pip install requests beautifulsoup4 matplotlib numpy
```

## Usage

**Run the scraper** (takes a few minutes due to rate limiting):
```bash
venv/bin/python scraper.py
```

**Generate the graph** from existing `results.csv`:
```bash
venv/bin/python graph.py
```

## Graph options

At the top of `graph.py`:

```python
USE_RANK = False  # True  → X-axis is tier rank (1=best on right, 84=worst on left)
                  # False → X-axis is tier score (continuous float from ssbwiki panel)
```

Tier score is more granular — it shows how clustered or spread out characters are within tiers. Rank treats every step as equal distance.

## Output

- `results.csv` — one row per character with: rank, name, tier, tier score, matchup average, favorable/unfavorable/even matchup counts, and any scrape errors
- `graph.png` — scatter plot with trend line and labeled outliers

## Data sources

| Source | What it provides |
|--------|-----------------|
| ssbwiki.com/Tier_list | Panel tier list: rank, tier label (S+, A-, etc.), tier score |
| eventhubs.com/tiers/ssbu/character/\<slug\>/ | Community matchup ratings (avg score out of 10, vote counts) |

## Notes

- Richter shares a page with Simon on eventhubs; Dark Pit shares with Pit; Dark Samus shares with Samus; Daisy shares with Peach. Their matchup data reflects the combined page.
- Some characters may have scrape errors (timeouts, missing pages) — these show up in the `matchup_error` column and are excluded from the graph. I didnt want to rerun the scrapers, even just for these because I thought it would be cool to keep as a sign of the limitations of this project
- The 1.5-second delay between eventhubs requests is intentional to avoid rate limiting.
