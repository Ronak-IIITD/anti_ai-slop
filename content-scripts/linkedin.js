// LinkedIn Content Script for Anti-Slop Extension v4 - ROBUST
// Complete rewrite with strong detection, multiple runs, reliable selectors
// Updated as of 2026-02-18

(function() {
  'use strict';

  const PLATFORM = 'LinkedIn';
  let blockedCount = 0;
  let fadedCount = 0;
  let initDone = false;

  // Initialize
  function init() {
    if (initDone) return;
    
    const checkReady = setInterval(() => {
      if (window.AntiSlopUtils && window.brainrotDetector && document.body) {
        clearInterval(checkReady);
        initDone = true;
        startFiltering();
      }
    }, 100);
    
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
    
    const { log, logError, hideElement, fadeElement, unfadeElement, isProcessed, markProcessed, getTextContent, incrementBlockCounter } = utils;
    
    let sensitivity = 'medium';
    let isEnabled = true;
    
    try {
      const settings = await storageManager.getSettings();
      isEnabled = settings.linkedin?.enabled ?? true;
      sensitivity = settings.linkedin?.sensitivity || 'medium';
    } catch (e) {}
    
    if (!isEnabled) {
      log(PLATFORM, 'Disabled');
      return;
    }

    log(PLATFORM, `Starting (sensitivity: ${sensitivity})`);
    
    // Run multiple times like Twitter
    runFilter(log, detector, sensitivity);
    setTimeout(() => runFilter(log, detector, sensitivity), 1000);
    setTimeout(() => runFilter(log, detector, sensitivity), 2000);
    setTimeout(() => runFilter(log, detector, sensitivity), 4000);
    setTimeout(() => runFilter(log, detector, sensitivity), 6000);
    
    // Observer
    const observer = new MutationObserver(() => {
      runFilter(log, detector, sensitivity);
    });
    
    const target = document.querySelector('.scaffold-finite-scroll') || 
                   document.querySelector('.feed-shared-update-v2')?.parentElement ||
                   document.body;
    
    observer.observe(target, { childList: true, subtree: true });
    
    // Navigation
    let lastUrl = location.href;
    new MutationObserver(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        setTimeout(() => runFilter(log, detector, sensitivity), 2000);
      }
    }).observe(document.body, { childList: true, subtree: true });
    
    log(PLATFORM, 'Filter ready');
  }

  // Main filter
  function runFilter(log, detector, sensitivity) {
    if (!detector) return;
    
    const threshold = getThreshold(sensitivity);
    const posts = getAllPosts();
    
    posts.forEach(post => {
      if (isProcessed(post)) return;
      
      const text = getPostText(post);
      if (!text || text.length < 5) {
        markProcessed(post);
        return;
      }
      
      const isComment = isCommentPost(post);
      let score = 0;
      const reasons = [];
      
      // Motivational spam patterns
      const spamScore = scoreSpam(text);
      if (spamScore > 0) {
        score = Math.max(score, spamScore);
        reasons.push('spam');
      }
      
      // AI-generated patterns
      const aiScore = scoreAI(text);
      if (aiScore > 0) {
        score = Math.max(score, aiScore);
        reasons.push('ai');
      }
      
      // Brainrot
      const brainrotScore = detector.analyzeSlopScore({
        title: text.substring(0, 100),
        description: text,
        channelName: ''
      });
      if (brainrotScore > 0) {
        score = Math.max(score, brainrotScore);
        reasons.push('brainrot');
      }
      
      // LinkedIn poem format (short lines)
      if (isLinkedInPoem(text)) {
        score = Math.max(score, 55);
        reasons.push('poem');
      }
      
      // Hashtag spam
      const hashtagCount = (text.match(/#\w+/g) || []).length;
      if (hashtagCount >= 5) {
        score = Math.max(score, 30);
        reasons.push('hashtag-spam');
      }
      
      const useThreshold = isComment ? Math.max(15, threshold - 10) : threshold;
      
      if (score >= useThreshold) {
        markProcessed(post);
        
        if (isComment) {
          fadeElement(post, reasons.join(', '));
          fadedCount++;
        } else {
          hideElement(post, reasons.join(', '));
          blockedCount++;
        }
        
        log(PLATFORM, `${isComment ? 'Faded' : 'Blocked'} score:${score} - "${text.substring(0, 30)}..."`);
      } else {
        markProcessed(post);
      }
    });
    
    if (blockedCount + fadedCount > 0) {
      incrementBlockCounter('linkedin', blockedCount + fadedCount);
    }
  }

  function getThreshold(sensitivity) {
    switch (sensitivity) {
      case 'low': return 35;
      case 'medium': return 20;
      case 'high': return 12;
      default: return 20;
    }
  }

  // Get all posts
  function getAllPosts() {
    const posts = [];
    const selectors = [
      '.feed-shared-update-v2',
      '.feed-shared-update',
      'div[data-urn*="activity"]',
      '.scaffold-finite-scroll .feed-shared',
      '.full-height .feed-shared',
      '.occludable-update',
      '[data-occludable-id]'
    ];
    
    selectors.forEach(sel => {
      try {
        document.querySelectorAll(sel).forEach(el => {
          if (el.offsetParent !== null) posts.push(el);
        });
      } catch(e) {}
    });
    
    return [...new Set(posts)];
  }

  // Get post text
  function getPostText(post) {
    const selectors = [
      '.feed-shared-text',
      '.feed-shared-update-v2__description',
      '.break-words',
      '.feed-shared-update__description',
      '[data-ember-id] .feed-shared-text',
      '.occludable-update__main-content',
      '.feed-shared-navigation'
    ];
    
    for (const sel of selectors) {
      try {
        const el = post.querySelector(sel);
        if (el && el.textContent?.trim()) {
          return el.textContent.trim();
        }
      } catch(e) {}
    }
    
    return post.textContent?.replace(/\s+/g, ' ').trim() || '';
  }

  // Check if comment
  function isCommentPost(post) {
    const selectors = [
      '.comments-comment-item',
      '.comments-comment-entity',
      '.comments-post-comment',
      '[data-test-comment]'
    ];
    
    for (const sel of selectors) {
      try {
        if (post.closest(sel)) return true;
      } catch(e) {}
    }
    
    // Check for "reply" context
    const parent = post.parentElement;
    if (parent) {
      const comments = parent.querySelectorAll('.comments-comment-item, .comments-comment-entity');
      if (comments.length > 0) return true;
    }
    
    return false;
  }

  // Score spam/motivational content
  function scoreSpam(text) {
    const lower = text.toLowerCase();
    let score = 0;
    let matches = 0;
    
    // Strong patterns
    const strong = [
      /agree\??/i, /thoughts\??/i, /agree or disagree/i,
      /repost if you agree/i, /share if you agree/i, /like if you agree/i,
      /drop a comment/i, /comment your thoughts/i,
      /i got fired/i, /i got rejected/i, /i was homeless/i,
      /i went from/i, /here'?s what i learned/i, /nobody talks about this/i,
      /unpopular opinion/i, /hot take/i, /controversial take/i,
      /my boss told me/i, /a candidate showed up/i, /i interviewed/i,
      /hustle culture/i, /grind mindset/i, /rise and grind/i,
      /no days off/i, /while you were sleeping/i,
      /be kind be grateful/i, /be humble/i, /hard work pays/i,
      /your network is your net worth/i, /hire for attitude/i,
      /culture eats strategy/i, /quiet quitting/i, /toxic workplace/i,
      /red flag/i, /green flag/i, /leadership is/i, /a true leader/i,
      /wake up at 5am/i, /morning routine/i, /productivity hack/i,
      /life-changing/i, /game-changing/i
    ];
    
    strong.forEach(p => { if (p.test(text)) matches++; });
    
    if (matches >= 4) score = 85;
    else if (matches >= 3) score = 65;
    else if (matches >= 2) score = 45;
    else if (matches >= 1) score = 25;
    
    return Math.min(score, 100);
  }

  // Score AI-generated
  function scoreAI(text) {
    const lower = text.toLowerCase();
    let score = 0;
    let matches = 0;
    
    const patterns = [
      /^in today'?s/i, /^here'?s/i, /^let me/i, /^today/i,
      /delve into/i, /navigate the landscape/i, /holistic approach/i,
      /paradigm shift/i, /thought leader/i, /value proposition/i,
      /actionable insights/i, /key takeaways/i,
      /it'?s important to/i, /it is crucial to/i,
      /\n\n[A-Z]/g,  // Short paragraphs with capitals
      /\n\n.+\n\n.+\n\n.+\n\n/,  // Multiple short paragraphs
      /in (the )?(world|age|era|landscape|market) of/i,
      /empower/i, /leverage/i, /optimize/i, /streamline/i,
      /transformative/i, /revolutionize/i, /cutting-edge/i,
      /best practices/i, /comprehensive guide/i, /ultimate guide/i
    ];
    
    patterns.forEach(p => { if (p.test(text)) matches++; });
    
    if (matches >= 4) score = 75;
    else if (matches >= 3) score = 55;
    else if (matches >= 2) score = 35;
    else if (matches >= 1) score = 18;
    
    // LinkedIn poem detection
    const lines = text.split('\n').filter(l => l.trim().length > 0);
    const shortLines = lines.filter(l => l.trim().length < 40);
    if (lines.length >= 4 && shortLines.length / lines.length > 0.7) {
      score = Math.max(score, 50);
    }
    
    return Math.min(score, 100);
  }

  // LinkedIn poem format
  function isLinkedInPoem(text) {
    const lines = text.split('\n').filter(l => l.trim().length > 0);
    if (lines.length < 4) return false;
    
    const shortLines = lines.filter(l => l.trim().length < 40);
    return shortLines.length / lines.length > 0.6;
  }

  // Start
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
