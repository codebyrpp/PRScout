# Contributing to PRScout 🤝

Hey there! 👋 Thanks for your interest in contributing to PRScout! I welcome contributions from everyone - whether you're fixing bugs, adding cool features, improving docs, or just suggesting awesome ideas.

_Quick note: This is a personal project that I work on in my spare time, so please be patient with response times. I'll do my best to review contributions and provide feedback when I can!_

## Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Code Style Guidelines](#code-style-guidelines)
- [Making Changes](#making-changes)
- [Submitting Issues](#submitting-issues)
- [Submitting Pull Requests](#submitting-pull-requests)

## Getting Started

### Prerequisites

- **Node.js** (for development tools, if needed)
- **Git** for version control
- **Chrome** or **Firefox** browser for testing
- **GitHub Personal Access Token** for testing the extension functionality

### Development Environment

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/pullradar.git
   cd pullradar
   ```
3. **Create a branch** for your changes:
   ```bash
   git checkout -b feature/your-awesome-feature-name
   ```

## Development Setup

### Loading the Extension for Development

#### Chrome/Edge/Chromium-based browsers:

1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `extension/` folder from this project

#### Firefox:

1. Open `about:debugging`
2. Click "This Firefox"
3. Click "Load Temporary Add-on"
4. Select the `extension/manifest.json` file

### Project Structure

```
pullradar/
├── extension/           # Main extension files
│   ├── manifest.json   # Extension manifest
│   ├── popup.html     # Popup interface
│   ├── popup.js       # Popup logic
│   ├── background.js  # Background service worker
│   ├── auth.js        # GitHub API authentication
│   ├── icons/         # Extension icons
│   ├── assets/        # SVG icons and assets
│   └── styles/        # CSS files
├── docs/              # Documentation
├── README.md
└── CONTRIBUTING.md
```

## Code Style Guidelines

### General Principles

- **Consistency**: Follow existing patterns (copy what's already there!)
- **Readability**: Write code like you're explaining it to a friend
- **Simplicity**: Keep it simple, keep it sweet

### JavaScript Guidelines

- Use **modern ES6+** syntax (let's be fancy! ✨)
- Use **async/await** for promises (no callback hell please!)
- Follow **camelCase** for variables and functions
- Use **descriptive names** (no `var x = 1` please 😅)
- Add **JSDoc comments** for complex functions (help your future self!)
- Use **template literals** for strings with variables

#### Example:

```javascript
// Good ✅
async function fetchUserPullRequests(username) {
  try {
    const response = await fetch(
      `${API_BASE}/search/issues?q=author:${username}`
    );
    return await response.json();
  } catch (error) {
    console.error("Failed to fetch pull requests:", error);
    return []; // Empty array is better than undefined!
  }
}

// Avoid ❌
function getUserPRs(u) {
  // What does this even do? 🤷‍♀️
}
```

### CSS Guidelines

- Use **CSS variables** from `styles/theme.css` for all colors
- Follow **BEM naming** when it makes sense (don't stress about it!)
- Use **meaningful class names** (.red-button is not meaningful!)
- **No hardcoded colors** - use theme variables instead!
- Group related styles together (keep friends close!)

#### Example:

```css
/* Good ✅ */
.pr-list-item {
  background-color: var(--bg-primary);
  color: var(--text-primary);
  border: 1px solid var(--border-primary);
}

/* Avoid ❌ */
.pr-list-item {
  background-color: #ffffff; /* Hardcoded colors = sad panda */
  color: #24292e;
  border: 1px solid #e1e4e8;
}
```

### HTML Guidelines

- Use **semantic HTML** elements (div soup is not delicious!)
- Use **template+cloneNode pattern** for dynamic content
- Include **ARIA attributes** when needed for accessibility
- Use **meaningful IDs and class names**

#### Example:

```html
<!-- Good ✅ -->
<template id="pr-item-template">
  <li class="pr-list-item">
    <a class="pr-author-avatar-link" target="_blank" rel="noopener">
      <img class="pr-author-avatar" alt="" />
    </a>
    <a class="pr-link" target="_blank" rel="noopener"></a>
  </li>
</template>
```

## Making Changes

### Before You Start

1. **Check existing issues** - maybe someone's already working on it!
2. **Create an issue** for big changes (let's chat first!)
3. **Keep changes focused** - one cool thing at a time!

### Development Process

1. **Write tests** if you can (I'm working on this!)
2. **Test in Chrome AND Firefox** (both browsers deserve love!)
3. **Test with and without GitHub PAT** configured
4. **Check both light and dark themes**
5. **Look at browser console** - no errors allowed!

### Testing Checklist

_Don't worry, you don't need to check ALL of these every time! Just the relevant ones 😉_

- [ ] Extension loads without errors in Chrome
- [ ] Extension loads without errors in Firefox
- [ ] Popup works like a charm
- [ ] GitHub API stuff works with valid PAT
- [ ] Options panel saves settings (and remembers them!)
- [ ] Theme switching is smooth
- [ ] Background notifications pop up nicely
- [ ] Bookmarks get created/removed properly

## Submitting Issues

### Bug Reports 🐛

When you find a bug (congrats, you're a QA tester now!), please include:

- **What happened** vs **what you expected**
- **Steps to reproduce** (help me see the bug too!)
- **Browser and OS** info
- **Console errors** (if any show up)
- **Screenshots** (a picture is worth 1000 words!)

_Don't stress about the format - just give me the info so I can help! 😊_

### Feature Requests 💡

Got a cool idea? Awesome! Tell me:

- **What you want** (be specific!)
- **Why it would be useful** (convince me it's awesome!)
- **How you imagine it working** (if you have ideas)
- **Mockups or sketches** (if you're artsy!)

## Submitting Pull Requests

### Pull Request Process

1. **Make sure your branch is fresh** (rebase if needed)
2. **Write decent commit messages** (future you will thank you!)
3. **Add tests** if you're feeling ambitious
4. **Update docs** if something changed
5. **Fill out the PR template** (if you want to 🫡)

_Note: As this is a personal project, I might not be able to review PRs immediately. I'll get to them when I can - thank you for your patience!_

### Commit Message Format

I like [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): what you did

feat(popup): add awesome theme toggle
fix(auth): handle expired tokens gracefully
docs(readme): make installation clearer
style(css): use theme variables everywhere
```

### Types:

- `feat`: New feature (exciting!)
- `fix`: Bug fix (hero work!)
- `docs`: Documentation (knowledge sharing!)
- `style`: Code formatting (making it pretty!)
- `refactor`: Code cleanup (spring cleaning!)
- `test`: Adding tests (safety first!)
- `chore`: Boring but necessary stuff

### Pull Request Template

```markdown
## What did you do?

Brief description of your awesome changes

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Code cleanup

## Did you test it?

- [ ] Tested in Chrome
- [ ] Tested in Firefox
- [ ] Tested with GitHub PAT
- [ ] Tested without GitHub PAT
- [ ] Tested theme switching

## Screenshots?

_If you made visual changes, show them off!_

## Checklist

- [ ] Code follows the style (mostly 😅)
- [ ] I reviewed my own code
- [ ] Updated docs if needed
- [ ] No console errors (hopefully!)
```

---

## Thanks! 🙏

Thank you for contributing to PRScout! 🚀

You're helping make GitHub workflow management better for everyone!
