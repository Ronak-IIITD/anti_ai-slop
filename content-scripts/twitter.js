// Twitter/X Brainrot & AI Content Filter v2
// Filters out brainrot, clickbait, and AI-generated content
// Uses fade mode for replies (90% AI, 15% useful - don't fully block)
// Updated as of 2026-02-17

(async function() {
  'use strict';

  const { log, logError, hideElement, fadeElement, unfadeElement, isProcessed, markProcessed, getTextContent, createDebouncedObserver, incrementBlockCounter, isPlatformEnabled, createGlobalSiteIndicator } = window.AntiSlopUtils || {};
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
  // Updated selectors as of 2026-02-17
  const SELECTORS = {
    tweet: [
      'article[data-testid="tweet"]',
      'article[role="article"]',
      '[data-testid="tweet"]'
    ],
    
    tweetText: [
      '[data-testid="tweetText"]',
      'div[lang]'
    ],

    replyContainer: [
      '[data-testid="cellInnerDiv"]',
      '[data-testid="tweet"] ~ [data-testid="tweet"]',
      'div[style*="border-left"]'
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
    /🚨/g
  ];

  // AI-generated reply indicators (for Twitter comments)
  const AI_REPLY_PATTERNS = [
    /\bwell said\b/i,
    /\bgreat post\b/i,
    /\bcouldn'?t agree more\b/i,
    /\bso true\b/i,
    /\bthis is so important\b/i,
    /\blove this\b/i,
    /\babsolutely\b.{0,20}$/,              // "Absolutely" at end
    /\bspot on\b/i,
    /\bthis resonates\b/i,
    /\bneeded to hear this\b/i,
    /\bpowerful message\b/i,
    /\bthank you for sharing\b/i,
    /\binsightful\b.{0,30}$/i,             // "Insightful" near end
    /\bbrilliant\b/i,
    /\bwell put\b/i,
    /\bnail(ed)? it\b/i,
    /\bthis exactly\b/i,
    /\b100(%| percent) (this|agree)\b/i,
    /\b((very|super|really) )?well written\b/i,
    /\b(excellent|amazing|fantastic|wonderful) (post|article|read)\b/i,
    /\bi (just |simply )?(love|adore|appreciate) this\b/i,
    /\b(clapping|👏|🙌)/,                    // Clapping emoji spam
    /^\s*(well said|great post|spot on|this|agreed|facts|exactly)\s*[!.]*\s*$/i,  // Very short generic
  ];

  // Initialize filter
  async function init() {
    isEnabled = await isPlatformEnabled('twitter');
    
    if (!isEnabled) {
      log(PLATFORM, 'Disabled in settings');
      return;
    }

    const settings = await storageManager.getSettings();
    sensitivity = settings.twitter?.sensitivity || 'medium';
    blockBrainrot = settings.twitter?.blockBrainrot ?? true;
    blockClickbait = settings.twitter?.blockClickbait ?? true;

    log(PLATFORM, `Initializing... (sensitivity: ${sensitivity}, brainrot: ${blockBrainrot}, clickbait: ${blockClickbait})`);
    
    // Initial sweep
    filterTweets();
    
    // Show global site indicator after delay
    setTimeout(() => {
      if (typeof createGlobalSiteIndicator === 'function') {
        createGlobalSiteIndicator('twitter', {
          enabled: isEnabled,
          blocked: blockedCount + fadedCount
        });
      }
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
          fadeElement(tweet, analysis.reason);
          markProcessed(tweet);
          fadedCount++;
          // Add visible indicator badge (not just hover)
          addVisibleIndicator(tweet, analysis.score, analysis.reason);
        } else {
          markProcessed(tweet);
        }
      });
      
      if (blockedCount > 0 || fadedCount > 0) {
        log(PLATFORM, `Blocked: ${blockedCount}, Faded: ${fadedCount}`);
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
      } catch (e) {}
    });
    
    return Array.from(new Set(tweets));
  }

  // Analyze tweet to determine if it should be blocked/faded
  function analyzeTweet(tweet) {
    try {
      const tweetText = extractTweetText(tweet);
      
      if (!tweetText || tweetText.length < 3) {
        return { action: 'none' };
      }

      const isReply = isReplyTweet(tweet);
      const replyThreshold = 40;  // Lower threshold - catch more AI
      const normalThreshold = hasDetector ? detector.getSensitivityThreshold(sensitivity) : 50;

      let score = 0;
      const reasons = [];

      // 1. Brainrot detection
      if (blockBrainrot && hasDetector) {
        const metadata = {
          title: '',
          description: tweetText,
          channelName: extractTweetAuthor(tweet)
        };
        const slopScore = detector.analyzeSlopScore(metadata);
        if (slopScore > 0) {
          score = slopScore;
          reasons.push('brainrot');
        }
      }

      // 2. AI reply detection (for comments/replies)
      if (isReply) {
        const aiReplyScore = detectAIReply(tweetText);
        if (aiReplyScore > 0) {
          score = Math.max(score, aiReplyScore);
          reasons.push('ai-reply');
        }
      }

      // 3. Clickbait detection
      if (blockClickbait && isClickbait(tweetText)) {
        score = Math.max(score, 60);
        reasons.push('clickbait');
      }

      // Determine action based on context
      if (isReply) {
        // For replies: fade mode (don't fully block)
        if (score >= replyThreshold) {
          return {
            action: 'fade',
            reason: reasons.join(', ') || 'ai-content',
            score: score
          };
        }
      } else {
        // For main tweets: block mode
        if (score >= normalThreshold) {
          return {
            action: 'block',
            reason: reasons.join(', ') || 'low-quality',
            score: score
          };
        }
      }

      return { action: 'none' };
    } catch (error) {
      logError(PLATFORM, 'Error analyzing tweet', error);
      return { action: 'none' };
    }
  }

  // Detect AI-generated reply
  function detectAIReply(text) {
    let score = 0;
    const textLower = text.toLowerCase();
    
    // Count AI reply pattern matches
    let matches = 0;
    for (const pattern of AI_REPLY_PATTERNS) {
      if (pattern.test(text)) {
        matches++;
      }
    }

    // Score based on matches
    if (matches >= 3) score = 70;
    else if (matches >= 2) score = 55;
    else if (matches >= 1) score = 35;

    // Very short generic comments (likely AI/bot)
    if (text.length < 30 && matches >= 1) {
      score += 20;
    }

    // No original thought - just agreement
    if (/^(well said|great post|spot on|agreed|facts|exactly|this)$/i.test(text.trim())) {
      score = 80;
    }

    return Math.min(score, 100);
  }

  // Check if tweet is a reply
  function isReplyTweet(tweet) {
    // Method 1: Check for reply context indicators
    const replyContext = tweet.closest('[data-testid="cellInnerDiv"]');
    if (replyContext) {
      // Check if there's a connecting line (reply thread indicator)
      const hasConnectingLine = replyContext.querySelector('div[style*="border-left"]');
      if (hasConnectingLine) return true;
    }

    // Method 2: Check for "Replying to" text
    const replyInfo = tweet.querySelector('[data-testid="reply"]');
    const parentText = tweet.textContent || '';
    if (/replying to/i.test(parentText)) return true;

    // Method 3: Check if tweet is in a thread (has previous tweet visible)
    const prevSibling = tweet.previousElementSibling;
    if (prevSibling && prevSibling.querySelector('article[data-testid="tweet"]')) {
      return true;
    }

    // Method 4: Check for "Show replies" or similar nearby
    const nextSibling = tweet.nextElementSibling;
    if (nextSibling && /replies/i.test(nextSibling.textContent || '')) {
      return true;
    }

    // Method 5: Nested tweets (replies in conversation view)
    const article = tweet.closest('article');
    if (article) {
      const parent = article.parentElement;
      if (parent && parent.querySelectorAll('article').length > 1) {
        return true;
      }
    }

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
        const matches = text.match(pattern);
        return matches && matches.length >= 3;
      }
      return pattern.test(text);
    });
  }

  // Add visible indicator badge to faded tweets (always visible, not just hover)
  function addVisibleIndicator(tweet, score, reason) {
    if (tweet.querySelector('.anti-slop-visible-badge')) return;

    // Ensure tweet has position context
    const computedStyle = window.getComputedStyle(tweet);
    if (computedStyle.position === 'static') {
      tweet.style.position = 'relative';
    }

    const badge = document.createElement('div');
    badge.className = 'anti-slop-visible-badge';
    badge.innerHTML = `
      <span class="anti-slop-vbadge-score">AI: ${score}</span>
      <span class="anti-slop-vbadge-reason">${_escapeHtml(reason.split(',')[0])}</span>
      <button class="anti-slop-vbadge-hide" type="button" title="Hide this">&#x2715;</button>
      <button class="anti-slop-vbadge-show" type="button" title="Show anyway">&#x2713;</button>
    `;

    tweet.appendChild(badge);

    // Hide button
    const hideBtn = badge.querySelector('.anti-slop-vbadge-hide');
    hideBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      unfadeElement(tweet);
      hideElement(tweet, 'user-hidden');
      badge.remove();
    });

    // Show button (remove fade)
    const showBtn = badge.querySelector('.anti-slop-vbadge-show');
    showBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      unfadeElement(tweet);
      badge.remove();
    });
  }

  function _escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // Start mutation observer
  function startObserver() {
    const observer = createDebouncedObserver(() => {
      filterTweets();
    }, 300);

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
        setTimeout(filterTweets, 500);
      }
    }).observe(document.body, { childList: true, subtree: true });
  }
  setupUrlChangeObserver();

  // Listen for settings changes
  if (typeof chrome !== 'undefined' && chrome.storage) {
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
          document.querySelectorAll('[data-anti-slop-processed]').forEach(el => {
            el.removeAttribute('data-anti-slop-processed');
          });
          filterTweets();
        }
      }
    });
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
