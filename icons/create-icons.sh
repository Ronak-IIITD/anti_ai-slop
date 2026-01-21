#!/bin/bash
# Placeholder script to create simple colored square icons
# Replace with proper icons later

# Create 16x16 icon (red square for now)
convert -size 16x16 xc:'#667eea' icon16.png 2>/dev/null || echo "ImageMagick not installed - create icons manually"

# Create 48x48 icon
convert -size 48x48 xc:'#667eea' icon48.png 2>/dev/null || echo "ImageMagick not installed - create icons manually"

# Create 128x128 icon
convert -size 128x128 xc:'#667eea' icon128.png 2>/dev/null || echo "ImageMagick not installed - create icons manually"

echo "Icons created (or need manual creation)"
