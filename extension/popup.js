// JavaScript for the extension popup UI.
document.addEventListener("DOMContentLoaded", async () => {
  console.log("PullRadar popup loaded.");

  const userInfoP = document.getElementById("user-info");
  const optionsButton = document.getElementById("options-button"); // For re-configuring token
  const openOptionsPageButton = document.getElementById("open-options-page");
  const userAvatarImg = document.getElementById("user-avatar"); // Added for avatar
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
      userInfoP.textContent = "GitHub PAT not set.";
      optionsButton.style.display = "inline-block";
      optionsButton.textContent = "Set PAT in Options";
      prSummaryDiv.style.display = "block";
      prListContainer.style.display = "none";
      prCountSpan.textContent = "(0)"; // Reset count on no PAT
      return;
    }

    optionsButton.style.display = "none"; // Hide if PAT is present initially
    prSummaryDiv.style.display = "none"; // Hide initial summary

    // Try to get user info using the PAT (also validates PAT roughly)
    // `fetchUserDetails` is in auth.js, which should be loaded before popup.js
    userInfoP.textContent = "Fetching user info...";
    const user = await fetchUserDetails(); // from auth.js

    if (user && user.login) {
      userInfoP.textContent = `User: ${user.login}`;
      if (user.avatar_url) {
        userAvatarImg.src = user.avatar_url;
        userAvatarImg.style.display = "inline-block";
      } else {
        userAvatarImg.style.display = "none";
      }
      prListContainer.style.display = "block";
      prListUl.innerHTML = "<li>Loading PRs...</li>"; // Clear previous list
      prCountSpan.textContent = "(...)"; // Indicate loading count

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
      userInfoP.textContent =
        "Invalid PAT or could not fetch user. Please check options.";
      optionsButton.style.display = "inline-block";
      optionsButton.textContent = "Check PAT in Options";
      userAvatarImg.style.display = "none"; // Hide avatar on error
      prListContainer.style.display = "none";
      prSummaryDiv.style.display = "block"; // Show summary again
      prCountSpan.textContent = "(0)"; // Reset count on error/no PAT
    }
  }

  // Initial load
  await displayPRs();
});
