// Threads Content Detector
// Blocks brainrot posts, engagement bait, and filters suggested content
// Updated as of 2026-03-01

(async function () {
  'use strict';

  const { log, logError, hideElement, isProcessed, markProcessed, incrementBlockCounter, isPlatformEnabled, createMediaWarningBadge } = window.AntiSlopUtils;
  const mediaDetector = window.aiMediaDetector;

  const PLATFORM = 'Threads';
  let isEnabled = false;
  let sensitivity = 'medium';
  let hasFiltered = false;
  let detectAIMedia = true;
  let mediaSensitivity = 'medium';

  const SELECTORS = {
    // Feed posts
    posts: [
      'article[data-pagelet*="FeedUnit"]',
      'div[role="article"]',
      'div[data-pagelet*="Post"]',
      // New 2026
      'div[aria-label*="Post"]',
      'article[role="article"]'
    ],
    // Suggested content
    suggested: [
      'div[aria-label*="Suggested"]',
      'div[data-pagelet*="Suggested"]',
      'aside[aria-label*="Suggested"]'
    ],
    // Trending
    trending: [
      'div[aria-label*="Trending"]',
      'div[data-testid="trending"]'
    ]
  };

  const THRESHOLDS = {
    low: { brainrot: 45, engagement: 50, minChars: 80 },
    medium: { brainrot: 35, engagement: 40, minChars: 60 },
    high: { brainrot: 25, engagement: 30, minChars: 40 }
  };

  async function init() {
    isEnabled = await isPlatformEnabled('threads');

    if (!isEnabled) {
      log(PLATFORM, 'Disabled in settings');
      notifyBackground('disabled');
      return;
    }

    const settings = await storageManager.getSettings();
    const threadsSettings = settings.threads || {};
    sensitivity = threadsSettings.sensitivity || 'medium';
    detectAIMedia = settings.ui?.detectAIMedia !== false;
    mediaSensitivity = settings.ui?.mediaSensitivity || 'medium';

    log(PLATFORM, `Initializing (sensitivity: ${sensitivity})`);

    filterContent();
    setTimeout(filterContent, 1500);
    setTimeout(filterContent, 4000);

    setupObserver();
  }

  function filterContent() {
    if (hasFiltered && !document.hidden) return;

    let totalBlocked = 0;
    totalBlocked += filterBrainrotPosts();
    totalBlocked += filterSuggestedContent();

    if (totalBlocked > 0) {
      incrementBlockCounter('threads', totalBlocked);
      notifyBackground('blocked', totalBlocked);
    } else if (!hasFiltered) {
      notifyBackground('clean');
    }

    hasFiltered = true;
  }

  function filterBrainrotPosts() {
    const threshold = THRESHOLDS[sensitivity];
    let blocked = 0;

    for (const selector of SELECTORS.posts) {
      document.querySelectorAll(selector).forEach(post => {
        if (isProcessed(post)) return;

        const text = getPostText(post);
        if (!text || text.length < threshold.minChars) return;

        const score = analyzeBrainrotScore(text);

        if (mediaDetector && detectAIMedia) {
          const mediaResult = mediaDetector.analyzeElement(post, {
            title: text.slice(0, 80),
            description: text
          });
          if (mediaDetector.shouldWarn(mediaResult.score, mediaSensitivity)) {
            createMediaWarningBadge(post, mediaResult);
          }
        }

        if (score >= threshold.brainrot || score >= threshold.engagement) {
          hideElement(post, `threads-brainrot-${score}`);
          markProcessed(post);
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
          hideElement(el, 'threads-suggested');
          markProcessed(el);
          blocked++;
        }
      });
    }
    return blocked;
  }

  function analyzeBrainrotScore(text) {
    const lower = text.toLowerCase();
    let score = 0;

    const brainrotPatterns = [
      /rizz/gi, /skibidi/gi, /gyatt/gi, /fanum tax/gi,
      /mewing/gi, /looksmaxxing/gi, /sigma grindset/gi,
      /no cap/gi, /fr fr/gi, /on god/gi,
      /pov:/gi, /POV:/gi, /as a /gi,
      /tag someone/gi, /share with/gi, /follow for/gi,
      /link in bio/gi, /turn on notifications/gi,
      /who else/gi, /agree\?/gi, /drop a /gi,
      /unpopular opinion/gi, /hot take/gi,
      /random thought/gi, /shower thought/gi,
      /3am thoughts/gi, /late night/gi,
      /#fyp/gi, /#foryou/gi, /#viral/gi,
      /repost/gi, /found on/gi, /not mine/gi
    ];

    for (const pattern of brainrotPatterns) {
      if (pattern.test(lower)) {
        score += 15;
      }
    }

    const emojiCount = (text.match(/[\u{1F300}-\u{1F9FF}]/gu) || []).length;
    const wordCount = text.split(/\s+/).length;
    if (emojiCount > 5 && emojiCount / wordCount > 0.2) {
      score += 8;
    }

    const words = text.split(/\s+/);
    if (words.length < 10) {
      const allCaps = words.filter(w => w.length > 3 && w === w.toUpperCase()).length;
      if (allCaps > 2) score += 12;
    }

    return Math.min(score, 100);
  }

  function getPostText(post) {
    const clone = post.cloneNode(true);
    clone.querySelectorAll('script, style, svg, img, video').forEach(el => el.remove());
    return clone.textContent.trim();
  }

  function setupObserver() {
    const observer = new MutationObserver(debounce(filterContent, 1000));
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function notifyBackground(status, count = 0) {
    try {
      chrome.runtime.sendMessage({
        action: 'platformStatus',
        data: { platform: 'threads', status, count }
      });
    } catch (err) {}
  }

  function debounce(func, wait) {
    let timeout;
    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  init();

  // Listen for settings changes
  chrome.storage.onChanged.addListener(async (changes, namespace) => {
    if (namespace === 'sync' && changes.antiSlop_settings) {
      const newSettings = changes.antiSlop_settings.newValue;
      const wasEnabled = isEnabled;
      isEnabled = newSettings?.threads?.enabled ?? false;
      sensitivity = newSettings?.threads?.sensitivity || 'medium';
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
