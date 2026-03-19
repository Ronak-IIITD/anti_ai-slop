// Bluesky/Bsky Content Detector
// Blocks engagement bait, detects brainrot, and filters low-effort content
// Updated as of 2026-03-01

(async function () {
  'use strict';

  const { log, logError, hideElement, isProcessed, markProcessed, incrementBlockCounter, isPlatformEnabled, showBlockedNotification, createMediaWarningBadge, incrementMediaWarningCounter, createDebouncedObserver } = window.AntiSlopUtils;
  const mediaDetector = window.aiMediaDetector;

  const PLATFORM = 'Bluesky';
  let isEnabled = false;
  let sensitivity = 'medium';
  let hasFiltered = false;
  let detectAIMedia = true;
  let mediaSensitivity = 'medium';
  let mediaOcr = false;

  // Bluesky selectors
  const SELECTORS = {
    // Feed posts
    posts: [
      'article[data-prefix]', // Main post container
      'div[role="article"]',
      'div[data-href*="/profile/"]',
      // New 2026 selectors
      'div[aria-label*="Post"]',
      'div[data-testid="postThreadItem"]'
    ],
    // Suggested users/feeds
    suggested: [
      'div[aria-label*="Suggested"]',
      'div[data-testid="suggestedUsers"]',
      'div[data-testid="trendingFeeds"]',
      // New 2026
      'aside[aria-label*="Discover"]',
      'div[data-testid=" Who to follow"]'
    ],
    // Trending topics
    trending: [
      'div[aria-label*="Trending"]',
      'div[data-testid="trendingTopics"]',
      'div[data-testid="trendingPosts"]'
    ]
  };

  const THRESHOLDS = {
    low: { brainrot: 45, engagement: 50, minChars: 80 },
    medium: { brainrot: 35, engagement: 40, minChars: 60 },
    high: { brainrot: 25, engagement: 30, minChars: 40 }
  };

  // ============================================================
  // INITIALIZATION
  // ============================================================

  async function init() {
    isEnabled = await isPlatformEnabled('bluesky');

    if (!isEnabled) {
      log(PLATFORM, 'Disabled in settings');
      notifyBackground('disabled');
      return;
    }

    const settings = await storageManager.getSettings();
    const bskySettings = settings.bluesky || {};
    sensitivity = bskySettings.sensitivity || 'medium';
    detectAIMedia = settings.ui?.detectAIMedia !== false;
    mediaSensitivity = settings.ui?.mediaSensitivity || 'medium';
    mediaOcr = settings.ui?.mediaOcr === true;

    log(PLATFORM, `Initializing (sensitivity: ${sensitivity})`);

    // Run filter on load and intervals
    filterContent();
    setTimeout(filterContent, 1500);
    setTimeout(filterContent, 4000);

    // Set up observer
    setupObserver();
  }

  // ============================================================
  // MAIN FILTER
  // ============================================================

  async function filterContent() {
    if (hasFiltered && !document.hidden) return;

    let totalBlocked = 0;

    // Filter brainrot posts
    const brainrotBlocked = await filterBrainrotPosts();
    totalBlocked += brainrotBlocked;

    // Filter suggested content
    totalBlocked += filterSuggestedContent();

    // Filter trending (often low quality)
    totalBlocked += filterTrendingContent();

    if (totalBlocked > 0) {
      incrementBlockCounter('bluesky', totalBlocked);
      notifyBackground('blocked', totalBlocked);
    } else if (!hasFiltered) {
      notifyBackground('clean');
    }

    hasFiltered = true;
  }

  async function filterBrainrotPosts() {
    const threshold = THRESHOLDS[sensitivity];
    let blocked = 0;

    for (const selector of SELECTORS.posts) {
      for (const post of document.querySelectorAll(selector)) {
        if (isProcessed(post)) continue;

        // Skip own posts or verified accounts
        if (post.querySelector('[data-testid="followButton"]') ||
            post.querySelector('[aria-label="Verified"]')) {
          continue;
        }

        const text = getPostText(post);
        if (!text || text.length < threshold.minChars) continue;

        const score = analyzeBrainrotScore(text);

        if (mediaDetector && detectAIMedia) {
          const mediaResult = mediaOcr
            ? await mediaDetector.analyzeElementAsync(post, { title: text.slice(0, 80), description: text }, { enableOcr: true })
            : mediaDetector.analyzeElement(post, { title: text.slice(0, 80), description: text });
          if (mediaDetector.shouldWarn(mediaResult.score, mediaSensitivity)) {
            if (createMediaWarningBadge(post, mediaResult)) {
              incrementMediaWarningCounter(1);
            }
          }
        }

        if (score >= threshold.brainrot || score >= threshold.engagement) {
          hideElement(post, `bluesky-brainrot-${score}`);
          markProcessed(post);
          blocked++;
        }
      }
    }

    if (blocked > 0) {
      log(PLATFORM, `Filtered ${blocked} brainrot posts`);
    }
    return blocked;
  }

  function filterSuggestedContent() {
    let blocked = 0;
    for (const selector of SELECTORS.suggested) {
      document.querySelectorAll(selector).forEach(el => {
        if (!isProcessed(el)) {
          hideElement(el, 'bluesky-suggested');
          markProcessed(el);
          blocked++;
        }
      });
    }
    return blocked;
  }

  function filterTrendingContent() {
    let blocked = 0;
    for (const selector of SELECTORS.trending) {
      document.querySelectorAll(selector).forEach(el => {
        if (!isProcessed(el)) {
          hideElement(el, 'bluesky-trending');
          markProcessed(el);
          blocked++;
        }
      });
    }
    return blocked;
  }

  // ============================================================
  // BRAINROT DETECTION
  // ============================================================

  function analyzeBrainrotScore(text) {
    const lower = text.toLowerCase();
    let score = 0;

    // Brainrot/engagement bait indicators (Bluesky-specific)
    const brainrotPatterns = [
      // Engagement bait
      /like if you/gi, /rt if you/gi, /share if you/gi,
      /who else/gi, /tag a friend/gi, /send to/gi,
      /follow for more/gi, /follow back/gi,
      /link in bio/gi, /link below/gi,
      /turn on notifications/gi, /enable notifications/gi,
      /drop a /gi, /leave a /gi,
      /tell me in/gi, /comment below/gi,
      /subscribe/gi, /like and follow/gi,

      // Brainrot trends
      /rizz/gi, /skibidi/gi, /gyatt/gi, /fanum tax/gi,
      /mewing/gi, /looksmaxxing/gi, /sigma grindset/gi,
      /no cap/gi, /fr fr/gi, /on god/gi,
      /pov:/gi, /POV:/gi,
      /as a \[/gi, /as an \[/gi, /me when/gi,

      // Low effort
      /unpopular opinion/gi, /hot take/gi, /controversial/gi,
      /random thought/gi, /shower thought/gi,
      /3am thoughts/gi, /2am thoughts/gi,
      /late night thoughts/gi,
      /just thinking/gi, /posting to/gi,

      // Engagement farming
      /#askbsky/gi, /#bSky/gi, /#followfriday/gi,
      /#ff/gi, /#followback/gi,
      /check my profile/gi, /check link/gi,
      /new post/gi, /posting for/gi,

      // Emoji spam
      /[\u{1F300}-\u{1F9FF}]{6,}/gu,

      // Trending abuse
      /#fyp/gi, /#foryou/gi, /#viral/gi,
      /#trending/gi, /#new/gi
    ];

    for (const pattern of brainrotPatterns) {
      if (pattern.test(lower)) {
        score += 15;
      }
    }

    // Repetitive characters (spam indicator)
    if (/(.)\1{4,}/.test(text)) {
      score += 10;
    }

    // All caps in short post
    const words = text.split(/\s+/);
    if (words.length < 10) {
      const allCapsCount = words.filter(w => w.length > 3 && w === w.toUpperCase()).length;
      if (allCapsCount > 2) {
        score += 12;
      }
    }

    return Math.min(score, 100);
  }

  // ============================================================
  // HELPERS
  // ============================================================

  function getPostText(post) {
    const clone = post.cloneNode(true);
    clone.querySelectorAll('script, style, svg, img, video, a[role="link"]').forEach(el => el.remove());
    return clone.textContent.trim();
  }

  function setupObserver() {
    const { start } = createDebouncedObserver(filterContent, 300);
    start(document.body);
  }

  function notifyBackground(status, count = 0) {
    try {
      chrome.runtime.sendMessage({
        action: 'platformStatus',
        data: { platform: 'bluesky', status, count }
      });
    } catch (err) {}
  }

  // ============================================================
  // START
  // ============================================================

  init();

  // Listen for settings changes
  chrome.storage.onChanged.addListener(async (changes, namespace) => {
    if (namespace === 'sync' && changes.antiSlop_settings) {
      const newSettings = changes.antiSlop_settings.newValue;
      const wasEnabled = isEnabled;
      isEnabled = newSettings?.bluesky?.enabled ?? false;
      sensitivity = newSettings?.bluesky?.sensitivity || 'medium';
      detectAIMedia = newSettings?.ui?.detectAIMedia !== false;
      mediaSensitivity = newSettings?.ui?.mediaSensitivity || 'medium';

      if (wasEnabled !== isEnabled) {
        log(PLATFORM, `Settings changed: ${isEnabled ? 'enabled' : 'disabled'}`);
        location.reload();
      } else if (isEnabled) {
        hasFiltered = false;
        filterContent();
      }
    }
  });

})();
