// JavaScript for the extension popup UI.
document.addEventListener("DOMContentLoaded", async () => {
  console.log("PullRadar popup loaded.");

  // const userInfoP = document.getElementById("user-info"); // No longer used directly for detailed user name/login
  // const userLoginP = document.getElementById("user-login"); // Removed
  // const userNameP = document.getElementById("user-name");   // Removed
  const userStatusMessageP = document.getElementById("user-status-message");
  const optionsButton = document.getElementById("options-button"); // For re-configuring token
  const openOptionsPageButton = document.getElementById("open-options-page");
  const userAvatarImg = document.getElementById("user-avatar"); // Added for avatar
  const userAvatarLink = document.getElementById("user-avatar-link"); // Added for avatar link
  const prListUl = document.getElementById("pr-list");
  const prListContainer = document.getElementById("pr-list-container");
  const noPRsMessage = document.getElementById("no-prs-message");
  const prSummaryDiv = document.getElementById("pr-summary");
  const prCountSpan = document.getElementById("pr-count"); // Added for PR count

  function openOptions() {
    chrome.runtime.openOptionsPage();
  }

  if (openOptionsPageButton) {
    openOptionsPageButton.addEventListener("click", openOptions);
  }
  if (optionsButton) {
    optionsButton.addEventListener("click", openOptions);
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

      if (optionsButton) {
        optionsButton.style.display = "inline-block";
        optionsButton.textContent = "Set PAT in Options";
      }
      // if (userInfoP) userInfoP.style.display = "none"; // Old element, ensure it's hidden if it still exists by mistake
      if (prSummaryDiv) prSummaryDiv.style.display = "block";
      if (prListContainer) prListContainer.style.display = "none";
      if (prCountSpan) prCountSpan.textContent = "(0)";
      return;
    }

    if (optionsButton) optionsButton.style.display = "none";
    if (prSummaryDiv) prSummaryDiv.style.display = "none";
    // if (userInfoP) userInfoP.style.display = "none"; // Old element

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
      if (prCountSpan) prCountSpan.textContent = "(...)";

      const assignedPRs = await fetchAssignedPRs(user.login); // from auth.js

      if (assignedPRs && assignedPRs.length > 0) {
        prListUl.innerHTML = ""; // Clear "Loading..."
        noPRsMessage.style.display = "none";
        prCountSpan.textContent = `(${assignedPRs.length})`; // Update count
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
        prCountSpan.textContent = "(0)"; // Update count to 0
      } else {
        // Null or undefined means an error occurred during fetch
        prListUl.innerHTML = "<li>Could not load PRs. Check console.</li>";
        noPRsMessage.style.display = "none";
        prCountSpan.textContent = "(Error)"; // Indicate error in count
      }
    } else {
      if (userStatusMessageP) {
        userStatusMessageP.textContent = "Invalid PAT or error fetching user.";
        userStatusMessageP.style.display = "inline";
      }
      if (userAvatarLink) userAvatarLink.style.display = "none";
      if (optionsButton) {
        optionsButton.style.display = "inline-block";
        optionsButton.textContent = "Check PAT";
      }
      if (prListContainer) prListContainer.style.display = "none";
      if (prSummaryDiv) prSummaryDiv.style.display = "block";
      if (prCountSpan) prCountSpan.textContent = "(0)";
    }
  }

  // Initial load
  await displayPRs();
});
