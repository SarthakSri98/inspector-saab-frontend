if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', main);
} else {
    main();
}

function main() {
    const API_BASE_URL = 'https://inspectorsaab.onrender.com';
    const chrome = window.chrome; // Declare the chrome variable

    // DOM Elements
    const loginButton = document.getElementById('loginButton');
    const applyChangesButton = document.getElementById('applyChanges');
    const descriptionArea = document.getElementById('description');
    const statusMessage = document.getElementById('status');
    const iconBar = document.getElementsByClassName('icon-bar')[0];

    // Connection state tracking
    let contentScriptReady = false;
    let connectionRetries = 0;
    const maxRetries = 5;

    // Check if User is Logged In
    window.onload = () => {
        const token = localStorage.getItem('authToken');

        if (token) {
            showAppUI();
        } else {
            showLoginUI();
        }

        // Test connection after UI is ready
        setTimeout(testConnection, 1000);
    };

    function showLoginUI() {
        if (loginButton) loginButton.style.display = 'block';
        if (applyChangesButton) applyChangesButton.style.display = 'none';
        if (descriptionArea) descriptionArea.style.display = 'none';
        if (statusMessage) statusMessage.textContent = 'Please log in to continue.';
        if (iconBar) iconBar.style.display = 'none';
    }

    function showAppUI() {
        if (loginButton) loginButton.style.display = 'none';
        if (applyChangesButton) applyChangesButton.style.display = 'block';
        if (descriptionArea) descriptionArea.style.display = 'block';
        if (statusMessage) statusMessage.textContent = 'Welcome! My friend.';
        if (iconBar) iconBar.style.display = '';

        // Fetch user info from localStorage
        const profilePicUrl = localStorage.getItem('profilePic');
        const userName = localStorage.getItem('userName');
        const credits = localStorage.getItem('credits') || '0';

        // Display user info in the dropdown
        const profilePic = document.getElementById('profilePic');
        const userNameElement = document.getElementById('userName');
        const userCreditsElement = document.getElementById('userCredits');

        if (profilePic && profilePicUrl) {
            profilePic.src = profilePicUrl;
        }
        if (userNameElement && userName) {
            userNameElement.textContent = userName;
        }
        if (userCreditsElement) {
            userCreditsElement.textContent = credits;
        }

        handleSiteRestrictions();
    }

    // Robust connection test with retries
    async function testConnection() {
        console.log(`🔍 Testing connection (attempt ${connectionRetries + 1}/${maxRetries})...`);

        try {
            const response = await sendMessageToContentScript({ action: 'ping' }, 3000); // 3 second timeout

            if (response && response.success) {
                contentScriptReady = true;
                console.log('✅ Content script connection successful:', response);

                // Update status if needed
                if (statusMessage && statusMessage.textContent.includes('connection')) {
                    statusMessage.textContent = 'Ready to apply changes!';
                }

                return true;
            } else {
                throw new Error('Invalid response from content script');
            }
        } catch (error) {
            console.warn(
                `⚠️ Connection test failed (${connectionRetries + 1}/${maxRetries}):`,
                error.message
            );

            connectionRetries++;

            if (connectionRetries < maxRetries) {
                // Retry with exponential backoff
                const delay = Math.min(1000 * Math.pow(2, connectionRetries), 5000);
                console.log(`🔄 Retrying connection in ${delay}ms...`);
                setTimeout(testConnection, delay);
            } else {
                console.error(
                    '❌ Max connection retries reached. Content script may not be loaded.'
                );
                contentScriptReady = false;

                if (statusMessage) {
                    statusMessage.textContent =
                        '⚠️ Extension not fully loaded. Please refresh the page.';
                    statusMessage.style.color = '#856404';
                    statusMessage.style.backgroundColor = '#fff3cd';
                    statusMessage.style.padding = '8px';
                    statusMessage.style.borderRadius = '4px';
                }
            }

            return false;
        }
    }

    // Handle Google Login with better error handling
    if (loginButton) {
        loginButton.addEventListener('click', () => {
            console.log('🔐 Starting OAuth login...');

            let authWindow = null;
            let messageListener = null;
            let checkClosedInterval = null;
            let cleanupTimeout = null;

            try {
                authWindow = window.open(
                    `${API_BASE_URL}/api/auth/google`,
                    'Google Login',
                    'width=500,height=600,scrollbars=yes,resizable=yes'
                );

                if (!authWindow) {
                    throw new Error('Failed to open OAuth window. Please check popup blockers.');
                }

                // Set up message listener for OAuth response
                messageListener = event => {
                    // Verify origin for security
                    if (event.origin !== API_BASE_URL) {
                        console.log('🚫 Ignoring message from unauthorized origin:', event.origin);
                        return;
                    }

                    console.log('📨 Received OAuth message:', event.data);

                    const { token, profilePic, name, currentUrl, credits } = event.data;
                    if (token) {
                        console.log('✅ OAuth successful, processing login...');

                        // Store auth data
                        chrome.storage.local.set({ authToken: token }, () => {
                            if (chrome.runtime.lastError) {
                                console.error('❌ Error saving token:', chrome.runtime.lastError);
                            } else {
                                console.log('✅ Auth token saved to chrome storage');
                            }
                        });

                        // Notify content script about login (with error handling)
                        chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
                            if (tabs[0]?.id) {
                                chrome.tabs.sendMessage(
                                    tabs[0].id,
                                    { action: 'userLoggedIn' },
                                    response => {
                                        if (chrome.runtime.lastError) {
                                            console.log(
                                                'ℹ️ Content script not ready for login notification:',
                                                chrome.runtime.lastError.message
                                            );
                                        } else {
                                            console.log(
                                                '✅ Login notification sent to content script'
                                            );
                                        }
                                    }
                                );
                            }
                        });

                        // Store user data
                        localStorage.setItem('profilePic', profilePic || '');
                        localStorage.setItem('authToken', token);
                        localStorage.setItem('userName', name || '');
                        localStorage.setItem('currentUrl', currentUrl || '');
                        localStorage.setItem('credits', credits || '0');

                        chrome.storage.local.set({ currentUrl: currentUrl || '' }, () => {
                            if (chrome.runtime.lastError) {
                                console.error(
                                    '❌ Error saving current URL:',
                                    chrome.runtime.lastError
                                );
                            } else {
                                console.log('✅ Current URL saved to chrome.storage');
                            }
                        });

                        showAppUI();
                        cleanup();

                        // Test connection after successful login
                        setTimeout(testConnection, 1000);
                    }
                };

                // Cleanup function
                const cleanup = () => {
                    console.log('🧹 Cleaning up OAuth resources...');

                    if (messageListener) {
                        window.removeEventListener('message', messageListener);
                        messageListener = null;
                    }

                    if (checkClosedInterval) {
                        clearInterval(checkClosedInterval);
                        checkClosedInterval = null;
                    }

                    if (cleanupTimeout) {
                        clearTimeout(cleanupTimeout);
                        cleanupTimeout = null;
                    }

                    // Try to close auth window (ignore CORP errors)
                    if (authWindow) {
                        try {
                            if (!authWindow.closed) {
                                authWindow.close();
                                console.log('✅ Auth window closed successfully');
                            }
                        } catch (error) {
                            // Silently ignore CORP policy errors - this is expected
                            if (
                                error.message &&
                                error.message.includes('Cross-Origin-Opener-Policy')
                            ) {
                                console.log(
                                    'ℹ️ Auth window will close automatically (CORP policy)'
                                );
                            } else {
                                console.log('ℹ️ Auth window cleanup:', error.message);
                            }
                        }
                        authWindow = null;
                    }
                };

                // Add the message listener
                window.addEventListener('message', messageListener);

                // Check if window was closed manually (ignore CORP errors)
                checkClosedInterval = setInterval(() => {
                    try {
                        if (authWindow && authWindow.closed) {
                            console.log('ℹ️ Auth window was closed manually');
                            cleanup();
                        }
                    } catch (error) {
                        // Ignore CORP errors when checking window.closed
                        console.log('ℹ️ Cannot check window status due to CORP policy');
                    }
                }, 1000);

                // Set up a cleanup timer (30 seconds timeout)
                cleanupTimeout = setTimeout(() => {
                    console.log('⏰ OAuth timeout reached, cleaning up...');
                    cleanup();
                }, 30000);
            } catch (error) {
                console.error('❌ OAuth initialization error:', error);
                if (statusMessage) {
                    statusMessage.textContent = 'Login failed. Please try again.';
                    statusMessage.style.color = '#dc3545';
                }
            }
        });
    }

    // Establish a connection to the background script
    const port = chrome.runtime.connect();

    // Send the tabId and windowId to the background script
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        if (tabs.length > 0) {
            const activeTab = tabs[0];
            port.postMessage({ tabId: activeTab.id, windowId: activeTab.windowId, activeTab });
        } else {
            console.warn('No active tab found.');
        }
    });

    const jsSnippets = {
        addBackToTopButton:
            'An arrow key slightly at the bottom right to go back to the top when clicked',
        addDarkMode: 'A dark mode button at the top right to toggle dark mode when clicked',
        addReadingProgressBar:
            'A progress bar at the top which increases as we scroll to the bottom',
        highlightContent: 'A method to highlight content on the site as per json returned',
    };

    // Triggered when the "Apply Changes" button is clicked
    if (applyChangesButton) {
        applyChangesButton.addEventListener('click', async () => {
            const description = document.getElementById('description')?.value;
            const status = document.getElementById('status');

            if (status) status.textContent = 'Processing...';

            if (!description) {
                if (status) status.textContent = 'Please enter a description!';
                return;
            }

            // Check if content script is ready
            if (!contentScriptReady) {
                console.log('⚠️ Content script not ready, testing connection...');
                const isReady = await testConnection();
                if (!isReady) {
                    if (status) {
                        status.textContent =
                            'Extension not ready. Please refresh the page and try again.';
                        status.style.color = '#dc3545';
                    }
                    return;
                }
            }

            try {
                await sendMessageToContentScript({
                    action: 'startOverlay',
                    message: 'Starting process...',
                });
                let cleanHtml = null;
                let currentUrl = null;

                currentUrl = await new Promise(resolve => {
                    chrome.storage.local.get(['currentUrl'], result => {
                        resolve(result.currentUrl);
                    });
                });

                if (window.location.href !== currentUrl) {
                    cleanHtml = await getHtmlFromTab(description);

                    if (!cleanHtml) {
                        if (status) status.textContent = 'No HTML found.';
                        return;
                    }
                }

                const siteDetails = await getTabDetails();

                await sendMessageToContentScript({
                    action: 'updateOverlay',
                    message: 'Loading magic... one pixel at a time ✨',
                });
                const aiResponse = await callAIAPI(description, cleanHtml, siteDetails);

                if (!aiResponse) {
                    if (status) status.textContent = 'No response from AI.';
                    await sendMessageToContentScript({
                        action: 'updateOverlay',
                        message: 'AI API call failed.',
                    });
                    return;
                }

                await sendMessageToContentScript({
                    action: 'updateOverlay',
                    message: 'Processing AI response...',
                });
                const { parsedJson, handlers } = parseAIResponse(aiResponse);

                if (!parsedJson) {
                    if (status) status.textContent = 'Failed to process AI response.';
                    return;
                }

                await sendInstructionsToBackground(parsedJson, handlers);
                if (status) status.textContent = parsedJson.message || 'Changes applied!';
            } catch (error) {
                console.error('Error:', error);
                if (status) {
                    status.textContent = 'Something went wrong. Please try again.';
                    status.style.color = '#dc3545';
                }
            } finally {
                try {
                    await sendMessageToContentScript({ action: 'endOverlay' });
                } catch (error) {
                    console.log('ℹ️ Could not end overlay (content script may not be ready)');
                }
            }
        });
    }

    /**
     * Sends a message to the content script of the active tab.
     */
    async function sendMessageToContentScript(message, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error(`Message timeout after ${timeout}ms`));
            }, timeout);

            chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
                if (!tabs[0]?.id) {
                    clearTimeout(timeoutId);
                    reject(new Error('No active tab found'));
                    return;
                }

                chrome.tabs.sendMessage(tabs[0].id, message, response => {
                    clearTimeout(timeoutId);

                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                    } else {
                        resolve(response);
                    }
                });
            });
        });
    }

    /**
     * Step 1: Extract the HTML content from the active tab
     */
    function getHtmlFromTab(description) {
        return new Promise((resolve, reject) => {
            chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
                if (!tabs[0]?.id) {
                    console.error('No active tab found!');
                    reject('No active tab found.');
                    return;
                }

                chrome.tabs.sendMessage(
                    tabs[0].id,
                    { action: 'getHtml', description },
                    response => {
                        if (chrome.runtime.lastError) {
                            console.error('Error:', chrome.runtime.lastError.message);
                            reject('Failed to extract HTML.');
                        } else {
                            resolve(response?.html || '');
                        }
                    }
                );
            });
        });
    }

    function getTabDetails() {
        return new Promise((resolve, reject) => {
            chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
                if (!tabs[0]?.id) {
                    console.error('No active tab found!');
                    reject('No active tab found.');
                    return;
                }

                chrome.scripting.executeScript(
                    {
                        target: { tabId: tabs[0].id },
                        func: () => {
                            const title = document.title || '';
                            const metaDescription =
                                document.querySelector('meta[name="description"]')?.content || '';
                            const metaKeywords =
                                document.querySelector('meta[name="keywords"]')?.content || '';
                            const url = window.location.href || '';

                            return {
                                title,
                                metaDescription,
                                metaKeywords,
                                url,
                            };
                        },
                    },
                    results => {
                        if (chrome.runtime.lastError) {
                            console.error('Error:', chrome.runtime.lastError.message);
                            reject('Failed to extract tab details.');
                        } else if (results && results[0]?.result) {
                            resolve(results[0].result);
                        } else {
                            reject('No details found on the page.');
                        }
                    }
                );
            });
        });
    }

    /**
     * Step 2: Call the AI API to generate structured JSON
     */
    async function callAIAPI(description, cleanHtml, siteDetails) {
        const token = localStorage.getItem('authToken');
        const apiUrl = `${API_BASE_URL}/api/ai/process`;

        const payload = {
            description,
            cleanHtml: cleanHtml,
            siteDetails,
        };

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            if (response.status === 401) {
                // Clear user data
                chrome.storage.local.clear();
                localStorage.clear();
                showLoginUI();
                return null;
            }

            const data = await response.json();

            if (!response.ok) {
                console.error('API Error:', data.error || 'Failed to process request');
                return null;
            }

            return data.content;
        } catch (error) {
            console.error('Error calling AI API:', error);
            return null;
        }
    }

    /**
     * Step 3: Parse AI API Response into JSON
     */
    function parseAIResponse(aiResponse) {
        try {
            const trimmedAiResponse = aiResponse.trim();
            const jsonMatch = trimmedAiResponse.match(/```json([\s\S]*?)```/);

            let parsedJson = null;
            let jsHandlers = null;

            if (jsonMatch) {
                try {
                    const jsonString = jsonMatch[1].trim();
                    parsedJson = JSON.parse(jsonString);
                } catch (error) {
                    console.error('Error parsing JSON:', error.message);
                }
            }

            if (parsedJson?.handlers) {
                jsHandlers = parsedJson?.handlers;
            }

            return { parsedJson, handlers: jsHandlers };
        } catch (error) {
            console.error('Error parsing AI response JSON:', error);
            return { parsedJson: null, handlers: null };
        }
    }

    /**
     * Sends instructions to the background script for processing.
     */
    async function sendInstructionsToBackground(parsedJson, handlers) {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage(
                {
                    action: 'applyChanges',
                    instructions: parsedJson?.instructions,
                    handlers,
                },
                response => {
                    if (chrome.runtime.lastError) {
                        console.error('Error:', chrome.runtime.lastError.message);
                        reject('Failed to communicate with the background script.');
                    } else if (response?.success) {
                        resolve();
                    } else {
                        reject(
                            response?.error || 'Failed to process request in background script.'
                        );
                    }
                }
            );
        });
    }

    // Toggle Dropdown
    function toggleDropdown() {
        const dropdown = document.getElementById('profileDropdown');
        if (dropdown) {
            dropdown.classList.toggle('show');
        }
    }

    // Logout Functionality
    function logout() {
        localStorage.clear();
        chrome.storage.local.clear();
        showLoginUI();
        contentScriptReady = false;
        connectionRetries = 0;
    }

    // Close the dropdown if the user clicks outside of it
    window.onclick = event => {
        if (!event.target.matches('.fa-user')) {
            const dropdowns = document.getElementsByClassName('dropdown-content');
            for (let i = 0; i < dropdowns.length; i++) {
                const openDropdown = dropdowns[i];
                if (openDropdown.classList.contains('show')) {
                    openDropdown.classList.remove('show');
                }
            }
        }
    };

    document.addEventListener('DOMContentLoaded', () => {
        const profileIcon = document.getElementById('profileIcon');
        const helpIcon = document.getElementById('helpIcon');
        const helpModal = document.getElementById('helpModal');
        const closeHelpModal = document.getElementById('closeHelpModal');

        if (profileIcon) {
            profileIcon.addEventListener('click', toggleDropdown);
        }

        if (helpIcon && helpModal && closeHelpModal) {
            helpIcon.addEventListener('click', () => {
                helpModal.style.display = 'block';
            });

            closeHelpModal.addEventListener('click', () => {
                helpModal.style.display = 'none';
            });

            window.onclick = event => {
                if (event.target === helpModal) {
                    helpModal.style.display = 'none';
                }
            };
        }

        // Initialize placeholder text animation
        initializePlaceholderAnimation();
    });

    document.addEventListener('DOMContentLoaded', () => {
        const token = localStorage.getItem('authToken');
        const textarea = document.getElementById('description');
        const placeholderTextElement = document.getElementById('placeholderText');

        if (!textarea || !placeholderTextElement) return;

        const prompts = [
            'Change the background color to blue.',
            'Make all text bold.',
            'Add a border to all images.',
            'Increase the font size of headings.',
            'Center align all paragraphs.',
        ];

        if (!token) {
            placeholderTextElement.style.display = 'none';
            return;
        }

        let currentPromptIndex = 0;
        let intervalId;

        function updatePlaceholder() {
            placeholderTextElement.classList.add('fade-out');

            setTimeout(() => {
                currentPromptIndex = (currentPromptIndex + 1) % prompts.length;
                placeholderTextElement.textContent = `Ex: ${prompts[currentPromptIndex]}`;
                placeholderTextElement.classList.remove('fade-out');
                placeholderTextElement.classList.add('fade-in');
            }, 500);

            setTimeout(() => {
                placeholderTextElement.classList.remove('fade-in');
            }, 1000);
        }

        function startAnimation() {
            if (textarea.value !== '') {
                return;
            }
            intervalId = setInterval(updatePlaceholder, 3000);
        }

        function stopAnimation() {
            placeholderTextElement.textContent = '';
            clearInterval(intervalId);
        }

        startAnimation();
        textarea.addEventListener('focus', stopAnimation);
        textarea.addEventListener('blur', startAnimation);
    });

    function initializePlaceholderAnimation() {
        const token = localStorage.getItem('authToken');
        const textarea = document.getElementById('description');
        const placeholderTextElement = document.getElementById('placeholderText');

        if (!textarea || !placeholderTextElement || !token) return;

        const prompts = [
            'Change the background color to blue.',
            'Make all text bold.',
            'Add a border to all images.',
            'Increase the font size of headings.',
            'Center align all paragraphs.',
        ];

        let currentPromptIndex = 0;
        let intervalId;

        function updatePlaceholder() {
            placeholderTextElement.classList.add('fade-out');

            setTimeout(() => {
                currentPromptIndex = (currentPromptIndex + 1) % prompts.length;
                placeholderTextElement.textContent = `Ex: ${prompts[currentPromptIndex]}`;
                placeholderTextElement.classList.remove('fade-out');
                placeholderTextElement.classList.add('fade-in');
            }, 500);

            setTimeout(() => {
                placeholderTextElement.classList.remove('fade-in');
            }, 1000);
        }

        function startAnimation() {
            if (textarea.value !== '') return;
            intervalId = setInterval(updatePlaceholder, 3000);
        }

        function stopAnimation() {
            placeholderTextElement.textContent = '';
            clearInterval(intervalId);
        }

        startAnimation();
        textarea.addEventListener('focus', stopAnimation);
        textarea.addEventListener('blur', startAnimation);
    }

    // Simple array of exact URLs we want to restrict
    const restrictedUrls = [
        'chrome://extensions',
        'chrome://newtab',
        'chrome.google.com/webstore',
        'accounts.google.com',
        'chrome://settings',
        'chrome://downloads',
        'chrome://bookmarks',
        'chrome://history',
        'chrome://flags',
        'chrome://version',
        'chrome://apps',
        'chrome://extensions/shortcuts',
        'https://chromewebstore.google.com',
    ];

    const handleSiteRestrictions = () => {
        chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
            if (!tabs[0]) return;

            const currentUrl = tabs[0].url;

            if (restrictedUrls.some(url => currentUrl.includes(url))) {
                const descriptionEl = document.getElementById('description');
                const applyChangesEl = document.getElementById('applyChanges');
                const statusEl = document.getElementById('status');
                const placeholderEl = document.getElementById('placeholderText');

                if (descriptionEl) descriptionEl.style.display = 'none';
                if (applyChangesEl) applyChangesEl.style.display = 'none';
                if (placeholderEl) placeholderEl.style.display = 'none';

                if (statusEl) {
                    statusEl.innerHTML =
                        '⚠️ Sorry! Inspector Saab cannot make changes to this page due to browser security restrictions.';
                    statusEl.style.color = '#856404';
                    statusEl.style.backgroundColor = '#fff3cd';
                    statusEl.style.padding = '10px';
                    statusEl.style.margin = '10px';
                    statusEl.style.borderRadius = '8px';
                    statusEl.style.border = '2px solid #ffeeba';
                }
            }
        });
    };

    // Make functions available globally for HTML onclick handlers
    window.toggleDropdown = toggleDropdown;
    window.logout = logout;
}

let connectionRetries = 0;
const maxRetries = 3;
let contentScriptReady = false;
const statusMessage = document.getElementById('statusMessage');
const showAppUI = () => {
    /* Implementation here */
};
const showLoginUI = () => {
    /* Implementation here */
};
const applyChangesButton = document.getElementById('applyChangesButton');
const getHtmlFromTab = async description => {
    /* Implementation here */
};
const getTabDetails = async () => {
    /* Implementation here */
};
const callAIAPI = async (description, cleanHtml, siteDetails) => {
    /* Implementation here */
};
const parseAIResponse = aiResponse => {
    /* Implementation here */
};
const sendInstructionsToBackground = async (parsedJson, handlers) => {
    /* Implementation here */
};
const sendMessageToContentScript = async (message, timeout) => {
    /* Implementation here */
};

// Add these functions to your existing popup.js main() function:

// Enhanced connection test with fallback injection
async function testConnectionWithFallback() {
    console.log(
        `🔍 Testing connection with fallback (attempt ${connectionRetries + 1}/${maxRetries})...`
    );

    try {
        // First, check if content script is loaded via background
        const bgResponse = await new Promise(resolve => {
            chrome.runtime.sendMessage({ action: 'checkContentScript' }, resolve);
        });

        if (bgResponse.loaded) {
            console.log('✅ Content script detected via background check');
            contentScriptReady = true;
            return true;
        }

        console.log('⚠️ Content script not detected, attempting manual injection...');

        // Try to inject content script manually
        const injectResponse = await new Promise(resolve => {
            chrome.runtime.sendMessage({ action: 'injectContentScript' }, resolve);
        });

        if (injectResponse.success) {
            console.log('✅ Content script injected successfully');

            // Wait a bit for initialization
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Test connection again
            const response = await sendMessageToContentScript({ action: 'ping' }, 3000);

            if (response && response.success) {
                contentScriptReady = true;
                console.log('✅ Content script connection successful after injection');
                return true;
            }
        }

        throw new Error('Content script injection failed');
    } catch (error) {
        console.warn(
            `⚠️ Connection test with fallback failed (${connectionRetries + 1}/${maxRetries}):`,
            error.message
        );

        connectionRetries++;

        if (connectionRetries < maxRetries) {
            const delay = Math.min(1000 * Math.pow(2, connectionRetries), 5000);
            console.log(`🔄 Retrying connection in ${delay}ms...`);
            setTimeout(testConnectionWithFallback, delay);
        } else {
            console.error(
                '❌ Max connection retries reached. Content script may not be compatible with this page.'
            );
            contentScriptReady = false;

            if (statusMessage) {
                statusMessage.innerHTML = `
          ⚠️ Extension not fully loaded. Try:<br>
          • Refresh the page<br>
          • Check if site allows extensions<br>
          • Try a different website
        `;
                statusMessage.style.color = '#856404';
                statusMessage.style.backgroundColor = '#fff3cd';
                statusMessage.style.padding = '8px';
                statusMessage.style.borderRadius = '4px';
                statusMessage.style.fontSize = '12px';
            }
        }

        return false;
    }
}

// Enhanced page compatibility check
function checkPageCompatibility() {
    return new Promise(resolve => {
        chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
            if (!tabs[0]) {
                resolve({ compatible: false, reason: 'No active tab' });
                return;
            }

            const url = tabs[0].url;
            const title = tabs[0].title;

            // Check for problematic pages
            const incompatiblePatterns = [
                /^chrome:\/\//,
                /^chrome-extension:\/\//,
                /^moz-extension:\/\//,
                /^about:/,
                /^file:\/\//,
                /chrome\.google\.com\/webstore/,
                /accounts\.google\.com/,
                /login\./,
                /auth\./,
            ];

            const isIncompatible = incompatiblePatterns.some(pattern => pattern.test(url));

            if (isIncompatible) {
                resolve({
                    compatible: false,
                    reason: 'Browser security restrictions',
                    url: url,
                });
            } else {
                resolve({ compatible: true, url: url });
            }
        });
    });
}

// Add this to your window.onload function (replace the existing testConnection call):
window.onload = async () => {
    const token = localStorage.getItem('authToken');

    if (token) {
        showAppUI();
    } else {
        showLoginUI();
    }

    // Check page compatibility first
    const compatibility = await checkPageCompatibility();

    if (!compatibility.compatible) {
        console.log('⚠️ Page not compatible:', compatibility.reason);

        if (statusMessage) {
            statusMessage.innerHTML = `⚠️ Cannot run on this page: ${compatibility.reason}`;
            statusMessage.style.color = '#856404';
            statusMessage.style.backgroundColor = '#fff3cd';
            statusMessage.style.padding = '8px';
            statusMessage.style.borderRadius = '4px';
        }

        return;
    }

    // Test connection with enhanced fallback
    setTimeout(testConnectionWithFallback, 1000);
};

// Enhanced sendMessageToContentScript with retry logic
async function sendMessageToContentScriptWithRetry(message, maxRetries = 3, timeout = 5000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`📤 Sending message (attempt ${attempt}/${maxRetries}):`, message.action);

            const response = await sendMessageToContentScript(message, timeout);
            console.log(`✅ Message sent successfully:`, response);
            return response;
        } catch (error) {
            console.warn(`⚠️ Message failed (attempt ${attempt}/${maxRetries}):`, error.message);

            if (attempt === maxRetries) {
                throw error;
            }

            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));

            // Try to re-establish connection
            if (!contentScriptReady) {
                console.log('🔄 Attempting to re-establish connection...');
                await testConnectionWithFallback();
            }
        }
    }
}

// Add this debug function to help troubleshoot
function debugExtensionState() {
    console.log('🔍 Extension Debug Info:');
    console.log('- Content Script Ready:', contentScriptReady);
    console.log('- Connection Retries:', connectionRetries);
    console.log('- Auth Token:', !!localStorage.getItem('authToken'));

    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        if (tabs[0]) {
            console.log('- Current URL:', tabs[0].url);
            console.log('- Page Title:', tabs[0].title);
        }
    });
}

// Add this to your existing applyChangesButton event listener (replace the existing sendMessageToContentScript calls):
// Replace all sendMessageToContentScript calls with sendMessageToContentScriptWithRetry

// Example for the apply changes button:
if (applyChangesButton) {
    applyChangesButton.addEventListener('click', async () => {
        const description = document.getElementById('description')?.value;
        const status = document.getElementById('status');

        if (status) status.textContent = 'Processing...';

        if (!description) {
            if (status) status.textContent = 'Please enter a description!';
            return;
        }

        // Debug current state
        debugExtensionState();

        // Check if content script is ready
        if (!contentScriptReady) {
            console.log('⚠��� Content script not ready, testing connection...');
            const isReady = await testConnectionWithFallback();
            if (!isReady) {
                if (status) {
                    status.innerHTML = `
            ❌ Extension not ready. Try:<br>
            • Refresh the page<br>
            • Check browser console for errors<br>
            • Try a different website
          `;
                    status.style.color = '#dc3545';
                    status.style.fontSize = '12px';
                }
                return;
            }
        }

        try {
            await sendMessageToContentScriptWithRetry({
                action: 'startOverlay',
                message: 'Starting process...',
            });

            let cleanHtml = null;
            let currentUrl = null;

            currentUrl = await new Promise(resolve => {
                chrome.storage.local.get(['currentUrl'], result => {
                    resolve(result.currentUrl);
                });
            });

            if (window.location.href !== currentUrl) {
                cleanHtml = await getHtmlFromTab(description);

                if (!cleanHtml) {
                    if (status) status.textContent = 'No HTML found.';
                    return;
                }
            }

            const siteDetails = await getTabDetails();

            await sendMessageToContentScriptWithRetry({
                action: 'updateOverlay',
                message: 'Loading magic... one pixel at a time ✨',
            });

            const aiResponse = await callAIAPI(description, cleanHtml, siteDetails);

            if (!aiResponse) {
                if (status) status.textContent = 'No response from AI.';
                await sendMessageToContentScriptWithRetry({
                    action: 'updateOverlay',
                    message: 'AI API call failed.',
                });
                return;
            }

            await sendMessageToContentScriptWithRetry({
                action: 'updateOverlay',
                message: 'Processing AI response...',
            });
            const { parsedJson, handlers } = parseAIResponse(aiResponse);

            if (!parsedJson) {
                if (status) status.textContent = 'Failed to process AI response.';
                return;
            }

            await sendInstructionsToBackground(parsedJson, handlers);
            if (status) status.textContent = parsedJson.message || 'Changes applied!';
        } catch (error) {
            console.error('Error:', error);
            if (status) {
                status.innerHTML = `
          ❌ Error: ${error.message}<br>
          <small>Check console for details</small>
        `;
                status.style.color = '#dc3545';
                status.style.fontSize = '12px';
            }
        } finally {
            try {
                await sendMessageToContentScriptWithRetry({ action: 'endOverlay' });
            } catch (error) {
                console.log('ℹ️ Could not end overlay:', error.message);
            }
        }
    });
}

// Make debug function available globally
window.debugExtensionState = debugExtensionState;
