// Utility Scoring Algorithm for Anti-Slop Extension
// Distinguishes useful AI content from junk by analyzing content quality signals
// If content has code snippets, actionable steps, data, citations - don't block
// Updated as of 2026-02-17

// ============================================================
// UTILITY SIGNALS (Positive - reduce blocking score)
// ============================================================

const UTILITY_POSITIVE_SIGNALS = {
  // Code content (strong positive)
  codeIndicators: {
    patterns: [
      /```[\s\S]*?```/g,                    // Markdown code blocks
      /<pre[\s>][\s\S]*?<\/pre>/gi,         // HTML code blocks
      /<code[\s>][\s\S]*?<\/code>/gi,       // Inline code
      /\b(function|const|let|var|class|import|export|return|if|else|for|while)\s/g, // JS keywords
      /\b(def|class|import|from|return|if|elif|else|for|while|with|try|except)\s/g, // Python keywords
      /\b(public|private|static|void|int|string|bool|class|namespace)\s/g,          // C#/Java keywords
      /\b(SELECT|FROM|WHERE|JOIN|INSERT|UPDATE|DELETE|CREATE)\s/gi,                  // SQL
      /\$\(|document\.|window\.|console\./g                                          // DOM/JS APIs
    ],
    weight: 20
  },

  // Actionable steps (moderate positive)
  actionableSteps: {
    patterns: [
      /\b(step \d|step one|step two|step three)\b/gi,
      /\b(first|second|third|fourth|fifth),?\s+(you |we |install|create|open|run|click|navigate|go to)/gi,
      /\b(how to|tutorial|walkthrough|instructions)\b/gi,
      /\b(install|configure|set up|setup|deploy|build|compile|run)\s+(the|your|this|a)\b/gi,
      /\b(npm install|pip install|apt-get|brew install|yarn add|cargo add)\b/gi,
      /^\s*\d+\.\s+[A-Z]/gm                 // Numbered list items
    ],
    weight: 15
  },

  // Data and statistics (moderate positive)
  dataStatistics: {
    patterns: [
      /\b\d+(\.\d+)?%\b/g,                  // Percentages
      /\$\d[\d,.]+\b/g,                      // Dollar amounts
      /\b\d{1,3}(,\d{3})+\b/g,              // Large numbers with commas
      /\b(study|research|survey|report|data) (shows?|suggests?|indicates?|found|reveals?)\b/gi,
      /\b(according to|based on|per|as reported by)\b/gi,
      /\b(increase|decrease|growth|decline|rise|fell) (of |by )?\d/gi
    ],
    weight: 15
  },

  // Citations and sources (moderate positive)
  citations: {
    patterns: [
      /\b(source|citation|reference|bibliography)\b/gi,
      /\bhttps?:\/\/\S+/g,                  // URLs
      /\[\d+\]/g,                            // Citation numbers [1], [2]
      /\([\w\s]+,?\s*\d{4}\)/g,             // Academic citations (Author, 2024)
      /\b(published (in|by|on)|peer-reviewed|journal|paper)\b/gi,
      /\b(University|Institute|Foundation|Organization)\b/g
    ],
    weight: 15
  },

  // Personal experience / authenticity markers (weak positive)
  authenticityMarkers: {
    patterns: [
      /\b(in my experience|i personally|i've (found|noticed|learned|seen)|from my)\b/gi,
      /\b(my team|our company|we (implemented|built|created|discovered))\b/gi,
      /\b(years? (ago|of experience)|worked (at|for|on))\b/gi,
      /\b(disclaimer|full disclosure|affiliate|sponsored)\b/gi  // Transparency
    ],
    weight: 10
  }
};

// ============================================================
// JUNK SIGNALS (Negative - increase blocking score)
// ============================================================

const UTILITY_NEGATIVE_SIGNALS = {
  // Generic advice with no substance
  genericAdvice: {
    patterns: [
      /\b(just (believe|try|do it|start|keep going))\b/gi,
      /\b(you (can|should|must|need to) (just |simply )?)\b/gi,
      /\b(the (key|secret|trick) (is|to))\b/gi,
      /\b(at the end of the day)\b/gi,
      /\b(it (all|really) (comes|boils) down to)\b/gi,
      /\b(the truth is|the reality is|the fact is)\b/gi
    ],
    weight: -10
  },

  // Engagement bait only
  engagementBait: {
    patterns: [
      /\b(like (and|&) (share|subscribe|follow))\b/gi,
      /\b(tag (someone|a friend|your))\b/gi,
      /\b(double tap|smash that|hit the|drop a)\b/gi,
      /\b(comment (below|down|your|if you))\b/gi,
      /\b(follow (me|us|for more))\b/gi,
      /\b(repost|reshare) (this|if)\b/gi
    ],
    weight: -20
  },

  // Filler without substance
  fillerContent: {
    patterns: [
      /\b(in today'?s (digital |modern |fast-paced )?(world|age|era|landscape))\b/gi,
      /\b(it'?s no secret that)\b/gi,
      /\b(as we (all )?know)\b/gi,
      /\b(needless to say)\b/gi,
      /\b(without further ado)\b/gi,
      /\b(having said that)\b/gi
    ],
    weight: -10
  }
};

// ============================================================
// UTILITY SCORER CLASS
// ============================================================

class UtilityScorer {
  constructor() {
    this.positiveSignals = UTILITY_POSITIVE_SIGNALS;
    this.negativeSignals = UTILITY_NEGATIVE_SIGNALS;
  }

  /**
   * Calculate utility score for content
   * Higher score = more useful (should NOT be blocked)
   * @param {string} text - Content text
   * @param {Document|HTMLElement} context - DOM context for structural analysis
   * @returns {Object} { utilityScore, adjustment, signals }
   */
  calculateUtility(text, context = null) {
    if (!text || text.length < 50) {
      return { utilityScore: 0, adjustment: 0, signals: [] };
    }

    let utilityScore = 0;
    const signals = [];

    // Check positive signals
    for (const [signalName, signal] of Object.entries(this.positiveSignals)) {
      let matchCount = 0;
      for (const pattern of signal.patterns) {
        // Reset lastIndex for global regexes
        pattern.lastIndex = 0;
        const matches = text.match(pattern);
        if (matches) {
          matchCount += matches.length;
        }
      }

      if (matchCount > 0) {
        const points = Math.min(matchCount * (signal.weight / 3), signal.weight);
        utilityScore += points;
        signals.push({ name: signalName, matches: matchCount, points });
      }
    }

    // Check negative signals
    for (const [signalName, signal] of Object.entries(this.negativeSignals)) {
      let matchCount = 0;
      for (const pattern of signal.patterns) {
        pattern.lastIndex = 0;
        const matches = text.match(pattern);
        if (matches) {
          matchCount += matches.length;
        }
      }

      if (matchCount > 0) {
        const points = Math.max(matchCount * (signal.weight / 2), signal.weight);
        utilityScore += points; // weight is already negative
        signals.push({ name: signalName, matches: matchCount, points });
      }
    }

    // DOM-based analysis (if context provided)
    if (context) {
      const domScore = this._analyzeDOMUtility(context);
      utilityScore += domScore.points;
      if (domScore.signals.length > 0) {
        signals.push(...domScore.signals);
      }
    }

    // Calculate the adjustment to apply to a blocking score
    // Positive utility = reduce blocking score
    // Negative utility = increase blocking score
    const adjustment = -Math.round(utilityScore);

    return {
      utilityScore: Math.round(utilityScore),
      adjustment,
      signals
    };
  }

  /**
   * Analyze DOM elements for utility signals
   * @private
   */
  _analyzeDOMUtility(context) {
    let points = 0;
    const signals = [];

    try {
      const el = context.nodeType === 9 ? context : context;

      // Code blocks present = useful
      const codeBlocks = el.querySelectorAll('pre, code, .highlight, .code-block');
      if (codeBlocks.length >= 3) {
        points += 20;
        signals.push({ name: 'dom-code-blocks', matches: codeBlocks.length, points: 20 });
      } else if (codeBlocks.length >= 1) {
        points += 10;
        signals.push({ name: 'dom-code-blocks', matches: codeBlocks.length, points: 10 });
      }

      // Tables with data = useful
      const tables = el.querySelectorAll('table');
      if (tables.length >= 1) {
        points += 10;
        signals.push({ name: 'dom-data-tables', matches: tables.length, points: 10 });
      }

      // Images with alt text (diagrams, charts) = useful
      const images = el.querySelectorAll('img[alt]');
      const diagramImages = Array.from(images).filter(img => {
        const alt = (img.alt || '').toLowerCase();
        return alt.includes('diagram') || alt.includes('chart') ||
               alt.includes('graph') || alt.includes('architecture') ||
               alt.includes('flow') || alt.includes('screenshot');
      });
      if (diagramImages.length >= 1) {
        points += 5;
        signals.push({ name: 'dom-diagrams', matches: diagramImages.length, points: 5 });
      }

      // Mathematical formulas (MathJax, KaTeX) = useful
      const mathElements = el.querySelectorAll('.MathJax, .katex, math, [class*="math"]');
      if (mathElements.length >= 1) {
        points += 15;
        signals.push({ name: 'dom-math', matches: mathElements.length, points: 15 });
      }
    } catch (error) {
      // DOM analysis is best-effort
    }

    return { points, signals };
  }

  /**
   * Apply utility adjustment to a blocking score
   * @param {number} blockingScore - Original blocking score (0-100)
   * @param {string} text - Content text
   * @param {Document|HTMLElement} context - DOM context
   * @returns {Object} { adjustedScore, utilityResult }
   */
  adjustBlockingScore(blockingScore, text, context = null) {
    const utilityResult = this.calculateUtility(text, context);
    const adjustedScore = Math.max(0, Math.min(100, blockingScore + utilityResult.adjustment));

    return { adjustedScore, utilityResult };
  }

  /**
   * Quick check: should content be protected from blocking?
   * Returns true if content has strong utility signals
   * @param {string} text - Content text
   * @returns {boolean}
   */
  isUsefulContent(text) {
    const result = this.calculateUtility(text);
    return result.utilityScore >= 30;
  }
}

// ============================================================
// RESULT CACHE
// Avoid re-analyzing the same content
// ============================================================

class AnalysisCache {
  constructor(maxSize = 200, ttlMs = 5 * 60 * 1000) {
    this._cache = new Map();
    this._maxSize = maxSize;
    this._ttlMs = ttlMs;
  }

  /**
   * Generate a cache key from text content
   * Uses first 200 chars + length as a fast hash
   */
  _generateKey(text) {
    const prefix = text.substring(0, 200).trim();
    return `${prefix.length}:${text.length}:${prefix}`;
  }

  /**
   * Get cached result
   * @param {string} text - Content text
   * @returns {Object|null} Cached result or null
   */
  get(text) {
    const key = this._generateKey(text);
    const entry = this._cache.get(key);

    if (!entry) return null;

    // Check TTL
    if (Date.now() - entry.timestamp > this._ttlMs) {
      this._cache.delete(key);
      return null;
    }

    return entry.result;
  }

  /**
   * Store result in cache
   * @param {string} text - Content text
   * @param {Object} result - Analysis result
   */
  set(text, result) {
    const key = this._generateKey(text);

    // Evict oldest if at capacity
    if (this._cache.size >= this._maxSize) {
      const oldestKey = this._cache.keys().next().value;
      this._cache.delete(oldestKey);
    }

    this._cache.set(key, {
      result,
      timestamp: Date.now()
    });
  }

  /**
   * Clear the cache
   */
  clear() {
    this._cache.clear();
  }

  /**
   * Get cache stats
   */
  stats() {
    return {
      size: this._cache.size,
      maxSize: this._maxSize,
      ttlMs: this._ttlMs
    };
  }
}

// ============================================================
// CREATE SINGLETONS
// ============================================================

const utilityScorer = new UtilityScorer();
const analysisCache = new AnalysisCache();

// Export for use in content scripts
if (typeof window !== 'undefined') {
  window.utilityScorer = utilityScorer;
  window.analysisCache = analysisCache;
}
