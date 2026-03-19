// Facebook/Meta Content Detector
// Blocks Reels, detects brainrot posts, engagement bait, and low-effort content
// Updated as of 2026-03-01

(async function () {
  'use strict';

  const { log, logError, hideElement, isProcessed, markProcessed, incrementBlockCounter, isPlatformEnabled, showBlockedNotification, createMediaWarningBadge, incrementMediaWarningCounter, createDebouncedObserver } = window.AntiSlopUtils;
  const mediaDetector = window.aiMediaDetector;

  const PLATFORM = 'Facebook';
  let isEnabled = false;
  let sensitivity = 'medium';
  let hasFiltered = false;
  let detectAIMedia = true;
  let mediaSensitivity = 'medium';
  let mediaOcr = false;

  // Updated selectors as of 2026-03-01
  const SELECTORS = {
    // Reels (main target)
    reels: [
      'div[role="presentation"][aria-label*="Reel"]',
      'div[aria-label*="Reel"]',
      'a[href*="/reel/"]',
      'div[data-pagelet*="Reel"]',
      'div[role="tabpanel"][aria-label*="Reels"]',
      // New 2026 redesign
      'div[role="region"][aria-label*="Reel"]',
      'div.x1n2onr6[data-visualcompletion*="reel"]'
    ],
    // Stories
    stories: [
      'div[role="presentation"][aria-label*="Story"]',
      'div.x1n2onr6[data-story-id]',
      // New 2026
      'div[role="region"][aria-label*="Story"]'
    ],
    // Feed posts (for brainrot detection)
    feedPosts: [
      'div[data-pagelet*="FeedUnit"]',
      'div[role="article"]',
      'div.x1n2onr6[data-pagelet*="FeedUnit"]',
      'div[data-pagelet*="Tahoe"]',
      // New 2026
      'article[role="article"]',
      'div[role="feed"] > div'
    ],
    // Suggested content
    suggested: [
      'div[data-pagelet*="RightRail"]',
      'div[data-pagelet*="VideoChainingUnit"]',
      'div[data-pagelet*="InlineSuggestions"]',
      // New 2026
      'aside[aria-label*="Suggested"]',
      'div[data-ad-preview]'
    ],
    // Group suggestions
    groupSuggestions: [
      'div[data-pagelet*="GroupsRightColumn"]',
      'div[data-pagelet*="GroupRecommended"]',
      'div[role="complementary"][aria-label*="Groups"]'
    ]
  };

  const THRESHOLDS = {
    low: { brainrot: 45, engagement: 50, minChars: 100 },
    medium: { brainrot: 35, engagement: 40, minChars: 80 },
    high: { brainrot: 25, engagement: 30, minChars: 50 }
  };

  // ============================================================
  // INITIALIZATION
  // ============================================================

  async function init() {
    isEnabled = await isPlatformEnabled('facebook');

    if (!isEnabled) {
      log(PLATFORM, 'Disabled in settings');
      notifyBackground('disabled');
      return;
    }

    const settings = await storageManager.getSettings();
    const fbSettings = settings.facebook || {};
    sensitivity = fbSettings.sensitivity || 'medium';
    detectAIMedia = settings.ui?.detectAIMedia !== false;
    mediaSensitivity = settings.ui?.mediaSensitivity || 'medium';
    mediaOcr = settings.ui?.mediaOcr === true;

    log(PLATFORM, `Initializing (sensitivity: ${sensitivity})`);

    // Run filter on load and on intervals
    filterContent();
    setTimeout(filterContent, 2000);
    setTimeout(filterContent, 5000);

    // Set up observer for dynamic content
    setupObserver();
  }

  // ============================================================
  // MAIN FILTER
  // ============================================================

  async function filterContent() {
    if (hasFiltered && !document.hidden) return;

    let totalBlocked = 0;

    // 1. Block Reels
    totalBlocked += blockReels();

    // 2. Block Stories
    totalBlocked += blockStories();

    // 3. Filter suggested/spam content
    totalBlocked += filterSuggestedContent();

    // 4. Filter brainrot in feed
    const brainrotBlocked = await filterBrainrotPosts();
    totalBlocked += brainrotBlocked;

    if (totalBlocked > 0) {
      incrementBlockCounter('facebook', totalBlocked);
      notifyBackground('blocked', totalBlocked);
    } else if (!hasFiltered) {
      notifyBackground('clean');
    }

    hasFiltered = true;
  }

  function blockReels() {
    let blocked = 0;
    for (const selector of SELECTORS.reels) {
      document.querySelectorAll(selector).forEach(el => {
        if (!isProcessed(el)) {
          hideElement(el, 'facebook-reel');
          markProcessed(el);
          blocked++;
        }
      });
    }
    if (blocked > 0) {
      log(PLATFORM, `Blocked ${blocked} Reels`);
    }
    return blocked;
  }

  function blockStories() {
    let blocked = 0;
    for (const selector of SELECTORS.stories) {
      document.querySelectorAll(selector).forEach(el => {
        if (!isProcessed(el)) {
          hideElement(el, 'facebook-story');
          markProcessed(el);
          blocked++;
        }
      });
    }
    return blocked;
  }

  function filterSuggestedContent() {
    let blocked = 0;
    for (const selector of SELECTORS.suggested) {
      document.querySelectorAll(selector).forEach(el => {
        if (!isProcessed(el)) {
          hideElement(el, 'facebook-suggested');
          markProcessed(el);
          blocked++;
        }
      });
    }
    for (const selector of SELECTORS.groupSuggestions) {
      document.querySelectorAll(selector).forEach(el => {
        if (!isProcessed(el)) {
          hideElement(el, 'facebook-group-suggestion');
          markProcessed(el);
          blocked++;
        }
      });
    }
    return blocked;
  }

  async function filterBrainrotPosts() {
    const threshold = THRESHOLDS[sensitivity];
    let blocked = 0;

    for (const selector of SELECTORS.feedPosts) {
      for (const post of document.querySelectorAll(selector)) {
        if (isProcessed(post)) continue;

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
          hideElement(post, `facebook-brainrot-${score}`);
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

  // ============================================================
  // BRAINROT DETECTION
  // ============================================================

  function analyzeBrainrotScore(text) {
    const lower = text.toLowerCase();
    let score = 0;

    // Strong brainrot indicators
    const strongPatterns = [
      /rizz/gi, /skibidi/gi, /gyatt/gi, /fanum tax/gi,
      /mewing/gi, /looksmaxxing/gi, /sigma grindset/gi,
      /grwm/gi, /what the dog doin/gi, /bombastic side eye/gi,
      /brainrot/gi, /no cap/gi, /fr fr/gi, /on god/gi,
      /sus/gi, /among us/gi, /imposter syndrome/gi,
      /tradwife/gi, /sigma male/gi, /alpha male/gi,
      /beta male/gi, /girlboss/gi, /hustler/gi,
      /main character energy/gi, /that's my cue/gi,
      /pov:/gi, /POV:/gi, /as a \[/gi, /as an \[/gi,
      /not the \[/gi, /nobody:/gi, /me when/gi,
      /this is your sign/gi, /law of attraction/gi,
      /manifesting/gi, /vibration/gi, /energy/gi,
      /冥想|meditation|manifest|affirmation/gi
    ];

    for (const pattern of strongPatterns) {
      if (pattern.test(lower)) {
        score += 20;
      }
    }

    // Engagement bait patterns
    const engagementBait = [
      /tag someone/gi, /share with a friend/gi, /link in bio/gi,
      /follow for more/gi, /save this/gi, /bookmark/gi,
      /who else/gi, /agree\?/gi, /drop a/gi,
      /put your/gi, /if you.*you know/gi, /double tap/gi,
      /like and share/gi, /turn on notifications/gi,
      /dont forget to/gi, /make sure to/gi,
      /one more thing/gi, /btw/gi, /also/gi,
      /check my/gi, /link in comments/gi,
      /send this to/gi, /tell me in/gi
    ];

    for (const pattern of engagementBait) {
      if (pattern.test(lower)) {
        score += 15;
      }
    }

    // Low effort indicators
    const lowEffort = [
      /just a photo/gi, /random/gi, /no context/gi,
      /out of context/gi, /unpopular opinion/gi,
      /hot take/gi, /unpopular take/gi, /controversial/gi,
      /tell me why/gi, /why am i/gi, /why do i/gi,
      /i hate that/gi, /i love that/gi, /me_irl/gi,
      /pet tax/gi, /cat tax/gi, /dog tax/gi,
      /repost/gi, /reupload/gi, /not mine/gi,
      /found on/gi, /credits to/gi, /via/gi,
      /random thought/gi, /shower thought/gi,
      /3am thoughts/gi, /2am thoughts/gi,
      /4am thoughts/gi, /late night thoughts/gi
    ];

    for (const pattern of lowEffort) {
      if (pattern.test(lower)) {
        score += 12;
      }
    }

    // Trending topic abuse
    if (lower.includes('#fyp') || lower.includes('#foryou') ||
        lower.includes('#fypp') || lower.includes('#viral') ||
        lower.includes('#trending') || lower.includes('#challenge')) {
      score += 10;
    }

    // Emoji spam (more than 5 emojis in short text)
    const emojiCount = (text.match(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu) || []).length;
    const wordCount = text.split(/\s+/).length;
    if (emojiCount > 5 && emojiCount / wordCount > 0.2) {
      score += 8;
    }

    // All caps spam
    const words = text.split(/\s+/);
    const allCapsWords = words.filter(w => w.length > 3 && w === w.toUpperCase());
    if (allCapsWords.length > 3) {
      score += 10;
    }

    return Math.min(score, 100);
  }

  // ============================================================
  // HELPERS
  // ============================================================

  function getPostText(post) {
    const clone = post.cloneNode(true);
    clone.querySelectorAll('script, style, noscript, svg, img, video').forEach(el => el.remove());
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
        data: { platform: 'facebook', status, count }
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
      isEnabled = newSettings?.facebook?.enabled ?? false;
      sensitivity = newSettings?.facebook?.sensitivity || 'medium';
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
