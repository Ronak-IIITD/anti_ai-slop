// Popup UI Logic v2
// Handles settings, statistics, whitelist management, and recent blocks

document.addEventListener('DOMContentLoaded', async () => {
  console.log('[Anti-Slop Popup] Initializing...');
  
  await loadSettings();
  await loadStatistics();
  await loadSessionStats();
  await loadCurrentSiteStatus();
  await loadWhitelist();
  await loadRecentBlocks();
  
  setupEventListeners();
  
  console.log('[Anti-Slop Popup] Ready');
});

// ============================================================
// SETTINGS
// ============================================================

async function loadSettings() {
  try {
    const result = await chrome.storage.sync.get(['antiSlop_settings']);
    const settings = result.antiSlop_settings || getDefaultSettings();
    
    // Platform toggles
    document.getElementById('youtubeToggle').checked = settings.youtube?.enabled ?? true;
    document.getElementById('twitterToggle').checked = settings.twitter?.enabled ?? true;
    document.getElementById('redditToggle').checked = settings.reddit?.enabled ?? true;
    document.getElementById('googleToggle').checked = settings.google?.enabled ?? true;
    document.getElementById('linkedinToggle').checked = settings.linkedin?.enabled ?? true;
    document.getElementById('instagramToggle').checked = settings.instagram?.enabled ?? true;
    document.getElementById('tiktokToggle').checked = settings.tiktok?.enabled ?? true;
    document.getElementById('aiDetectorToggle').checked = settings.aiDetector?.enabled ?? true;
    
    // Twitter settings
    const twitterSensitivity = settings.twitter?.sensitivity || 'medium';
    const twitterSensitivitySelect = document.getElementById('twitterSensitivity');
    if (twitterSensitivitySelect) {
      twitterSensitivitySelect.value = twitterSensitivity;
    }

    const blockBrainrotToggle = document.getElementById('blockBrainrot');
    if (blockBrainrotToggle) {
      blockBrainrotToggle.checked = settings.twitter?.blockBrainrot ?? true;
    }

    const blockClickbaitToggle = document.getElementById('blockClickbait');
    if (blockClickbaitToggle) {
      blockClickbaitToggle.checked = settings.twitter?.blockClickbait ?? true;
    }
    
    // TikTok settings
    document.getElementById('blockTiktokFeed').checked = settings.tiktok?.blockFeed ?? true;

    // Facebook settings
    const facebookToggle = document.getElementById('facebookToggle');
    if (facebookToggle) {
      facebookToggle.checked = settings.facebook?.enabled ?? true;
    }
    const facebookSensitivity = settings.facebook?.sensitivity || 'medium';
    const facebookSensitivitySelect = document.getElementById('facebookSensitivity');
    if (facebookSensitivitySelect) {
      facebookSensitivitySelect.value = facebookSensitivity;
    }

    // Bluesky settings
    const blueskyToggle = document.getElementById('blueskyToggle');
    if (blueskyToggle) {
      blueskyToggle.checked = settings.bluesky?.enabled ?? true;
    }
    const blueskySensitivity = settings.bluesky?.sensitivity || 'medium';
    const blueskySensitivitySelect = document.getElementById('blueskySensitivity');
    if (blueskySensitivitySelect) {
      blueskySensitivitySelect.value = blueskySensitivity;
    }

    // Threads settings
    const threadsToggle = document.getElementById('threadsToggle');
    if (threadsToggle) {
      threadsToggle.checked = settings.threads?.enabled ?? true;
    }
    const threadsSensitivity = settings.threads?.sensitivity || 'medium';
    const threadsSensitivitySelect = document.getElementById('threadsSensitivity');
    if (threadsSensitivitySelect) {
      threadsSensitivitySelect.value = threadsSensitivity;
    }

    // Focus Mode
    const focusModeToggle = document.getElementById('focusModeToggle');
    if (focusModeToggle) {
      focusModeToggle.checked = settings.ui?.focusMode ?? false;
    }

    // Reddit settings
    const redditSensitivity = settings.reddit?.sensitivity || 'medium';
    const redditSensitivitySelect = document.getElementById('redditSensitivity');
    if (redditSensitivitySelect) {
      redditSensitivitySelect.value = redditSensitivity;
    }

    // Google settings
    const googleSensitivity = settings.google?.sensitivity || 'medium';
    const googleSensitivitySelect = document.getElementById('googleSensitivity');
    if (googleSensitivitySelect) {
      googleSensitivitySelect.value = googleSensitivity;
    }

    const filterContentFarms = document.getElementById('filterContentFarms');
    if (filterContentFarms) {
      filterContentFarms.checked = settings.google?.filterContentFarms ?? true;
    }

    // LinkedIn settings
    const linkedinSensitivity = settings.linkedin?.sensitivity || 'medium';
    const linkedinSensitivitySelect = document.getElementById('linkedinSensitivity');
    if (linkedinSensitivitySelect) {
      linkedinSensitivitySelect.value = linkedinSensitivity;
    }
    
    // AI Detector settings
    const sensitivity = settings.aiDetector?.sensitivity || 'medium';
    document.getElementById('sensitivity').value = sensitivity;
    document.getElementById('sensitivityValue').textContent =
      sensitivity.charAt(0).toUpperCase() + sensitivity.slice(1);
    
    const aiMode = settings.aiDetector?.mode || 'block';
    document.getElementById('aiDetectorMode').value = aiMode;

    const customRules = settings.customRules || {};
    const customRulesEnabled = document.getElementById('customRulesEnabled');
    if (customRulesEnabled) {
      customRulesEnabled.checked = customRules.enabled ?? true;
    }

    const customBlockKeywords = document.getElementById('customBlockKeywords');
    if (customBlockKeywords) {
      customBlockKeywords.value = (customRules.blockKeywords || []).join('\n');
    }

    const customAllowKeywords = document.getElementById('customAllowKeywords');
    if (customAllowKeywords) {
      customAllowKeywords.value = (customRules.allowKeywords || []).join('\n');
    }

    const showPlaceholders = settings.ui?.showPlaceholders ?? true;
    const showPlaceholdersToggle = document.getElementById('showPlaceholders');
    if (showPlaceholdersToggle) {
      showPlaceholdersToggle.checked = showPlaceholders;
    }

    const detectAIMediaToggle = document.getElementById('detectAIMedia');
    if (detectAIMediaToggle) {
      detectAIMediaToggle.checked = settings.ui?.detectAIMedia ?? true;
    }

    const mediaSensitivitySelect = document.getElementById('mediaSensitivity');
    if (mediaSensitivitySelect) {
      mediaSensitivitySelect.value = settings.ui?.mediaSensitivity || 'medium';
    }

    const mediaOcrToggle = document.getElementById('mediaOcr');
    if (mediaOcrToggle) {
      mediaOcrToggle.checked = settings.ui?.mediaOcr ?? false;
    }
    
    console.log('[Anti-Slop Popup] Settings loaded');
  } catch (error) {
    console.error('[Anti-Slop Popup] Error loading settings:', error);
  }
}

// ============================================================
// STATISTICS
// ============================================================

async function loadStatistics() {
  try {
    const result = await chrome.storage.sync.get(['antiSlop_stats']);
    const stats = result.antiSlop_stats || getDefaultStats();
    
    document.getElementById('totalBlocked').textContent =
      formatNumber(stats.totalBlocked || 0);
    
    const hours = Math.floor((stats.estimatedTimeSaved || 0) / 60);
    const minutes = Math.round((stats.estimatedTimeSaved || 0) % 60);
    document.getElementById('timeSaved').textContent = `${hours}h ${minutes}m`;
    document.getElementById('aiMediaWarnings').textContent = formatNumber(stats.aiMediaWarnings || 0);
    
    const platforms = stats.blockedByPlatform || {};
    document.getElementById('youtubeCount').textContent = formatNumber(platforms.youtube || 0);
    document.getElementById('twitterCount').textContent = formatNumber(platforms.twitter || 0);
    document.getElementById('redditCount').textContent = formatNumber(platforms.reddit || 0);
    document.getElementById('googleCount').textContent = formatNumber(platforms.google || 0);
    document.getElementById('linkedinCount').textContent = formatNumber(platforms.linkedin || 0);
    document.getElementById('instagramCount').textContent = formatNumber(platforms.instagram || 0);
    document.getElementById('tiktokCount').textContent = formatNumber(platforms.tiktok || 0);
    document.getElementById('facebookCount').textContent = formatNumber(platforms.facebook || 0);
    document.getElementById('blueskyCount').textContent = formatNumber(platforms.bluesky || 0);
    document.getElementById('threadsCount').textContent = formatNumber(platforms.threads || 0);
    document.getElementById('aiArticlesCount').textContent = formatNumber(platforms.aiArticles || 0);
    
    console.log('[Anti-Slop Popup] Statistics loaded');
  } catch (error) {
    console.error('[Anti-Slop Popup] Error loading statistics:', error);
  }
}

// ============================================================
// TIME TRACKING
// ============================================================

function formatTime(seconds) {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.round((seconds % 3600) / 60);
  return `${hours}h ${mins}m`;
}

async function loadSessionStats() {
  try {
    const result = await chrome.runtime.sendMessage({ action: 'getSessionStats' });
    const sessions = result || {};
    
    const today = new Date().toISOString().split('T')[0];
    const todayData = sessions[today] || {};
    
    // Calculate today totals
    let todayTime = 0;
    let todayVisits = 0;
    let todayBlocked = 0;
    for (const domain of Object.values(todayData)) {
      todayTime += domain.time || 0;
      todayVisits += domain.visits || 0;
      todayBlocked += domain.blocked || 0;
    }
    
    document.getElementById('todayTime').textContent = formatTime(todayTime);
    document.getElementById('todaySites').textContent = `on ${Object.keys(todayData).length} sites`;
    
    // Calculate week totals
    let weekTime = 0;
    let weekBlocked = 0;
    const dates = Object.keys(sessions).sort().reverse().slice(0, 7);
    for (const date of dates) {
      const dayData = sessions[date] || {};
      for (const domain of Object.values(dayData)) {
        weekTime += domain.time || 0;
        weekBlocked += domain.blocked || 0;
      }
    }
    
    document.getElementById('weekTime').textContent = formatTime(weekTime);
    document.getElementById('weekBlocked').textContent = `blocked ${weekBlocked} times`;
    
    // Build breakdown
    const breakdownEl = document.getElementById('timeBreakdown');
    if (Object.keys(todayData).length > 0) {
      const sorted = Object.entries(todayData)
        .sort((a, b) => (b[1].time || 0) - (a[1].time || 0))
        .slice(0, 5);
      
      breakdownEl.innerHTML = sorted.map(([domain, data]) => `
        <div class="time-breakdown-item">
          <span class="time-breakdown-domain">${domain.replace('www.', '')}</span>
          <span class="time-breakdown-time">${formatTime(data.time || 0)} · ${data.visits || 0} visit${(data.visits || 0) === 1 ? '' : 's'}</span>
        </div>
      `).join('');
    } else {
      breakdownEl.innerHTML = '<p class="time-breakdown-empty">No time tracked today. Visit some social sites!</p>';
    }
    
    console.log('[Anti-Slop Popup] Session stats loaded');
  } catch (error) {
    console.error('[Anti-Slop Popup] Error loading session stats:', error);
    document.getElementById('timeBreakdown').innerHTML = '<p class="time-breakdown-empty">Enable extension to track time</p>';
  }
}

// ============================================================
// CURRENT SITE STATUS
// ============================================================

async function loadCurrentSiteStatus() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url) {
      _hideSiteStatus();
      return;
    }

    let url;
    try {
      url = new URL(tab.url);
    } catch {
      _hideSiteStatus();
      return;
    }

    // Skip non-http pages
    if (!url.protocol.startsWith('http')) {
      _hideSiteStatus();
      return;
    }

    const domain = url.hostname.replace(/^www\./, '');
    document.getElementById('siteStatusDomain').textContent = domain;

    // Check whitelist status
    const whitelistResult = await chrome.storage.sync.get(['antiSlop_whitelist']);
    const userWhitelist = whitelistResult.antiSlop_whitelist || [];
    
    // Check against user whitelist and default whitelist
    const isUserWhitelisted = userWhitelist.some(entry =>
      domain === entry || domain.endsWith('.' + entry)
    );
    
    // Check if it's a social media platform handled by dedicated scripts
    const socialPlatforms = ['youtube.com', 'instagram.com', 'twitter.com', 'x.com', 'tiktok.com', 'reddit.com', 'linkedin.com', 'google.com'];
    const isSocial = socialPlatforms.some(p => domain.includes(p));

    const dot = document.getElementById('siteStatusDot');
    const label = document.getElementById('siteStatusLabel');
    const toggleBtn = document.getElementById('siteWhitelistToggle');

    if (isSocial) {
      dot.className = 'site-status-dot status-active';
      label.textContent = 'Platform filter active';
      toggleBtn.style.display = 'none';
    } else if (isUserWhitelisted) {
      dot.className = 'site-status-dot status-whitelisted';
      label.textContent = 'Whitelisted';
      toggleBtn.textContent = 'Remove from whitelist';
      toggleBtn.style.display = '';
      toggleBtn.onclick = async () => {
        await _removeFromWhitelist(domain);
        await loadCurrentSiteStatus();
        await loadWhitelist();
        showToast('Removed from whitelist');
      };
    } else {
      dot.className = 'site-status-dot status-scanning';
      label.textContent = 'AI detector active';
      toggleBtn.textContent = 'Add to whitelist';
      toggleBtn.style.display = '';
      toggleBtn.onclick = async () => {
        await _addToWhitelist(domain);
        await loadCurrentSiteStatus();
        await loadWhitelist();
        showToast('Added to whitelist');
      };
    }
  } catch (error) {
    console.error('[Anti-Slop Popup] Error loading site status:', error);
    _hideSiteStatus();
  }
}

function _hideSiteStatus() {
  document.getElementById('siteStatusSection').style.display = 'none';
}

// ============================================================
// WHITELIST MANAGEMENT
// ============================================================

async function loadWhitelist() {
  try {
    const result = await chrome.storage.sync.get(['antiSlop_whitelist']);
    const userWhitelist = result.antiSlop_whitelist || [];
    
    const container = document.getElementById('whitelistList');
    
    if (userWhitelist.length === 0) {
      container.innerHTML = '<p class="whitelist-empty">No custom sites added. Default whitelist is always active.</p>';
      return;
    }
    
    container.innerHTML = userWhitelist.map(domain => `
      <div class="whitelist-item">
        <span class="whitelist-domain">${domain}</span>
        <button class="whitelist-remove" data-domain="${domain}" title="Remove">&times;</button>
      </div>
    `).join('');
    
    // Add remove handlers
    container.querySelectorAll('.whitelist-remove').forEach(btn => {
      btn.addEventListener('click', async () => {
        const domain = btn.getAttribute('data-domain');
        await _removeFromWhitelist(domain);
        await loadWhitelist();
        await loadCurrentSiteStatus();
        showToast(`Removed ${domain}`);
      });
    });
    
    console.log('[Anti-Slop Popup] Whitelist loaded');
  } catch (error) {
    console.error('[Anti-Slop Popup] Error loading whitelist:', error);
  }
}

async function _addToWhitelist(domain) {
  const cleaned = domain.replace(/^www\./, '').toLowerCase().trim();
  if (!cleaned) return;
  
  const result = await chrome.storage.sync.get(['antiSlop_whitelist']);
  const list = result.antiSlop_whitelist || [];
  if (!list.includes(cleaned)) {
    list.push(cleaned);
    await chrome.storage.sync.set({ antiSlop_whitelist: list });
  }
}

async function _removeFromWhitelist(domain) {
  const cleaned = domain.replace(/^www\./, '').toLowerCase().trim();
  const result = await chrome.storage.sync.get(['antiSlop_whitelist']);
  const list = result.antiSlop_whitelist || [];
  const filtered = list.filter(d => d !== cleaned);
  await chrome.storage.sync.set({ antiSlop_whitelist: filtered });
}

// ============================================================
// RECENT BLOCKS
// ============================================================

async function loadRecentBlocks() {
  try {
    const result = await chrome.storage.local.get(['antiSlop_recentBlocks']);
    const blocks = result.antiSlop_recentBlocks || [];
    
    const container = document.getElementById('recentBlocksList');
    
    if (blocks.length === 0) {
      container.innerHTML = '<p class="recent-blocks-empty">No recent detections</p>';
      return;
    }
    
    container.innerHTML = blocks.slice(0, 10).map(block => {
      const time = _formatTimeAgo(block.timestamp);
      const title = block.title || _extractDomain(block.url);
      const shortTitle = title.length > 50 ? title.substring(0, 47) + '...' : title;
      const scoreColor = block.score >= 75 ? 'var(--danger)' : block.score >= 50 ? 'var(--warning)' : 'var(--text-secondary)';
      return `
        <div class="recent-block-item">
          <div class="recent-block-info">
            <span class="recent-block-title" title="${_escapeHtml(title)}">${_escapeHtml(shortTitle)}</span>
            <span class="recent-block-meta">
              <span class="recent-block-score" style="color: ${scoreColor}">AI: ${block.score}%</span>
              <span class="recent-block-time"> &middot; ${time}</span>
            </span>
          </div>
        </div>
      `;
    }).join('');
    
    console.log('[Anti-Slop Popup] Recent blocks loaded');
  } catch (error) {
    console.error('[Anti-Slop Popup] Error loading recent blocks:', error);
  }
}

async function clearRecentBlocks() {
  try {
    await chrome.storage.local.set({ antiSlop_recentBlocks: [] });
    document.getElementById('recentBlocksList').innerHTML = '<p class="recent-blocks-empty">No recent detections</p>';
    showToast('Recent detections cleared');
  } catch (error) {
    console.error('[Anti-Slop Popup] Error clearing recent blocks:', error);
  }
}

// ============================================================
// EXPORT/IMPORT SETTINGS
// ============================================================

async function exportSettings() {
  try {
    const settings = await chrome.storage.sync.get();
    const stats = await chrome.storage.sync.get(['antiSlop_stats']);
    const whitelist = await chrome.storage.sync.get(['antiSlop_whitelist']);
    
    const exportData = {
      version: chrome.runtime.getManifest().version,
      exportedAt: new Date().toISOString(),
      settings: settings.antiSlop_settings,
      stats: stats.antiSlop_stats,
      whitelist: whitelist.antiSlop_whitelist
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `anti-slop-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    showToast('Settings exported successfully!');
  } catch (error) {
    console.error('[Anti-Slop Popup] Export error:', error);
    showToast('Export failed: ' + error.message, 'error');
  }
}

function importSettings() {
  const input = document.getElementById('importFile');
  input.click();
}

async function handleImport(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    
    if (!data.version || !data.settings) {
      throw new Error('Invalid backup file');
    }
    
    // Confirm before importing
    if (!confirm('This will replace your current settings. Continue?')) {
      return;
    }
    
    await chrome.storage.sync.set({ antiSlop_settings: data.settings });
    
    if (data.stats) {
      await chrome.storage.sync.set({ antiSlop_stats: data.stats });
    }
    
    if (data.whitelist) {
      await chrome.storage.sync.set({ antiSlop_whitelist: data.whitelist });
    }
    
    showToast('Settings imported! Reloading...');
    
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  } catch (error) {
    console.error('[Anti-Slop Popup] Import error:', error);
    showToast('Import failed: ' + error.message, 'error');
  }
  
  event.target.value = ''; // Reset input
}

// ============================================================
// EVENT LISTENERS
// ============================================================

function setupEventListeners() {
  // Platform toggles
  document.getElementById('youtubeToggle').addEventListener('change', (e) => {
    updateSetting('youtube', 'enabled', e.target.checked);
  });
  
  document.getElementById('twitterToggle').addEventListener('change', (e) => {
    updateSetting('twitter', 'enabled', e.target.checked);
  });
  
  document.getElementById('instagramToggle').addEventListener('change', (e) => {
    updateSetting('instagram', 'enabled', e.target.checked);
  });

  // Reddit
  document.getElementById('redditToggle').addEventListener('change', (e) => {
    updateSetting('reddit', 'enabled', e.target.checked);
  });

  const redditSensitivitySelect = document.getElementById('redditSensitivity');
  if (redditSensitivitySelect) {
    redditSensitivitySelect.addEventListener('change', (e) => {
      updateSetting('reddit', 'sensitivity', e.target.value);
    });
  }

  // Google
  document.getElementById('googleToggle').addEventListener('change', (e) => {
    updateSetting('google', 'enabled', e.target.checked);
  });

  const googleSensitivitySelect = document.getElementById('googleSensitivity');
  if (googleSensitivitySelect) {
    googleSensitivitySelect.addEventListener('change', (e) => {
      updateSetting('google', 'sensitivity', e.target.value);
    });
  }

  const filterContentFarmsToggle = document.getElementById('filterContentFarms');
  if (filterContentFarmsToggle) {
    filterContentFarmsToggle.addEventListener('change', (e) => {
      updateSetting('google', 'filterContentFarms', e.target.checked);
    });
  }

  // LinkedIn
  document.getElementById('linkedinToggle').addEventListener('change', (e) => {
    updateSetting('linkedin', 'enabled', e.target.checked);
  });

  const linkedinSensitivitySelect = document.getElementById('linkedinSensitivity');
  if (linkedinSensitivitySelect) {
    linkedinSensitivitySelect.addEventListener('change', (e) => {
      updateSetting('linkedin', 'sensitivity', e.target.value);
    });
  }
  
  document.getElementById('tiktokToggle').addEventListener('change', (e) => {
    updateSetting('tiktok', 'enabled', e.target.checked);
  });

  const facebookToggle = document.getElementById('facebookToggle');
  if (facebookToggle) {
    facebookToggle.addEventListener('change', (e) => {
      updateSetting('facebook', 'enabled', e.target.checked);
    });
  }

  const facebookSensitivitySelect = document.getElementById('facebookSensitivity');
  if (facebookSensitivitySelect) {
    facebookSensitivitySelect.addEventListener('change', (e) => {
      updateSetting('facebook', 'sensitivity', e.target.value);
    });
  }

  const blueskyToggle = document.getElementById('blueskyToggle');
  if (blueskyToggle) {
    blueskyToggle.addEventListener('change', (e) => {
      updateSetting('bluesky', 'enabled', e.target.checked);
    });
  }

  const blueskySensitivitySelect = document.getElementById('blueskySensitivity');
  if (blueskySensitivitySelect) {
    blueskySensitivitySelect.addEventListener('change', (e) => {
      updateSetting('bluesky', 'sensitivity', e.target.value);
    });
  }

  const threadsToggle = document.getElementById('threadsToggle');
  if (threadsToggle) {
    threadsToggle.addEventListener('change', (e) => {
      updateSetting('threads', 'enabled', e.target.checked);
    });
  }

  const threadsSensitivitySelect = document.getElementById('threadsSensitivity');
  if (threadsSensitivitySelect) {
    threadsSensitivitySelect.addEventListener('change', (e) => {
      updateSetting('threads', 'sensitivity', e.target.value);
    });
  }

  const focusModeToggle = document.getElementById('focusModeToggle');
  if (focusModeToggle) {
    focusModeToggle.addEventListener('change', async (e) => {
      await toggleFocusMode(e.target.checked);
    });
  }
  
  document.getElementById('aiDetectorToggle').addEventListener('change', (e) => {
    updateSetting('aiDetector', 'enabled', e.target.checked);
  });

  const customRulesEnabledToggle = document.getElementById('customRulesEnabled');
  if (customRulesEnabledToggle) {
    customRulesEnabledToggle.addEventListener('change', saveCustomRulesSettings);
  }

  const saveCustomRulesBtn = document.getElementById('saveCustomRules');
  if (saveCustomRulesBtn) {
    saveCustomRulesBtn.addEventListener('click', saveCustomRulesSettings);
  }


  // UI settings
  const showPlaceholdersToggle = document.getElementById('showPlaceholders');
  if (showPlaceholdersToggle) {
    showPlaceholdersToggle.addEventListener('change', (e) => {
      updateSetting('ui', 'showPlaceholders', e.target.checked);
    });
  }

  const detectAIMediaToggle = document.getElementById('detectAIMedia');
  if (detectAIMediaToggle) {
    detectAIMediaToggle.addEventListener('change', (e) => {
      updateSetting('ui', 'detectAIMedia', e.target.checked);
    });
  }

  const mediaSensitivitySelect = document.getElementById('mediaSensitivity');
  if (mediaSensitivitySelect) {
    mediaSensitivitySelect.addEventListener('change', (e) => {
      updateSetting('ui', 'mediaSensitivity', e.target.value);
    });
  }

  const mediaOcrToggle = document.getElementById('mediaOcr');
  if (mediaOcrToggle) {
    mediaOcrToggle.addEventListener('change', (e) => {
      updateSetting('ui', 'mediaOcr', e.target.checked);
    });
  }
  
  // Twitter settings
  const twitterSensitivitySelect = document.getElementById('twitterSensitivity');
  if (twitterSensitivitySelect) {
    twitterSensitivitySelect.addEventListener('change', (e) => {
      updateSetting('twitter', 'sensitivity', e.target.value);
    });
  }

  const blockBrainrotToggle = document.getElementById('blockBrainrot');
  if (blockBrainrotToggle) {
    blockBrainrotToggle.addEventListener('change', (e) => {
      updateSetting('twitter', 'blockBrainrot', e.target.checked);
    });
  }

  const blockClickbaitToggle = document.getElementById('blockClickbait');
  if (blockClickbaitToggle) {
    blockClickbaitToggle.addEventListener('change', (e) => {
      updateSetting('twitter', 'blockClickbait', e.target.checked);
    });
  }
  
  // TikTok settings
  document.getElementById('blockTiktokFeed').addEventListener('change', (e) => {
    updateSetting('tiktok', 'blockFeed', e.target.checked);
  });
  
  // AI Detector mode
  document.getElementById('aiDetectorMode').addEventListener('change', (e) => {
    updateSetting('aiDetector', 'mode', e.target.value);
  });
  
  // AI Detector sensitivity
  document.getElementById('sensitivity').addEventListener('change', (e) => {
    const value = e.target.value;
    document.getElementById('sensitivityValue').textContent =
      value.charAt(0).toUpperCase() + value.slice(1);
    updateSetting('aiDetector', 'sensitivity', value);
  });
  
  // Reset statistics
  document.getElementById('resetStats').addEventListener('click', resetStatistics);
  
  // Whitelist add
  document.getElementById('whitelistAddBtn').addEventListener('click', handleWhitelistAdd);
  document.getElementById('whitelistInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleWhitelistAdd();
  });
  
  // Report issue
  document.getElementById('reportIssue').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({
      url: 'https://github.com/Ronak-IIITD/anti_ai-slop/issues'
    });
  });
  
  // Export/Import
  document.getElementById('exportSettings').addEventListener('click', exportSettings);
  document.getElementById('importSettings').addEventListener('click', importSettings);
  document.getElementById('importFile').addEventListener('change', handleImport);
  
  // Clear recent blocks
  document.getElementById('clearRecentBlocks').addEventListener('click', clearRecentBlocks);
  
  console.log('[Anti-Slop Popup] Event listeners set up');
}

// ============================================================
// SETTING UPDATES
// ============================================================

async function updateSetting(platform, key, value) {
  try {
    const result = await chrome.storage.sync.get(['antiSlop_settings']);
    const settings = result.antiSlop_settings || getDefaultSettings();
    
    if (!settings[platform]) {
      settings[platform] = {};
    }
    
    settings[platform][key] = value;
    
    await chrome.storage.sync.set({ antiSlop_settings: settings });
    
    console.log(`[Anti-Slop Popup] Updated ${platform}.${key} = ${value}`);
    showToast('Settings saved');
  } catch (error) {
    console.error('[Anti-Slop Popup] Error updating setting:', error);
    showToast('Error saving settings', 'error');
  }
}

async function toggleFocusMode(enabled) {
  try {
    const result = await chrome.storage.sync.get(['antiSlop_settings']);
    const settings = result.antiSlop_settings || getDefaultSettings();
    const platforms = ['youtube', 'instagram', 'twitter', 'reddit', 'google', 'linkedin', 'tiktok', 'facebook', 'bluesky', 'threads'];

    settings.ui = settings.ui || {};

    if (enabled) {
      settings.ui.focusModePrevious = {};
      platforms.forEach(platform => {
        settings[platform] = settings[platform] || {};
        settings.ui.focusModePrevious[platform] = settings[platform].enabled !== false;
        settings[platform].enabled = true;
      });
      settings.aiDetector = settings.aiDetector || {};
      settings.ui.focusModePrevious.aiDetector = settings.aiDetector.enabled !== false;
      settings.aiDetector.enabled = true;
    } else if (settings.ui.focusModePrevious) {
      platforms.forEach(platform => {
        settings[platform] = settings[platform] || {};
        settings[platform].enabled = settings.ui.focusModePrevious[platform] !== false;
      });
      settings.aiDetector = settings.aiDetector || {};
      settings.aiDetector.enabled = settings.ui.focusModePrevious.aiDetector !== false;
      settings.ui.focusModePrevious = null;
    }

    settings.ui.focusMode = enabled;
    await chrome.storage.sync.set({ antiSlop_settings: settings });
    showToast(enabled ? 'Focus Mode enabled' : 'Focus Mode disabled');
    await loadSettings();
  } catch (error) {
    console.error('[Anti-Slop Popup] Error toggling Focus Mode:', error);
    showToast('Error updating Focus Mode', 'error');
  }
}

// ============================================================
// WHITELIST ADD HANDLER
// ============================================================

async function handleWhitelistAdd() {
  const input = document.getElementById('whitelistInput');
  const domain = input.value.trim().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '').toLowerCase();
  
  if (!domain) {
    showToast('Enter a domain name', 'error');
    return;
  }
  
  // Basic validation
  if (!domain.includes('.') && domain !== 'localhost') {
    showToast('Enter a valid domain (e.g. example.com)', 'error');
    return;
  }
  
  await _addToWhitelist(domain);
  input.value = '';
  await loadWhitelist();
  await loadCurrentSiteStatus();
  showToast(`${domain} added to whitelist`);
}

// ============================================================
// RESET STATISTICS
// ============================================================

async function resetStatistics() {
  if (!confirm('Are you sure you want to reset all statistics? This cannot be undone.')) {
    return;
  }
  
  try {
    const freshStats = getDefaultStats();
    await chrome.storage.sync.set({ antiSlop_stats: freshStats });
    chrome.action.setBadgeText({ text: '0' });
    await loadStatistics();
    showToast('Statistics reset successfully');
  } catch (error) {
    console.error('[Anti-Slop Popup] Error resetting statistics:', error);
    showToast('Error resetting statistics', 'error');
  }
}

// ============================================================
// CUSTOM KEYWORD RULES
// ============================================================

async function saveCustomRulesSettings() {
  try {
    const enabled = document.getElementById('customRulesEnabled')?.checked ?? true;
    const blockRaw = document.getElementById('customBlockKeywords')?.value || '';
    const allowRaw = document.getElementById('customAllowKeywords')?.value || '';

    const blockKeywords = _parseCustomKeywords(blockRaw);
    const allowKeywords = _parseCustomKeywords(allowRaw);

    if (blockKeywords.length > 100 || allowKeywords.length > 100) {
      showToast('Max 100 keywords per list', 'error');
      return;
    }

    const result = await chrome.storage.sync.get(['antiSlop_settings']);
    const settings = result.antiSlop_settings || getDefaultSettings();

    settings.customRules = {
      enabled,
      blockKeywords,
      allowKeywords
    };

    await chrome.storage.sync.set({ antiSlop_settings: settings });
    showToast('Custom rules saved');
  } catch (error) {
    console.error('[Anti-Slop Popup] Error saving custom rules:', error);
    showToast('Error saving custom rules', 'error');
  }
}

// ============================================================
// HELPERS
// ============================================================

function showToast(message, type = 'success') {
  // Remove existing toasts
  document.querySelectorAll('.toast').forEach(t => t.remove());
  
  const toast = document.createElement('div');
  toast.className = `toast ${type === 'error' ? 'error' : ''}`;
  toast.textContent = message;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideDown 0.3s ease-out forwards';
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

function formatNumber(num) {
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k';
  }
  return num.toString();
}

function _formatTimeAgo(timestamp) {
  if (!timestamp) return '';
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

function _extractDomain(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function _escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function _parseCustomKeywords(raw) {
  if (!raw) return [];
  return Array.from(
    new Set(
      raw
        .split(/[\n,]/)
        .map(item => item.trim().toLowerCase())
        .filter(item => item.length >= 3)
    )
  );
}

function getDefaultSettings() {
  return {
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
    ui: { showPlaceholders: true, focusMode: false, detectAIMedia: true, mediaSensitivity: 'medium', mediaOcr: false }
  };
}

function getDefaultStats() {
  return {
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
    lastReset: new Date().toISOString()
  };
}

// ============================================================
// STORAGE CHANGE LISTENER (real-time updates)
// ============================================================

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync') {
    if (changes.antiSlop_stats) {
      loadStatistics();
    }
    if (changes.antiSlop_whitelist) {
      loadWhitelist();
      loadCurrentSiteStatus();
    }
  }
  if (namespace === 'local') {
    if (changes.antiSlop_recentBlocks) {
      loadRecentBlocks();
    }
  }
});
