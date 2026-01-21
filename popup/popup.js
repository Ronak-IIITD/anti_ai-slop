// Popup UI Logic
// Handles settings management and statistics display

document.addEventListener('DOMContentLoaded', async () => {
  console.log('[Anti-Slop Popup] Initializing...');
  
  // Load initial data
  await loadSettings();
  await loadStatistics();
  
  // Set up event listeners
  setupEventListeners();
  
  console.log('[Anti-Slop Popup] Ready');
});

// Load settings from storage
async function loadSettings() {
  try {
    const result = await chrome.storage.sync.get(['antiSlop_settings']);
    const settings = result.antiSlop_settings || getDefaultSettings();
    
    // Apply settings to UI
    document.getElementById('youtubeToggle').checked = settings.youtube?.enabled ?? true;
    document.getElementById('twitterToggle').checked = settings.twitter?.enabled ?? true;
    document.getElementById('instagramToggle').checked = settings.instagram?.enabled ?? true;
    document.getElementById('tiktokToggle').checked = settings.tiktok?.enabled ?? true;
    document.getElementById('aiDetectorToggle').checked = settings.aiDetector?.enabled ?? true;
    
    // Twitter settings
    const minChars = settings.twitter?.minChars || 100;
    document.getElementById('minChars').value = minChars;
    document.getElementById('minCharsValue').textContent = minChars;
    document.getElementById('blockClickbait').checked = settings.twitter?.blockClickbait ?? true;
    
    // TikTok settings
    document.getElementById('blockTiktokFeed').checked = settings.tiktok?.blockFeed ?? true;
    
    // AI Detector settings
    const sensitivity = settings.aiDetector?.sensitivity || 'medium';
    document.getElementById('sensitivity').value = sensitivity;
    document.getElementById('sensitivityValue').textContent = 
      sensitivity.charAt(0).toUpperCase() + sensitivity.slice(1);
    
    console.log('[Anti-Slop Popup] Settings loaded');
  } catch (error) {
    console.error('[Anti-Slop Popup] Error loading settings:', error);
  }
}

// Load statistics from storage
async function loadStatistics() {
  try {
    const result = await chrome.storage.sync.get(['antiSlop_stats']);
    const stats = result.antiSlop_stats || getDefaultStats();
    
    // Update total blocked
    document.getElementById('totalBlocked').textContent = 
      formatNumber(stats.totalBlocked || 0);
    
    // Update time saved
    const hours = Math.floor((stats.estimatedTimeSaved || 0) / 60);
    const minutes = Math.round((stats.estimatedTimeSaved || 0) % 60);
    document.getElementById('timeSaved').textContent = `${hours}h ${minutes}m`;
    
    // Update platform counts
    const platforms = stats.blockedByPlatform || {};
    document.getElementById('youtubeCount').textContent = formatNumber(platforms.youtube || 0);
    document.getElementById('twitterCount').textContent = formatNumber(platforms.twitter || 0);
    document.getElementById('instagramCount').textContent = formatNumber(platforms.instagram || 0);
    document.getElementById('tiktokCount').textContent = formatNumber(platforms.tiktok || 0);
    document.getElementById('aiArticlesCount').textContent = formatNumber(platforms.aiArticles || 0);
    
    console.log('[Anti-Slop Popup] Statistics loaded');
  } catch (error) {
    console.error('[Anti-Slop Popup] Error loading statistics:', error);
  }
}

// Set up all event listeners
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
  
  document.getElementById('tiktokToggle').addEventListener('change', (e) => {
    updateSetting('tiktok', 'enabled', e.target.checked);
  });
  
  document.getElementById('aiDetectorToggle').addEventListener('change', (e) => {
    updateSetting('aiDetector', 'enabled', e.target.checked);
  });
  
  // Twitter settings
  document.getElementById('minChars').addEventListener('input', (e) => {
    const value = parseInt(e.target.value);
    document.getElementById('minCharsValue').textContent = value;
    updateSetting('twitter', 'minChars', value);
  });
  
  document.getElementById('blockClickbait').addEventListener('change', (e) => {
    updateSetting('twitter', 'blockClickbait', e.target.checked);
  });
  
  // TikTok settings
  document.getElementById('blockTiktokFeed').addEventListener('change', (e) => {
    updateSetting('tiktok', 'blockFeed', e.target.checked);
  });
  
  // AI Detector settings
  document.getElementById('sensitivity').addEventListener('change', (e) => {
    const value = e.target.value;
    document.getElementById('sensitivityValue').textContent = 
      value.charAt(0).toUpperCase() + value.slice(1);
    updateSetting('aiDetector', 'sensitivity', value);
  });
  
  // Reset statistics
  document.getElementById('resetStats').addEventListener('click', resetStatistics);
  
  // Report issue
  document.getElementById('reportIssue').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ 
      url: 'https://github.com/yourusername/anti-slop/issues' 
    });
  });
  
  console.log('[Anti-Slop Popup] Event listeners set up');
}

// Update a specific setting
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
    
    // Show feedback (optional)
    showToast(`Settings saved`);
  } catch (error) {
    console.error('[Anti-Slop Popup] Error updating setting:', error);
    showToast('Error saving settings', 'error');
  }
}

// Reset statistics
async function resetStatistics() {
  if (!confirm('Are you sure you want to reset all statistics? This cannot be undone.')) {
    return;
  }
  
  try {
    const freshStats = {
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
    
    await chrome.storage.sync.set({ antiSlop_stats: freshStats });
    
    // Update badge
    chrome.action.setBadgeText({ text: '0' });
    
    // Reload statistics display
    await loadStatistics();
    
    console.log('[Anti-Slop Popup] Statistics reset');
    showToast('Statistics reset successfully');
  } catch (error) {
    console.error('[Anti-Slop Popup] Error resetting statistics:', error);
    showToast('Error resetting statistics', 'error');
  }
}

// Show toast notification
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: ${type === 'error' ? '#dc3545' : '#28a745'};
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    z-index: 1000;
    animation: slideUp 0.3s ease-out;
  `;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideDown 0.3s ease-out';
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

// Format large numbers
function formatNumber(num) {
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k';
  }
  return num.toString();
}

// Get default settings
function getDefaultSettings() {
  return {
    youtube: { enabled: true, hideShorts: true },
    instagram: { enabled: true, hideReels: true },
    twitter: { enabled: true, minChars: 100, blockClickbait: true },
    tiktok: { enabled: true, blockFeed: true },
    aiDetector: { enabled: true, threshold: 60, sensitivity: 'medium', whitelist: [] }
  };
}

// Get default statistics
function getDefaultStats() {
  return {
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
}

// Listen for storage changes (real-time updates)
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync') {
    if (changes.antiSlop_stats) {
      loadStatistics();
    }
  }
});

// Add animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideUp {
    from {
      transform: translateX(-50%) translateY(20px);
      opacity: 0;
    }
    to {
      transform: translateX(-50%) translateY(0);
      opacity: 1;
    }
  }
  
  @keyframes slideDown {
    from {
      transform: translateX(-50%) translateY(0);
      opacity: 1;
    }
    to {
      transform: translateX(-50%) translateY(20px);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);
