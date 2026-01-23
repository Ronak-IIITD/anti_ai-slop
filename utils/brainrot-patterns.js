// Brainrot Content Detection Patterns
// Detects low-quality, AI-generated, or addictive brainrot content in videos/posts

// Brainrot/Low-value content keywords
const BRAINROT_KEYWORDS = [
  // AI/Generic content
  'ai generated',
  'chatgpt',
  'auto generated',
  'text to speech',
  'tts',
  
  // Repetitive/lazy content
  'part 1', 'part 2', 'part 3', 'part 4', 'part 5',
  'day 1', 'day 2', 'day 3',
  'episode 1', 'episode 2',
  
  // Low effort memes
  'skibidi',
  'sigma',
  'based',
  'gigachad',
  'andrew tate',
  'brain rot',
  'brainrot',
  
  // Attention manipulation
  'wait for it',
  'wait until',
  'watch till the end',
  'watch until the end',
  'you need to see this',
  'must watch',
  
  // Trend chasing without substance
  'pov:',
  'when you',
  'literally me',
  'real',
  'no cap',
  
  // Spam/bot indicators
  'subscribe for',
  'like and subscribe',
  'drop a like',
  'smash that',
  'hit the bell',
  
  // Generic reaction content
  'reaction to',
  'reacting to',
  'my reaction',
  'react to'
];

// Clickbait patterns for video titles
const VIDEO_CLICKBAIT_PATTERNS = [
  /\b(you won'?t believe|unbelievable)\b/i,
  /\b(shocking|shocked)\b/i,
  /\b(crazy|insane|wild)\b/i,
  /\b(gone wrong|goes wrong)\b/i,
  /\b(exposed|exposing)\b/i,
  /\b(secret|secrets)\b/i,
  /\bmust (watch|see)\b/i,
  /\bthis is why\b/i,
  /\bwait for it\b/i,
  /\bwatch (till|until) (the )?end\b/i,
  /\b\d+ (reasons?|ways|things|secrets)\b/i,
  /\byou'?re doing (it|this) wrong\b/i,
  /\bwhat happens (next|when)\b/i,
  /\b(life|mind) (changing|blowing|altering)\b/i,
  /\bmind ?blown\b/i,
  /\bgame ?changer\b/i,
  /\b(best|worst) (ever|of all time)\b/i,
  /\b100%\b/i,
  /\bfinal (part|episode|day)\b/i
];

// Excessive emoji/caps patterns
const SPAM_INDICATORS = {
  // More than 3 emojis in title = spam
  maxEmojis: 3,
  // More than 50% caps = shouting/spam
  maxCapsPercentage: 0.5,
  // Multiple repeated punctuation
  repeatedPunctuation: /([!?.])\1{2,}/
};

// AI-generated content phrases (adapted for video descriptions)
const AI_VIDEO_PHRASES = [
  'discover the secrets',
  'unlock the power',
  'revolutionize your',
  'game-changing',
  'life hack',
  'you need to know',
  'dive deep into',
  'comprehensive guide',
  'ultimate guide',
  'everything you need',
  'in today\'s video',
  'today we\'re going to',
  'don\'t forget to subscribe'
];

class BrainrotDetector {
  constructor() {
    this.brainrotKeywords = BRAINROT_KEYWORDS;
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
    
    // 1. Brainrot Keywords (max 30 points)
    const brainrotCount = this.countBrainrotKeywords(titleLower + ' ' + descLower);
    if (brainrotCount >= 5) score += 30;
    else if (brainrotCount >= 3) score += 20;
    else if (brainrotCount >= 1) score += 10;
    
    // 2. Clickbait Patterns (max 25 points)
    const clickbaitCount = this.countClickbait(titleLower);
    if (clickbaitCount >= 3) score += 25;
    else if (clickbaitCount >= 2) score += 15;
    else if (clickbaitCount >= 1) score += 10;
    
    // 3. AI-generated phrases (max 20 points)
    const aiPhraseCount = this.countAIPhrases(titleLower + ' ' + descLower);
    if (aiPhraseCount >= 4) score += 20;
    else if (aiPhraseCount >= 2) score += 12;
    else if (aiPhraseCount >= 1) score += 6;
    
    // 4. Spam indicators (max 15 points)
    const spamScore = this.analyzeSpamIndicators(title);
    score += spamScore;
    
    // 5. Title quality (max 10 points)
    const titleQuality = this.analyzeTitleQuality(title);
    if (titleQuality.isSuspicious) score += 10;
    else if (titleQuality.isLowEffort) score += 5;
    
    return Math.min(score, 100);
  }

  /**
   * Count brainrot keywords
   */
  countBrainrotKeywords(text) {
    return this.brainrotKeywords.filter(keyword => text.includes(keyword)).length;
  }

  /**
   * Count clickbait patterns
   */
  countClickbait(text) {
    return this.clickbaitPatterns.filter(pattern => pattern.test(text)).length;
  }

  /**
   * Count AI-generated phrases
   */
  countAIPhrases(text) {
    return this.aiPhrases.filter(phrase => text.includes(phrase)).length;
  }

  /**
   * Analyze spam indicators (emojis, caps, punctuation)
   */
  analyzeSpamIndicators(title) {
    let spamScore = 0;
    
    // Count emojis (very rough approximation)
    const emojiCount = (title.match(/[\u{1F300}-\u{1F9FF}]/gu) || []).length;
    if (emojiCount > this.spamIndicators.maxEmojis) {
      spamScore += 5;
    }
    
    // Check caps percentage
    const capsCount = (title.match(/[A-Z]/g) || []).length;
    const letterCount = (title.match(/[A-Za-z]/g) || []).length;
    if (letterCount > 0) {
      const capsPercentage = capsCount / letterCount;
      if (capsPercentage > this.spamIndicators.maxCapsPercentage) {
        spamScore += 5;
      }
    }
    
    // Check repeated punctuation
    if (this.spamIndicators.repeatedPunctuation.test(title)) {
      spamScore += 5;
    }
    
    return Math.min(spamScore, 15);
  }

  /**
   * Analyze title quality
   */
  analyzeTitleQuality(title) {
    const wordCount = title.trim().split(/\s+/).length;
    
    // Very short titles (< 3 words) are often low effort
    const isTooShort = wordCount < 3;
    
    // Very long titles (> 20 words) are often spam
    const isTooLong = wordCount > 20;
    
    // All caps or no caps = suspicious
    const hasNoCaps = !/[A-Z]/.test(title);
    const isAllCaps = title === title.toUpperCase() && /[A-Z]/.test(title);
    
    // Check for generic patterns
    const isGeneric = /^(part|day|episode|video) \d+$/i.test(title.trim());
    
    return {
      isSuspicious: isTooLong || isAllCaps || isGeneric,
      isLowEffort: isTooShort || hasNoCaps
    };
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
        return 70; // Only block very obvious brainrot
      case 'medium':
        return 50; // Balanced approach
      case 'high':
        return 35; // Aggressive blocking
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
    
    // Try to find title
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
    
    // Try to find description
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
    
    // Try to find channel/author name
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
