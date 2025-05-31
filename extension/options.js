// JavaScript for the extension options page.

document.addEventListener("DOMContentLoaded", () => {
  const githubPatInput = document.getElementById("github-pat");
  const pollingIntervalInput = document.getElementById("polling-interval");
  const saveButton = document.getElementById("save-options");
  const statusDiv = document.getElementById("status");

  function showStatus(message, isError = false) {
    statusDiv.textContent = message;
    statusDiv.className = isError ? "error" : "success";
    setTimeout(() => {
      statusDiv.textContent = "";
      statusDiv.className = "";
    }, 3000);
  }

  // Load saved options
  chrome.storage.sync.get(["githubPat", "pollingInterval"], (data) => {
    if (data.githubPat) {
      githubPatInput.value = data.githubPat;
    }
    if (data.pollingInterval) {
      pollingIntervalInput.value = data.pollingInterval;
    } else {
      // Default polling interval if not set
      pollingIntervalInput.value = 60;
    }
  });

  // Save options
  saveButton.addEventListener("click", () => {
    const githubPat = githubPatInput.value.trim();
    const pollingInterval = parseInt(pollingIntervalInput.value, 10);

    if (!githubPat) {
      showStatus("GitHub Personal Access Token cannot be empty.", true);
      return;
    }

    if (isNaN(pollingInterval) || pollingInterval < 10) {
      showStatus(
        "Polling interval must be a number and at least 10 seconds.",
        true
      );
      return;
    }

    chrome.storage.sync.set({ githubPat, pollingInterval }, () => {
      showStatus("Options saved successfully.");
      // Inform background script about the changes
      chrome.runtime.sendMessage({ type: "optionsChanged" }, (response) => {
        if (chrome.runtime.lastError) {
          console.warn(
            "Could not send optionsChanged message to background script:",
            chrome.runtime.lastError.message
          );
        } else {
          console.log(
            "Options saved and background script notified.",
            response
          );
        }
      });
    });
  });
});
