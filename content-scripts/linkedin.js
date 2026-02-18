// LinkedIn Content Script for Anti-Slop Extension
// Filters motivational spam, AI-generated posts, engagement bait
// Updated as of 2026-02-17

// ============================================================
// SELECTORS (Updated as of 2026-02-17)
// ============================================================

const LINKEDIN_SELECTORS = {
  // Feed posts
  feedPost: 'div.feed-shared-update-v2, div[data-urn*="activity"]',
  // Post text content
  postText: '.feed-shared-text, .break-words, .feed-shared-update-v2__description',
  // Post author
  postAuthor: '.update-components-actor__name, .feed-shared-actor__name',
  // Post engagement metrics
  postReactions: '.social-details-social-counts__reactions-count',
  postComments: '.social-details-social-counts__comments',
  // Comment elements
  comment: '.comments-comment-item, .comments-comment-entity',
  commentText: '.comments-comment-item__main-content, .comments-comment-entity__content',
  // Promoted posts
  promotedLabel: '.update-components-actor__sub-description-link, [data-ad-banner]',
  // Repost indicator
  repostIndicator: '.update-components-header__text-view'
};

// ============================================================
// LINKEDIN BRAINROT / SPAM PATTERNS
// ============================================================

// Strong motivational spam indicators
const LINKEDIN_SPAM_STRONG = [
  'agree?',
  'thoughts?',
  'agree or disagree',
  'repost if you agree',
  'share if you agree',
  'like if you agree',
  'comment your thoughts',
  'drop a comment',
  'i got fired',
  'i got rejected',
  'i was homeless',
  'i went from',
  'here\'s what i learned',
  'nobody talks about this',
  'unpopular opinion:',
  'hot take:',
  'controversial take:',
  'this might be controversial',
  'i said what i said',
  'let that sink in',
  'read that again',
  'say it louder',
  'the best ceo i ever had',
  'my boss told me',
  'a candidate showed up',
  'i interviewed someone',
  'hustle culture',
  'grind mindset',
  'rise and grind',
  'no days off',
  'while you were sleeping'
];

// Moderate indicators - need multiple
const LINKEDIN_SPAM_MODERATE = [
  'be kind',
  'be grateful',
  'be humble',
  'hard work pays off',
  'success is',
  'failure is',
  'your network is your net worth',
  'hire for attitude',
  'culture eats strategy',
  'work-life balance',
  'quiet quitting',
  'the great resignation',
  'toxic workplace',
  'red flag',
  'green flag',
  'leadership is',
  'a true leader',
  'real leadership',
  'this is leadership',
  'if you don\'t build your dream',
  'wake up at 5am',
  'morning routine',
  'productivity hack',
  'life-changing',
  'game-changing'
];

// AI-generated LinkedIn post indicators
const LINKEDIN_AI_PATTERNS = [
  /^(I|Here'?s|Let me|Today|This)/m,  // AI always starts same way
  /\n\n[A-Z]/g,                        // Short paragraphs starting with caps
  /\b(delve|navigate|landscape|holistic|paradigm|synergy)\b/gi,
  /\b(thought leader|value proposition|actionable insights|key takeaways)\b/gi,
  /\b(in (today'?s|this) (world|age|era|landscape|market))\b/gi,
  /\b(it'?s (important|crucial|essential|vital) to)\b/gi,
  /\n\n(1\.|Step 1|First,|Here are)/,  // Numbered lists (very AI-like on LinkedIn)
  /\b(remember|don'?t forget):?\s*\n/gi // "Remember:" followed by newline
];

// Engagement bait formatting patterns
const ENGAGEMENT_BAIT_PATTERNS = [
  /^.{0,50}\n\n/,                      // Very short first line (hook)
  /^\S+\.\n\n/m,                       // Single word/sentence followed by double newline
  /\n\n\.\n\n/,                        // Single period on its own line (LinkedIn poets)
  /(?:\n[^\n]{1,30}){5,}/,             // Many short lines (LinkedIn poem format)
  /\n\n(Agree\??|Thoughts\??|Share\??|Repost)/i, // Engagement CTA at end
  /\n\n#\w+\s+#\w+\s+#\w+/            // Hashtag spam at end
];

// ============================================================
// MAIN FUNCTIONS
// ============================================================

let linkedinBlockedCount = 0;
let linkedinSettings = null;
let _linkedinInitialized = false;

/**
 * Initialize LinkedIn content script
 */
async function initLinkedInFilter() {
  if (_linkedinInitialized) return;
  _linkedinInitialized = true;

  try {
    const enabled = await isPlatformEnabled('linkedin');
    if (!enabled) {
      log('LinkedIn', 'Platform disabled, skipping');
      return;
    }

    linkedinSettings = await storageManager.getSettings();
    const sensitivity = linkedinSettings.linkedin?.sensitivity || 'medium';

    log('LinkedIn', `Initialized with sensitivity: ${sensitivity}`);

    // Wait for feed to load
    await waitForElement(LINKEDIN_SELECTORS.feedPost, 10000);

    // Initial scan
    await scanLinkedInFeed();

    // Watch for new posts loaded via infinite scroll
    const observer = createDebouncedObserver(async () => {
      await scanLinkedInFeed();
    }, 500);

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    log('LinkedIn', 'MutationObserver active');
  } catch (error) {
    logError('LinkedIn', 'Failed to initialize', error);
  }
}

/**
 * Scan LinkedIn feed for spam/AI content
 */
async function scanLinkedInFeed() {
  try {
    const posts = document.querySelectorAll(LINKEDIN_SELECTORS.feedPost);
    let blocked = 0;

    posts.forEach(post => {
      if (isProcessed(post)) return;
      markProcessed(post);

      // Skip promoted/ad posts (handled by ad blockers)
      if (post.querySelector(LINKEDIN_SELECTORS.promotedLabel)) return;

      const analysis = analyzeLinkedInPost(post);
      if (analysis.shouldFilter) {
        if (analysis.action === 'hide') {
          hideElement(post, analysis.reason);
        } else if (analysis.action === 'fade') {
          fadeElement(post, analysis.reason);
          _addLinkedInBadge(post, analysis);
        }
        blocked++;
      }
    });

    // Also scan comments (fade mode)
    await _scanLinkedInComments();

    if (blocked > 0) {
      linkedinBlockedCount += blocked;
      await incrementBlockCounter('linkedin', blocked);
      log('LinkedIn', `Filtered ${blocked} posts (total: ${linkedinBlockedCount})`);
    }
  } catch (error) {
    logError('LinkedIn', 'Error scanning feed', error);
  }
}

/**
 * Scan LinkedIn comments (fade mode - don't hide)
 */
async function _scanLinkedInComments() {
  const comments = document.querySelectorAll(LINKEDIN_SELECTORS.comment);

  comments.forEach(comment => {
    if (isProcessed(comment)) return;
    markProcessed(comment);

    const textEl = comment.querySelector(LINKEDIN_SELECTORS.commentText);
    const text = textEl?.textContent?.trim() || '';

    if (text.length < 10) return;

    const score = _scoreLinkedInComment(text);
    if (score >= 50) {
      fadeElement(comment, 'ai-comment');
    }
  });
}

/**
 * Analyze a LinkedIn post for spam/AI content
 * @param {HTMLElement} post - Feed post element
 * @returns {Object} { shouldFilter, action, reason, score }
 */
function analyzeLinkedInPost(post) {
  const sensitivity = linkedinSettings?.linkedin?.sensitivity || 'medium';
  const threshold = _getLinkedInThreshold(sensitivity);

  // Extract post text
  const textEl = post.querySelector(LINKEDIN_SELECTORS.postText);
  const text = textEl?.textContent?.trim() || '';

  if (text.length < 20) return { shouldFilter: false, action: 'none', reason: '', score: 0 };

  const textLower = text.toLowerCase();
  let score = 0;
  const reasons = [];

  // 1. Strong spam keywords (max 30 points)
  const strongCount = LINKEDIN_SPAM_STRONG.filter(p => textLower.includes(p)).length;
  if (strongCount >= 3) { score += 30; reasons.push('motivational-spam'); }
  else if (strongCount >= 2) { score += 20; reasons.push('engagement-bait'); }
  else if (strongCount >= 1) { score += 10; reasons.push('spam-pattern'); }

  // 2. Moderate spam keywords (max 15 points)
  const moderateCount = LINKEDIN_SPAM_MODERATE.filter(p => textLower.includes(p)).length;
  if (moderateCount >= 3) { score += 15; reasons.push('corporate-buzzwords'); }
  else if (moderateCount >= 2) { score += 8; }

  // 3. AI-generated post patterns (max 25 points)
  const aiPatternCount = LINKEDIN_AI_PATTERNS.filter(p => p.test(text)).length;
  if (aiPatternCount >= 4) { score += 25; reasons.push('ai-generated'); }
  else if (aiPatternCount >= 3) { score += 15; reasons.push('likely-ai'); }
  else if (aiPatternCount >= 2) { score += 8; }

  // 4. Engagement bait formatting (max 20 points)
  const baitCount = ENGAGEMENT_BAIT_PATTERNS.filter(p => p.test(text)).length;
  if (baitCount >= 3) { score += 20; reasons.push('engagement-bait-format'); }
  else if (baitCount >= 2) { score += 12; reasons.push('linkedin-poet'); }
  else if (baitCount >= 1) { score += 5; }

  // 5. Short-line "LinkedIn poem" format (max 10 points)
  const lines = text.split('\n').filter(l => l.trim().length > 0);
  const shortLines = lines.filter(l => l.trim().length < 40);
  if (lines.length >= 5 && shortLines.length / lines.length > 0.7) {
    score += 10;
    reasons.push('poem-format');
  }

  // 6. Hashtag spam at end (max 5 points)
  const hashtagMatch = text.match(/#\w+/g);
  if (hashtagMatch && hashtagMatch.length >= 5) {
    score += 5;
    reasons.push('hashtag-spam');
  }

  // Determine action
  let shouldFilter = false;
  let action = 'none';

  if (score >= threshold) {
    shouldFilter = true;
    if (score >= threshold + 25) {
      action = 'hide';
    } else {
      action = 'fade';
    }
  }

  return { shouldFilter, action, reason: reasons.join(', '), score };
}

/**
 * Score a LinkedIn comment for AI-generated content
 */
function _scoreLinkedInComment(text) {
  const textLower = text.toLowerCase();
  let score = 0;

  // Generic agreement comments
  const genericPhrases = [
    'well said', 'great post', 'couldn\'t agree more', 'so true',
    'this is so important', 'love this', 'absolutely', 'spot on',
    'this resonates', 'needed to hear this', 'powerful message',
    'thank you for sharing', 'thanks for sharing this',
    'insightful', 'very insightful', 'brilliant insights'
  ];

  const matches = genericPhrases.filter(p => textLower.includes(p)).length;
  if (matches >= 2) score += 40;
  else if (matches >= 1) score += 20;

  // Very short generic comments
  if (text.length < 50 && matches >= 1) score += 20;

  // AI patterns in comments
  if (/\b(delve|navigate|landscape|holistic)\b/i.test(text)) score += 15;
  if (/\b(it'?s (important|crucial) to)\b/i.test(text)) score += 10;

  return Math.min(score, 100);
}

/**
 * Add a warning badge to a LinkedIn post
 */
function _addLinkedInBadge(post, analysis) {
  if (post.querySelector('.anti-slop-linkedin-badge')) return;

  const badge = document.createElement('div');
  badge.className = 'anti-slop-linkedin-badge';
  badge.innerHTML = `
    <span class="anti-slop-linkedin-badge-icon">&#x26A0;</span>
    <span class="anti-slop-linkedin-badge-text">${_escapeLinkedInHtml(analysis.reason)}</span>
    <button class="anti-slop-linkedin-badge-hide" type="button">Hide</button>
  `;

  post.style.position = 'relative';
  post.insertBefore(badge, post.firstChild);

  // Hide button
  const hideBtn = badge.querySelector('.anti-slop-linkedin-badge-hide');
  hideBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    unfadeElement(post);
    hideElement(post, analysis.reason);
  });
}

// ============================================================
// HELPERS
// ============================================================

function _getLinkedInThreshold(sensitivity) {
  switch (sensitivity) {
    case 'low': return 40;
    case 'medium': return 25;
    case 'high': return 15;
    default: return 25;
  }
}

function _escapeLinkedInHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ============================================================
// INITIALIZE
// ============================================================

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLinkedInFilter);
} else {
  initLinkedInFilter();
}
