// Brainrot Content Detection Patterns v2
// Smarter detection: tiered keywords, requires multiple signals, reduces false positives
// Updated as of 2026-02-11

// ============================================================
// BRAINROT KEYWORDS (Tiered)
// ============================================================

// Tier 1: Strong brainrot indicators - a single match adds significant weight
const BRAINROT_STRONG = [
  // Updated as of 2026-02-11
  'skibidi',
  'gyatt',
  'rizz',
  'fanum tax',
  'ohio final boss',
  'sigma grindset',
  'sigma male',
  'gigachad',
  'brain rot',
  'brainrot',
  'andrew tate',
  'alpha male',
  'slay queen',
  'delulu',
  'ai generated',
  'text to speech',
  'auto generated',
  'mewing',
  'looksmaxxing',
  'heightmaxxing',
  'chad',
  'beta male',
  'alpha grindset',
  'goon cave',
  'edging',
  'just put the fries in the bag',
  'hawk tuah',
  'ohio',
  'baby gronk',
  'livvy dunne',
  'lil bro',
  'maidenless',
  'touch grass',
  'caught in 4k ultra hd',
  'main character syndrome',
  'sigma rules',
  'tate speech',
  'hustlers university',
  'cobratate',
  'w rizz',
  'l rizz',
  'negative canthal tilt',
  'forward growth',
  'bonesmashing',
  'softmaxxing',
  'hardmaxxing',
  'percent body fat',
  'bf%',
  'body fat percentage'
];

// Tier 2: Moderate indicators - need 2+ to matter
const BRAINROT_MODERATE = [
  // Updated as of 2026-02-11
  'wait for it',
  'wait until',
  'watch till the end',
  'watch until the end',
  'you need to see this',
  'must watch',
  'subscribe for',
  'like and subscribe',
  'drop a like',
  'smash that like',
  'smash that subscribe',
  'hit the bell',
  'no cap fr',
  'literally me when',
  'caught in 4k',
  'npc behavior',
  'main character energy',
  'rent free',
  'this is crazy',
  'insane clip',
  'unbelievable moment',
  'wait for the end',
  'part 2 in bio',
  'link in bio',
  'full video on',
  'follow for more',
  'like for part 2',
  'comment if',
  'share if you agree',
  'this you?',
  'pov you',
  'that one friend who',
  'nobody:',
  'absolutely nobody:',
  'meme compilation'
];

// Tier 3: Weak indicators - only count if strong/moderate also present
// These are common in normal content, so alone they mean nothing
const BRAINROT_WEAK = [
  'reaction to',
  'reacting to',
  'my reaction',
  'react to',
  'tts',
  'no cap',
  'sigma',
  'based',
  'mid',
  'pov:',
  'real',
  'ong',
  'fr',
  'bro',
  'bruh'
];

// NOT included anymore (too many false positives):
// 'part 1/2/3' - legitimate series content
// 'day 1/2/3' - legitimate vlogs, challenges
// 'episode 1/2' - legitimate series
// 'when you' - extremely common in normal memes
// 'literally me' - too common

// ============================================================
// CLICKBAIT PATTERNS
// ============================================================

const VIDEO_CLICKBAIT_PATTERNS = [
  /\b(you won'?t believe|unbelievable)\b/i,
  /\b(gone wrong|goes wrong)\b/i,
  /\b(exposed|exposing)\b(?!\s*(to|at|in))/i, // avoid "exposed to sunlight"
  /\bmust (watch|see)\b/i,
  /\bwait for it\b/i,
  /\bwatch (till|until) (the )?end\b/i,
  /\byou'?re doing (it|this) wrong\b/i,
  /\bwhat happens (next|when)\b/i,
  /\bmind ?blown\b/i,
  /\b(best|worst) (ever|of all time)\b/i,
  /\b(life|mind) (changing|blowing|altering)\b/i
];

// Removed overly broad patterns:
// /shocking|shocked/ - common in legitimate news
// /crazy|insane|wild/ - extremely common colloquial words
// /secret|secrets/ - common in educational content
// /this is why/ - common in explanatory content
// /\d+ reasons/ - common in legitimate lists
// /100%/ - very common
// /final part|episode/ - legitimate series

// ============================================================
// SPAM INDICATORS
// ============================================================

const SPAM_INDICATORS = {
  maxEmojis: 5,              // Raised from 3 - many legit creators use emojis
  maxCapsPercentage: 0.6,    // Raised from 0.5 - some legit titles use caps for emphasis
  repeatedPunctuation: /([!?.])\1{2,}/
};

// ============================================================
// AI VIDEO PHRASES
// ============================================================

const AI_VIDEO_PHRASES = [
  'discover the secrets',
  'unlock the power',
  'revolutionize your',
  'game-changing',
  'you need to know',
  'dive deep into',
  'comprehensive guide',
  'ultimate guide',
  'everything you need'
];

// Removed:
// 'life hack' - common legitimate genre
// 'in today\'s video' - extremely common normal intro
// 'today we\'re going to' - standard video intro
// 'don\'t forget to subscribe' - standard outro (not brainrot)

// ============================================================
// DETECTOR CLASS
// ============================================================

class BrainrotDetector {
  constructor() {
    this.strongKeywords = BRAINROT_STRONG;
    this.moderateKeywords = BRAINROT_MODERATE;
    this.weakKeywords = BRAINROT_WEAK;
    this.clickbaitPatterns = VIDEO_CLICKBAIT_PATTERNS;
    this.aiPhrases = AI_VIDEO_PHRASES;
    this.spamIndicators = SPAM_INDICATORS;
  }

  /**
   * Analyze content and return slop score (0-100)
   * Higher score = more likely to be brainrot/low-quality
   * @param {Object} content - { title, description, channelName }
   * @returns {number} Score from 0-100
   */
  analyzeSlopScore(content) {
    let score = 0;
    const { title = '', description = '', channelName = '' } = content;
    
    const titleLower = title.toLowerCase();
    const descLower = description.toLowerCase();
    const combined = titleLower + ' ' + descLower;
    
    // 1. Strong brainrot keywords (max 35 points)
    const strongCount = this._countMatches(combined, this.strongKeywords);
    if (strongCount >= 3) score += 35;
    else if (strongCount >= 2) score += 25;
    else if (strongCount >= 1) score += 15;
    
    // 2. Moderate brainrot keywords (max 20 points)
    const moderateCount = this._countMatches(combined, this.moderateKeywords);
    if (moderateCount >= 3) score += 20;
    else if (moderateCount >= 2) score += 12;
    else if (moderateCount >= 1) score += 6;
    
    // 3. Weak keywords - ONLY count if strong or moderate also present
    if (strongCount >= 1 || moderateCount >= 2) {
      const weakCount = this._countMatches(combined, this.weakKeywords);
      if (weakCount >= 3) score += 10;
      else if (weakCount >= 2) score += 5;
    }
    
    // 4. Clickbait Patterns in TITLE only (max 20 points)
    const clickbaitCount = this._countClickbait(titleLower);
    if (clickbaitCount >= 3) score += 20;
    else if (clickbaitCount >= 2) score += 12;
    else if (clickbaitCount >= 1) score += 6;
    
    // 5. AI-generated phrases (max 15 points)
    const aiPhraseCount = this._countMatches(combined, this.aiPhrases);
    if (aiPhraseCount >= 3) score += 15;
    else if (aiPhraseCount >= 2) score += 10;
    else if (aiPhraseCount >= 1) score += 5;
    
    // 6. Spam indicators (max 10 points)
    score += this._analyzeSpamIndicators(title);
    
    return Math.min(score, 100);
  }

  /**
   * Count keyword matches
   * @private
   */
  _countMatches(text, keywords) {
    return keywords.filter(keyword => text.includes(keyword)).length;
  }

  /**
   * Count clickbait pattern matches
   * @private
   */
  _countClickbait(text) {
    return this.clickbaitPatterns.filter(pattern => pattern.test(text)).length;
  }

  /**
   * Analyze spam indicators (emojis, caps, punctuation)
   * @private
   */
  _analyzeSpamIndicators(title) {
    let spamScore = 0;
    
    // Count emojis
    const emojiCount = (title.match(/[\u{1F300}-\u{1F9FF}]/gu) || []).length;
    if (emojiCount > this.spamIndicators.maxEmojis) {
      spamScore += 4;
    }
    
    // Check caps percentage (only for titles with enough letters)
    const letters = (title.match(/[A-Za-z]/g) || []);
    if (letters.length >= 10) {
      const capsCount = letters.filter(c => c === c.toUpperCase() && c !== c.toLowerCase()).length;
      const capsPercentage = capsCount / letters.length;
      if (capsPercentage > this.spamIndicators.maxCapsPercentage) {
        spamScore += 3;
      }
    }
    
    // Check repeated punctuation
    if (this.spamIndicators.repeatedPunctuation.test(title)) {
      spamScore += 3;
    }
    
    return Math.min(spamScore, 10);
  }

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
        return 70;  // Only block very obvious brainrot
      case 'medium':
        return 50;  // Balanced approach
      case 'high':
        return 35;  // Aggressive blocking
      default:
        return 50;
    }
  }

  /**
   * Extract video metadata from DOM element
   * Works for YouTube, Instagram, TikTok
   */
  extractVideoMetadata(element) {
    const metadata = {
      title: '',
      description: '',
      channelName: ''
    };
    
    const titleSelectors = [
      'h3', 'h2', 'h1',
      '[id*="title"]',
      '[class*="title"]',
      '[aria-label]',
      'a[title]'
    ];
    
    for (const selector of titleSelectors) {
      const titleEl = element.querySelector(selector);
      if (titleEl) {
        metadata.title = titleEl.textContent?.trim() ||
                        titleEl.getAttribute('aria-label') ||
                        titleEl.getAttribute('title') || '';
        if (metadata.title) break;
      }
    }
    
    const descSelectors = [
      '[id*="description"]',
      '[class*="description"]',
      '[class*="snippet"]',
      'p'
    ];
    
    for (const selector of descSelectors) {
      const descEl = element.querySelector(selector);
      if (descEl) {
        metadata.description = descEl.textContent?.trim() || '';
        if (metadata.description && metadata.description.length > 20) break;
      }
    }
    
    const channelSelectors = [
      '[class*="channel"]',
      '[class*="author"]',
      '[class*="username"]',
      'a[href*="/@"]',
      'a[href*="/user/"]',
      'a[href*="/c/"]'
    ];
    
    for (const selector of channelSelectors) {
      const channelEl = element.querySelector(selector);
      if (channelEl) {
        metadata.channelName = channelEl.textContent?.trim() || '';
        if (metadata.channelName) break;
      }
    }
    
    return metadata;
  }
}

// Create singleton instance
const brainrotDetector = new BrainrotDetector();

// Export for use in content scripts
if (typeof window !== 'undefined') {
  window.brainrotDetector = brainrotDetector;
}
