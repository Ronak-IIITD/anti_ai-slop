// Twitter/X Brainrot & AI Content Filter v3
// Stronger detection, lower thresholds, better UX
// Updated as of 2026-02-17

(async function() {
  'use strict';

  const utils = window.AntiSlopUtils || {};
  const { log, logError, hideElement, fadeElement, unfadeElement, isProcessed, markProcessed, getTextContent, createDebouncedObserver, incrementBlockCounter, isPlatformEnabled, createGlobalSiteIndicator } = utils;
  const detector = window.brainrotDetector;
  
  const PLATFORM = 'Twitter';
  let blockedCount = 0;
  let fadedCount = 0;
  let isEnabled = false;
  let sensitivity = 'medium';
  let blockBrainrot = true;
  let blockClickbait = true;
  const hasDetector = !!detector;

  // Twitter/X selectors - Updated as of 2026-02-17
  const SELECTORS = {
    tweet: ['article[data-testid="tweet"]', 'article[role="article"]', '[data-testid="tweet"]'],
    tweetText: ['[data-testid="tweetText"]', 'div[lang]'],
    replyContainer: ['[data-testid="cellInnerDiv"]', '[data-testid="tweet"] ~ [data-testid="tweet"]', 'div[style*="border-left"]']
  };

  // AI-generated reply patterns - EXPANDED
  const AI_REPLY_PATTERNS = [
    // Generic agreement (very common AI)
    /\bwell said\b/i,
    /\bgreat post\b/i,
    /\bcouldn'?t agree more\b/i,
    /\bso true\b/i,
    /\bthis is so (important|true|real)\b/i,
    /\blove this\b/i,
    /\babsolutely\b.{0,20}$/,
    /\bspot on\b/i,
    /\bthis resonates\b/i,
    /\bneeded to hear this\b/i,
    /\bpowerful (message|post|words)\b/i,
    /\bthank(s| you) for sharing\b/i,
    /\binsightful\b.{0,30}$/i,
    /\bbrilliant\b/i,
    /\bwell put\b/i,
    /\bnail(ed)? it\b/i,
    /\bthis exactly\b/i,
    /\b100(%| percent) (this|agree)\b/i,
    /\bvery well (written|said|put)\b/i,
    /\b(excellent|amazing|fantastic|wonderful) (post|thread|read)\b/i,
    /\bi (just |simply )?(love|adore|appreciate) this\b/i,
    /\b(clapping|👏|🙌|💯)\b/,
    
    // Very short generic (likely AI/bot)
    /^\s*(well said|great post|spot on|this|agreed|facts|exactly|real|true|yes)\s*[!.]*\s*$/i,
    /^\s*(this\.|facts\.|agreed\.|real\.)\s*$/i,
    /^\s*💯+\s*$/i,
    /^\s*(👏|🙌)+\s*$/i,
    
    // AI-style comments
    /\bthis (really )?resonates with me\b/i,
    /\bi (can'?t|cannot) (agree|stress|emphasize) (more|enough)\b/i,
    /\bthank you for (sharing|posting|bringing up) this\b/i,
    /\bappreciate you (sharing|posting|this)\b/i,
    /\bbeautifully (written|said|put)\b/i,
    /\b(well|beautifully) articulated\b/i,
    /\b(hit|struck) (the |a )?chord\b/i,
    /\b(well|perfectly) captured\b/i,
    /\bexactly (what|how) i (feel|felt|think)\b/i,
    /\bcouldn'?t have said it (better|myself)\b/i,
    /\bthis (is|was) (needed|necessary|refreshing)\b/i,
    /\bglad (someone|i) (saw|read|found) this\b/i,
    
    // AI engagement farming
    /\bgreat insights?\b/i,
    /\bvaluable (insights?|content|information)\b/i,
    /\bfood for thought\b/i,
    /\bthis (made|makes) (me|my) day\b/i,
    /\bsaved this (for later|post|thread)\b/i,
    /\bbookmark(ed|ing)? this\b/i
  ];

  // Clickbait patterns
  const CLICKBAIT_PATTERNS = [
    /\b(you won'?t believe|unbelievable)\b/i,
    /\b(this is why|here'?s why)\b/i,
    /\b\d+ reasons? why\b/i,
    /\b(will shock|shocked|shocking) you\b/i,
    /\bchanged my life\b/i,
    /\bgoing viral\b/i,
    /\b(thread|🧵)\b/i,
    /🚨/g,
    /\b(must read|must see)\b/i,
    /\b(before (it'?s too late|deleted))\b/i
  ];

  // Initialize
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

    log(PLATFORM, `Initializing (sensitivity: ${sensitivity})`);
    
    filterTweets();
    
    setTimeout(() => {
      if (typeof createGlobalSiteIndicator === 'function') {
        createGlobalSiteIndicator('twitter', { enabled: isEnabled, blocked: blockedCount + fadedCount });
      }
    }, 2000);
    
    startObserver();
    log(PLATFORM, 'Ready');
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

  function findAllTweets() {
    const tweets = [];
    SELECTORS.tweet.forEach(selector => {
      try {
        document.querySelectorAll(selector).forEach(tweet => tweets.push(tweet));
      } catch (e) {}
    });
    return Array.from(new Set(tweets));
  }

  // Analyze tweet
  function analyzeTweet(tweet) {
    try {
      const tweetText = extractTweetText(tweet);
      
      if (!tweetText || tweetText.length < 2) {
        return { action: 'none' };
      }

      const isReply = isReplyTweet(tweet);
      
      // LOWER thresholds for stronger detection
      const replyThreshold = 25;  // Was 40
      const normalThreshold = hasDetector ? detector.getSensitivityThreshold(sensitivity) : 30;

      let score = 0;
      const reasons = [];

      // 1. Brainrot detection
      if (blockBrainrot && hasDetector) {
        const slopScore = detector.analyzeSlopScore({
          title: '',
          description: tweetText,
          channelName: extractTweetAuthor(tweet)
        });
        if (slopScore > 0) {
          score = Math.max(score, slopScore);
          reasons.push('brainrot');
        }
      }

      // 2. AI reply detection
      if (isReply) {
        const aiReplyScore = detectAIReply(tweetText);
        if (aiReplyScore > 0) {
          score = Math.max(score, aiReplyScore);
          if (aiReplyScore >= 50) reasons.push('ai-reply');
        }
      }

      // 3. Clickbait
      if (blockClickbait && isClickbait(tweetText)) {
        score = Math.max(score, 50);
        reasons.push('clickbait');
      }

      // 4. Very short + generic = AI
      if (tweetText.length < 25 && isReply) {
        const trimmed = tweetText.trim().toLowerCase();
        if (/^(well said|great post|spot on|this|agreed|facts|exactly|real|true|yes|💯|👏|🙌)$/i.test(trimmed)) {
          score = Math.max(score, 85);
          reasons.push('generic');
        }
      }

      // Determine action
      if (isReply) {
        if (score >= replyThreshold) {
          return { action: 'fade', reason: reasons.join(', ') || 'low-quality', score };
        }
      } else {
        if (score >= normalThreshold) {
          return { action: 'block', reason: reasons.join(', ') || 'low-quality', score };
        }
      }

      return { action: 'none' };
    } catch (error) {
      logError(PLATFORM, 'Error analyzing tweet', error);
      return { action: 'none' };
    }
  }

  // Detect AI reply - returns score 0-100
  function detectAIReply(text) {
    let score = 0;
    let matches = 0;
    
    for (const pattern of AI_REPLY_PATTERNS) {
      if (pattern.test(text)) {
        matches++;
      }
    }

    if (matches >= 4) score = 80;
    else if (matches >= 3) score = 65;
    else if (matches >= 2) score = 45;
    else if (matches >= 1) score = 25;

    // Very short = more likely AI
    if (text.length < 20 && matches >= 1) score += 25;
    else if (text.length < 50 && matches >= 2) score += 15;

    // Just emojis
    if (/^[\s\p{Emoji_Presentation}\p{Extended_Pictographic}]+$/u.test(text)) {
      score = Math.max(score, 70);
    }

    return Math.min(score, 100);
  }

  // Check if tweet is a reply
  function isReplyTweet(tweet) {
    // Check for connecting line (reply thread)
    const parent = tweet.closest('[data-testid="cellInnerDiv"]');
    if (parent) {
      const hasLine = parent.querySelector('div[style*="border-left"]');
      if (hasLine) return true;
    }

    // Check for "Replying to"
    if (/replying to/i.test(tweet.textContent || '')) return true;

    // Check sibling context
    const article = tweet.closest('article');
    if (article) {
      const grandparent = article.parentElement?.parentElement;
      if (grandparent && grandparent.querySelectorAll('article').length > 1) {
        return true;
      }
    }

    return false;
  }

  function extractTweetText(tweet) {
    for (const selector of SELECTORS.tweetText) {
      try {
        const el = tweet.querySelector(selector);
        if (el) {
          const text = getTextContent(el);
          if (text) return text;
        }
      } catch (e) {}
    }
    return getTextContent(tweet);
  }

  function extractTweetAuthor(tweet) {
    const selectors = ['[data-testid="User-Name"]', '[data-testid="User-Names"]', 'a[role="link"][href^="/"]'];
    for (const selector of selectors) {
      try {
        const el = tweet.querySelector(selector);
        if (el) {
          const text = getTextContent(el);
          if (text && text.length < 80) return text;
        }
      } catch (e) {}
    }
    return '';
  }

  function isClickbait(text) {
    return CLICKBAIT_PATTERNS.some(pattern => {
      if (pattern.global) {
        const matches = text.match(pattern);
        return matches && matches.length >= 2;
      }
      return pattern.test(text);
    });
  }

  // Add visible indicator
  function addVisibleIndicator(tweet, score, reason) {
    if (tweet.querySelector('.anti-slop-visible-badge')) return;

    const computedStyle = window.getComputedStyle(tweet);
    if (computedStyle.position === 'static') {
      tweet.style.position = 'relative';
    }

    const badge = document.createElement('div');
    badge.className = 'anti-slop-visible-badge';
    badge.innerHTML = `
      <span class="anti-slop-vbadge-score">AI: ${score}</span>
      <span class="anti-slop-vbadge-reason">${_escapeHtml(reason.split(',')[0])}</span>
      <button class="anti-slop-vbadge-hide" type="button" title="Hide">&#x2715;</button>
      <button class="anti-slop-vbadge-show" type="button" title="Show">&#x2713;</button>
    `;

    tweet.appendChild(badge);

    badge.querySelector('.anti-slop-vbadge-hide').addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      unfadeElement(tweet);
      hideElement(tweet, 'user-hidden');
      badge.remove();
    });

    badge.querySelector('.anti-slop-vbadge-show').addEventListener('click', (e) => {
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

  function startObserver() {
    const observer = createDebouncedObserver(() => filterTweets(), 300);
    const timeline = document.querySelector('[role="main"]') || document.body;
    observer.observe(timeline, { childList: true, subtree: true });
  }

  // URL change handler (SPA)
  let lastUrl = location.href;
  function setupUrlChangeObserver() {
    if (!document.body) {
      setTimeout(setupUrlChangeObserver, 100);
      return;
    }
    new MutationObserver(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        setTimeout(filterTweets, 500);
      }
    }).observe(document.body, { childList: true, subtree: true });
  }
  setupUrlChangeObserver();

  // Settings listener
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
          if (isEnabled) location.reload();
        } else if (isEnabled) {
          document.querySelectorAll('[data-anti-slop-processed]').forEach(el => {
            el.removeAttribute('data-anti-slop-processed');
          });
          filterTweets();
        }
      }
    });
  }

  // Start
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
