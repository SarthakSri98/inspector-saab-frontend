// handlers/index.js - No ES6 modules, just script loading
(() => {
    console.log('🔧 Handler Registry initializing...');

    const HandlerRegistry = {
        handlers: {},

        register(name, handler) {
            if (typeof handler !== 'function') {
                console.error(`Handler ${name} must be a function`);
                return;
            }
            this.handlers[name] = handler;
            console.log(`✅ Handler registered: ${name}`);
        },

        get(name) {
            return this.handlers[name];
        },

        getAll() {
            return { ...this.handlers };
        },

        list() {
            return Object.keys(this.handlers);
        },
    };

    // Reading Progress Bar Handler
    function addReadingProgressBar(selector) {
        console.log(`📊 Reading Progress Bar handler called with selector: ${selector}`);

        const progressBar = document.querySelector(selector);
        if (!progressBar) {
            console.error(`Reading Progress Bar: Element not found for selector: ${selector}`);
            return;
        }

        function updateProgress() {
            const docHeight = document.documentElement.scrollHeight;
            const winHeight = window.innerHeight;
            const scrollTop = window.pageYOffset;
            const trackLength = docHeight - winHeight;
            const percentScrolled = Math.max(0, Math.min(100, (scrollTop / trackLength) * 100));
            progressBar.style.width = percentScrolled + '%';
        }

        window.addEventListener('scroll', updateProgress);
        updateProgress();
        console.log(`✅ Reading Progress Bar: Successfully applied to ${selector}`);
    }

    // Back to Top Button Handler
    function addBackToTopButton(selector) {
        console.log(`⬆️ Back to Top Button handler called with selector: ${selector}`);

        const button = document.querySelector(selector);
        if (!button) {
            console.error(`Back to Top Button: Element not found for selector: ${selector}`);
            return;
        }

        button.onclick = () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            console.log('🔝 Scrolled to top');
        };

        if (!document.body.contains(button)) {
            document.body.appendChild(button);
        }

        console.log(`✅ Back to Top Button: Successfully applied to ${selector}`);
    }

    // Dark Mode Toggle Handler
    function addDarkMode(selector) {
        console.log(`🌙 Dark Mode handler called with selector: ${selector}`);

        const button = document.querySelector(selector);
        if (!button) {
            console.error(`Dark Mode Toggle: Element not found for selector: ${selector}`);
            return;
        }

        button.onclick = () => {
            const existingStyle = document.querySelector('#nightify');

            if (existingStyle) {
                existingStyle.parentNode.removeChild(existingStyle);
                console.log('🌞 Dark Mode: Disabled');
                return;
            }

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
                  img, video, canvas, picture, [role="img"], svg, embed, object {
                      -webkit-filter: invert(100%) hue-rotate(180deg) contrast(100%) !important;
                  }
                  [style*="background"], [class*="background"], [id*="background"] {
                      background-image: none !important;
                      background-color: transparent !important;
                  }
                  figure, figcaption, .media, .photo, .thumbnail, .icon {
                      -webkit-filter: none !important;
                      filter: none !important;
                  }
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

            document.querySelectorAll('*').forEach(element => {
                const computedStyle = window.getComputedStyle(element);
                if (computedStyle.backgroundImage && computedStyle.backgroundImage !== 'none') {
                    element.style.filter =
                        'invert(100%) hue-rotate(180deg) contrast(100%) !important';
                }
            });

            console.log('🌙 Dark Mode: Enabled');
        };

        console.log(`✅ Dark Mode Toggle: Successfully applied to ${selector}`);
    }

    // Register all handlers
    HandlerRegistry.register('addReadingProgressBar', addReadingProgressBar);
    HandlerRegistry.register('addBackToTopButton', addBackToTopButton);
    HandlerRegistry.register('addDarkMode', addDarkMode);

    // IMPORTANT: Make available globally - OUTSIDE the IIFE scope
    // We need to assign to window BEFORE the IIFE closes
    try {
        // Make sure window object exists
        if (typeof window !== 'undefined') {
            window.InspectorSaabHandlers = HandlerRegistry.getAll();
            window.HandlerRegistry = HandlerRegistry;

            // Also create a backup reference
            window.inspectorSaabRegistry = HandlerRegistry;

            console.log('🌍 Global objects set:', {
                InspectorSaabHandlers: !!window.InspectorSaabHandlers,
                HandlerRegistry: !!window.HandlerRegistry,
                inspectorSaabRegistry: !!window.inspectorSaabRegistry,
            });
        } else {
            console.error('❌ Window object not available');
        }
    } catch (error) {
        console.error('❌ Error setting global objects:', error);
    }

    console.log('🚀 Handler Registry initialized with handlers:', HandlerRegistry.list());

    // Dispatch a custom event to signal that handlers are ready
    try {
        const event = new CustomEvent('inspectorSaabHandlersReady', {
            detail: {
                handlers: HandlerRegistry.list(),
                registry: HandlerRegistry,
            },
        });
        document.dispatchEvent(event);
        console.log('📡 Dispatched inspectorSaabHandlersReady event');
    } catch (error) {
        console.error('❌ Error dispatching ready event:', error);
    }
})();

// Additional global assignment outside IIFE as backup
console.log('🔍 Checking global objects after IIFE...');
console.log(
    'HandlerRegistry available:',
    typeof window !== 'undefined' && !!window.HandlerRegistry
);
console.log(
    'InspectorSaabHandlers available:',
    typeof window !== 'undefined' && !!window.InspectorSaabHandlers
);
