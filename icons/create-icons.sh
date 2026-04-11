#!/bin/bash
# Generate Anti-Slop PNG icons from icons/icon.svg

set -e

if ! command -v convert >/dev/null 2>&1; then
  echo "Error: ImageMagick 'convert' is not installed."
  echo "Install ImageMagick, then re-run this script."
  exit 1
fi

if [ ! -f "icon.svg" ]; then
  echo "Error: icon.svg not found in icons directory."
  exit 1
fi

convert -background none "icon.svg" -resize 16x16 "icon16.png"
convert -background none "icon.svg" -resize 48x48 "icon48.png"
convert -background none "icon.svg" -resize 128x128 "icon128.png"

echo "Generated: icon16.png, icon48.png, icon128.png"
