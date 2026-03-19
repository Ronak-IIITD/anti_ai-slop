// Background Service Worker for Anti-Slop Extension v2
// Handles initialization, messaging, statistics, and icon status updates

// ============================================================
// INSTALLATION & STARTUP
// ============================================================

chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[Anti-Slop] Extension installed/updated');
  
  if (details.reason === 'install') {
    await initializeDefaults();
  } else if (details.reason === 'update') {
    console.log('[Anti-Slop] Updated to', chrome.runtime.getManifest().version);
    // Migrate settings for existing users
    await migrateSettings();
  }
});

// Initialize default settings
async function initializeDefaults() {
  const DEFAULT_SETTINGS = {
    youtube: { enabled: true, sensitivity: 'medium' },
    instagram: { enabled: true, sensitivity: 'medium' },
    twitter: { enabled: true, sensitivity: 'medium', blockBrainrot: true, blockClickbait: true },
    reddit: { enabled: true, sensitivity: 'medium' },
    google: { enabled: true, sensitivity: 'medium', hideAIOverview: true, filterContentFarms: true },
    linkedin: { enabled: true, sensitivity: 'medium' },
    tiktok: { enabled: true, blockFeed: true },
    facebook: { enabled: true, sensitivity: 'medium' },
    bluesky: { enabled: true, sensitivity: 'medium' },
    threads: { enabled: true, sensitivity: 'medium' },
    aiDetector: { enabled: true, threshold: 65, sensitivity: 'medium', mode: 'warn' },
    ui: { showPlaceholders: true, focusMode: false, detectAIMedia: true, mediaSensitivity: 'medium' }
  };

  const DEFAULT_STATS = {
    totalBlocked: 0,
    estimatedTimeSaved: 0,
    blockedByPlatform: {
      youtube: 0,
      twitter: 0,
      reddit: 0,
      google: 0,
      linkedin: 0,
      instagram: 0,
      tiktok: 0,
      facebook: 0,
      bluesky: 0,
      threads: 0,
      aiArticles: 0
    },
    aiMediaWarnings: 0,
    lastReset: new Date().toISOString()
  };

  const result = await chrome.storage.sync.get(['antiSlop_settings', 'antiSlop_stats']);
  
  if (!result.antiSlop_settings) {
    await chrome.storage.sync.set({ antiSlop_settings: DEFAULT_SETTINGS });
    console.log('[Anti-Slop] Default settings initialized');
  }
  
  if (!result.antiSlop_stats) {
    await chrome.storage.sync.set({ antiSlop_stats: DEFAULT_STATS });
    console.log('[Anti-Slop] Statistics initialized');
  }
  
  updateBadge(0);
}

// Migrate settings for users updating from older versions
async function migrateSettings() {
  try {
    const result = await chrome.storage.sync.get(['antiSlop_settings']);
    const settings = result.antiSlop_settings;
    if (!settings) return;

    let changed = false;

    // Add mode field if missing (v1.0 -> v1.1)
    if (!settings.aiDetector?.mode) {
      settings.aiDetector = settings.aiDetector || {};
      settings.aiDetector.mode = 'warn';
      changed = true;
    }

    if (!settings.ui) {
      settings.ui = { showPlaceholders: true };
      changed = true;
    } else if (typeof settings.ui.showPlaceholders !== 'boolean') {
      settings.ui.showPlaceholders = true;
      changed = true;
    }

    if (typeof settings.ui.focusMode !== 'boolean') {
      settings.ui.focusMode = false;
      changed = true;
    }

    if (typeof settings.ui.detectAIMedia !== 'boolean') {
      settings.ui.detectAIMedia = true;
      changed = true;
    }

    if (!settings.ui.mediaSensitivity) {
      settings.ui.mediaSensitivity = 'medium';
      changed = true;
    }

    const platformDefaults = ['facebook', 'bluesky', 'threads'];
    platformDefaults.forEach(platform => {
      if (!settings[platform]) {
        settings[platform] = { enabled: true, sensitivity: 'medium' };
        changed = true;
      }
    });

    if (settings.twitter) {
      if (!settings.twitter.sensitivity) {
        settings.twitter.sensitivity = 'medium';
        changed = true;
      }
      if (typeof settings.twitter.blockBrainrot !== 'boolean') {
        settings.twitter.blockBrainrot = true;
        changed = true;
      }
      if (typeof settings.twitter.blockClickbait !== 'boolean') {
        settings.twitter.blockClickbait = true;
        changed = true;
      }
      if (typeof settings.twitter.minChars !== 'undefined') {
        delete settings.twitter.minChars;
        changed = true;
      }
    }

    // Update default threshold from 60 to 65
    if (settings.aiDetector && settings.aiDetector.threshold === 60) {
      settings.aiDetector.threshold = 65;
      changed = true;
    }

    // Migrate mode from 'block' to 'warn' for v4 UX upgrade
    if (settings.aiDetector && settings.aiDetector.mode === 'block' && !settings.aiDetector._v4Migrated) {
      settings.aiDetector.mode = 'warn';
      settings.aiDetector._v4Migrated = true;
      changed = true;
      console.log('[Anti-Slop] Migrated AI detector mode from block to warn (v4 UX upgrade)');
    }

    if (changed) {
      await chrome.storage.sync.set({ antiSlop_settings: settings });
      console.log('[Anti-Slop] Settings migrated');
    }
  } catch (error) {
    console.error('[Anti-Slop] Migration error:', error);
  }
}

// ============================================================
// BADGE / ICON
// ============================================================

function updateBadge(count) {
  const displayCount = count > 999 ? '999+' : count.toString();
  chrome.action.setBadgeText({ text: displayCount });
  chrome.action.setBadgeBackgroundColor({ color: '#FF4444' });
}

/**
 * Update icon badge color for a specific tab based on AI detector status
 * @param {number} tabId - Tab ID
 * @param {string} status - 'clean', 'warned', 'blocked', 'whitelisted', 'disabled', 'error'
 */
function updateTabIconStatus(tabId, status) {
  const colors = {
    clean: '#28a745',      // Green - page is clean
    warned: '#ff9800',     // Orange - warning shown
    blocked: '#dc3545',    // Red - page blocked
    whitelisted: '#6c757d', // Grey - site whitelisted
    disabled: '#6c757d',   // Grey - detector disabled
    error: '#6c757d'       // Grey - error occurred
  };

  const badges = {
    clean: '',           // No badge text for clean pages
    warned: '!',         // Warning indicator
    blocked: 'X',        // Blocked indicator
    whitelisted: '',     // No badge for whitelisted
    disabled: '',        // No badge for disabled
    error: ''            // No badge for errors
  };

  const color = colors[status] || '#FF4444';
  const text = badges[status] || '';
  
  try {
    chrome.action.setBadgeBackgroundColor({ color });
    if (text) {
      chrome.action.setBadgeText({ text, tabId });
    }
  } catch (err) {
    // Tab may have closed
  }
}

// ============================================================
// MESSAGE HANDLING
// ============================================================

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const tabId = sender.tab?.id;

  switch (request.action) {
    case 'updateStats':
      handleStatsUpdate(request.data).then(sendResponse);
      return true;

    case 'getSettings':
      getSettings().then(sendResponse);
      return true;

    case 'getStats':
      getStats().then(sendResponse);
      return true;

    case 'aiDetectorStatus':
      // Update icon for this tab based on AI detector result
      if (tabId && request.data?.status) {
        updateTabIconStatus(tabId, request.data.status);
      }
      sendResponse({ received: true });
      return false;

    case 'addToWhitelist':
      handleAddToWhitelist(request.data?.domain).then(sendResponse);
      return true;

    case 'removeFromWhitelist':
      handleRemoveFromWhitelist(request.data?.domain).then(sendResponse);
      return true;

    case 'getWhitelist':
      getWhitelist().then(sendResponse);
      return true;

    case 'getSessionStats':
      getSessionStats().then(sendResponse);
      return true;

    case 'recordBlocked':
      if (tabId) {
        recordBlockedContent(tabId);
      }
      sendResponse({ received: true });
      return false;

    default:
      return false;
  }
});

// ============================================================
// STATS HANDLERS
// ============================================================

async function handleStatsUpdate(data) {
  try {
    const result = await chrome.storage.sync.get(['antiSlop_stats']);
    const stats = result.antiSlop_stats || {
      totalBlocked: 0,
      estimatedTimeSaved: 0,
      blockedByPlatform: {
        youtube: 0,
        twitter: 0,
        reddit: 0,
        google: 0,
        linkedin: 0,
        instagram: 0,
        tiktok: 0,
        facebook: 0,
        bluesky: 0,
        threads: 0,
        aiArticles: 0
      },
      aiMediaWarnings: 0
    };
    
    stats.totalBlocked = (stats.totalBlocked || 0) + (data.count || 1);
    
    if (data.platform && stats.blockedByPlatform[data.platform] !== undefined) {
      stats.blockedByPlatform[data.platform] += (data.count || 1);
    }
    
    const timeSaved = calculateTimeSaved(data.platform, data.count || 1);
    stats.estimatedTimeSaved = (stats.estimatedTimeSaved || 0) + timeSaved;
    
    await chrome.storage.sync.set({ antiSlop_stats: stats });
    updateBadge(stats.totalBlocked);
    
    return { success: true, stats };
  } catch (error) {
    console.error('[Anti-Slop] Error updating stats:', error);
    return { success: false, error: error.message };
  }
}

function calculateTimeSaved(platform, count) {
  const timePerItem = {
    youtube: 1,
    instagram: 1,
    twitter: 0.5,
    reddit: 0.5,
    google: 0.3,
    linkedin: 0.5,
    tiktok: 1,
    facebook: 0.8,
    bluesky: 0.3,
    threads: 0.3,
    aiArticles: 3
  };
  
  return (timePerItem[platform] || 1) * count;
}

// ============================================================
// SESSION TRACKING
// Track time spent on social media sites
// ============================================================

const SESSION_TRACKED_DOMAINS = [
  'youtube.com', 'instagram.com', 'twitter.com', 'x.com',
  'tiktok.com', 'reddit.com', 'linkedin.com', 'facebook.com',
  'messenger.com', 'bsky.app', 'threads.net'
];

let activeSessions = {}; // { tabId: { domain, startTime, blocked } }

// Persist active sessions to survive service worker restarts
async function saveActiveSessions() {
  try {
    await chrome.storage.local.set({ antiSlop_activeSessions: activeSessions });
  } catch (err) {}
}

async function restoreActiveSessions() {
  try {
    const result = await chrome.storage.local.get(['antiSlop_activeSessions']);
    if (result.antiSlop_activeSessions) {
      activeSessions = result.antiSlop_activeSessions;
    }
  } catch (err) {
    activeSessions = {};
  }
}

// Restore sessions on startup
restoreActiveSessions();

function getDomainFromUrl(url) {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, '');
  } catch (e) {
    return null;
  }
}

function isTrackedDomain(url) {
  const domain = getDomainFromUrl(url);
  if (!domain) return false;
  return SESSION_TRACKED_DOMAINS.some(d => domain.includes(d));
}

// Track tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    if (isTrackedDomain(tab.url)) {
      if (activeSessions[tabId]) {
        closeActiveSession(tabId);
      }
      const domain = getDomainFromUrl(tab.url);
      activeSessions[tabId] = {
        domain,
        startTime: Date.now(),
        blocked: 0
      };
      saveActiveSessions();
      console.log('[Anti-Slop Session] Started tracking:', domain);
    }
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  closeActiveSession(tabId);
});

chrome.tabs.onActivated.addListener((activeInfo) => {
  Object.keys(activeSessions).forEach(existingTabId => {
    if (Number(existingTabId) !== activeInfo.tabId) {
      closeActiveSession(Number(existingTabId));
    }
  });

  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (tab && tab.url && isTrackedDomain(tab.url)) {
      const domain = getDomainFromUrl(tab.url);
      activeSessions[activeInfo.tabId] = {
        domain,
        startTime: Date.now(),
        blocked: activeSessions[activeInfo.tabId]?.blocked || 0
      };
      saveActiveSessions();
    }
  });
});

function closeActiveSession(tabId) {
  if (!activeSessions[tabId]) {
    return;
  }

  const session = activeSessions[tabId];
  const duration = Math.round((Date.now() - session.startTime) / 1000);

  if (duration > 5) {
    saveSessionTime(session.domain, duration, session.blocked);
  }

  delete activeSessions[tabId];
}

async function saveSessionTime(domain, durationSeconds, blockedCount) {
  try {
    const result = await chrome.storage.local.get(['antiSlop_sessions']);
    const sessions = result.antiSlop_sessions || {};
    
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    if (!sessions[today]) {
      sessions[today] = {};
    }
    
    if (!sessions[today][domain]) {
      sessions[today][domain] = { time: 0, visits: 0, blocked: 0 };
    }
    
    sessions[today][domain].time += durationSeconds;
    sessions[today][domain].visits += 1;
    sessions[today][domain].blocked += blockedCount;
    
    // Keep only last 30 days
    const dates = Object.keys(sessions).sort().reverse();
    if (dates.length > 30) {
      dates.slice(30).forEach(d => delete sessions[d]);
    }
    
    await chrome.storage.local.set({ antiSlop_sessions: sessions });
    console.log('[Anti-Slop Session] Saved:', domain, durationSeconds, 'seconds');
  } catch (error) {
    console.error('[Anti-Slop Session] Error saving:', error);
  }
}

// Record when content is blocked during session
function recordBlockedContent(tabId) {
  if (activeSessions[tabId]) {
    activeSessions[tabId].blocked += 1;
  }
}

// Get session stats for popup
async function getSessionStats() {
  try {
    const result = await chrome.storage.local.get(['antiSlop_sessions']);
    return result.antiSlop_sessions || {};
  } catch (error) {
    return {};
  }
}

// ============================================================
// WHITELIST HANDLERS
// ============================================================

async function handleAddToWhitelist(domain) {
  if (!domain) return { success: false, error: 'No domain provided' };
  
  try {
    const cleaned = domain.replace(/^www\./, '').toLowerCase();
    const result = await chrome.storage.sync.get(['antiSlop_whitelist']);
    const list = result.antiSlop_whitelist || [];
    
    if (!list.includes(cleaned)) {
      list.push(cleaned);
      await chrome.storage.sync.set({ antiSlop_whitelist: list });
    }
    
    return { success: true };
  } catch (error) {
    console.error('[Anti-Slop] Error adding to whitelist:', error);
    return { success: false, error: error.message };
  }
}

async function handleRemoveFromWhitelist(domain) {
  if (!domain) return { success: false, error: 'No domain provided' };
  
  try {
    const cleaned = domain.replace(/^www\./, '').toLowerCase();
    const result = await chrome.storage.sync.get(['antiSlop_whitelist']);
    const list = result.antiSlop_whitelist || [];
    const filtered = list.filter(d => d !== cleaned);
    await chrome.storage.sync.set({ antiSlop_whitelist: filtered });
    
    return { success: true };
  } catch (error) {
    console.error('[Anti-Slop] Error removing from whitelist:', error);
    return { success: false, error: error.message };
  }
}

async function getWhitelist() {
  const result = await chrome.storage.sync.get(['antiSlop_whitelist']);
  return result.antiSlop_whitelist || [];
}

// ============================================================
// SETTINGS / STATS GETTERS
// ============================================================

async function getSettings() {
  const result = await chrome.storage.sync.get(['antiSlop_settings']);
  return result.antiSlop_settings;
}

async function getStats() {
  const result = await chrome.storage.sync.get(['antiSlop_stats']);
  return result.antiSlop_stats;
}

// ============================================================
// KEYBOARD SHORTCUTS
// ============================================================

chrome.commands.onCommand.addListener(async (command) => {
  console.log('[Anti-Slop] Command:', command);
  
  if (command === 'toggle-extension') {
    // Toggle all platform settings
    try {
      const result = await chrome.storage.sync.get(['antiSlop_settings']);
      const settings = result.antiSlop_settings || {};
      
      // Toggle all major platforms
      const platforms = ['youtube', 'instagram', 'twitter', 'reddit', 'google', 'linkedin', 'tiktok', 'facebook', 'bluesky', 'threads'];
      let anyEnabled = false;
      
      for (const p of platforms) {
        if (settings[p]?.enabled) {
          anyEnabled = true;
          break;
        }
      }
      
      // If any are enabled, disable all. If all disabled, enable all.
      const newState = !anyEnabled;
      
      for (const p of platforms) {
        settings[p] = settings[p] || {};
        settings[p].enabled = newState;
      }
      
      settings.aiDetector = settings.aiDetector || {};
      settings.aiDetector.enabled = newState;
      
      await chrome.storage.sync.set({ antiSlop_settings: settings });
      
      console.log('[Anti-Slop] Extension toggled:', newState ? 'ON' : 'OFF');
      
      // Notify all tabs
      const tabs = await chrome.tabs.query({});
      for (const tab of tabs) {
        try {
          chrome.tabs.sendMessage(tab.id, { action: 'settingsChanged' });
        } catch (e) {}
      }
    } catch (error) {
      console.error('[Anti-Slop] Toggle error:', error);
    }
  }
  
  if (command === 'open-popup') {
    // Just focus the extension - chrome handles this automatically
    console.log('[Anti-Slop] Open popup command');
  }
});

// ============================================================
// LIFECYCLE
// ============================================================

chrome.runtime.onStartup.addListener(() => {
  console.log('[Anti-Slop] Browser started, service worker active');
});

self.addEventListener('suspend', () => {
  console.log('[Anti-Slop] Service worker suspending...');
});

console.log('[Anti-Slop] Background service worker loaded');
