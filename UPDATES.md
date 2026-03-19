# UPDATES.md - Anti-Slop Project Changelog

> Project: Anti-Slop - AI & Brainrot Content Blocker
> Version: 1.6.0
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
| Google Search | Active | SEO spam, content farms, brainrot results |
| LinkedIn | Active | Motivational spam, AI posts, engagement bait |
| TikTok | Untested | Full feed blocking (India ban) |
| News Sites | Active | AI-generated article detection |

### Detection Engines
- **Brainrot Detector**: 60+ tiered keywords (Strong/Moderate/Weak)
- **AI Content Detector**: Phrase density + structural heuristics
- **Clickbait Detector**: Pattern matching for engagement bait
- **Utility Scorer**: Protects useful AI content (code, data, citations)
- **Analysis Cache**: Avoids re-analyzing same content for performance

---

## Changelog

### 2026-03-20 - Codebase Quality Audit & Bug Fixes
- **fix**: Fix `return` vs `continue` bug in inner loops of `bluesky.js`, `threads.js`, `facebook.js`
  - Inner `for` loops used `return` instead of `continue`, causing entire filter function to exit on first already-processed post
  - Most content was going unfiltered due to this bug
- **fix**: Fix undefined `fadedCount` variable in `reddit.js`
  - Variable was referenced in observer callbacks but never declared, causing `ReferenceError`
- **fix**: Implement `scanGoogleResults()` in `google.js`
  - Function body was empty - Google Search filtering was completely non-functional
  - Now properly scans results using `analyzeSearchResult()` and hides filtered items
- **fix**: Implement actual `fadeElement` behavior in `common.js`
  - Was identical to `hideElement` (just hiding with `display: none`)
  - Now reduces opacity to 0.3 and applies grayscale filter for reduced visibility
- **fix**: Fix duplicate variable assignments in `bluesky.js`
  - `detectAIMedia`, `mediaSensitivity`, `mediaOcr` were each assigned twice (copy-paste error)
- **fix**: Wrap `google.js` in IIFE to prevent global variable leakage
- **fix**: Remove YouTube-specific selectors (`ytd-rich-item-renderer`, `ytd-video-renderer`) from `twitter.js`
- **fix**: Use `chrome.runtime.getManifest().version` instead of hardcoded `'1.5.0'` in popup export
- **fix**: Fix `setBadgeBackgroundColor` with `tabId` parameter in `background.js` (not supported in MV3)
- **fix**: Add settings change listener to `linkedin.js` (was the only platform without one)
- **fix**: Remove overly broad brainrot keywords causing false positives
  - Removed: colors (`purple`, `pink`, `blue`), common words (`culture`, `core`, `aesthetic`, `influencer`, `era`, `bare`, `op`, `set`, `crib`, `whip`, `drops`, `bands`, `rack`, `guap`, `mula`, `scrub`, `bruh`, `simp`, `thirsty`, `cancel`, `wake up`, `agenda`, `depopulation`)
  - Removed: artist names (`Kendrick`, `drake`), common phrases (`no way`, `winning`, `cap`, `yap`, `baka`, `Stan`, `underground`)
  - Removed: legitimate finance terms (`crypto`, `bitcoin`, `ethereum`, `solana`, `jpeg`)
  - Removed from weak tier: `real`, `bro`, `fr` (too common as English words)
  - Removed duplicate: `core` appeared twice, `cancelled` appeared twice, `red pill` appeared twice
- **feat**: Implement placeholder mode for blocked content
  - `hideElement` now creates a `.anti-slop-blocked-placeholder` with "Show Content" button when `showPlaceholders` is enabled
  - Added `setPlaceholderMode()` and `loadPlaceholderSetting()` to `common.js`
- **refactor**: Replace local `debounce` implementations in `bluesky.js`, `threads.js`, `facebook.js` with shared `createDebouncedObserver` from `common.js`
  - Also reduced debounce delay from 1000ms to 300ms (recommended value)
- **refactor**: Persist `activeSessions` in `chrome.storage.local` in `background.js`
  - Service worker can terminate at any time; in-memory session data was being lost
  - Now restores sessions on startup
- **refactor**: Convert all callback-wrapped Promises in `storage.js` to native `chrome.storage` Promise API
  - `getSettings()`, `getStats()`, `getWhitelist()`, `addToWhitelist()`, `removeFromWhitelist()`, `addRecentBlock()`, `getRecentBlocks()`, `saveSettings()`, `saveStats()` all modernized
- **refactor**: Update common.js fallback settings to include all platforms (was missing `facebook`, `bluesky`, `threads`, `tiktok`)
- **chore**: Update `install-check.sh` with all missing files (`google.js/css`, `linkedin.js/css`, `facebook.js/css`, `bluesky.js/css`, `threads.js/css`, `media-detector.js`, `utility-scorer.js`)

### 2026-03-17 - Remove AI Overview Blocking on Google Search
- **fix**: Stop blocking Google's AI Overview (Gemini) on search results pages
  - Removed AI Overview selectors and collapse/hide logic from `content-scripts/google.js`
  - Removed `handleAIOverview()` and `_collapseAIOverview()` functions
  - Removed "Hide AI Overviews" checkbox from popup UI (`popup/popup.html`, `popup/popup.js`)
  - Removed `hideAIOverview` setting from default settings (`utils/storage.js`, `popup/popup.js`)
  - Cleaned up AI Overview CSS styles from `content-scripts/google.css`
  - Google Search content script still filters SEO spam, content farms, and brainrot results
  - AI Overview is a useful Chrome/Gemini feature and should not be blocked by default

### 2026-03-01 - AI Media Detection v1
- **feat**: Add privacy-first AI media detection utility (`utils/media-detector.js`)
  - Detects AI-likely images/videos from local metadata and surrounding text only
  - Uses watermark hints, AI tool keywords, render language, alt text, and media-card heuristics
  - No cloud calls, no external models, no data leaves the browser
- **feat**: Add inline AI media warning badges across platforms
  - YouTube, Instagram, Facebook, Bluesky, Threads, and Twitter/X
  - Media-heavy cards now show `AI-likely media XX%` badges
  - Warning UX only; does not hard-block media in v1
- **feat**: Add popup controls for AI media detection
  - Global toggle: `Detect AI Media`
  - Global sensitivity: Low / Medium / High
- **feat**: Add optional OCR watermark scan (experimental)
  - Uses browser `TextDetector` when available
  - No external services or model downloads
- **update**: Track AI media warnings in stats dashboard
- **update**: Load shared media detector in platform bundles for future expansion

### 2026-03-01 - Polish Pass for New Features
- **fix**: Wire Facebook, Bluesky, and Threads controls fully into popup settings
  - Added missing toggle and sensitivity listeners
  - Added Threads stat counter to popup dashboard
- **fix**: Make Focus Mode actually preserve and restore prior platform state
  - Saves previous platform enable states before entering focus mode
  - Restores those states when focus mode is disabled
- **fix**: Improve session tracking accuracy for social media timing
  - Close previous active session when switching tracked tabs
  - Prevent overcounting by properly finalizing sessions on tab updates/removals
- **update**: Improve time tracking breakdown UX
  - Show per-site visit counts alongside time totals
- **update**: Expand migration/default coverage for new platforms
  - Added migration-safe defaults for Facebook, Bluesky, Threads, and Focus Mode fields

### 2026-03-01 (v1.6.0) - Export/Import & Shortcuts
- **feat**: Add Export/Import settings functionality
  - Export all settings, stats, and whitelist to JSON file
  - Import settings from another device
  - New "Settings" section in popup with export/import buttons
- **feat**: Improve recent detections display
  - Add color-coded AI scores (red/yellow/gray)
  - Add timestamp formatting
  - Add "Clear" button to reset recent detections
  - Show up to 10 most recent blocks
- **feat**: Add keyboard shortcuts
  - Ctrl+Shift+A (Cmd+Shift+A on Mac): Toggle extension on/off
  - Ctrl+Shift+S (Cmd+Shift+S on Mac): Open popup
- **update**: Version bumped to 1.6.0

### 2026-03-01 (v1.5.0) - Threads & Time Tracking
- **feat**: Add Threads support (Meta's Twitter alternative)
  - Filters brainrot posts and engagement bait
  - Sensitivity controls (Low/Medium/High)
- **feat**: Add session/time tracking
  - Tracks time spent on social media sites per day
  - Records visits and blocked content counts
  - Stores last 30 days of data
  - New "Time Tracking" section in popup
- **feat**: Add daily/weekly stats breakdown in popup
  - Shows today's time and sites visited
  - Shows weekly totals (time + blocked count)
  - Per-site breakdown for today
- **update**: Version bumped to 1.5.0

### 2026-03-01 (v1.4.0) - Platform Expansion & Brainrot Updates
- **feat**: Add Facebook/Meta support
  - Blocks Reels, Stories, suggested content in right rail
  - Detects brainrot posts in feed with engagement bait scoring
  - Sensitivity controls (Low/Medium/High)
  - Filters group suggestions and recommended content
- **feat**: Add Bluesky support
  - Detects engagement bait and brainrot in posts
  - Filters suggested users and trending content
  - Sensitivity controls (Low/Medium/High)
- **feat**: Add Focus Mode
  - One toggle to block ALL social media at once
  - Use for deep work sessions
  - Integrated into popup UI with prominent toggle
- **feat**: 40+ new brainrot patterns for 2026 trends
  - Gen Z/Alpha slang: bussin, sheesh, cap, slay, goated, ice spice, Kendrick, rizzler, etc.
  - Crypto/brainrot: to the moon, diamond hands, hodl, nft, memecoin, etc.
  - Self-help brainrot: law of assumption, Neville Goddard, 5am club, hustle culture, etc.
  - Conspiracy brainrot: wake up sheeple, Agenda, deep state, big pharma, etc.
  - Engagement farming: screenshotting, save this post, poll time, etc.
  - Gaming brainrot: gameplay, let\'s play, compilation, trolling, etc.
  - Drama/fame: exposed, tea spill, gossip, drama, etc.
- **update**: Version bumped to 1.4.0

### 2026-03-01 (v1.3.0) - AI Detection UX Overhaul
- **feat**: Confidence-tiered UX for AI content detection
  - **High confidence (75+)**: Full-page interstitial with score breakdown, reason tags, and actions (Go Back / View Anyway / Whitelist)
  - **Medium confidence (threshold-74)**: Warning banner at top of page with AI score, phrase count, and dismiss/whitelist/highlight toggle
  - **Low confidence (30-threshold)**: Subtle floating badge in corner showing AI probability score
  - Users can always choose to view content - no more blind blocking
- **feat**: AI phrase highlighting mode
  - Detected AI phrases are underlined inline (dotted underline) so users learn to spot AI writing
  - Strong indicators: red dotted underline; Moderate indicators: yellow dotted underline
  - Toggle highlights on/off from the warning banner
  - Hover tooltip shows indicator tier (strong/moderate)
- **feat**: Rich interstitial page with score breakdown
  - Visual score bar (0-100) with color coding
  - Collapsible breakdown showing contribution from each detection dimension
  - Reason tags (friendly labels) showing why content was flagged
  - Three actions: Go Back (primary), View Anyway, Always Allow Site
  - "View Anyway" downgrades to warning banner + phrase highlights
- **feat**: 30+ new AI phrase patterns for 2025-2026 LLM output
  - Strong tier: "let's dive in", "serves as a testament", "whether you're a seasoned", "cannot be overstated", "demystify", "a myriad of", "foster innovation", "in an era where", and more
  - Moderate tier: "actionable insights", "pro tip", "final thoughts", "the takeaway", "as we move forward", "on the flip side", and more
- **feat**: 3 new detection dimensions in AI scoring engine
  - **Vocabulary Diversity**: Type-Token Ratio analysis detects repetitive AI vocabulary
  - **Repetition Analysis**: Detects repeated sentence beginnings and trigram patterns
  - **Template/List Patterns**: Detects listicle format, excessive numbered items, multiple conclusions
  - Total scoring now: phrases (30) + filler (15) + structure (25) + quality (15) + credibility (15) + vocabulary (10) + repetition (10) + templates (10) = 130 raw max (multiplied by content type)
- **feat**: Expanded structural pattern detection
  - Added list intro patterns ("here are X ways", "top N tips")
  - Added conclusion patterns ("in conclusion", "key takeaways", "final thoughts")
  - Added more transition words ("Let's explore", "Moving on", "Next up")
  - Added more generic openings ("Picture this", "Imagine a world", "If you're like most")
  - Added more buzzwords ("next-level", "world-class", "best-in-class")
- **update**: Default AI detector mode changed from "block" to "warn"
  - New users get warning-first UX by default
  - Existing users auto-migrated from block to warn mode (v4 migration)
  - Users can still choose "block" mode in popup settings
- **update**: Popup UI updated with new mode options
  - AI detector mode selector now has: Warn (recommended) / Block / Off
  - Added help text explaining the difference between warn and block modes
  - Help text styled with accent border for visibility
- **update**: Score analysis now returns detailed breakdown object for UI rendering
  - `analyzeSlopScore()` returns `breakdown` with per-dimension scores
  - `findPhraseMatches()` returns actual matched phrases (for highlighting)
  - `getAllMatchedPhrases()` returns all matched phrases with tier info
- **update**: Version bumped to 1.3.0

### 2026-02-18
- **update**: Refined aggressive mode to selective hard-block policy
  - Google AI Overview restored to user-controlled show/hide toggle behavior (no forced hard block)
  - Twitter hard blocking limited to reply-level AI/spam content only (main tweets left untouched)
  - Reddit hard blocking limited to replies/comments only (posts no longer blocked)
  - LinkedIn hard blocking kept for spam posts and AI-like replies/comments
  - Instagram/TikTok hard blocking kept for brainrot content

- **feat**: Switched to aggressive hard-block mode across major supported platforms
  - Twitter/X replies and posts now use hard blocking (no fade mode, no visible badges)
  - Reddit comments/posts now use hard blocking (no fade mode)
  - Google Search results now hard block instead of fade/warn badges
  - LinkedIn posts/comments now hard block without warning badge overlays
- **update**: AI article detector now enforces hard-block behavior by default
  - Default mode changed to `block` (only `off` disables)
  - Removed warning-first UX paths for detected AI slop
  - Detection now shows lightweight blocked notification only
- **update**: Common blocking utilities now enforce hide-only behavior
  - Removed placeholder/show-content flow for blocked content
  - Added throttled notification: "Spam/AI-generated content has been blocked"

- **feat**: Added global custom keyword rules (block/allow) in popup settings
  - New **Custom Keyword Rules** section with toggle, block list, and allow list
  - Supports comma/newline keyword input with validation and deduplication
  - Saves to synced settings under `customRules`
- **feat**: Integrated custom rules into core detection engines
  - `brainrotDetector` now applies custom keyword score adjustments globally
  - Google and LinkedIn scorers now honor custom block/allow keyword matches
  - AI article detector now adjusts score using the same custom rule logic
- **update**: Added safe keyword normalization and migration guards
  - Existing users auto-migrate to default custom rule settings
  - Keywords are normalized (lowercase/trimmed), min length enforced, max list size capped

### 2026-02-18 (v1.2.2) - X.com & LinkedIn Robust Fix
- **fix**: Complete rewrite of Twitter/X filter for reliability
  - Multi-selector strategy (5+ different selectors for tweets)
  - Runs filter 4 times on page load (0s, 1s, 2s, 4s) - ensures it catches content
  - More text extraction selectors (7 options)
  - Better reply detection (checks parent context, sibling articles, "replying to" text)
  - 30+ AI reply patterns including emoji detection
  - Thresholds: replies 20, posts 35 (very aggressive)
  - Console logging to debug
- **fix**: Complete rewrite of LinkedIn filter for reliability
  - Runs 5 times on page load (0s, 1s, 2s, 4s, 6s)
  - Very aggressive thresholds: Medium 20, High 12, Low 35
  - 40+ motivational spam patterns
  - LinkedIn poem detection (short line format)
  - AI-generated post detection
  - Multiple selectors for posts and comments
  - Hashtag spam detection (5+ hashtags = fade)

### 2026-02-17 (v1.2.0 Release) - Stronger Detection Update
- **feat**: Significantly stronger detection across all platforms
  - **Thresholds lowered**: Medium now 35 (was 50), High now 20 (was 35)
  - **Twitter/X**: Reply threshold 25 (was 40), 40+ AI reply patterns, emoji-only detection
  - **LinkedIn**: Threshold 25 (was 35), catches more motivational/engagement spam
  - **Google**: Threshold 30 (was 40), 45+ content farm domains, 17 SEO patterns
  - **Reddit**: Comment threshold 45 (was 70), catches more low-effort content
- **feat**: Brainrot detector v3 - much more aggressive
  - Added 20+ new brainrot patterns (Gen Alpha slang, AI markers, engagement farming)
  - Added AI content patterns section (video intros, article phrases, conclusions)
  - Stronger scoring: single strong keyword = 20 points (was 15)
  - Channel name red flags for spammy channels
- **feat**: Expanded content farm list (Google Search)
  - Added medium.com, newsbreak.com, vocal.media (AI spam hubs)
  - Added more gaming news sites (gamingbolt, pushsquare, etc.)
  - Content farm score increased to 40 points
- **update**: SEO spam patterns expanded from 9 to 17 patterns

### 2026-02-17 (v1.2.0 Release) - Later Update
- **fix**: Improved Twitter/X AI reply detection and visible badges
  - Lowered threshold for AI replies (40 instead of 70) to catch more
  - Added 25+ AI reply pattern detectors (well said, great post, spot on, etc.)
  - Added visible badge on faded replies (always shows AI score, not just hover)
  - Added quick hide/show buttons on each faded reply
  - Better reply detection with 5 different methods (connecting lines, context, siblings)
  - Fixed badge positioning with proper CSS
  - Very short generic comments (like just "this") now score 80 (auto-fade)

### 2026-02-17 (v1.2.0 Release)
- **feat**: Added Google Search filtering support
  - Hides/collapses AI Overviews (SGE) with toggle to show
  - Filters SEO spam results using pattern detection
  - Content farm domain detection (30+ known domains)
  - Score-based filtering with fade/hide/warn actions
  - Sensitivity control (Low/Medium/High)
  - Dark mode support for Google
- **feat**: Added LinkedIn brainrot filtering support
  - Detects motivational spam posts (30+ strong patterns)
  - Detects AI-generated LinkedIn posts (structural + phrase analysis)
  - Engagement bait format detection ("LinkedIn poets")
  - Hashtag spam detection
  - Fade mode for AI-generated comments
  - Warning badge with quick hide button
  - Sensitivity control (Low/Medium/High)
- **feat**: Added Utility Scoring Algorithm (`utils/utility-scorer.js`)
  - Detects useful AI content that should NOT be blocked
  - Positive signals: code snippets (+20), actionable steps (+15), data/statistics (+15), citations (+15), authenticity markers (+10)
  - Negative signals: generic advice (-10), engagement bait (-20), filler content (-10)
  - DOM-based analysis: code blocks, data tables, diagrams, math formulas
  - `isUsefulContent()` quick check for content protection
  - `adjustBlockingScore()` to modify blocking scores based on utility
- **feat**: Added Analysis Cache (`AnalysisCache` class in utility-scorer.js)
  - LRU cache with 200 entry capacity
  - 5-minute TTL for cache entries
  - Prevents re-analyzing same content on page mutations
  - Fast key generation from content prefix + length
- **update**: Updated popup UI with Reddit, Google, and LinkedIn controls
  - Added platform toggles for all new platforms
  - Added sensitivity controls for Reddit, Google, LinkedIn
  - Added Google-specific options (Hide AI Overviews, Filter Content Farms)
  - Added stat counters for Reddit, Google, LinkedIn
- **update**: Updated manifest.json
  - Bumped version to 1.2.0
  - Added Google Search content script entry
  - Added LinkedIn content script entry
  - Added utility-scorer.js to Google and LinkedIn script bundles
  - Added LinkedIn to AI detector exclude_matches
  - Added Google and LinkedIn host permissions
- **update**: Updated storage.js with Google and LinkedIn default settings and stats
- **update**: Updated background.js with Google and LinkedIn platform support
- **update**: Updated description to include all 7 supported platforms

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
- [x] Fade mode for replies (Twitter/X)
- [ ] Warn-only mode for articles

### Phase 2: Platform Expansion
- [x] Reddit support (subreddit feeds, upvote bait)
- [x] Google Search filtering (AI Overviews, SEO spam)
- [x] LinkedIn brainrot filtering (motivational spam)

### Phase 3: Advanced Detection
- [x] Utility scoring algorithm
- [x] Content farm domain detection
- [ ] Channel reputation scoring

### Phase 4: User Customization
- [ ] Custom keyword rules
- [ ] Whitelist accounts/channels
- [ ] Blocklist import/export

### Phase 5: Performance
- [ ] Web Workers for heavy text processing
- [x] Result caching (don't re-analyze)
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
