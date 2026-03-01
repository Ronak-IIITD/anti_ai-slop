# Anti-Slop

<div align="center">

![Version](https://img.shields.io/badge/version-1.6.0-blue.svg)
![Manifest](https://img.shields.io/badge/manifest-v3-green.svg)
![License](https://img.shields.io/badge/license-MIT-orange.svg)
![JavaScript](https://img.shields.io/badge/javascript-vanilla-yellow.svg)

**Block addictive brainrot and low-quality AI slop across social media and news sites.**

A privacy-first Chrome extension that filters out algorithmic junk, AI-generated articles, and engagement bait—so you can browse with focus.

[Features](#features) • [Install](#installation) • [📖 User Guide](USER_GUIDE.md) • [🚀 Deployment Guide](DEPLOYMENT_GUIDE.md) • [Contributing](#contributing)

</div>

---

## 🎯 Why Anti-Slop?

Social media algorithms optimize for engagement, not your wellbeing. Anti-Slop gives you back control by:

- **Blocking brainrot content** using intelligent keyword detection (60+ patterns including "skibidi", "gyatt", "sigma grindset", engagement bait, etc.)
- **Detecting AI-generated articles** with phrase density analysis and structural heuristics
- **Operating 100% locally** with zero telemetry, no servers, no tracking
- **Respecting your choices** with granular platform toggles and sensitivity controls

Built with vanilla JavaScript (no dependencies), designed for speed and privacy.

---

## ✨ Features

### 🧠 Brainrot Detection
Smart filtering using **60+ tiered keyword patterns**:
- **Strong indicators**: skibidi, gyatt, rizz, fanum tax, mewing, looksmaxxing, sigma grindset
- **Engagement bait**: "part 2 in bio", "tag a friend", "share if you agree"
- **Low-effort content**: reposts, "no context", meme compilations
- **Crypto/self-help spam**: to the moon, diamond hands, hustle culture, etc.

### 🤖 AI Article Detection (Confidence-Tiered UX)
Three response levels based on detection confidence:
- **High (75+)**: Full-page warning with score breakdown
- **Medium (threshold-74)**: Warning banner at top of page
- **Low (30-threshold)**: Subtle floating badge
- **AI Phrase Highlighting**: Detected phrases underlined inline

### 🎛️ 12 Platform Support
| Platform | Blocks |
|----------|--------|
| YouTube | Shorts, brainrot videos |
| Instagram | Reels, brainrot posts |
| Twitter/X | Brainrot tweets, replies |
| Reddit | Brainrot posts, low-effort content |
| Google Search | AI Overviews, SEO spam |
| LinkedIn | Motivational spam, AI posts |
| TikTok | Full feed or brainrot |
| Facebook | Reels, Stories, suggested |
| Bluesky | Brainrot, engagement bait |
| Threads | Brainrot posts |
| AI Articles | AI-generated content |
| News Sites | AI-generated articles |

### 🎯 Additional Features
- **Focus Mode**: One toggle to block ALL social media
- **Time Tracking**: Monitor daily/weekly social media usage
- **Custom Keyword Rules**: Add your own block/allow keywords
- **Export/Import**: Backup and restore settings
- **Keyboard Shortcuts**: Toggle with Ctrl+Shift+A

### 🔒 Privacy-First Design
- No remote servers
- No analytics or telemetry
- No user tracking
- All processing happens in your browser
- Settings sync via Chrome's built-in storage (optional)

---

## 📦 Installation

### Option 1: Chrome Web Store (Recommended)
> 🚧 Coming soon

### Option 2: Install from Source

1. **Download the extension:**
   - Clone: `git clone https://github.com/Ronak-IIITD/anti_ai-slop.git`
   - Or download the ZIP from GitHub releases

2. **Load in Chrome:**
   - Open `chrome://extensions/`
   - Enable **Developer mode** (top-right toggle)
   - Click **Load unpacked**
   - Select the `anti_ai-slop` directory

3. **Pin the extension:**
   - Click the puzzle icon in Chrome toolbar
   - Pin "Anti-Slop" for easy access

---

## 📖 Getting Started

For detailed usage instructions, see the **[User Guide](USER_GUIDE.md)**.

Quick overview:
1. Click the **Anti-Slop icon** in toolbar
2. Enable platforms you want to filter
3. Adjust sensitivity (Medium is recommended)
4. Browse normally - blocked content disappears automatically

---

## 🚀 Deployment

For publishing to the Chrome Web Store, see the **[Deployment Guide](DEPLOYMENT_GUIDE.md)**.

---

## 🚀 Usage

### Basic Workflow
1. **Open the popup** by clicking the Anti-Slop icon
2. **Enable platforms** you want to filter (YouTube, Instagram, X, TikTok, AI Detector)
3. **Adjust sensitivity** for each platform:
   - **Low**: Only blocks strong brainrot signals
   - **Medium**: Balanced detection (recommended)
   - **High**: Aggressive filtering
4. **Browse normally**—filtered content disappears automatically

### Placeholders
Blocked items can be replaced with a placeholder showing the reason (e.g., "🚫 Blocked: Brainrot content detected"). Click **Show Content** to reveal it without reloading.

**Toggle placeholders:** Open popup → Settings → "Show Blocked Placeholders"

### Stats Dashboard
View total blocks and estimated time saved in the popup's stats section. Resets are available if needed.

---

## 🛠️ How It Works

Anti-Slop uses **deterministic client-side heuristics**—no machine learning, no cloud APIs.

### Architecture
```
┌─────────────────────────────────────────┐
│  Content Scripts (per platform)         │
│  • Watch DOM for new content            │
│  • Extract text from posts/videos       │
│  • Score using detection algorithms     │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│  Detection Engines                      │
│  • Brainrot: Tiered keyword scoring     │
│  • AI: Phrase density + structure       │
│  • Clickbait: Pattern matching          │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│  Blocking Layer                         │
│  • Hide elements (display: none)        │
│  • Insert placeholders (optional)       │
│  • Update block counter                 │
└─────────────────────────────────────────┘
```

### Technical Details
- **Mutation Observers**: Monitor infinite-scroll feeds with 300ms debouncing
- **Selector Targeting**: Platform-specific CSS selectors (updated regularly as sites change)
- **Storage**: Chrome sync storage for settings, local storage for stats
- **Performance**: Minimal DOM manipulation; processed elements are marked to avoid reprocessing

---

## 📁 Project Structure

```
anti_ai-slop/
├── manifest.json               # Extension config (Manifest V3)
├── background.js               # Service worker for stats/settings
├── content-scripts/
│   ├── common.js               # Shared utilities (debounce, hide, placeholders)
│   ├── youtube.js              # YouTube Shorts/brainrot detection
│   ├── instagram.js            # Instagram Reels/posts filtering
│   ├── twitter.js              # X/Twitter brainrot + clickbait
│   ├── tiktok.js               # TikTok feed blocker
│   ├── ai-detector.js          # AI article detection
│   └── *.css                   # Platform-specific styles
├── popup/
│   ├── popup.html              # Extension popup UI
│   ├── popup.css               # Popup styles
│   └── popup.js                # Popup logic
├── utils/
│   ├── storage.js              # Settings/stats management
│   ├── brainrot-patterns.js    # Brainrot keyword tiers
│   └── ai-patterns.js          # AI detection phrases
└── icons/                      # Extension icons (16/48/128px)
```



---

## 🧪 Development

### No Build Step Required
This extension uses **vanilla JavaScript** with no build tools, bundlers, or transpilation. Make changes and reload—that's it.

### Quick Start
```bash
# Verify all required files are present
./install-check.sh

# Make changes to any file
# Then reload extension in chrome://extensions/
```

### Manual Testing Checklist
Test on live platforms after making changes:

- [ ] **YouTube**: Shorts disappear from homepage, search, and feed
- [ ] **Instagram**: Reels hidden from navigation, explore, and feed
- [ ] **X/Twitter**: Brainrot tweets blocked; useful AI replies stay visible
- [ ] **TikTok**: Feed blocked if enabled (needs international tester)
- [ ] **AI Detector**: AI-heavy articles flagged on news sites
- [ ] **Placeholders**: "Show Content" button reveals blocked items
- [ ] **Stats**: Block counter increments correctly

### Debugging
```javascript
// Check console logs (prefixed by platform)
// [Anti-Slop:YouTube] Blocked 3 Shorts
// [Anti-Slop:Twitter] Scored tweet: 15 points

// Inspect storage
chrome.storage.sync.get(['antiSlop_settings', 'antiSlop_stats'], console.log);

// View background service worker logs
// chrome://extensions/ → Click "service worker" link under Anti-Slop
```

### Platform Selector Updates
Social media sites change DOM structure frequently. When updating selectors:

1. Open DevTools on the target platform
2. Inspect elements to find new selectors
3. Update selector constants in the content script
4. **Add date comment**: `// Updated as of 2026-02-11`
5. Test thoroughly on multiple pages (homepage, feed, search)
6. Commit with message: `fix: update [platform] selectors for new UI`

**Example:**
```javascript
// content-scripts/youtube.js
const SELECTORS = {
  shortsShelf: 'ytd-reel-shelf-renderer',      // Working as of 2026-02-11
  shortsVideo: [
    'ytd-reel-item-renderer',
    'ytd-shorts',                                // Added 2026-01-15 for redesign
  ],
};
```

---

## 🤝 Contributing

We welcome focused, pragmatic contributions. If you want to help, pick something below and open a PR.

### High-Impact Areas
- **Selector updates** (platforms change DOM frequently—this is ongoing)
- **Pattern tuning** (improve brainrot/AI detection accuracy)
- **TikTok validation** (needs international testers due to regional bans)
- **Performance optimization** (especially for heavy infinite-scroll feeds)
- **False positive reports** (help us tune detection thresholds)

### Contribution Workflow
1. **Fork** the repository
2. **Create a branch**: `feature/your-change` or `fix/issue-description`
3. **Make focused changes** (keep scope minimal)
4. **Test on target platforms** (see checklist above)
5. **Open a PR** with:
   - Clear summary of the change
   - Screenshots (if UI changes)
   - Testing evidence (e.g., "Tested on YouTube homepage, search, Shorts feed")

### Contribution Guidelines
- ✅ **Vanilla JavaScript only** (no npm packages, no build tools)
- ✅ **Selector updates need date comments** (e.g., `// Updated 2026-02-11`)
- ✅ **Conservative logic** (avoid aggressive filtering that causes false positives)
- ✅ **Code style**: Single quotes, 2-space indentation, semicolons
- ✅ **Commit messages**: Use conventional commits (`feat:`, `fix:`, `docs:`, etc.)
- ❌ **No external dependencies**
- ❌ **No telemetry/tracking code**
- ❌ **No aggressive self-promotion** in code comments

---

## ❓ FAQ

### Does this work on mobile?
Not yet. Chrome extensions on Android have limited support for content scripts. Mobile browser support is a future goal.

### Why isn't TikTok filtering working?
TikTok's DOM structure is complex and may vary by region. The extension includes a "block entire feed" option as a fallback. We need international testers to validate per-video blocking.

### Can I whitelist specific accounts or keywords?
Not yet, but this is a planned feature. For now, you can use the "Show Content" button to reveal individual blocked items.

### Does this slow down my browser?
Anti-Slop is lightweight and uses debounced mutation observers (300ms delay) to minimize performance impact. On heavy feeds (e.g., infinite scroll), you may notice a slight delay, but it's generally imperceptible.

### How accurate is the AI detector?
The AI detector uses phrase density heuristics, not machine learning. It's effective on formulaic articles (e.g., content farms, SEO spam) but may occasionally flag human-written corporate jargon. Adjust sensitivity or use the whitelist feature.

### What counts as "brainrot"?
We use a tiered keyword system based on 2025-2026 internet culture: "skibidi", "gyatt", "sigma grindset", "mewing", etc. Content needs **multiple signals** to be blocked. See `utils/brainrot-patterns.js` for the full list.

### Why are some legitimate posts being blocked?
This is called a "false positive". Please report it by opening a GitHub issue with:
- Platform (YouTube, Instagram, etc.)
- Screenshot or description of the blocked content
- Your current sensitivity setting

We'll tune the detection patterns based on your feedback.

### Can I export my block stats?
Not yet, but this is a planned feature. Currently, stats are stored locally and reset via the popup.

---

## 📊 Roadmap

- [ ] Chrome Web Store release
- [ ] Whitelist for specific accounts/channels
- [ ] Keyword customization (user-defined patterns)
- [ ] Stats export (CSV/JSON)
- [ ] Mobile browser support (when technically feasible)
- [ ] Reddit support
- [ ] LinkedIn brainrot filtering
- [ ] Configurable placeholder messages

---

## 🌟 About

Anti-Slop is a **community-driven project** built to protect attention in an era of infinite scroll and synthetic content. It's intentionally:
- **Lightweight**: No dependencies, no build tools
- **Privacy-first**: No servers, no tracking, no telemetry
- **Open-source**: Auditable by anyone, extensible by developers
- **Pragmatic**: Deterministic heuristics instead of black-box ML models

If this extension helps you reclaim focus, consider:
- ⭐ **Starring the repo** on GitHub
- 🐛 **Reporting false positives** or bugs
- 🤝 **Contributing** selector updates or pattern improvements
- 📢 **Sharing** with others who want to escape algorithmic junk

---

## 🔒 Privacy

- **No tracking**: Zero analytics, zero telemetry
- **No remote servers**: All processing happens in your browser
- **No data collection**: We don't know what you block or how you use the extension
- **Optional sync**: Chrome storage sync is opt-in (you can disable it in Chrome settings)

---

## 📄 License

MIT License. See [`LICENSE`](LICENSE) for details.

---

<div align="center">

**[⬆ Back to Top](#anti-slop)**

Made with focus by [@Ronak-IIITD](https://github.com/Ronak-IIITD)

</div>
