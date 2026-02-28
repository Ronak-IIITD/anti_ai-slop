// AI-Generated Content Detector v4
// Confidence-tiered UX: interstitial / warning banner / subtle badge
// Smart warnings with score breakdown, phrase highlighting, and user actions
// Updated as of 2026-03-01

(async function () {
  'use strict';

  const { log, logError, hideElement, showElement, isProcessed, markProcessed, incrementBlockCounter, isPlatformEnabled, showBlockedNotification } = window.AntiSlopUtils;

  const PLATFORM = 'AI-Detector';
  let isEnabled = false;
  let mode = 'warn'; // 'warn' (default), 'block', or 'off'
  let threshold = 65;
  let hasAnalyzed = false;
  let customRules = {
    enabled: true,
    blockKeywords: [],
    allowKeywords: []
  };

  // Confidence tiers
  const TIER = {
    HIGH: 'high',       // score >= 75: full interstitial
    MEDIUM: 'medium',   // score >= threshold: warning banner
    LOW: 'low'          // score >= 30: subtle badge
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

    mode = aiSettings.mode || 'warn';
    if (mode === 'off') {
      log(PLATFORM, 'Mode is off, skipping');
      notifyBackground('disabled');
      return;
    }

    threshold = aiPatternDetector.getSensitivityThreshold(
      aiSettings.sensitivity || 'medium'
    );

    log(PLATFORM, `Initializing... (mode: ${mode}, threshold: ${threshold})`);

    // Check if domain is whitelisted
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

      // Analyze content - v3 returns { score, reasons, contentType, breakdown }
      const result = aiPatternDetector.analyzeSlopScore(articleText, document);
      const { score, reasons, contentType, breakdown } = result;
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

      // Get matched phrases for highlighting
      const matchedPhrases = aiPatternDetector.getAllMatchedPhrases(articleText);

      // Determine confidence tier
      const tier = _getConfidenceTier(adjustedScore);
      const title = aiPatternDetector.extractTitle(document);

      if (tier === TIER.HIGH && adjustedScore >= threshold) {
        // HIGH confidence: full interstitial overlay
        _logBlock(title, adjustedScore);
        _showInterstitial(adjustedScore, adjustedReasons, contentType, breakdown, matchedPhrases);
        await incrementBlockCounter('aiArticles', 1);
        notifyBackground('blocked', adjustedScore);
        log(PLATFORM, `Page INTERSTITIAL (score: ${adjustedScore}, tier: high)`);

      } else if (tier === TIER.MEDIUM && adjustedScore >= threshold) {
        // MEDIUM confidence: warning banner at top
        _logBlock(title, adjustedScore);
        _showWarningBanner(adjustedScore, adjustedReasons, contentType, matchedPhrases);
        _highlightAIPhrases(matchedPhrases);
        await incrementBlockCounter('aiArticles', 1);
        notifyBackground('warned', adjustedScore);
        log(PLATFORM, `Page WARNED (score: ${adjustedScore}, tier: medium)`);

      } else if (adjustedScore >= 30) {
        // LOW confidence: subtle inline badge
        _showSubtleBadge(adjustedScore, adjustedReasons);
        _highlightAIPhrases(matchedPhrases);
        notifyBackground('clean');
        log(PLATFORM, `Page BADGE (score: ${adjustedScore}, tier: low)`);

      } else {
        log(PLATFORM, `Page clean (score: ${adjustedScore})`);
        notifyBackground('clean');
      }

    } catch (error) {
      logError(PLATFORM, 'Error analyzing content', error);
      notifyBackground('error');
    }
  }

  /**
   * Determine confidence tier based on score
   */
  function _getConfidenceTier(score) {
    if (score >= 75) return TIER.HIGH;
    if (score >= threshold) return TIER.MEDIUM;
    return TIER.LOW;
  }

  // ============================================================
  // TIER 1: FULL INTERSTITIAL (High Confidence - score >= 75)
  // Rich overlay with score breakdown, reasons, and all actions
  // ============================================================

  function _showInterstitial(score, reasons, contentType, breakdown, matchedPhrases) {
    // Hide page content
    const contentSelectors = [
      'article', 'main', '[role="main"]', '.post-content',
      '.article-content', '.entry-content', '#content', '.content'
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
      Array.from(document.body.children).filter(el =>
        !el.id?.startsWith('anti-slop-') &&
        el.tagName !== 'SCRIPT' && el.tagName !== 'STYLE'
      ).forEach(element => {
        hideElement(element, `ai-slop-${score}`);
        markProcessed(element);
      });
    }

    // Build breakdown HTML
    const breakdownHTML = _buildBreakdownHTML(breakdown);
    const reasonTags = _buildReasonTags(reasons);
    const scoreColor = score >= 80 ? 'var(--as-danger)' : 'var(--as-warning)';
    const domain = window.location.hostname.replace(/^www\./, '');

    const overlay = document.createElement('div');
    overlay.id = 'anti-slop-interstitial';
    overlay.className = 'anti-slop-block-overlay';
    overlay.innerHTML = `
      <div class="anti-slop-block-card">
        <div class="anti-slop-block-shield">&#x1F6E1;</div>
        <h1 class="anti-slop-block-title">AI-Generated Content Detected</h1>
        <p class="anti-slop-block-subtitle">
          This page has been flagged with <strong>high confidence</strong> as AI-generated slop.
          It may lack original insight, contain filler, or be auto-generated for SEO.
        </p>

        <div class="anti-slop-score-visual">
          <div class="anti-slop-score-bar-bg">
            <div class="anti-slop-score-bar-fill" style="width: ${score}%; background: ${scoreColor};"></div>
          </div>
          <div class="anti-slop-score-label">
            <span class="anti-slop-score-number" style="color: ${scoreColor};">${score}</span>
            <span class="anti-slop-score-max">/100 AI Score</span>
          </div>
        </div>

        <div class="anti-slop-reason-tags">${reasonTags}</div>

        <details class="anti-slop-breakdown-details">
          <summary class="anti-slop-breakdown-toggle">Score Breakdown</summary>
          <div class="anti-slop-breakdown-content">${breakdownHTML}</div>
        </details>

        <div class="anti-slop-block-actions">
          <button class="anti-slop-block-btn anti-slop-block-btn-primary" id="anti-slop-go-back">
            &#x2190; Go Back
          </button>
          <button class="anti-slop-block-btn anti-slop-block-btn-secondary" id="anti-slop-view-anyway">
            View Anyway
          </button>
        </div>
        <div class="anti-slop-block-actions-secondary">
          <button class="anti-slop-block-btn anti-slop-block-btn-tertiary" id="anti-slop-whitelist-site">
            Always allow ${domain}
          </button>
        </div>
        <p class="anti-slop-block-hint">
          Detected as: <strong>${contentType}</strong> &middot; Anti-Slop AI Detector v4
        </p>
      </div>
    `;

    const mountTarget = document.body || document.documentElement;
    mountTarget.appendChild(overlay);

    // Event handlers
    document.getElementById('anti-slop-go-back').addEventListener('click', () => {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.close();
      }
    });

    document.getElementById('anti-slop-view-anyway').addEventListener('click', () => {
      _dismissInterstitial(score, matchedPhrases);
    });

    document.getElementById('anti-slop-whitelist-site').addEventListener('click', async () => {
      try {
        await storageManager.addToWhitelist(domain);
        _dismissInterstitial(score, matchedPhrases);
        showBlockedNotification(`${domain} has been whitelisted. It won't be scanned again.`);
      } catch (err) {
        logError(PLATFORM, 'Failed to whitelist', err);
      }
    });
  }

  function _dismissInterstitial(score, matchedPhrases) {
    // Remove overlay
    const overlay = document.getElementById('anti-slop-interstitial');
    if (overlay) overlay.remove();

    // Restore hidden content
    document.querySelectorAll('[data-anti-slop*="ai-slop"]').forEach(el => {
      showElement(el);
    });

    // Show warning banner instead (downgrade to warn)
    _showWarningBanner(score, [], '', matchedPhrases, true);
    _highlightAIPhrases(matchedPhrases);
  }

  // ============================================================
  // TIER 2: WARNING BANNER (Medium Confidence)
  // Top-of-page banner with actions
  // ============================================================

  function _showWarningBanner(score, reasons, contentType, matchedPhrases, isDismissed = false) {
    if (document.getElementById('anti-slop-warning-banner')) return;

    const scoreColor = score >= 75 ? 'var(--as-danger)' : 'var(--as-warning)';
    const confidenceText = score >= 75 ? 'High' : score >= 55 ? 'Medium' : 'Low';
    const domain = window.location.hostname.replace(/^www\./, '');
    const phraseCount = matchedPhrases.length;
    const phraseText = phraseCount > 0
      ? `${phraseCount} AI-typical phrase${phraseCount > 1 ? 's' : ''} detected.`
      : '';

    const banner = document.createElement('div');
    banner.id = 'anti-slop-warning-banner';
    banner.className = 'anti-slop-warning-banner';
    banner.innerHTML = `
      <div class="anti-slop-banner-content">
        <div class="anti-slop-banner-icon">&#x26A0;</div>
        <div class="anti-slop-banner-text">
          <strong>AI-Generated Content Warning</strong>
          <span class="anti-slop-banner-details">
            Confidence: <strong style="color: ${scoreColor};">${confidenceText} (${score}/100)</strong>
            ${phraseText ? '&middot; ' + phraseText : ''}
            ${isDismissed ? '&middot; <em>You chose to view this page.</em>' : ''}
          </span>
        </div>
        <div class="anti-slop-banner-actions">
          <button class="anti-slop-banner-btn anti-slop-btn-highlight" id="anti-slop-toggle-highlights" title="Toggle AI phrase highlights">
            &#x1F50D; Highlights ${phraseCount > 0 ? 'On' : ''}
          </button>
          <button class="anti-slop-banner-btn anti-slop-btn-whitelist" id="anti-slop-banner-whitelist" title="Never scan this site">
            Trust ${domain}
          </button>
          <button class="anti-slop-banner-btn anti-slop-btn-dismiss" id="anti-slop-banner-dismiss" title="Dismiss">
            &#x2715;
          </button>
        </div>
      </div>
    `;

    const mountTarget = document.body || document.documentElement;
    mountTarget.insertBefore(banner, mountTarget.firstChild);

    // Push page content down
    document.body.style.marginTop = (banner.offsetHeight + 8) + 'px';

    // Dismiss
    document.getElementById('anti-slop-banner-dismiss').addEventListener('click', () => {
      banner.classList.add('anti-slop-banner-hiding');
      setTimeout(() => {
        banner.remove();
        document.body.style.marginTop = '';
      }, 300);
    });

    // Whitelist
    document.getElementById('anti-slop-banner-whitelist').addEventListener('click', async () => {
      try {
        await storageManager.addToWhitelist(domain);
        banner.remove();
        document.body.style.marginTop = '';
        _removeHighlights();
        _removeSubtleBadge();
        showBlockedNotification(`${domain} has been whitelisted. It won't be scanned again.`);
      } catch (err) {
        logError(PLATFORM, 'Failed to whitelist', err);
      }
    });

    // Toggle highlights
    let highlightsVisible = true;
    document.getElementById('anti-slop-toggle-highlights').addEventListener('click', () => {
      highlightsVisible = !highlightsVisible;
      const btn = document.getElementById('anti-slop-toggle-highlights');
      if (highlightsVisible) {
        _highlightAIPhrases(matchedPhrases);
        btn.innerHTML = '&#x1F50D; Highlights On';
      } else {
        _removeHighlights();
        btn.innerHTML = '&#x1F50D; Highlights Off';
      }
    });
  }

  // ============================================================
  // TIER 3: SUBTLE BADGE (Low Confidence - score 30-threshold)
  // Floating corner badge
  // ============================================================

  function _showSubtleBadge(score, reasons) {
    if (document.getElementById('anti-slop-subtle-badge')) return;

    const badge = document.createElement('div');
    badge.id = 'anti-slop-subtle-badge';
    badge.className = 'anti-slop-subtle-badge';
    badge.innerHTML = `
      <span class="anti-slop-badge-dot"></span>
      <span class="anti-slop-badge-text">AI: ${score}%</span>
      <button class="anti-slop-badge-close" id="anti-slop-badge-close">&times;</button>
    `;

    const mountTarget = document.body || document.documentElement;
    mountTarget.appendChild(badge);

    document.getElementById('anti-slop-badge-close').addEventListener('click', () => {
      badge.remove();
    });

    // Expand on hover to show more detail
    badge.addEventListener('mouseenter', () => {
      badge.classList.add('expanded');
    });
    badge.addEventListener('mouseleave', () => {
      badge.classList.remove('expanded');
    });
  }

  function _removeSubtleBadge() {
    const badge = document.getElementById('anti-slop-subtle-badge');
    if (badge) badge.remove();
  }

  // ============================================================
  // AI PHRASE HIGHLIGHTING
  // Inline underlines on detected AI phrases to educate users
  // ============================================================

  function _highlightAIPhrases(matchedPhrases) {
    if (!matchedPhrases || matchedPhrases.length === 0) return;

    // Only highlight in article content areas
    const contentSelectors = [
      'article', 'main', '[role="main"]', '.post-content',
      '.article-content', '.entry-content', '#content', '.content'
    ];

    let contentRoot = null;
    for (const selector of contentSelectors) {
      contentRoot = document.querySelector(selector);
      if (contentRoot) break;
    }
    if (!contentRoot) contentRoot = document.body;
    if (!contentRoot) return;

    // Walk text nodes and highlight matched phrases
    const walker = document.createTreeWalker(
      contentRoot,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function(node) {
          // Skip scripts, styles, and already-processed nodes
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          if (parent.tagName === 'SCRIPT' || parent.tagName === 'STYLE' ||
              parent.tagName === 'NOSCRIPT' || parent.classList.contains('anti-slop-highlight')) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    const textNodes = [];
    let node;
    while (node = walker.nextNode()) {
      textNodes.push(node);
    }

    // Sort phrases by length (longest first) to avoid partial matches
    const sortedPhrases = [...matchedPhrases].sort((a, b) => b.phrase.length - a.phrase.length);

    for (const textNode of textNodes) {
      const text = textNode.textContent;
      const textLower = text.toLowerCase();

      for (const { phrase, tier } of sortedPhrases) {
        const idx = textLower.indexOf(phrase);
        if (idx === -1) continue;

        // Split and wrap
        const before = text.substring(0, idx);
        const match = text.substring(idx, idx + phrase.length);
        const after = text.substring(idx + phrase.length);

        const span = document.createElement('span');
        span.className = `anti-slop-highlight anti-slop-highlight-${tier}`;
        span.textContent = match;
        span.title = `AI indicator (${tier})`;

        const parent = textNode.parentNode;
        if (before) parent.insertBefore(document.createTextNode(before), textNode);
        parent.insertBefore(span, textNode);
        if (after) parent.insertBefore(document.createTextNode(after), textNode);
        parent.removeChild(textNode);

        break; // One highlight per text node to avoid complications
      }
    }
  }

  function _removeHighlights() {
    document.querySelectorAll('.anti-slop-highlight').forEach(el => {
      const parent = el.parentNode;
      parent.replaceChild(document.createTextNode(el.textContent), el);
      parent.normalize(); // merge adjacent text nodes
    });
  }

  // ============================================================
  // SCORE BREAKDOWN UI HELPERS
  // ============================================================

  function _buildBreakdownHTML(breakdown) {
    if (!breakdown || Object.keys(breakdown).length === 0) {
      return '<div class="anti-slop-breakdown-empty">No detailed breakdown available</div>';
    }

    const labels = {
      phrases: 'AI Phrase Density',
      filler: 'Filler Language',
      structure: 'Writing Structure',
      quality: 'Content Quality',
      credibility: 'Credibility Signals',
      vocabulary: 'Vocabulary Diversity',
      repetition: 'Repetitive Patterns',
      templates: 'Template/List Patterns'
    };

    const maxScores = {
      phrases: 30, filler: 15, structure: 25, quality: 15,
      credibility: 15, vocabulary: 10, repetition: 10, templates: 10
    };

    let html = '';
    for (const [key, data] of Object.entries(breakdown)) {
      if (!data || data.score === undefined) continue;
      const label = labels[key] || key;
      const max = maxScores[key] || 10;
      const pct = Math.min((data.score / max) * 100, 100);
      const barColor = data.score > max * 0.6 ? 'var(--as-danger)' : data.score > max * 0.3 ? 'var(--as-warning)' : 'var(--as-success)';

      html += `
        <div class="anti-slop-breakdown-row">
          <div class="anti-slop-breakdown-label">${label}</div>
          <div class="anti-slop-breakdown-bar-bg">
            <div class="anti-slop-breakdown-bar-fill" style="width: ${pct}%; background: ${barColor};"></div>
          </div>
          <div class="anti-slop-breakdown-value">${data.score}/${max}</div>
        </div>
      `;
    }

    return html || '<div class="anti-slop-breakdown-empty">No signals detected</div>';
  }

  function _buildReasonTags(reasons) {
    if (!reasons || reasons.length === 0) return '';

    const friendlyNames = {
      'high-ai-phrase-density': 'Heavy AI Phrasing',
      'moderate-ai-phrase-density': 'AI Phrasing Detected',
      'some-ai-phrases': 'Some AI Phrases',
      'high-filler-density': 'Filler-Heavy',
      'moderate-filler-density': 'Some Filler Language',
      'excessive-transitions': 'Overused Transitions',
      'many-transitions': 'Many Transition Words',
      'generic-opening': 'Generic Opening',
      'uniform-sentence-length': 'Uniform Sentences',
      'excessive-hedging': 'Excessive Hedging',
      'buzzword-heavy': 'Buzzword-Heavy',
      'no-author': 'No Author Listed',
      'no-date': 'No Publish Date',
      'very-low-vocabulary-diversity': 'Very Repetitive Vocabulary',
      'low-vocabulary-diversity': 'Low Vocabulary Diversity',
      'excessive-connectors': 'Too Many Connectors',
      'highly-repetitive-structure': 'Repetitive Structure',
      'repetitive-sentence-starts': 'Repetitive Openings',
      'repetitive-phrases': 'Repeated Phrases',
      'some-repeated-phrases': 'Some Repeated Phrases',
      'list-heavy-content': 'Listicle Format',
      'excessive-list-structure': 'Heavy List Structure',
      'multiple-conclusions': 'Multiple Conclusions',
      'custom-block-keyword': 'Custom Block Keyword',
      'custom-allow-keyword': 'Custom Allow Keyword'
    };

    return reasons.map(r => {
      const name = friendlyNames[r] || r.replace(/-/g, ' ');
      const isGood = r.includes('allow');
      return `<span class="anti-slop-reason-tag ${isGood ? 'good' : ''}">${name}</span>`;
    }).join('');
  }

  // ============================================================
  // HELPERS
  // ============================================================

  async function _logBlock(title, score) {
    try {
      await storageManager.addRecentBlock({
        url: window.location.href,
        title: title || document.title,
        score
      });
    } catch (err) {
      logError(PLATFORM, 'Failed to log recent block', err);
    }
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
