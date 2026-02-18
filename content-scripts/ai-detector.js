// AI-Generated Content Detector v3
// Hard-block approach: blocks detected AI slop and only shows a lightweight notification

(async function () {
  'use strict';

  const { log, logError, hideElement, isProcessed, markProcessed, incrementBlockCounter, isPlatformEnabled, showBlockedNotification } = window.AntiSlopUtils;

  const PLATFORM = 'AI-Detector';
  let isEnabled = false;
  let mode = 'block'; // forced: 'block' unless user explicitly sets 'off'
  let threshold = 65;
  let hasAnalyzed = false;
  let customRules = {
    enabled: true,
    blockKeywords: [],
    allowKeywords: []
  };

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
    customRules = _parseCustomRules(settings.customRules || {});

    mode = aiSettings.mode === 'off' ? 'off' : 'block';
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
      const customSignal = _evaluateCustomRules(articleText);
      const adjustedScore = Math.max(0, Math.min(100, score + customSignal.scoreDelta));
      const adjustedReasons = [...reasons];

      if (customSignal.blockMatches.length > 0) {
        adjustedReasons.push('custom-block-keyword');
      }
      if (customSignal.allowMatches.length > 0) {
        adjustedReasons.push('custom-allow-keyword');
      }

      log(PLATFORM, `Analysis complete - Score: ${adjustedScore}/100, Type: ${contentType}, Reasons: [${adjustedReasons.join(', ')}]`);

      // Check if should take action
      if (aiPatternDetector.shouldBlock(adjustedScore, threshold)) {
        const title = aiPatternDetector.extractTitle(document);

        // Log to recent blocks
        try {
          await storageManager.addRecentBlock({
            url: window.location.href,
            title: title || document.title,
            score: adjustedScore
          });
        } catch (err) {
          logError(PLATFORM, 'Failed to log recent block', err);
        }

        blockPage(adjustedScore, adjustedReasons, contentType);
        await incrementBlockCounter('aiArticles', 1);
        notifyBackground('blocked', adjustedScore);
        log(PLATFORM, `Page BLOCKED (score: ${adjustedScore}, mode: block)`);
      } else {
        log(PLATFORM, `Page allowed (score: ${adjustedScore})`);
        notifyBackground('clean');
      }
    } catch (error) {
      logError(PLATFORM, 'Error analyzing content', error);
      notifyBackground('error');
    }
  }

  // ============================================================
  // BLOCK MODE
  // Hides content and shows a lightweight notification only
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
      document.querySelectorAll(selector).forEach(element => {
        if (!isProcessed(element)) {
          hideElement(element, `ai-slop-${score}`);
          markProcessed(element);
          blocked = true;
        }
      });
    }

    if (!blocked && document.body) {
      const topLevelElements = Array.from(document.body.children).filter(el =>
        !el.id?.startsWith('anti-slop-') &&
        el.tagName !== 'SCRIPT' &&
        el.tagName !== 'STYLE'
      );

      topLevelElements.forEach(element => {
        hideElement(element, `ai-slop-${score}`);
        markProcessed(element);
      });
    }

    const reasonText = _formatReasons(reasons) || 'spam/generated by ai';
    showBlockedNotification(`This content was ${reasonText} and has been blocked.`);
  }

  // ============================================================
  // HELPERS
  // ============================================================

  /**
   * Format reason codes into readable text
   */
  function _formatReasons(reasons) {
    if (!reasons || reasons.length === 0) return '';
    const readable = reasons.map(r => r.replace(/-/g, ' ')).join(', ');
    return readable.charAt(0).toUpperCase() + readable.slice(1);
  }

  function _parseCustomRules(rules) {
    return {
      enabled: rules.enabled !== false,
      blockKeywords: _normalizeKeywordList(rules.blockKeywords),
      allowKeywords: _normalizeKeywordList(rules.allowKeywords)
    };
  }

  function _normalizeKeywordList(list) {
    if (!Array.isArray(list)) {
      return [];
    }

    return Array.from(
      new Set(
        list
          .map(item => String(item).trim().toLowerCase())
          .filter(item => item.length >= 3)
      )
    ).slice(0, 100);
  }

  function _evaluateCustomRules(text) {
    if (!customRules.enabled || !text) {
      return { scoreDelta: 0, blockMatches: [], allowMatches: [] };
    }

    const normalized = String(text).toLowerCase();
    const blockMatches = customRules.blockKeywords.filter(keyword => normalized.includes(keyword));
    const allowMatches = customRules.allowKeywords.filter(keyword => normalized.includes(keyword));

    let scoreDelta = 0;
    if (blockMatches.length > 0) {
      scoreDelta += 20 + Math.min((blockMatches.length - 1) * 10, 25);
    }
    if (allowMatches.length > 0) {
      scoreDelta -= 25 + Math.min((allowMatches.length - 1) * 10, 25);
    }

    return {
      scoreDelta,
      blockMatches,
      allowMatches
    };
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
      mode = newSettings?.aiDetector?.mode === 'off' ? 'off' : 'block';
      customRules = _parseCustomRules(newSettings?.customRules || {});

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
