// AI Content Detection Patterns
// Heuristic-based detection of AI-generated low-quality content

// Common AI-generated content phrases (trained on GPT/Claude patterns)
const AI_PHRASES = [
  'delve into',
  'it\'s important to note',
  'it is important to note',
  'in today\'s digital age',
  'in this digital age',
  'revolutionize',
  'game-changer',
  'unlock the power',
  'in conclusion',
  'to summarize',
  'moreover',
  'furthermore',
  'nonetheless',
  'navigate the landscape',
  'landscape of',
  'it\'s worth noting',
  'elevate your',
  'leverage',
  'at the end of the day',
  'dive deep',
  'unpack',
  'holistic approach',
  'seamlessly',
  'robust solution',
  'cutting-edge',
  'state-of-the-art',
  'ever-evolving',
  'empower',
  'transformative',
  'paradigm shift',
  'synergy',
  'optimize',
  'maximize',
  'streamline',
  'best practices',
  'comprehensive guide',
  'ultimate guide',
  'everything you need to know'
];

// Clickbait patterns (regex)
const CLICKBAIT_PATTERNS = [
  /you won'?t believe/i,
  /doctors hate/i,
  /one weird trick/i,
  /what happened next/i,
  /this is why/i,
  /the reason why/i,
  /here's why/i,
  /here is why/i,
  /\d+ reasons? why/i,
  /number \d+ will shock you/i,
  /will blow your mind/i,
  /changed my life/i,
  /this simple trick/i,
  /you're doing it wrong/i,
  /everyone is talking about/i,
  /going viral/i,
  /breaking the internet/i
];

// Low-quality content indicators
const SPAM_PATTERNS = [
  /click here/i,
  /buy now/i,
  /limited time offer/i,
  /act now/i,
  /don't miss out/i,
  /subscribe now/i,
  /free download/i,
  /get it now/i
];

class AIPatternDetector {
  constructor() {
    this.aiPhrases = AI_PHRASES;
    this.clickbaitPatterns = CLICKBAIT_PATTERNS;
    this.spamPatterns = SPAM_PATTERNS;
  }

  // Main detection method - returns a score from 0-100
  analyzeSlopScore(article, document) {
    let score = 0;
    const text = article.toLowerCase();
    
    // 1. AI Phrase Detection (max 35 points)
    const aiPhraseCount = this.countAIPhrases(text);
    if (aiPhraseCount >= 8) score += 35;
    else if (aiPhraseCount >= 5) score += 25;
    else if (aiPhraseCount >= 3) score += 15;
    else if (aiPhraseCount >= 1) score += 5;
    
    // 2. Clickbait Detection (max 20 points)
    const clickbaitCount = this.countClickbait(text);
    if (clickbaitCount >= 3) score += 20;
    else if (clickbaitCount >= 2) score += 15;
    else if (clickbaitCount >= 1) score += 10;
    
    // 3. Content Quality Analysis (max 25 points)
    const quality = this.analyzeQuality(article);
    if (quality.wordCount < 200) score += 15;
    else if (quality.wordCount < 400) score += 8;
    
    if (quality.isUnnatural) score += 10;
    
    // 4. Credibility Check (max 20 points)
    const credible = this.checkCredibility(document);
    if (!credible.hasAuthor) score += 10;
    if (!credible.hasDate) score += 5;
    if (!credible.hasSource) score += 5;
    
    return Math.min(score, 100);
  }

  // Count AI-generated phrases
  countAIPhrases(text) {
    return this.aiPhrases.filter(phrase => text.includes(phrase)).length;
  }

  // Count clickbait patterns
  countClickbait(text) {
    return this.clickbaitPatterns.filter(pattern => pattern.test(text)).length;
  }

  // Analyze content quality metrics
  analyzeQuality(article) {
    const words = article.trim().split(/\s+/);
    const wordCount = words.length;
    
    const sentences = article.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const sentenceCount = sentences.length || 1;
    
    const avgWordsPerSentence = wordCount / sentenceCount;
    
    // AI tends to generate very uniform sentence structures
    // Too long (>30) or too short (<10) average = suspicious
    const isUnnatural = avgWordsPerSentence > 30 || avgWordsPerSentence < 8;
    
    // Check for repetitive structure
    const uniqueStarts = new Set(
      sentences.slice(0, 10).map(s => s.trim().split(/\s+/)[0]?.toLowerCase())
    );
    const hasRepetitiveStarts = sentences.length > 5 && uniqueStarts.size < sentences.length * 0.5;
    
    return {
      wordCount,
      sentenceCount,
      avgWordsPerSentence,
      isUnnatural: isUnnatural || hasRepetitiveStarts
    };
  }

  // Check for credibility markers
  checkCredibility(doc) {
    const hasAuthor = !!(
      doc.querySelector('.author, [rel="author"], [class*="author"], [class*="byline"]') ||
      doc.querySelector('meta[name="author"]')
    );
    
    const hasDate = !!(
      doc.querySelector('time, .date, [class*="date"], [class*="published"]') ||
      doc.querySelector('meta[property="article:published_time"]')
    );
    
    const hasSource = !!(
      doc.querySelector('.source, [class*="source"]') ||
      doc.querySelector('meta[property="og:site_name"]')
    );
    
    return { hasAuthor, hasDate, hasSource };
  }

  // Check if content should be blocked based on threshold
  shouldBlock(score, threshold) {
    return score >= threshold;
  }

  // Get sensitivity threshold
  getSensitivityThreshold(sensitivity) {
    switch (sensitivity) {
      case 'low':
        return 80; // Only block very obvious AI content
      case 'medium':
        return 60; // Balanced approach
      case 'high':
        return 40; // Aggressive blocking
      default:
        return 60;
    }
  }

  // Check if domain is whitelisted
  isWhitelisted(domain, whitelist) {
    return whitelist.some(allowed => 
      domain.includes(allowed) || allowed.includes(domain)
    );
  }

  // Extract article text from common selectors
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
      '[class*="article"]',
      '[class*="post-body"]'
    ];

    for (const selector of selectors) {
      const element = doc.querySelector(selector);
      if (element && element.textContent.trim().length > 100) {
        return element.textContent.trim();
      }
    }

    // Fallback: get body text
    const body = doc.body?.textContent || '';
    return body.trim();
  }

  // Get article title
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
