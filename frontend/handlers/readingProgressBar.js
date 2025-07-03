/**
 * Reading Progress Bar Handler
 * Creates a progress bar that shows reading progress
 */
function addReadingProgressBar(selector) {
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
    console.log(`Reading Progress Bar: Successfully applied to ${selector}`);
}

export default addReadingProgressBar;
