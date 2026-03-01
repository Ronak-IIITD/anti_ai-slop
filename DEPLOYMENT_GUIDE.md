# Chrome Web Store Deployment Guide

This guide walks through publishing Anti-Slop to the Chrome Web Store.

---

## 📋 Prerequisites

Before starting, ensure you have:
- ✅ A Google Account (for Chrome Web Store)
- ✅ Developer account ($5 one-time fee)
- ✅ Extension source code ready
- ✅ Icons (16x16, 48x48, 128x128 PNG)
- ✅ Screenshots for the store listing

---

## 📦 Preparation

### 1. Review manifest.json
Ensure your `manifest.json` is complete:

```json
{
  "manifest_version": 3,
  "name": "Anti-Slop - AI & Brainrot Content Blocker",
  "version": "1.6.0",
  "description": "Block low-quality, addictive content and AI-generated slop...",
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

### 2. Create Icons
Required sizes:
- 16x16 pixels (toolbar)
- 48x48 pixels (extension management)
- 128x128 pixels (store listing)

Use the existing icons in `/icons/` or create new ones.

### 3. Take Screenshots
Chrome Web Store requires **at least 1** screenshot (recommended: 4-6).

Capture screenshots showing:
- Popup UI with platform toggles
- Stats dashboard
- Blocked content examples
- AI detection warnings

Recommended size: 1280x800 or 640x400 pixels

### 4. Prepare Store Listing Text

**Title** (max 45 characters):
```
Anti-Slop - AI & Brainrot Blocker
```

**Description** (max 140 characters):
```
Block addictive brainrot and AI slop across YouTube, Instagram, Twitter, TikTok, Reddit and more.
```

**Long Description** (detailed explanation):
```
Anti-Slop is a privacy-first Chrome extension that blocks:

• Brainrot content (skibidi, rizz, sigma grindset, etc.)
• AI-generated articles and blog posts
• Engagement bait and clickbait
• Low-effort content

Features:
• 12 platform support (YouTube, Instagram, Twitter, Reddit, etc.)
• AI content detection with confidence scores
• Time tracking for social media usage
• Focus Mode for deep work
• Custom keyword rules
• Keyboard shortcuts

Privacy-first: No servers, no tracking, no telemetry.
```

---

## 🚀 Publishing Steps

### Step 1: Create Developer Account
1. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. Pay the $5 one-time registration fee
3. Complete your developer profile

### Step 2: Upload Extension
1. Click **New Item** in the dashboard
2. Click **Upload** and select your `manifest.json` file
3. Wait for upload to complete
4. Review any warnings (usually about permissions)

### Step 3: Fill Store Listing
Fill in the store listing form:

| Field | Content |
|-------|---------|
| Title | Anti-Slop - AI & Brainrot Blocker |
| Description | Block addictive brainrot and AI slop... |
| Category | Productivity |
| Language | English |

### Step 4: Add Screenshots
Upload your screenshots in the "Images" section.

### Step 5: Submit for Review
1. Click **Submit for Review**
2. Review the compliance checklist
3. Click **Submit**

---

## ⏰ Review Time

- **First submission**: Typically 1-3 days
- **Updates**: Usually within 24 hours

You'll receive an email when approved or if there are issues.

---

## 🔄 Updating the Extension

To push an update:

1. Bump version in `manifest.json`:
   ```json
   "version": "1.6.1"
   ```

2. Go to [Developer Dashboard](https://chrome.google.com/webstore/devconsole)

3. Click your extension → **Upload new package**

4. Upload the updated ZIP file

5. Changes appear automatically after review

---

## 📝 Store Listing Checklist

Before submitting, verify:

- [ ] Icons at 16x16, 48x48, 128x128 pixels
- [ ] At least 1 screenshot (recommended: 4-6)
- [ ] Title under 45 characters
- [ ] Description under 140 characters
- [ ] Privacy policy URL (if collecting data - not needed for Anti-Slop)
- [ ] Version incremented in manifest.json

---

## 📂 Files to Include

Package these files for upload:
```
anti-slop/
├── manifest.json
├── background.js
├── content-scripts/
│   ├── *.js
│   └── *.css
├── popup/
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── utils/
│   ├── storage.js
│   ├── brainrot-patterns.js
│   ├── ai-patterns.js
│   └── utility-scorer.js
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

**Do NOT include**:
- README.md, AGENTS.md, etc.
- .git folder
- build artifacts

---

## ⚠️ Common Rejection Reasons

1. **Vague privacy policy** - Not an issue for Anti-Slop (no data collection)
2. **Misleading description** - Be accurate about what you block
3. **Poor screenshot quality** - Use clear, high-resolution images
4. **Not functionally different** - Explain how your extension is unique

---

## 🔗 Useful Links

- [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
- [Extension Publishing Guide](https://developer.chrome.com/docs/webstore/publish)
- [Store Listing Guidelines](https://developer.chrome.com/docs/webstore/branding)

---

## 💰 Costs

- **Developer account**: $5 (one-time)
- **Publishing**: Free
- **Updates**: Free

---

## 📞 Support

If you encounter issues:
- [Chrome Web Store Help](https://support.google.com/chrome_webstore)
- [Developer Policy Support](https://support.google.com/chrome_webstore/contact/dev_policy)
