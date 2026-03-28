document.addEventListener('DOMContentLoaded', () => {
    function localizeUI() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            const message = chrome.i18n.getMessage(key);
            if (message) {
                if (el.tagName === 'TITLE') {
                    document.title = message;
                } else {
                    el.textContent = message;
                }
            }
        });
    }
    localizeUI();
});
