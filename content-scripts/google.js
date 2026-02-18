// Google Search Content Script for Anti-Slop Extension
// Filters AI Overviews, SEO spam results, and content farm domains
// Updated as of 2026-02-17

// ============================================================
// SELECTORS (Updated as of 2026-02-17)
// ============================================================

const GOOGLE_SELECTORS = {
  // AI Overview / SGE container
  aiOverview: [
    '#m-x-content',                    // AI Overview main container
    'div[data-attrid="SGEAnswer"]',    // SGE answer block
    'div[jsname="N760b"]',             // AI Overview wrapper
    'div.kp-wholepage[data-hveid]',    // Knowledge panel with AI content
    '.M8OgIe',                         // AI Overview card class
    'div[data-sgrd]',                  // SGE result data attribute
    'block-component[class*="ai"]',    // AI block component
    'div[class*="aiOverview"]',        // Generic AI overview class
    'div[data-ai-overview]'            // Data attribute for AI overview
  ],
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
    const observer = createDebouncedObserver(async () => {
      await scanGoogleResults();
    }, 500);

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

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
    // 1. Handle AI Overview
    await handleAIOverview();

    // 2. Scan individual search results
    const results = document.querySelectorAll(GOOGLE_SELECTORS.searchResult);
    let blocked = 0;

    results.forEach(result => {
      if (isProcessed(result)) return;
      markProcessed(result);

      const analysis = analyzeSearchResult(result);
      if (analysis.shouldFilter) {
        if (analysis.action === 'hide') {
          hideElement(result, analysis.reason);
        } else if (analysis.action === 'fade') {
          fadeElement(result, analysis.reason);
          _addSearchResultBadge(result, analysis);
        } else if (analysis.action === 'warn') {
          _addSearchResultBadge(result, analysis);
        }
        blocked++;
      }
    });

    if (blocked > 0) {
      googleBlockedCount += blocked;
      await incrementBlockCounter('google', blocked);
      log('Google', `Filtered ${blocked} results (total: ${googleBlockedCount})`);
    }
  } catch (error) {
    logError('Google', 'Error scanning results', error);
  }
}

/**
 * Handle AI Overview sections - hide or collapse them
 */
async function handleAIOverview() {
  const hideAIOverview = googleSettings?.google?.hideAIOverview !== false;
  if (!hideAIOverview) return;

  for (const selector of GOOGLE_SELECTORS.aiOverview) {
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => {
      if (isProcessed(el)) return;
      markProcessed(el);

      // Check if it actually looks like an AI Overview (not just a knowledge panel)
      const text = (el.textContent || '').toLowerCase();
      const isAIContent = text.includes('ai overview') ||
                          text.includes('generative') ||
                          el.querySelector('[data-sgrd]') ||
                          el.querySelector('[data-attrid*="SGE"]');

      if (isAIContent || GOOGLE_SELECTORS.aiOverview.indexOf(selector) <= 3) {
        _collapseAIOverview(el);
        googleBlockedCount++;
        log('Google', 'AI Overview collapsed');
      }
    });
  }
}

/**
 * Collapse AI Overview with a toggle to expand
 */
function _collapseAIOverview(element) {
  const wrapper = document.createElement('div');
  wrapper.className = 'anti-slop-ai-overview-collapsed';
  wrapper.innerHTML = `
    <div class="anti-slop-ai-overview-header">
      <span class="anti-slop-ai-overview-icon">&#x1F916;</span>
      <span class="anti-slop-ai-overview-label">AI Overview hidden by Anti-Slop</span>
      <button class="anti-slop-ai-overview-toggle" type="button">Show</button>
    </div>
  `;

  const parent = element.parentNode;
  if (parent) {
    parent.insertBefore(wrapper, element);
    element.style.display = 'none';
    element.classList.add('anti-slop-hidden');

    const toggleBtn = wrapper.querySelector('.anti-slop-ai-overview-toggle');
    toggleBtn.addEventListener('click', () => {
      if (element.style.display === 'none') {
        element.style.display = '';
        element.classList.remove('anti-slop-hidden');
        toggleBtn.textContent = 'Hide';
      } else {
        element.style.display = 'none';
        element.classList.add('anti-slop-hidden');
        toggleBtn.textContent = 'Show';
      }
    });
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
  if (typeof brainrotDetector !== 'undefined') {
    const brainrotScore = brainrotDetector.analyzeSlopScore({
      title: title,
      description: snippet
    });
    if (brainrotScore >= 40) {
      score += 15;
      reasons.push('brainrot-content');
    }

    const customSignal = brainrotDetector.evaluateCustomRules(combined);
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

  // Determine action based on score
  let shouldFilter = false;
  let action = 'none';

  if (score >= threshold) {
    shouldFilter = true;
    if (score >= threshold + 20) {
      action = 'hide';
    } else {
      action = 'fade';
    }
  } else if (score >= threshold - 15 && reasons.length > 0) {
    shouldFilter = true;
    action = 'warn';
  }

  return { shouldFilter, action, reason: reasons.join(', '), score: Math.max(0, Math.min(score, 100)) };
}

/**
 * Add a warning badge to a search result
 */
function _addSearchResultBadge(result, analysis) {
  if (result.querySelector('.anti-slop-search-badge')) return;

  const badge = document.createElement('div');
  badge.className = 'anti-slop-search-badge';
  badge.innerHTML = `
    <span class="anti-slop-search-badge-icon">&#x26A0;</span>
    <span class="anti-slop-search-badge-text">${_escapeHtml(analysis.reason)}</span>
    <span class="anti-slop-search-badge-score">Score: ${analysis.score}</span>
  `;

  result.style.position = 'relative';
  result.insertBefore(badge, result.firstChild);
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
