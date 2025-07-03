/**
 * Back to Top Button Handler
 * Adds smooth scroll to top functionality
 */
function addBackToTopButton(selector) {
    const button = document.querySelector(selector);
    if (!button) {
        console.error(`Back to Top Button: Element not found for selector: ${selector}`);
        return;
    }

    button.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });

    if (!document.body.contains(button)) {
        document.body.appendChild(button);
    }

    console.log(`Back to Top Button: Successfully applied to ${selector}`);
}

export default addBackToTopButton;
