const API_BASE_URL = 'https://inspectorsaab.onrender.com';

/**
 * Adds a reading progress bar to the page that updates based on scroll position.
 *
 * @param {string} selector - CSS selector for the progress bar element.
 * @returns {void}
 *
 * @example
 * addReadingProgressBarFn('.progress-bar');
 */
function addReadingProgressBarFn(selector) {
    const progressBar = document.querySelector(selector);
    if (!progressBar) return;

    const docHeight = document.documentElement.scrollHeight;
    const winHeight = window.innerHeight;
    const scrollTop = window.pageYOffset;
    const trackLength = docHeight - winHeight;
    const percentScrolled = (scrollTop / trackLength) * 100;

    progressBar.style.width = percentScrolled + '%';
}

/**
 * Adds a "Back to Top" button that smoothly scrolls to the top of the page.
 *
 * @param {string} selector - CSS selector for the button element.
 * @returns {void}
 *
 * @example
 * addBackToTopButtonFn('#back-to-top');
 */
function addBackToTopButtonFn(selector) {
    const button = document.querySelector(selector);
    if (!button) return;

    button.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
    document.body.appendChild(button);
}

/**
 * Adds a dark mode toggle functionality to a button element.
 * Creates a style element that inverts page colors while preserving media elements.
 *
 * @param {string} selector - CSS selector for the dark mode toggle button.
 * @returns {void}
 *
 * @example
 * addDarkModeFn('#dark-mode-toggle');
 */
function addDarkModeFn(selector) {
    // Find the button using the provided selector
    const button = document.querySelector(selector);
    // Handle case where button is not found
    if (!button) {
        console.error("Dark mode toggle button not found. Selector used:", selector);
        return;
    }

    // Attach click event listener to the button
    button.onclick = () => {
        const existingStyle = document.querySelector('#nightify');
        if (existingStyle) {
            // Remove the existing dark mode style
            existingStyle.parentNode.removeChild(existingStyle);
            // Dark mode disabled

            return;
        }

        // Create and append the dark mode style
        const head = document.getElementsByTagName('head')[0];
        const style = document.createElement('style');
        style.setAttribute('type', 'text/css');
        style.setAttribute('id', 'nightify');
        style.appendChild(
            document.createTextNode(`
            html {
                -webkit-filter: invert(100%) hue-rotate(180deg) contrast(70%) !important;
                background: #fff;
            }
                
                /* Exclude media elements from inversion */
            img, video, canvas, picture, [role="img"], svg, embed, object {
                -webkit-filter: invert(100%) hue-rotate(180deg) contrast(100%) !important;
            }
    
                /* Exclude elements with background images */
                [style*="background"], [class*="background"], [id*="background"] {
                    background-image: none !important;
                    background-color: transparent !important;
                }
    
                /* Additional exclusions for common frameworks and patterns */
                figure, figcaption, .media, .photo, .thumbnail, .icon {
                    -webkit-filter: none !important;
                    filter: none !important;
                }
    
                /* Reset for dynamic inline styles */
                [style*="-webkit-filter"], [style*="filter"] {
                    -webkit-filter: none !important;
                    filter: none !important;
                }
    
                .line-content {
                    background-color: #fefefe;
                }
            `)
        );
        head.appendChild(style);

        document.querySelectorAll('*').forEach((element) => {
            const computedStyle = window.getComputedStyle(element);

            // Check if the element has a background image
            if (computedStyle.backgroundImage && computedStyle.backgroundImage !== 'none') {
                // Add a class to exclude this element from filters
                element.style.filter = 'invert(100%) hue-rotate(180deg) contrast(100%) !important';
                // Excluding filters for element with background image
            }
        });

        // Dark mode enabled

        return;
    };
}


// Check if variables are already defined to prevent redeclaration
if (typeof processedInstructions === 'undefined') {
    var processedInstructions = 0;
}

if (typeof lastTotalInstructions === 'undefined') {
    var lastTotalInstructions = 0;
}

if (typeof modificationsQueue === 'undefined') {
    var modificationsQueue = []; // Stores highlights before applying
}

if (typeof dynamicClasses === 'undefined') {
    var dynamicClasses = new Set(); // Stores all AI-generated class names
}

if (typeof handlersMap === 'undefined') {
    var handlersMap = {
        addReadingProgressBar: addReadingProgressBarFn,
        addBackToTopButton: addBackToTopButtonFn,
        addDarkMode: addDarkModeFn,
        highlightContent: highlightTextFromJson
    };
}

/**
 * Processes and applies text highlighting based on provided content update instructions.
 *
 * @param {Object} contentUpdate - Object containing highlighting instructions.
 * @param {string} contentUpdate.phrase - The text to highlight.
 * @param {string} contentUpdate.parentSelector - CSS selector for parent element containing text.
 * @param {string} contentUpdate.className - CSS class name to apply to highlight.
 * @param {number} totalInstructions - Total number of highlight instructions to process.
 * @returns {void}
 *
 * @example
 * highlightTextFromJson({
 *   phrase: "important text",
 *   parentSelector: ".content",
 *   className: "highlight-yellow"
 * }, 1);
 */
function highlightTextFromJson(contentUpdate, totalInstructions) {
    // 🔍 Processing highlight
    if (!contentUpdate || !contentUpdate.phrase || !contentUpdate.parentSelector || !contentUpdate.className) {
        console.warn("Skipping invalid instruction:", contentUpdate);
        return;
    }

    dynamicClasses.add(contentUpdate?.className);

    lastTotalInstructions = totalInstructions;

    const parentElements = document.querySelectorAll(contentUpdate.parentSelector);
    if (parentElements.length === 0) {
        console.warn(`No parent elements found for selector: ${contentUpdate.parentSelector}`);
        return;
    }

    parentElements.forEach(parentElement => {
        const textNodes = getTextNodes(parentElement);
        textNodes.forEach(node => {
            let matchIndex = node.nodeValue.toLowerCase().indexOf(contentUpdate.phrase.toLowerCase());

            if (matchIndex !== -1 && matchIndex < node.nodeValue.length) {
                modificationsQueue.push({ node, matchIndex, phrase: contentUpdate.phrase, className: contentUpdate.className });
            }
        });
    });

    processedInstructions++;

    if (processedInstructions === totalInstructions) {
        // ✅ All instructions processed. Applying highlights...
        applyAllModifications();
        injectHighlightStyles();
        processedInstructions = 0;
    }
}

/**
 * Retrieves all text nodes from a parent element that contain non-empty text.
 *
 * @param {HTMLElement} parent - The parent element to search within.
 * @returns {Node[]} Array of text nodes found within the parent element.
 *
 * @example
 * const textNodes = getTextNodes(document.querySelector('.content'));
 */
function getTextNodes(parent) {
    const nodes = [];
    const walker = document.createTreeWalker(parent, NodeFilter.SHOW_TEXT, {
        acceptNode: node => node.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
    });

    while (walker.nextNode()) {
        nodes.push(walker.currentNode);
    }
    return nodes;
}

/**
 * Applies all queued text highlighting modifications using Range API.
 * Falls back to innerHTML replacement if Range API fails.
 *
 * @returns {void}
 */
function applyAllModifications() {
    modificationsQueue.forEach(({ node, matchIndex, phrase, className }) => {
        if (matchIndex >= node.nodeValue.length) {
            console.error("⚠️ Skipping modification due to out-of-bounds index", matchIndex, node.nodeValue);
            return; // Skip invalid modification
        }

        const range = document.createRange();
        range.setStart(node, matchIndex);
        range.setEnd(node, Math.min(matchIndex + phrase.length, node.nodeValue.length));

        const highlightSpan = document.createElement("span");
        highlightSpan.className = className;
        highlightSpan.textContent = phrase;

        try {
            range.surroundContents(highlightSpan);
        } catch (error) {
            console.error("⚠️ `surroundContents` failed, applying fallback method:", error);
            node.parentNode.innerHTML = node.parentNode.innerHTML.replace(
                new RegExp(`(${phrase})`, "gi"),
                `<span class="${className}">$1</span>`
            );
        }
    });

    modificationsQueue = []; // Clear queue after applying
}

/**
 * Injects CSS styles for all dynamically created highlight classes.
 * Creates or updates a style element in the document head.
 *
 * @returns {void}
 */
function injectHighlightStyles() {
    let styleElement = document.getElementById("highlight-style");

    if (!styleElement) {
        styleElement = document.createElement("style");
        styleElement.id = "highlight-style";
        document.head.appendChild(styleElement);
    }

    let styles = "";

    // Add styles for all dynamically detected classes
    dynamicClasses.forEach(className => {
        styles += `
            .${className} {
                background-color: yellow !important;
                color: black !important;
                font-weight: bold;
                padding: 0.2em 0.4em;
                border-radius: 4px;
            }
        `;
    });

    styleElement.textContent = styles;
}

/**
 * Initializes the loading overlay element in the DOM.
 * Creates the overlay if it doesn't exist and sets up its initial state.
 *
 * @returns {void}
 */
function initializeOverlay() {
    // Ensure the DOM is ready before adding elements
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initializeOverlay);
        return;
    }

    if (document.getElementById('custom-blocking-overlay')) return; // Prevent duplicates

    // Create overlay (hidden by default)
    const overlay = document.createElement('div');
    overlay.id = 'custom-blocking-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
    overlay.style.display = 'none'; // Initially hidden
    overlay.style.justifyContent = 'center'; // Center horizontally
    overlay.style.alignItems = 'center'; // Center vertically
    overlay.style.zIndex = '999999';
    overlay.style.pointerEvents = 'all'; // Blocks interaction

    // Create message box
    const messageBox = document.createElement('div');
    messageBox.id = 'custom-message-box';
    messageBox.style.color = '#fff';
    messageBox.style.padding = '20px';
    messageBox.style.borderRadius = '8px';
    messageBox.style.boxShadow = '0 4px 10px rgba(0, 0, 0, 0.2)';
    messageBox.style.fontSize = '18px';
    messageBox.style.textAlign = 'center';
    messageBox.style.minWidth = '300px';

    // Create loading spinner
    const loader = document.createElement('div');
    loader.id = 'custom-loader';
    loader.style.border = '4px solid #f3f3f3';
    loader.style.borderTop = '4px solid #007BFF';
    loader.style.borderRadius = '50%';
    loader.style.width = '40px';
    loader.style.height = '40px';
    loader.style.animation = 'spin 1s linear infinite';
    loader.style.margin = '0 auto 15px auto';

    // Message text placeholder
    const message = document.createElement('p');
    message.id = 'custom-overlay-message';
    message.innerText = 'Processing... Please wait.';

    // Add elements
    messageBox.appendChild(loader);
    messageBox.appendChild(message);
    overlay.appendChild(messageBox);
    document.body.appendChild(overlay);

    // Add CSS animation (once)
    const styleTag = document.createElement('style');
    styleTag.innerHTML = `
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(styleTag);
}

// Ensure overlay initializes after DOM is ready
if (document.readyState === "complete") {
    initializeOverlay();
} else {
    window.addEventListener("load", initializeOverlay);
}


/**
 * Shows the blocking overlay with a custom message.
 *
 * @param {string} [messageText="Processing... Please wait."] - Message to display in overlay.
 * @returns {void}
 *
 * @example
 * startBlockingOverlay("Analyzing page content...");
 */
function startBlockingOverlay(messageText = "Processing... Please wait.") {
    const overlay = document.getElementById('custom-blocking-overlay');
    const message = document.getElementById('custom-overlay-message');

    if (overlay && message) {
        message.innerText = messageText;
        overlay.style.display = 'flex'; // Show overlay
        document.body.style.overflow = 'hidden'; // Disable scrolling
    }
}

/**
 * Hides the blocking overlay.
 *
 * @returns {void}
 */
function endBlockingOverlay() {
    const overlay = document.getElementById('custom-blocking-overlay');
    if (overlay) {
        overlay.style.display = 'none'; // Hide overlay
        document.body.style.overflow = ''; // Restore scrolling
    }
}


/**
 * Executes a set of DOM manipulation instructions received from the extension.
 *
 * @param {Object} message - Message object containing instructions.
 * @param {Object[]} message.instructions - Array of DOM manipulation instructions.
 * @param {Object} message.handlers - Map of handler functions for different operations.
 * @returns {Promise<void>}
 *
 * @example
 * executeInstructions({
 *   instructions: [{type: 'highlight', data: {...}}],
 *   handlers: {highlight: fn}
 * });
 */
async function executeInstructions(message) {
    const { instructions, currentHandler } = message;
    const { handlerName, trigger, context, selector: handlerSelector } = currentHandler || {};

    startBlockingOverlay("Processing... Please wait.");

    if (!Array.isArray(instructions)) {
        console.error("Invalid instructions: Not an array");
        return;
    }

    for (const instruction of instructions) {
        try {
            const { action, selector, contentUpdate, ...props } = instruction;

            if (contentUpdate) {
                try {
                    highlightTextFromJson(contentUpdate, instructions?.length || 0);
                } catch (error) {
                    console.error("❌ Debug: An error occurred", error);
                }

                continue;
            }

            const elements = await waitForElements(selector);
            if (elements.length === 0) continue;

            switch (action) {
                case "createElement":
                    await handleCreateElement(elements[0], props.html || props.text, props.styles, props.attributes);
                    break;
                case "updateStyle":
                    await handleUpdateStyle(elements, props.styles);
                    break;
                case "addEventListener":
                    await handleAddEventListener(elements[0], props.event, props.handler, handlerSelector);
                    break;
                case "setText":
                case "setHtml":
                    setTextContent(elements, props.text);
                    break;
                case "removeElement":
                    removeElements(elements);
                    break;
                case "setAttribute":
                    setAttributes(elements, props.attributes);
                    break;
                case "addClass":
                    addClasses(elements, props.className);
                    break;
                case "removeClass":
                    removeClasses(elements, props.className);
                    break;
                case "toggleVisibility":
                    toggleVisibility(elements, props.visible);
                    break;
                default:
                    console.warn(`Unknown action: ${action}`);
            }
        } catch (error) {
            console.error(`Error executing instruction:`, error);
        }
    }

    // Then handle any event handlers
    if (handlerName) {
        try {
            const handlerFunction = handlersMap[handlerName];

            if (typeof handlerFunction === "function") {
                // Get the target element based on context (default to window)
                const target = context ? document.querySelector(context) : window;

                if (!target) {
                    console.error(`Target element not found for context: ${context}`);
                    return;
                }

                // Attach the event listener
                target.addEventListener(trigger, () => handlerFunction(handlerSelector));

                // For some events, we might want to trigger immediately
                if (trigger === "scroll") {
                    // handlerFunction(handlerSelector, instructions?.length || 0);
                }

                console.log(`Handler "${handlerName}" attached to ${trigger} event on`, target);
            } else {
                console.error(`Handler function "${handlerName}" not found in handlersMap`);
            }
        } catch (error) {
            console.error("Error setting up handler:", error);
        }
    }

    endBlockingOverlay();
}

/**
 * Waits for elements matching a selector to appear in the DOM.
 *
 * @param {string} selector - CSS selector to wait for.
 * @param {number} [timeout=5000] - Maximum time to wait in milliseconds.
 * @returns {Promise<Element[]>} Array of matched elements.
 *
 * @example
 * const elements = await waitForElements('.dynamic-content', 3000);
 */
function waitForElements(selector, timeout = 5000) {
    return new Promise(resolve => {
        const interval = 100;
        let elapsedTime = 0;
        const intervalId = setInterval(() => {
            const elements = document.querySelectorAll(selector);
            if (elements.length > 0) {
                clearInterval(intervalId);
                resolve(elements);
            }
            elapsedTime += interval;
            if (elapsedTime >= timeout) {
                clearInterval(intervalId);
                resolve([]);
            }
        }, interval);
    });
}


/**
 * Creates a new DOM element with specified attributes and content.
 *
 * @param {Element[]} elements - Array of parent elements to create element in.
 * @param {string} tagName - HTML tag name for new element.
 * @param {Object} attributes - Key-value pairs of attributes to set.
 * @param {string} html - Inner HTML content for new element.
 * @returns {Element} The newly created element.
 *
 * @example
 * createElement([parentDiv], 'div', {class: 'new-div'}, '<p>Content</p>');
 */
function createElement(elements, tagName, attributes, html) {
    if (!tagName || typeof tagName !== "string") {
        console.warn("Invalid tagName:", tagName);
        return;
    }

    elements.forEach((parent) => {
        const newElement = document.createElement(tagName);

        if (attributes && typeof attributes === "object") {
            Object.entries(attributes).forEach(([key, value]) => {
                newElement.setAttribute(key, value);
            });
        }

        if (html && typeof html === "string") {
            newElement.innerHTML = html;
        }

        parent.appendChild(newElement);
    });
}

/**
 * Creates and appends a new element to specified parent elements.
 *
 * @param {Element[]} parent - Array of parent elements.
 * @param {string} [html=""] - HTML content for new element.
 * @param {Object} [styles={}] - CSS styles to apply.
 * @param {Object} [attributes={}] - HTML attributes to set.
 * @returns {Promise<void>}
 *
 * @example
 * await handleCreateElement([parentDiv], '<p>New content</p>', {color: 'red'});
 */
async function handleCreateElement(parent, html = "", styles = {}, attributes = {}) {
    if (!parent || typeof html !== "string") {
        console.warn("Invalid parent element or HTML:", parent, html);
        return;
    }

    try {
        // Check if an element with the same ID already exists
        if (attributes && attributes.id) {
            const existingElement = document.getElementById(attributes.id);
            if (existingElement) {
                console.log(`Element with ID ${attributes.id} already exists, not creating a duplicate.`);

                // Update the existing element with new styles if needed
                if (styles && typeof styles === "object") {
                    Object.entries(styles).forEach(([key, value]) => {
                        existingElement.style[key] = value;
                    });
                }

                return;
            }
        }

        let child;

        if (html && html.trim() !== "") {
            // Use the existing HTML parsing approach
            const tempDiv = document.createElement("div");
            tempDiv.innerHTML = html;
            child = tempDiv.firstChild;

            if (!child) {
                console.error("Failed to create a child element from the provided HTML:", html);
                return;
            }
        } else {
            // Create a simple div if no HTML is provided
            child = document.createElement("div");
        }

        // Apply styles to the element
        if (styles && typeof styles === "object") {
            Object.entries(styles).forEach(([key, value]) => {
                child.style[key] = value;
            });
        }

        if (attributes && typeof attributes === "object") {
            Object.entries(attributes).forEach(([key, value]) => {
                child.setAttribute(key, value);
            });
        }

        parent.appendChild(child);
        console.log("Element created, styled, and appended successfully.");
    } catch (error) {
        console.error("Error in handleCreateElement:", error);
    }
}


/**
 * Extracts specific HTML content based on a text description.
 *
 * @param {string} description - Text description of content to extract.
 * @param {string} html - HTML string to search within.
 * @returns {string} Extracted HTML content.
 *
 * @example
 * const content = extractTargetedHtml('first paragraph', '<div><p>First</p><p>Second</p></div>');
 */
function extractTargetedHtml(description, html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const extractedSections = [];

    // Filter out irrelevant tags
    const relevantElements = Array.from(doc.body.querySelectorAll("*")).filter(el => {
        const tagName = el.tagName.toLowerCase();

        // Exclude completely irrelevant tags
        return !["script", "link", "meta", "noscript", "iframe", "svg"].includes(tagName);
    });

    relevantElements.forEach((el) => {
        // Check if the element has meaningful content or attributes
        const textContent = el.textContent.trim();

        // Include only elements with:
        // - Non-empty text content
        // - Important attributes (e.g., id, class)
        if (textContent || el.attributes.length > 0) {
            extractedSections.push(el.outerHTML);
        }
    });

    // Deduplicate sections to avoid duplicates in the output
    const uniqueSections = [...new Set(extractedSections)].map(section => section.trim());

    // Join sections into a single string
    let cleanHtml = uniqueSections.join("\n");

    // Check if the HTML size exceeds 500KB
    const maxSize = 500 * 1024; // 500KB in bytes
    if (cleanHtml.length > maxSize) {
        console.warn("HTML size exceeds 500KB, truncating...");
        cleanHtml = cleanHtml.substring(0, maxSize);
    }

    // Log the extracted sections for debugging
    console.log("Extracted Relevant HTML:", cleanHtml);

    return cleanHtml;
}


/**
 * Checks if an element is visible in the viewport.
 *
 * @param {Element} el - Element to check visibility of.
 * @returns {boolean} True if element is visible.
 *
 * @example
 * if (isVisible(element)) {
 *   // Element is visible, do something
 * }
 */
function isVisible(el) {
    const style = window.getComputedStyle(el);
    return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        style.opacity !== "0"
    );
}

/**
 * Updates CSS styles for specified elements.
 *
 * @param {Element[]} elements - Elements to update styles for.
 * @param {Object} styles - CSS styles to apply.
 * @returns {Promise<void>}
 *
 * @example
 * await handleUpdateStyle([element], {backgroundColor: 'red'});
 */
async function handleUpdateStyle(elements, styles) {
    if (!styles || typeof styles !== "object") {
        console.warn("Invalid styles object:", styles);
        return;
    }
    elements.forEach((el) => {
        Object.assign(el.style, styles);
    });
    console.log("Styles updated successfully.");
}

/**
 * Appends HTML content to specified elements.
 *
 * @param {Element[]} elements - Elements to append content to.
 * @param {string} html - HTML content to append.
 * @returns {void}
 *
 * @example
 * appendChildToElements([container], '<div>New content</div>');
 */
function appendChildToElements(elements, html) {
    if (typeof html !== "string") {
        console.warn("Invalid HTML:", html);
        return;
    }
    elements.forEach((el) => {
        el.insertAdjacentHTML("beforeend", html);
    });
}

/**
 * Adds an event listener to elements with specified handler.
 *
 * @param {Element[]} element - Elements to add listener to.
 * @param {string} event - Event name (e.g., 'click').
 * @param {string} handlerName - Name of handler function.
 * @param {string} handlerSelector - CSS selector for handler target.
 * @returns {Promise<void>}
 *
 * @example
 * await handleAddEventListener([button], 'click', 'toggleDarkMode', '#dark-mode');
 */
async function handleAddEventListener(element, event, handlerName, handlerSelector) {
    if (!event || typeof event !== "string" || typeof handlerName !== "string") {
        console.warn("Invalid event or handler name:", event, handlerName);
        return;
    }

    try {
        // Retrieve the handler function from the mapping
        const handlerFunction = handlersMap[handlerName];

        if (typeof handlerFunction !== "function") {
            console.error(`Handler function "${handlerName}" not found.`);
            return;
        }

        // Attach the event listener using the retrieved function
        element.addEventListener(event, () => handlerFunction(handlerSelector));
        console.log(`Event listener added for event: ${event} using handler: ${handlerName}`);
    } catch (error) {
        console.error("Error adding event listener:", error);
    }
}

/**
 * Sets text content for specified elements.
 *
 * @param {Element[]} elements - Elements to update text content for.
 * @param {string} text - New text content.
 * @returns {void}
 *
 * @example
 * setTextContent([element], 'New text');
 */
function setTextContent(elements, text) {
    if (typeof text !== "string") {
        console.warn("Invalid text:", text);
        return;
    }
    elements.forEach((el) => {
        el.textContent = text;
    });
}

/**
 * Removes specified elements from the DOM.
 *
 * @param {Element[]} elements - Elements to remove.
 * @returns {void}
 *
 * @example
 * removeElements([elementToRemove]);
 */
function removeElements(elements) {
    elements.forEach((el) => el.remove());
}

/**
 * Sets HTML attributes for specified elements.
 *
 * @param {Element[]} elements - Elements to set attributes for.
 * @param {Object} attributes - Key-value pairs of attributes.
 * @returns {void}
 *
 * @example
 * setAttributes([element], {id: 'new-id', class: 'new-class'});
 */
function setAttributes(elements, attributes) {
    if (!attributes || typeof attributes !== "object") {
        console.warn("Invalid attributes object:", attributes);
        return;
    }
    elements.forEach((el) => {
        Object.entries(attributes).forEach(([key, value]) => {
            el.setAttribute(key, value);
        });
    });
}

/**
 * Adds CSS classes to specified elements.
 *
 * @param {Element[]} elements - Elements to add classes to.
 * @param {string} className - Space-separated class names.
 * @returns {void}
 *
 * @example
 * addClasses([element], 'highlight active');
 */
function addClasses(elements, className) {
    if (!className || typeof className !== "string") {
        console.warn("Invalid className:", className);
        return;
    }
    elements.forEach((el) => el.classList.add(...className.split(" ")));
}

/**
 * Removes CSS classes from specified elements.
 *
 * @param {Element[]} elements - Elements to remove classes from.
 * @param {string} className - Space-separated class names.
 * @returns {void}
 *
 * @example
 * removeClasses([element], 'highlight active');
 */
function removeClasses(elements, className) {
    if (!className || typeof className !== "string") {
        console.warn("Invalid className:", className);
        return;
    }
    elements.forEach((el) => el.classList.remove(...className.split(" ")));
}


// Main Message Listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Message received in content.js:", message);
    console.log({ message })
    if (message.action === "getHtml") {
        const description = message.description.toLowerCase();
        const fullHtml = document.body.outerHTML;

        // Extract only the relevant HTML for AI
        const cleanHtml = extractTargetedHtml(description, fullHtml);

        sendResponse({ html: cleanHtml });
    } else if (message.action === "executeInstructions") {
        const { instructions, currentHandler } = message;
        console.log({ instructions, currentHandler })
        if (!Array.isArray(instructions)) {
            console.error("Invalid instructions: Not an array");
            sendResponse({ success: false, error: "Invalid instructions" });
            return;
        }

        // Execute the instructions
        executeInstructions({ instructions, currentHandler })
            .then(() => sendResponse({ success: true }))
            .catch((error) => {
                console.error("Error executing instructions:", error);
                sendResponse({ success: false, error: error.message });
            });
    } else if (message.action === "startOverlay") {
        startBlockingOverlay(message.message);
    } else if (message.action === "updateOverlay") {
        const overlayMessage = document.getElementById('custom-overlay-message');
        if (overlayMessage) {
            overlayMessage.innerText = message.message;
        }
    } else if (message.action === "endOverlay") {
        endBlockingOverlay();
    }

    sendResponse({ success: true });
    return true; // Indicate asynchronous response
});

/**
 * Sends HTML content to the backend for processing.
 *
 * @param {string} htmlContent - HTML content to send.
 * @returns {Promise<Object>} Response from backend.
 *
 * @example
 * const response = await sendHtmlToBackend('<div>Content</div>');
 */
async function sendHtmlToBackend(htmlContent) {
    const token = await fetchTokenFromPopup();
    const currentUrl = localStorage.getItem('currentUrl');
    console.log({ currentUrl, windowLocation: window.location.href })

    if (!token || currentUrl === window.location.href) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/ai/cleanhtml`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`, // Ensure you have the correct auth token
                credentials: true
            },
            body: JSON.stringify({
                currentUrl: window.location.href,
                cleanhtml: htmlContent
            })
        });

        const data = await response.json();
        if (!response.ok) {
            console.error("Failed to update HTML:", data.error);
        } else {
            chrome.storage.local.set({ currentUrl: window.location.href }, () => {
                console.log("Current URL saved to chrome.storage");
            });

            localStorage.setItem('currentUrl', window.location.href);
            console.log("HTML updated successfully:", data.message);
        }
    } catch (error) {
        console.error("Error sending HTML to backend:", error);
    }
}

/**
 * Extracts relevant HTML content from the page and sends it to backend.
 *
 * @returns {Promise<void>}
 */
async function extractAndSendHtml() {
    fetchTokenFromPopup()
        .then(token => {
            if (!token) {
                return;
            }

            // Proceed with the logic that requires the token
            const fullHtml = document.body.outerHTML;
            const description = '';
            const cleanHtml = extractTargetedHtml(description, fullHtml);
            // const compressedHtml = compressToUTF16?.(cleanHtml) || cleanHtml;

            sendHtmlToBackend(cleanHtml);
        })
        .catch(error => {
        });

}

/**
 * Fetches authentication token from the extension popup.
 *
 * @returns {Promise<string>} Authentication token.
 */
const fetchTokenFromPopup = () => {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ action: 'getToken' }, (response) => {
            if (response && response.token) {
                console.log(response);
                resolve(response.token);
            } else {
                reject(new Error('Token not found in response'));
            }
        });
    });
}

// this is to send html as soon as the user logs in
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "userLoggedIn") {
        extractAndSendHtml();
    }
});

// Ensure the function runs after DOM is ready
if (document.readyState === "complete") {
    fetchTokenFromPopup()
        .then(token => {
            if (token) {
                extractAndSendHtml();
            }
        })
        .catch(error => {
        });
} else {
    window.addEventListener("load", () => {
        fetchTokenFromPopup()
            .then(token => {
                if (token) {
                    extractAndSendHtml();
                }
            })
            .catch(error => {
            });
    });
}