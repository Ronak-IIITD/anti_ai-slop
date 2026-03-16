// YouTube Brainrot Content Filter
// Analyzes and filters low-quality AI-generated/brainrot content from YouTube
// Only blocks slop content, not all Shorts/videos

(async function() {
  'use strict';

  const { log, logError, hideElement, isProcessed, markProcessed, createDebouncedObserver, incrementBlockCounter, isPlatformEnabled, createMediaWarningBadge, incrementMediaWarningCounter } = window.AntiSlopUtils;
  const detector = window.brainrotDetector;
  const mediaDetector = window.aiMediaDetector;
  
  const PLATFORM = 'YouTube';
  let blockedCount = 0;
  let isEnabled = false;
  let sensitivity = 'medium';
  let detectAIMedia = true;
  let mediaSensitivity = 'medium';
  let mediaOcr = false;

  // YouTube video/shorts selectors
  // Updated selectors as of 2026-03-16
  const SELECTORS = {
    // All video types (regular videos, shorts, feed items)
    allVideos: [
      'ytd-video-renderer',
      'ytd-grid-video-renderer',
      'ytd-rich-item-renderer',
      'ytd-compact-video-renderer',
      'ytd-reel-item-renderer', // Shorts
      'ytd-playlist-video-renderer',
      'ytd-reel-shelf-renderer',
      'ytd-short-shelf-renderer',
      '[is-short]',
      'ytd-video-renderer[is-short]',
      'ytm-compact-video-renderer',
      'ytm-rich-item-renderer',
      // 2026 additions
      'ytd-rich-grid-slim-media',
      'ytd-video-preview-renderer',
      'ytls-video-item-renderer'
    ],
    // Shorts shelf (homepage)
    shortsShelf: [
      'ytd-reel-shelf-renderer',
      'ytd-short-shelf-renderer',
      'ytd-rich-section-renderer[is-shorts]',
      // 2026 additions
      'yts-reel-shelf-renderer'
    ],
    // Individual short video
    shortsVideo: [
      'ytd-reel-item-renderer',
      'ytd-shorts-video-renderer',
      'ytd-shorts-container',
      // 2026 additions
      'ytm-shorts-video-in-feed-renderer',
      'yts-shorts-video-renderer'
    ]
  };

  // Initialize filter
  async function init() {
    isEnabled = await isPlatformEnabled('youtube');
    
    if (!isEnabled) {
      log(PLATFORM, 'Disabled in settings');
      return;
    }

    // Get sensitivity setting
    const settings = await storageManager.getSettings();
    sensitivity = settings.youtube?.sensitivity || 'medium';
    detectAIMedia = settings.ui?.detectAIMedia !== false;
    mediaSensitivity = settings.ui?.mediaSensitivity || 'medium';
    mediaOcr = settings.ui?.mediaOcr === true;

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
      const videos = findAllVideos();

      videos.forEach(video => {
        if (!isProcessed(video)) {
          analyzeAndFilterVideo(video);
        }
      });
      
      if (blockedCount > 0) {
        log(PLATFORM, `Filtered ${blockedCount} low-quality videos`);
      }
    } catch (error) {
      logError(PLATFORM, 'Error in filterContent', error);
    }
  }

  // Find all video elements
  function findAllVideos() {
    const videos = [];

    SELECTORS.allVideos.forEach(selector => {
      try {
        const found = document.querySelectorAll(selector);
        found.forEach(video => videos.push(video));
      } catch (e) {
        // Selector might not work on this version
      }
    });

    return Array.from(new Set(videos));
  }

  // Analyze individual video and filter if it's slop
  async function analyzeAndFilterVideo(videoElement) {
    try {
      // Extract metadata from video element
      const metadata = extractVideoMetadata(videoElement);
      
      if (!metadata.title) {
        // Can't analyze without title, skip
        markProcessed(videoElement);
        return;
      }
      
      // Analyze content quality
        if (!detector) {
          markProcessed(videoElement);
          return;
        }

        const slopScore = detector.analyzeSlopScore(metadata);
        const threshold = detector.getSensitivityThreshold(sensitivity);
      
      // Log for debugging
      if (slopScore > 30) {
        log(PLATFORM, `Video "${metadata.title.substring(0, 50)}..." - Score: ${slopScore}/${threshold}`);
      }
      
      if (mediaDetector && detectAIMedia) {
        const mediaResult = mediaOcr
          ? await mediaDetector.analyzeElementAsync(videoElement, metadata, { enableOcr: true })
          : mediaDetector.analyzeElement(videoElement, metadata);
        if (mediaDetector.shouldWarn(mediaResult.score, mediaSensitivity)) {
          if (createMediaWarningBadge(videoElement, mediaResult)) {
            incrementMediaWarningCounter(1);
          }
        }
      }

      // Block if it exceeds threshold
      if (detector.shouldBlock(slopScore, threshold)) {
        hideElement(videoElement, 'brainrot-content');
        markProcessed(videoElement);
        blockedCount++;
        incrementBlockCounter('youtube', 1);
        
        log(PLATFORM, `🚫 Blocked: "${metadata.title.substring(0, 60)}..." (Score: ${slopScore})`);
      } else {
        // Mark as processed but don't hide
        markProcessed(videoElement);
      }
    } catch (error) {
      // On error, just mark as processed and don't block
      markProcessed(videoElement);
      logError(PLATFORM, 'Error analyzing video', error);
    }
  }

  // Extract video metadata from DOM element
  function extractVideoMetadata(element) {
    const metadata = {
      title: '',
      description: '',
      channelName: ''
    };
    
    // Extract title
    const titleElement = element.querySelector('#video-title, h3, a#video-title-link, [id*="title"]');
    if (titleElement) {
      metadata.title = titleElement.textContent?.trim() || 
                      titleElement.getAttribute('title') || 
                      titleElement.getAttribute('aria-label') || '';
    }
    
    // Extract description/snippet (if available)
    const descElement = element.querySelector('#description-text, .metadata-snippet-text, [id*="description"]');
    if (descElement) {
      metadata.description = descElement.textContent?.trim() || '';
    }
    
    // Extract channel name
    const channelElement = element.querySelector('#channel-name, ytd-channel-name, [class*="channel"]');
    if (channelElement) {
      metadata.channelName = channelElement.textContent?.trim() || '';
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

    const { observer, start } = createDebouncedObserver(() => {
      blockedCount = 0; // Reset for this batch
      filterContent();
    }, 300);

    start(document.body);

    log(PLATFORM, 'Observer started');
  }

  // Handle URL changes (YouTube is SPA)
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
        setTimeout(filterContent, 500); // Small delay for content to load
      }
    }).observe(document.body, { childList: true, subtree: true });
  }
  setupUrlChangeObserver();

  // Listen for settings changes
  chrome.storage.onChanged.addListener(async (changes, namespace) => {
    if (namespace === 'sync' && changes.antiSlop_settings) {
      const newSettings = changes.antiSlop_settings.newValue;
      const wasEnabled = isEnabled;
      isEnabled = newSettings?.youtube?.enabled ?? false;
      sensitivity = newSettings?.youtube?.sensitivity || 'medium';
      detectAIMedia = newSettings?.ui?.detectAIMedia !== false;
      mediaSensitivity = newSettings?.ui?.mediaSensitivity || 'medium';
      mediaOcr = newSettings?.ui?.mediaOcr === true;
      
      if (wasEnabled !== isEnabled) {
        log(PLATFORM, `Settings changed: ${isEnabled ? 'enabled' : 'disabled'}`);
        if (isEnabled) {
          location.reload(); // Reload to apply filtering
        }
      } else if (isEnabled) {
        log(PLATFORM, `Sensitivity changed to: ${sensitivity}`);
        location.reload(); // Reload to re-analyze with new threshold
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
