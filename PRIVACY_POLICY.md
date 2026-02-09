# Privacy Policy for Anti-Slop Chrome Extension

**Last Updated:** February 9, 2026

## Overview

Anti-Slop is a Chrome browser extension that filters low-quality, addictive, and AI-generated content across social media platforms and websites. We are committed to protecting your privacy.

## Data Collection

**Anti-Slop does NOT collect, transmit, or share any personal data.**

Specifically:

- **No browsing history** is collected or sent to external servers
- **No personal information** (name, email, location) is collected
- **No tracking or analytics** services are used
- **No cookies** are set by the extension
- **No network requests** are made to external servers

## Data Storage

Anti-Slop stores the following data **locally on your device only**, using Chrome's built-in storage API:

1. **User Preferences** - Your enabled/disabled settings for each platform, AI detector mode, and sensitivity levels
2. **Whitelist** - Domains you have manually added to the whitelist
3. **Statistics** - Aggregate counts of blocked content (e.g., "12 YouTube Shorts blocked") and estimated time saved
4. **Recent Detections** - The last 20 pages flagged by the AI detector (URL, title, score), stored locally for your reference

This data is synced across your Chrome browsers via Chrome Sync if you have sync enabled in your browser settings. This sync is handled entirely by Google Chrome's built-in sync infrastructure and does not pass through our servers.

## How Content Analysis Works

All content analysis happens **entirely on your device**:

- The extension analyzes page content using pattern matching and heuristic scoring
- No content is sent to external APIs, cloud services, or AI models
- Detection is based on keyword patterns, structural analysis, and content density metrics
- The extension only reads page content on sites that match its configured URL patterns

## Permissions Explained

- **storage**: Save your settings and statistics locally
- **tabs**: Detect the current website to show site-specific status in the popup
- **activeTab**: Access the current tab's URL for whitelist checking
- **Host permissions**: Required to inject content scripts that analyze and filter content on supported platforms

## Third-Party Services

Anti-Slop uses **zero** third-party services, APIs, or external dependencies. The extension is built entirely with vanilla JavaScript and operates completely offline after installation.

## Children's Privacy

Anti-Slop does not knowingly collect any information from anyone, including children under 13 years of age.

## Changes to This Policy

If we update this privacy policy, the changes will be reflected in this document with an updated date. Since the extension collects no data, significant changes are unlikely.

## Open Source

Anti-Slop is open source. You can review the complete source code at:
https://github.com/Ronak-IIITD/anti_ai-slop

## Contact

If you have questions about this privacy policy or the extension, please open an issue on our GitHub repository:
https://github.com/Ronak-IIITD/anti_ai-slop/issues
