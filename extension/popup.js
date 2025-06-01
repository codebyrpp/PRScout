// JavaScript for the extension popup UI.

// Theme management functions
async function getThemePreference() {
  return new Promise((resolve) => {
    chrome.storage.sync.get({ theme: "system" }, (data) => {
      resolve(data.theme);
    });
  });
}

async function setThemePreference(theme) {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ theme }, () => {
      document.documentElement.setAttribute("data-theme", theme);
      resolve();
    });
  });
}

async function initializeTheme() {
  const theme = await getThemePreference();
  document.documentElement.setAttribute("data-theme", theme);
  const themeSelect = document.getElementById("popup-theme-select");
  if (themeSelect) {
    themeSelect.value = theme;
  }
}

// Footer management functions
async function getFooterPreference() {
  return new Promise((resolve) => {
    chrome.storage.sync.get({ showFooter: true }, (data) => {
      resolve(data.showFooter);
    });
  });
}

async function setFooterPreference(showFooter) {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ showFooter }, () => {
      const footer = document.querySelector("footer");
      if (footer) {
        footer.style.display = showFooter ? "block" : "none";
      }
      resolve();
    });
  });
}

async function initializeFooter() {
  const showFooter = await getFooterPreference();
  const footer = document.querySelector("footer");
  const footerCheckbox = document.getElementById("popup-show-footer");

  if (footer) {
    footer.style.display = showFooter ? "block" : "none";
  }
  if (footerCheckbox) {
    footerCheckbox.checked = showFooter;
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  console.log("PullRadar popup loaded.");

  // Initialize theme and footer first
  await initializeTheme();
  await initializeFooter();

  // const userInfoP = document.getElementById("user-info"); // No longer used directly for detailed user name/login
  // const userLoginP = document.getElementById("user-login"); // Removed
  // const userNameP = document.getElementById("user-name");   // Removed
  const userStatusMessageP = document.getElementById("user-status-message");
  const optionsButton = document.getElementById("settings-icon-button"); // Changed ID
  const openOptionsPageButton = document.getElementById("open-options-page");
  const userAvatarImg = document.getElementById("user-avatar"); // Added for avatar
  const userAvatarLink = document.getElementById("user-avatar-link"); // Added for avatar link
  const prSummaryDiv = document.getElementById("pr-summary");
  const allPRsSectionsContainer = document.getElementById(
    "all-prs-sections-container"
  );

  // DOM elements for each PR category
  const categories = {
    assigned: {
      detailsElement: document.getElementById("assigned-prs-section"),
      loader: document.getElementById("assigned-pr-list-loader"),
      listUl: document.getElementById("assigned-pr-list"),
      countSpan: document.getElementById("assigned-pr-count"),
      noPrsMessage: document.getElementById("no-assigned-prs-message"),
      fetchFunction: async (username) => fetchAssignedPRs(username), // From auth.js
    },
    created: {
      detailsElement: document.getElementById("created-prs-section"),
      loader: document.getElementById("created-pr-list-loader"),
      listUl: document.getElementById("created-pr-list"),
      countSpan: document.getElementById("created-pr-count"),
      noPrsMessage: document.getElementById("no-created-prs-message"),
      // Placeholder: fetchFunction should use a query like `author:${username}`
      fetchFunction: async (username) =>
        searchGitHubPRs(`author:${username} is:pr is:open`),
    },
    review: {
      detailsElement: document.getElementById("review-prs-section"),
      loader: document.getElementById("review-pr-list-loader"),
      listUl: document.getElementById("review-pr-list"),
      countSpan: document.getElementById("review-pr-count"),
      noPrsMessage: document.getElementById("no-review-prs-message"),
      // Placeholder: fetchFunction should use a query like `review-requested:${username}` or `team-review-requested:@org/team-name`
      fetchFunction: async (username) =>
        searchGitHubPRs(`review-requested:${username} is:pr is:open`),
    },
    mentioned: {
      detailsElement: document.getElementById("mentioned-prs-section"),
      loader: document.getElementById("mentioned-pr-list-loader"),
      listUl: document.getElementById("mentioned-pr-list"),
      countSpan: document.getElementById("mentioned-pr-count"),
      noPrsMessage: document.getElementById("no-mentioned-prs-message"),
      // Placeholder: fetchFunction should use a query like `mentions:${username}`
      fetchFunction: async (username) =>
        searchGitHubPRs(`mentions:${username} is:pr is:open`),
    },
  };

  // Options Panel Elements
  const optionsPanel = document.getElementById("options-panel");
  const backOptionsPanelButton = document.getElementById("back-options-panel"); // New back button
  const patInput = document.getElementById("popup-github-pat");
  const intervalInput = document.getElementById("popup-polling-interval");
  const saveButton = document.getElementById("popup-save-options");
  const statusDiv = document.getElementById("popup-status");

  // Generic function to render PR items into a UL using templates
  function renderPRItems(prListUl, prs) {
    prListUl.innerHTML = ""; // Clear previous items
    if (!prs || prs.length === 0) return;

    // Get templates
    const prItemTemplate = document.getElementById("pr-item-template");
    const prItemNoAvatarTemplate = document.getElementById(
      "pr-item-no-avatar-template"
    );

    if (!prItemTemplate || !prItemNoAvatarTemplate) {
      console.error("PR item templates not found");
      return;
    }

    prs.forEach((pr) => {
      let listItem;

      // Choose template based on whether user info is available
      if (pr.user && pr.user.avatar_url && pr.user.html_url) {
        // Use template with avatar
        listItem = prItemTemplate.content.cloneNode(true);

        // Populate avatar link and image
        const avatarLink = listItem.querySelector(".pr-author-avatar-link");
        const avatarImg = listItem.querySelector(".pr-author-avatar");

        avatarLink.href = pr.user.html_url;
        avatarLink.title = "View profile of " + (pr.user.login || "author");
        avatarImg.src = pr.user.avatar_url;
        avatarImg.alt = (pr.user.login || "Author") + " avatar";
      } else {
        // Use template without avatar
        listItem = prItemNoAvatarTemplate.content.cloneNode(true);
      }

      // Populate PR link (common to both templates)
      const prLink = listItem.querySelector(".pr-link");
      prLink.href = pr.html_url;

      const repoName = pr.repository_url
        ? pr.repository_url.split("/").pop()
        : pr.repository
        ? pr.repository.name
        : "N/A";
      prLink.textContent = `[${repoName}] ${pr.title}`;

      // Append to list
      prListUl.appendChild(listItem);
    });
  }

  // Generic function to fetch and display PRs for a category
  async function fetchAndDisplayCategoryPRs(categoryKey, username) {
    const config = categories[categoryKey];
    if (
      !config ||
      !config.loader ||
      !config.listUl ||
      !config.countSpan ||
      !config.noPrsMessage ||
      !config.fetchFunction
    ) {
      console.error("Configuration missing for category:", categoryKey);
      return;
    }

    config.loader.style.display = "flex";
    config.listUl.style.display = "none";
    config.noPrsMessage.style.display = "none";
    config.countSpan.textContent = "...";

    try {
      const prs = await config.fetchFunction(username);
      config.loader.style.display = "none";
      config.listUl.style.display = "block";

      if (prs && prs.length > 0) {
        renderPRItems(config.listUl, prs);
        config.countSpan.textContent = prs.length;
        if (config.detailsElement) config.detailsElement.open = true; // Open if PRs exist
      } else if (prs) {
        // prs is an empty array
        config.listUl.innerHTML = "";
        config.noPrsMessage.style.display = "block";
        config.countSpan.textContent = "0";
      } else {
        // prs is null or undefined (error case)
        config.listUl.innerHTML = "";
        config.noPrsMessage.textContent =
          "Could not load PRs for this section.";
        config.noPrsMessage.style.display = "block";
        config.countSpan.textContent = "⚠️";
      }
    } catch (error) {
      console.error(`Error fetching PRs for ${categoryKey}:`, error);
      config.loader.style.display = "none";
      config.listUl.innerHTML = "";
      config.noPrsMessage.textContent = "Error loading PRs.";
      config.noPrsMessage.style.display = "block";
      config.countSpan.textContent = "⚠️";
    }
  }

  // Main function to display all PRs
  async function displayAllPRs() {
    const pat = await getGitHubPAT();
    if (!pat) {
      if (userStatusMessageP) {
        userStatusMessageP.textContent = "GitHub PAT not set.";
        userStatusMessageP.style.display = "inline";
      }
      if (userAvatarLink) userAvatarLink.style.display = "none";
      if (prSummaryDiv) prSummaryDiv.style.display = "block";
      if (allPRsSectionsContainer)
        allPRsSectionsContainer.style.display = "none";
      return;
    }

    if (prSummaryDiv) prSummaryDiv.style.display = "none";
    if (allPRsSectionsContainer)
      allPRsSectionsContainer.style.display = "block";

    if (userStatusMessageP) {
      userStatusMessageP.textContent = "...";
      userStatusMessageP.style.display = "inline";
    }
    const user = await fetchUserDetails(); // From auth.js

    if (user && user.login) {
      if (userStatusMessageP) userStatusMessageP.style.display = "none";
      if (user.avatar_url && user.html_url && userAvatarImg && userAvatarLink) {
        userAvatarImg.src = user.avatar_url;
        userAvatarLink.href = user.html_url;
        userAvatarLink.style.display = "inline-block";
      } else {
        if (userAvatarLink) userAvatarLink.style.display = "none";
      }

      // Fetch all categories in parallel
      await Promise.all([
        fetchAndDisplayCategoryPRs("assigned", user.login),
        fetchAndDisplayCategoryPRs("created", user.login),
        fetchAndDisplayCategoryPRs("review", user.login),
        fetchAndDisplayCategoryPRs("mentioned", user.login),
      ]);
    } else {
      if (userStatusMessageP) {
        userStatusMessageP.textContent = "Uh-oh! 🤨";
        userStatusMessageP.title =
          "Invalid PAT or error fetching user. Please check your PAT and try again.";
        userStatusMessageP.style.display = "inline";
      }
      if (userAvatarLink) userAvatarLink.style.display = "none";
      if (allPRsSectionsContainer)
        allPRsSectionsContainer.style.display = "none";
      if (prSummaryDiv) prSummaryDiv.style.display = "block";
      // Reset counts for all sections on user error
      Object.values(categories).forEach((config) => {
        if (config.countSpan) config.countSpan.textContent = "0";
        if (config.loader) config.loader.style.display = "none";
        if (config.listUl) config.listUl.innerHTML = "";
        if (config.noPrsMessage) config.noPrsMessage.style.display = "block";
      });
    }
  }

  // Function to open/close options panel
  function toggleOptionsPanel() {
    if (optionsPanel) {
      optionsPanel.classList.toggle("options-panel-visible");
      if (optionsPanel.classList.contains("options-panel-visible")) {
        loadOptionsIntoPanel(); // Load current settings when panel opens
      }
    }
  }

  // Load options into the panel
  async function loadOptionsIntoPanel() {
    const currentPat = await getGitHubPAT(); // from auth.js
    if (patInput && currentPat) {
      patInput.value = currentPat;
    }
    chrome.storage.sync.get(
      { pollingInterval: 60, theme: "system", showFooter: true },
      (data) => {
        if (intervalInput) {
          intervalInput.value = data.pollingInterval;
        }
        const themeSelect = document.getElementById("popup-theme-select");
        if (themeSelect) {
          themeSelect.value = data.theme;
        }
        const footerCheckbox = document.getElementById("popup-show-footer");
        if (footerCheckbox) {
          footerCheckbox.checked = data.showFooter;
        }
      }
    );
    if (statusDiv) statusDiv.textContent = ""; // Clear status on load
  }

  // Save options from the panel
  async function saveOptionsFromPanel() {
    const pat = patInput.value.trim();
    const interval = parseInt(intervalInput.value, 10);
    const themeSelect = document.getElementById("popup-theme-select");
    const theme = themeSelect ? themeSelect.value : "system";
    const footerCheckbox = document.getElementById("popup-show-footer");
    const showFooter = footerCheckbox ? footerCheckbox.checked : true;

    if (!pat) {
      if (statusDiv) {
        statusDiv.textContent = "Error: GitHub PAT cannot be empty.";
        statusDiv.className = "status-message error";
      }
      return;
    }

    if (isNaN(interval) || interval < 10) {
      if (statusDiv) {
        statusDiv.textContent =
          "Error: Polling interval must be at least 10 seconds.";
        statusDiv.className = "status-message error";
      }
      return;
    }

    await setGitHubPAT(pat); // from auth.js
    await setThemePreference(theme); // Apply theme immediately
    await setFooterPreference(showFooter); // Apply footer visibility immediately
    chrome.storage.sync.set({ pollingInterval: interval }, () => {
      if (statusDiv) {
        statusDiv.textContent = "Options saved successfully!";
        statusDiv.className = "status-message"; // Reset to default color
      }
      console.log(
        "Options saved. PAT, interval, theme, and footer visibility updated."
      );
      // Notify background script of changes so it can reschedule alarms etc.
      chrome.runtime.sendMessage({ type: "optionsChanged" }, (response) => {
        if (chrome.runtime.lastError) {
          console.warn(
            "Error sending optionsChanged message:",
            chrome.runtime.lastError.message
          );
        } else {
          console.log(
            "Background script notified of options change:",
            response
          );
        }
      });
      // Optionally, you might want to re-fetch PRs or user info in the popup itself
      // or simply close the panel and let the main view refresh on next auto-check.
      // For simplicity, just show success message for now.
      setTimeout(() => {
        if (statusDiv) statusDiv.textContent = "";
        // toggleOptionsPanel(); // Optionally close panel on save
      }, 2000);
    });
  }

  // Original openOptions function - now repurposed for the settings icon
  function openOptions() {
    // chrome.runtime.openOptionsPage(); // Old behavior
    toggleOptionsPanel(); // New behavior
  }

  // Function to open popup in new window
  function openInNewWindow() {
    const popupUrl = chrome.runtime.getURL("popup.html");
    chrome.windows.create(
      {
        url: popupUrl,
        type: "popup",
        width: 400,
        height: 600,
        focused: true,
      },
      (window) => {
        if (chrome.runtime.lastError) {
          console.error("Failed to open new window:", chrome.runtime.lastError);
        } else {
          console.log("Opened popup in new window:", window);
          // Close the current popup
          window.close();
        }
      }
    );
  }

  if (openOptionsPageButton) {
    // This is the button in the initial summary view
    openOptionsPageButton.addEventListener("click", toggleOptionsPanel); // Also make this toggle the panel
  }
  if (optionsButton) {
    // This is the settings icon
    optionsButton.addEventListener("click", openOptions);
  }
  // Add event listener for new window button
  const openNewWindowButton = document.getElementById("open-new-window-button");
  if (openNewWindowButton) {
    openNewWindowButton.addEventListener("click", openInNewWindow);
  }
  if (backOptionsPanelButton) {
    // New back button listener
    backOptionsPanelButton.addEventListener("click", toggleOptionsPanel);
  }
  if (saveButton) {
    saveButton.addEventListener("click", saveOptionsFromPanel);
  }

  // Initial load
  await displayAllPRs();
});
