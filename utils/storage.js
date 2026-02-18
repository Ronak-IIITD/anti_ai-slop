// Storage utility for Anti-Slop extension
// Manages user settings, statistics, and whitelist

const STORAGE_KEYS = {
  SETTINGS: 'antiSlop_settings',
  STATS: 'antiSlop_stats',
  WHITELIST: 'antiSlop_whitelist',
  RECENT_BLOCKS: 'antiSlop_recentBlocks'
};

// Default whitelist - sites that should NEVER be analyzed by AI detector
// These are legitimate tools, productivity apps, and trusted sources
const DEFAULT_WHITELIST = [
  // AI Tools (legitimate usage - NOT slop)
  'claude.ai',
  'chat.openai.com',
  'chatgpt.com',
  'gemini.google.com',
  'copilot.microsoft.com',
  'perplexity.ai',
  'anthropic.com',
  'huggingface.co',
  'replicate.com',
  'midjourney.com',
  'poe.com',

  // Search Engines
  'google.com',
  'google.co.in',
  'duckduckgo.com',
  'bing.com',
  'search.brave.com',

  // Development & Coding
  'github.com',
  'gitlab.com',
  'bitbucket.org',
  'stackoverflow.com',
  'stackexchange.com',
  'npmjs.com',
  'pypi.org',
  'crates.io',
  'developer.mozilla.org',
  'w3schools.com',
  'codepen.io',
  'replit.com',
  'codesandbox.io',
  'vercel.com',
  'netlify.com',
  'heroku.com',
  'render.com',

  // Documentation
  'docs.github.com',
  'docs.google.com',
  'developer.chrome.com',
  'reactjs.org',
  'vuejs.org',
  'angular.io',
  'nextjs.org',
  'nodejs.org',

  // Education & Research
  'wikipedia.org',
  'wikimedia.org',
  'arxiv.org',
  'scholar.google.com',
  'khanacademy.org',
  'coursera.org',
  'udemy.com',
  'edx.org',
  'mit.edu',
  'stanford.edu',

  // Trusted News Sources
  'reuters.com',
  'apnews.com',
  'bbc.com',
  'bbc.co.uk',
  'npr.org',
  'nytimes.com',
  'theguardian.com',
  'washingtonpost.com',

  // Productivity & Work
  'notion.so',
  'figma.com',
  'linear.app',
  'slack.com',
  'discord.com',
  'trello.com',
  'asana.com',
  'jira.atlassian.com',

  // E-commerce
  'amazon.com',
  'amazon.in',
  'flipkart.com',
  'ebay.com',

  // Social (handled by their own content scripts)
  'reddit.com',
  'quora.com',

  // Entertainment
  'netflix.com',
  'spotify.com',
  'primevideo.com',
  'hotstar.com',

  // Communication
  'gmail.com',
  'mail.google.com',
  'outlook.com',
  'web.whatsapp.com',
  'telegram.org',

  // Google Services
  'drive.google.com',
  'maps.google.com',
  'calendar.google.com',
  'photos.google.com',
  'meet.google.com',

  // Competitive Programming
  'leetcode.com',
  'hackerrank.com',
  'codeforces.com',
  'codechef.com',
  'geeksforgeeks.org',

  // Localhost / Development
  'localhost',
  '127.0.0.1'
];

// Default settings
const DEFAULT_SETTINGS = {
  youtube: {
    enabled: true,
    sensitivity: 'medium' // low, medium, high - for brainrot detection
  },
  instagram: {
    enabled: true,
    sensitivity: 'medium'
  },
  twitter: {
    enabled: true,
    sensitivity: 'medium',
    blockBrainrot: true,
    blockClickbait: true
  },
  reddit: {
    enabled: true,
    sensitivity: 'medium'
  },
  google: {
    enabled: true,
    sensitivity: 'medium',
    hideAIOverview: true,
    filterContentFarms: true
  },
  linkedin: {
    enabled: true,
    sensitivity: 'medium'
  },
  tiktok: {
    enabled: true,
    blockFeed: true
  },
  aiDetector: {
    enabled: true,
    threshold: 65,
    sensitivity: 'medium', // low=80, medium=60, high=40
    mode: 'block' // 'block' = hide content, 'off' = disabled
  },
  customRules: {
    enabled: true,
    blockKeywords: [],
    allowKeywords: []
  },
  ui: {
    showPlaceholders: true
  }
};

// Default statistics
const DEFAULT_STATS = {
  totalBlocked: 0,
  estimatedTimeSaved: 0, // in minutes
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

class StorageManager {
  constructor() {
    this.cache = {
      settings: null,
      stats: null,
      whitelist: null
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
        // Ensure new fields exist (migration for existing users)
        if (!settings.aiDetector?.mode) {
          settings.aiDetector = settings.aiDetector || {};
          settings.aiDetector.mode = 'block';
        }
        if (!settings.customRules) {
          settings.customRules = {
            enabled: true,
            blockKeywords: [],
            allowKeywords: []
          };
        }
        if (typeof settings.customRules.enabled !== 'boolean') {
          settings.customRules.enabled = true;
        }
        if (!Array.isArray(settings.customRules.blockKeywords)) {
          settings.customRules.blockKeywords = [];
        }
        if (!Array.isArray(settings.customRules.allowKeywords)) {
          settings.customRules.allowKeywords = [];
        }
        settings.customRules.blockKeywords = settings.customRules.blockKeywords
          .map(k => String(k).trim().toLowerCase())
          .filter(k => k.length >= 3)
          .slice(0, 100);
        settings.customRules.allowKeywords = settings.customRules.allowKeywords
          .map(k => String(k).trim().toLowerCase())
          .filter(k => k.length >= 3)
          .slice(0, 100);
        if (!settings.ui) {
          settings.ui = { showPlaceholders: true };
        } else if (typeof settings.ui.showPlaceholders !== 'boolean') {
          settings.ui.showPlaceholders = true;
        }
        if (settings.twitter) {
          if (!settings.twitter.sensitivity) {
            settings.twitter.sensitivity = 'medium';
          }
          if (typeof settings.twitter.blockBrainrot !== 'boolean') {
            settings.twitter.blockBrainrot = true;
          }
          if (typeof settings.twitter.blockClickbait !== 'boolean') {
            settings.twitter.blockClickbait = true;
          }
          if (typeof settings.twitter.minChars !== 'undefined') {
            delete settings.twitter.minChars;
          }
        }
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

  // Get whitelist (default + user-added)
  async getWhitelist() {
    if (this.cache.whitelist) {
      return this.cache.whitelist;
    }

    return new Promise((resolve) => {
      chrome.storage.sync.get([STORAGE_KEYS.WHITELIST], (result) => {
        const userWhitelist = result[STORAGE_KEYS.WHITELIST] || [];
        // Merge default + user whitelist, deduplicate
        const combined = [...new Set([...DEFAULT_WHITELIST, ...userWhitelist])];
        this.cache.whitelist = combined;
        resolve(combined);
      });
    });
  }

  // Add domain to user whitelist
  async addToWhitelist(domain) {
    const cleaned = domain.replace(/^www\./, '').toLowerCase();
    return new Promise((resolve) => {
      chrome.storage.sync.get([STORAGE_KEYS.WHITELIST], (result) => {
        const userWhitelist = result[STORAGE_KEYS.WHITELIST] || [];
        if (!userWhitelist.includes(cleaned)) {
          userWhitelist.push(cleaned);
          chrome.storage.sync.set({ [STORAGE_KEYS.WHITELIST]: userWhitelist }, () => {
            this.cache.whitelist = null; // Invalidate cache
            resolve(true);
          });
        } else {
          resolve(false); // Already exists
        }
      });
    });
  }

  // Remove domain from user whitelist
  async removeFromWhitelist(domain) {
    const cleaned = domain.replace(/^www\./, '').toLowerCase();
    // Cannot remove default whitelist entries
    if (DEFAULT_WHITELIST.includes(cleaned)) {
      return false;
    }
    return new Promise((resolve) => {
      chrome.storage.sync.get([STORAGE_KEYS.WHITELIST], (result) => {
        const userWhitelist = result[STORAGE_KEYS.WHITELIST] || [];
        const filtered = userWhitelist.filter(d => d !== cleaned);
        chrome.storage.sync.set({ [STORAGE_KEYS.WHITELIST]: filtered }, () => {
          this.cache.whitelist = null;
          resolve(true);
        });
      });
    });
  }

  // Check if domain is whitelisted
  async isDomainWhitelisted(domain) {
    const whitelist = await this.getWhitelist();
    const cleaned = domain.replace(/^www\./, '').toLowerCase();
    return whitelist.some(entry =>
      cleaned === entry ||
      cleaned.endsWith('.' + entry)
    );
  }

  // Save recent block for history
  async addRecentBlock(entry) {
    return new Promise((resolve) => {
      chrome.storage.local.get([STORAGE_KEYS.RECENT_BLOCKS], (result) => {
        const blocks = result[STORAGE_KEYS.RECENT_BLOCKS] || [];
        blocks.unshift({
          url: entry.url,
          title: entry.title,
          score: entry.score,
          timestamp: new Date().toISOString()
        });
        // Keep only last 20 blocks
        const trimmed = blocks.slice(0, 20);
        chrome.storage.local.set({ [STORAGE_KEYS.RECENT_BLOCKS]: trimmed }, () => {
          resolve(trimmed);
        });
      });
    });
  }

  // Get recent blocks
  async getRecentBlocks() {
    return new Promise((resolve) => {
      chrome.storage.local.get([STORAGE_KEYS.RECENT_BLOCKS], (result) => {
        resolve(result[STORAGE_KEYS.RECENT_BLOCKS] || []);
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
      case 'reddit':
        timeSaved = count * 0.5; // 30 sec per post
        break;
      case 'google':
        timeSaved = count * 0.3; // 20 sec per filtered result
        break;
      case 'linkedin':
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
    this.cache.whitelist = null;
  }
}

// Create singleton instance
const storageManager = new StorageManager();

// Export for use in content scripts and background
if (typeof module !== 'undefined' && module.exports) {
  module.exports = storageManager;
}
