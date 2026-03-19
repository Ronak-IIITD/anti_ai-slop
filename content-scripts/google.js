// Google Search Content Script for Anti-Slop Extension
// Filters AI Overviews, SEO spam results, and content farm domains
// Updated as of 2026-03-19

(async function() {
'use strict';

const { log, logError, hideElement, isProcessed, markProcessed, createDebouncedObserver, isPlatformEnabled } = window.AntiSlopUtils;

// ============================================================
// SELECTORS (Updated as of 2026-02-17)
// ============================================================

const GOOGLE_SELECTORS = {
  // Search result items
  searchResult: 'div.g, div[data-sokoban-container]',
  // Result link
  resultLink: 'a[href]',
  // Result title
  resultTitle: 'h3',
  // Result snippet/description
  resultSnippet: '.VwiC3b, .lEBKkf, [data-sncf], .IsZvec',
  // Sponsored/Ad results
  sponsoredResult: '.uEierd, [data-text-ad], .commercial-unit-desktop-top',
  // People Also Ask
  peopleAlsoAsk: 'div[data-sgrd] .related-question-pair, div.related-question-pair',
  // Featured snippet
  featuredSnippet: '.xpdopen, .IZE3Td'
};

// ============================================================
// CONTENT FARM DOMAINS
// Known low-quality, AI-generated content farms
// ============================================================

const CONTENT_FARM_DOMAINS = [
  // Generic content farms
  'buzzfeed.com',
  'screenrant.com',
  'gamerant.com',
  'cbr.com',
  'wegotthiscovered.com',
  'thethings.com',
  'collider.com',
  'thecoldwire.com',
  'distractify.com',
  'looper.com',
  'moviepilot.com',
  'comicbook.com',
  'popculture.com',
  
  // SEO spam / AI content mills
  'sportskeeda.com',
  'dexerto.com',
  'thenerdstash.com',
  'hitc.com',
  'clutchpoints.com',
  'marca.com',
  'essentiallysports.com',
  'thegamer.com',
  'attackofthefanboy.com',
  'twinfinite.net',
  'gamingbolt.com',
  'pushsquare.com',
  'purexbox.com',
  'nintendolife.com',
  'pcgamer.com',
  'rockpapershotgun.com',
  
  // AI-generated content
  'medium.com',       // Lots of AI spam
  'vocal.media',
  'newsbreak.com',
  'barchart.com',
  
  // Listicle / clickbait farms
  'boredpanda.com',
  'ranker.com',
  'list25.com',
  'brightside.me',
  'cracked.com',
  'oddee.com',
  
  // SEO spam domains
  'howtodogeek.com',
  'techugee.com',
  'itechhacks.com',
  'techviral.net',
  'techworm.net',
  
  // Generic low-quality aggregators
  'msn.com',
  'yahoo.com',
  'aol.com',
  'news.yahoo.com'
];

// ============================================================
// SEO SPAM INDICATORS
// Patterns that indicate SEO-optimized junk content
// ============================================================

const SEO_SPAM_PATTERNS = [
  /\b\d+ best .+ in \d{4}\b/i,
  /\b(top|best) \d+ .+ (you need|to buy|to try|worth|for|of)\b/i,
  /\beverything you need to know about\b/i,
  /\b(ultimate|complete|definitive|comprehensive) guide to\b/i,
  /\bhere'?s what (you need|we know)\b/i,
  /\bexplained:?\s/i,
  /\b(vs|versus)\.?\s.+which (is|one) (better|best)\b/i,
  /\bis it worth (it|buying|the money)\b/i,
  /\bwhat is .+ and (why|how) (does|should|is)\b/i,
  /\b\d+ (things|tips|tricks|secrets|facts) (you|about|to)\b/i,
  /\bhow to .+ (step by step|in \d+|easy|simple)\b/i,
  /\b(why|how) .+ (will change|is changing|matters)\b/i,
  /\bthe (complete|ultimate|best) .+ (guide|list|review)\b/i,
  /\b(don'?t|do not) (buy|use|do) .+ (until|before|read)\b/i,
  /\b(stop|never) (doing|using|buying|eating) .+ (now|immediately|today)\b/i,
  /\b(secret|secrets|hidden) .+ (revealed|that|to)\b/i,
  /\b(truth|reality) about .+ (revealed|you need|nobody)\b/i
];

// ============================================================
// MAIN FUNCTIONS
// ============================================================

let googleBlockedCount = 0;
let googleSettings = null;
let _googleInitialized = false;

/**
 * Initialize Google Search content script
 */
async function initGoogleFilter() {
  if (_googleInitialized) return;
  _googleInitialized = true;

  try {
    const enabled = await isPlatformEnabled('google');
    if (!enabled) {
      log('Google', 'Platform disabled, skipping');
      return;
    }

    googleSettings = await storageManager.getSettings();
    const sensitivity = googleSettings.google?.sensitivity || 'medium';

    log('Google', `Initialized with sensitivity: ${sensitivity}`);

    // Initial scan
    await scanGoogleResults();

    // Watch for dynamic content loading (Google loads results dynamically)
    const { observer, start } = createDebouncedObserver(async () => {
      await scanGoogleResults();
    }, 500);

    start(document.body);

    log('Google', 'MutationObserver active');
  } catch (error) {
    logError('Google', 'Failed to initialize', error);
  }
}

/**
 * Scan all Google search results
 */
async function scanGoogleResults() {
  try {
    const results = document.querySelectorAll(GOOGLE_SELECTORS.searchResult);
    let filtered = 0;

    for (const result of results) {
      if (isProcessed(result)) continue;

      const analysis = analyzeSearchResult(result);

      if (analysis.shouldFilter) {
        hideElement(result, `google-${analysis.reason}-${analysis.score}`);
        filtered++;
      }

      markProcessed(result);
    }

    if (filtered > 0) {
      log('Google', `Filtered ${filtered} results`);
      try {
        await storageManager.incrementBlocked('google', filtered);
      } catch (err) {}
    }
  } catch (error) {
    logError('Google', 'Error scanning results', error);
  }
}

/**
 * Analyze a single search result
 * @param {HTMLElement} result - Search result element
 * @returns {Object} { shouldFilter, action, reason, score }
 */
function analyzeSearchResult(result) {
  const sensitivity = googleSettings?.google?.sensitivity || 'medium';
  const threshold = _getGoogleThreshold(sensitivity);

  // Extract result data
  const linkEl = result.querySelector(GOOGLE_SELECTORS.resultLink);
  const titleEl = result.querySelector(GOOGLE_SELECTORS.resultTitle);
  const snippetEl = result.querySelector(GOOGLE_SELECTORS.resultSnippet);

  const url = linkEl?.href || '';
  const title = titleEl?.textContent?.trim() || '';
  const snippet = snippetEl?.textContent?.trim() || '';
  const combined = (title + ' ' + snippet).toLowerCase();

  let score = 0;
  const reasons = [];

  // 1. Content farm domain check (strong signal)
  const domain = _extractDomain(url);
  if (_isContentFarmDomain(domain)) {
    score += 40;  // Increased from 30
    reasons.push('content-farm');
  }

  // 2. SEO spam title patterns
  const seoMatches = SEO_SPAM_PATTERNS.filter(p => p.test(title));
  if (seoMatches.length >= 3) {
    score += 35;  // Increased
    reasons.push('seo-spam-title');
  } else if (seoMatches.length >= 2) {
    score += 20;
    reasons.push('seo-spam');
  } else if (seoMatches.length >= 1) {
    score += 10;
    reasons.push('seo-pattern');
  }

  // 3. AI-generated snippet indicators
  const aiPhrases = [
    'in today\'s', 'it\'s important to note', 'delve into',
    'comprehensive guide', 'everything you need to know',
    'navigate the landscape', 'holistic approach'
  ];
  const aiCount = aiPhrases.filter(p => combined.includes(p)).length;
  if (aiCount >= 2) {
    score += 20;
    reasons.push('ai-snippet');
  } else if (aiCount >= 1) {
    score += 8;
    reasons.push('possible-ai-snippet');
  }

  // 4. Brainrot in search results
  if (typeof window.brainrotDetector !== 'undefined') {
    const brainrotScore = window.brainrotDetector.analyzeSlopScore({
      title: title,
      description: snippet
    });
    if (brainrotScore >= 40) {
      score += 15;
      reasons.push('brainrot-content');
    }

    const customSignal = window.brainrotDetector.evaluateCustomRules(combined);
    if (customSignal.scoreDelta !== 0) {
      score += customSignal.scoreDelta;
      if (customSignal.blockMatches.length > 0) {
        reasons.push('custom-block-keyword');
      }
      if (customSignal.allowMatches.length > 0) {
        reasons.push('custom-allow-keyword');
      }
    }
  }

  // 5. Low-quality indicators
  if (title.length > 0 && title === title.toUpperCase() && title.length > 20) {
    score += 5;
    reasons.push('all-caps-title');
  }

  // Hard block mode: filter when score crosses threshold
  const shouldFilter = score >= threshold;

  return {
    shouldFilter,
    action: shouldFilter ? 'hide' : 'none',
    reason: reasons.join(', '),
    score: Math.max(0, Math.min(score, 100))
  };
}

// ============================================================
// HELPERS
// ============================================================

function _getGoogleThreshold(sensitivity) {
  switch (sensitivity) {
    case 'low': return 45;
    case 'medium': return 30;
    case 'high': return 18;
    default: return 30;
  }
}

function _extractDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

function _isContentFarmDomain(domain) {
  return CONTENT_FARM_DOMAINS.some(farm =>
    domain === farm || domain.endsWith('.' + farm)
  );
}

function _escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ============================================================
// INITIALIZE
// ============================================================

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGoogleFilter);
} else {
  initGoogleFilter();
}

})();
