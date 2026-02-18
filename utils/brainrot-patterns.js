// Brainrot Content Detection Patterns v3
// Stronger detection: more patterns, lower thresholds, catches more AI slop
// Updated as of 2026-02-17

// ============================================================
// BRAINROT KEYWORDS (Tiered)
// ============================================================

// Tier 1: Strong brainrot indicators - INSTANT FLAG
const BRAINROT_STRONG = [
  // Gen Alpha/Brainrot slang (2024-2026)
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
  'mewing',
  'looksmaxxing',
  'heightmaxxing',
  'bonesmashing',
  'softmaxxing',
  'hardmaxxing',
  'chad',
  'beta male',
  'alpha grindset',
  'goon cave',
  'edging',
  'hawk tuah',
  'baby gronk',
  'livvy dunne',
  'lil bro',
  'maidenless',
  'sigma rules',
  'tate speech',
  'hustlers university',
  'cobratate',
  'w rizz',
  'l rizz',
  'negative canthal tilt',
  'forward growth',
  
  // AI/Generated content markers
  'ai generated',
  'text to speech',
  'auto generated',
  'tts voice',
  'automated content',
  'synthetic voice',
  
  // Engagement farming patterns
  'just put the fries in the bag',
  'caught in 4k ultra hd',
  'touch grass',
  'main character syndrome',
  
  // Red pill/manosphere indicators
  'red pill',
  'black pill',
  'pill mindset',
  'female nature',
  'hypergamy',
  'body count',
  'high value male',
  'sexual marketplace',
  
  // Obvious clickbait markers
  'you won\'t believe',
  'this will blow your mind',
  'doctors hate him',
  'one weird trick'
];

// Tier 2: Moderate indicators - needs 1-2 to flag
const BRAINROT_MODERATE = [
  // Engagement farming
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
  'part 2 in bio',
  'link in bio',
  'full video on',
  'follow for more',
  'like for part 2',
  'comment if',
  'share if you agree',
  'this you?',
  
  // Low effort content markers
  'no cap fr',
  'literally me when',
  'caught in 4k',
  'npc behavior',
  'main character energy',
  'rent free',
  'this is crazy',
  'insane clip',
  'unbelievable moment',
  'meme compilation',
  'pov you',
  'that one friend who',
  'nobody:',
  'absolutely nobody:',
  
  // Reaction content
  'reaction to',
  'reacting to',
  'my reaction',
  'react to',
  
  // Algorithm manipulation
  'check pinned',
  'check comments',
  'read description',
  'turn on notifications',
  'notification squad'
];

// Tier 3: Weak indicators - only count with others
const BRAINROT_WEAK = [
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
  'bruh',
  'got him',
  'it\'s giving',
  'understood the assignment',
  'living rent free',
  'taking an l',
  'taking the l',
  'ratioed',
  'cooked',
  'let him cook'
];

// ============================================================
// AI CONTENT PATTERNS (NEW - Stronger Detection)
// ============================================================

const AI_CONTENT_PATTERNS = [
  // AI video intros
  'in today\'s video',
  'in this video',
  'today we\'re going to',
  'today we are going to',
  'let\'s dive in',
  'let\'s get into it',
  
  // AI article phrases
  'delve into',
  'dive deep into',
  'explore the',
  'navigate the landscape',
  'in today\'s digital age',
  'ever-evolving landscape',
  'paradigm shift',
  'game-changing',
  'revolutionize',
  'unlock the power',
  
  // Generic AI conclusions
  'in conclusion',
  'to sum up',
  'to summarize',
  'the bottom line is',
  'at the end of the day',
  'key takeaways',
  
  // AI listicle markers
  'comprehensive guide',
  'ultimate guide',
  'everything you need to know',
  'all you need to know',
  'step by step guide',
  'complete guide to'
];

// ============================================================
// CLICKBAIT PATTERNS (Expanded)
// ============================================================

const VIDEO_CLICKBAIT_PATTERNS = [
  /\b(you won'?t believe|unbelievable)\b/i,
  /\b(gone wrong|goes wrong|went wrong)\b/i,
  /\b(exposed|exposing)\b(?!\s*(to|at|in|for))/i,
  /\bmust (watch|see)\b/i,
  /\bwait for it\b/i,
  /\bwatch (till|until) (the )?end\b/i,
  /\byou'?re doing (it|this) wrong\b/i,
  /\bwhat happens (next|when)\b/i,
  /\bmind ?blown\b/i,
  /\b(best|worst) (ever|of all time)\b/i,
  /\b(life|mind) (changing|blowing|altering)\b/i,
  /\b(shocked|shocking)\b/i,
  /\b(crazy|insane|wild)\s+(thing|moment|reveal)\b/i,
  /\b(before (it'?s too late|it gets deleted))\b/i,
  /\b(deleted soon|won'?t last)\b/i,
  /\b(number \d+ (will |shock|surprise|amaze))\b/i,
  /\b(only (1|one) (percent|%|thing))\b/i,
  /\b(secret|secrets) (to|that|revealed)\b/i,
  /\b(stop (doing|using|buying))\b/i,
  /\b(never (do|buy|use|eat))\b/i
];

// ============================================================
// SPAM INDICATORS
// ============================================================

const SPAM_INDICATORS = {
  maxEmojis: 4,
  maxCapsPercentage: 0.5,
  repeatedPunctuation: /([!?.])\1{2,}/,
  emojiSpam: /[\u{1F300}-\u{1F9FF}]{3,}/u
};

// ============================================================
// DETECTOR CLASS (v3 - Stronger Scoring)
// ============================================================

class BrainrotDetector {
  constructor() {
    this.strongKeywords = BRAINROT_STRONG;
    this.moderateKeywords = BRAINROT_MODERATE;
    this.weakKeywords = BRAINROT_WEAK;
    this.aiPatterns = AI_CONTENT_PATTERNS;
    this.clickbaitPatterns = VIDEO_CLICKBAIT_PATTERNS;
    this.spamIndicators = SPAM_INDICATORS;
    this.customRules = {
      enabled: true,
      blockKeywords: [],
      allowKeywords: []
    };

    this._loadCustomRules();
    this._bindSettingsListener();
  }

  /**
   * Analyze content and return slop score (0-100)
   * Higher score = more likely to be brainrot/low-quality
   */
  analyzeSlopScore(content) {
    let score = 0;
    const { title = '', description = '', channelName = '' } = content;
    
    const titleLower = title.toLowerCase();
    const descLower = description.toLowerCase();
    const combined = titleLower + ' ' + descLower;
    
    // 1. Strong brainrot keywords (max 40 points - INCREASED)
    const strongCount = this._countMatches(combined, this.strongKeywords);
    if (strongCount >= 3) score += 40;
    else if (strongCount >= 2) score += 30;
    else if (strongCount >= 1) score += 20;
    
    // 2. Moderate brainrot keywords (max 25 points - INCREASED)
    const moderateCount = this._countMatches(combined, this.moderateKeywords);
    if (moderateCount >= 3) score += 25;
    else if (moderateCount >= 2) score += 15;
    else if (moderateCount >= 1) score += 8;
    
    // 3. Weak keywords (max 10 points)
    if (strongCount >= 1 || moderateCount >= 1) {
      const weakCount = this._countMatches(combined, this.weakKeywords);
      if (weakCount >= 3) score += 10;
      else if (weakCount >= 2) score += 5;
    }
    
    // 4. AI content patterns (max 20 points - NEW)
    const aiCount = this._countMatches(combined, this.aiPatterns);
    if (aiCount >= 3) score += 20;
    else if (aiCount >= 2) score += 12;
    else if (aiCount >= 1) score += 6;
    
    // 5. Clickbait patterns (max 20 points)
    const clickbaitCount = this._countClickbait(titleLower);
    if (clickbaitCount >= 3) score += 20;
    else if (clickbaitCount >= 2) score += 12;
    else if (clickbaitCount >= 1) score += 6;
    
    // 6. Spam indicators (max 10 points)
    score += this._analyzeSpamIndicators(title);
    
    // 7. Channel name red flags (max 10 points)
    if (channelName) {
      const channelLower = channelName.toLowerCase();
      if (/official|real|the\s+\w+|daily|viral|best|top|facts/i.test(channelLower)) {
        if (/shorts|clips|viral|trends|news|facts|daily/i.test(channelLower)) {
          score += 10;
        }
      }
    }

    // 8. User custom keywords (global override)
    const customSignal = this.evaluateCustomRules(combined);
    score += customSignal.scoreDelta;
    
    return Math.max(0, Math.min(score, 100));
  }

  /**
   * Evaluate user custom block/allow keywords on text
   * @param {string} text
   * @returns {{scoreDelta:number, blockMatches:string[], allowMatches:string[]}}
   */
  evaluateCustomRules(text) {
    if (!this.customRules?.enabled || !text) {
      return { scoreDelta: 0, blockMatches: [], allowMatches: [] };
    }

    const normalizedText = String(text).toLowerCase();
    const blockMatches = this.customRules.blockKeywords.filter(keyword =>
      normalizedText.includes(keyword)
    );
    const allowMatches = this.customRules.allowKeywords.filter(keyword =>
      normalizedText.includes(keyword)
    );

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

  _loadCustomRules(settingsPayload) {
    const extracted = this._extractCustomRules(settingsPayload || {});
    this.customRules = extracted;

    if (settingsPayload && settingsPayload.customRules) {
      return;
    }

    if (!chrome?.storage?.sync?.get) {
      return;
    }

    chrome.storage.sync.get(['antiSlop_settings'], (result) => {
      const settings = result?.antiSlop_settings || {};
      this.customRules = this._extractCustomRules(settings);
    });
  }

  _bindSettingsListener() {
    if (!chrome?.storage?.onChanged?.addListener) {
      return;
    }

    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace !== 'sync' || !changes.antiSlop_settings?.newValue) {
        return;
      }

      this.customRules = this._extractCustomRules(changes.antiSlop_settings.newValue);
    });
  }

  _extractCustomRules(settings) {
    const rawRules = settings.customRules || {};
    const blockKeywords = this._normalizeCustomKeywordList(rawRules.blockKeywords);
    const allowKeywords = this._normalizeCustomKeywordList(rawRules.allowKeywords);

    return {
      enabled: rawRules.enabled !== false,
      blockKeywords,
      allowKeywords
    };
  }

  _normalizeCustomKeywordList(list) {
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

  _countMatches(text, keywords) {
    return keywords.filter(keyword => text.includes(keyword)).length;
  }

  _countClickbait(text) {
    return this.clickbaitPatterns.filter(pattern => pattern.test(text)).length;
  }

  _analyzeSpamIndicators(title) {
    let spamScore = 0;
    
    // Emoji spam
    const emojiCount = (title.match(/[\u{1F300}-\u{1F9FF}]/gu) || []).length;
    if (emojiCount > this.spamIndicators.maxEmojis) {
      spamScore += 5;
    }
    
    // Caps spam
    const letters = (title.match(/[A-Za-z]/g) || []);
    if (letters.length >= 8) {
      const capsCount = letters.filter(c => c === c.toUpperCase() && c !== c.toLowerCase()).length;
      const capsPercentage = capsCount / letters.length;
      if (capsPercentage > this.spamIndicators.maxCapsPercentage) {
        spamScore += 3;
      }
    }
    
    // Repeated punctuation
    if (this.spamIndicators.repeatedPunctuation.test(title)) {
      spamScore += 3;
    }
    
    return Math.min(spamScore, 10);
  }

  /**
   * Get sensitivity threshold - LOWERED for stronger detection
   */
  getSensitivityThreshold(sensitivity) {
    switch (sensitivity) {
      case 'low':
        return 55;    // Was 70
      case 'medium':
        return 35;    // Was 50
      case 'high':
        return 20;    // Was 35
      default:
        return 35;
    }
  }

  shouldBlock(score, threshold) {
    return score >= threshold;
  }

  extractVideoMetadata(element) {
    const metadata = { title: '', description: '', channelName: '' };
    
    const titleSelectors = ['h3', 'h2', 'h1', '[id*="title"]', '[class*="title"]', '[aria-label]', 'a[title]'];
    for (const selector of titleSelectors) {
      const titleEl = element.querySelector(selector);
      if (titleEl) {
        metadata.title = titleEl.textContent?.trim() || titleEl.getAttribute('aria-label') || titleEl.getAttribute('title') || '';
        if (metadata.title) break;
      }
    }
    
    const descSelectors = ['[id*="description"]', '[class*="description"]', '[class*="snippet"]', 'p'];
    for (const selector of descSelectors) {
      const descEl = element.querySelector(selector);
      if (descEl) {
        metadata.description = descEl.textContent?.trim() || '';
        if (metadata.description && metadata.description.length > 20) break;
      }
    }
    
    const channelSelectors = ['[class*="channel"]', '[class*="author"]', '[class*="username"]', 'a[href*="/@"]', 'a[href*="/user/"]', 'a[href*="/c/"]'];
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

const brainrotDetector = new BrainrotDetector();

if (typeof window !== 'undefined') {
  window.brainrotDetector = brainrotDetector;
}
