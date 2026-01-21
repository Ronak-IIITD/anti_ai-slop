// Instagram Reels Blocker
// Hides Instagram Reels from feed, explore, and navigation

(async function() {
  'use strict';

  const { log, logError, hideElement, isProcessed, markProcessed, createDebouncedObserver, incrementBlockCounter, isPlatformEnabled } = window.AntiSlopUtils;
  
  const PLATFORM = 'Instagram';
  let blockedCount = 0;
  let isEnabled = false;

  // Instagram selectors (web version)
  const SELECTORS = {
    // Reels tab in navigation
    reelsTab: [
      'a[href*="/reels/"]',
      'a[href="/reels"]',
      '[href="#reels"]'
    ],
    
    // Reels in feed and explore
    reelsVideo: [
      'article:has(a[href*="/reel/"])',
      'div[role="button"]:has(a[href*="/reel/"])',
      'a[href*="/reel/"]'
    ],
    
    // Reels icon/button
    reelsButton: 'svg[aria-label*="Reels"], [aria-label*="Reels"]'
  };

  // Initialize blocker
  async function init() {
    isEnabled = await isPlatformEnabled('instagram');
    
    if (!isEnabled) {
      log(PLATFORM, 'Disabled in settings');
      return;
    }

    log(PLATFORM, 'Initializing...');
    
    // Initial sweep
    blockReels();
    
    // Watch for dynamic content
    startObserver();
    
    log(PLATFORM, 'Initialized successfully');
  }

  // Main blocking function
  function blockReels() {
    try {
      // Block Reels tab
      blockReelsTab();
      
      // Block Reels in feed
      blockReelsInFeed();
      
      if (blockedCount > 0) {
        log(PLATFORM, `Blocked ${blockedCount} Reels`);
      }
    } catch (error) {
      logError(PLATFORM, 'Error in blockReels', error);
    }
  }

  // Block Reels tab in navigation
  function blockReelsTab() {
    SELECTORS.reelsTab.forEach(selector => {
      try {
        const tabs = document.querySelectorAll(selector);
        
        tabs.forEach(tab => {
          if (!isProcessed(tab)) {
            // Hide the parent nav item
            const navItem = tab.closest('div[role="menuitem"]') || 
                          tab.closest('li') || 
                          tab.closest('a');
            hideElement(navItem || tab, 'reels-tab');
            markProcessed(tab);
          }
        });
      } catch (e) {
        // Selector might not be valid
      }
    });
  }

  // Block Reels videos in feed and explore
  function blockReelsInFeed() {
    SELECTORS.reelsVideo.forEach(selector => {
      try {
        const reels = document.querySelectorAll(selector);
        
        reels.forEach(reel => {
          if (!isProcessed(reel)) {
            // Find the article or appropriate container
            const container = reel.closest('article') || 
                            reel.closest('div[role="button"]') ||
                            reel;
            
            hideElement(container, 'reels-video');
            markProcessed(reel);
            blockedCount++;
            incrementBlockCounter('instagram', 1);
          }
        });
      } catch (e) {
        // Selector might not work
      }
    });
  }

  // Start mutation observer
  function startObserver() {
    const observer = createDebouncedObserver(() => {
      blockedCount = 0;
      blockReels();
    }, 300);

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    log(PLATFORM, 'Observer started');
  }

  // Handle URL changes (Instagram is SPA)
  let lastUrl = location.href;
  new MutationObserver(() => {
    const currentUrl = location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      log(PLATFORM, 'URL changed, re-scanning...');
      blockedCount = 0;
      setTimeout(blockReels, 500);
    }
  }).observe(document.body, { childList: true, subtree: true });

  // Listen for settings changes
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync' && changes.antiSlop_settings) {
      const newSettings = changes.antiSlop_settings.newValue;
      const wasEnabled = isEnabled;
      isEnabled = newSettings?.instagram?.enabled ?? false;
      
      if (wasEnabled !== isEnabled) {
        log(PLATFORM, `Settings changed: ${isEnabled ? 'enabled' : 'disabled'}`);
        if (isEnabled) {
          location.reload();
        }
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
