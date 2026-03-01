# Anti-Slop - User Guide

<div align="center">

![Version](https://img.shields.io/badge/version-1.6.0-blue.svg)
![Platforms](https://img.shields.io/badge/platforms-12-green.svg)
![Privacy](https://img.shields.io/badge/privacy-100%25-orange.svg)

**Block addictive brainrot and AI slop across the web. Reclaim your focus.**

</div>

---

## 🚀 Quick Start

1. **Install the extension** (see [Installation](#installation))
2. **Click the Anti-Slop icon** in your Chrome toolbar
3. **Enable platforms** you want to filter
4. **Adjust sensitivity** if needed (Medium is recommended)
5. **Browse normally** - blocked content disappears automatically

That's it! 🎉

---

## 📱 Supported Platforms

Anti-Slop filters **12 platforms**:

| Platform | What It Blocks |
|----------|---------------|
| **YouTube** | Shorts, brainrot videos, clickbait |
| **Instagram** | Reels, brainrot posts |
| **Twitter/X** | Brainrot tweets, engagement bait |
| **Reddit** | Brainrot posts, low-effort content |
| **Google Search** | AI Overviews, SEO spam, content farms |
| **LinkedIn** | Motivational spam, AI engagement bait |
| **TikTok** | Full feed or brainrot content |
| **Facebook** | Reels, Stories, suggested content |
| **Bluesky** | Brainrot posts, engagement bait |
| **Threads** | Brainrot posts, suggested content |
| **AI Articles** | AI-generated blog posts & news |
| **News Sites** | AI-generated articles |

---

## 🎛️ Features

### Brainrot Detection
Blocks addictive "brainrot" content using **60+ keyword patterns**:
- Gen Z slang: skibidi, gyatt, rizz, mewing, looksmaxxing, sigma grindset
- Engagement bait: "part 2 in bio", "tag a friend", "share if you agree"
- Low-effort content: reposts, "no context", meme compilations
- Crypto/investment spam, self-help guru content, conspiracy narratives

### AI Article Detection
Detects AI-generated articles using:
- **Phrase density analysis** (corporate jargon, filler phrases)
- **Structural heuristics** (formulaic intros, listicle format)
- **Vocabulary diversity scoring** (AI tends to be repetitive)
- **Repetition analysis** (repeated phrases, uniform sentence lengths)

**Three-tier UX** based on detection confidence:
- **High (75+)**: Full-page warning with score breakdown
- **Medium (threshold-74)**: Warning banner at top of page
- **Low (30-threshold)**: Subtle floating badge

### AI Phrase Highlighting
When AI content is detected, **detected phrases are highlighted inline** so you can learn to spot AI writing patterns yourself. Toggle on/off from the warning banner.

### Focus Mode
One toggle to **block ALL social media** at once. Perfect for deep work sessions.

### Time Tracking
Automatically tracks **time spent on social media** per day. View:
- Today's total time
- Weekly totals
- Per-site breakdown

### Custom Keyword Rules
Add your own block/allow keywords:
- **Block keywords**: Content you never want to see
- **Allow keywords**: Reduce false positives for topics you care about

### Export/Import Settings
Backup your configuration:
- Export all settings, stats, and whitelist to a JSON file
- Import on another device
- Useful for migrating between computers

### Keyboard Shortcuts
- `Ctrl+Shift+A` (Mac: `Cmd+Shift+A`): Toggle extension on/off
- `Ctrl+Shift+S` (Mac: `Cmd+Shift+S`): Open popup

---

## ⚙️ How to Use

### Opening the Popup
Click the **Anti-Slop icon** (🛡️) in your Chrome toolbar.

### Enabling Platforms
Toggle platforms on/off in the **Platform Controls** section. Each platform has independent settings.

### Adjusting Sensitivity
For each platform, you can set:
- **Low**: Only blocks obvious brainrot (fewer false positives)
- **Medium**: Balanced detection (recommended)
- **High**: Aggressive filtering (may block some legitimate content)

### Using Focus Mode
Enable **Focus Mode** in the popup to block ALL social media at once. Great for:
- Deep work sessions
- Study time
- Digital detox periods

### Viewing Statistics
The popup shows:
- **Total blocked**: Number of items filtered
- **Time saved**: Estimated minutes saved
- **Time tracking**: Today's and week's social media usage

### Managing Whitelist
Add domains you trust and don't want scanned:
1. Enter a domain (e.g., `example.com`)
2. Click **Add**
3. That site will be excluded from AI detection

### Exporting/Importing Settings
1. Click **Export Settings** to download a JSON backup
2. On another device, click **Import Settings**
3. Select the backup file

---

## 🔧 Installation

### From Chrome Web Store (Recommended)
1. Visit the Anti-Slop page on Chrome Web Store
2. Click **Add to Chrome**
3. Click **Add Extension**

### From Source (Developer Mode)
1. Download the extension files
2. Open `chrome://extensions/`
3. Enable **Developer mode** (top-right)
4. Click **Load unpacked**
5. Select the `anti-slop` folder

---

## ❓ Troubleshooting

### Content isn't being blocked
- Check that the platform is **enabled** in the popup
- Try increasing **sensitivity** to High
- Make sure the site isn't **whitelisted**

### Legitimate content is being blocked
- Try lowering **sensitivity** to Low
- Use **custom allow keywords** for topics you care about
- Click **View Anyway** to see the content

### Extension not working on a site
- Refresh the page
- Check if the site uses a new domain
- Report the issue on GitHub

---

## 📄 Privacy

Anti-Slop is **100% privacy-first**:
- ❌ No servers
- ❌ No tracking
- ❌ No telemetry
- ❌ No data collection
- ✅ All processing happens in your browser
- ✅ Optional: Settings sync via Chrome's built-in storage

---

## 📞 Support

- **Report bugs**: [GitHub Issues](https://github.com/Ronak-IIITD/anti_ai-slop/issues)
- **Feature requests**: [GitHub Issues](https://github.com/Ronak-IIITD/anti_ai-slop/issues)
- **Source code**: [GitHub Repository](https://github.com/Ronak-IIITD/anti_ai-slop)

---

<div align="center">

**Made with focus** 🧠

</div>
