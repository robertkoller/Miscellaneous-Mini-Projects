#!/bin/bash
set -e

DATA_DIR="$(dirname "$0")/readme_data"

echo ""
echo "=== Add Project ==="
echo ""

read -p "Project name: " project_name
if [[ -z "$project_name" ]]; then
    echo "Error: project name cannot be empty."
    exit 1
fi

read -p "Description: " description
if [[ -z "$description" ]]; then
    echo "Error: description cannot be empty."
    exit 1
fi

read -p "Folder name (the actual directory name): " folder_name
if [[ -z "$folder_name" ]]; then
    folder_name="$project_name"
fi

read -p "Rating 1–10 (decimals ok) [default 5.0]: " rating
if [[ -z "$rating" ]]; then
    rating="5.0"
fi

echo ""
echo "About to add:"
echo "  Name:        $project_name"
echo "  Folder:      $folder_name"
echo "  Rating:      $rating"
echo "  Description: $description"
echo ""
read -p "Confirm? (y/N): " confirm

if [[ "${confirm,,}" != "y" && "${confirm,,}" != "yes" ]]; then
    echo "Cancelled."
    exit 0
fi

echo "$project_name | $rating" >> "$DATA_DIR/ratings.txt"
echo "$project_name | $description" >> "$DATA_DIR/descriptions.txt"
echo "$project_name | $folder_name" >> "$DATA_DIR/folders.txt"

echo ""
echo "Added '$project_name' (rating: $rating)."
echo ""

python3 "$(dirname "$0")/generate_readme.py"
