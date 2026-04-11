# Anti-Slop Icons

This directory contains the source vector icon and generated PNG files used by the Chrome extension.

## Files

- `icon.svg` - Master icon source (edit this first)
- `icon16.png` - Browser toolbar icon
- `icon48.png` - Chrome extensions page icon
- `icon128.png` - Chrome Web Store icon

## Generate PNG icons from SVG

Use the helper script from this directory:

```bash
./create-icons.sh
```

It renders `icon.svg` into all required PNG sizes using ImageMagick.

If needed, make it executable once:

```bash
chmod +x create-icons.sh
```

## Manual command (alternative)

```bash
convert -background none icon.svg -resize 16x16 icon16.png
convert -background none icon.svg -resize 48x48 icon48.png
convert -background none icon.svg -resize 128x128 icon128.png
```
