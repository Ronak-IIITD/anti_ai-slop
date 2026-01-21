// YouTube Shorts Blocker
// Hides YouTube Shorts from homepage, subscriptions, search, and navigation

(async function() {
  'use strict';

  const { log, logError, hideElement, isProcessed, markProcessed, createDebouncedObserver, incrementBlockCounter, isPlatformEnabled } = window.AntiSlopUtils;
  
  const PLATFORM = 'YouTube';
  let blockedCount = 0;
  let isEnabled = false;

  // YouTube Shorts selectors (as of 2026 - may need updates)
  const SELECTORS = {
    // Shorts shelf on homepage
    shortsShelf: 'ytd-reel-shelf-renderer',
    
    // Individual short videos in feeds
    shortsVideo: [
      'ytd-reel-item-renderer',
      'ytd-video-renderer[is-shorts]',
      'ytd-grid-video-renderer[is-shorts]',
      'ytd-rich-item-renderer:has([overlay-style="SHORTS"])',
      'a[href*="/shorts/"]'
    ],
    
    // Shorts button in navigation
    shortsButton: [
      'ytd-guide-entry-renderer:has(a[href="/shorts"])',
      'ytd-mini-guide-entry-renderer:has(a[href="/shorts"])',
      '[title="Shorts"]',
      'a[href="/shorts"]'
    ],
    
    // Shorts in search results
    searchShorts: 'ytd-video-renderer:has(a[href*="/shorts/"])',
    
    // Shorts tab on channel pages
    shortsTab: 'yt-tab-shape:has([tab-title="Shorts"])'
  };

  // Initialize blocker
  async function init() {
    isEnabled = await isPlatformEnabled('youtube');
    
    if (!isEnabled) {
      log(PLATFORM, 'Disabled in settings');
      return;
    }

    log(PLATFORM, 'Initializing...');
    
    // Initial sweep
    blockShorts();
    
    // Watch for dynamic content
    startObserver();
    
    log(PLATFORM, 'Initialized successfully');
  }

  // Main blocking function
  function blockShorts() {
    try {
      // Block Shorts shelf
      blockShortsShelf();
      
      // Block individual Shorts videos
      blockShortsVideos();
      
      // Block Shorts navigation button
      blockShortsButton();
      
      // Block Shorts in search
      blockSearchShorts();
      
      // Block Shorts tab on channels
      blockShortsTab();
      
      if (blockedCount > 0) {
        log(PLATFORM, `Blocked ${blockedCount} Shorts`);
      }
    } catch (error) {
      logError(PLATFORM, 'Error in blockShorts', error);
    }
  }

  // Block Shorts shelf on homepage
  function blockShortsShelf() {
    const shelves = document.querySelectorAll(SELECTORS.shortsShelf);
    
    shelves.forEach(shelf => {
      if (!isProcessed(shelf)) {
        hideElement(shelf, 'shorts-shelf');
        markProcessed(shelf);
        blockedCount++;
        incrementBlockCounter('youtube', 1);
      }
    });
  }

  // Block individual Shorts videos in feeds
  function blockShortsVideos() {
    SELECTORS.shortsVideo.forEach(selector => {
      try {
        const videos = document.querySelectorAll(selector);
        
        videos.forEach(video => {
          if (!isProcessed(video)) {
            // Find the parent container for cleaner removal
            const container = findVideoContainer(video);
            hideElement(container || video, 'shorts-video');
            markProcessed(video);
            blockedCount++;
            incrementBlockCounter('youtube', 1);
          }
        });
      } catch (e) {
        // Selector might not be valid on this page
      }
    });
  }

  // Block Shorts button in sidebar
  function blockShortsButton() {
    SELECTORS.shortsButton.forEach(selector => {
      try {
        const buttons = document.querySelectorAll(selector);
        
        buttons.forEach(button => {
          if (!isProcessed(button)) {
            hideElement(button, 'shorts-button');
            markProcessed(button);
          }
        });
      } catch (e) {
        // Selector might not be valid
      }
    });
  }

  // Block Shorts in search results
  function blockSearchShorts() {
    try {
      const searchShorts = document.querySelectorAll(SELECTORS.searchShorts);
      
      searchShorts.forEach(short => {
        if (!isProcessed(short)) {
          hideElement(short, 'search-short');
          markProcessed(short);
          blockedCount++;
          incrementBlockCounter('youtube', 1);
        }
      });
    } catch (e) {
      // Not on search page
    }
  }

  // Block Shorts tab on channel pages
  function blockShortsTab() {
    try {
      const tabs = document.querySelectorAll(SELECTORS.shortsTab);
      
      tabs.forEach(tab => {
        if (!isProcessed(tab)) {
          hideElement(tab, 'shorts-tab');
          markProcessed(tab);
        }
      });
    } catch (e) {
      // Not on channel page
    }
  }

  // Find appropriate container to hide
  function findVideoContainer(element) {
    let current = element;
    const maxDepth = 5;
    let depth = 0;
    
    while (current && depth < maxDepth) {
      // Look for common container types
      if (
        current.tagName === 'YTD-RICH-ITEM-RENDERER' ||
        current.tagName === 'YTD-GRID-VIDEO-RENDERER' ||
        current.tagName === 'YTD-VIDEO-RENDERER' ||
        current.tagName === 'YTD-COMPACT-VIDEO-RENDERER'
      ) {
        return current;
      }
      
      current = current.parentElement;
      depth++;
    }
    
    return element;
  }

  // Start mutation observer
  function startObserver() {
    const observer = createDebouncedObserver(() => {
      blockedCount = 0; // Reset for this batch
      blockShorts();
    }, 300);

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    log(PLATFORM, 'Observer started');
  }

  // Handle URL changes (YouTube is SPA)
  let lastUrl = location.href;
  new MutationObserver(() => {
    const currentUrl = location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      log(PLATFORM, 'URL changed, re-scanning...');
      blockedCount = 0;
      setTimeout(blockShorts, 500); // Small delay for content to load
    }
  }).observe(document.body, { childList: true, subtree: true });

  // Listen for settings changes
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync' && changes.antiSlop_settings) {
      const newSettings = changes.antiSlop_settings.newValue;
      const wasEnabled = isEnabled;
      isEnabled = newSettings?.youtube?.enabled ?? false;
      
      if (wasEnabled !== isEnabled) {
        log(PLATFORM, `Settings changed: ${isEnabled ? 'enabled' : 'disabled'}`);
        if (isEnabled) {
          location.reload(); // Reload to apply blocking
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
