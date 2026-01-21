// Storage utility for Anti-Slop extension
// Manages user settings and statistics

const STORAGE_KEYS = {
  SETTINGS: 'antiSlop_settings',
  STATS: 'antiSlop_stats'
};

// Default settings
const DEFAULT_SETTINGS = {
  youtube: {
    enabled: true,
    hideShorts: true
  },
  instagram: {
    enabled: true,
    hideReels: true
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
    threshold: 60, // Block if score >= 60
    sensitivity: 'medium', // low=80, medium=60, high=40
    whitelist: []
  }
};

// Default statistics
const DEFAULT_STATS = {
  totalBlocked: 0,
  estimatedTimeSaved: 0, // in minutes
  blockedByPlatform: {
    youtube: 0,
    twitter: 0,
    instagram: 0,
    tiktok: 0,
    aiArticles: 0
  },
  lastReset: new Date().toISOString()
};

class StorageManager {
  constructor() {
    this.cache = {
      settings: null,
      stats: null
    };
  }

  // Get settings (with caching)
  async getSettings() {
    if (this.cache.settings) {
      return this.cache.settings;
    }

    return new Promise((resolve) => {
      chrome.storage.sync.get([STORAGE_KEYS.SETTINGS], (result) => {
        const settings = result[STORAGE_KEYS.SETTINGS] || DEFAULT_SETTINGS;
        this.cache.settings = settings;
        resolve(settings);
      });
    });
  }

  // Get statistics (with caching)
  async getStats() {
    if (this.cache.stats) {
      return this.cache.stats;
    }

    return new Promise((resolve) => {
      chrome.storage.sync.get([STORAGE_KEYS.STATS], (result) => {
        const stats = result[STORAGE_KEYS.STATS] || DEFAULT_STATS;
        this.cache.stats = stats;
        resolve(stats);
      });
    });
  }

  // Save settings
  async saveSettings(settings) {
    this.cache.settings = settings;
    return new Promise((resolve) => {
      chrome.storage.sync.set({ [STORAGE_KEYS.SETTINGS]: settings }, () => {
        resolve(settings);
      });
    });
  }

  // Save statistics
  async saveStats(stats) {
    this.cache.stats = stats;
    return new Promise((resolve) => {
      chrome.storage.sync.set({ [STORAGE_KEYS.STATS]: stats }, () => {
        resolve(stats);
      });
    });
  }

  // Increment blocked counter for a platform
  async incrementBlocked(platform, count = 1) {
    const stats = await this.getStats();
    
    stats.totalBlocked += count;
    
    if (stats.blockedByPlatform[platform] !== undefined) {
      stats.blockedByPlatform[platform] += count;
    }
    
    // Estimate time saved (rough approximation)
    // Shorts/Reels: ~1 min each, Posts: ~30 sec, Articles: ~3 min
    let timeSaved = 0;
    switch (platform) {
      case 'youtube':
        timeSaved = count * 1; // 1 min per short
        break;
      case 'instagram':
        timeSaved = count * 1; // 1 min per reel
        break;
      case 'twitter':
        timeSaved = count * 0.5; // 30 sec per post
        break;
      case 'tiktok':
        timeSaved = count * 1; // 1 min per video
        break;
      case 'aiArticles':
        timeSaved = count * 3; // 3 min per article
        break;
    }
    
    stats.estimatedTimeSaved += timeSaved;
    
    await this.saveStats(stats);
    
    // Update badge
    this.updateBadge(stats.totalBlocked);
    
    return stats;
  }

  // Update extension badge
  updateBadge(count) {
    if (typeof chrome !== 'undefined' && chrome.action) {
      const displayCount = count > 999 ? '999+' : count.toString();
      chrome.action.setBadgeText({ text: displayCount });
      chrome.action.setBadgeBackgroundColor({ color: '#FF4444' });
    }
  }

  // Reset statistics
  async resetStats() {
    const freshStats = { ...DEFAULT_STATS, lastReset: new Date().toISOString() };
    await this.saveStats(freshStats);
    this.updateBadge(0);
    return freshStats;
  }

  // Check if platform is enabled
  async isPlatformEnabled(platform) {
    const settings = await this.getSettings();
    return settings[platform]?.enabled ?? false;
  }

  // Get specific setting
  async getSetting(platform, key) {
    const settings = await this.getSettings();
    return settings[platform]?.[key];
  }

  // Update specific setting
  async updateSetting(platform, key, value) {
    const settings = await this.getSettings();
    if (!settings[platform]) {
      settings[platform] = {};
    }
    settings[platform][key] = value;
    await this.saveSettings(settings);
    return settings;
  }

  // Clear cache
  clearCache() {
    this.cache.settings = null;
    this.cache.stats = null;
  }
}

// Create singleton instance
const storageManager = new StorageManager();

// Export for use in content scripts and background
if (typeof module !== 'undefined' && module.exports) {
  module.exports = storageManager;
}
