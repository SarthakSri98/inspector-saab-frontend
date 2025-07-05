if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', main);
} else {
    main();
}

function main() {
    const API_BASE_URL = 'https://inspectorsaab.onrender.com';

    // DOM Elements
    const loginButton = document.getElementById('loginButton');
    const applyChangesButton = document.getElementById('applyChanges');
    const descriptionArea = document.getElementById('description');
    const statusMessage = document.getElementById('status');
    const iconBar = document.getElementsByClassName('icon-bar')[0];
    const crossIcon = document.getElementsByClassName('cross-icon')[0];    

    crossIcon.addEventListener("click",  () => {
        const description = document.getElementById("description");
        description.value='';
    })

    // Check if User is Logged In
    window.onload = () => {
        const token = localStorage.getItem('authToken');

        if (token) {
            showAppUI();

        } else {
            showLoginUI();
        }
    };

    function showLoginUI() {
        loginButton.style.display = 'block';
        applyChangesButton.style.display = 'none';
        descriptionArea.style.display = 'none';
        crossIcon.style.display = 'none';
        statusMessage.textContent = "Please log in to continue.";
        iconBar.style.display = 'none';
    }

    function showAppUI() {
        loginButton.style.display = 'none';
        applyChangesButton.style.display = 'block';
        descriptionArea.style.display = 'block';
        statusMessage.textContent = "Welcome! My friend.";
        iconBar.style.display = '';
        // Fetch user info from localStorage
        const profilePicUrl = localStorage.getItem('profilePic');
        const userName = localStorage.getItem('userName');
        const credits = localStorage.getItem('credits') || '0';

        // Display user info in the dropdown
        const profilePic = document.getElementById('profilePic');
        const userNameElement = document.getElementById('userName');
        const userCreditsElement = document.getElementById('userCredits');

        if (profilePicUrl) {
            profilePic.src = profilePicUrl;
        }
        if (userName) {
            userNameElement.textContent = userName;
        }
        userCreditsElement.textContent = credits;

        handleSiteRestrictions();
    }

    // Handle Google Login
    loginButton.addEventListener('click', () => {
        const authWindow = window.open(
            `${API_BASE_URL}/api/auth/google`,
            'Google Login',
            'width=500,height=600'
        );

        window.addEventListener('message', (event) => {
            if (event.origin !== API_BASE_URL) return;

            const { token, profilePic, name, currentUrl, credits } = event.data;
            if (token) {
                chrome.storage.local.set({ authToken: token }, () => {
                    // Auth token saved to chrome storage
                });

                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    chrome.tabs.sendMessage(tabs[0].id, { action: "userLoggedIn" });
                });

                localStorage.setItem('profilePic', profilePic);
                localStorage.setItem('authToken', token);
                localStorage.setItem('userName', name);
                localStorage.setItem('currentUrl', currentUrl);
                localStorage.setItem('credits', credits || '0');

                chrome.storage.local.set({ currentUrl: currentUrl }, () => {
                    // Current URL saved to chrome.storage
                });

                showAppUI();
                // Send a message to the authWindow to close itself
                authWindow.postMessage({ action: 'close' }, API_BASE_URL);
            }
        });
    });

    // In the opened window (authWindow), listen for the message to close itself
    window.addEventListener('message', (event) => {
        if (event.origin !== API_BASE_URL) return;

        if (event.data.action === 'close') {
            window.close();
        }
    });

    // Establish a connection to the background script
    const port = chrome.runtime.connect();

    // Send the tabId and windowId to the background script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length > 0) {
            const activeTab = tabs[0];
            port.postMessage({ tabId: activeTab.id, windowId: activeTab.windowId, activeTab });
        } else {
            console.warn("No active tab found.");
        }
    });

    const jsSnippets = {
        addBackToTopButton: 'An arrow key slightly at the bottom right to go back to the top when clicked',
        addDarkMode: 'A dark mode button at the top right to toggle dark mode when clicked',
        addReadingProgressBar: 'A progress bar at the top which increases as we scroll to the bottom',
        highlightContent: 'A method to highlight content on the site as per json returned'
    }

    // Triggered when the "Apply Changes" button is clicked
    applyChangesButton.addEventListener("click", async () => {
        const description = document.getElementById("description").value;
        const status = document.getElementById("status");
        status.textContent = "Processing...";

        if (!description) {
            status.textContent = "Please enter a description!";
            return;
        }

        try {
            await sendMessageToContentScript({ action: "startOverlay", message: "Starting process..." });
            let cleanHtml = null;
            let currentUrl = null;

            currentUrl = await new Promise((resolve) => {
                chrome.storage.local.get(['currentUrl'], (result) => {
                    resolve(result.currentUrl);
                });
            });

            if (window.location.href !== currentUrl) {
                cleanHtml = await getHtmlFromTab(description);

                if (!cleanHtml) {
                    status.textContent = "No HTML found.";
                    return;
                }
            }

            // Step 2: Get the HTML content from the active tab

            const siteDetails = await getTabDetails();

            // Step 3: Call the AI API with the description and clean HTML
            await sendMessageToContentScript({ action: "updateOverlay", message: "Loading magic... one pixel at a time ✨" });
            const aiResponse = await callAIAPI(description, cleanHtml, siteDetails);

            if (!aiResponse) {
                status.textContent = "No response from AI.";
                await sendMessageToContentScript({ action: "updateOverlay", message: "AI API call failed." });
                return;
            }

            // Step 4: Parse the AI response and send instructions to the content script
            await sendMessageToContentScript({ action: "updateOverlay", message: "Processing AI response..." });
            const { parsedJson, handlers } = parseAIResponse(aiResponse);

            if (!parsedJson) {
                status.textContent = "Failed to process AI response.";
                return;
            }

            // Step 5: Apply the instructions to the active tab
            // Overlay updated, sending instructions next
            await sendInstructionsToBackground(parsedJson, handlers);
            // Instructions sent successfully
            status.textContent = parsedJson.message || "Changes applied!";
            // Status updated
        } catch (error) {
            console.error("Error:", error);
            status.textContent = "Something went wrong. Please try again.";
        } finally {
            // In finally block
            await sendMessageToContentScript({ action: "endOverlay" });
            // Overlay ended
        }
    });

    /**
     * Sends a message to the content script of the active tab.
     *
     * @param {Object} message - Message to send to content script.
     * @returns {Promise<any>} Response from the content script.
     *
     * @example
     * await sendMessageToContentScript({ action: "highlight", data: {...} });
     */
    async function sendMessageToContentScript(message) {
        return new Promise((resolve, reject) => {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (!tabs[0]?.id) {
                    console.error("No active tab found!");
                    reject("No active tab found.");
                    return;
                }

                chrome.tabs.sendMessage(tabs[0].id, message, (response) => {
                    if (chrome.runtime.lastError) {
                        console.error("Error:", chrome.runtime.lastError.message);
                        reject("Failed to send message to content script.");
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
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (!tabs[0]?.id) {
                    console.error("No active tab found!");
                    reject("No active tab found.");
                    return;
                }

                chrome.tabs.sendMessage(tabs[0].id, { action: "getHtml", description }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.error("Error:", chrome.runtime.lastError.message);
                        reject("Failed to extract HTML.");
                    } else {
                        resolve(response?.html || "");
                    }
                });
            });
        });
    }

    function getTabDetails() {
        return new Promise((resolve, reject) => {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (!tabs[0]?.id) {
                    console.error("No active tab found!");
                    reject("No active tab found.");
                    return;
                }

                chrome.scripting.executeScript(
                    {
                        target: { tabId: tabs[0].id },
                        func: () => {
                            const title = document.title || "";
                            const metaDescription = document.querySelector('meta[name="description"]')?.content || "";
                            const metaKeywords = document.querySelector('meta[name="keywords"]')?.content || "";
                            const url = window.location.href || "";

                            return {
                                title,
                                metaDescription,
                                metaKeywords,
                                url,
                            };
                        },
                    },
                    (results) => {
                        if (chrome.runtime.lastError) {
                            console.error("Error:", chrome.runtime.lastError.message);
                            reject("Failed to extract tab details.");
                        } else if (results && results[0]?.result) {
                            resolve(results[0].result);
                        } else {
                            reject("No details found on the page.");
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
        const token = localStorage.getItem('authToken'); // Get auth token from local storage

        const apiUrl = `${API_BASE_URL}/api/ai/process`;

        const payload = {
            description,
            cleanHtml: cleanHtml,
            siteDetails,
        };

        try {
            // Log the size of the payload
            const payloadSize = JSON.stringify(payload).length / (1024 * 1024);

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    credentials: true
                },
                body: JSON.stringify(payload)
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
                console.error("API Error:", data.error || "Failed to process request");
                return null;
            }

            return data.content;

        } catch (error) {
            console.error("Error calling AI API:", error);
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
                    const jsonString = jsonMatch[1].trim(); // Get JSON content
                    parsedJson = JSON.parse(jsonString);   // Parse JSON string
                } catch (error) {
                    console.error("Error parsing JSON:", error.message);
                }
            }

            if (parsedJson?.handlers) {
                jsHandlers = parsedJson?.handlers // Extract JS code as plain text
            }

            return { parsedJson, handlers: jsHandlers }
        } catch (error) {
            console.error("Error parsing AI response JSON:", error);
            return null;
        }
    }

    /**
     * Sends instructions to the background script for processing.
     *
     * @param {Object} parsedJson - Parsed JSON containing instructions.
     * @param {Object} handlers - Map of handler functions.
     * @returns {Promise<void>}
     *
     * @example
     * await sendInstructionsToBackground({ instructions: [...] }, { highlight: fn });
     */
    async function sendInstructionsToBackground(parsedJson, handlers) {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage(
                {
                    action: "applyChanges",
                    instructions: parsedJson?.instructions,
                    handlers
                },
                (response) => {
                    if (chrome.runtime.lastError) {
                        console.error("Error:", chrome.runtime.lastError.message);
                        reject("Failed to communicate with the background script.");
                    } else if (response?.success) {
                        resolve();
                    } else {
                        reject(response?.error || "Failed to process request in background script.");
                    }
                }
            );
        });
    }

    // Toggle Dropdown
    function toggleDropdown() {
        const dropdown = document.getElementById("profileDropdown");
        dropdown.classList.toggle("show");
    }

    // Logout Functionality
    function logout() {
        localStorage.removeItem('authToken');
        showLoginUI();
    }

    // Close the dropdown if the user clicks outside of it
    window.onclick = function (event) {
        if (!event.target.matches('.fa-user')) {
            var dropdowns = document.getElementsByClassName("dropdown-content");
            for (var i = 0; i < dropdowns.length; i++) {
                var openDropdown = dropdowns[i];
                if (openDropdown.classList.contains('show')) {
                    openDropdown.classList.remove('show');
                }
            }
        }
    }

    document.addEventListener('DOMContentLoaded', function () {
        const profileIcon = document.getElementById('profileIcon');
        const helpIcon = document.getElementById('helpIcon');
        const helpModal = document.getElementById('helpModal');
        const closeHelpModal = document.getElementById('closeHelpModal');

        profileIcon.addEventListener('click', toggleDropdown);
        helpIcon.addEventListener('click', function () {
            helpModal.style.display = "block";
        });

        closeHelpModal.addEventListener('click', function () {
            helpModal.style.display = "none";
        });

        window.onclick = function (event) {
            if (event.target == helpModal) {
                helpModal.style.display = "none";
            }
        };
    });

    document.addEventListener('DOMContentLoaded', function () {
        const token = localStorage.getItem('authToken');


        const textarea = document.getElementById('description');
        const placeholderTextElement = document.getElementById('placeholderText');
        const prompts = [
            "Change the background color to blue.",
            "Make all text bold.",
            "Add a border to all images.",
            "Increase the font size of headings.",
            "Center align all paragraphs."
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
            }, 500); // Match the duration of the fade-out animation

            setTimeout(() => {
                placeholderTextElement.classList.remove('fade-in');
            }, 1000); // Remove fade-in class after animation
        }

        function startAnimation() {
            if (textarea.value !== '') {
                return;
            }

            intervalId = setInterval(updatePlaceholder, 3000); // Change every 3 seconds
        }

        function stopAnimation() {
            placeholderTextElement.textContent = '';
            clearInterval(intervalId);
        }

        // Start the animation loop
        startAnimation();

        // Stop animation on focus and restart on blur
        textarea.addEventListener('focus', stopAnimation);
        textarea.addEventListener('blur', startAnimation);
    });

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
        'chrome.google.com/webstore/devconsole',
        'https://chromewebstore.google.com'
    ];

    const handleSiteRestrictions = () => {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            const currentUrl = tabs[0].url;
            // Check if current URL is in our restricted list
            if (restrictedUrls.some(url => currentUrl.includes(url))) {
                // Hide the textarea and button
                document.getElementById('description').style.display = 'none';
                document.getElementById('applyChanges').style.display = 'none';

                // Show restriction message
                document.getElementById('status').innerHTML =
                    '⚠️ Sorry! Inspector Saab cannot make changes to this page due to browser security restrictions.';
                document.getElementById('status').style.color = '#856404';
                document.getElementById('status').style.backgroundColor = '#fff3cd';
                document.getElementById('status').style.padding = '10px';
                document.getElementById('status').style.margin = '10px';
                document.getElementById('status').style.borderRadius = '8px';
                document.getElementById('status').style.border = '2px solid #ffeeba';
                document.getElementById('placeholderText').style.display = 'none';
            }
        });
    }
}