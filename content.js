let currentSelectedText = "";

function handleTextSelection(event) {
    if (event && event.target && (event.target.closest('#hovermind-quick-btn') || event.target.closest('#hovermind-popup'))) {
        return;
    }

    setTimeout(() => {
        let selectedText = window.getSelection().toString().trim();
        let existingBtn = document.getElementById('hovermind-quick-btn');

        if (selectedText.length > 0) {
            if (existingBtn && currentSelectedText === selectedText) {
                return;
            }

            if (existingBtn) existingBtn.remove();
            currentSelectedText = selectedText;

            let range = window.getSelection().getRangeAt(0);
            let rect = range.getBoundingClientRect();

            let btn = document.createElement('div');
            btn.id = 'hovermind-quick-btn';

            btn.innerHTML = `
                <span id="hovermind-action">✨ HoverMind</span>
                <span id="hovermind-dismiss" title="Ocultar (Esc)">&times;</span>
            `;

            btn.style.top = `${rect.bottom + 8}px`;
            btn.style.left = `${rect.left}px`;

            btn.addEventListener('mousedown', function (e) {
                e.preventDefault();
            });

            btn.addEventListener('mouseup', function (e) {
                e.stopPropagation();
                if (e.target.id === 'hovermind-dismiss') {
                    btn.remove();
                } else {
                    btn.remove();
                    createPopup(rect);
                }
            });

            document.body.appendChild(btn);
        } else {
            if (existingBtn) existingBtn.remove();
            currentSelectedText = "";
        }
    }, 10);
}

document.addEventListener('mouseup', handleTextSelection);

document.addEventListener('keyup', function (event) {
    if (event.key === 'Escape') return;
    handleTextSelection(event);
});

document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
        let btn = document.getElementById('hovermind-quick-btn');
        let popup = document.getElementById('hovermind-popup');
        if (btn) btn.remove();
        if (popup) popup.remove();
    }
});

document.addEventListener('mousedown', function (event) {
    let btn = document.getElementById('hovermind-quick-btn');
    let popup = document.getElementById('hovermind-popup');

    if (btn && !btn.contains(event.target)) {
        btn.remove();
    }
    if (popup && !popup.contains(event.target)) {
        popup.remove();
    }
});

document.addEventListener('scroll', () => {
    let btn = document.getElementById('hovermind-quick-btn');
    if (btn) {
        let selection = window.getSelection();
        if (selection.rangeCount > 0) {
            let rect = selection.getRangeAt(0).getBoundingClientRect();
            btn.style.top = `${rect.bottom + 8}px`;
            btn.style.left = `${rect.left}px`;
        }
    }
}, true);

async function createPopup(rect) {
    let existingPopup = document.getElementById('hovermind-popup');
    if (existingPopup) existingPopup.remove();

    let popup = document.createElement('div');
    popup.id = 'hovermind-popup';

    let topPosition = rect.bottom + window.scrollY + 12;
    if (rect.bottom + 350 > window.innerHeight) {
        topPosition = rect.top + window.scrollY - 360;
        if (topPosition < 0) topPosition = 20;
    }

    popup.style.top = `${topPosition}px`;
    popup.style.left = `${rect.left}px`;

    popup.innerHTML = `
        <div class="hovermind-header" id="hovermind-drag-handle">
            <span class="hovermind-title">✨ HoverMind</span>
            <button id="hovermind-close-btn">&times;</button>
        </div>
        <div class="hovermind-content">
            <p><strong>Búsqueda:</strong> "${currentSelectedText}"</p>
            <div id="hovermind-ai-response">
                <p class="hovermind-loading">Consultando Wikipedia...</p>
            </div>
            <div style="margin-top: 15px; font-size: 12px;">
                <a href="https://www.google.com/search?q=${encodeURIComponent(currentSelectedText)}" target="_blank" style="color: #4f46e5; text-decoration: none;">🔍 Buscar en Google</a>
            </div>
        </div>
    `;

    document.body.appendChild(popup);

    const header = document.getElementById('hovermind-drag-handle');
    let isDragging = false;
    let startX, startY, initialLeft, initialTop;

    header.addEventListener('mousedown', (e) => {
        if (e.target.id === 'hovermind-close-btn') return;
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        initialLeft = parseFloat(popup.style.left);
        initialTop = parseFloat(popup.style.top);
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging || !document.getElementById('hovermind-popup')) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        popup.style.left = `${initialLeft + dx}px`;
        popup.style.top = `${initialTop + dy}px`;
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
    });

    document.getElementById('hovermind-close-btn').addEventListener('click', () => {
        popup.remove();
    });

    const responseContainer = document.getElementById('hovermind-ai-response');

    // Fetch Wikipedia summary through background script
    chrome.runtime.sendMessage({ action: "analyzeText", text: currentSelectedText }, (response) => {
        if (response && response.result) {
            responseContainer.innerHTML = response.result;
        } else {
            responseContainer.innerHTML = `<p style="color: #ef4444;">Error de comunicación con el background script.</p>`;
        }
    });
}