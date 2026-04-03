#!/usr/bin/env python3
"""
SSBU Scraper
------------
Scrapes the SSBU tier list from ssbwiki.com and matchup chart data from
eventhubs.com, then compares tier rankings against matchup performance.

Output: printed summary table + results.csv

Sources:
  Tier list : https://www.ssbwiki.com/Tier_list
  Matchups  : https://www.eventhubs.com/tiers/ssbu/character/<slug>/
"""

import re
import csv
import time
import requests
from bs4 import BeautifulSoup
from dataclasses import dataclass, field
from typing import Optional

# Stuff for scraper to work
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    )
}
REQUEST_DELAY = 1.5  # add delay to be nice and avoid rate limiting

SSBWIKI_TIER_URL    = "https://www.ssbwiki.com/Tier_list"
EVENTHUBS_MATCHUP   = "https://www.eventhubs.com/tiers/ssbu/character/{slug}/"

# Separator cell background colors used in the ssbwiki wikitable
SEPARATOR_BG = {"#dfdfdf", "#efefef", "#cbcbcb", "#bfbfbf"}

# Tier label pattern
TIER_LABEL_RE = re.compile(r"^(S[+-]?|A[+-]?|B[+-]?|C[+-]?|D[+-]?|E)$")

# Manual slug overrides for characters whose names don't map cleanly to eventhubs urls
SLUG_OVERRIDES = {
    "Mr. Game & Watch": "mr-game-watch",
    "R.O.B":            "rob",
    "R.O.B.":           "rob",
    "Pac-Man":          "pac-man",
    "Bowser Jr.":       "bowser-jr",
    "Pokémon Trainer":  "pokemon-trainer",
    "Pokemon Trainer":  "pokemon-trainer",
    "Pyra & Mythra":    "pyra-mythra",
    "Pyra/Mythra":      "pyra-mythra",
    "Banjo & Kazooie":  "banjo-kazooie",
    "Richter":          "simon",      # eventhubs combines Simon/Richter on one page
    "Min Min":          "min-min",
    "Diddy Kong":       "diddy-kong",
    "Donkey Kong":      "donkey-kong",
    "King K. Rool":     "king-k-rool",
    "King Dedede":      "king-dedede",
    "Meta Knight":      "meta-knight",
    "Ice Climbers":     "ice-climbers",
    "Piranha Plant":    "piranha-plant",
    "Duck Hunt":        "duck-hunt",
    "Dark Pit":         "pit",       # eventhubs combines Pit/Dark Pit on one page
    "Zero Suit Samus":  "zero-suit-samus",
    "Mega Man":         "mega-man",
    "Little Mac":       "little-mac",
    "Mii Brawler":      "mii-brawler",
    "Mii Swordfighter": "mii-swordfighter",
    "Mii Gunner":       "mii-gunner",
    "Wii Fit Trainer":  "wii-fit-trainer",
    "Dark Samus":       "samus",     # eventhubs combines Samus/Dark Samus on one page
    "Rosalina & Luma":  "rosalina-luma",
    "Toon Link":        "toon-link",
    "Young Link":       "young-link",
    "Dr. Mario":        "dr-mario",
    "Peach":            "peach",
    "Daisy":            "peach",   # eventhubs combines Peach/Daisy on one page
}


@dataclass
class TierEntry:
    rank:  int
    name:  str
    tier:  str
    score: float
    slug:  str = ""

@dataclass
class Matchup:
    opponent:  str
    avg_score: float
    votes:     int

@dataclass
class MatchupResult:
    name:     str
    slug:     str
    matchups: list = field(default_factory=list)
    error:    str  = ""

    @property
    def avg(self) -> Optional[float]:
        valid = [m.avg_score for m in self.matchups if m.votes > 0]
        return round(sum(valid) / len(valid), 3) if valid else None

    @property
    def favorable(self) -> int:
        """Matchups where avg > 5.0 (character favored)."""
        return sum(1 for m in self.matchups if m.avg_score > 5.0)

    @property
    def unfavorable(self) -> int:
        """Matchups where avg < 5.0 (opponent favored)."""
        return sum(1 for m in self.matchups if m.avg_score < 5.0)

    @property
    def even(self) -> int:
        return sum(1 for m in self.matchups if m.avg_score == 5.0)

# Fetch a URL and return BeautifulSoup object, with error handling
def fetch(url: str) -> BeautifulSoup:
    resp = requests.get(url, headers=HEADERS, timeout=15)
    resp.raise_for_status()
    return BeautifulSoup(resp.text, "html.parser")

# Check if a cell is a separator cell
def is_separator(cell) -> bool:
    style = cell.get("style", "")
    return any(bg in style for bg in SEPARATOR_BG)

# Convert character name to eventhubs slug, with some manual overrides and cleanup
def to_slug(name: str) -> str:
    if name in SLUG_OVERRIDES:
        return SLUG_OVERRIDES[name]
    slug = name.lower()
    slug = slug.replace("é", "e").replace("è", "e").replace("ñ", "n")
    slug = slug.replace("&", "").replace(".", "")
    slug = re.sub(r"[^a-z0-9\s-]", "", slug)
    slug = re.sub(r"\s+", "-", slug.strip())
    slug = re.sub(r"-+", "-", slug)
    return slug

# Return a flat list of (cell, text) pairs, each cell repeated by its colspan,
# skipping separator cells. tag_filter is a list like ['td', 'th'] or None for both.
def expand_cells(row, tag_filter=None):
    result = []
    tags = row.find_all(tag_filter or ["td", "th"])
    for cell in tags:
        if is_separator(cell):
            continue
        colspan = int(cell.get("colspan", 1))
        for _ in range(colspan):
            result.append(cell)
    return result

# Scraping the overall tier list
def scrape_tier_list() -> list[TierEntry]:
    print("Fetching tier list from ssbwiki.com ...")
    soup = fetch(SSBWIKI_TIER_URL)

    # Find the SSBU tier list table
    target = None
    for table in soup.find_all("table"):
        classes = table.get("class", [])
        if "wikitable" not in classes:
            continue
        text = table.get_text()
        if "Super Smash Bros. Ultimate" in text:
            target = table
            break

    if not target:
        raise RuntimeError("Could not find the SSBU tier list table on ssbwiki.")

    rows = [r for r in target.find_all("tr") if r.find(["td", "th"])]
    entries = []
    i = 0

    while i < len(rows):
        row = rows[i]

        # A tier-header row has <th> cells whose text matches tier labels (S+, A-, etc.)
        th_texts = [th.get_text(strip=True) for th in row.find_all("th")]
        tier_labels_found = [t for t in th_texts if TIER_LABEL_RE.match(t)]

        if not tier_labels_found or i + 3 >= len(rows):
            i += 1
            continue

        # This is a block: tier_row, rank_row, char_row, score_row
        tier_row  = rows[i]
        rank_row  = rows[i + 1]
        char_row  = rows[i + 2]
        score_row = rows[i + 3]

        # Building tier labels for each position by expanding colspan, skipping separators
        tiers_at_pos = []
        for cell in tier_row.find_all(["th", "td"]):
            if is_separator(cell):
                continue
            label = cell.get_text(strip=True)
            colspan = int(cell.get("colspan", 1))
            if TIER_LABEL_RE.match(label):
                for _ in range(colspan):
                    tiers_at_pos.append(label)

        # Ranks
        ranks = []
        for cell in rank_row.find_all("td"):
            if is_separator(cell):
                continue
            text = cell.get_text(strip=True)
            colspan = int(cell.get("colspan", 1))
            val = int(text) if text.isdigit() else None
            for _ in range(colspan):
                ranks.append(val)

        # Character names from img alt text
        chars = []
        for cell in char_row.find_all("td"):
            if is_separator(cell):
                continue
            img = cell.find("img")
            name = None
            if img:
                alt = img.get("alt", "")
                m = re.match(r"^(.+?)\s*\(SSBU\)", alt)
                if m:
                    name = m.group(1).strip()
            colspan = int(cell.get("colspan", 1))
            for _ in range(colspan):
                chars.append(name)

        # Scores
        scores = []
        for cell in score_row.find_all("td"):
            if is_separator(cell):
                continue
            text = cell.get_text(strip=True)
            colspan = int(cell.get("colspan", 1))
            try:
                val = float(text)
                val = val if val >= 0.5 else None  # sanity check only, scores can exceed 10
            except ValueError:
                val = None
            for _ in range(colspan):
                scores.append(val)

        # Zip into entries
        for tier, rank, name, score in zip(tiers_at_pos, ranks, chars, scores):
            if name and rank is not None and score is not None:
                entries.append(TierEntry(
                    rank=rank, name=name, tier=tier, score=score,
                    slug=to_slug(name)
                ))

        i += 4  # advance past this block

    entries.sort(key=lambda e: e.rank)
    print(f"  → Parsed {len(entries)} characters from tier list")
    return entries

# Matchup scraper
def scrape_matchup(entry: TierEntry) -> MatchupResult:
    url = EVENTHUBS_MATCHUP.format(slug=entry.slug)
    result = MatchupResult(name=entry.name, slug=entry.slug)

    try:
        soup = fetch(url)
        table = soup.find("table", class_="tierstable")
        if not table:
            result.error = "no tierstable on page"
            return result

        for row in table.find_all("tr", class_=["odd", "even"]):
            cells = row.find_all("td", class_="tierstdnorm")
            if len(cells) < 4:
                continue
            opponent = cells[1].get_text(strip=True)
            try:
                votes = int(cells[2].get_text(strip=True))
                avg   = float(cells[3].get_text(strip=True))
            except ValueError:
                continue
            result.matchups.append(Matchup(opponent=opponent, avg_score=avg, votes=votes))

    except requests.HTTPError as exc:
        result.error = f"HTTP {exc.response.status_code}"
    except Exception as exc:
        result.error = str(exc)

    return result

# Comparing and outputting results
def compare_and_output(tier_data: list[TierEntry], matchup_data: list[MatchupResult]):
    matchup_map = {m.name.lower(): m for m in matchup_data}

    rows = []
    for entry in tier_data:
        mu = matchup_map.get(entry.name.lower())
        rows.append({
            "rank":          entry.rank,
            "name":          entry.name,
            "tier":          entry.tier,
            "tier_score":    entry.score,
            "matchup_avg":   mu.avg          if mu else None,
            "favorable":     mu.favorable    if mu else None,
            "unfavorable":   mu.unfavorable  if mu else None,
            "even":          mu.even         if mu else None,
            "matchup_error": mu.error        if mu and mu.error else "",
        })

    # Print summary table
    W = 90
    print("\n" + "=" * W)
    print(f"{'#':>3}  {'Name':<22}  {'Tier':<4}  {'Tier Score':>10}  "
          f"{'MU Avg':>6}  {'Win':>4}  {'Loss':>4}  {'Even':>4}")
    print("=" * W)
    for r in rows:
        mu_avg = f"{r['matchup_avg']:.3f}" if r["matchup_avg"] is not None else "  N/A"
        win    = str(r["favorable"])   if r["favorable"]   is not None else "N/A"
        loss   = str(r["unfavorable"]) if r["unfavorable"] is not None else "N/A"
        even   = str(r["even"])        if r["even"]        is not None else "N/A"
        err    = f"  [{r['matchup_error']}]" if r["matchup_error"] else ""
        print(f"{r['rank']:>3}  {r['name']:<22}  {r['tier']:<4}  "
              f"{r['tier_score']:>10.3f}  {mu_avg:>6}  {win:>4}  {loss:>4}  {even:>4}{err}")

    # Outlier analysis
    scored = [r for r in rows if r["matchup_avg"] is not None]
    if scored:
        max_rank = max(r["rank"] for r in scored)
        for r in scored:
            # norm_rank: 1.0 = best rank (#1), 0.0 = worst
            r["_norm_rank"] = 1.0 - (r["rank"] - 1) / (max_rank - 1)
            # norm_mu: centered around 5 (even matchup), typical range 4–7
            r["_norm_mu"]   = (r["matchup_avg"] - 4.0) / 3.0
            r["_gap"]       = r["_norm_mu"] - r["_norm_rank"]

        print(f"\n{'─' * W}")
        print("  OUTLIERS — biggest gap between tier rank and matchup performance")

        print("\n  Matchup avg BETTER than tier rank suggests (underrated):")
        for r in sorted(scored, key=lambda x: -x["_gap"])[:5]:
            print(f"    #{r['rank']:<3} {r['name']:<22} "
                  f"tier {r['tier']}  tier score {r['tier_score']:.3f}  "
                  f"→ MU avg {r['matchup_avg']:.3f}  "
                  f"({r['favorable']}W / {r['unfavorable']}L)")

        print("\n  Matchup avg WORSE than tier rank suggests (overrated):")
        for r in sorted(scored, key=lambda x: x["_gap"])[:5]:
            print(f"    #{r['rank']:<3} {r['name']:<22} "
                  f"tier {r['tier']}  tier score {r['tier_score']:.3f}  "
                  f"→ MU avg {r['matchup_avg']:.3f}  "
                  f"({r['favorable']}W / {r['unfavorable']}L)")

    # Exporting into csv to use in graphing
    csv_path = "results.csv"
    fieldnames = ["rank", "name", "tier", "tier_score", "matchup_avg",
                  "favorable", "unfavorable", "even", "matchup_error"]
    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)
    print(f"\n  Results saved → {csv_path}")

# main stuff
def main():
    # Scrape tier list
    tier_data = scrape_tier_list()

    # Scrape matchup page for each character
    matchup_results = []
    total = len(tier_data)
    print(f"\nFetching matchup pages from eventhubs.com ({total} characters) ...")
    for i, entry in enumerate(tier_data, 1):
        print(f"  [{i:>2}/{total}] {entry.name:<25} slug={entry.slug}")
        result = scrape_matchup(entry)
        if result.error:
            print(f"          ⚠  {result.error}")
        else:
            print(f"          ✓  {len(result.matchups)} matchups  avg={result.avg}")
        matchup_results.append(result)
        time.sleep(REQUEST_DELAY)

    # Compare and output
    compare_and_output(tier_data, matchup_results)


if __name__ == "__main__":
    main()
