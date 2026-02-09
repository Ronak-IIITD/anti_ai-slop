# Contributing to Anti-Slop

Thank you for your interest in contributing to Anti-Slop! This document provides guidelines for contributing to the project.

## How Can I Contribute?

### 1. Report Bugs

Found a bug? Please open an issue with:

- Clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Chrome version and OS
- Screenshots if applicable

**Template:**

```
**Bug Description:**
Shorts are still showing on YouTube homepage

**Steps to Reproduce:**
1. Open youtube.com
2. Scroll to homepage feed
3. Shorts shelf visible

**Expected:** Shorts should be hidden
**Actual:** Shorts still showing

**Environment:**
- Chrome Version: 120.0.0
- OS: Windows 11
- Extension Version: 1.0.0
```

### 2. Suggest Features

Have an idea? Open a feature request:

- Describe the feature clearly
- Explain the use case
- Consider implementation complexity

### 3. Platform Updates

Social media platforms change frequently. Help keep selectors updated:

**When to update:**

- Blocking stops working on a platform
- New UI elements appear
- Platform redesign

**How to update:**

1. Inspect the page with Chrome DevTools
2. Find new selectors for target elements
3. Update the appropriate content script
4. Test thoroughly
5. Submit a PR with version comment

Example:

```javascript
// Updated selectors as of 2026-01-21
const SELECTORS = {
  shortsShelf: "ytd-reel-shelf-renderer", // Still working
  shortsVideo: [
    "ytd-reel-item-renderer",
    "ytd-shorts-container", // NEW: Added for redesign
  ],
};
```

### 4. TikTok Testing

We need international contributors to test TikTok blocking:

- Validate selectors work
- Report what's blocked/not blocked
- Suggest improvements

### 5. AI Pattern Detection

Improve AI detection accuracy:

- Add new AI-generated phrases
- Identify clickbait patterns
- Refine scoring algorithm
- Test on real articles

**How to add patterns:**
Edit `utils/ai-patterns.js`:

```javascript
const AI_PHRASES = [
  "delve into",
  "your new phrase here",
  // ...
];
```

### 6. Code Contributions

#### Setup Development Environment

1. Fork the repository
2. Clone your fork:

   ```bash
   git clone https://github.com/YOUR_USERNAME/anti-slop.git
   cd anti-slop
   ```

3. Load in Chrome (see QUICKSTART.md)
4. Make changes and test

#### Coding Standards

**JavaScript:**

- Use modern ES6+ syntax
- Use `const` and `let` (never `var`)
- Async/await over callbacks
- Clear, descriptive variable names
- Comments for complex logic

**Good:**

```javascript
async function blockShorts() {
  const shelves = document.querySelectorAll(SELECTORS.shortsShelf);
  shelves.forEach((shelf) => hideElement(shelf));
}
```

**Avoid:**

```javascript
function bs() {
  var x = document.querySelectorAll("ytd-reel-shelf-renderer");
  for (var i = 0; i < x.length; i++) {
    x[i].style.display = "none";
  }
}
```

**CSS:**

- Use BEM-style naming when adding classes
- Leverage CSS variables for theming
- Ensure responsive design

**Performance:**

- Debounce mutation observers (300ms)
- Avoid expensive operations in loops
- Use efficient selectors

**Testing:**

- Test on actual platforms
- Verify all settings work
- Check statistics tracking
- Test in different Chrome versions if possible

#### Pull Request Process

1. **Create a branch:**

   ```bash
   git checkout -b feature/my-feature
   ```

2. **Make your changes**
   - Follow coding standards
   - Add comments where needed
   - Update README if adding features

3. **Test thoroughly**
   - Test on live sites
   - Verify settings persist
   - Check for console errors

4. **Commit with clear messages:**

   ```bash
   git commit -m "feat: add Reddit blocking support"
   ```

   Commit message format:
   - `feat:` new feature
   - `fix:` bug fix
   - `docs:` documentation
   - `style:` formatting
   - `refactor:` code restructuring
   - `test:` testing
   - `chore:` maintenance

5. **Push to your fork:**

   ```bash
   git push origin feature/my-feature
   ```

6. **Open Pull Request**
   - Clear title and description
   - Reference related issues
   - Add screenshots/videos if UI changes

**PR Template:**

```markdown
## Description

Brief description of changes

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Platform selector update

## Testing

- [ ] Tested on Chrome latest
- [ ] Tested on target platform
- [ ] Settings persist correctly
- [ ] Statistics update correctly

## Screenshots

(if applicable)

## Related Issues

Closes #123
```

### 7. Documentation

Help improve documentation:

- Fix typos
- Clarify instructions
- Add examples
- Translate to other languages (future)

## Community Guidelines

### Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Help others learn
- Stay on topic

### Communication

- **GitHub Issues**: Bug reports, feature requests
- **Pull Requests**: Code contributions
- **Discussions**: General questions, ideas

### Review Process

Pull requests will be reviewed for:

1. Code quality and standards
2. Functionality and testing
3. Documentation completeness
4. Performance impact

Expect feedback within 1-3 days. Maintainers may request changes.

## Recognition

Contributors will be:

- Listed in README acknowledgments
- Credited in release notes
- Given GitHub contributor badge

## Questions?

Not sure about something? Open a discussion or issue asking for clarification. No question is too small!

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for helping make the web a better place!** 🛡️
