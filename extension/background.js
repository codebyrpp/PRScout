// This is the background service worker for the extension.
// It will handle GitHub webhook events, manage notifications, and bookmarks.

const PR_CHECK_ALARM_NAME = "prCheckAlarm";
const BOOKMARK_FOLDER_TITLE = "Pull Requests";

// Browser type enum
const BrowserType = {
  CHROME: "chrome",
  FIREFOX: "firefox",
  UNKNOWN: "unknown",
};
let pollingIntervalMinutes = 1; // Default to 1 minute, will be updated from storage

async function getPollingInterval() {
  return new Promise((resolve) => {
    chrome.storage.sync.get({ pollingInterval: 60 }, (data) => {
      // Default 60 seconds
      resolve(data.pollingInterval / 60); // Convert seconds to minutes for alarm
    });
  });
}

async function schedulePRCheckAlarm() {
  const storedIntervalSeconds =
    (await new Promise((resolve) =>
      chrome.storage.sync.get({ pollingInterval: 60 }, (data) =>
        resolve(data.pollingInterval)
      )
    )) || 60;
  // chrome.alarms API expects delay and period in minutes.
  // Ensure minimum 1 minute for alarms, but actual API calls can be more frequent based on storedIntervalSeconds if handled within the alarm.
  // For simplicity, we align the alarm's period with the polling interval, ensuring it's at least 1 minute.
  const alarmPeriodMinutes = Math.max(1, Math.ceil(storedIntervalSeconds / 60));

  pollingIntervalMinutes = alarmPeriodMinutes; // Store for potential use

  chrome.alarms.get(PR_CHECK_ALARM_NAME, (alarm) => {
    if (alarm) {
      console.log(
        "PR Check alarm already exists. Will be updated if interval changed."
      );
      // To ensure the new interval is respected, clear and recreate
      chrome.alarms.clear(PR_CHECK_ALARM_NAME, (wasCleared) => {
        if (wasCleared) console.log("Cleared existing alarm to reschedule.");
        chrome.alarms.create(PR_CHECK_ALARM_NAME, {
          delayInMinutes: 1, // Start after 1 minute
          periodInMinutes: alarmPeriodMinutes,
        });
        console.log(
          `PR Check alarm scheduled to run every ${alarmPeriodMinutes} minutes.`
        );
      });
    } else {
      chrome.alarms.create(PR_CHECK_ALARM_NAME, {
        delayInMinutes: 1, // Start after 1 minute
        periodInMinutes: alarmPeriodMinutes,
      });
      console.log(
        `PR Check alarm scheduled to run every ${alarmPeriodMinutes} minutes.`
      );
    }
  });
}

async function getOrCreateBookmarkFolderId() {
  return new Promise((resolve) => {
    chrome.bookmarks.search({ title: BOOKMARK_FOLDER_TITLE }, (results) => {
      if (results.length > 0) {
        console.log(
          `Found existing bookmark folder "${BOOKMARK_FOLDER_TITLE}" with ID: ${results[0].id}`
        );
        resolve(results[0].id);
      } else {
        let preferredParentId = null;

        const browserType = determineBrowser();

        if (browserType === BrowserType.CHROME) {
          // Chrome or Chromium-based (e.g., Edge, Opera, Zen)
          preferredParentId = "1"; // Standard ID for the Bookmarks Bar in Chrome/Chromium
          console.log(
            "Detected Chromium-based browser. Preferred parent ID for bookmarks: '1'"
          );
        } else if (browserType === BrowserType.FIREFOX) {
          // Firefox
          preferredParentId = "toolbar_____"; // Standard ID for the Bookmarks Toolbar in Firefox
          console.log(
            "Detected Firefox browser. Preferred parent ID for bookmarks: 'toolbar_____'"
          );
        } else {
          console.log(
            "Could not determine specific toolbar ID for this browser. Folder will be created in default location if preferred method fails."
          );
        }

        const createFolderAttempt = (parentIdToTry) => {
          const bookmarkDetails = { title: BOOKMARK_FOLDER_TITLE };
          if (parentIdToTry) {
            bookmarkDetails.parentId = parentIdToTry;
          }

          chrome.bookmarks.create(bookmarkDetails, (folder) => {
            if (chrome.runtime.lastError) {
              console.warn(
                `Error creating bookmark folder "${BOOKMARK_FOLDER_TITLE}" with parentId "${parentIdToTry}": ${chrome.runtime.lastError.message}.`
              );
              // If a preferred parentId was tried and failed, and it wasn't null (meaning it was the first attempt with a specific toolbar ID),
              // then fallback to creating in the default location.
              if (parentIdToTry !== null) {
                console.log(
                  `Falling back to creating folder "${BOOKMARK_FOLDER_TITLE}" in default location.`
                );
                createFolderAttempt(null); // Recursive call for fallback to default location
              } else {
                // This means even creating in the default location (parentIdToTry was null) failed.
                console.error(
                  `Failed to create bookmark folder "${BOOKMARK_FOLDER_TITLE}" even in default location.`
                );
                resolve(null); // Indicate failure to create the folder
              }
            } else {
              console.log(
                `Successfully created bookmark folder "${BOOKMARK_FOLDER_TITLE}" (ID: ${
                  folder.id
                })${
                  parentIdToTry
                    ? ` under parent ID "${parentIdToTry}" (attempted toolbar placement)`
                    : " in default location"
                }.`
              );
              resolve(folder.id);
            }
          });
        };

        console.log(
          `Attempting to create bookmark folder "${BOOKMARK_FOLDER_TITLE}". Preferred parent ID for toolbar: ${
            preferredParentId || "none (will use default location)"
          }`
        );
        createFolderAttempt(preferredParentId);
      }
    });
  });
}

function determineBrowser() {
  /// Heuristic to determine browser type for specific parent IDs
  /// chrome.runtime.getURL("") returns something like:
  /// chrome-extension://<extension-id>/
  /// moz-extension://<extension-uuid>/
  const currentUrlScheme = chrome.runtime.getURL("").split(":")[0];
  if (currentUrlScheme === "chrome-extension") {
    return BrowserType.CHROME;
  } else if (currentUrlScheme === "moz-extension") {
    return BrowserType.FIREFOX;
  } else {
    return BrowserType.UNKNOWN;
  }
}

async function addPRBookmark(pr, folderId) {
  if (!pr.html_url || !pr.title) {
    console.warn("Skipping bookmark for PR with missing URL or title:", pr);
    return;
  }
  // Check if bookmark already exists to avoid duplicates
  chrome.bookmarks.search({ url: pr.html_url }, (existingBookmarks) => {
    if (existingBookmarks.length === 0) {
      chrome.bookmarks.create(
        {
          parentId: folderId,
          title: `[${pr.repository_url.split("/").pop()}] ${pr.title} (by ${
            pr.user.login
          })`,
          url: pr.html_url,
        },
        () => {
          console.log("Bookmarked PR:", pr.title);
        }
      );
    } else {
      console.log("Bookmark for PR already exists:", pr.title);
    }
  });
}

async function removePRBookmark(prUrl) {
  if (!prUrl) return;
  chrome.bookmarks.search({ url: prUrl }, (bookmarks) => {
    for (const bookmark of bookmarks) {
      // Ensure it's within our target folder (optional, but good practice)
      chrome.bookmarks.get(bookmark.parentId, (parent) => {
        if (parent && parent.title === BOOKMARK_FOLDER_TITLE) {
          chrome.bookmarks.remove(bookmark.id, () => {
            console.log("Removed bookmark for PR:", prUrl);
          });
        }
      });
    }
  });
}

async function showNotification(pr) {
  const repoName = pr.repository_url.split("/").pop();
  const prTitle = pr.title;
  const prAuthor = pr.user.login; // The user who created the PR

  chrome.notifications.create(pr.html_url, {
    // Use PR URL as notification ID to prevent duplicates / allow updates
    type: "basic",
    iconUrl: "icons/icon128.png",
    title: `New PR Assigned: ${repoName}`,
    message: `Title: ${prTitle}\nAuthor: ${prAuthor}`,
    priority: 2,
  });
}

// Main function to check for PRs
async function checkPRs() {
  console.log("Checking for assigned PRs...");
  const pat = await getGitHubPAT(); // from auth.js
  if (!pat) {
    console.warn("No GitHub PAT configured. Skipping PR check.");
    // Optionally notify user to configure PAT
    chrome.notifications.create("config-pat-reminder", {
      type: "basic",
      iconUrl: "icons/icon128.png",
      title: "PRScout Setup Needed",
      message:
        "Please configure your GitHub Personal Access Token in the extension options.",
    });
    chrome.action.setBadgeText({ text: "!" }); // Set badge to ! if PAT is missing
    chrome.action.setBadgeBackgroundColor({ color: "#D73A49" }); // Red color for error
    chrome.alarms.clear(PR_CHECK_ALARM_NAME); // Stop alarm until PAT is set
    console.log("Cleared PR Check alarm due to missing PAT.");
    return;
  }

  let currentUserLogin = await getCurrentUserLogin(); // from auth.js
  if (!currentUserLogin) {
    const userDetails = await fetchUserDetails(); // from auth.js
    if (userDetails && userDetails.login) {
      currentUserLogin = userDetails.login;
    } else {
      console.error("Could not determine GitHub username. Skipping PR check.");
      return;
    }
  }

  const assignedPRs = await fetchAssignedPRs(currentUserLogin); // from auth.js
  if (!assignedPRs) {
    // Can be null if API fails
    console.log("Failed to fetch PRs or no PRs found.");
    return;
  }

  const knownPRUrls = await getKnownPRUrls(); // from auth.js (local storage)
  const newPRs = [];
  const currentPRUrls = new Set();

  const bookmarkFolderId = await getOrCreateBookmarkFolderId();

  let assignedPRCount = 0;
  for (const pr of assignedPRs) {
    if (
      pr &&
      pr.html_url &&
      pr.assignee &&
      pr.assignee.login === currentUserLogin
    ) {
      assignedPRCount++; // Increment count
      currentPRUrls.add(pr.html_url);
      if (!knownPRUrls.includes(pr.html_url)) {
        newPRs.push(pr);
        await showNotification(pr);
        await addPRBookmark(pr, bookmarkFolderId);
      }
    }
  }

  // Update known PRs list for next check (all currently assigned PRs)
  await updateKnownPRUrls(Array.from(currentPRUrls)); // from auth.js (local storage)

  if (newPRs.length > 0) {
    console.log(`Found ${newPRs.length} new PR(s).`);
  } else {
    console.log("No new PRs assigned since last check.");
  }

  // Update badge text with the total number of assigned PRs
  chrome.action.setBadgeText({
    text: assignedPRCount > 0 ? String(assignedPRCount) : "",
  });
  chrome.action.setBadgeBackgroundColor({ color: "#0366D6" }); // GitHub blue-ish color

  // FR6.3: When a PR is closed or unassigned from the user, the corresponding bookmark is silently removed.
  // This means we need to find which of the `knownPRUrls` are NOT in `currentPRUrls`
  const prsToUnbookmark = knownPRUrls.filter((url) => !currentPRUrls.has(url));
  for (const url of prsToUnbookmark) {
    await removePRBookmark(url);
  }
  if (prsToUnbookmark.length > 0) {
    console.log(
      `Removed ${prsToUnbookmark.length} bookmarks for closed/unassigned PRs.`
    );
  }
}

// --- Event Listeners ---

chrome.runtime.onInstalled.addListener(async (details) => {
  console.log("PRScout extension installed/updated.", details);
  // Initial setup on install/update
  await fetchUserDetails(); // Try to get user details early
  await schedulePRCheckAlarm();
  // Perform initial check
  // Wrapped in a timeout to allow options to be set by user if it's a fresh install before first noisy check
  setTimeout(checkPRs, 10 * 1000); // Check after 10 seconds
});

// Listener for the alarm
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === PR_CHECK_ALARM_NAME) {
    checkPRs();
  }
});

// Listener for messages (e.g., from options page)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "optionsChanged") {
    console.log("Options changed, re-scheduling alarm and re-checking PRs.");
    // Re-fetch interval and reschedule
    schedulePRCheckAlarm();
    // Perform an immediate check after options change
    checkPRs();
    sendResponse({ status: "Options received, alarm rescheduled." });
    return true; // Indicate async response
  } else if (request.action === "getUser") {
    // Kept for popup
    getCurrentUserLogin()
      .then(async (login) => {
        if (login) {
          sendResponse({ success: true, userInfo: { login } });
        } else {
          // If no login, try fetching it
          const user = await fetchUserDetails();
          if (user && user.login) {
            sendResponse({ success: true, userInfo: { login: user.login } });
          } else {
            sendResponse({
              success: false,
              error: "User not authenticated or PAT invalid.",
            });
          }
        }
      })
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }
  // Add other message handlers here if needed
  return false;
});

// Optional: Listen for bookmark removal to keep knownPRUrls in sync if manually deleted.
// This is more complex and might be overkill, as our main sync is from API.
// chrome.bookmarks.onRemoved.addListener(async (id, removeInfo) => {
//   // If a bookmark is removed from our folder, we might want to remove it from knownPRUrls
//   // This requires checking if removeInfo.node.url was one of our PRs
// });

// Global listener for notification clicks
chrome.notifications.onClicked.addListener((notificationId) => {
  // notificationId is the PR URL
  chrome.tabs.create({ url: notificationId });
  chrome.notifications.clear(notificationId); // Clear the notification once clicked
});

console.log("Background script loaded.");
// Initial scheduling of the alarm when the extension loads (not just onInstalled)
// This handles cases where the browser starts up, or the extension is enabled.
schedulePRCheckAlarm();
