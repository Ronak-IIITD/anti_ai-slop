#!/bin/bash

echo "═════════════════════════════════════════════════"
echo "  Anti-Slop Chrome Extension - Installation Check"
echo "═════════════════════════════════════════════════"
echo ""

# Check if required files exist
echo "Checking required files..."
files=(
  "manifest.json"
  "background.js"
  "popup/popup.html"
  "popup/popup.css"
  "popup/popup.js"
  "icons/icon16.png"
  "icons/icon48.png"
  "icons/icon128.png"
  "content-scripts/youtube.js"
  "content-scripts/twitter.js"
  "content-scripts/reddit.js"
  "content-scripts/instagram.js"
  "content-scripts/tiktok.js"
  "content-scripts/ai-detector.js"
  "utils/storage.js"
  "utils/ai-patterns.js"
  "utils/brainrot-patterns.js"
  "content-scripts/common.js"
  "content-scripts/ai-detector.css"
  "content-scripts/youtube.css"
  "content-scripts/twitter.css"
  "content-scripts/reddit.css"
  "content-scripts/instagram.css"
  "content-scripts/tiktok.css"
  "PRIVACY_POLICY.md"
)

all_good=true
for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "  ✅ $file"
  else
    echo "  ❌ $file MISSING"
    all_good=false
  fi
done

echo ""
echo "Documentation:"
[ -f "README.md" ] && echo "  ✅ README.md" || echo "  ❌ README.md MISSING"
[ -f "QUICKSTART.md" ] && echo "  ✅ QUICKSTART.md" || echo "  ❌ QUICKSTART.md MISSING"
[ -f "CONTRIBUTING.md" ] && echo "  ✅ CONTRIBUTING.md" || echo "  ❌ CONTRIBUTING.md MISSING"
[ -f "LICENSE" ] && echo "  ✅ LICENSE" || echo "  ❌ LICENSE MISSING"

echo ""
echo "═════════════════════════════════════════════════"

if [ "$all_good" = true ]; then
  echo "✅ All files present! Extension is ready to load."
  echo ""
  echo "Next Steps:"
  echo "1. Open Chrome and go to chrome://extensions/"
  echo "2. Enable 'Developer mode' (top-right toggle)"
  echo "3. Click 'Load unpacked'"
  echo "4. Select this directory: $(pwd)"
  echo "5. Test on YouTube, Twitter, Instagram!"
  echo ""
  echo "Read QUICKSTART.md for detailed instructions."
else
  echo "❌ Some files are missing. Please check the errors above."
fi

echo "═════════════════════════════════════════════════"
