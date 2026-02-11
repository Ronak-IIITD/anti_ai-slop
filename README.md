# Anti-Slop

Block addictive brainrot and low-quality AI slop across YouTube, Instagram, X/Twitter, TikTok, and news sites. Anti-Slop is a Manifest V3 Chrome extension built with vanilla JavaScript, designed to be fast, local-first, and relentless against junk content.

## Why Anti-Slop

- **Reclaim focus**: Reduce algorithmic distractions that hijack attention.
- **Local-first**: All detection happens in your browser; no telemetry, no servers.
- **Practical controls**: Platform toggles, sensitivity settings, and clean defaults.

## Highlights

- **Brainrot detection** on YouTube, Instagram, and X/Twitter using tiered keyword scoring.
- **AI article detection** with density-based heuristics and adjustable sensitivity.
- **TikTok feed blocker** (community-maintained due to regional testing limits).
- **On-page placeholders** for blocked items with one-click reveal.
- **Stats dashboard** for total blocks and estimated time saved.

## Supported Platforms

- **YouTube**: Shorts and low-quality video metadata filtering.
- **Instagram**: Reels/posts/explore filtering via caption analysis.
- **X/Twitter**: Brainrot + clickbait filtering on tweets and replies.
- **TikTok**: Optional full feed block or per-item blocking.
- **News/Blogs**: AI article detector with whitelist support.

## Install (Development)

1. Clone the repo:
   ```bash
   git clone https://github.com/Ronak-IIITD/anti_ai-slop.git
   cd anti_ai-slop
   ```
2. Open `chrome://extensions/` and enable **Developer mode**.
3. Click **Load unpacked** and select the project directory.
4. Pin the extension and open the popup to configure settings.

## Usage

1. Open the popup.
2. Toggle platforms on/off.
3. Set sensitivity (where available).
4. Browse normally; Anti-Slop hides flagged content.

### Placeholder Behavior
Blocked items can be replaced by a placeholder with a **Show Content** button. Toggle this in the popup under **Show Blocked Placeholders**.

## How It Works

Anti-Slop relies on deterministic heuristics and DOM filtering:

- **Content scripts** detect items using platform selectors.
- **Brainrot scoring** uses tiered keywords and patterns.
- **AI detector** scores long-form content via phrase density and structure.
- **Mutation observers** keep pace with infinite-scroll feeds.
- **Chrome storage** syncs settings and stats across devices.

## Project Structure

```
anti_ai-slop/
├── manifest.json
├── background.js
├── content-scripts/
│   ├── common.js
│   ├── youtube.js
│   ├── instagram.js
│   ├── twitter.js
│   ├── tiktok.js
│   ├── ai-detector.js
│   └── *.css
├── popup/
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── utils/
│   ├── storage.js
│   ├── brainrot-patterns.js
│   └── ai-patterns.js
└── icons/
```

## Development

No build step. Make changes, then reload the extension in `chrome://extensions/`.

### Verification

```bash
./install-check.sh
```

### Manual Testing Checklist

- YouTube: Shorts and brainrot videos disappear from feeds.
- Instagram: Reels/explore slop removed.
- X/Twitter: brainrot/clickbait filtered; useful AI replies remain visible.
- TikTok: feed blocked (if enabled).
- AI detector: AI-heavy articles flagged or blocked.

## Contributing

We love focused, pragmatic contributions. If you want to help, pick something below and open a PR.

### Contribution Areas

- **Selector updates** (platforms shift DOM frequently).
- **Pattern tuning** for brainrot or AI detection.
- **TikTok validation** (needs international testing).
- **Performance tuning** for heavy feeds.

### Contribution Workflow

1. Fork the repo.
2. Create a branch: `feature/your-change` or `fix/your-fix`.
3. Make the change with minimal scope.
4. Test on target platforms.
5. Open a PR with a clear summary and screenshots if UI changes.

### Contribution Guidelines

- **No external dependencies** (vanilla JS only).
- **Selectors need a date comment** when updated.
- **Keep logic conservative** to avoid false positives.
- **Use single quotes** and 2-space indentation.

## About

Anti-Slop is a community-driven extension built to protect attention in an era of infinite scroll and synthetic content. It is intentionally lightweight, privacy-first, and open-source so anyone can audit or extend it. If it helps you, consider starring the repo and sharing it with others who want to reclaim focus.

## Privacy

- No tracking
- No analytics
- No remote servers
- All processing happens locally

## License

MIT. See `LICENSE`.
