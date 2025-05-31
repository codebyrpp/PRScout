// JavaScript for the extension popup UI.
document.addEventListener("DOMContentLoaded", async () => {
  console.log("PullRadar popup loaded.");

  // const userInfoP = document.getElementById("user-info"); // No longer used directly for detailed user name/login
  // const userLoginP = document.getElementById("user-login"); // Removed
  // const userNameP = document.getElementById("user-name");   // Removed
  const userStatusMessageP = document.getElementById("user-status-message");
  const optionsButton = document.getElementById("settings-icon-button"); // Changed ID
  const openOptionsPageButton = document.getElementById("open-options-page");
  const userAvatarImg = document.getElementById("user-avatar"); // Added for avatar
  const userAvatarLink = document.getElementById("user-avatar-link"); // Added for avatar link
  const prListUl = document.getElementById("pr-list");
  const prListContainer = document.getElementById("pr-list-container");
  const noPRsMessage = document.getElementById("no-prs-message");
  const prSummaryDiv = document.getElementById("pr-summary");
  const prCountSpan = document.getElementById("pr-count"); // Added for PR count

  // Options Panel Elements
  const optionsPanel = document.getElementById("options-panel");
  const backOptionsPanelButton = document.getElementById("back-options-panel"); // New back button
  const patInput = document.getElementById("popup-github-pat");
  const intervalInput = document.getElementById("popup-polling-interval");
  const saveButton = document.getElementById("popup-save-options");
  const statusDiv = document.getElementById("popup-status");

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
    chrome.storage.sync.get({ pollingInterval: 60 }, (data) => {
      if (intervalInput) {
        intervalInput.value = data.pollingInterval;
      }
    });
    if (statusDiv) statusDiv.textContent = ""; // Clear status on load
  }

  // Save options from the panel
  async function saveOptionsFromPanel() {
    const pat = patInput.value.trim();
    const interval = parseInt(intervalInput.value, 10);

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
    chrome.storage.sync.set({ pollingInterval: interval }, () => {
      if (statusDiv) {
        statusDiv.textContent = "Options saved successfully!";
        statusDiv.className = "status-message"; // Reset to default color
      }
      console.log("Options saved. PAT and interval updated.");
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

  if (openOptionsPageButton) {
    // This is the button in the initial summary view
    openOptionsPageButton.addEventListener("click", toggleOptionsPanel); // Also make this toggle the panel
  }
  if (optionsButton) {
    // This is the settings icon
    optionsButton.addEventListener("click", openOptions);
  }
  if (backOptionsPanelButton) {
    // New back button listener
    backOptionsPanelButton.addEventListener("click", toggleOptionsPanel);
  }
  if (saveButton) {
    saveButton.addEventListener("click", saveOptionsFromPanel);
  }

  async function displayPRs() {
    // PRs are fetched by background.js. We can try to get the current user's login
    // and then fetch PRs directly, or retrieve a list from storage if background.js saves it.
    // For this version, let's try to fetch them directly using auth.js functions.
    // This makes the popup always show the latest, but incurs an API call if PAT is valid.

    const pat = await getGitHubPAT(); // from auth.js, included in popup.html
    if (!pat) {
      if (userStatusMessageP) {
        userStatusMessageP.textContent = "GitHub PAT not set.";
        userStatusMessageP.style.display = "inline";
      }
      if (userAvatarLink) userAvatarLink.style.display = "none";

      if (prSummaryDiv) prSummaryDiv.style.display = "block";
      if (prListContainer) prListContainer.style.display = "none";
      if (prCountSpan) prCountSpan.textContent = "0";
      return;
    }

    if (prSummaryDiv) prSummaryDiv.style.display = "none";

    if (userStatusMessageP) {
      userStatusMessageP.textContent = "Fetching user info...";
      userStatusMessageP.style.display = "inline";
    }
    const user = await fetchUserDetails();

    if (user && user.login) {
      // We still need user.login for fetching PRs
      if (userStatusMessageP) userStatusMessageP.style.display = "none"; // Hide status message if successful

      if (user.avatar_url && user.html_url && userAvatarImg && userAvatarLink) {
        userAvatarImg.src = user.avatar_url;
        userAvatarLink.href = user.html_url;
        userAvatarLink.style.display = "inline-block";
      } else {
        if (userAvatarLink) userAvatarLink.style.display = "none";
      }
      if (prListContainer) prListContainer.style.display = "block";
      if (prListUl) prListUl.innerHTML = "<li>Loading PRs...</li>";
      if (prCountSpan) prCountSpan.textContent = "...";

      const assignedPRs = await fetchAssignedPRs(user.login); // from auth.js

      if (assignedPRs && assignedPRs.length > 0) {
        prListUl.innerHTML = ""; // Clear "Loading..."
        noPRsMessage.style.display = "none";
        prCountSpan.textContent = assignedPRs.length; // Update count
        assignedPRs.forEach((pr) => {
          const listItem = document.createElement("li");
          const prLink = document.createElement("a");
          prLink.href = pr.html_url;
          prLink.target = "_blank";
          const repoName = pr.repository_url.split("/").pop();
          prLink.textContent = `[${repoName}] ${pr.title}`;
          listItem.appendChild(prLink);
          prListUl.appendChild(listItem);
        });
      } else if (assignedPRs) {
        // Empty array means no PRs, not an error
        prListUl.innerHTML = "";
        noPRsMessage.style.display = "block";
        prCountSpan.textContent = "0"; // Update count to 0
      } else {
        // Null or undefined means an error occurred during fetch
        prListUl.innerHTML = "<li>Could not load PRs. Check console.</li>";
        noPRsMessage.style.display = "none";
        prCountSpan.textContent = "Error"; // Indicate error in count
      }
    } else {
      if (userStatusMessageP) {
        userStatusMessageP.textContent = "Invalid PAT or error fetching user.";
        userStatusMessageP.style.display = "inline";
      }
      if (userAvatarLink) userAvatarLink.style.display = "none";
      if (prListContainer) prListContainer.style.display = "none";
      if (prSummaryDiv) prSummaryDiv.style.display = "block";
      if (prCountSpan) prCountSpan.textContent = "0";
    }
  }

  // Initial load
  await displayPRs();
});
