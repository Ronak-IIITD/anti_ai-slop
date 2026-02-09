// AI-Generated Content Detector v2
// Warning-first approach: shows dismissible banner instead of blocking by default
// Supports modes: 'warn' (banner), 'block' (hide content), 'off' (disabled)

(async function () {
  'use strict';

  const { log, logError, hideElement, isProcessed, markProcessed, incrementBlockCounter, isPlatformEnabled } = window.AntiSlopUtils;

  const PLATFORM = 'AI-Detector';
  let isEnabled = false;
  let mode = 'warn'; // 'warn', 'block', 'off'
  let threshold = 65;
  let hasAnalyzed = false;

  // ============================================================
  // INITIALIZATION
  // ============================================================

  async function init() {
    isEnabled = await isPlatformEnabled('aiDetector');

    if (!isEnabled) {
      log(PLATFORM, 'Disabled in settings');
      notifyBackground('disabled');
      return;
    }

    // Load settings
    const settings = await storageManager.getSettings();
    const aiSettings = settings.aiDetector || {};

    mode = aiSettings.mode || 'warn';
    threshold = aiPatternDetector.getSensitivityThreshold(
      aiSettings.sensitivity || 'medium'
    );

    if (mode === 'off') {
      log(PLATFORM, 'Mode is off, skipping');
      notifyBackground('disabled');
      return;
    }

    log(PLATFORM, `Initializing... (mode: ${mode}, threshold: ${threshold})`);

    // Check if domain is whitelisted (using new storage-based whitelist)
    const domain = window.location.hostname;
    const isWhitelisted = await storageManager.isDomainWhitelisted(domain);
    if (isWhitelisted) {
      log(PLATFORM, `Domain "${domain}" is whitelisted, skipping`);
      notifyBackground('whitelisted');
      return;
    }

    // Wait for page to load before analyzing
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        // Delay to let dynamic content load
        setTimeout(analyzeContent, 1500);
      });
    } else {
      setTimeout(analyzeContent, 1500);
    }
  }

  // ============================================================
  // CONTENT ANALYSIS
  // ============================================================

  async function analyzeContent() {
    if (hasAnalyzed) return;
    hasAnalyzed = true;

    try {
      // Extract article content
      const articleText = aiPatternDetector.extractArticleText(document);

      if (!articleText || articleText.length < 100) {
        log(PLATFORM, 'No significant content found, skipping analysis');
        notifyBackground('clean');
        return;
      }

      // Analyze content - v2 returns { score, reasons, contentType }
      const result = aiPatternDetector.analyzeSlopScore(articleText, document);
      const { score, reasons, contentType } = result;

      log(PLATFORM, `Analysis complete - Score: ${score}/100, Type: ${contentType}, Reasons: [${reasons.join(', ')}]`);

      // Check if should take action
      if (aiPatternDetector.shouldBlock(score, threshold)) {
        const title = aiPatternDetector.extractTitle(document);

        // Log to recent blocks
        try {
          await storageManager.addRecentBlock({
            url: window.location.href,
            title: title || document.title,
            score: score
          });
        } catch (err) {
          logError(PLATFORM, 'Failed to log recent block', err);
        }

        if (mode === 'block') {
          // Hard block - hide content and show full-page overlay
          blockPage(score, reasons, contentType);
          await incrementBlockCounter('aiArticles', 1);
          notifyBackground('blocked', score);
          log(PLATFORM, `Page BLOCKED (score: ${score}, mode: block)`);
        } else {
          // Warn mode - show dismissible banner at top
          showWarningBanner(score, reasons, contentType);
          await incrementBlockCounter('aiArticles', 1);
          notifyBackground('warned', score);
          log(PLATFORM, `Page WARNED (score: ${score}, mode: warn)`);
        }
      } else {
        log(PLATFORM, `Page allowed (score: ${score})`);
        notifyBackground('clean');
      }
    } catch (error) {
      logError(PLATFORM, 'Error analyzing content', error);
      notifyBackground('error');
    }
  }

  // ============================================================
  // WARNING BANNER (default mode)
  // Shows a dismissible banner at the top of the page
  // ============================================================

  function showWarningBanner(score, reasons, contentType) {
    // Don't add multiple banners
    if (document.getElementById('anti-slop-warning-banner')) return;

    const reasonText = _formatReasons(reasons);

    const banner = document.createElement('div');
    banner.id = 'anti-slop-warning-banner';
    banner.className = 'anti-slop-warning-banner';
    banner.innerHTML = `
      <div class="anti-slop-banner-content">
        <div class="anti-slop-banner-icon">&#x26A0;</div>
        <div class="anti-slop-banner-text">
          <strong>Possible AI-generated content detected</strong>
          <span class="anti-slop-banner-details">
            Score: ${score}/100 &middot; Type: ${contentType} &middot; ${reasonText}
          </span>
        </div>
        <div class="anti-slop-banner-actions">
          <button class="anti-slop-banner-btn anti-slop-btn-whitelist" id="anti-slop-whitelist-site">
            Trust this site
          </button>
          <button class="anti-slop-banner-btn anti-slop-btn-dismiss" id="anti-slop-dismiss-banner">
            Dismiss
          </button>
        </div>
      </div>
    `;

    // Insert at top of body
    document.body.insertBefore(banner, document.body.firstChild);

    // Push page content down
    document.body.style.marginTop = (banner.offsetHeight || 48) + 'px';

    // Event: Dismiss banner
    document.getElementById('anti-slop-dismiss-banner').addEventListener('click', () => {
      _removeBanner(banner);
    });

    // Event: Whitelist this site
    document.getElementById('anti-slop-whitelist-site').addEventListener('click', async () => {
      const domain = window.location.hostname.replace(/^www\./, '');
      try {
        await storageManager.addToWhitelist(domain);
        log(PLATFORM, `Added "${domain}" to whitelist`);
        _removeBanner(banner);
        _showQuickToast(`${domain} added to whitelist`);
      } catch (err) {
        logError(PLATFORM, 'Failed to whitelist domain', err);
      }
    });
  }

  // ============================================================
  // BLOCK MODE (full-page overlay)
  // Hides content and shows blocking message
  // ============================================================

  function blockPage(score, reasons, contentType) {
    // Find and hide main content
    const contentSelectors = [
      'article',
      'main',
      '[role="main"]',
      '.post-content',
      '.article-content',
      '.entry-content',
      '#content',
      '.content'
    ];

    let blocked = false;
    for (const selector of contentSelectors) {
      const element = document.querySelector(selector);
      if (element && !isProcessed(element)) {
        hideElement(element, `ai-slop-${score}`);
        markProcessed(element);
        blocked = true;
        break;
      }
    }

    if (!blocked) {
      document.body.style.display = 'none';
    }

    // Show blocking overlay
    const reasonText = _formatReasons(reasons);

    const overlay = document.createElement('div');
    overlay.id = 'anti-slop-block-overlay';
    overlay.className = 'anti-slop-block-overlay';
    overlay.innerHTML = `
      <div class="anti-slop-block-card">
        <div class="anti-slop-block-shield">&#x1F6E1;</div>
        <h1 class="anti-slop-block-title">AI-Generated Content Detected</h1>
        <p class="anti-slop-block-subtitle">
          This article has been identified as likely AI-generated slop content.
        </p>
        <div class="anti-slop-block-score-box">
          <p class="anti-slop-block-score">
            <strong>Slop Score:</strong> ${score}/100
          </p>
          <p class="anti-slop-block-meta">
            Content type: ${contentType} &middot; Threshold: ${threshold} (${_getSensitivityLabel()})
          </p>
          <p class="anti-slop-block-reasons">${reasonText}</p>
        </div>
        <div class="anti-slop-block-actions">
          <button class="anti-slop-block-btn anti-slop-block-btn-primary" id="anti-slop-view-anyway">
            View Anyway
          </button>
          <button class="anti-slop-block-btn anti-slop-block-btn-secondary" id="anti-slop-go-back">
            Go Back
          </button>
          <button class="anti-slop-block-btn anti-slop-block-btn-tertiary" id="anti-slop-block-whitelist">
            Trust This Site
          </button>
        </div>
        <p class="anti-slop-block-hint">
          Adjust settings in the Anti-Slop extension popup
        </p>
      </div>
    `;

    document.body.appendChild(overlay);
    // Ensure body is visible for the overlay
    if (!blocked) {
      document.body.style.display = '';
    }

    // Event: View anyway
    document.getElementById('anti-slop-view-anyway').addEventListener('click', () => {
      overlay.remove();
      // Restore hidden content
      document.querySelectorAll('[data-anti-slop-processed]').forEach(el => {
        el.style.display = '';
        el.classList.remove('anti-slop-hidden');
      });
      document.body.style.display = '';
    });

    // Event: Go back
    document.getElementById('anti-slop-go-back').addEventListener('click', () => {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.close();
      }
    });

    // Event: Whitelist
    document.getElementById('anti-slop-block-whitelist').addEventListener('click', async () => {
      const domain = window.location.hostname.replace(/^www\./, '');
      try {
        await storageManager.addToWhitelist(domain);
        log(PLATFORM, `Added "${domain}" to whitelist`);
        overlay.remove();
        document.querySelectorAll('[data-anti-slop-processed]').forEach(el => {
          el.style.display = '';
          el.classList.remove('anti-slop-hidden');
        });
        document.body.style.display = '';
        _showQuickToast(`${domain} added to whitelist`);
      } catch (err) {
        logError(PLATFORM, 'Failed to whitelist domain', err);
      }
    });
  }

  // ============================================================
  // HELPERS
  // ============================================================

  /**
   * Remove the warning banner and restore page layout
   */
  function _removeBanner(banner) {
    document.body.style.marginTop = '';
    banner.remove();
  }

  /**
   * Format reason codes into readable text
   */
  function _formatReasons(reasons) {
    if (!reasons || reasons.length === 0) return '';
    const readable = reasons.map(r => r.replace(/-/g, ' ')).join(', ');
    return readable.charAt(0).toUpperCase() + readable.slice(1);
  }

  /**
   * Get human-readable sensitivity label
   */
  function _getSensitivityLabel() {
    if (threshold >= 80) return 'Low Sensitivity';
    if (threshold >= 60) return 'Medium Sensitivity';
    return 'High Sensitivity';
  }

  /**
   * Show a quick toast notification on the page
   */
  function _showQuickToast(message) {
    const toast = document.createElement('div');
    toast.className = 'anti-slop-toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('anti-slop-toast-hide');
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }

  /**
   * Notify background script of current page status
   * Used for icon badge updates
   */
  function notifyBackground(status, score = 0) {
    try {
      chrome.runtime.sendMessage({
        action: 'aiDetectorStatus',
        data: { status, score, url: window.location.href }
      });
    } catch (err) {
      // Background may not be ready yet; non-critical
    }
  }

  // ============================================================
  // SETTINGS CHANGE LISTENER
  // ============================================================

  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync' && changes.antiSlop_settings) {
      const newSettings = changes.antiSlop_settings.newValue;
      const wasEnabled = isEnabled;
      const oldMode = mode;

      isEnabled = newSettings?.aiDetector?.enabled ?? false;
      mode = newSettings?.aiDetector?.mode || 'warn';

      if (wasEnabled !== isEnabled || oldMode !== mode) {
        log(PLATFORM, `Settings changed: enabled=${isEnabled}, mode=${mode}`);
        location.reload();
      }
    }
  });

  // ============================================================
  // START
  // ============================================================

  init();

})();
