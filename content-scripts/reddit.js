// Reddit Brainrot Content Filter
// Filters out brainrot, low-effort posts, and upvote bait
// Uses fade mode for comments (similar to Twitter replies)

(async function() {
  'use strict';

  const { log, logError, hideElement, fadeElement, isProcessed, markProcessed, getTextContent, createDebouncedObserver, incrementBlockCounter, isPlatformEnabled, createGlobalSiteIndicator } = window.AntiSlopUtils;
  const detector = window.brainrotDetector;
  
  const PLATFORM = 'Reddit';
  let blockedCount = 0;
  let fadedCount = 0;
  let isEnabled = false;
  let sensitivity = 'medium';
  const hasDetector = !!detector;

  // Reddit selectors
  // Updated selectors as of 2026-02-17
  const SELECTORS = {
    // Post containers
    post: [
      '[data-testid="post-container"]',
      'shreddit-post',
      '[id^="post-"]',
      '.Post'
    ],
    
    // Post title (main content to analyze)
    postTitle: [
      '[data-testid="post-title"]',
      'h3',
      '[slot="title"]'
    ],
    
    // Post body text
    postBody: [
      '[data-testid="post-body"]',
      '[data-testid="post-text"]',
      '.md'
    ],
    
    // Comments
    comment: [
      '[data-testid="comment"]',
      'shreddit-comment',
      '.Comment'
    ],
    
    // Vote buttons (for upvote manipulation detection)
    vote: [
      '[data-testid="upvote"]',
      '[data-testid="downvote"]',
      '.voteButton'
    ]
  };

  // Reddit-specific brainrot patterns
  const REDDIT_BRAINROT_PATTERNS = [
    /who else.*\?/i,
    /upvote if/i,
    /upvote because/i,
    /like and upvote/i,
    /drop an.*if/i,
    /comment below/i,
    /tell me you're.*without telling/i,
    /unpopular opinion/i,
    /hot take/i,
    /this is my.*sign/i,
    /a.*sign that you/i,
    /not my first rodeo/i,
    /been there done that/i,
    /plot twist/i,
    /twist:/i,
    /i'm in danger/i,
    /wrong thread/i,
    /cursed/i,
    /made me cry/i,
    /literally me/i,
    /that's me when/i,
    /me_irl/i,
    /f in the chat/i,
    /press f to/i,
    /L + ratio/i,
    /ratio'd/i,
    /sheesh/i,
    /slay/i,
    /go off queen/i,
    /yass/i,
    /sksksk/i,
    /i'm screaming/i,
    /dying/i,
    /💀/g,
    /😂+(\s|$)/gi,
    /🤣+(\s|$)/gi
  ];

  // Low-effort post patterns
  const LOW_EFFORT_PATTERNS = [
    /what should i (watch|play|read|listen)/i,
    /give me (recommendations|suggestions)/i,
    /best .* under/i,
    /.* vs .* which is better/i,
    /is .* worth it/i,
    /should i (buy|get|watch)/i,
    /what's your favorite.*\?/i,
    /anyone else.*\?/i,
    /does anyone else/i,
    /ama/i
  ];

  // Initialize filter
  async function init() {
    isEnabled = await isPlatformEnabled('reddit');
    
    if (!isEnabled) {
      log(PLATFORM, 'Disabled in settings');
      return;
    }

    const settings = await storageManager.getSettings();
    sensitivity = settings.reddit?.sensitivity || 'medium';

    log(PLATFORM, `Initializing... (sensitivity: ${sensitivity})`);
    
    filterPosts();
    
    setTimeout(() => {
      createGlobalSiteIndicator('reddit', {
        enabled: isEnabled,
        blocked: blockedCount + fadedCount
      });
    }, 2000);
    
    startObserver();
    
    log(PLATFORM, 'Initialized successfully');
  }

  // Main filtering function
  function filterPosts() {
    try {
      const posts = findAllPosts();
      
      posts.forEach(post => {
        if (isProcessed(post)) return;
        
        const analysis = analyzePost(post);
        
        if (analysis.action === 'block') {
          hideElement(post, analysis.reason);
          markProcessed(post);
          blockedCount++;
          incrementBlockCounter('reddit', 1);
        } else if (analysis.action === 'fade') {
          fadeElement(post, analysis.reason);
          markProcessed(post);
          fadedCount++;
        } else {
          markProcessed(post);
        }
      });
      
      if (blockedCount > 0) {
        log(PLATFORM, `Blocked ${blockedCount} posts`);
      }
      if (fadedCount > 0) {
        log(PLATFORM, `Faded ${fadedCount} comments`);
      }
    } catch (error) {
      logError(PLATFORM, 'Error in filterPosts', error);
    }
  }

  // Find all post elements
  function findAllPosts() {
    const posts = [];
    
    SELECTORS.post.forEach(selector => {
      try {
        const found = document.querySelectorAll(selector);
        found.forEach(post => posts.push(post));
      } catch (e) {
        // Selector might not work
      }
    });
    
    return Array.from(new Set(posts));
  }

  // Analyze post to determine action
  function analyzePost(post) {
    try {
      const postText = extractPostText(post);
      
      if (!postText || postText.length < 10) {
        return { action: 'none' };
      }

      const isComment = isCommentPost(post);
      const threshold = hasDetector ? detector.getSensitivityThreshold(sensitivity) : 35;
      
      // Use slightly higher threshold for comments (but still lower than before)
      const commentThreshold = 45;

      if (hasDetector) {
        const metadata = {
          title: postText.substring(0, 100),
          description: postText,
          channelName: extractSubreddit(post)
        };
        const slopScore = detector.analyzeSlopScore(metadata);
        
        if (isComment) {
          // Comments: use fade mode
          if (detector.shouldBlock(slopScore, commentThreshold)) {
            return { action: 'fade', reason: `ai-comment-${slopScore}`, score: slopScore };
          }
        } else {
          // Posts: block normally
          if (detector.shouldBlock(slopScore, threshold)) {
            return { action: 'block', reason: `brainrot-${slopScore}`, score: slopScore };
          }
        }
      }
      
      // Check Reddit-specific patterns
      if (isBrainrotPost(postText)) {
        return isComment
          ? { action: 'fade', reason: 'reddit-brainrot', score: 60 }
          : { action: 'block', reason: 'reddit-brainrot', score: 60 };
      }
      
      // Check low-effort posts
      if (!isComment && isLowEffortPost(postText)) {
        return { action: 'fade', reason: 'low-effort', score: 55 };
      }

      return { action: 'none' };
    } catch (error) {
      logError(PLATFORM, 'Error analyzing post', error);
      return { action: 'none' };
    }
  }

  // Check if post is a comment
  function isCommentPost(post) {
    const commentSelectors = [
      '[data-testid="comment"]',
      'shreddit-comment',
      '.Comment'
    ];
    
    for (const selector of commentSelectors) {
      if (post.matches?.(selector) || post.querySelector(selector)) {
        return true;
      }
    }
    
    // Check parent for comment context
    const parent = post.parentElement;
    if (parent) {
      const id = parent.id || '';
      const className = parent.className || '';
      if (id.includes('comment') || className.includes('comment')) {
        return true;
      }
    }
    
    return false;
  }

  // Check for Reddit brainrot patterns
  function isBrainrotPost(text) {
    return REDDIT_BRAINROT_PATTERNS.some(pattern => pattern.test(text));
  }

  // Check for low-effort posts
  function isLowEffortPost(text) {
    return LOW_EFFORT_PATTERNS.some(pattern => pattern.test(text));
  }

  // Extract text from post
  function extractPostText(post) {
    // Try title first
    for (const selector of SELECTORS.postTitle) {
      try {
        const titleEl = post.querySelector(selector);
        if (titleEl) {
          const text = getTextContent(titleEl);
          if (text && text.length > 10) {
            return text;
          }
        }
      } catch (e) {
        continue;
      }
    }
    
    // Try body
    for (const selector of SELECTORS.postBody) {
      try {
        const bodyEl = post.querySelector(selector);
        if (bodyEl) {
          const text = getTextContent(bodyEl);
          if (text && text.length > 20) {
            return text;
          }
        }
      } catch (e) {
        continue;
      }
    }
    
    // Fallback: get all text
    return getTextContent(post);
  }

  // Extract subreddit name
  function extractSubreddit(post) {
    const subredditSelectors = [
      '[data-testid="subreddit-name"]',
      'a[href^="/r/"]',
      'shreddit-subreddit-name'
    ];
    
    for (const selector of subredditSelectors) {
      try {
        const subEl = post.querySelector(selector);
        if (subEl) {
          const text = getTextContent(subEl);
          if (text) return text;
        }
      } catch (e) {
        continue;
      }
    }
    
    return '';
  }

  // Start mutation observer
  function startObserver() {
    const observer = createDebouncedObserver(() => {
      blockedCount = 0;
      fadedCount = 0;
      filterPosts();
    }, 300);

    const target = document.querySelector('[role="main"]') || document.body;
    
    observer.observe(target, {
      childList: true,
      subtree: true
    });

    log(PLATFORM, 'Observer started');
  }

  // Handle URL changes (Reddit is SPA)
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
        setTimeout(filterPosts, 500);
      }
    }).observe(document.body, { childList: true, subtree: true });
  }
  setupUrlChangeObserver();

  // Listen for settings changes
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync' && changes.antiSlop_settings) {
      const newSettings = changes.antiSlop_settings.newValue;
      const wasEnabled = isEnabled;
      
      isEnabled = newSettings?.reddit?.enabled ?? false;
      sensitivity = newSettings?.reddit?.sensitivity || 'medium';
      
      if (wasEnabled !== isEnabled) {
        log(PLATFORM, `Settings changed: ${isEnabled ? 'enabled' : 'disabled'}`);
        if (isEnabled) {
          location.reload();
        }
      } else if (isEnabled) {
        document.querySelectorAll('[data-anti-slop-processed]').forEach(el => {
          el.removeAttribute('data-anti-slop-processed');
        });
        filterPosts();
      }
    }
  });

  // Start when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
