// AI-Generated Content Detector
// Detects and blocks low-quality AI-generated articles and blog posts

(async function () {
  'use strict';

  const { log, logError, hideElement, isProcessed, markProcessed, incrementBlockCounter, isPlatformEnabled } = window.AntiSlopUtils;

  const PLATFORM = 'AI-Detector';
  let isEnabled = false;
  let threshold = 60;
  let whitelist = [];
  let hasAnalyzed = false;

  // Initialize detector
  async function init() {
    isEnabled = await isPlatformEnabled('aiDetector');

    if (!isEnabled) {
      log(PLATFORM, 'Disabled in settings');
      return;
    }

    // Load settings
    const settings = await storageManager.getSettings();
    const aiSettings = settings.aiDetector || {};

    threshold = aiPatternDetector.getSensitivityThreshold(
      aiSettings.sensitivity || 'medium'
    );
    whitelist = aiSettings.whitelist || [];

    log(PLATFORM, `Initializing... (threshold: ${threshold})`);

    // Check if domain is whitelisted
    const domain = window.location.hostname;
    if (aiPatternDetector.isWhitelisted(domain, whitelist)) {
      log(PLATFORM, 'Domain is whitelisted, skipping');
      return;
    }

    // Wait for page to load before analyzing
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', analyzeContent);
    } else {
      // Small delay to let dynamic content load
      setTimeout(analyzeContent, 1000);
    }
  }

  // Analyze page content for AI-generated slop
  async function analyzeContent() {
    if (hasAnalyzed) return;
    hasAnalyzed = true;

    try {
      // Extract article content
      const articleText = aiPatternDetector.extractArticleText(document);

      if (!articleText || articleText.length < 100) {
        log(PLATFORM, 'No significant content found, skipping analysis');
        return;
      }

      // Analyze content
      const slopScore = aiPatternDetector.analyzeSlopScore(articleText, document);

      log(PLATFORM, `Analysis complete - Slop Score: ${slopScore}/100`);

      // Check if should block
      if (aiPatternDetector.shouldBlock(slopScore, threshold)) {
        blockPage(slopScore);
        await incrementBlockCounter('aiArticles', 1);
        log(PLATFORM, `Page blocked (score: ${slopScore})`);
      } else {
        log(PLATFORM, `Page allowed (score: ${slopScore})`);
      }
    } catch (error) {
      logError(PLATFORM, 'Error analyzing content', error);
    }
  }

  // Block the page by hiding main content
  function blockPage(score) {
    // Find main content container
    const selectors = [
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

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element && !isProcessed(element)) {
        hideElement(element, `ai-slop-${score}`);
        markProcessed(element);
        blocked = true;
        break;
      }
    }

    if (blocked) {
      // Show replacement message
      showBlockedMessage(score);
    } else {
      // Fallback: hide body content
      document.body.style.display = 'none';
      showBlockedMessage(score);
    }
  }

  // Show message when article is blocked
  function showBlockedMessage(score) {
    const message = document.createElement('div');
    message.className = 'anti-slop-ai-blocked-message';
    message.innerHTML = `
      <div style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        z-index: 999999;
        padding: 40px;
        box-sizing: border-box;
      ">
        <div style="max-width: 600px; text-align: center;">
          <div style="font-size: 64px; margin-bottom: 20px;">🛡️</div>
          <h1 style="font-size: 42px; margin-bottom: 20px; font-weight: 700;">
            AI-Generated Content Detected
          </h1>
          <p style="font-size: 20px; line-height: 1.6; margin-bottom: 15px; opacity: 0.95;">
            This article has been identified as likely AI-generated slop content.
          </p>
          <div style="
            background: rgba(255, 255, 255, 0.2);
            border-radius: 12px;
            padding: 20px;
            margin: 30px 0;
            backdrop-filter: blur(10px);
          ">
            <p style="font-size: 16px; margin: 0;">
              <strong>Slop Score:</strong> ${score}/100
            </p>
            <p style="font-size: 14px; margin-top: 10px; opacity: 0.9;">
              Threshold: ${threshold} (${getSensitivityLabel()})
            </p>
          </div>
          <p style="font-size: 16px; opacity: 0.9; margin-bottom: 30px;">
            Anti-Slop has blocked this content to save you time and protect your focus.
          </p>
          <div style="display: flex; gap: 15px; justify-content: center; flex-wrap: wrap;">
            <button id="anti-slop-view-anyway" style="
              background: white;
              color: #667eea;
              border: none;
              padding: 15px 30px;
              font-size: 16px;
              font-weight: 600;
              border-radius: 8px;
              cursor: pointer;
              transition: transform 0.2s;
            ">
              View Anyway
            </button>
            <button id="anti-slop-go-back" style="
              background: rgba(255, 255, 255, 0.2);
              color: white;
              border: 2px solid white;
              padding: 15px 30px;
              font-size: 16px;
              font-weight: 600;
              border-radius: 8px;
              cursor: pointer;
              transition: transform 0.2s;
            ">
              Go Back
            </button>
          </div>
          <p style="font-size: 14px; margin-top: 30px; opacity: 0.8;">
            To adjust sensitivity or disable AI detection, open the Anti-Slop extension settings
          </p>
        </div>
      </div>
    `;

    document.body.appendChild(message);

    // Add event listeners
    document.getElementById('anti-slop-view-anyway')?.addEventListener('click', () => {
      message.remove();
      // Show hidden content
      document.querySelectorAll('[data-anti-slop-processed]').forEach(el => {
        el.style.display = '';
      });
      document.body.style.display = '';
    });

    document.getElementById('anti-slop-go-back')?.addEventListener('click', () => {
      window.history.back();
    });

    // Add hover effects
    const buttons = message.querySelectorAll('button');
    buttons.forEach(btn => {
      btn.addEventListener('mouseenter', () => {
        btn.style.transform = 'scale(1.05)';
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.transform = 'scale(1)';
      });
    });
  }

  // Get sensitivity label for display
  function getSensitivityLabel() {
    if (threshold >= 80) return 'Low Sensitivity';
    if (threshold >= 60) return 'Medium Sensitivity';
    return 'High Sensitivity';
  }

  // Listen for settings changes
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync' && changes.antiSlop_settings) {
      const newSettings = changes.antiSlop_settings.newValue;
      const wasEnabled = isEnabled;
      isEnabled = newSettings?.aiDetector?.enabled ?? false;

      if (wasEnabled !== isEnabled) {
        log(PLATFORM, `Settings changed: ${isEnabled ? 'enabled' : 'disabled'}`);
        location.reload();
      }
    }
  });

  // Start initialization
  init();

})();
