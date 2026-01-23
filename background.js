// Background Service Worker for Anti-Slop Extension
// Handles initialization, messaging, and statistics tracking

// Initialize extension on install
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[Anti-Slop] Extension installed/updated');
  
  if (details.reason === 'install') {
    // First install - set up defaults
    await initializeDefaults();
    
    // Open welcome page (optional)
    // chrome.tabs.create({ url: 'popup/popup.html' });
  } else if (details.reason === 'update') {
    console.log('[Anti-Slop] Extension updated to', chrome.runtime.getManifest().version);
  }
});

// Initialize default settings
async function initializeDefaults() {
  const DEFAULT_SETTINGS = {
    youtube: {
      enabled: true,
      sensitivity: 'medium'
    },
    instagram: {
      enabled: true,
      sensitivity: 'medium'
    },
    twitter: {
      enabled: true,
      minChars: 100,
      blockClickbait: true
    },
    tiktok: {
      enabled: true,
      blockFeed: true
    },
    aiDetector: {
      enabled: true,
      threshold: 60,
      sensitivity: 'medium',
      whitelist: []
    }
  };

  const DEFAULT_STATS = {
    totalBlocked: 0,
    estimatedTimeSaved: 0,
    blockedByPlatform: {
      youtube: 0,
      twitter: 0,
      instagram: 0,
      tiktok: 0,
      aiArticles: 0
    },
    lastReset: new Date().toISOString()
  };

  // Check if settings already exist
  const result = await chrome.storage.sync.get(['antiSlop_settings', 'antiSlop_stats']);
  
  if (!result.antiSlop_settings) {
    await chrome.storage.sync.set({ antiSlop_settings: DEFAULT_SETTINGS });
    console.log('[Anti-Slop] Default settings initialized');
  }
  
  if (!result.antiSlop_stats) {
    await chrome.storage.sync.set({ antiSlop_stats: DEFAULT_STATS });
    console.log('[Anti-Slop] Statistics initialized');
  }
  
  // Initialize badge
  updateBadge(0);
}

// Update badge with blocked count
function updateBadge(count) {
  const displayCount = count > 999 ? '999+' : count.toString();
  chrome.action.setBadgeText({ text: displayCount });
  chrome.action.setBadgeBackgroundColor({ color: '#FF4444' });
}

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'updateStats') {
    handleStatsUpdate(request.data).then(sendResponse);
    return true; // Keep channel open for async response
  }
  
  if (request.action === 'getSettings') {
    getSettings().then(sendResponse);
    return true;
  }
  
  if (request.action === 'getStats') {
    getStats().then(sendResponse);
    return true;
  }
});

// Handle statistics updates
async function handleStatsUpdate(data) {
  try {
    const result = await chrome.storage.sync.get(['antiSlop_stats']);
    const stats = result.antiSlop_stats || {
      totalBlocked: 0,
      estimatedTimeSaved: 0,
      blockedByPlatform: {
        youtube: 0,
        twitter: 0,
        instagram: 0,
        tiktok: 0,
        aiArticles: 0
      }
    };
    
    // Update stats
    stats.totalBlocked = (stats.totalBlocked || 0) + (data.count || 1);
    
    if (data.platform && stats.blockedByPlatform[data.platform] !== undefined) {
      stats.blockedByPlatform[data.platform] += (data.count || 1);
    }
    
    // Update time saved estimate
    const timeSaved = calculateTimeSaved(data.platform, data.count || 1);
    stats.estimatedTimeSaved = (stats.estimatedTimeSaved || 0) + timeSaved;
    
    // Save updated stats
    await chrome.storage.sync.set({ antiSlop_stats: stats });
    
    // Update badge
    updateBadge(stats.totalBlocked);
    
    return { success: true, stats };
  } catch (error) {
    console.error('[Anti-Slop] Error updating stats:', error);
    return { success: false, error: error.message };
  }
}

// Calculate estimated time saved
function calculateTimeSaved(platform, count) {
  const timePerItem = {
    youtube: 1,      // 1 minute per Short
    instagram: 1,    // 1 minute per Reel
    twitter: 0.5,    // 30 seconds per post
    tiktok: 1,       // 1 minute per video
    aiArticles: 3    // 3 minutes per article
  };
  
  return (timePerItem[platform] || 1) * count;
}

// Get settings
async function getSettings() {
  const result = await chrome.storage.sync.get(['antiSlop_settings']);
  return result.antiSlop_settings;
}

// Get statistics
async function getStats() {
  const result = await chrome.storage.sync.get(['antiSlop_stats']);
  return result.antiSlop_stats;
}

// Keep service worker alive
chrome.runtime.onStartup.addListener(() => {
  console.log('[Anti-Slop] Browser started, service worker active');
});

// Log when service worker suspends
self.addEventListener('suspend', () => {
  console.log('[Anti-Slop] Service worker suspending...');
});

console.log('[Anti-Slop] Background service worker loaded');
