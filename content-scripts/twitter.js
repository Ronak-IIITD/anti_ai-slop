// Twitter/X Short Post Filter
// Filters out low-quality short posts and clickbait content

(async function() {
  'use strict';

  const { log, logError, hideElement, isProcessed, markProcessed, getTextContent, createDebouncedObserver, incrementBlockCounter, isPlatformEnabled } = window.AntiSlopUtils;
  
  const PLATFORM = 'Twitter';
  let blockedCount = 0;
  let isEnabled = false;
  let minChars = 100;
  let blockClickbait = true;

  // Twitter/X selectors (both old Twitter and new X.com)
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
    minChars = settings.twitter?.minChars || 100;
    blockClickbait = settings.twitter?.blockClickbait ?? true;

    log(PLATFORM, `Initializing... (minChars: ${minChars}, blockClickbait: ${blockClickbait})`);
    
    // Initial sweep
    filterTweets();
    
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
        
        const shouldBlock = analyzeTweet(tweet);
        
        if (shouldBlock.block) {
          hideElement(tweet, shouldBlock.reason);
          markProcessed(tweet);
          blockedCount++;
          incrementBlockCounter('twitter', 1);
        } else {
          markProcessed(tweet);
        }
      });
      
      if (blockedCount > 0) {
        log(PLATFORM, `Blocked ${blockedCount} posts`);
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

  // Analyze tweet to determine if it should be blocked
  function analyzeTweet(tweet) {
    try {
      // Extract tweet text
      const tweetText = extractTweetText(tweet);
      
      if (!tweetText) {
        return { block: false };
      }

      // Check character count
      const charCount = tweetText.length;
      
      if (charCount < minChars) {
        return {
          block: true,
          reason: `short-post-${charCount}chars`
        };
      }

      // Check for clickbait if enabled
      if (blockClickbait && isClickbait(tweetText)) {
        return {
          block: true,
          reason: 'clickbait'
        };
      }

      return { block: false };
    } catch (error) {
      logError(PLATFORM, 'Error analyzing tweet', error);
      return { block: false };
    }
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

  // Start mutation observer
  function startObserver() {
    const observer = createDebouncedObserver(() => {
      blockedCount = 0;
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
  new MutationObserver(() => {
    const currentUrl = location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      log(PLATFORM, 'URL changed, re-scanning...');
      blockedCount = 0;
      setTimeout(filterTweets, 500);
    }
  }).observe(document.body, { childList: true, subtree: true });

  // Listen for settings changes
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync' && changes.antiSlop_settings) {
      const newSettings = changes.antiSlop_settings.newValue;
      const wasEnabled = isEnabled;
      isEnabled = newSettings?.twitter?.enabled ?? false;
      minChars = newSettings?.twitter?.minChars || 100;
      blockClickbait = newSettings?.twitter?.blockClickbait ?? true;
      
      if (wasEnabled !== isEnabled) {
        log(PLATFORM, `Settings changed: ${isEnabled ? 'enabled' : 'disabled'}`);
        if (isEnabled) {
          location.reload();
        }
      } else if (isEnabled) {
        log(PLATFORM, `Settings updated (minChars: ${minChars})`);
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
