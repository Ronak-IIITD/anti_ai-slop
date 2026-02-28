// AI Content Detection Patterns v3
// Context-aware, density-based detection of AI-generated low-quality content
// Reduces false positives by requiring MULTIPLE indicators and high density
// Updated as of 2026-03-01

// ============================================================
// AI PHRASE INDICATORS
// Only flag when these appear in HIGH concentration together
// ============================================================

// Tier 1: Strong AI indicators (very unlikely in human writing)
const AI_PHRASES_STRONG = [
  'delve into',
  'it\'s important to note that',
  'it is important to note that',
  'it\'s worth noting that',
  'in today\'s digital age',
  'in this digital age',
  'in today\'s fast-paced world',
  'navigate the landscape',
  'navigate this landscape',
  'the landscape of',
  'ever-evolving landscape',
  'ever-evolving world',
  'unlock the power of',
  'elevate your',
  'holistic approach',
  'paradigm shift',
  'embark on a journey',
  'tapestry of',
  'multifaceted',
  'in the realm of',
  // Added 2026-03-01: modern LLM output patterns
  'let\'s dive in',
  'let\'s break it down',
  'let\'s unpack',
  'at its core',
  'at the end of the day',
  'serves as a testament',
  'stands as a testament',
  'a testament to',
  'it\'s no secret that',
  'look no further',
  'whether you\'re a seasoned',
  'whether you\'re a beginner or',
  'the bottom line is',
  'the key takeaway',
  'crucial to understand',
  'harness the power',
  'pivotal role',
  'plays a pivotal',
  'a deep dive into',
  'demystify',
  'demystifying',
  'the intricacies of',
  'a myriad of',
  'foster a sense of',
  'foster collaboration',
  'foster innovation',
  'it bears mentioning',
  'not only... but also',
  'can\'t be overstated',
  'cannot be overstated',
  'without further ado',
  'in an era where',
  'in a world where',
  'in this comprehensive'
];

// Tier 2: Moderate indicators (common in AI, but also in formal writing)
const AI_PHRASES_MODERATE = [
  'moreover',
  'furthermore',
  'nonetheless',
  'comprehensive guide',
  'ultimate guide',
  'everything you need to know',
  'robust solution',
  'cutting-edge',
  'state-of-the-art',
  'seamlessly',
  'game-changer',
  'revolutionize',
  'transformative',
  'empower',
  'leverage',
  'optimize',
  'streamline',
  'best practices',
  // Added 2026-03-01: broader moderate indicators
  'it\'s crucial to',
  'it is essential to',
  'it\'s essential to',
  'in essence',
  'notably',
  'significantly',
  'interestingly',
  'undeniably',
  'arguably',
  'here\'s the thing',
  'here is the thing',
  'the reality is',
  'the truth is',
  'when it comes to',
  'as we move forward',
  'going forward',
  'moving forward',
  'at the forefront',
  'on the flip side',
  'that said',
  'with that said',
  'to put it simply',
  'in a nutshell',
  'actionable insights',
  'actionable tips',
  'key considerations',
  'pro tip',
  'bonus tip',
  'wrapping up',
  'final thoughts',
  'the takeaway'
];

// ============================================================
// STRUCTURAL PATTERNS
// Detect AI by writing structure, not just keywords
// ============================================================

const AI_STRUCTURAL_PATTERNS = {
  // AI overuses transition words at paragraph starts
  paragraphTransitions: /(?:^|\n)\s*(Moreover|Furthermore|However|Additionally|In conclusion|To summarize|Firstly|Secondly|Thirdly|In addition|On the other hand|That being said|With that in mind|It'?s worth noting|It'?s important to note|Let'?s explore|Let'?s dive|Let'?s take a look|Let'?s break|Moving on|Next up|Now let'?s)/gm,

  // Generic opening patterns
  genericOpenings: /^(In today'?s|In this (article|post|guide|blog)|When it comes to|In the (world|realm|landscape) of|Are you looking for|Have you ever wondered|If you'?re like most|Picture this|Imagine a world)/im,

  // Unnecessary hedging/filler
  hedgingLanguage: /\b(it'?s (important|worth|crucial|essential) to (note|mention|understand|remember|highlight|emphasize))\b/gi,

  // Excessive use of power words
  buzzwords: /\b(enhance|elevate|unlock|leverage|optimize|streamline|empower|revolutionize|transform|supercharge|skyrocket|turbocharge|game-chang|cutting-edge|state-of-the-art|next-level|world-class|top-notch|best-in-class)/gi,

  // AI list patterns: "Here are X things/ways/tips/reasons..."
  listIntros: /\b(here are|here'?s|below are|the following|these \d+|top \d+|\d+ (ways|things|tips|reasons|steps|strategies|methods|tricks|hacks|secrets|mistakes|benefits|advantages|examples))\b/gi,

  // AI paragraph templates: numbered/bulleted structure
  numberedParagraphs: /(?:^|\n)\s*(\d+[\.\)]\s|[-*]\s|Step \d+)/gm,

  // AI conclusion patterns
  conclusionPatterns: /\b(in (conclusion|summary|closing)|to (summarize|sum up|conclude|wrap up)|all in all|the bottom line|key takeaways?|final thoughts?)\b/gi
};

// ============================================================
// CLICKBAIT PATTERNS
// ============================================================

const CLICKBAIT_PATTERNS = [
  /you won'?t believe/i,
  /doctors hate/i,
  /one weird trick/i,
  /what happened next/i,
  /number \d+ will shock you/i,
  /will blow your mind/i,
  /this simple trick/i,
  /everyone is talking about/i,
  /breaking the internet/i
];

// ============================================================
// CONTENT TYPE CLASSIFICATION
// Different thresholds for different content types
// ============================================================

const CONTENT_TYPES = {
  ARTICLE: 'article',
  NEWS: 'news',
  BLOG: 'blog',
  TECHNICAL: 'technical',
  DOCUMENTATION: 'documentation',
  FORUM: 'forum',
  ECOMMERCE: 'ecommerce',
  GENERIC: 'generic'
};

// Threshold multipliers per content type
// Lower = harder to trigger (more forgiving)
const CONTENT_TYPE_MULTIPLIERS = {
  [CONTENT_TYPES.ARTICLE]: 1.0,       // Standard threshold
  [CONTENT_TYPES.NEWS]: 0.8,          // Slightly forgiving for news
  [CONTENT_TYPES.BLOG]: 1.1,          // Slightly stricter for blogs (more AI slop)
  [CONTENT_TYPES.TECHNICAL]: 0.5,     // Very forgiving for technical content
  [CONTENT_TYPES.DOCUMENTATION]: 0.3, // Almost never flag docs
  [CONTENT_TYPES.FORUM]: 0.4,         // Very forgiving for forums
  [CONTENT_TYPES.ECOMMERCE]: 0.6,     // Forgiving for product pages
  [CONTENT_TYPES.GENERIC]: 0.9        // Slightly forgiving for unknown
};

class AIPatternDetector {
  constructor() {
    this.strongPhrases = AI_PHRASES_STRONG;
    this.moderatePhrases = AI_PHRASES_MODERATE;
    this.structuralPatterns = AI_STRUCTURAL_PATTERNS;
    this.clickbaitPatterns = CLICKBAIT_PATTERNS;
  }

  // ============================================================
  // CONTENT TYPE DETECTION
  // ============================================================

  /**
   * Classify content type based on URL and page structure
   * @param {string} url - Page URL
   * @param {Document} doc - Page document
   * @returns {string} Content type
   */
  classifyContentType(url, doc) {
    const urlLower = url.toLowerCase();
    const hostname = new URL(url).hostname;

    // Documentation sites
    if (
      urlLower.includes('/docs/') ||
      urlLower.includes('/documentation/') ||
      urlLower.includes('/api/') ||
      urlLower.includes('/reference/') ||
      urlLower.includes('readme') ||
      doc.querySelector('pre code, .highlight, .codehilite')
    ) {
      return CONTENT_TYPES.DOCUMENTATION;
    }

    // Technical content (code-heavy)
    const codeBlocks = doc.querySelectorAll('pre, code, .code-block, .highlight');
    if (codeBlocks.length >= 3) {
      return CONTENT_TYPES.TECHNICAL;
    }

    // Forum / discussion
    if (
      urlLower.includes('forum') ||
      urlLower.includes('discussion') ||
      urlLower.includes('community') ||
      doc.querySelector('.comment, .reply, [class*="comment"], [class*="reply"]')
    ) {
      return CONTENT_TYPES.FORUM;
    }

    // E-commerce
    if (
      doc.querySelector('[class*="price"], [class*="add-to-cart"], [class*="buy-now"]') ||
      urlLower.includes('/product/') ||
      urlLower.includes('/shop/')
    ) {
      return CONTENT_TYPES.ECOMMERCE;
    }

    // News
    if (
      urlLower.includes('/news/') ||
      urlLower.includes('news.') ||
      hostname.includes('news') ||
      doc.querySelector('[class*="byline"], [class*="dateline"]')
    ) {
      return CONTENT_TYPES.NEWS;
    }

    // Blog post
    if (
      urlLower.includes('/blog/') ||
      urlLower.includes('blog.') ||
      urlLower.includes('/post/') ||
      doc.querySelector('.post, .blog-post, [class*="blog"]')
    ) {
      return CONTENT_TYPES.BLOG;
    }

    // Article
    if (doc.querySelector('article, [role="article"]')) {
      return CONTENT_TYPES.ARTICLE;
    }

    return CONTENT_TYPES.GENERIC;
  }

  // ============================================================
  // MAIN DETECTION ENGINE (v2)
  // ============================================================

  /**
   * Analyze content and return a slop score (0-100)
   * Uses density-based analysis, not raw counts
   * @param {string} article - Article text
   * @param {Document} doc - Page document
   * @returns {Object} { score, reasons, contentType, breakdown }
   */
  analyzeSlopScore(article, doc) {
    const text = article.toLowerCase();
    const wordCount = text.trim().split(/\s+/).length;
    const reasons = [];
    const breakdown = {};

    // Skip very short pages (< 150 words) - not enough signal
    if (wordCount < 150) {
      return { score: 0, reasons: ['too-short-to-analyze'], contentType: CONTENT_TYPES.GENERIC, breakdown: {} };
    }

    // Classify content type
    const url = doc.location?.href || '';
    const contentType = this.classifyContentType(url, doc);
    const multiplier = CONTENT_TYPE_MULTIPLIERS[contentType] || 1.0;

    let rawScore = 0;

    // 1. Strong AI Phrase Density (max 30 points)
    const strongMatches = this.findPhraseMatches(text, this.strongPhrases);
    const strongCount = strongMatches.length;
    const strongDensity = strongCount / (wordCount / 1000); // per 1000 words
    let phraseScore = 0;
    if (strongDensity >= 8) { phraseScore = 30; reasons.push('high-ai-phrase-density'); }
    else if (strongDensity >= 5) { phraseScore = 20; reasons.push('moderate-ai-phrase-density'); }
    else if (strongDensity >= 3) { phraseScore = 10; reasons.push('some-ai-phrases'); }
    rawScore += phraseScore;
    breakdown.phrases = { score: phraseScore, matches: strongMatches };

    // 2. Moderate Phrase Check (max 15 points, only if strong phrases also present)
    let fillerScore = 0;
    if (strongCount >= 1) {
      const moderateMatches = this.findPhraseMatches(text, this.moderatePhrases);
      const moderateCount = moderateMatches.length;
      const moderateDensity = moderateCount / (wordCount / 1000);
      if (moderateDensity >= 10) { fillerScore = 15; reasons.push('high-filler-density'); }
      else if (moderateDensity >= 6) { fillerScore = 8; reasons.push('moderate-filler-density'); }
      breakdown.filler = { score: fillerScore, matches: moderateMatches };
    }
    rawScore += fillerScore;

    // 3. Structural Pattern Analysis (max 25 points)
    const structuralScore = this.analyzeStructure(article, wordCount);
    rawScore += structuralScore.score;
    if (structuralScore.reasons.length > 0) {
      reasons.push(...structuralScore.reasons);
    }
    breakdown.structure = { score: structuralScore.score, reasons: structuralScore.reasons };

    // 4. Content Quality Analysis (max 15 points)
    const qualityScore = this.analyzeQuality(article, wordCount);
    rawScore += qualityScore.score;
    if (qualityScore.reasons.length > 0) {
      reasons.push(...qualityScore.reasons);
    }
    breakdown.quality = { score: qualityScore.score, reasons: qualityScore.reasons };

    // 5. Credibility Check (max 15 points)
    const credScore = this.checkCredibility(doc);
    rawScore += credScore.score;
    if (credScore.reasons.length > 0) {
      reasons.push(...credScore.reasons);
    }
    breakdown.credibility = { score: credScore.score, reasons: credScore.reasons };

    // 6. NEW: Vocabulary Diversity Analysis (max 10 points)
    const vocabScore = this.analyzeVocabularyDiversity(text, wordCount);
    rawScore += vocabScore.score;
    if (vocabScore.reasons.length > 0) {
      reasons.push(...vocabScore.reasons);
    }
    breakdown.vocabulary = { score: vocabScore.score, reasons: vocabScore.reasons };

    // 7. NEW: Repetition Analysis (max 10 points)
    const repetitionScore = this.analyzeRepetition(article);
    rawScore += repetitionScore.score;
    if (repetitionScore.reasons.length > 0) {
      reasons.push(...repetitionScore.reasons);
    }
    breakdown.repetition = { score: repetitionScore.score, reasons: repetitionScore.reasons };

    // 8. NEW: List/Template Pattern Analysis (max 10 points)
    const templateScore = this.analyzeTemplatePatterns(article, wordCount);
    rawScore += templateScore.score;
    if (templateScore.reasons.length > 0) {
      reasons.push(...templateScore.reasons);
    }
    breakdown.templates = { score: templateScore.score, reasons: templateScore.reasons };

    // Apply content type multiplier
    const adjustedScore = Math.round(rawScore * multiplier);
    const finalScore = Math.min(adjustedScore, 100);

    return { score: finalScore, reasons, contentType, breakdown };
  }

  // ============================================================
  // ANALYSIS HELPERS
  // ============================================================

  /**
   * Count phrase matches in text
   */
  countPhrases(text, phrases) {
    return phrases.filter(phrase => text.includes(phrase)).length;
  }

  /**
   * Find phrase matches and return matched phrases (for highlighting)
   * @param {string} text - Lowercased text
   * @param {string[]} phrases - Phrases to find
   * @returns {string[]} Matched phrases
   */
  findPhraseMatches(text, phrases) {
    return phrases.filter(phrase => text.includes(phrase));
  }

  /**
   * Get all matched AI phrases in original text (for inline highlighting)
   * Returns positions and matched text
   * @param {string} originalText - Original (non-lowercased) article text
   * @returns {Array<{phrase: string, tier: string}>} Matched phrases with tier info
   */
  getAllMatchedPhrases(originalText) {
    const text = originalText.toLowerCase();
    const matches = [];

    for (const phrase of this.strongPhrases) {
      if (text.includes(phrase)) {
        matches.push({ phrase, tier: 'strong' });
      }
    }
    for (const phrase of this.moderatePhrases) {
      if (text.includes(phrase)) {
        matches.push({ phrase, tier: 'moderate' });
      }
    }

    return matches;
  }

  /**
   * Analyze writing structure for AI patterns
   */
  analyzeStructure(article, wordCount) {
    let score = 0;
    const reasons = [];

    // Check paragraph transition overuse
    const transitions = article.match(this.structuralPatterns.paragraphTransitions) || [];
    const sentences = article.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const sentenceCount = sentences.length || 1;

    // More than 20% of sentences starting with transitions is suspicious
    if (sentenceCount > 5) {
      const transitionRatio = transitions.length / sentenceCount;
      if (transitionRatio > 0.3) { score += 15; reasons.push('excessive-transitions'); }
      else if (transitionRatio > 0.2) { score += 8; reasons.push('many-transitions'); }
    }

    // Check for generic openings
    if (this.structuralPatterns.genericOpenings.test(article)) {
      score += 5;
      reasons.push('generic-opening');
    }

    // Check sentence uniformity (AI generates very consistent length sentences)
    if (sentenceCount >= 8) {
      const lengths = sentences.map(s => s.trim().split(/\s+/).length);
      const avgLen = lengths.reduce((a, b) => a + b, 0) / lengths.length;
      const variance = lengths.reduce((sum, len) => sum + Math.pow(len - avgLen, 2), 0) / lengths.length;
      const stdDev = Math.sqrt(variance);
      const coeffOfVariation = avgLen > 0 ? stdDev / avgLen : 0;

      // Very uniform sentence lengths (low variation) = AI-like
      if (coeffOfVariation < 0.25 && avgLen > 10) {
        score += 5;
        reasons.push('uniform-sentence-length');
      }
    }

    return { score: Math.min(score, 25), reasons };
  }

  /**
   * Analyze content quality
   */
  analyzeQuality(article, wordCount) {
    let score = 0;
    const reasons = [];

    // Check for hedging/filler language density
    const hedgingMatches = article.match(this.structuralPatterns.hedgingLanguage) || [];
    const hedgingDensity = hedgingMatches.length / (wordCount / 1000);
    if (hedgingDensity >= 5) { score += 8; reasons.push('excessive-hedging'); }

    // Check buzzword density
    const buzzwordMatches = article.match(this.structuralPatterns.buzzwords) || [];
    const buzzDensity = buzzwordMatches.length / (wordCount / 1000);
    if (buzzDensity >= 10) { score += 7; reasons.push('buzzword-heavy'); }

    return { score: Math.min(score, 15), reasons };
  }

  /**
   * Check for credibility markers in the page
   */
  checkCredibility(doc) {
    let score = 0;
    const reasons = [];

    const hasAuthor = !!(
      doc.querySelector('.author, [rel="author"], [class*="author"], [class*="byline"]') ||
      doc.querySelector('meta[name="author"]')
    );

    const hasDate = !!(
      doc.querySelector('time, .date, [class*="date"], [class*="published"]') ||
      doc.querySelector('meta[property="article:published_time"]')
    );

    // Only penalize missing credibility on article-like content
    const isArticle = !!(doc.querySelector('article, [role="article"], .post, [class*="article"]'));
    if (isArticle) {
      if (!hasAuthor) { score += 8; reasons.push('no-author'); }
      if (!hasDate) { score += 5; reasons.push('no-date'); }
    }

    return { score: Math.min(score, 15), reasons };
  }

  // ============================================================
  // NEW DETECTION DIMENSIONS (v3)
  // ============================================================

  /**
   * Analyze vocabulary diversity (Type-Token Ratio)
   * AI text tends to have lower vocabulary diversity than human writing
   * @returns {Object} { score, reasons }
   */
  analyzeVocabularyDiversity(text, wordCount) {
    let score = 0;
    const reasons = [];

    if (wordCount < 200) return { score: 0, reasons: [] };

    const words = text.split(/\s+/).filter(w => w.length > 3); // skip short words
    const uniqueWords = new Set(words);
    const ttr = uniqueWords.size / words.length; // Type-Token Ratio

    // Low TTR means repetitive vocabulary (AI-like)
    // Human writing typically has TTR > 0.45 for articles
    if (ttr < 0.30) {
      score += 7;
      reasons.push('very-low-vocabulary-diversity');
    } else if (ttr < 0.38) {
      score += 4;
      reasons.push('low-vocabulary-diversity');
    }

    // Check for overuse of certain connector words
    const connectors = ['however', 'additionally', 'furthermore', 'moreover', 'therefore', 'consequently', 'nevertheless'];
    let connectorCount = 0;
    for (const c of connectors) {
      const regex = new RegExp('\\b' + c + '\\b', 'gi');
      const matches = text.match(regex);
      if (matches) connectorCount += matches.length;
    }
    const connectorDensity = connectorCount / (wordCount / 1000);
    if (connectorDensity > 8) {
      score += 3;
      reasons.push('excessive-connectors');
    }

    return { score: Math.min(score, 10), reasons };
  }

  /**
   * Analyze repetitive patterns (phrase/structure repetition)
   * AI tends to repeat exact phrases and use parallel structure excessively
   * @returns {Object} { score, reasons }
   */
  analyzeRepetition(article) {
    let score = 0;
    const reasons = [];

    const sentences = article.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 20);
    if (sentences.length < 5) return { score: 0, reasons: [] };

    // Check for repeated sentence beginnings (AI loves "This", "It", "The")
    const beginnings = sentences.map(s => {
      const words = s.split(/\s+/).slice(0, 3).join(' ').toLowerCase();
      return words;
    });

    const beginningCounts = {};
    for (const b of beginnings) {
      beginningCounts[b] = (beginningCounts[b] || 0) + 1;
    }

    const repeatedBeginnings = Object.values(beginningCounts).filter(c => c >= 3).length;
    if (repeatedBeginnings >= 3) {
      score += 5;
      reasons.push('highly-repetitive-structure');
    } else if (repeatedBeginnings >= 2) {
      score += 3;
      reasons.push('repetitive-sentence-starts');
    }

    // Check for repeated 3-grams (trigrams)
    const words = article.toLowerCase().split(/\s+/);
    if (words.length > 100) {
      const trigrams = {};
      for (let i = 0; i < words.length - 2; i++) {
        const tri = words[i] + ' ' + words[i + 1] + ' ' + words[i + 2];
        trigrams[tri] = (trigrams[tri] || 0) + 1;
      }

      const repeatedTrigrams = Object.values(trigrams).filter(c => c >= 4).length;
      if (repeatedTrigrams >= 5) {
        score += 5;
        reasons.push('repetitive-phrases');
      } else if (repeatedTrigrams >= 3) {
        score += 3;
        reasons.push('some-repeated-phrases');
      }
    }

    return { score: Math.min(score, 10), reasons };
  }

  /**
   * Analyze template/list patterns
   * AI loves numbered lists, "Here are X ways", listicle format
   * @returns {Object} { score, reasons }
   */
  analyzeTemplatePatterns(article, wordCount) {
    let score = 0;
    const reasons = [];

    // Check for list intro patterns
    const listIntros = article.match(this.structuralPatterns.listIntros) || [];
    if (listIntros.length >= 3) {
      score += 4;
      reasons.push('list-heavy-content');
    }

    // Check for numbered/bulleted items
    const numberedItems = article.match(this.structuralPatterns.numberedParagraphs) || [];
    const numberedDensity = numberedItems.length / (wordCount / 500);
    if (numberedDensity > 2) {
      score += 3;
      reasons.push('excessive-list-structure');
    }

    // Check for multiple conclusion patterns (AI often summarizes multiple times)
    const conclusions = article.match(this.structuralPatterns.conclusionPatterns) || [];
    if (conclusions.length >= 2) {
      score += 3;
      reasons.push('multiple-conclusions');
    }

    return { score: Math.min(score, 10), reasons };
  }

  // ============================================================
  // CLICKBAIT DETECTION
  // ============================================================

  /**
   * Check if title is clickbait
   * @param {string} title - Page title
   * @returns {number} Clickbait score 0-100
   */
  analyzeClickbait(title) {
    if (!title) return 0;
    const matched = this.clickbaitPatterns.filter(p => p.test(title));
    if (matched.length >= 3) return 80;
    if (matched.length >= 2) return 50;
    if (matched.length >= 1) return 25;
    return 0;
  }

  // ============================================================
  // THRESHOLD / SENSITIVITY
  // ============================================================

  /**
   * Check if content should be blocked based on threshold
   */
  shouldBlock(score, threshold) {
    return score >= threshold;
  }

  /**
   * Get sensitivity threshold
   */
  getSensitivityThreshold(sensitivity) {
    switch (sensitivity) {
      case 'low':
        return 80; // Only block very obvious AI content
      case 'medium':
        return 65; // Balanced (raised from 60)
      case 'high':
        return 45; // Aggressive blocking
      default:
        return 65;
    }
  }

  // ============================================================
  // CONTENT EXTRACTION
  // ============================================================

  /**
   * Extract article text from common selectors
   */
  extractArticleText(doc) {
    const selectors = [
      'article',
      '[role="article"]',
      'main article',
      '.post-content',
      '.article-content',
      '.entry-content',
      '.content',
      'main',
      '#content',
      '.story-body',
      '[class*="article-body"]',
      '[class*="post-body"]'
    ];

    for (const selector of selectors) {
      const element = doc.querySelector(selector);
      if (element && element.textContent.trim().length > 200) {
        // Clone and remove scripts/styles/nav
        const clone = element.cloneNode(true);
        clone.querySelectorAll('script, style, noscript, nav, header, footer, aside').forEach(el => el.remove());
        return clone.textContent.trim();
      }
    }

    // Fallback: get body text (but strip nav/header/footer)
    const body = doc.body;
    if (body) {
      const clone = body.cloneNode(true);
      clone.querySelectorAll('script, style, noscript, nav, header, footer, aside, [role="navigation"]').forEach(el => el.remove());
      const text = clone.textContent.trim();
      // Only use body text if it's substantial
      if (text.length > 500) {
        return text;
      }
    }

    return '';
  }

  /**
   * Get article title
   */
  extractTitle(doc) {
    return (
      doc.querySelector('h1')?.textContent ||
      doc.querySelector('meta[property="og:title"]')?.content ||
      doc.title ||
      ''
    ).trim();
  }
}

// Create singleton instance
const aiPatternDetector = new AIPatternDetector();

// Export for use in content scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = aiPatternDetector;
}
