// Common utilities for all content scripts
// Shared functions to reduce code duplication

let _lastBlockedNotificationAt = 0;
const BLOCK_NOTIFICATION_COOLDOWN_MS = 1800;
let _showPlaceholders = true;

// Debounce function for performance optimization
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Throttle function for high-frequency events
function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Run expensive operations when browser is idle
function runWhenIdle(callback, timeout = 2000) {
  if (typeof requestIdleCallback !== 'undefined') {
    requestIdleCallback(callback, { timeout });
  } else {
    setTimeout(callback, 100);
  }
}

// Hide element with anti-slop styling
function hideElement(element, reason = 'slop') {
  if (!element || element.classList.contains('anti-slop-hidden')) return;

  element.classList.add('anti-slop-hidden');
  element.setAttribute('data-anti-slop', reason);

  if (_showPlaceholders) {
    element.style.display = 'none';
    const placeholder = document.createElement('div');
    placeholder.className = 'anti-slop-blocked-placeholder';
    placeholder.setAttribute('data-anti-slop-placeholder', 'true');
    placeholder.innerHTML = `
      <span class="anti-slop-reason">Blocked: ${reason.replace(/-/g, ' ')}</span>
      <button class="anti-slop-show-btn">Show Content</button>
    `;
    placeholder.querySelector('.anti-slop-show-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      element.classList.remove('anti-slop-hidden');
      element.removeAttribute('data-anti-slop');
      element.style.display = '';
      placeholder.remove();
    });
    element.parentNode?.insertBefore(placeholder, element);
  } else {
    element.style.display = 'none';
  }

  showBlockedNotification();
}

// Show element (for toggling)
function showElement(element) {
  if (!element) return;
  
  element.classList.remove('anti-slop-hidden');
  element.removeAttribute('data-anti-slop');
  element.style.display = '';
}

// Fade element (reduce visibility instead of hiding)
// Used for replies/comments where 90% is AI but 15% is useful
function fadeElement(element, reason = 'ai-faded') {
  if (!element || element.classList.contains('anti-slop-faded')) return;

  element.classList.add('anti-slop-faded');
  element.setAttribute('data-anti-slop', reason);
  element.style.opacity = '0.3';
  element.style.filter = 'grayscale(80%)';
  element.style.transition = 'opacity 0.3s ease, filter 0.3s ease';
}

// Unfade element (restore visibility)
function unfadeElement(element) {
  if (!element) return;

  element.classList.remove('anti-slop-faded');
  element.removeAttribute('data-anti-slop');
  element.style.opacity = '';
  element.style.filter = '';
  element.style.transition = '';
}

function showBlockedNotification(message = 'Spam/AI-generated content has been blocked') {
  const now = Date.now();
  if (now - _lastBlockedNotificationAt < BLOCK_NOTIFICATION_COOLDOWN_MS) {
    return;
  }
  _lastBlockedNotificationAt = now;

  const existing = document.getElementById('anti-slop-hard-block-toast');
  if (existing) {
    existing.textContent = message;
    return;
  }

  const notification = document.createElement('div');
  notification.id = 'anti-slop-hard-block-toast';
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 16px;
    right: 16px;
    background: #111827;
    color: #fff;
    border: 1px solid #374151;
    padding: 10px 14px;
    border-radius: 8px;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 12px;
    font-weight: 600;
    z-index: 2147483647;
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35);
  `;

  const mountTarget = document.body || document.documentElement;
  mountTarget.appendChild(notification);

  setTimeout(() => {
    notification.remove();
  }, 2200);
}

// Check if element is already processed
function isProcessed(element) {
  return element.hasAttribute('data-anti-slop-processed');
}

// Mark element as processed
function markProcessed(element) {
  element.setAttribute('data-anti-slop-processed', 'true');
}

// Safe query selector with error handling
function safeQuerySelectorAll(selector, context = document) {
  try {
    return context.querySelectorAll(selector);
  } catch (e) {
    console.warn(`[Anti-Slop] Invalid selector: ${selector}`, e);
    return [];
  }
}

// Safe storage wrapper with fallback
const safeStorage = {
  _fallbackSettings: null,
  
  async getSettings() {
    try {
      return await storageManager.getSettings();
    } catch (error) {
      logError('Common', 'Storage get failed, using fallback', error);
      if (!this._fallbackSettings) {
        this._fallbackSettings = {
          youtube: { enabled: true, sensitivity: 'medium' },
          instagram: { enabled: true, sensitivity: 'medium' },
          twitter: { enabled: true, sensitivity: 'medium' },
          reddit: { enabled: true, sensitivity: 'medium' },
          google: { enabled: true, sensitivity: 'medium' },
          linkedin: { enabled: true, sensitivity: 'medium' },
          tiktok: { enabled: true, sensitivity: 'medium' },
          facebook: { enabled: true, sensitivity: 'medium' },
          bluesky: { enabled: true, sensitivity: 'medium' },
          threads: { enabled: true, sensitivity: 'medium' },
          aiDetector: { enabled: true, mode: 'warn', threshold: 65 },
          ui: { showPlaceholders: true, detectAIMedia: true, mediaSensitivity: 'medium' }
        };
      }
      return this._fallbackSettings;
    }
  },
  
  async getStats() {
    try {
      return await storageManager.getStats();
    } catch (error) {
      logError('Common', 'Storage stats get failed', error);
      return { totalBlocked: 0, blockedByPlatform: {} };
    }
  }
};

// Wait for element to appear in DOM
function waitForElement(selector, timeout = 5000) {
  return new Promise((resolve) => {
    const element = document.querySelector(selector);
    if (element) {
      resolve(element);
      return;
    }

    const observer = new MutationObserver(() => {
      const element = document.querySelector(selector);
      if (element) {
        observer.disconnect();
        resolve(element);
      }
    });

    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true
    });

    setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeout);
  });
}

// Create mutation observer with debouncing
function createDebouncedObserver(callback, delay = 300) {
  const debouncedCallback = debounce(callback, delay);
  
  const observer = new MutationObserver((mutations) => {
    debouncedCallback(mutations);
  });

  return {
    observer,
    start: (target = document.body) => {
      observer.observe(target, {
        childList: true,
        subtree: true
      });
    },
    stop: () => {
      observer.disconnect();
    }
  };
}

// Get readable text content from element
function getTextContent(element) {
  if (!element) return '';
  
  // Clone to avoid modifying original
  const clone = element.cloneNode(true);
  
  // Remove script and style tags
  clone.querySelectorAll('script, style, noscript').forEach(el => el.remove());
  
  return clone.textContent.trim();
}

// Count words in text
function countWords(text) {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

// Extract text without line numbers or special characters
function cleanText(text) {
  return text
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Log message with platform prefix
function log(platform, message, ...args) {
  console.log(`[Anti-Slop:${platform}]`, message, ...args);
}

// Error logging
function logError(platform, message, error) {
  console.error(`[Anti-Slop:${platform}] ERROR:`, message, error);
}

// Send message to background script
async function sendToBackground(action, data = {}) {
  try {
    return await chrome.runtime.sendMessage({ action, data });
  } catch (error) {
    logError('Common', 'Failed to send message to background', error);
    return null;
  }
}

// Increment block counter (sends to background)
async function incrementBlockCounter(platform, count = 1) {
  try {
    await storageManager.incrementBlocked(platform, count);
  } catch (error) {
    logError(platform, 'Failed to increment counter', error);
  }
}

// Check if extension is enabled for platform
async function isPlatformEnabled(platform) {
  try {
    const enabled = await storageManager.isPlatformEnabled(platform);
    return enabled;
  } catch (error) {
    logError(platform, 'Failed to check if enabled', error);
    return false;
  }
}

// Set placeholder mode (called by platform scripts during init)
function setPlaceholderMode(enabled) {
  _showPlaceholders = !!enabled;
}

// Load placeholder setting from storage (call once during init)
async function loadPlaceholderSetting() {
  try {
    const settings = await storageManager.getSettings();
    _showPlaceholders = settings.ui?.showPlaceholders !== false;
  } catch (error) {
    _showPlaceholders = true;
  }
}

// Add CSS to page
function injectCSS(css) {
  const style = document.createElement('style');
  style.textContent = css;
  (document.head || document.documentElement).appendChild(style);
}

function createMediaWarningBadge(element, data = {}) {
  if (!element) {
    return false;
  }

  const existing = element.querySelector('.anti-slop-media-badge');

  const badge = existing || document.createElement('div');
  badge.className = 'anti-slop-media-badge';
  const score = data.score || 0;
  const reasons = Array.isArray(data.reasons) ? data.reasons.join(', ') : '';
  badge.textContent = `AI-likely media ${score}%`;
  badge.title = reasons ? `Signals: ${reasons}` : 'AI-like media signals detected';
  badge.style.cssText = `
    position: absolute;
    top: 8px;
    left: 8px;
    z-index: 9999;
    padding: 4px 8px;
    border-radius: 999px;
    background: rgba(17, 24, 39, 0.88);
    color: #f9fafb;
    border: 1px solid rgba(245, 158, 11, 0.45);
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 11px;
    font-weight: 700;
    line-height: 1;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    pointer-events: none;
  `;

  const computed = window.getComputedStyle(element);
  if (computed.position === 'static') {
    element.style.position = 'relative';
  }

  if (!existing) {
    element.appendChild(badge);
  }

  element.setAttribute('data-anti-slop-media-warned', 'true');
  element.setAttribute('data-anti-slop-media-score', String(score));

  return !existing;
}

async function incrementMediaWarningCounter(count = 1) {
  try {
    if (storageManager?.incrementAIMediaWarnings) {
      await storageManager.incrementAIMediaWarnings(count);
    }
  } catch (error) {
    logError('Common', 'Failed to increment AI media warnings', error);
  }
}

// Global site indicator - floating widget on all websites
// Shows AI detection status and quick actions
function createGlobalSiteIndicator(platform, stats) {
  if (document.getElementById('anti-slop-global-indicator')) return;

  const indicator = document.createElement('div');
  indicator.id = 'anti-slop-global-indicator';
  indicator.className = 'anti-slop-global-indicator';

  const domain = window.location.hostname.replace(/^www\./, '');
  const blockedCount = stats?.blocked || 0;
  const isActive = stats?.enabled !== false;

  indicator.innerHTML = `
    <div class="anti-slop-indicator-header">
      <span class="anti-slop-indicator-icon">&#x1F6E1;</span>
      <span class="anti-slop-indicator-title">Anti-Slop</span>
      <button class="anti-slop-indicator-close" id="anti-slop-close-indicator">&times;</button>
    </div>
    <div class="anti-slop-indicator-body">
      <div class="anti-slop-indicator-site">${domain}</div>
      <div class="anti-slop-indicator-status ${isActive ? 'active' : 'inactive'}">
        ${isActive ? `Blocked: ${blockedCount} items` : 'Protection Off'}
      </div>
    </div>
    <div class="anti-slop-indicator-actions">
      <button class="anti-slop-indicator-btn primary" id="anti-slop-toggle-site">
        ${isActive ? 'Disable for this site' : 'Enable for this site'}
      </button>
    </div>
  `;

  // Inject styles
  const style = document.createElement('style');
  style.textContent = `
    .anti-slop-global-indicator {
      position: fixed;
      bottom: 20px;
      left: 20px;
      width: 220px;
      background: #1a1a1a;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      color: #fff;
      animation: slideUp 0.3s ease;
    }
    .anti-slop-indicator-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 12px;
      border-bottom: 1px solid #333;
    }
    .anti-slop-indicator-icon {
      font-size: 16px;
    }
    .anti-slop-indicator-title {
      flex: 1;
      font-weight: 600;
      font-size: 14px;
    }
    .anti-slop-indicator-close {
      background: none;
      border: none;
      color: #888;
      font-size: 18px;
      cursor: pointer;
      padding: 0;
      line-height: 1;
    }
    .anti-slop-indicator-close:hover {
      color: #fff;
    }
    .anti-slop-indicator-body {
      padding: 12px;
    }
    .anti-slop-indicator-site {
      font-weight: 500;
      margin-bottom: 4px;
      word-break: break-all;
    }
    .anti-slop-indicator-status {
      font-size: 12px;
      color: #888;
    }
    .anti-slop-indicator-status.active {
      color: #4ade80;
    }
    .anti-slop-indicator-status.inactive {
      color: #f87171;
    }
    .anti-slop-indicator-actions {
      padding: 0 12px 12px;
    }
    .anti-slop-indicator-btn {
      width: 100%;
      padding: 8px 12px;
      border: none;
      border-radius: 6px;
      font-size: 12px;
      cursor: pointer;
      transition: background 0.2s;
    }
    .anti-slop-indicator-btn.primary {
      background: #3b82f6;
      color: #fff;
    }
    .anti-slop-indicator-btn.primary:hover {
      background: #2563eb;
    }
    @keyframes slideUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;
  document.head.appendChild(style);
  document.body.appendChild(indicator);

  // Close button
  document.getElementById('anti-slop-close-indicator').addEventListener('click', () => {
    indicator.remove();
  });

  // Toggle button
  document.getElementById('anti-slop-toggle-site').addEventListener('click', async () => {
    const domain = window.location.hostname.replace(/^www\./, '');
    try {
      await storageManager.addToWhitelist(domain);
      const btn = document.getElementById('anti-slop-toggle-site');
      const status = document.querySelector('.anti-slop-indicator-status');
      
      if (btn.textContent.includes('Disable')) {
        btn.textContent = 'Enable for this site';
        status.textContent = 'Protection Off';
        status.className = 'anti-slop-indicator-status inactive';
      } else {
        btn.textContent = 'Disable for this site';
        status.textContent = `Blocked: ${blockedCount} items`;
        status.className = 'anti-slop-indicator-status active';
      }
    } catch (err) {
      logError('GlobalIndicator', 'Failed to toggle site', err);
    }
  });
}

// Create visual feedback overlay (optional feature)
function createBlockNotification(count, platform) {
  const notification = document.createElement('div');
  notification.className = 'anti-slop-notification';
  notification.textContent = `Anti-Slop: Blocked ${count} ${platform} items`;
  notification.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: #FF4444;
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 14px;
    font-weight: 500;
    z-index: 999999;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    animation: slideIn 0.3s ease-out;
  `;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Export utilities
if (typeof window !== 'undefined') {
  window.AntiSlopUtils = {
    debounce,
    throttle,
    runWhenIdle,
    hideElement,
    showElement,
    fadeElement,
    unfadeElement,
    isProcessed,
    markProcessed,
    safeQuerySelectorAll,
    waitForElement,
    createDebouncedObserver,
    getTextContent,
    countWords,
    cleanText,
    log,
    logError,
    sendToBackground,
    incrementBlockCounter,
    isPlatformEnabled,
    injectCSS,
    createMediaWarningBadge,
    incrementMediaWarningCounter,
    showBlockedNotification,
    createBlockNotification,
    createGlobalSiteIndicator,
    safeStorage,
    setPlaceholderMode,
    loadPlaceholderSetting
  };

  // Auto-load placeholder setting so hideElement can use it immediately
  loadPlaceholderSetting();
}
