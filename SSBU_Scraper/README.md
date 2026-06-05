# SSBU Scraper

Scrapes the Super Smash Bros. Ultimate tier list from [ssbwiki.com](https://www.ssbwiki.com/Tier_list) and individual character matchup ratings from [eventhubs.com](https://www.eventhubs.com), then provides a React app to explore and compare character matchups.

## Files

| File | Purpose |
|------|---------|
| `scraper.py` | Scrapes tier list + all individual matchup scores, outputs `results.csv` and `matchups.json` |
| `graph.py` | Reads `results.csv` and plots tier rank/score vs matchup average with a trend line |
| `app/` | React app for exploring and comparing character matchups |

## Setup

```bash
cd SSBU_Scraper
python3 -m venv venv
venv/bin/pip install requests beautifulsoup4 matplotlib numpy
```

## Running the scraper

Takes ~2–3 minutes due to rate limiting between eventhubs requests:

```bash
venv/bin/python scraper.py
```

Outputs:
- `results.csv` — one row per character: rank, name, tier, tier score, matchup average, favorable/unfavorable/even counts
- `matchups.json` — full data including every individual matchup score per character, used by the React app

After scraping, copy the JSON into the app:

```bash
cp matchups.json app/src/data/matchups.json
```

## React app

```bash
cd app
npm install
npm run dev
```

Opens at `http://localhost:5173`. Two modes:

**Single character** — search any character and see:
- Matchup average, median, standard deviation
- Best and worst individual matchup
- All matchups ranked and grouped by category (strong advantage → strong disadvantage)

**Compare** — pick two characters and see:
- Head-to-head score from each character's perspective
- Where each character ranks in the other's matchup chart (rank + percentile)
- Both full matchup lists side by side with the opponent highlighted

Matchup categories:
| Range | Label |
|-------|-------|
| ≥ 6.2 | Strong Advantage |
| 5.6–6.2 | Decent Advantage |
| 5.2–5.6 | Small Advantage |
| 4.8–5.2 | Even |
| 4.4–4.8 | Small Disadvantage |
| 3.8–4.4 | Decent Disadvantage |
| ≤ 3.8 | Strong Disadvantage |

## Generating the graph

```bash
venv/bin/python graph.py
```

Toggle at the top of `graph.py`:

```python
USE_RANK = False  # True  → X-axis is tier rank (1=best, 84=worst)
                  # False → X-axis is tier score (continuous float from ssbwiki panel)
```

Characters above the trend line have better matchups than their tier suggests (underrated); below means overrated. Saves `graph.png` and opens it on Mac automatically.

## Data sources

| Source | What it provides |
|--------|-----------------|
| ssbwiki.com/Tier_list | Panel tier list: rank, tier label (S+, A-, etc.), tier score |
| eventhubs.com/tiers/ssbu/character/\<slug\>/ | Community matchup ratings — all individual opponent scores (avg out of 10) across three sections: favorable, even, unfavorable |
| media.eventhubs.com/images/characters/ssbu/ | Character portrait images |

## Notes

- Richter shares a page with Simon on eventhubs; Dark Pit with Pit; Dark Samus with Samus; Daisy with Peach. Their matchup data reflects the combined page.
- The 1.5-second delay between eventhubs requests is intentional to avoid rate limiting.
- Some characters may have scrape errors (timeouts, missing pages) — these show up in the `matchup_error` field and are excluded from the graph.
