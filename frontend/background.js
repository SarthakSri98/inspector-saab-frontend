// Background script running - Service Worker for Inspector Saab Extension

// const chrome = window.chrome; // Declare the chrome variable

chrome.runtime.onStartup.addListener(() => {
    // Service worker started: onStartup event triggered
    setupListeners();
});

/**
 * Sets up message listeners for extension communication.
 * Handles messages between popup, content scripts, and background.
 *
 * @returns {void}
 */
function setupListeners() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        // Message received in background.js
        console.log('Background received message:', message.action);

        if (message.action === 'saveTabInfo') {
            saveActiveTabInfo(sendResponse);
            return true;
        } else if (message.action === 'applyChanges') {
            // Applying changes with instructions
            handleApplyChanges(
                message.instructions,
                message.currentHandler || message.handlers,
                sendResponse
            );
            return true;
        } else if (message.action === 'getToken') {
            chrome.storage.local.get('authToken', result => {
                const token = result.authToken;
                sendResponse({ token });
            });
            return true;
        } else if (message.action === 'checkContentScript') {
            checkContentScriptStatus(sendResponse);
            return true;
        } else if (message.action === 'injectContentScript') {
            injectContentScriptManually(sendResponse);
            return true;
        } else if (message.action === 'setToken') {
            // Handle token storage from popup
            chrome.storage.local.set({ authToken: message.token }, () => {
                console.log('Token stored successfully');
                sendResponse({ success: true });
            });
            return true;
        } else if (message.action === 'clearToken') {
            // Handle token clearing
            chrome.storage.local.remove(['authToken'], () => {
                console.log('Token cleared successfully');
                sendResponse({ success: true });
            });
            return true;
        } else if (message.action === 'userLoggedIn') {
            // Broadcast login event to all content scripts
            broadcastToAllTabs({ action: 'userLoggedIn' });
            sendResponse({ success: true });
        } else if (message.action === 'contentScriptReady') {
            // Content script is signaling it's ready
            console.log('Content script ready on:', message.url);
            sendResponse({ success: true });
        } else {
            console.warn('Unknown action received:', message.action);
            sendResponse({ success: false, error: 'Unknown action' });
        }
    });
}

/**
 * Check if content script is loaded and responding
 */
function checkContentScriptStatus(sendResponse) {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        if (!tabs[0]?.id) {
            sendResponse({ loaded: false, error: 'No active tab found' });
            return;
        }

        const tabId = tabs[0].id;
        console.log('Checking content script status on tab:', tabId);

        // Try to ping the content script
        chrome.tabs.sendMessage(tabId, { action: 'ping' }, response => {
            if (chrome.runtime.lastError) {
                console.log('Content script not responding:', chrome.runtime.lastError.message);
                sendResponse({
                    loaded: false,
                    error: chrome.runtime.lastError.message,
                    tabId: tabId,
                    url: tabs[0].url,
                });
            } else {
                console.log('Content script responding:', response);
                sendResponse({
                    loaded: true,
                    response: response,
                    tabId: tabId,
                    url: tabs[0].url,
                });
            }
        });
    });
}

/**
 * Manually inject content script as fallback
 */
function injectContentScriptManually(sendResponse) {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        if (!tabs[0]?.id) {
            sendResponse({ success: false, error: 'No active tab found' });
            return;
        }

        const tabId = tabs[0].id;
        const url = tabs[0].url;

        console.log('Manually injecting content script on tab:', tabId, url);

        // Check if URL is injectable
        if (
            !url || // Add this null check
            url.startsWith('chrome://') ||
            url.startsWith('chrome-extension://') ||
            url.startsWith('moz-extension://') ||
            url.startsWith('about:')
        ) {
            sendResponse({
                success: false,
                error: 'Cannot inject on system pages',
                url: url || 'undefined',
            });
            return;
        }

        // Inject handlers first
        chrome.scripting.executeScript(
            {
                target: { tabId: tabId },
                files: ['frontend/handlers/index.js'],
            },
            () => {
                if (chrome.runtime.lastError) {
                    console.error('Error injecting handlers:', chrome.runtime.lastError);
                    sendResponse({
                        success: false,
                        error: `Handler injection failed: ${chrome.runtime.lastError.message}`,
                    });
                } else {
                    console.log('Handlers injected successfully');

                    // Then inject content script
                    chrome.scripting.executeScript(
                        {
                            target: { tabId: tabId },
                            files: ['frontend/content.js'],
                        },
                        () => {
                            if (chrome.runtime.lastError) {
                                console.error(
                                    'Error injecting content script:',
                                    chrome.runtime.lastError
                                );
                                sendResponse({
                                    success: false,
                                    error: `Content script injection failed: ${chrome.runtime.lastError.message}`,
                                });
                            } else {
                                console.log('Content script injected successfully');

                                // Wait a moment for initialization
                                setTimeout(() => {
                                    // Test if it's working
                                    chrome.tabs.sendMessage(tabId, { action: 'ping' }, response => {
                                        if (chrome.runtime.lastError) {
                                            sendResponse({
                                                success: false,
                                                error: 'Injection succeeded but script not responding',
                                            });
                                        } else {
                                            sendResponse({
                                                success: true,
                                                message: 'Content script injected and responding',
                                                response: response,
                                            });
                                        }
                                    });
                                }, 1000);
                            }
                        }
                    );
                }
            }
        );
    });
}

/**
 * Broadcast message to all tabs with content scripts
 */
function broadcastToAllTabs(message) {
    chrome.tabs.query({}, tabs => {
        tabs.forEach(tab => {
            if (tab.id) {
                chrome.tabs.sendMessage(tab.id, message, response => {
                    // Ignore errors for tabs without content scripts
                    if (chrome.runtime.lastError) {
                        console.log(
                            `Could not send to tab ${tab.id}:`,
                            chrome.runtime.lastError.message
                        );
                    }
                });
            }
        });
    });
}

/**
 * Saves information about the active tab to chrome storage.
 *
 * @param {Function} sendResponse - Callback function to send response.
 * @returns {void}
 */
function saveActiveTabInfo(sendResponse) {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        if (tabs.length === 0) {
            console.error('No active tab found.');
            sendResponse({ success: false, error: 'No active tab found' });
            return;
        }

        const activeTab = tabs[0];

        chrome.storage.session.set({
            activeTabInfo: {
                tabId: activeTab.id,
                windowId: activeTab.windowId,
                url: activeTab.url,
            },
        });

        // Saved tab info
        sendResponse({ success: true });
    });
}

/**
 * Retrieves stored tab information from chrome storage.
 *
 * @param {Function} callback - Callback function to handle retrieved data.
 * @returns {void}
 */
function getStoredTabInfo(callback) {
    chrome.storage.session.get(['activeTabInfo'], data => {
        if (!data.activeTabInfo) {
            console.warn('No stored tab info found.');
            callback(null);
            return;
        }

        const { tabId, windowId } = data.activeTabInfo;

        // Check if the tab still exists
        chrome.tabs.get(tabId, tab => {
            if (chrome.runtime.lastError || !tab) {
                console.error('Stored tab no longer exists:', chrome.runtime.lastError?.message);
                callback(null);
            } else {
                // Stored tab found
                callback({ tabId, windowId });
            }
        });
    });
}

/**
 * Finds a fallback active tab when stored tab is not available.
 *
 * @param {Function} callback - Callback function to handle found tab.
 * @returns {void}
 */
function getFallbackActiveTab(callback) {
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, tabs => {
        if (tabs.length > 0) {
            // Fallback tab found
            callback(tabs[0].id);
        } else {
            console.warn('No fallback tab found.');
            callback(null);
        }
    });
}

chrome.runtime.onConnect.addListener(port => {
    port.onMessage.addListener(message => {
        const { tabId, windowId, activeTab } = message;
        chrome.storage.session.set({ extensionTabInfo: { tabId, windowId, activeTab } });
        // Stored tab info
    });
});

/**
 * Handles applying changes to the active tab based on instructions.
 * Enhanced with better error handling and fallback injection
 *
 * @param {Object[]} instructions - Array of instructions to apply.
 * @param {Object} handlers - Map of handler functions.
 * @param {Function} sendResponse - Callback function to send response.
 * @returns {void}
 */
function handleApplyChanges(instructions, currentHandler, sendResponse) {
    chrome.storage.session.get(['extensionTabInfo'], data => {
        const { tabId, activeTab } = data.extensionTabInfo || {};
        if (!tabId) {
            console.error('No stored tabId found.');
            sendResponse({ success: false, error: 'No stored tabId found' });
            return;
        }

        console.log('Applying changes to tab:', tabId);
        console.log('Instructions:', instructions);
        console.log('Current Handler:', currentHandler);

        // First, try to send message directly (content script might already be loaded)
        chrome.tabs.sendMessage(
            tabId,
            { action: 'executeInstructions', instructions, currentHandler },
            response => {
                if (chrome.runtime.lastError) {
                    console.log(
                        'Direct message failed, injecting content script:',
                        chrome.runtime.lastError.message
                    );

                    // Fallback: Ensure content script is injected
                    chrome.scripting.executeScript(
                        { target: { tabId }, files: ['frontend/handlers/index.js'] },
                        () => {
                            if (chrome.runtime.lastError) {
                                console.error(
                                    'Error injecting handlers:',
                                    chrome.runtime.lastError.message
                                );
                                sendResponse({
                                    success: false,
                                    error: chrome.runtime.lastError.message,
                                });
                            } else {
                                chrome.scripting.executeScript(
                                    { target: { tabId }, files: ['frontend/content.js'] },
                                    () => {
                                        if (chrome.runtime.lastError) {
                                            console.error(
                                                'Error injecting content script:',
                                                chrome.runtime.lastError.message,
                                                tabId,
                                                activeTab
                                            );
                                            sendResponse({
                                                success: false,
                                                error: chrome.runtime.lastError.message,
                                            });
                                        } else {
                                            console.log(
                                                'Content script injected. Sending instructions...'
                                            );

                                            // Wait for initialization then send message
                                            setTimeout(() => {
                                                chrome.tabs.sendMessage(
                                                    tabId,
                                                    {
                                                        action: 'executeInstructions',
                                                        instructions,
                                                        currentHandler,
                                                    },
                                                    response => {
                                                        if (chrome.runtime.lastError) {
                                                            console.error(
                                                                'Error communicating with content script:',
                                                                chrome.runtime.lastError.message
                                                            );
                                                            sendResponse({
                                                                success: false,
                                                                error: chrome.runtime.lastError
                                                                    .message,
                                                            });
                                                        } else if (response?.success) {
                                                            console.log(
                                                                'Changes applied successfully.'
                                                            );
                                                            sendResponse({ success: true });
                                                        } else {
                                                            console.error(
                                                                'Failed to apply changes:',
                                                                response?.error
                                                            );
                                                            sendResponse({
                                                                success: false,
                                                                error:
                                                                    response?.error ||
                                                                    'Unknown error',
                                                            });
                                                        }
                                                    }
                                                );
                                            }, 2000); // Wait 2 seconds for content script to initialize
                                        }
                                    }
                                );
                            }
                        }
                    );
                } else if (response?.success) {
                    console.log('Changes applied successfully (direct).');
                    sendResponse({ success: true });
                } else {
                    console.error('Failed to apply changes:', response?.error);
                    sendResponse({ success: false, error: response?.error || 'Unknown error' });
                }
            }
        );
    });
}

// Handle tab updates to monitor content script status
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
        console.log('Tab updated:', tab.url);

        // Try to ping content script after page load
        setTimeout(() => {
            chrome.tabs.sendMessage(tabId, { action: 'ping' }, response => {
                if (chrome.runtime.lastError) {
                    console.log(`Content script not loaded on tab ${tabId}`);
                } else {
                    console.log(`Content script active on tab ${tabId}`);
                }
            });
        }, 1000);
    }
});

// Handle extension icon click
chrome.action.onClicked.addListener(tab => {
    console.log('Extension icon clicked on tab:', tab.url);
});

// Handle storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
    console.log('Storage changed:', changes, 'in namespace:', namespace);
});

// Extension installation/update handler
chrome.runtime.onInstalled.addListener(details => {
    console.log('Inspector Saab extension installed/updated:', details.reason);

    if (details.reason === 'install') {
        console.log('Extension installed for the first time');
    } else if (details.reason === 'update') {
        console.log('Extension updated');
    }
});

// Initialize listeners
setupListeners();

console.log('Inspector Saab background script loaded successfully');
