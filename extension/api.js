// extension/auth.js

const GITHUB_API_BASE_URL = "https://api.github.com";

// Function to get stored GitHub Personal Access Token
async function getGitHubPAT() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(["githubPat"], (result) => {
      resolve(result.githubPat);
    });
  });
}

// Function to set stored GitHub Personal Access Token
async function setGitHubPAT(pat) {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ githubPat: pat }, () => {
      console.log("GitHub PAT saved.");
      resolve();
    });
  });
}

// Function to get authorization headers for GitHub API requests
async function getAuthHeaders() {
  const pat = await getGitHubPAT();
  if (!pat) {
    console.warn("GitHub PAT not found. Please set it in options.");
    return null;
  }
  return {
    Authorization: `Bearer ${pat}`,
    Accept: "application/vnd.github.v3+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

// Function to fetch user details (e.g., username)
async function fetchUserDetails() {
  const headers = await getAuthHeaders();
  if (!headers) return null;

  try {
    const response = await fetch(`${GITHUB_API_BASE_URL}/user`, { headers });
    if (!response.ok) {
      console.error(
        "Failed to fetch user details:",
        response.status,
        await response.text()
      );
      if (response.status === 401) {
        // Unauthorized, likely invalid PAT
        chrome.notifications.create("pat-invalid", {
          type: "basic",
          iconUrl: "icons/icon128.png",
          title: "GitHub Authentication Failed",
          message:
            "Invalid Personal Access Token. Please update it in the extension options.",
        });
        // Optionally clear the bad PAT from storage
        // chrome.storage.sync.remove("githubPat");
      }
      return null;
    }
    const user = await response.json();
    console.log("User details fetched:", user);
    // Store user login for easier access
    chrome.storage.local.set({
      github_user_login: user.login,
      github_user_id: user.id,
    });
    return user;
  } catch (error) {
    console.error("Error fetching user details:", error);
    return null;
  }
}

// Function to fetch pull requests assigned to the user
async function fetchAssignedPRs(username) {
  if (!username) {
    const storedData = await chrome.storage.local.get("github_user_login");
    username = storedData.github_user_login;
  }
  if (!username) {
    console.warn("Username not available. Cannot fetch PRs.");
    // Attempt to fetch user details first if not available
    const user = await fetchUserDetails();
    if (user && user.login) {
      username = user.login;
    } else {
      return []; // Return empty if username still cannot be determined
    }
  }

  const headers = await getAuthHeaders();
  if (!headers) return [];

  // Construct the search query:
  // We search for issues (which include PRs) assigned to the user, that are open, and are pull requests.
  // GitHub search API is more efficient for this than iterating through all repos/notifications.
  const query = `is:open is:pr assignee:${username} archived:false`;
  const url = `${GITHUB_API_BASE_URL}/search/issues?q=${encodeURIComponent(
    query
  )}&sort=updated&order=desc`;

  try {
    const response = await fetch(url, { headers });
    if (!response.ok) {
      console.error(
        "Failed to fetch assigned PRs:",
        response.status,
        await response.text()
      );
      // Handle rate limiting
      if (
        response.status === 403 &&
        response.headers.get("X-RateLimit-Remaining") === "0"
      ) {
        const resetTime = new Date(
          parseInt(response.headers.get("X-RateLimit-Reset"), 10) * 1000
        );
        console.warn(
          `Rate limit exceeded. Resets at ${resetTime.toLocaleTimeString()}`
        );
        chrome.notifications.create("rate-limit", {
          type: "basic",
          iconUrl: "icons/icon128.png",
          title: "GitHub API Rate Limit",
          message: `Rate limit exceeded. Will try again after ${resetTime.toLocaleTimeString()}. You can adjust polling in options.`,
        });
        // Consider disabling the alarm temporarily or increasing interval
        // chrome.alarms.clear("prCheckAlarm"); // Example
      }
      return []; // Return empty array on error
    }
    const data = await response.json();
    console.log("Assigned PRs data:", data);
    // Filter out any items that are not pull requests (though `is:pr` should handle this)
    // Also, ensure pull_request object exists
    return data.items.filter(
      (item) =>
        item.pull_request && item.assignee && item.assignee.login === username
    );
  } catch (error) {
    console.error("Error fetching assigned PRs:", error);
    return [];
  }
}

// Function to search GitHub for PRs based on a query string
async function searchGitHubPRs(searchQuery) {
  const headers = await getAuthHeaders();
  if (!headers) {
    console.warn("GitHub PAT not found. Cannot perform search.");
    return []; // Return empty array if no PAT
  }

  // The searchQuery is expected to be pre-formed by the caller,
  // e.g., "author:username is:pr is:open"
  // We add sort and order for consistency. Adding 'archived:false' by default.
  // However, if 'archived:true' or 'archived:false' is part of searchQuery, it will take precedence.
  let fullQuery = searchQuery;
  if (!searchQuery.includes("archived:")) {
    fullQuery += " archived:false";
  }

  const url = `${GITHUB_API_BASE_URL}/search/issues?q=${encodeURIComponent(
    fullQuery
  )}&sort=updated&order=desc`;

  console.log(`Searching GitHub with query: ${fullQuery}`);

  try {
    const response = await fetch(url, { headers });
    if (!response.ok) {
      console.error(
        `Failed to search GitHub (${fullQuery}):`,
        response.status,
        await response.text()
      );
      // Handle rate limiting, similar to fetchAssignedPRs
      if (
        response.status === 403 &&
        response.headers.get("X-RateLimit-Remaining") === "0"
      ) {
        const resetTimeEpoch =
          parseInt(response.headers.get("X-RateLimit-Reset"), 10) * 1000;
        const resetTime = new Date(resetTimeEpoch);
        console.warn(
          `Rate limit exceeded for search. Resets at ${resetTime.toLocaleTimeString()}`
        );
        // The caller (e.g., popup.js) can decide how to handle UI for empty results due to rate limiting.
      }
      return []; // Return empty array on error
    }
    const data = await response.json();
    console.log(`Search results for "${fullQuery}":`, data);
    // The search API returns issues. Filter items to ensure they have a pull_request object,
    // as 'is:pr' in the query should make this redundant but good for safety.
    return data.items.filter((item) => item.pull_request);
  } catch (error) {
    console.error(`Error during GitHub search (${fullQuery}):`, error);
    return []; // Return empty array on network error or other issues
  }
}

// Function to get the current user login from storage
async function getCurrentUserLogin() {
  return new Promise((resolve) => {
    chrome.storage.local.get("github_user_login", (result) => {
      resolve(result.github_user_login);
    });
  });
}

// Helper to check if a PR is new compared to a list of known PR URLs
function findNewPRs(currentPRs, knownPRUrls) {
  const knownSet = new Set(knownPRUrls);
  return currentPRs.filter((pr) => !knownSet.has(pr.html_url));
}

// Helper to get currently stored PR URLs
async function getKnownPRUrls() {
  return new Promise((resolve) => {
    chrome.storage.local.get({ knownPRUrls: [] }, (data) => {
      resolve(data.knownPRUrls);
    });
  });
}

// Helper to update stored PR URLs
async function updateKnownPRUrls(newPRUrls) {
  await chrome.storage.local.set({ knownPRUrls: newPRUrls });
}

// Expose functions for background.js or other scripts if not using modules directly
// For service workers, it's common to have these functions in the global scope
// or explicitly attach them to 'self' if needed by other parts of the worker.
// self.GitHubAPI = { fetchUserDetails, fetchAssignedPRs, getAuthHeaders, getCurrentUserLogin, findNewPRs, getKnownPRUrls, updateKnownPRUrls, getGitHubPAT };
