/**
 * Dark Mode Toggle Handler
 * Toggles dark mode on/off for the entire page
 */
function addDarkMode(selector) {
    const button = document.querySelector(selector);
    if (!button) {
        console.error(`Dark Mode Toggle: Element not found for selector: ${selector}`);
        return;
    }

    button.onclick = () => {
        const existingStyle = document.querySelector('#nightify');

        if (existingStyle) {
            existingStyle.parentNode.removeChild(existingStyle);
            console.log('Dark Mode: Disabled');
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
                element.style.filter = 'invert(100%) hue-rotate(180deg) contrast(100%) !important';
            }
        });

        console.log('Dark Mode: Enabled');
    };

    console.log(`Dark Mode Toggle: Successfully applied to ${selector}`);
}

export default addDarkMode;
