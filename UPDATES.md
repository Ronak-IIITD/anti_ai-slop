# UPDATES.md - Anti-Slop Project Changelog

> Project: Anti-Slop - AI & Brainrot Content Blocker
> Version: 1.1.0
> Repository: https://github.com/Ronak-IIITD/anti_ai-slop

---

## Project Information

**Anti-Slop** is a privacy-first Chrome extension (Manifest V3) that blocks addictive "brainrot" content and AI-generated "slop" across social media platforms and news sites.

### Supported Platforms
| Platform | Status | Features |
|----------|--------|----------|
| YouTube | Active | Shorts, brainrot keywords, clickbait |
| Instagram | Active | Reels, low-quality posts |
| Twitter/X | Active | Brainrot tweets, short posts, clickbait |
| Reddit | Active | Brainrot posts, upvote bait, low-effort content |
| TikTok | Untested | Full feed blocking (India ban) |
| News Sites | Active | AI-generated article detection |

### Detection Engines
- **Brainrot Detector**: 60+ tiered keywords (Strong/Moderate/Weak)
- **AI Content Detector**: Phrase density + structural heuristics
- **Clickbait Detector**: Pattern matching for engagement bait

---

## Changelog

### 2026-02-17
- **docs**: Created UPDATES.md for project changelog and documentation
- **docs**: Updated AGENTS.md with comprehensive project information including:
  - Detailed features (platform blocking, detection engines, UI features)
  - Full architecture diagram
  - Project structure overview
  - Default settings documentation
- **feat**: Added fade mode for Twitter/X replies (90/15 problem solution)
  - Replies are now faded (opacity 0.4, grayscale 80%) instead of blocked
  - Higher threshold (70) for replies vs normal threshold for posts (50)
  - Hover effect to temporarily increase visibility
  - Addresses concern: 90% AI-generated but 15% useful
- **feat**: Added hover indicator badge on X.com for AI-detected posts
  - Shows "AI: [score]" badge on hover
  - Quick "Hide" button to block individual posts
  - Works for both main tweets and replies
- **feat**: Added global site indicator popup
  - Floating widget appears on all websites
  - Shows current site domain and block count
  - Quick toggle to enable/disable for current site
  - Added createGlobalSiteIndicator to common.js
- **update**: Added fadeElement and unfadeElement functions to common.js
- **update**: Added fade CSS styles to twitter.css
- **update**: Added isReplyTweet detection logic to twitter.js
- **update**: analyzeTweet now returns score for hover indicator
- **feat**: Added Reddit support
  - New content script for reddit.com
  - Detects brainrot posts (upvote bait, "who else", "unpopular opinion", etc.)
  - Detects low-effort posts (recommendation requests, "best X under Y")
  - Uses fade mode for comments (similar to Twitter)
  - Added to manifest.json, storage.js, and background.js

### 2026-02-11
- **update**: Brainrot patterns updated with new keywords
- **content**: Updated `utils/brainrot-patterns.js` with latest brainrot trends
- **content**: Added new tier 1 keywords (gyatt, fanum tax, mewing, looksmaxxing, etc.)

### 2026-01-23
- **fix**: Updated YouTube selectors for new UI redesign
- **fix**: Instagram selector adjustments for layout changes

### 2026-01-15
- **feat**: Added placeholder mode with "Show Content" button
- **feat**: Implemented block counter and statistics dashboard
- **feat**: Added time saved estimate feature

### 2025-12-20
- **feat**: Initial release v1.1.0
- **feat**: YouTube Shorts blocking
- **feat**: Instagram Reels blocking
- **feat**: Twitter/X brainrot filtering
- **feat**: TikTok feed blocking
- **feat**: AI-generated article detection
- **feat**: Sensitivity controls (Low/Medium/High)
- **feat**: Platform toggles

---

## Adding Updates

When making changes to the project, add an entry to this file:

```markdown
### YYYY-MM-DD
- **type**: Description of change
- **type**: Another change
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `update`: Update to existing feature/patterns
- `refactor`: Code refactoring
- `docs`: Documentation changes
- `chore`: Maintenance, dependencies, etc.

---

## Notes

- All platform selector updates should include date comments: `// Updated as of YYYY-MM-DD`
- Document any new brainrot keywords or AI detection patterns
- Log platform UI changes that affect selectors
- Track new platform support additions

---

## Roadmap & Future Implementations

### Content-Type Blocking Strategy
Implemented to balance blocking brainrot while preserving useful content:

| Content Type | Threshold | Action | Rationale |
|--------------|-----------|--------|-----------|
| Shorts/Reels/TikTok | 30 | Block | Passive brainrot consumption |
| Main Feed Posts | 50 | Warn | Let user decide |
| Replies/Comments | 70 | Fade | 90% AI, 15% useful - don't block |
| Articles/Blogs | 80 | Warn Only | User should decide to read |
| Search Results | 60 | Filter | Filter AI Overviews only |

### The 90/15 Problem Solution (X.com Replies)
- Replies are 90% AI-generated but ~15% are useful
- **Solution**: Use "fade mode" instead of blocking
- Visual indicator (opacity 50%, grayscale) rather than hide
- User can still read if useful

### Smart Detection Layers

**Creation Method Detection**:
- AI-Generated: Block aggressively (no author, content farm, generic)
- AI-Assisted: Warn only (has author byline, personal anecdotes, citations)

**Utility Scoring**:
- +20 points: Has code/snippets or actionable steps
- +15 points: Has data/statistics or citations
- -10 points: Generic advice only
- -20 points: Engagement bait only

---

## Planned Features

### Phase 1: Content-Aware Blocking (Current)
- [x] Different thresholds per content type
- [ ] Fade mode for replies (Twitter/X)
- [ ] Warn-only mode for articles

### Phase 2: Platform Expansion
- [ ] Reddit support (subreddit feeds, upvote bait)
- [ ] Google Search filtering (AI Overviews, SEO spam)
- [ ] LinkedIn brainrot filtering (motivational spam)

### Phase 3: Advanced Detection
- [ ] Utility scoring algorithm
- [ ] Content farm domain detection
- [ ] Channel reputation scoring

### Phase 4: User Customization
- [ ] Custom keyword rules
- [ ] Whitelist accounts/channels
- [ ] Blocklist import/export

### Phase 5: Performance
- [ ] Web Workers for heavy text processing
- [ ] Result caching (don't re-analyze)
- [ ] Idle-time analysis with requestIdleCallback

---

## Detection Engine Improvements

### Current (v1.1.0)
- Keyword density analysis
- Structural pattern detection
- Clickbait phrase matching

### Planned Enhancements
- N-gram analysis (repetitive AI sequences)
- Readability scoring (formulaic writing detection)
- Thumbnail analysis (clickbait image patterns)
- Semantic heuristics (without ML APIs)
