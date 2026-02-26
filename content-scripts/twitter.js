// Twitter/X Brainrot & AI Content Filter v4 - ROBUST FIX
// Fixed selectors, stronger detection, reliable on current X.com UI
// Updated as of 2026-02-17

(function() {
  'use strict';

  const PLATFORM = 'Twitter';
  let blockedCount = 0;
  let fadedCount = 0;
  let isEnabled = false;
  let sensitivity = 'medium';
  let blockBrainrot = true;
  let blockClickbait = true;
  let initDone = false;

  // Initialize when ready
  function init() {
    if (initDone) return;
    
    const checkReady = setInterval(() => {
      if (window.AntiSlopUtils && window.brainrotDetector && document.body) {
        clearInterval(checkReady);
        initDone = true;
        startFiltering();
      }
    }, 100);
    
    // Fallback timeout
    setTimeout(() => {
      if (!initDone && window.AntiSlopUtils) {
        initDone = true;
        startFiltering();
      }
    }, 3000);
  }

  async function startFiltering() {
    const utils = window.AntiSlopUtils || {};
    const detector = window.brainrotDetector;
    
    if (!utils.log) return;
    
    const { log, logError, hideElement, fadeElement, unfadeElement, isProcessed, markProcessed, getTextContent, createDebouncedObserver, incrementBlockCounter, createGlobalSiteIndicator } = utils;
    
    // Check if enabled
    try {
      const settings = await storageManager.getSettings();
      isEnabled = settings.twitter?.enabled ?? true;
      sensitivity = settings.twitter?.sensitivity || 'medium';
      blockBrainrot = settings.twitter?.blockBrainrot ?? true;
      blockClickbait = settings.twitter?.blockClickbait ?? true;
    } catch (e) {
      isEnabled = true;
      sensitivity = 'medium';
    }
    
    if (!isEnabled) {
      log(PLATFORM, 'Disabled');
      return;
    }

    log(PLATFORM, `Starting with sensitivity: ${sensitivity}`);
    
    // Run immediately and multiple times
    runFilter(log, detector);
    setTimeout(() => runFilter(log, detector), 1000);
    setTimeout(() => runFilter(log, detector), 2000);
    setTimeout(() => runFilter(log, detector), 4000);
    
    // Keep observing
    const observer = createDebouncedObserver(() => runFilter(log, detector), 500);
    const target = document.querySelector('[role="main"]') || document.body;
    observer.observe(target, { childList: true, subtree: true });
    
    // Handle navigation
    let lastUrl = location.href;
    new MutationObserver(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        setTimeout(() => runFilter(log, detector), 1500);
      }
    }).observe(document.body, { childList: true, subtree: true });
    
    log(PLATFORM, 'Filter ready');
  }

  // Main filter function
  function runFilter(log, detector) {
    if (!detector) return;
    
    const tweets = getAllTweets();
    const threshold = detector.getSensitivityThreshold(sensitivity);
    const replyThreshold = Math.max(15, threshold - 15);
    
    tweets.forEach(tweet => {
      if (isProcessed(tweet)) return;
      
      const text = getTweetText(tweet);
      if (!text || text.length < 2) {
        markProcessed(tweet);
        return;
      }
      
      const isReply = checkIsReply(tweet);
      let score = 0;
      const reasons = [];
      
      // Brainrot detection
      if (blockBrainrot) {
        const slopScore = detector.analyzeSlopScore({
          title: '',
          description: text,
          channelName: getAuthor(tweet)
        });
        if (slopScore > 0) {
          score = Math.max(score, slopScore);
          reasons.push('brainrot');
        }
      }
      
      // AI reply detection
      if (isReply) {
        const aiScore = scoreAIReply(text);
        if (aiScore > 0) {
          score = Math.max(score, aiScore);
          reasons.push('ai-reply');
        }
      }
      
      // Clickbait
      if (blockClickbait && isClickbait(text)) {
        score = Math.max(score, 45);
        reasons.push('clickbait');
      }
      
      // Very short generic
      if (text.length < 25 && isGenericReply(text)) {
        score = Math.max(score, 75);
        reasons.push('generic');
      }
      
      // Action
      const useThreshold = isReply ? replyThreshold : threshold;
      
      if (score >= useThreshold) {
        markProcessed(tweet);
        
        if (isReply) {
          fadeElement(tweet, reasons.join(', '));
          fadedCount++;
          addQuickBadge(tweet, score);
        } else {
          hideElement(tweet, reasons.join(', '));
          blockedCount++;
        }
        
        log(PLATFORM, `${isReply ? 'Faded' : 'Blocked'} score:${score} - "${text.substring(0, 25)}..."`);
      } else {
        markProcessed(tweet);
      }
    });
    
    if (blockedCount + fadedCount > 0) {
      incrementBlockCounter('twitter', blockedCount + fadedCount);
    }
  }

  // Get all tweets - multiple selector strategies
  function getAllTweets() {
    const tweets = [];
    const selectors = [
      'article[data-testid="tweet"]',
      'article[role="article"]',
      'div[data-testid="tweet"]',
      '[data-testid="tweet"]',
      'div[role="article"]',
      'ytd-rich-item-renderer',
      'ytd-video-renderer'
    ];
    
    selectors.forEach(sel => {
      try {
        document.querySelectorAll(sel).forEach(el => {
          if (el.offsetParent !== null) tweets.push(el);
        });
      } catch(e) {}
    });
    
    return [...new Set(tweets)];
  }

  // Get tweet text
  function getTweetText(tweet) {
    const selectors = [
      '[data-testid="tweetText"]',
      'div[lang]',
      'span[data-testid="tweetText"]',
      'h1', 'h2', 'h3',
      'yt-formatted-string'
    ];
    
    for (const sel of selectors) {
      try {
        const el = tweet.querySelector(sel);
        if (el && el.textContent?.trim()) {
          return el.textContent.trim();
        }
      } catch(e) {}
    }
    
    return tweet.textContent?.replace(/\s+/g, ' ').trim() || '';
  }

  function getAuthor(tweet) {
    try {
      const el = tweet.querySelector('[data-testid="User-Name"], [data-testid="User-Names"], a[href*="/@"]');
      return el?.textContent?.trim() || '';
    } catch(e) {}
    return '';
  }

  // Check if reply
  function checkIsReply(tweet) {
    try {
      const text = tweet.textContent || '';
      if (/replying to/i.test(text)) return true;
      
      if (tweet.querySelector('[data-testid="reply"]')) {
        const parent = tweet.closest('[data-testid="cellInnerDiv"]');
        if (parent) {
          const articles = parent.querySelectorAll('article');
          if (articles.length > 1) return true;
        }
      }
      
      const article = tweet.closest('article');
      const grandparent = article?.parentElement?.parentElement;
      if (grandparent) {
        const all = grandparent.querySelectorAll('article, [role="article"]');
        if (all.length > 1) return true;
      }
    } catch(e) {}
    
    return false;
  }

  // Score AI reply
  function scoreAIReply(text) {
    const lower = text.toLowerCase();
    let matches = 0;
    
    const patterns = [
      /well said/i, /great post/i, /couldn'?t agree/i, /so true/i,
      /this is so/i, /love this/i, /absolutely/i, /spot on/i,
      /this resonates/i, /needed to hear/i, /powerful/i, /thank you/i,
      /insightful/i, /brilliant/i, /well put/i, /exactly/i, /100%/i,
      /💯/i, /👏/i, /🙌/i, /👍/i, /appreciate/i, /beautiful/i,
      /great insight/i, /valuable/i, /perfect/i, /nice/i, /good point/i,
      /couldn'?t have said/i, /hit the nail/i, /articulated well/i
    ];
    
    patterns.forEach(p => { if (p.test(text)) matches++; });
    
    if (matches >= 4) return 80;
    if (matches >= 3) return 60;
    if (matches >= 2) return 40;
    if (matches >= 1) return 22;
    
    if (/^[\s💯👏🙌👍❤️🔥]+$/.test(text)) return 70;
    if (text.length < 20 && matches >= 1) return 50;
    
    return 0;
  }

  // Generic short reply
  function isGenericReply(text) {
    const t = text.trim().toLowerCase();
    return /^(well said|great post|spot on|this|agreed|facts|exactly|real|true|yes|💯|👏|🙌|👍|love it|so true|nice|perfect|good|👀|🔥|❤️)$/i.test(t);
  }

  // Clickbait
  function isClickbait(text) {
    return /you won'?t believe|this is why|here'?s why|\d+ reasons|will shock|changed my life|going viral|thread|🚨|exposed|leaked|breaking|must (watch|read|see)/i.test(text);
  }

  // Quick badge
  function addQuickBadge(tweet, score) {
    if (tweet.querySelector('.anti-slop-qbadge')) return;
    try { tweet.style.position = 'relative'; } catch(e) {}
    
    const badge = document.createElement('div');
    badge.className = 'anti-slop-qbadge';
    badge.innerHTML = `<span>AI:${score}</span><button>✕</button>`;
    
    tweet.appendChild(badge);
    
    badge.querySelector('button').addEventListener('click', (e) => {
      e.stopPropagation();
      const { unfadeElement, hideElement } = window.AntiSlopUtils || {};
      if (unfadeElement) unfadeElement(tweet);
      if (hideElement) hideElement(tweet, 'user-hidden');
      badge.remove();
    });
  }

  // Start
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
