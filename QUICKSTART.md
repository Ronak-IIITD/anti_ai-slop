# Quick Start Guide

## Installation (5 minutes)

1. **Download the extension**
   - Clone or download this repository
   - Extract if downloaded as ZIP

2. **Load in Chrome**
   - Open Chrome
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode" (top-right toggle)
   - Click "Load unpacked"
   - Select the `anti-slop` folder

3. **You're done!**
   - The extension is now active
   - Visit YouTube, Twitter, Instagram, or TikTok to see it in action

## Testing the Extension

### Test on YouTube
1. Go to https://youtube.com
2. Shorts shelf should be hidden from homepage
3. Shorts button removed from sidebar

### Test on Twitter/X
1. Go to https://twitter.com or https://x.com
2. Short posts (<100 chars) should be hidden
3. Open extension popup to adjust character threshold

### Test on Instagram
1. Go to https://instagram.com
2. Reels tab hidden from navigation
3. Reels removed from feed

### Test AI Detector
1. Visit a blog post or news article
2. If detected as AI-generated slop (score ≥60), you'll see a block screen
3. Click "View Anyway" to override if needed

## Customization

Click the extension icon (🛡️) in your toolbar to:
- Toggle platforms on/off
- Adjust Twitter character threshold
- Change AI detector sensitivity
- View statistics
- Reset counters

## Troubleshooting

### Extension not working?
1. Refresh the page you're testing on
2. Check that the platform is enabled in settings
3. Try reloading the extension at `chrome://extensions/`

### Blocked content still showing?
- Platforms frequently update their HTML - selectors may need updating
- Check GitHub for updates or report an issue

### Statistics not updating?
- Refresh the popup to see latest counts
- Badge shows real-time total blocked count

## Need Help?

- Read the full [README.md](README.md)
- Check [GitHub Issues](https://github.com/yourusername/anti-slop/issues)
- Report bugs or request features

---

**Enjoy your newfound focus!** 🛡️
