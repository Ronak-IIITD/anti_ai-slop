// Common utilities for all content scripts
// Shared functions to reduce code duplication

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

// Hide element with anti-slop styling
function hideElement(element, reason = 'slop') {
  if (!element || element.classList.contains('anti-slop-hidden')) return;

  const isTikTokBlock = reason === 'feed-blocked' || reason === 'video-blocked';
  const shouldShowPlaceholder = !isTikTokBlock;

  const finalizeHide = () => {
    element.classList.add('anti-slop-hidden');
    element.setAttribute('data-anti-slop', reason);
    element.style.display = 'none';
  };

  if (!shouldShowPlaceholder) {
    finalizeHide();
    return;
  }

  try {
    if (!chrome?.storage?.sync?.get) {
      finalizeHide();
      return;
    }

    chrome.storage.sync.get(['antiSlop_settings'], (result) => {
      const settings = result.antiSlop_settings || {};
      const showPlaceholders = settings.ui?.showPlaceholders ?? true;

      if (!showPlaceholders) {
        finalizeHide();
        return;
      }

      const placeholder = document.createElement('div');
      placeholder.className = 'anti-slop-blocked-placeholder';
      const safeReason = reason.replace(/[<>&"']/g, (char) => {
        const map = {
          '<': '&lt;',
          '>': '&gt;',
          '&': '&amp;',
          '"': '&quot;',
          "'": '&#39;'
        };
        return map[char];
      });
      placeholder.innerHTML = `
        <div class="anti-slop-reason">Blocked: ${safeReason}</div>
        <button class="anti-slop-show-btn" type="button">Show Content</button>
      `;

      const parent = element.parentNode;
      if (parent) {
        parent.insertBefore(placeholder, element);
      }

      finalizeHide();

      const button = placeholder.querySelector('.anti-slop-show-btn');
      if (button) {
        button.addEventListener('click', (event) => {
          event.stopPropagation();
          element.style.display = '';
          element.classList.remove('anti-slop-hidden');
          element.classList.add('anti-slop-revealed');
          placeholder.remove();
        });
      }
    });
  } catch (error) {
    finalizeHide();
  }
}

// Show element (for toggling)
function showElement(element) {
  if (!element) return;
  
  element.classList.remove('anti-slop-hidden');
  element.removeAttribute('data-anti-slop');
  element.style.display = '';
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

    observer.observe(document.body, {
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

  return observer;
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

// Add CSS to page
function injectCSS(css) {
  const style = document.createElement('style');
  style.textContent = css;
  (document.head || document.documentElement).appendChild(style);
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
    hideElement,
    showElement,
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
    createBlockNotification
  };
}
