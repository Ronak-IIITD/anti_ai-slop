// Background Service Worker for Anti-Slop Extension v2
// Handles initialization, messaging, statistics, and icon status updates

// ============================================================
// INSTALLATION & STARTUP
// ============================================================

const FOCUS_MODE_PLATFORMS = [
  'youtube', 'instagram', 'twitter', 'reddit', 'google',
  'linkedin', 'tiktok', 'facebook', 'bluesky', 'threads'
];
const FOCUS_SPRINT_ALARM = 'antiSlop_focusSprintEnd';

chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[Anti-Slop] Extension installed/updated');
  
  if (details.reason === 'install') {
    await initializeDefaults();
  } else if (details.reason === 'update') {
    console.log('[Anti-Slop] Updated to', chrome.runtime.getManifest().version);
    // Migrate settings for existing users
    await migrateSettings();
  }

  await ensureFocusSprintAlarmState();
});

// Initialize default settings
async function initializeDefaults() {
  const DEFAULT_SETTINGS = {
    youtube: { enabled: true, sensitivity: 'medium' },
    instagram: { enabled: true, sensitivity: 'medium' },
    twitter: { enabled: true, sensitivity: 'medium', blockBrainrot: true, blockClickbait: true },
    reddit: { enabled: true, sensitivity: 'medium' },
    google: { enabled: true, sensitivity: 'medium', filterContentFarms: true },
    linkedin: { enabled: true, sensitivity: 'medium' },
    tiktok: { enabled: true, blockFeed: true },
    facebook: { enabled: true, sensitivity: 'medium' },
    bluesky: { enabled: true, sensitivity: 'medium' },
    threads: { enabled: true, sensitivity: 'medium' },
    aiDetector: { enabled: true, threshold: 65, sensitivity: 'medium', mode: 'warn' },
    customRules: { enabled: true, blockKeywords: [], allowKeywords: [] },
    ui: {
      showPlaceholders: true,
      focusMode: false,
      focusModePrevious: null,
      focusSprint: {
        active: false,
        durationMinutes: 25,
        startedAt: null,
        endsAt: null,
        keepFocusMode: false
      },
      detectAIMedia: true,
      mediaSensitivity: 'medium',
      mediaOcr: false
    }
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
    if (typeof settings.ui.focusModePrevious === 'undefined') {
      settings.ui.focusModePrevious = null;
      changed = true;
    }
    if (!settings.ui.focusSprint || typeof settings.ui.focusSprint !== 'object') {
      settings.ui.focusSprint = {
        active: false,
        durationMinutes: 25,
        startedAt: null,
        endsAt: null,
        keepFocusMode: false
      };
      changed = true;
    }
    if (typeof settings.ui.focusSprint.durationMinutes !== 'number' || settings.ui.focusSprint.durationMinutes < 5) {
      settings.ui.focusSprint.durationMinutes = 25;
      changed = true;
    }
    if (typeof settings.ui.focusSprint.active !== 'boolean') {
      settings.ui.focusSprint.active = false;
      changed = true;
    }
    if (!settings.ui.focusSprint.active) {
      if (settings.ui.focusSprint.startedAt !== null) {
        settings.ui.focusSprint.startedAt = null;
        changed = true;
      }
      if (settings.ui.focusSprint.endsAt !== null) {
        settings.ui.focusSprint.endsAt = null;
        changed = true;
      }
      if (settings.ui.focusSprint.keepFocusMode !== false) {
        settings.ui.focusSprint.keepFocusMode = false;
        changed = true;
      }
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

function _normalizeFocusSprintDuration(durationMinutes) {
  const parsed = Number(durationMinutes);
  if (!Number.isFinite(parsed)) return 25;
  return Math.max(5, Math.min(180, Math.round(parsed)));
}

function _ensureSettingsShape(settings = {}) {
  const nextSettings = settings;
  nextSettings.ui = nextSettings.ui || {};
  nextSettings.aiDetector = nextSettings.aiDetector || {};

  if (typeof nextSettings.ui.focusMode !== 'boolean') {
    nextSettings.ui.focusMode = false;
  }
  if (typeof nextSettings.ui.focusModePrevious === 'undefined') {
    nextSettings.ui.focusModePrevious = null;
  }
  if (!nextSettings.ui.focusSprint || typeof nextSettings.ui.focusSprint !== 'object') {
    nextSettings.ui.focusSprint = {
      active: false,
      durationMinutes: 25,
      startedAt: null,
      endsAt: null,
      keepFocusMode: false
    };
  }
  nextSettings.ui.focusSprint.durationMinutes = _normalizeFocusSprintDuration(
    nextSettings.ui.focusSprint.durationMinutes
  );
  if (typeof nextSettings.ui.focusSprint.active !== 'boolean') {
    nextSettings.ui.focusSprint.active = false;
  }
  if (!nextSettings.ui.focusSprint.active) {
    nextSettings.ui.focusSprint.startedAt = null;
    nextSettings.ui.focusSprint.endsAt = null;
    nextSettings.ui.focusSprint.keepFocusMode = false;
  }
  return nextSettings;
}

function _applyFocusMode(settings, enabled) {
  const normalized = _ensureSettingsShape(settings);

  if (enabled) {
    if (!normalized.ui.focusMode) {
      normalized.ui.focusModePrevious = {};
      FOCUS_MODE_PLATFORMS.forEach((platform) => {
        normalized[platform] = normalized[platform] || {};
        normalized.ui.focusModePrevious[platform] = normalized[platform].enabled !== false;
        normalized[platform].enabled = true;
      });
      normalized.ui.focusModePrevious.aiDetector = normalized.aiDetector.enabled !== false;
      normalized.aiDetector.enabled = true;
    }
    normalized.ui.focusMode = true;
    return normalized;
  }

  if (normalized.ui.focusModePrevious) {
    FOCUS_MODE_PLATFORMS.forEach((platform) => {
      normalized[platform] = normalized[platform] || {};
      normalized[platform].enabled = normalized.ui.focusModePrevious[platform] !== false;
    });
    normalized.aiDetector.enabled = normalized.ui.focusModePrevious.aiDetector !== false;
    normalized.ui.focusModePrevious = null;
  }
  normalized.ui.focusMode = false;
  return normalized;
}

async function _getSettingsForUpdate() {
  const result = await chrome.storage.sync.get(['antiSlop_settings']);
  return _ensureSettingsShape(result.antiSlop_settings || {});
}

async function _saveSettings(settings) {
  await chrome.storage.sync.set({ antiSlop_settings: settings });
}

async function _stopFocusSprintInternal(settings, options = {}) {
  const normalized = _ensureSettingsShape(settings);
  const sprint = normalized.ui.focusSprint || {};
  const disableFocusMode = options.disableFocusMode !== false;
  const reason = options.reason || 'manual';

  await chrome.alarms.clear(FOCUS_SPRINT_ALARM);

  if (!sprint.active) {
    normalized.ui.focusSprint = {
      ...sprint,
      active: false,
      startedAt: null,
      endsAt: null,
      keepFocusMode: false
    };
    return normalized;
  }

  if (disableFocusMode && !sprint.keepFocusMode) {
    _applyFocusMode(normalized, false);
  }

  normalized.ui.focusSprint = {
    active: false,
    durationMinutes: _normalizeFocusSprintDuration(sprint.durationMinutes),
    startedAt: null,
    endsAt: null,
    keepFocusMode: false,
    lastReason: reason,
    lastCompletedAt: new Date().toISOString()
  };

  return normalized;
}

async function handleSetFocusMode(enabled) {
  try {
    const settings = await _getSettingsForUpdate();
    _applyFocusMode(settings, Boolean(enabled));
    await _saveSettings(settings);
    return { success: true, focusMode: settings.ui.focusMode };
  } catch (error) {
    console.error('[Anti-Slop] Error setting focus mode:', error);
    return { success: false, error: error.message };
  }
}

async function handleStartFocusSprint(data = {}) {
  try {
    const durationMinutes = _normalizeFocusSprintDuration(data.durationMinutes);
    const settings = await _getSettingsForUpdate();
    const wasFocusModeActive = settings.ui.focusMode === true;

    if (!wasFocusModeActive) {
      _applyFocusMode(settings, true);
    }

    const now = Date.now();
    settings.ui.focusSprint = {
      active: true,
      durationMinutes,
      startedAt: now,
      endsAt: now + (durationMinutes * 60000),
      keepFocusMode: wasFocusModeActive
    };

    await chrome.alarms.clear(FOCUS_SPRINT_ALARM);
    chrome.alarms.create(FOCUS_SPRINT_ALARM, { when: settings.ui.focusSprint.endsAt });
    await _saveSettings(settings);

    return {
      success: true,
      focusMode: settings.ui.focusMode,
      focusSprint: settings.ui.focusSprint
    };
  } catch (error) {
    console.error('[Anti-Slop] Error starting focus sprint:', error);
    return { success: false, error: error.message };
  }
}

async function handleStopFocusSprint(data = {}) {
  try {
    const settings = await _getSettingsForUpdate();
    const nextSettings = await _stopFocusSprintInternal(settings, {
      disableFocusMode: data.disableFocusMode !== false,
      reason: data.reason || 'manual'
    });
    await _saveSettings(nextSettings);
    return {
      success: true,
      focusMode: nextSettings.ui.focusMode,
      focusSprint: nextSettings.ui.focusSprint
    };
  } catch (error) {
    console.error('[Anti-Slop] Error stopping focus sprint:', error);
    return { success: false, error: error.message };
  }
}

async function handleGetFocusSprintStatus() {
  try {
    const settings = await _getSettingsForUpdate();
    const sprint = settings.ui.focusSprint || {};
    if (sprint.active && sprint.endsAt && sprint.endsAt <= Date.now()) {
      const nextSettings = await _stopFocusSprintInternal(settings, { reason: 'expired' });
      await _saveSettings(nextSettings);
      return {
        success: true,
        focusMode: nextSettings.ui.focusMode,
        focusSprint: nextSettings.ui.focusSprint
      };
    }
    return {
      success: true,
      focusMode: settings.ui.focusMode,
      focusSprint: sprint
    };
  } catch (error) {
    console.error('[Anti-Slop] Error reading focus sprint status:', error);
    return { success: false, error: error.message };
  }
}

async function ensureFocusSprintAlarmState() {
  try {
    const settings = await _getSettingsForUpdate();
    const sprint = settings.ui.focusSprint || {};

    if (!sprint.active || !sprint.endsAt) {
      await chrome.alarms.clear(FOCUS_SPRINT_ALARM);
      return;
    }

    if (sprint.endsAt <= Date.now()) {
      const nextSettings = await _stopFocusSprintInternal(settings, { reason: 'expired' });
      await _saveSettings(nextSettings);
      return;
    }

    const existingAlarm = await chrome.alarms.get(FOCUS_SPRINT_ALARM);
    if (!existingAlarm) {
      chrome.alarms.create(FOCUS_SPRINT_ALARM, { when: sprint.endsAt });
    }
  } catch (error) {
    console.error('[Anti-Slop] Error ensuring focus sprint alarm:', error);
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
    chrome.action.setBadgeText({ text, tabId });
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

    case 'setFocusMode':
      handleSetFocusMode(request.data?.enabled).then(sendResponse);
      return true;

    case 'startFocusSprint':
      handleStartFocusSprint(request.data || {}).then(sendResponse);
      return true;

    case 'stopFocusSprint':
      handleStopFocusSprint(request.data || {}).then(sendResponse);
      return true;

    case 'getFocusSprintStatus':
      handleGetFocusSprintStatus().then(sendResponse);
      return true;

    case 'recordBlocked':
      if (tabId) {
        recordBlockedContent(tabId, request.data?.count || 1);
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
ensureFocusSprintAlarmState();

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
function recordBlockedContent(tabId, count = 1) {
  if (activeSessions[tabId]) {
    activeSessions[tabId].blocked += count;
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

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== FOCUS_SPRINT_ALARM) {
    return;
  }
  await handleStopFocusSprint({ reason: 'expired' });
});

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
      
      let anyEnabled = false;
      
      for (const p of FOCUS_MODE_PLATFORMS) {
        if (settings[p]?.enabled) {
          anyEnabled = true;
          break;
        }
      }
      
      // If any are enabled, disable all. If all disabled, enable all.
      const newState = !anyEnabled;
      
      for (const p of FOCUS_MODE_PLATFORMS) {
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
// ON-DEMAND SCRIPT INJECTION (v2)
// Handles SPA navigation and on-demand loading
// ============================================================

// Platform mapping for on-demand injection
const INJECTION_PLATFORM_MAP = {
  'youtube.com': { platform: 'youtube', script: 'content-scripts/youtube.js', css: 'content-scripts/youtube.css' },
  'instagram.com': { platform: 'instagram', script: 'content-scripts/instagram.js', css: 'content-scripts/instagram.css' },
  'twitter.com': { platform: 'twitter', script: 'content-scripts/twitter.js', css: 'content-scripts/twitter.css' },
  'x.com': { platform: 'twitter', script: 'content-scripts/twitter.js', css: 'content-scripts/twitter.css' },
  'reddit.com': { platform: 'reddit', script: 'content-scripts/reddit.js', css: 'content-scripts/reddit.css' },
  'linkedin.com': { platform: 'linkedin', script: 'content-scripts/linkedin.js', css: 'content-scripts/linkedin.css', utils: ['utils/utility-scorer.js'] },
  'facebook.com': { platform: 'facebook', script: 'content-scripts/facebook.js', css: 'content-scripts/facebook.css' },
  'messenger.com': { platform: 'facebook', script: 'content-scripts/facebook.js', css: 'content-scripts/facebook.css' },
  'bsky.app': { platform: 'bluesky', script: 'content-scripts/bluesky.js', css: 'content-scripts/bluesky.css' },
  'threads.net': { platform: 'threads', script: 'content-scripts/threads.js', css: 'content-scripts/threads.css' },
  'tiktok.com': { platform: 'tiktok', script: 'content-scripts/tiktok.js', css: 'content-scripts/tiktok.css' }
};

// Generic page AI detector config
const AI_DETECTOR_CONFIG = {
  script: 'content-scripts/ai-detector.js',
  css: 'content-scripts/ai-detector.css',
  utils: ['utils/ai-patterns.js']
};

// Excluded domains for AI detector
const AI_DETECTOR_EXCLUDES = [
  'github.com', 'stackoverflow.com', 'claude.ai', 'anthropic.com',
  'openai.com', 'chatgpt.com', 'gemini.google.com', 'copilot.microsoft.com',
  'perplexity.ai', 'wikipedia.org', 'wikimedia.org', 'amazon.com', 'amazon.in',
  'flipkart.com', 'notion.so', 'figma.com', 'linear.app', 'slack.com',
  'discord.com', 'arxiv.org', 'scholar.google.com', 'netflix.com', 'spotify.com',
  'gmail.com', 'mail.google.com', 'drive.google.com', 'docs.google.com',
  'maps.google.com', 'calendar.google.com', 'whatsapp.com', 'web.whatsapp.com',
  'leetcode.com', 'hackerrank.com', 'codeforces.com', 'codechef.com',
  'coursera.org', 'udemy.com', 'khanacademy.org', 'edx.org', 'npmjs.com',
  'pypi.org', 'developer.mozilla.org', 'w3schools.com', 'localhost'
];

// Check if platform is enabled in settings
async function isPlatformEnabledForInjection(platform) {
  try {
    const result = await chrome.storage.sync.get(['antiSlop_settings']);
    const settings = result.antiSlop_settings;
    
    if (!settings) return true;
    
    // Check platform-specific setting
    if (settings[platform] && settings[platform].enabled === false) {
      return false;
    }
    
    // Check focus mode - if enabled, all platforms are active
    if (settings.ui && settings.ui.focusMode) {
      return true;
    }
    
    return true;
  } catch (e) {
    return true;
  }
}

// Inject content scripts for a platform
async function injectPlatformScripts(tabId, platformConfig) {
  const baseUtils = ['utils/storage.js', 'utils/brainrot-patterns.js', 'utils/media-detector.js'];
  const extraUtils = platformConfig.utils || [];
  
  try {
    // Inject CSS
    if (platformConfig.css) {
      await chrome.scripting.insertCSS({
        files: [platformConfig.css],
        target: { tabId }
      });
    }
    
    // Inject base utilities
    for (const util of baseUtils) {
      try {
        await chrome.scripting.executeScript({
          files: [util],
          target: { tabId }
        });
      } catch (e) {}
    }
    
    // Inject extra utilities (like utility-scorer)
    for (const util of extraUtils) {
      try {
        await chrome.scripting.executeScript({
          files: [util],
          target: { tabId }
        });
      } catch (e) {}
    }
    
    // Inject common utilities
    try {
      await chrome.scripting.executeScript({
        files: ['content-scripts/common.js'],
        target: { tabId }
      });
    } catch (e) {}
    
    // Inject platform-specific script
    await chrome.scripting.executeScript({
      files: [platformConfig.script],
      target: { tabId }
    });
    
    console.log('[Anti-Slop:Injection] Injected for', platformConfig.platform);
  } catch (error) {
    console.error('[Anti-Slop:Injection] Error:', error);
  }
}

// Inject AI detector for generic pages
async function injectAIDetector(tabId, hostname) {
  // Check if domain is excluded
  for (const exclude of AI_DETECTOR_EXCLUDES) {
    if (hostname.includes(exclude)) {
      return;
    }
  }
  
  try {
    const result = await chrome.storage.sync.get(['antiSlop_settings']);
    const settings = result.antiSlop_settings;
    
    if (settings?.aiDetector?.enabled === false) {
      return;
    }
    
    // Inject CSS
    await chrome.scripting.insertCSS({
      files: [AI_DETECTOR_CONFIG.css],
      target: { tabId }
    });
    
    // Inject utilities
    for (const util of AI_DETECTOR_CONFIG.utils) {
      try {
        await chrome.scripting.executeScript({
          files: [util],
          target: { tabId }
        });
      } catch (e) {}
    }
    
    // Inject common utilities
    try {
      await chrome.scripting.executeScript({
        files: ['content-scripts/common.js'],
        target: { tabId }
      });
    } catch (e) {}
    
    // Inject AI detector
    await chrome.scripting.executeScript({
      files: [AI_DETECTOR_CONFIG.script],
      target: { tabId }
    });
    
    console.log('[Anti-Slop:Injection] Injected AI detector for', hostname);
  } catch (error) {
    console.error('[Anti-Slop:Injection] AI detector error:', error);
  }
}

// Handle web navigation events (for SPA support)
chrome.webNavigation.onCompleted.addListener(async (details) => {
  if (details.frameId !== 0) return; // Only main frame
  
  const url = new URL(details.url);
  const hostname = url.hostname.replace('www.', '');
  const tabId = details.tabId;
  
  // Check if it's a platform we support
  const platformConfig = INJECTION_PLATFORM_MAP[hostname];
  
  if (platformConfig) {
    // Check if platform is enabled
    const enabled = await isPlatformEnabledForInjection(platformConfig.platform);
    
    if (enabled) {
      await injectPlatformScripts(tabId, platformConfig);
    }
  } else {
    // Check for AI detector on generic pages
    await injectAIDetector(tabId, hostname);
  }
});

// Also handle tab updates for initial load
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return;
  if (!tab.url) return;
  
  const url = new URL(tab.url);
  const hostname = url.hostname.replace('www.', '');
  
  // Check if it's a platform we support
  const platformConfig = INJECTION_PLATFORM_MAP[hostname];
  
  if (platformConfig) {
    const enabled = await isPlatformEnabledForInjection(platformConfig.platform);
    
    if (enabled) {
      await injectPlatformScripts(tabId, platformConfig);
    }
  }
});

// ============================================================
// LIFECYCLE
// ============================================================

chrome.runtime.onStartup.addListener(() => {
  console.log('[Anti-Slop] Browser started, service worker active');
  ensureFocusSprintAlarmState();
});

self.addEventListener('suspend', () => {
  console.log('[Anti-Slop] Service worker suspending...');
});

console.log('[Anti-Slop] Background service worker loaded');
