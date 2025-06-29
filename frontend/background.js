// Background script running

chrome.runtime.onStartup.addListener(() => {
    // Service worker started: onStartup event triggered
    initializeExtensionState();
    setupListeners();
});

// Function to initialize the extension's state
function initializeExtensionState() {
    // Initializing extension state...
}

// Function to set up listeners
function setupListeners() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        // Message received in background.js

        if (message.action === "saveTabInfo") {
            saveActiveTabInfo(sendResponse);
            return true;
        }
        else if (message.action === "applyChanges") {
            // Applying changes with instructions
            handleApplyChanges(message.instructions, message.handlers, sendResponse);
            return true;
        }
        else if (message.action === "getToken") {
            chrome.storage.local.get('authToken', (result) => {
                const token = result.authToken;
                sendResponse({ token });
            });
            return true;
        }
        else {
            console.warn("Unknown action received:", message.action);
            sendResponse({ success: false, error: "Unknown action" });
        }
    });
}

// 🔹 Save Active Tab Info in `chrome.storage.session`
function saveActiveTabInfo(sendResponse) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length === 0) {
            console.error("No active tab found.");
            sendResponse({ success: false, error: "No active tab found" });
            return;
        }

        const activeTab = tabs[0];

        chrome.storage.session.set({
            activeTabInfo: {
                tabId: activeTab.id,
                windowId: activeTab.windowId,
                url: activeTab.url
            }
        });

        // Saved tab info
        sendResponse({ success: true });
    });
}

// 🔹 Retrieve Active Tab Info
function getStoredTabInfo(callback) {
    chrome.storage.session.get(["activeTabInfo"], (data) => {
        if (!data.activeTabInfo) {
            console.warn("No stored tab info found.");
            callback(null);
            return;
        }

        const { tabId, windowId } = data.activeTabInfo;

        // Check if the tab still exists
        chrome.tabs.get(tabId, (tab) => {
            if (chrome.runtime.lastError || !tab) {
                console.error("Stored tab no longer exists:", chrome.runtime.lastError?.message);
                callback(null);
            } else {
                // Stored tab found
                callback({ tabId, windowId });
            }
        });
    });
}

// 🔹 Focus Window & Activate Stored Tab
function focusWindowAndUseStoredTab(callback) {
    getStoredTabInfo((storedTab) => {
        if (!storedTab) {
            console.error("No valid stored tab found.");
            getFallbackActiveTab(callback); // Try to find an alternative tab
            return;
        }

        const { tabId, windowId } = storedTab;

        // First, focus the correct window
        chrome.windows.update(windowId, { focused: true }, () => {
            if (chrome.runtime.lastError) {
                console.warn("Could not focus window. It might be closed.");
            }

            // Ensure tab is active
            chrome.tabs.update(tabId, { active: true }, () => {
                if (chrome.runtime.lastError) {
                    console.error("Could not activate tab:", chrome.runtime.lastError.message);
                    getFallbackActiveTab(callback);
                } else {
                    // Activated stored tab
                    callback(tabId);
                }
            });
        });
    });
}

// 🔹 Handle Fallback: Find Another Active Tab If Stored Tab is Missing
function getFallbackActiveTab(callback) {
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
        if (tabs.length > 0) {
            // Fallback tab found
            callback(tabs[0].id);
        } else {
            console.warn("No fallback tab found.");
            callback(null);
        }
    });
}

chrome.runtime.onConnect.addListener((port) => {
    port.onMessage.addListener((message) => {
        const { tabId, windowId, activeTab } = message;
        chrome.storage.session.set({ extensionTabInfo: { tabId, windowId, activeTab } });
        // Stored tab info
    });
});

// Function to apply changes to the correct tab
function handleApplyChanges(instructions, currentHandler, sendResponse) {
    chrome.storage.session.get(["extensionTabInfo"], (data) => {
        const { tabId, activeTab } = data.extensionTabInfo || {};
        if (!tabId) {
            console.error("No stored tabId found.");
            return;
        }

        // Ensure content script is injected
        chrome.scripting.executeScript(
            { target: { tabId }, files: ["frontend/content.js"] },
            () => {
                if (chrome.runtime.lastError) {
                    console.error("Error injecting content script:", chrome.runtime.lastError.message, tabId, activeTab);
                } else {
                    // Content script injected. Sending instructions...
                    chrome.tabs.sendMessage(
                        tabId,
                        { action: "executeInstructions", instructions, currentHandler },
                        (response) => {
                            if (chrome.runtime.lastError) {
                                console.error("Error communicating with content script:", chrome.runtime.lastError.message);
                            } else if (response?.success) {
                                sendResponse({ success: true });
                                // Changes applied successfully.
                            } else {
                                console.error("Failed to apply changes:", response?.error);
                            }
                        }
                    );
                }
            }
        );
    });
}

// Initialize listeners
setupListeners();
