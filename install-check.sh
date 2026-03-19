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
  "content-scripts/common.js"
  "content-scripts/youtube.js"
  "content-scripts/youtube.css"
  "content-scripts/twitter.js"
  "content-scripts/twitter.css"
  "content-scripts/reddit.js"
  "content-scripts/reddit.css"
  "content-scripts/instagram.js"
  "content-scripts/instagram.css"
  "content-scripts/tiktok.js"
  "content-scripts/tiktok.css"
  "content-scripts/google.js"
  "content-scripts/google.css"
  "content-scripts/linkedin.js"
  "content-scripts/linkedin.css"
  "content-scripts/facebook.js"
  "content-scripts/facebook.css"
  "content-scripts/bluesky.js"
  "content-scripts/bluesky.css"
  "content-scripts/threads.js"
  "content-scripts/threads.css"
  "content-scripts/ai-detector.js"
  "content-scripts/ai-detector.css"
  "utils/storage.js"
  "utils/ai-patterns.js"
  "utils/brainrot-patterns.js"
  "utils/media-detector.js"
  "utils/utility-scorer.js"
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
