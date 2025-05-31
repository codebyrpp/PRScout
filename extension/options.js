// JavaScript for the extension options page.

document.addEventListener("DOMContentLoaded", () => {
  const backendUrlInput = document.getElementById("backend-url");
  const saveButton = document.getElementById("save-options");
  const statusDiv = document.getElementById("status");

  // Load saved backend URL
  chrome.storage.sync.get("backendUrl", (data) => {
    if (data.backendUrl) {
      backendUrlInput.value = data.backendUrl;
    }
  });

  // Save backend URL
  saveButton.addEventListener("click", () => {
    const backendUrl = backendUrlInput.value.trim();
    if (backendUrl) {
      try {
        new URL(backendUrl); // Validate URL
        chrome.storage.sync.set({ backendUrl }, () => {
          statusDiv.textContent = "Options saved.";
          setTimeout(() => {
            statusDiv.textContent = "";
          }, 2000);
        });
      } catch (e) {
        statusDiv.textContent = "Invalid URL format.";
      }
    } else {
      statusDiv.textContent = "Backend URL cannot be empty.";
    }
  });
});
