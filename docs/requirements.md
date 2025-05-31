# Requirements Specification: GitHub Pull Request Notifier Extension

## 1. Overview

The GitHub Pull Request Notifier is a browser extension that notifies users in real-time when a pull request (PR) is assigned to them on GitHub. The extension works only if the user is logged into GitHub in the browser.

---

## 2. Functional Requirements

### 2.1. User Authentication

- **FR1.1**: The extension must detect if the user is logged into GitHub in the browser.
- **FR1.2**: If the user is not logged in, the extension should prompt the user to log in to GitHub.

### 2.2. GitHub Integration

- **FR2.1**: The extension must be able to access the user's GitHub account to determine their username and repositories they have access to.
- **FR2.2**: The extension must subscribe to GitHub webhook events relevant to pull requests, specifically the [`pull_request`](https://docs.github.com/en/webhooks/webhook-events-and-payloads#pull_request) event.
- **FR2.3**: The extension must filter webhook events to only those where the action is `assigned` and the assignee is the logged-in user.

### 2.3. Notification Delivery

- **FR3.1**: When a PR is assigned to the user, the extension must display a browser notification with:
  - The repository name
  - The PR title
  - The PR author
  - A direct link to the PR
- **FR3.2**: The notification must be actionable (clicking it opens the PR in a new tab).

### 2.4. User Preferences

- **FR4.1**: The extension must provide a settings page where users can:
  - Enable/disable notifications
  - Select which repositories to monitor (optional)
  - Set notification sound/vibration (optional)

### 2.5. Security & Privacy

- **FR5.1**: The extension must not store or transmit the user's GitHub credentials.
- **FR5.2**: All communication with GitHub must use secure HTTPS endpoints.
- **FR5.3**: The extension must request only the minimum permissions necessary.

### 2.6. Bookmarks Integration

- **FR6.1**: The extension shall create a special bookmarks folder in the browser to save URLs of pull requests.
- **FR6.2**: When a notification is received for a PR assignment, the PR URL is automatically added as a bookmark in this folder.
- **FR6.3**: When a PR is closed or unassigned from the user, the corresponding bookmark is silently removed from the folder.

### 2.7. User-Configurable Backend Endpoint

- **FR7.1**: The extension must allow users to specify the URL of their own deployed backend service (e.g., in the extension's settings/options page).
- **FR7.2**: The extension must validate the backend URL and provide clear error messages if the connection fails.
- **FR7.3**: Documentation must be provided to guide users on deploying the backend and configuring the extension to connect to it.

---

## 3. Non-Functional Requirements

### 3.1. Compatibility

- **NFR1.1**: The extension must support the latest versions of Chrome, Firefox, and Zen browsers.

### 3.2. Performance

- **NFR2.1**: Notifications must be delivered within 10 seconds of the PR assignment event.

### 3.3. Usability

- **NFR3.1**: The extension UI must be simple and intuitive.
- **NFR3.2**: All user-facing text must be in English (initial version).

### 3.4. Reliability

- **NFR4.1**: The extension must handle network failures gracefully and retry as needed.

---

## 4. Technical Considerations

### 4.1. Webhook Handling

- Since browser extensions cannot directly receive GitHub webhooks, a lightweight backend service may be required to receive webhook events and relay them to the extension via WebSockets, polling, or push messaging.

### 4.2. Authentication

- The extension may use GitHub OAuth to identify the user and access their PR assignments if necessary.

### 4.3. Notification API

- The extension must use the [Web Notifications API](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API) to display notifications.

---

## 5. Out of Scope

- Notifications for issues, comments, or other GitHub events not related to PR assignments.
- Support for browsers other than Chrome, Firefox, and Zen (initial version).
- Mobile browser support.

---

## 6. References

- [GitHub Webhook Events and Payloads](https://docs.github.com/en/webhooks/webhook-events-and-payloads#pull_request)
- [Web Notifications API](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API)

## 7. Packaging and Distribution

- The extension and backend service will be open source, allowing anyone to deploy the backend on their own infrastructure.
- The extension will be developed as a cross-browser WebExtension, compatible with Chrome, Firefox, and Zen browsers.
- For Zen Browser, the extension will be packaged and distributed as a **Zen Mod**.
- The codebase will use the standard [WebExtensions API](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions) to ensure compatibility across all supported browsers.
- The extension will be tested in Zen Browser to ensure full compatibility and a seamless user experience.
- Distribution will be via the Chrome Web Store, Firefox Add-ons Marketplace, and the Zen Mod Store (or manual installation for Zen, as appropriate).
- Documentation will be provided for deploying the backend service and configuring the extension to connect to a user-deployed backend.
