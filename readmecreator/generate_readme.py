#!/usr/bin/env python3
"""
Generates README.md from readme_data/ratings.txt and readme_data/descriptions.txt.
Edit format_readme() below to change how the README looks.
"""

from pathlib import Path

ROOT = Path(__file__).parent
RATINGS_FILE      = ROOT / "readme_data" / "ratings.txt"
DESCRIPTIONS_FILE = ROOT / "readme_data" / "descriptions.txt"
FOLDERS_FILE      = ROOT / "readme_data" / "folders.txt"
README_FILE       = ROOT.parent / "README.md"


def parse_data_file(filepath):
    result = {}
    with open(filepath, encoding="utf-8") as file:
        for line in file:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            parts = line.split("|", 1)
            if len(parts) == 2:
                result[parts[0].strip()] = parts[1].strip()
    return result


def sorted_projects(ratings, descriptions, folders):
    projects = []
    for name, rating_string in ratings.items():
        try:
            rating = float(rating_string)
        except ValueError:
            rating = 5.0
        description = descriptions.get(name, "No description available.")
        folder = folders.get(name)
        projects.append((name, rating, description, folder))
    projects.sort(key=lambda project: project[1], reverse=True)
    return projects


# Edit this function to change the README format.
def format_readme(projects):
    lines = []
    lines.append("# Projects\n\n")
    lines.append("A collection of personal projects.\n\n")
    for name, rating, description, folder in projects:
        if folder:
            title = f"[{name}](./{folder})"
        else:
            title = name
        lines.append(f"## {title}\n")
        lines.append(f"{description}\n\n")
    return "".join(lines).rstrip() + "\n"


def main():
    ratings      = parse_data_file(RATINGS_FILE)
    descriptions = parse_data_file(DESCRIPTIONS_FILE)
    folders      = parse_data_file(FOLDERS_FILE)
    projects     = sorted_projects(ratings, descriptions, folders)
    content      = format_readme(projects)
    README_FILE.write_text(content, encoding="utf-8")
    print(f"README.md updated — {len(projects)} project(s) listed.")


if __name__ == "__main__":
    main()
