// Anti-Slop Bootstrap - Fallback for on-demand injection
// The background script handles most injection, this is a lightweight fallback
// Updated as of 2026-05-13

(function() {
  'use strict';

  // Quick check - if window.antiSlopLoaded exists, background already handled it
  if (window.antiSlopLoaded) {
    return;
  }

  // Mark as processed to prevent duplicate injection attempts
  window.antiSlopLoaded = true;

  // Lightweight platform detection
  const hostname = window.location.hostname.replace('www.', '');
  const platformMap = {
    'youtube.com': 'youtube',
    'instagram.com': 'instagram',
    'twitter.com': 'twitter',
    'x.com': 'twitter',
    'reddit.com': 'reddit',
    'linkedin.com': 'linkedin',
    'facebook.com': 'facebook',
    'messenger.com': 'facebook',
    'bsky.app': 'bluesky',
    'threads.net': 'threads',
    'tiktok.com': 'tiktok'
  };

  const platform = platformMap[hostname];

  // For Google, we need utility-scorer
  if (hostname.includes('google.com')) {
    // Google is handled by background, this is just a marker
    console.log('[Anti-Slop] Page loaded, background will handle injection');
    return;
  }

  if (platform) {
    console.log('[Anti-Slop] Platform detected:', platform, '- background will handle injection');
  } else {
    console.log('[Anti-Slop] Generic page - background will handle AI detector if enabled');
  }

})();