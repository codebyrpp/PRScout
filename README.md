<h1 style="display: flex; align-items: center; gap: 4px; margin-bottom: 8px; border-bottom: none;">
  <img
    src="./extension/icons/icon48.png"
    alt="PullRadar icon"
    id="header-icon"
  />
  <span style="margin-left: 8px">
    <strong>P</strong>ull<strong>R</strong>adar
  </span>
</h1>

## Motivation 💡

I've found that managing pull requests efficiently is crucial for my own productivity and collaboration with others on GitHub. That's why I'm working on this personal project - to create a tool that provides real-time, actionable notifications for pull requests assigned to me, with organization features inspired by Arc Live Folders, and seamless integration with my browser's bookmarks.

## Overview 📖

PullRadar is a browser extension for Chrome and Firefox browsers that I built to solve my own workflow challenges. It notifies you in real-time when a pull request is assigned to you, and helps you organize, track, and manage your PRs directly from your browser.

## Features 🚀

- **Real-time Notifications**: Get notified when PRs are assigned to you
- **Multi-category PR Management**: View PRs assigned to you, created by you, requesting your review, and mentioning you
- **Smart Bookmarks Integration**: Automatic bookmark creation/removal in a dedicated folder
- **Theme Support**: Light, dark, and system preference themes
- **Cross-browser Compatibility**: Works on Chrome, Firefox, and other Chromium-based browsers
- **Configurable Polling**: Adjust notification frequency to your needs

## Installation 📦

### From Browser Extension Stores

_Coming soon - extension will be available on Chrome Web Store and Firefox Add-ons_

### Manual Installation (Development)

#### Chrome/Edge/Chromium-based browsers:

1. Clone this repository: `git clone https://github.com/codebyrpp/pullradar.git`
2. Open `chrome://extensions/` in your browser
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select the `extension/` folder from the cloned repository

#### Firefox:

1. Clone this repository: `git clone https://github.com/codebyrpp/pullradar.git`
2. Open `about:debugging` in Firefox
3. Click "This Firefox"
4. Click "Load Temporary Add-on"
5. Select the `extension/manifest.json` file

## Configuration ⚙️

1. **Get a GitHub Personal Access Token**:

   - Go to GitHub → Settings → Developer settings → Personal access tokens
   - Generate a fine grained token with Repository Permissions to Pull Requests with read access.

2. **Configure the Extension**:
   - Click the PullRadar icon in your browser toolbar
   - Click the settings icon or "Open Options"
   - Enter your GitHub Personal Access Token
   - Adjust polling interval as needed (default: 60 seconds)
   - Choose your preferred theme

## Development 🛠️

### Prerequisites

- Git
- Chrome or Firefox browser
- GitHub Personal Access Token (PAT)

### Quick Start

```bash
# Clone the repository
git clone https://github.com/codebyrpp/pullradar.git
cd pullradar

# Load the extension in your browser (see Installation section above)
```

### Project Structure

```
pullradar/
├── extension/           # Main extension files
│   ├── manifest.json   # Extension manifest
│   ├── popup.html     # Popup interface
│   ├── popup.js       # Popup logic
│   ├── background.js  # Background service worker
│   ├── auth.js        # GitHub API integration
│   └── styles/        # CSS with theme support
├── docs/              # Documentation
├── README.md
└── CONTRIBUTING.md    # Contributing guidelines
```

### Architecture

- **Manifest V3** compliant browser extension
- **Template+cloneNode pattern** for dynamic content
- **CSS variables** for comprehensive theming
- **Modular JavaScript** with clear separation of concerns
- **GitHub API integration** with rate limiting and error handling

## Built with 💛

![](https://skillicons.dev/icons?i=js,html,css)

## Contributing 🤝

I welcome contributions from anyone interested in improving PullRadar! Whether you're fixing bugs, adding features, improving documentation, or suggesting enhancements - all help is appreciated.

### Quick Contributing Guide

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/your-feature-name`
3. **Make** your changes following the code style guidelines
4. **Test** thoroughly in both Chrome and Firefox
5. **Submit** a pull request

For detailed contributing guidelines, please see [CONTRIBUTING.md](./CONTRIBUTING.md).

_Note: This is a personal project, so please be patient with response times. I'll do my best to review contributions and provide feedback as time allows!_

### Code Style

- Use **CSS variables** from `styles/theme.css` for all colors
- Follow **template+cloneNode pattern** for dynamic HTML
- Use **modern ES6+** JavaScript with async/await
- Write **descriptive variable and function names**
- Follow **conventional commit** format

## License 📄

This project is open source and available under the [MIT License](./LICENSE).

## Contributors ✨

Thanks to all the contributors who have helped make PullRadar better!

<!-- Contributors list will be automatically updated -->

_Contributor list coming soon!_

## Support 💬

- **Bug Reports**: [GitHub Issues](https://github.com/codebyrpp/pullradar/issues)
- **Feature Requests**: [GitHub Issues](https://github.com/codebyrpp/pullradar/issues)
- **Questions**: [GitHub Discussions](https://github.com/codebyrpp/pullradar/discussions)

---

⭐ **Star this repository** if you find PullRadar useful!
