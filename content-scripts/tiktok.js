// TikTok Web Blocker
// Blocks TikTok feed and recommended content (for international users)
// Note: Developed without testing due to India ban - community contributions welcome

(async function() {
  'use strict';

  const { log, logError, hideElement, isProcessed, markProcessed, createDebouncedObserver, incrementBlockCounter, isPlatformEnabled } = window.AntiSlopUtils;
  
  const PLATFORM = 'TikTok';
  let blockedCount = 0;
  let isEnabled = false;

  // TikTok selectors (based on web structure - may need community updates)
  const SELECTORS = {
    // For You feed videos
    feedVideo: [
      'div[data-e2e="recommend-list-item-container"]',
      'div[class*="DivItemContainer"]',
      '[class*="video-feed"]'
    ],
    
    // Following feed
    followingFeed: 'div[data-e2e="following-item-container"]',
    
    // Main feed container
    feedContainer: [
      'div[data-e2e="recommend-list"]',
      'div[class*="DivContainer"]'
    ]
  };

  // Initialize blocker
  async function init() {
    isEnabled = await isPlatformEnabled('tiktok');
    
    if (!isEnabled) {
      log(PLATFORM, 'Disabled in settings');
      return;
    }

    log(PLATFORM, 'Initializing... (Note: TikTok blocker is community-maintained)');
    
    // Check if we should block the entire feed
    const settings = await storageManager.getSettings();
    const blockFeed = settings.tiktok?.blockFeed ?? true;
    
    if (blockFeed) {
      blockEntireFeed();
    } else {
      // Block individual videos
      blockVideos();
      startObserver();
    }
    
    log(PLATFORM, 'Initialized successfully');
  }

  // Block entire TikTok feed (nuclear option)
  function blockEntireFeed() {
    SELECTORS.feedContainer.forEach(selector => {
      try {
        const containers = document.querySelectorAll(selector);
        
        containers.forEach(container => {
          if (!isProcessed(container)) {
            hideElement(container, 'feed-blocked');
            markProcessed(container);
            
            // Show message to user
            showBlockedMessage(container);
          }
        });
      } catch (e) {
        // Selector might not work
      }
    });
    
    log(PLATFORM, 'Entire feed blocked');
  }

  // Block individual videos
  function blockVideos() {
    try {
      SELECTORS.feedVideo.forEach(selector => {
        try {
          const videos = document.querySelectorAll(selector);
          
          videos.forEach(video => {
            if (!isProcessed(video)) {
              hideElement(video, 'video-blocked');
              markProcessed(video);
              blockedCount++;
              incrementBlockCounter('tiktok', 1);
            }
          });
        } catch (e) {
          // Selector might not work
        }
      });
      
      if (blockedCount > 0) {
        log(PLATFORM, `Blocked ${blockedCount} videos`);
      }
    } catch (error) {
      logError(PLATFORM, 'Error in blockVideos', error);
    }
  }

  // Show message when feed is blocked
  function showBlockedMessage(container) {
    const message = document.createElement('div');
    message.className = 'anti-slop-tiktok-message';
    message.innerHTML = `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100vh;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        text-align: center;
        padding: 40px;
      ">
        <h1 style="font-size: 48px; margin-bottom: 20px; font-weight: 700;">Anti-Slop Enabled</h1>
        <p style="font-size: 20px; max-width: 600px; line-height: 1.6; margin-bottom: 30px;">
          TikTok's "For You" feed has been blocked to protect your time and focus.
        </p>
        <p style="font-size: 16px; opacity: 0.9;">
          To disable this, open the Anti-Slop extension settings
        </p>
      </div>
    `;
    
    container.parentNode.insertBefore(message, container);
  }

  // Start mutation observer
  function startObserver() {
    const observer = createDebouncedObserver(() => {
      blockedCount = 0;
      blockVideos();
    }, 300);

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    log(PLATFORM, 'Observer started');
  }

  // Listen for settings changes
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync' && changes.antiSlop_settings) {
      const newSettings = changes.antiSlop_settings.newValue;
      const wasEnabled = isEnabled;
      isEnabled = newSettings?.tiktok?.enabled ?? false;
      
      if (wasEnabled !== isEnabled) {
        log(PLATFORM, `Settings changed: ${isEnabled ? 'enabled' : 'disabled'}`);
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
