// Instagram Brainrot Content Filter
// Analyzes and filters low-quality AI-generated/brainrot content from Instagram
// Only blocks slop content, not all Reels/posts

(async function() {
  'use strict';

  const { log, logError, hideElement, isProcessed, markProcessed, createDebouncedObserver, incrementBlockCounter, isPlatformEnabled } = window.AntiSlopUtils;
  const detector = window.brainrotDetector;
  
  const PLATFORM = 'Instagram';
  let blockedCount = 0;
  let isEnabled = false;
  let sensitivity = 'medium';

  // Instagram content selectors
  const SELECTORS = {
    // Posts and Reels in feed
    posts: [
      'article',
      'div[role="button"]',
      '[class*="x1lliihq"]' // Instagram uses obfuscated class names
    ]
  };

  // Initialize filter
  async function init() {
    isEnabled = await isPlatformEnabled('instagram');
    
    if (!isEnabled) {
      log(PLATFORM, 'Disabled in settings');
      return;
    }

    // Get sensitivity setting
    const settings = await storageManager.getSettings();
    sensitivity = settings.instagram?.sensitivity || 'medium';

    log(PLATFORM, `Initializing content filter (sensitivity: ${sensitivity})...`);
    
    // Initial sweep
    filterContent();
    
    // Watch for dynamic content
    startObserver();
    
    log(PLATFORM, 'Content filter initialized successfully');
  }

  // Main filtering function
  function filterContent() {
    try {
      // Find all posts/reels
      const articles = document.querySelectorAll('article');
      
      articles.forEach(article => {
        if (!isProcessed(article)) {
          analyzeAndFilterPost(article);
        }
      });
      
      if (blockedCount > 0) {
        log(PLATFORM, `Filtered ${blockedCount} low-quality posts/reels`);
      }
    } catch (error) {
      logError(PLATFORM, 'Error in filterContent', error);
    }
  }

  // Analyze individual post/reel and filter if it's slop
  function analyzeAndFilterPost(postElement) {
    try {
      // Extract metadata from post element
      const metadata = extractPostMetadata(postElement);
      
      if (!metadata.title && !metadata.description) {
        // Can't analyze without any text content, skip
        markProcessed(postElement);
        return;
      }
      
      // Analyze content quality
      const slopScore = detector.analyzeSlopScore(metadata);
      const threshold = detector.getSensitivityThreshold(sensitivity);
      
      // Log for debugging
      if (slopScore > 30) {
        const preview = (metadata.title || metadata.description).substring(0, 50);
        log(PLATFORM, `Post "${preview}..." - Score: ${slopScore}/${threshold}`);
      }
      
      // Block if it exceeds threshold
      if (detector.shouldBlock(slopScore, threshold)) {
        hideElement(postElement, 'brainrot-content');
        markProcessed(postElement);
        blockedCount++;
        incrementBlockCounter('instagram', 1);
        
        const preview = (metadata.title || metadata.description).substring(0, 60);
        log(PLATFORM, `🚫 Blocked: "${preview}..." (Score: ${slopScore})`);
      } else {
        // Mark as processed but don't hide
        markProcessed(postElement);
      }
    } catch (error) {
      // On error, just mark as processed and don't block
      markProcessed(postElement);
      logError(PLATFORM, 'Error analyzing post', error);
    }
  }

  // Extract post metadata from DOM element
  function extractPostMetadata(element) {
    const metadata = {
      title: '',
      description: '',
      channelName: ''
    };
    
    // Instagram doesn't have clear "titles", but captions are like descriptions
    // Try to find caption/description text
    const captionSelectors = [
      'h1',
      'span[dir="auto"]',
      '[class*="caption"]',
      'div[role="button"] span'
    ];
    
    for (const selector of captionSelectors) {
      const captionElements = element.querySelectorAll(selector);
      for (const el of captionElements) {
        const text = el.textContent?.trim() || '';
        if (text && text.length > 10) {
          metadata.description = text;
          metadata.title = text; // Use caption as both title and description
          break;
        }
      }
      if (metadata.description) break;
    }
    
    // Extract username/channel
    const usernameSelectors = [
      'a[href*="/"]',
      '[class*="username"]'
    ];
    
    for (const selector of usernameSelectors) {
      const usernameEl = element.querySelector(selector);
      if (usernameEl) {
        const username = usernameEl.textContent?.trim() || '';
        if (username && username.length > 0 && username.length < 50) {
          metadata.channelName = username;
          break;
        }
      }
    }
    
    return metadata;
  }

  // Start mutation observer
  function startObserver() {
    // Make sure document.body exists
    if (!document.body) {
      log(PLATFORM, 'document.body not ready, waiting...');
      setTimeout(startObserver, 100);
      return;
    }

    const observer = createDebouncedObserver(() => {
      blockedCount = 0;
      filterContent();
    }, 300);

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    log(PLATFORM, 'Observer started');
  }

  // Handle URL changes (Instagram is SPA)
  let lastUrl = location.href;
  function setupUrlChangeObserver() {
    // Make sure document.body exists
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
        setTimeout(filterContent, 500);
      }
    }).observe(document.body, { childList: true, subtree: true });
  }
  setupUrlChangeObserver();

  // Listen for settings changes
  chrome.storage.onChanged.addListener(async (changes, namespace) => {
    if (namespace === 'sync' && changes.antiSlop_settings) {
      const newSettings = changes.antiSlop_settings.newValue;
      const wasEnabled = isEnabled;
      isEnabled = newSettings?.instagram?.enabled ?? false;
      sensitivity = newSettings?.instagram?.sensitivity || 'medium';
      
      if (wasEnabled !== isEnabled) {
        log(PLATFORM, `Settings changed: ${isEnabled ? 'enabled' : 'disabled'}`);
        if (isEnabled) {
          location.reload();
        }
      } else if (isEnabled) {
        log(PLATFORM, `Sensitivity changed to: ${sensitivity}`);
        location.reload();
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
