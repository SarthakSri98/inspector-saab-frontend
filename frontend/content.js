// Add this at the very top of content.js to debug loading
console.log('🔥 Content script starting to load...');

const API_BASE_URL = 'https://inspectorsaab.onrender.com';

// Declare variables before using them
var processedInstructions = 0;
var lastTotalInstructions = 0;
var modificationsQueue = []; // Stores highlights before applying
var dynamicClasses = new Set(); // Stores all AI-generated class names
var handlersMap = {};
var isContentScriptReady = false;

// Listen for the custom event from handlers
document.addEventListener('inspectorSaabHandlersReady', event => {
    console.log('🎉 Received inspectorSaabHandlersReady event:', event.detail);
    initializeHandlersMap();
});

// Set up message listener IMMEDIATELY - before anything else
if (window.chrome && window.chrome.runtime && window.chrome.runtime.onMessage) {
    window.chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        console.log('📨 Message received in content.js:', message);

        // Handle messages even if not fully initialized
        try {
            switch (message.action) {
                case 'ping':
                    console.log('🏓 Ping received, responding with pong');
                    sendResponse({
                        success: true,
                        message: 'pong',
                        ready: isContentScriptReady,
                        handlersAvailable: Object.keys(handlersMap).length,
                        globalHandlers: {
                            HandlerRegistry: !!window.HandlerRegistry,
                            InspectorSaabHandlers: !!window.InspectorSaabHandlers,
                            inspectorSaabRegistry: !!window.inspectorSaabRegistry,
                        },
                    });
                    break;

                case 'getHtml':
                    const description = message.description?.toLowerCase() || '';
                    const fullHtml = document.body.outerHTML;
                    const cleanHtml = extractTargetedHtml(description, fullHtml);
                    sendResponse({ html: cleanHtml });
                    break;

                case 'executeInstructions':
                    if (!isContentScriptReady) {
                        console.warn('⚠️ Content script not fully ready, queuing instructions...');
                        // Wait for ready state and then execute
                        waitForContentScriptReady().then(() => {
                            executeInstructions(message)
                                .then(() => sendResponse({ success: true }))
                                .catch(error =>
                                    sendResponse({ success: false, error: error.message })
                                );
                        });
                    } else {
                        executeInstructions(message)
                            .then(() => sendResponse({ success: true }))
                            .catch(error => sendResponse({ success: false, error: error.message }));
                    }
                    break;

                case 'startOverlay':
                    startBlockingOverlay(message.message);
                    sendResponse({ success: true });
                    break;

                case 'updateOverlay':
                    const overlayMessage = document.getElementById('custom-overlay-message');
                    if (overlayMessage) {
                        overlayMessage.innerText = message.message;
                    }
                    sendResponse({ success: true });
                    break;

                case 'endOverlay':
                    endBlockingOverlay();
                    sendResponse({ success: true });
                    break;

                case 'userLoggedIn':
                    extractAndSendHtml();
                    sendResponse({ success: true });
                    break;

                default:
                    console.warn('❓ Unknown action:', message.action);
                    sendResponse({ success: false, error: 'Unknown action' });
            }
        } catch (error) {
            console.error('❌ Error in message listener:', error);
            sendResponse({ success: false, error: error.message });
        }

        return true; // Keep message channel open for async responses
    });

    console.log('✅ Message listener registered immediately');
} else {
    console.error('❌ Chrome runtime not available');
}

// Function to wait for content script to be fully ready
function waitForContentScriptReady() {
    return new Promise(resolve => {
        if (isContentScriptReady) {
            resolve();
        } else {
            const checkReady = () => {
                if (isContentScriptReady) {
                    resolve();
                } else {
                    setTimeout(checkReady, 100);
                }
            };
            checkReady();
        }
    });
}

// Initialize handlers map after HandlerRegistry is available
function initializeHandlersMap() {
    console.log('🔧 Initializing handlers map...');
    console.log('Available global objects:', {
        HandlerRegistry: !!window.HandlerRegistry,
        InspectorSaabHandlers: !!window.InspectorSaabHandlers,
        inspectorSaabRegistry: !!window.inspectorSaabRegistry,
    });

    let registry = null;

    // Try multiple ways to get the registry
    if (window.HandlerRegistry) {
        registry = window.HandlerRegistry;
        console.log('✅ Using window.HandlerRegistry');
    } else if (window.inspectorSaabRegistry) {
        registry = window.inspectorSaabRegistry;
        console.log('✅ Using window.inspectorSaabRegistry');
    } else if (window.InspectorSaabHandlers) {
        // If we only have the handlers object, create a minimal registry
        handlersMap = {
            ...window.InspectorSaabHandlers,
            highlightContent: highlightTextFromJson,
        };
        console.log('✅ Using window.InspectorSaabHandlers directly');
        return true;
    }

    if (registry) {
        handlersMap = {
            ...registry.getAll(),
            highlightContent: highlightTextFromJson,
        };
        console.log('✅ Handlers map initialized:', Object.keys(handlersMap));
        return true;
    } else {
        console.error('❌ No handler registry found, using fallback');
        handlersMap = {
            highlightContent: highlightTextFromJson,
        };
        return false;
    }
}

// Wait for handlers to be ready with multiple strategies
function waitForHandlers() {
    return new Promise(resolve => {
        const maxAttempts = 100; // 10 seconds max
        let attempts = 0;

        const checkHandlers = () => {
            attempts++;

            // Check if any of our global objects are available
            if (
                window.HandlerRegistry ||
                window.InspectorSaabHandlers ||
                window.inspectorSaabRegistry
            ) {
                console.log(`✅ Handlers found after ${attempts} attempts`);
                initializeHandlersMap();
                resolve(true);
            } else if (attempts >= maxAttempts) {
                console.warn(
                    '⚠️ Handler registry not found after 10 seconds, proceeding with fallback'
                );
                initializeHandlersMap(); // Initialize with fallback
                resolve(false);
            } else {
                setTimeout(checkHandlers, 100);
            }
        };

        // Start checking immediately
        checkHandlers();
    });
}

/**
 * Processes and applies text highlighting based on provided content update instructions.
 */
function highlightTextFromJson(contentUpdate, totalInstructions) {
    console.log('🔍 Processing highlight:', contentUpdate);

    // Better object validation
    if (!contentUpdate || typeof contentUpdate !== 'object') {
        console.warn('Skipping invalid instruction: contentUpdate is not an object');
        return;
    }

    if (!contentUpdate.phrase || !contentUpdate.parentSelector || !contentUpdate.className) {
        console.warn('Skipping invalid instruction: missing required properties', {
            hasPhrase: !!contentUpdate.phrase,
            hasParentSelector: !!contentUpdate.parentSelector,
            hasClassName: !!contentUpdate.className,
            contentUpdate: contentUpdate,
        });
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
            const matchIndex = node.nodeValue
                .toLowerCase()
                .indexOf(contentUpdate.phrase.toLowerCase());

            if (matchIndex !== -1 && matchIndex < node.nodeValue.length) {
                modificationsQueue.push({
                    node,
                    matchIndex,
                    phrase: contentUpdate.phrase,
                    className: contentUpdate.className,
                });
            }
        });
    });

    processedInstructions++;

    if (processedInstructions === totalInstructions) {
        console.log('✅ All instructions processed. Applying highlights...');
        applyAllModifications();
        injectHighlightStyles();
        processedInstructions = 0;
    }
}

function getTextNodes(parent) {
    const nodes = [];
    const walker = document.createTreeWalker(parent, NodeFilter.SHOW_TEXT, {
        acceptNode: node =>
            node.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT,
    });

    while (walker.nextNode()) {
        nodes.push(walker.currentNode);
    }
    return nodes;
}

function applyAllModifications() {
    modificationsQueue.forEach(({ node, matchIndex, phrase, className }) => {
        if (matchIndex >= node.nodeValue.length) {
            console.error(
                '⚠️ Skipping modification due to out-of-bounds index',
                matchIndex,
                node.nodeValue
            );
            return;
        }

        const range = document.createRange();
        range.setStart(node, matchIndex);
        range.setEnd(node, Math.min(matchIndex + phrase.length, node.nodeValue.length));

        const highlightSpan = document.createElement('span');
        highlightSpan.className = className;
        highlightSpan.textContent = phrase;

        try {
            range.surroundContents(highlightSpan);
        } catch (error) {
            console.error('⚠️ `surroundContents` failed, applying fallback method:', error);
            node.parentNode.innerHTML = node.parentNode.innerHTML.replace(
                new RegExp(`(${phrase})`, 'gi'),
                `<span class="${className}">$1</span>`
            );
        }
    });

    modificationsQueue = [];
}

function injectHighlightStyles() {
    let styleElement = document.getElementById('highlight-style');

    if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = 'highlight-style';
        document.head.appendChild(styleElement);
    }

    let styles = '';
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

function initializeOverlay() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeOverlay);
        return;
    }

    if (document.getElementById('custom-blocking-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'custom-blocking-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background-color: rgba(0, 0, 0, 0.9);
        display: none;
        justify-content: center;
        align-items: center;
        z-index: 999999;
        pointer-events: all;
    `;

    const messageBox = document.createElement('div');
    messageBox.id = 'custom-message-box';
    messageBox.style.cssText = `
        color: #fff;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
        font-size: 18px;
        text-align: center;
        min-width: 300px;
    `;

    const loader = document.createElement('div');
    loader.id = 'custom-loader';
    loader.style.cssText = `
        border: 4px solid #f3f3f3;
        border-top: 4px solid #007BFF;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        animation: spin 1s linear infinite;
        margin: 0 auto 15px auto;
    `;

    const message = document.createElement('p');
    message.id = 'custom-overlay-message';
    message.innerText = 'Processing... Please wait.';

    messageBox.appendChild(loader);
    messageBox.appendChild(message);
    overlay.appendChild(messageBox);
    document.body.appendChild(overlay);

    const styleTag = document.createElement('style');
    styleTag.innerHTML = `
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(styleTag);
}

function startBlockingOverlay(messageText = 'Processing... Please wait.') {
    const overlay = document.getElementById('custom-blocking-overlay');
    const message = document.getElementById('custom-overlay-message');

    if (overlay && message) {
        message.innerText = messageText;
        overlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function endBlockingOverlay() {
    const overlay = document.getElementById('custom-blocking-overlay');
    if (overlay) {
        overlay.style.display = 'none';
        document.body.style.overflow = '';
    }
}

async function executeInstructions(message) {
    console.log('🎯 Executing instructions:', message);

    const { instructions, currentHandler } = message;
    const { handlerName, trigger, context, selector: handlerSelector } = currentHandler || {};

    startBlockingOverlay('Processing... Please wait.');

    if (!Array.isArray(instructions)) {
        console.error('Invalid instructions: Not an array');
        endBlockingOverlay();
        return;
    }

    try {
        for (const instruction of instructions) {
            const { action, selector, contentUpdate, ...props } = instruction;

            if (contentUpdate) {
                try {
                    highlightTextFromJson(contentUpdate, instructions?.length || 0);
                } catch (error) {
                    console.error('❌ Error processing highlight:', error);
                }
                continue;
            }

            const elements = await waitForElements(selector);
            if (elements.length === 0) {
                console.warn(`No elements found for selector: ${selector}`);
                continue;
            }

            switch (action) {
                case 'createElement':
                    await handleCreateElement(
                        elements[0],
                        props.html || props.text,
                        props.styles,
                        props.attributes
                    );
                    break;
                case 'updateStyle':
                    console.log('🎨 Updating styles:', {
                        selector,
                        elements: elements.length,
                        styles: props.styles,
                    });
                    await handleUpdateStyle(elements, props.styles);
                    console.log('✅ Style update completed for', elements.length, 'elements');
                    break;
                case 'addEventListener':
                    await handleAddEventListener(
                        elements[0],
                        props.event,
                        props.handler,
                        handlerSelector
                    );
                    break;
                case 'setText':
                case 'setHtml':
                    setTextContent(elements, props.text);
                    break;
                case 'removeElement':
                    removeElements(elements);
                    break;
                case 'setAttribute':
                    setAttributes(elements, props.attributes);
                    break;
                case 'addClass':
                    addClasses(elements, props.className);
                    break;
                case 'removeClass':
                    removeClasses(elements, props.className);
                    break;
                case 'toggleVisibility':
                    toggleVisibility(elements, props.visible);
                    break;
                default:
                    console.warn(`Unknown action: ${action}`);
            }
        }

        // Handle event listeners
        if (handlerName && handlersMap[handlerName]) {
            try {
                const handlerFunction = handlersMap[handlerName];
                const target = context ? document.querySelector(context) : window;

                if (target) {
                    target.addEventListener(trigger, () => handlerFunction(handlerSelector));
                    console.log(`✅ Handler "${handlerName}" attached to ${trigger} event`);
                }
            } catch (error) {
                console.error('❌ Error setting up handler:', error);
            }
        }
    } catch (error) {
        console.error('❌ Error executing instructions:', error);
    } finally {
        endBlockingOverlay();
    }
}

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

// Keep all your other existing functions the same...
async function handleCreateElement(parent, html = '', styles = {}, attributes = {}) {
    if (!parent) {
        console.warn('Invalid parent element:', parent);
        return;
    }

    try {
        if (attributes && attributes.id) {
            const existingElement = document.getElementById(attributes.id);
            if (existingElement) {
                console.log(`Element with ID ${attributes.id} already exists`);
                return;
            }
        }

        let child;
        if (html && html.trim() !== '') {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;
            child = tempDiv.firstChild;
        } else {
            child = document.createElement('div');
        }

        if (!child) {
            console.error('Failed to create element');
            return;
        }

        if (styles && typeof styles === 'object') {
            Object.entries(styles).forEach(([key, value]) => {
                child.style[key] = value;
            });
        }

        if (attributes && typeof attributes === 'object') {
            Object.entries(attributes).forEach(([key, value]) => {
                child.setAttribute(key, value);
            });
        }

        parent.appendChild(child);
        console.log('✅ Element created successfully');
    } catch (error) {
        console.error('❌ Error in handleCreateElement:', error);
    }
}

function extractTargetedHtml(description, html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const extractedSections = [];

    const relevantElements = Array.from(doc.body.querySelectorAll('*')).filter(el => {
        const tagName = el.tagName.toLowerCase();
        return !['script', 'link', 'meta', 'noscript', 'iframe', 'svg'].includes(tagName);
    });

    relevantElements.forEach(el => {
        const textContent = el.textContent.trim();
        if (textContent || el.attributes.length > 0) {
            extractedSections.push(el.outerHTML);
        }
    });

    const uniqueSections = [...new Set(extractedSections)];
    let cleanHtml = uniqueSections.join('\n');

    const maxSize = 500 * 1024;
    if (cleanHtml.length > maxSize) {
        cleanHtml = cleanHtml.substring(0, maxSize);
    }

    return cleanHtml;
}

async function handleUpdateStyle(elements, styles) {
    console.log('🎨 handleUpdateStyle called with:', {
        elementsCount: elements.length,
        styles: styles,
        firstElement: elements[0]?.tagName,
    });

    if (!styles || typeof styles !== 'object') {
        console.warn('❌ Invalid styles object:', styles);
        return;
    }

    elements.forEach((el, index) => {
        console.log(`🎨 Applying styles to element ${index}:`, el.tagName, styles);
        Object.assign(el.style, styles);
        console.log(
            `✅ Applied styles to ${el.tagName}. Current background:`,
            el.style.backgroundColor
        );
    });

    console.log('🎨 Style update completed successfully');
}

async function handleAddEventListener(element, event, handlerName, handlerSelector) {
    if (!event || !handlerName) return;

    const handlerFunction = handlersMap[handlerName];
    if (typeof handlerFunction === 'function') {
        element.addEventListener(event, () => handlerFunction(handlerSelector));
    }
}

function setTextContent(elements, text) {
    if (typeof text === 'string') {
        elements.forEach(el => (el.textContent = text));
    }
}

function removeElements(elements) {
    elements.forEach(el => el.remove());
}

function setAttributes(elements, attributes) {
    if (attributes && typeof attributes === 'object') {
        elements.forEach(el => {
            Object.entries(attributes).forEach(([key, value]) => {
                el.setAttribute(key, value);
            });
        });
    }
}

function addClasses(elements, className) {
    if (className && typeof className === 'string') {
        elements.forEach(el => el.classList.add(...className.split(' ')));
    }
}

function removeClasses(elements, className) {
    if (className && typeof className === 'string') {
        elements.forEach(el => el.classList.remove(...className.split(' ')));
    }
}

function toggleVisibility(elements, visible) {
    elements.forEach(el => {
        el.style.display = visible ? '' : 'none';
    });
}

// Backend communication functions
const fetchTokenFromPopup = () => {
    return new Promise((resolve, reject) => {
        window.chrome.runtime.sendMessage({ action: 'getToken' }, response => {
            if (window.chrome.runtime.lastError) {
                reject(new Error(window.chrome.runtime.lastError.message));
                return;
            }
            if (response && response.token) {
                resolve(response.token);
            } else {
                reject(new Error('Token not found'));
            }
        });
    });
};

async function sendHtmlToBackend(htmlContent) {
    try {
        const token = await fetchTokenFromPopup();
        const currentUrl = localStorage.getItem('currentUrl');

        if (!token || currentUrl === window.location.href) return;

        const response = await fetch(`${API_BASE_URL}/api/ai/cleanhtml`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                currentUrl: window.location.href,
                cleanhtml: htmlContent,
            }),
        });

        const data = await response.json();
        if (response.ok) {
            localStorage.setItem('currentUrl', window.location.href);
            console.log('✅ HTML updated successfully');
        }
    } catch (error) {
        console.error('❌ Error sending HTML to backend:', error);
    }
}

async function extractAndSendHtml() {
    try {
        const token = await fetchTokenFromPopup();
        if (!token) return;

        const fullHtml = document.body.outerHTML;
        const cleanHtml = extractTargetedHtml('', fullHtml);
        await sendHtmlToBackend(cleanHtml);
    } catch (error) {
        console.error('❌ Error in extractAndSendHtml:', error);
    }
}

// Initialize everything
async function initializeContentScript() {
    console.log('🚀 Initializing content script...');

    // Wait for handlers to be ready
    await waitForHandlers();

    // Initialize overlay
    initializeOverlay();

    // Try to send HTML if user is logged in
    try {
        const token = await fetchTokenFromPopup();
        if (token) {
            await extractAndSendHtml();
        }
    } catch (error) {
        console.log('ℹ️ No token available yet');
    }

    // Mark as ready
    isContentScriptReady = true;
    console.log('✅ Content script fully initialized and ready!');
    console.log('📊 Final handlers available:', Object.keys(handlersMap));
}

// Start initialization
if (document.readyState === 'complete') {
    initializeContentScript();
} else {
    window.addEventListener('load', initializeContentScript);
}

console.log('🎉 Content script loaded!');
