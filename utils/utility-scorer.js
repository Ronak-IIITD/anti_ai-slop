// Utility Scoring Algorithm for Anti-Slop Extension v4
// Distinguishes useful AI content from junk by analyzing content quality signals
// If content has code snippets, actionable steps, data, citations - don't block
// Updated as of 2026-05-13

// ============================================================
// UTILITY SIGNALS (Positive - reduce blocking score) - EXPANDED
// ============================================================

const UTILITY_POSITIVE_SIGNALS = {
  // Code content (strong positive) - EXPANDED
  codeIndicators: {
    patterns: [
      /```[\s\S]*?```/g,                    // Markdown code blocks
      /<pre[\s>][\s\S]*?<\/pre>/gi,         // HTML code blocks
      /<code[\s>][\s\S]*?<\/code>/gi,       // Inline code
      /\b(function|const|let|var|class|import|export|return|if|else|for|while)\s/g, // JS keywords
      /\b(def|class|import|from|return|if|elif|else|for|while|with|try|except)\s/g, // Python keywords
      /\b(public|private|static|void|int|string|bool|class|namespace)\s/g,          // C#/Java keywords
      /\b(SELECT|FROM|WHERE|JOIN|INSERT|UPDATE|DELETE|CREATE)\s/gi,                  // SQL
      /\$\(|document\.|window\.|console\./g,                                          // DOM/JS APIs
      /\b(import\s+{|require\(|module\.exports|export\s+default)\b/g,              // Node/CommonJS
      /\b(interface|type|enum|readonly)\s+\w+\s*[{:]/g,                             // TypeScript
      /\b(func|fn|pub|impl|struct|enum|let mut)\b/g,                                  // Rust
      /\b(def|fn|pub|mod|crate|use)\s+/g,                                           // Rust keywords
      /\b(import|from|export|class|def|self|elif|lambda|yield|async|await)\s/g,      // Python/JS
      /\b(printf|scanf|malloc|free|sizeof|struct|union|enum)\b/g,                  // C
      /\b(SELECT|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|INDEX)\s/gi,               // SQL DDL/DML
      /\b(git|git add|git commit|git push|git clone|git pull|git merge)\b/gi,      // Git commands
      /\b(docker|dockerfile|docker-compose|kubectl|helm|terraform)\b/gi,           // DevOps
      /\b(api|rest|graphql|endpoint|request|response|status|header)\b/gi,          // API terms
      /\b(localhost|127\.0\.0\.1|0\.0\.0\.0|:\d{4,5})\b/g                           // Local dev
    ],
    weight: 25  // Increased from 20
  },

  // Actionable steps (moderate positive) - EXPANDED
  actionableSteps: {
    patterns: [
      /\b(step \d|step one|step two|step three)\b/gi,
      /\b(first|second|third|fourth|fifth),?\s+(you |we |install|create|open|run|click|navigate|go to)/gi,
      /\b(how to|tutorial|walkthrough|instructions)\b/gi,
      /\b(install|configure|set up|setup|deploy|build|compile|run)\s+(the|your|this|a)\b/gi,
      /\b(npm install|pip install|apt-get|brew install|yarn add|cargo add)\b/gi,
      /^\s*\d+\.\s+[A-Z]/gm,                 // Numbered list items
      // NEW patterns
      /\b(click on|click the|select the|choose the|enable the|disable the)\b/gi,
      /\b(open (your|the)|close (your|the)|start (your|the)|stop (your|the))\b/gi,
      /\b(make sure|ensure|verify|check that|confirm)\b/gi,
      /\b(follow these|perform these|complete these|execute these)\b/gi,
      /\b(you will need|you\'ll need|you\'ll want|you should have)\b/gi,
      /\b(prerequisites|requirements|dependencies|what you need)\b/gi
    ],
    weight: 18  // Increased from 15
  },

  // Data and statistics (moderate positive) - EXPANDED
  dataStatistics: {
    patterns: [
      /\b\d+(\.\d+)?%\b/g,                  // Percentages
      /\$\d[\d,.]+\b/g,                      // Dollar amounts
      /\b\d{1,3}(,\d{3})+\b/g,              // Large numbers with commas
      /\b(study|research|survey|report|data) (shows?|suggests?|indicates?|found|reveals?)\b/gi,
      /\b(according to|based on|per|as reported by)\b/gi,
      /\b(increase|decrease|growth|decline|rise|fell) (of |by )?\d/gi,
      // NEW patterns
      /\b(p-value|t-test|chi-square|regression|correlation|statistically)\b/gi,
      /\b(sample size|n=|participants|subjects|cohort)\b/gi,
      /\b(benchmark|performance|metrics|latency|throughput|response time)\b/gi,
      /\b(kb|mb|gb|tb|ms|ns|seconds?|minutes?|hours?)\b/gi,
      /\b(\$\d+|\d+\s*USD|\d+\s*dollars)\b/gi,
      /\b(average|mean|median|mode|standard deviation|variance)\b/gi
    ],
    weight: 18  // Increased from 15
  },

  // Citations and sources (moderate positive) - EXPANDED
  citations: {
    patterns: [
      /\b(source|citation|reference|bibliography)\b/gi,
      /\bhttps?:\/\/\S+/g,                  // URLs
      /\[\d+\]/g,                            // Citation numbers [1], [2]
      /\([\w\s]+,?\s*\d{4}\)/g,             // Academic citations (Author, 2024)
      /\b(published (in|by|on)|peer-reviewed|journal|paper)\b/gi,
      /\b(University|Institute|Foundation|Organization)\b/g,
      // NEW patterns
      /\b(doi:|arxiv:|PMID:|ISBN:)\b/gi,
      /\b(github\.com|gitlab\.com|bitbucket\.org)\b/gi,
      /\b(documentation|docs\.|\.readme|wiki)\b/gi,
      /\b(specification|rfc|standard|protocol)\b/gi,
      /\b(mdn|mozilla developer|w3c|whatwg)\b/gi
    ],
    weight: 18  // Increased from 15
  },

  // Personal experience / authenticity markers (weak positive) - EXPANDED
  authenticityMarkers: {
    patterns: [
      /\b(in my experience|i personally|i've (found|noticed|learned|seen)|from my)\b/gi,
      /\b(my team|our company|we (implemented|built|created|discovered))\b/gi,
      /\b(years? (ago|of experience)|worked (at|for|on))\b/gi,
      /\b(disclaimer|full disclosure|affiliate|sponsored)\b/gi,
      // NEW patterns
      /\b(i recommend|i suggest|i advise|i use|i prefer)\b/gi,
      /\b(in practice|in reality|in the real world|in production)\b/gi,
      /\b(after \d+ years|over \d+ years|for \d+ years)\b/gi,
      /\b(we've learned|we've found|we've discovered|i've learned)\b/gi,
      /\b(real-world|practical|hands-on|production)\b/gi
    ],
    weight: 15  // Increased from 10
  },

  // NEW: Technical content markers (strong positive)
  technicalContent: {
    patterns: [
      /\b(algorithm|data structure|complexity|O\(n\)|O\(n\^2\)|time complexity|space complexity)\b/gi,
      /\b(api|endpoint|request|response|json|xml|rest|graphql|soap)\b/gi,
      /\b(database|sql|nosql|mongodb|postgresql|mysql|redis|cache)\b/gi,
      /\b(server|client|frontend|backend|fullstack|microservice|container)\b/gi,
      /\b(test|unit test|integration test|e2e|jest|pytest|mocha)\b/gi,
      /\b(ci\/cd|pipeline|jenkins|github actions|gitlab ci)\b/gi,
      /\b(security|authentication|authorization|encryption|oauth|jwt)\b/gi,
      /\b(performance|optimization|scalability|load balancing|caching)\b/gi,
      /\b(debug|debugging|breakpoint|stack trace|error|exception)\b/gi,
      /\b(version control|branch|merge|commit|pull request|code review)\b/gi
    ],
    weight: 20
  },

  // NEW: Mathematical/Scientific content
  mathScientific: {
    patterns: [
      /\b(x\^|y\^|sqrt|log|ln|exp|sin|cos|tan)\b/gi,
      /\b(equation|formula|variable|constant|coefficient|parameter)\b/gi,
      /\b(matrix|vector|tensor|array|dimension)\b/gi,
      /\b(derivative|integral|limit|function|domain|range)\b/gi,
      /\b(probability|likelihood|posterior|prior|distribution)\b/gi,
      /\b(hypothesis|null hypothesis|p-value|significance|confidence)\b/gi,
      /\b(algorithm|model|training|testing|validation|accuracy)\b/gi,
      /\b(neural network|deep learning|machine learning|ai|ml)\b/gi
    ],
    weight: 18
  }
};

// ============================================================
// JUNK SIGNALS (Negative - increase blocking score) - EXPANDED
// ============================================================

const UTILITY_NEGATIVE_SIGNALS = {
  // Generic advice with no substance - EXPANDED
  genericAdvice: {
    patterns: [
      /\b(just (believe|try|do it|start|keep going))\b/gi,
      /\b(you (can|should|must|need to) (just |simply )?)\b/gi,
      /\b(the (key|secret|trick) (is|to))\b/gi,
      /\b(at the end of the day)\b/gi,
      /\b(it (all|really) (comes|boils) down to)\b/gi,
      /\b(the truth is|the reality is|the fact is)\b/gi,
      // NEW patterns
      /\b(just think positive|just believe in yourself|just work hard)\b/gi,
      /\b(the universe|the law of attraction|manifest your|visualize your)\b/gi,
      /\b(you deserve|you\'re worth|you matter)\b/gi,
      /\b(believe in yourself|trust the process|have faith)\b/gi,
      /\b(don\'t give up|never give up|keep pushing)\b/gi,
      /\b(be yourself|stay true|remain authentic)\b/gi,
      /\b(it\'s okay to|it\'s fine to|there\'s nothing wrong with)\b/gi
    ],
    weight: -15  // Increased from -10
  },

  // Engagement bait only - EXPANDED
  engagementBait: {
    patterns: [
      /\b(like (and|&) (share|subscribe|follow))\b/gi,
      /\b(tag (someone|a friend|your))\b/gi,
      /\b(double tap|smash that|hit the|drop a)\b/gi,
      /\b(comment (below|down|your|if you))\b/gi,
      /\b(follow (me|us|for more))\b/gi,
      /\b(repost|reshare) (this|if)\b/gi,
      // NEW patterns
      /\b(save this|bookmark this|screenshot this)\b/gi,
      /\b(send this to|share this with|tag a friend)\b/gi,
      /\b(if you agree|if you relate|if this is you)\b/gi,
      /\b(dm me|message me|slide into my)\b/gi,
      /\b(link in bio|check bio|see bio)\b/gi,
      /\b(part 2|part 3|part one|part two)\b/gi,
      /\b(subscribe|like|comment|share|follow)\b/gi
    ],
    weight: -25  // Increased from -20
  },

  // Filler without substance - EXPANDED
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
