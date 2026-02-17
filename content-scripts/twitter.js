// Twitter/X Brainrot Content Filter
// Filters out brainrot and clickbait content
// Uses fade mode for replies (90% AI, 15% useful - don't fully block)

(async function() {
  'use strict';

  const { log, logError, hideElement, fadeElement, isProcessed, markProcessed, getTextContent, createDebouncedObserver, incrementBlockCounter, isPlatformEnabled, createGlobalSiteIndicator } = window.AntiSlopUtils;
  const detector = window.brainrotDetector;
  
  const PLATFORM = 'Twitter';
  let blockedCount = 0;
  let fadedCount = 0;
  let isEnabled = false;
  let sensitivity = 'medium';
  let blockBrainrot = true;
  let blockClickbait = true;
  const hasDetector = !!detector;

  // Twitter/X selectors (both old Twitter and new X.com)
  // Updated selectors as of 2026-02-11
  const SELECTORS = {
    // Tweet/post containers
    tweet: [
      'article[data-testid="tweet"]',
      '[data-testid="tweet"]',
      'article[role="article"]'
    ],
    
    // Tweet text content
    tweetText: [
      '[data-testid="tweetText"]',
      '[lang]' // Text usually has lang attribute
    ],

    // Reply indicators
    reply: [
      '[data-testid="reply"]',
      '[data-testid="reply-button"]',
      'div[data-testid="reply"]'
    ],
    
    // Reply chain - tweets that are replies have these ancestors
    replyIndicator: [
      '[data-testid="cellInnerDiv"] [role="group"]',
      'article:has([data-testid="reply"])'
    ]
  };

  // Clickbait patterns
  const CLICKBAIT_PATTERNS = [
    /you won'?t believe/i,
    /this is why/i,
    /here'?s why/i,
    /\d+ reasons? why/i,
    /will shock you/i,
    /changed my life/i,
    /going viral/i,
    /thread 🧵/i,
    /🚨/g // Alert emoji spam
  ];

  // Initialize filter
  async function init() {
    isEnabled = await isPlatformEnabled('twitter');
    
    if (!isEnabled) {
      log(PLATFORM, 'Disabled in settings');
      return;
    }

    // Load settings
    const settings = await storageManager.getSettings();
    sensitivity = settings.twitter?.sensitivity || 'medium';
    blockBrainrot = settings.twitter?.blockBrainrot ?? true;
    blockClickbait = settings.twitter?.blockClickbait ?? true;

    log(PLATFORM, `Initializing... (sensitivity: ${sensitivity}, brainrot: ${blockBrainrot}, clickbait: ${blockClickbait})`);
    
    // Initial sweep
    filterTweets();
    
    // Show global site indicator
    setTimeout(() => {
      createGlobalSiteIndicator('twitter', {
        enabled: isEnabled,
        blocked: blockedCount + fadedCount
      });
    }, 2000);
    
    // Watch for new tweets
    startObserver();
    
    log(PLATFORM, 'Initialized successfully');
  }

  // Main filtering function
  function filterTweets() {
    try {
      const tweets = findAllTweets();
      
      tweets.forEach(tweet => {
        if (isProcessed(tweet)) return;
        
        const analysis = analyzeTweet(tweet);
        
        if (analysis.action === 'block') {
          hideElement(tweet, analysis.reason);
          markProcessed(tweet);
          blockedCount++;
          incrementBlockCounter('twitter', 1);
        } else if (analysis.action === 'fade') {
          // For replies - fade instead of block (90% AI but 15% useful)
          fadeElement(tweet, analysis.reason);
          markProcessed(tweet);
          fadedCount++;
          // Add hover indicator for faded tweets
          if (analysis.score) {
            addHoverIndicator(tweet, analysis.score, true);
          }
        } else {
          markProcessed(tweet);
        }
      });
      
      if (blockedCount > 0) {
        log(PLATFORM, `Blocked ${blockedCount} posts`);
      }
      if (fadedCount > 0) {
        log(PLATFORM, `Faded ${fadedCount} replies`);
      }
    } catch (error) {
      logError(PLATFORM, 'Error in filterTweets', error);
    }
  }

  // Find all tweet elements
  function findAllTweets() {
    const tweets = [];
    
    SELECTORS.tweet.forEach(selector => {
      try {
        const found = document.querySelectorAll(selector);
        found.forEach(tweet => tweets.push(tweet));
      } catch (e) {
        // Selector might not work on this version
      }
    });
    
    // Remove duplicates
    return Array.from(new Set(tweets));
  }

  // Analyze tweet to determine if it should be blocked/faded
  function analyzeTweet(tweet) {
    try {
      // Extract tweet text
      const tweetText = extractTweetText(tweet);
      
      if (!tweetText) {
        return { action: 'none' };
      }

      const isReply = isReplyTweet(tweet);
      
      // Use higher threshold for replies - fade instead of block
      const replyThreshold = 70; // More lenient for replies
      const normalThreshold = hasDetector ? detector.getSensitivityThreshold(sensitivity) : 50;

      if (blockBrainrot && hasDetector) {
        const metadata = {
          title: '',
          description: tweetText,
          channelName: extractTweetAuthor(tweet)
        };
        const slopScore = detector.analyzeSlopScore(metadata);
        
        if (isReply) {
          // For replies: use fade mode (higher threshold)
          if (detector.shouldBlock(slopScore, replyThreshold)) {
            return {
              action: 'fade',
              reason: `ai-reply-${slopScore}`,
              score: slopScore
            };
          }
        } else {
          // For main tweets: block normally
          if (detector.shouldBlock(slopScore, normalThreshold)) {
            return {
              action: 'block',
              reason: `brainrot-${slopScore}`,
              score: slopScore
            };
          }
        }
      }
      
      // Check for clickbait if enabled
      if (blockClickbait && isClickbait(tweetText)) {
        return isReply 
          ? { action: 'fade', reason: 'clickbait-reply', score: 60 }
          : { action: 'block', reason: 'clickbait', score: 60 };
      }

      return { action: 'none' };
    } catch (error) {
      logError(PLATFORM, 'Error analyzing tweet', error);
      return { action: 'none' };
    }
  }

  // Check if tweet is a reply
  function isReplyTweet(tweet) {
    // Check for reply indicators in the tweet
    const replyButton = tweet.querySelector('[data-testid="reply"]');
    if (!replyButton) return false;
    
    // Check if there's a parent that indicates this is in a reply thread
    // Replies usually appear in a different context
    const parent = tweet.parentElement;
    if (parent) {
      // Check if parent has multiple articles (reply chain)
      const siblings = parent.querySelectorAll('article[data-testid="tweet"]');
      if (siblings.length > 1) return true;
    }
    
    // Check for "replying to" text
    const tweetText = extractTweetText(tweet);
    if (tweetText && /replying to/i.test(tweetText)) return true;
    
    return false;
  }

  // Extract text from tweet
  function extractTweetText(tweet) {
    for (const selector of SELECTORS.tweetText) {
      try {
        const textElement = tweet.querySelector(selector);
        if (textElement) {
          const text = getTextContent(textElement);
          if (text && text.length > 0) {
            return text;
          }
        }
      } catch (e) {
        continue;
      }
    }
    
    // Fallback: get all text from article
    return getTextContent(tweet);
  }

  // Extract author/username from tweet
  function extractTweetAuthor(tweet) {
    const authorSelectors = [
      '[data-testid="User-Name"]',
      '[data-testid="User-Names"]',
      'a[role="link"][href^="/"]'
    ];

    for (const selector of authorSelectors) {
      try {
        const authorEl = tweet.querySelector(selector);
        if (authorEl) {
          const text = getTextContent(authorEl);
          if (text && text.length > 0 && text.length < 80) {
            return text;
          }
        }
      } catch (e) {
        continue;
      }
    }

    return '';
  }

  // Check if tweet is clickbait
  function isClickbait(text) {
    return CLICKBAIT_PATTERNS.some(pattern => {
      if (pattern.global) {
        // For patterns with 'g' flag, count matches
        const matches = text.match(pattern);
        return matches && matches.length >= 3; // 3+ emoji = spam
      }
      return pattern.test(text);
    });
  }

  // Add hover indicator badge to AI-detected tweets
  // Shows on hover, offers quick actions
  function addHoverIndicator(tweet, score, isReply) {
    if (tweet.classList.contains('anti-slop-has-badge')) return;
    tweet.classList.add('anti-slop-has-badge');

    let badge = null;

    const showBadge = () => {
      if (badge) {
        badge.style.display = 'flex';
        return;
      }

      badge = document.createElement('div');
      badge.className = 'anti-slop-hover-badge';
      badge.innerHTML = `
        <span class="anti-slop-badge-icon">&#x26A0;</span>
        <span class="anti-slop-badge-text">AI: ${score}</span>
        <button class="anti-slop-badge-btn" data-action="hide">Hide</button>
      `;

      tweet.style.position = 'relative';
      tweet.appendChild(badge);

      // Hide button action
      const hideBtn = badge.querySelector('[data-action="hide"]');
      hideBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = isReply ? 'fade' : 'block';
        if (action === 'fade') {
          fadeElement(tweet, 'user-hidden');
        } else {
          hideElement(tweet, 'user-hidden');
        }
        badge.remove();
      });
    };

    const hideBadge = () => {
      if (badge) {
        badge.style.display = 'none';
      }
    };

    tweet.addEventListener('mouseenter', showBadge);
    tweet.addEventListener('mouseleave', hideBadge);
  }

  // Start mutation observer
  function startObserver() {
    const observer = createDebouncedObserver(() => {
      blockedCount = 0;
      fadedCount = 0;
      filterTweets();
    }, 300);

    // Observe timeline container
    const timeline = document.querySelector('[role="main"]') || document.body;
    
    observer.observe(timeline, {
      childList: true,
      subtree: true
    });

    log(PLATFORM, 'Observer started');
  }

  // Handle URL changes (Twitter is SPA)
  let lastUrl = location.href;
  function setupUrlChangeObserver() {
    if (!document.body) {
      setTimeout(setupUrlChangeObserver, 100);
      return;
    }

    new MutationObserver(() => {
      const currentUrl = location.href;
      if (currentUrl !== lastUrl) {
        lastUrl = currentUrl;
        log(PLATFORM, 'URL changed, re-scanning...');
        blockedCount = 0;
        fadedCount = 0;
        setTimeout(filterTweets, 500);
      }
    }).observe(document.body, { childList: true, subtree: true });
  }
  setupUrlChangeObserver();

  // Listen for settings changes
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync' && changes.antiSlop_settings) {
      const newSettings = changes.antiSlop_settings.newValue;
      const wasEnabled = isEnabled;
      isEnabled = newSettings?.twitter?.enabled ?? false;
      sensitivity = newSettings?.twitter?.sensitivity || 'medium';
      blockBrainrot = newSettings?.twitter?.blockBrainrot ?? true;
      blockClickbait = newSettings?.twitter?.blockClickbait ?? true;
      
      if (wasEnabled !== isEnabled) {
        log(PLATFORM, `Settings changed: ${isEnabled ? 'enabled' : 'disabled'}`);
        if (isEnabled) {
          location.reload();
        }
      } else if (isEnabled) {
        log(PLATFORM, `Settings updated (sensitivity: ${sensitivity})`);
        // Re-scan with new settings
        document.querySelectorAll('[data-anti-slop-processed]').forEach(el => {
          el.removeAttribute('data-anti-slop-processed');
        });
        filterTweets();
      }
    }
  });

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
