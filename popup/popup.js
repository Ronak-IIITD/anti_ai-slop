// Popup UI Logic v2
// Handles settings, statistics, whitelist management, and recent blocks

document.addEventListener('DOMContentLoaded', async () => {
  console.log('[Anti-Slop Popup] Initializing...');
  
  await loadSettings();
  await loadStatistics();
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

    const hideAIOverview = document.getElementById('hideAIOverview');
    if (hideAIOverview) {
      hideAIOverview.checked = settings.google?.hideAIOverview ?? true;
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
    
    const aiMode = settings.aiDetector?.mode || 'warn';
    document.getElementById('aiDetectorMode').value = aiMode;

    const showPlaceholders = settings.ui?.showPlaceholders ?? true;
    const showPlaceholdersToggle = document.getElementById('showPlaceholders');
    if (showPlaceholdersToggle) {
      showPlaceholdersToggle.checked = showPlaceholders;
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
    
    const platforms = stats.blockedByPlatform || {};
    document.getElementById('youtubeCount').textContent = formatNumber(platforms.youtube || 0);
    document.getElementById('twitterCount').textContent = formatNumber(platforms.twitter || 0);
    document.getElementById('redditCount').textContent = formatNumber(platforms.reddit || 0);
    document.getElementById('googleCount').textContent = formatNumber(platforms.google || 0);
    document.getElementById('linkedinCount').textContent = formatNumber(platforms.linkedin || 0);
    document.getElementById('instagramCount').textContent = formatNumber(platforms.instagram || 0);
    document.getElementById('tiktokCount').textContent = formatNumber(platforms.tiktok || 0);
    document.getElementById('aiArticlesCount').textContent = formatNumber(platforms.aiArticles || 0);
    
    console.log('[Anti-Slop Popup] Statistics loaded');
  } catch (error) {
    console.error('[Anti-Slop Popup] Error loading statistics:', error);
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
      return `
        <div class="recent-block-item">
          <div class="recent-block-info">
            <span class="recent-block-title" title="${_escapeHtml(title)}">${_escapeHtml(shortTitle)}</span>
            <span class="recent-block-meta">Score: ${block.score} &middot; ${time}</span>
          </div>
        </div>
      `;
    }).join('');
    
    console.log('[Anti-Slop Popup] Recent blocks loaded');
  } catch (error) {
    console.error('[Anti-Slop Popup] Error loading recent blocks:', error);
  }
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

  const hideAIOverviewToggle = document.getElementById('hideAIOverview');
  if (hideAIOverviewToggle) {
    hideAIOverviewToggle.addEventListener('change', (e) => {
      updateSetting('google', 'hideAIOverview', e.target.checked);
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
  
  document.getElementById('aiDetectorToggle').addEventListener('change', (e) => {
    updateSetting('aiDetector', 'enabled', e.target.checked);
  });


  // UI settings
  const showPlaceholdersToggle = document.getElementById('showPlaceholders');
  if (showPlaceholdersToggle) {
    showPlaceholdersToggle.addEventListener('change', (e) => {
      updateSetting('ui', 'showPlaceholders', e.target.checked);
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

function getDefaultSettings() {
  return {
    youtube: { enabled: true, sensitivity: 'medium' },
    instagram: { enabled: true, sensitivity: 'medium' },
    twitter: { enabled: true, sensitivity: 'medium', blockBrainrot: true, blockClickbait: true },
    reddit: { enabled: true, sensitivity: 'medium' },
    google: { enabled: true, sensitivity: 'medium', hideAIOverview: true, filterContentFarms: true },
    linkedin: { enabled: true, sensitivity: 'medium' },
    tiktok: { enabled: true, blockFeed: true },
    aiDetector: { enabled: true, threshold: 65, sensitivity: 'medium', mode: 'warn' },
    ui: { showPlaceholders: true }
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
