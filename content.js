let currentSelectedText = "";
let lastUsedLang = null;
let currentDefaultLang = "es";

// State setup
chrome.storage.local.get(['lastUsedLang'], (res) => {
    if (res.lastUsedLang) lastUsedLang = res.lastUsedLang;
});

// Config setup
chrome.storage.sync.get(['defaultLang'], (res) => {
    currentDefaultLang = res.defaultLang || 'es';
});

// Markdown Parser
function parseMarkdown(text) {
    let html = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const codeBlockRegex = new RegExp('\`{3}([\\s\\S]*?)\`{3}', 'g');
    html = html.replace(codeBlockRegex, '<pre style="background:#1f2937; color:#f3f4f6; padding:10px; border-radius:6px; overflow-x:auto; margin:8px 0; font-family:monospace; font-size:12px; white-space:pre-wrap;"><code>$1</code></pre>');
    html = html.replace(/`([^`]+)`/g, '<code style="background:#f3f4f6; color:#ef4444; padding:2px 4px; border-radius:4px; font-family:monospace; font-size:13px;">$1</code>');

    html = html.replace(/^### (.*$)/gim, '<span style="font-size:1.1em; font-weight:bold; display:block; margin-top:12px; margin-bottom:4px; color:#111827;">$1</span>');
    html = html.replace(/^## (.*$)/gim, '<span style="font-size:1.2em; font-weight:bold; display:block; margin-top:14px; margin-bottom:6px; color:#111827;">$1</span>');
    html = html.replace(/^# (.*$)/gim, '<span style="font-size:1.3em; font-weight:bold; display:block; margin-top:16px; margin-bottom:8px; color:#111827;">$1</span>');

    html = html.replace(/^[\s]*[\-\*]\s+(.*$)/gim, '<span style="display:list-item; margin-left:24px; list-style-type:disc; margin-bottom:4px;">$1</span>');
    html = html.replace(/^[\s]*(\d+)\.\s+(.*$)/gim, '<span style="display:block; margin-left:8px; margin-bottom:4px;"><strong>$1.</strong> $2</span>');

    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

    return html;
}

// Toolbar with language selector
function showToolbar(rect) {
    let existingBtn = document.getElementById('hovermind-quick-btn');
    if (existingBtn) existingBtn.remove();

    let btn = document.createElement('div');
    btn.id = 'hovermind-quick-btn';

    btn.style.cssText = `
        position: absolute;
        z-index: 2147483647;
        top: ${rect.bottom + 8}px;
        left: ${rect.left}px;
        background: transparent !important;
        border: none !important;
        box-shadow: none !important;
    `;

    // Supported languages codes
    const SUPPORTED_LANGUAGE_CODES = [
        "de", "ar", "bg", "ca", "cs", "zh", "ko", "hr", "da", "sk",
        "es", "fi", "fr", "el", "he", "hi", "nl", "hu", "id", "en",
        "it", "ja", "no", "pl", "pt", "ro", "ru", "sv", "tr", "uk"
    ];

    const uiLang = chrome.i18n.getUILanguage() || 'en';
    const langNames = new Intl.DisplayNames([uiLang], { type: 'language' });

    function getLangName(code) {
        try {
            const name = langNames.of(code);
            return name.charAt(0).toUpperCase() + name.slice(1);
        } catch (e) { return code.toUpperCase(); }
    }

    const txtTransText = chrome.i18n.getMessage("tbTransText") || "Traducir texto";
    const txtDefModelLabel = chrome.i18n.getMessage("tbDefModelLabel") || "Definir con IA";
    const txtLangLabel = chrome.i18n.getMessage("tbLangLabel") || "Idioma de respuesta:";
    const txtOpenOptions = chrome.i18n.getMessage("tbOpenOptions") || "Abrir Panel de Opciones ↗";
    const txtSettingsTooltip = chrome.i18n.getMessage("tbSettingsTooltip") || "Configuración";
    const txtCloseTooltip = chrome.i18n.getMessage("tbCloseTooltip") || "Cerrar toolbar";
    const txtSearchGoogle = chrome.i18n.getMessage("searchGoogle") || "Buscar en Google";

    // Determine current language from state or defaults
    let currentLangCode = lastUsedLang || currentDefaultLang || 'es';
    let currentLangName = getLangName(currentLangCode);

    btn.innerHTML = `
        <style>
            :root {
                --hm-bg: rgba(255, 255, 255, 0.45);
                --hm-blur: blur(16px);
                --hm-border: 1px solid rgba(99, 102, 241, 0.3);
                --hm-shadow: 0 8px 32px rgba(0, 0, 0, 0.1), inset 0 0 0 1px rgba(255, 255, 255, 0.5);
                --hm-text: #1e293b;
                --hm-icon: #475569;
                --hm-neon-blue: #4f46e5;
                --hm-neon-purple: #9333ea;
                --hm-neon-red: #dc2626;
                --hm-separator: rgba(0, 0, 0, 0.1);
                --hm-popover-bg: rgba(255, 255, 255, 0.65);
            }
            @media (prefers-color-scheme: dark) {
                :root {
                    --hm-bg: rgba(15, 23, 42, 0.5);
                    --hm-border: 1px solid rgba(0, 240, 255, 0.2);
                    --hm-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 15px rgba(0, 240, 255, 0.05), inset 0 0 8px rgba(0, 240, 255, 0.1);
                    --hm-text: #f8fafc;
                    --hm-icon: #94a3b8;
                    --hm-neon-blue: #00f0ff;
                    --hm-neon-purple: #f000ff;
                    --hm-neon-red: #ff3366;
                    --hm-separator: rgba(255, 255, 255, 0.15);
                    --hm-popover-bg: rgba(15, 23, 42, 0.7);
                }
            }

            .hm-futuristic-toolbar {
                display: flex; align-items: center; gap: 6px;
                background: var(--hm-bg); backdrop-filter: var(--hm-blur); -webkit-backdrop-filter: var(--hm-blur);
                border: var(--hm-border); box-shadow: var(--hm-shadow);
                border-radius: 50px; padding: 6px 12px; transition: all 0.3s ease;
            }
            .hm-toolbar-divider { width: 1px; height: 18px; background-color: var(--hm-separator); border-radius: 1px; }
            .hm-btn-neon {
                background: transparent; border: none; color: var(--hm-icon);
                font-size: 18px; padding: 4px; cursor: pointer; display: flex; align-items: center; justify-content: center;
                outline: none; transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            }

            #hm-action-translate:hover { color: var(--hm-neon-blue); filter: drop-shadow(0 0 8px var(--hm-neon-blue)); transform: scale(1.2) translateY(-2px); }
            #hm-action-define:hover { color: var(--hm-neon-purple); filter: drop-shadow(0 0 8px var(--hm-neon-purple)); transform: scale(1.2) translateY(-2px); }
            #hm-action-toggle-settings:hover { color: var(--hm-text); filter: drop-shadow(0 0 6px var(--hm-text)); transform: scale(1.2) rotate(90deg); }
            #hm-action-close { font-size: 24px; line-height: 0.5; }
            #hm-action-close:hover { color: var(--hm-neon-red); filter: drop-shadow(0 0 8px var(--hm-neon-red)); transform: scale(1.2); }
            #hm-toolbar-drag { cursor: grab; padding: 0 4px; color: var(--hm-icon); font-size: 16px; user-select: none; transition: color 0.2s; }
            #hm-toolbar-drag:hover { color: var(--hm-neon-blue); filter: drop-shadow(0 0 4px var(--hm-neon-blue)); }
            #hm-toolbar-drag:active { cursor: grabbing; }

            /* Popover styles */
            #hm-settings-popover {
                position: absolute; top: 100%; left: 50%; transform: translateX(-50%);
                background: var(--hm-popover-bg); backdrop-filter: var(--hm-blur); -webkit-backdrop-filter: var(--hm-blur);
                border: var(--hm-border); box-shadow: var(--hm-shadow); border-radius: 12px; color: var(--hm-text);
                padding: 14px; margin-top: 8px; display: none; width: 220px; font-family: sans-serif;
            }
            #hm-settings-popover.show { display: block; animation: hm-fade-in 0.2s ease-out; }
            @keyframes hm-fade-in { from { opacity: 0; transform: translate(-50%, -5px); } to { opacity: 1; transform: translate(-50%, 0); } }
            
            #hm-link-google { background: transparent; color: var(--hm-text) !important; border: 1px solid var(--hm-separator) !important; transition: all 0.2s; }
            #hm-link-google:hover { border-color: var(--hm-neon-blue) !important; box-shadow: inset 0 0 10px rgba(0, 240, 255, 0.1); color: var(--hm-neon-blue) !important; }
            #hm-link-options { color: var(--hm-neon-blue) !important; opacity: 0.8; transition: all 0.2s; }
            #hm-link-options:hover { opacity: 1; filter: drop-shadow(0 0 6px var(--hm-neon-blue)); }

            /* Custom select styles */
            .hm-custom-select {
                position: relative; margin-bottom: 12px;
            }
            .hm-select-trigger {
                background: transparent; color: var(--hm-text); border: 1px solid var(--hm-separator);
                padding: 6px 10px; border-radius: 6px; font-size: 12px; cursor: pointer;
                display: flex; justify-content: space-between; align-items: center; transition: all 0.2s;
            }
            .hm-select-trigger:hover { border-color: var(--hm-neon-blue); }
            .hm-select-dropdown {
                display: none; position: absolute; top: 100%; left: 0; right: 0; margin-top: 4px;
                background: var(--hm-popover-bg); backdrop-filter: var(--hm-blur); -webkit-backdrop-filter: var(--hm-blur);
                border: var(--hm-border); border-radius: 8px; box-shadow: var(--hm-shadow);
                z-index: 100; flex-direction: column; overflow: hidden;
            }
            .hm-select-dropdown.show { display: flex; animation: hm-drop-down 0.2s ease-out; }
            @keyframes hm-drop-down { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
            
            #hm-lang-search {
                margin: 8px; padding: 6px 8px; border: 1px solid var(--hm-separator); border-radius: 4px;
                background: rgba(0,0,0,0.05); color: var(--hm-text); font-size: 12px; outline: none; transition: border 0.2s;
            }
            @media (prefers-color-scheme: dark) { #hm-lang-search { background: rgba(255,255,255,0.05); } }
            #hm-lang-search:focus { border-color: var(--hm-neon-blue); }
            
            #hm-lang-list { max-height: 150px; overflow-y: auto; scrollbar-width: thin; padding-bottom: 4px; }
            .hm-lang-item { padding: 6px 12px; cursor: pointer; font-size: 12px; color: var(--hm-text); transition: background 0.2s; }
            .hm-lang-item:hover { background: rgba(0, 240, 255, 0.15); color: var(--hm-neon-blue); font-weight: bold; }
        </style>
        
        <div class="hm-futuristic-toolbar">
            <div id="hm-toolbar-drag" title="Move toolbar">⋮⋮</div>
            <div class="hm-toolbar-divider"></div>
            <button id="hm-action-translate" class="hm-btn-neon" title="${txtTransText}">🌐</button>
            <div class="hm-toolbar-divider"></div>
            <button id="hm-action-define" class="hm-btn-neon" title="${txtDefModelLabel}">✨</button>
            <div class="hm-toolbar-divider"></div>
            <button id="hm-action-toggle-settings" class="hm-btn-neon" title="${txtSettingsTooltip}">⚙️</button>
            <div class="hm-toolbar-divider"></div>
            <button id="hm-action-close" class="hm-btn-neon" title="${txtCloseTooltip}">&times;</button>
        </div>
        
        <div id="hm-settings-popover">
            <label style="font-size: 12px; font-weight: 600; color: var(--hm-text); margin-bottom: 6px; display: block;">${txtLangLabel}</label>
            
            <div class="hm-custom-select">
                <div class="hm-select-trigger" id="hm-select-trigger">
                    <span id="hm-selected-lang-text">${currentLangName}</span> <span style="font-size: 10px;">▼</span>
                </div>
                <div class="hm-select-dropdown" id="hm-select-dropdown">
                    <input type="text" id="hm-lang-search" placeholder="🔍 Buscar idioma..." autocomplete="off">
                    <div id="hm-lang-list"></div>
                </div>
            </div>

            <a href="#" id="hm-link-google" style="display: block; font-size: 12px; text-align: center; text-decoration: none; padding: 6px; border-radius: 4px;">${txtSearchGoogle}  ↗</a>
            <a href="#" id="hm-link-options" style="display: block; font-size: 11px; text-align: center; text-decoration: none; margin-top: 10px;">${txtOpenOptions}</a>
        </div>
    `;

    document.body.appendChild(btn);

    // Language search logic
    const triggerBtn = document.getElementById('hm-select-trigger');
    const dropdownMenu = document.getElementById('hm-select-dropdown');
    const searchInput = document.getElementById('hm-lang-search');
    const langList = document.getElementById('hm-lang-list');
    const selectedTextSpan = document.getElementById('hm-selected-lang-text');

    function populateLangList(filter = "") {
        langList.innerHTML = "";
        SUPPORTED_LANGUAGE_CODES.forEach(code => {
            const name = getLangName(code);
            if (name.toLowerCase().includes(filter.toLowerCase())) {
                const item = document.createElement('div');
                item.className = 'hm-lang-item';
                item.textContent = name;
                item.onclick = (e) => {
                    e.stopPropagation();
                    currentLangName = name;
                    currentLangCode = code;
                    selectedTextSpan.textContent = name;
                    dropdownMenu.classList.remove('show');
                };
                langList.appendChild(item);
            }
        });
        if (langList.innerHTML === "") {
            langList.innerHTML = `<div style="padding: 6px 12px; font-size: 12px; color: var(--hm-separator);">${chrome.i18n.getMessage("noResults") || "No results..."}</div>`;
        }
    }

    populateLangList(); // Initial population

    triggerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = dropdownMenu.classList.contains('show');
        dropdownMenu.classList.toggle('show');
        if (!isOpen) {
            searchInput.value = ""; // Clear search
            populateLangList();
            setTimeout(() => searchInput.focus(), 100);
        }
    });

    searchInput.addEventListener('input', (e) => populateLangList(e.target.value));
    searchInput.addEventListener('click', (e) => e.stopPropagation()); // Prevent closing when clicking search input
    dropdownMenu.addEventListener('click', (e) => e.stopPropagation()); // Prevent internal closure

    // Main action buttons logic
    btn.addEventListener('click', function (e) {
        // If clicked outside the dropdown but inside the popover, close the dropdown
        if (!e.target.closest('.hm-custom-select')) {
            dropdownMenu.classList.remove('show');
        }

        if (e.target.closest('#hm-action-close')) { btn.remove(); }
        else if (e.target.closest('#hm-action-toggle-settings')) { document.getElementById('hm-settings-popover').classList.toggle('show'); }
        else if (e.target.closest('#hm-link-options')) { e.preventDefault(); chrome.runtime.sendMessage({ action: "openOptions" }); btn.remove(); }
        else if (e.target.closest('#hm-link-google')) { e.preventDefault(); const query = encodeURIComponent(currentSelectedText); window.open(`https://www.google.com/search?q=${query}`, '_blank'); btn.remove(); }
        else if (e.target.closest('#hm-action-translate')) {
            lastUsedLang = currentLangCode;
            chrome.storage.local.set({ lastUsedLang: currentLangCode });
            btn.remove();
            // Resend ISO code (e.g. 'ja') for MyMemory to work correctly
            createPopup(rect, 'translation', currentLangCode);
        }
        else if (e.target.closest('#hm-action-define')) {
            lastUsedLang = currentLangCode;
            chrome.storage.local.set({ lastUsedLang: currentLangCode });
            btn.remove();
            // Send ISO code for AI as well
            createPopup(rect, 'definition', currentLangCode);
        }
    });

    // Drag & Drop functionality
    const dragHandle = document.getElementById('hm-toolbar-drag');
    let isDraggingToolbar = false;
    let startX, startY, initialLeft, initialTop;

    dragHandle.addEventListener('mousedown', (e) => {
        isDraggingToolbar = true; dragHandle.style.cursor = 'grabbing';
        startX = e.clientX; startY = e.clientY;
        initialLeft = parseFloat(btn.style.left) || rect.left; initialTop = parseFloat(btn.style.top) || (rect.bottom + 8);
        e.preventDefault(); e.stopPropagation();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDraggingToolbar || !document.getElementById('hovermind-quick-btn')) return;
        const dx = e.clientX - startX; const dy = e.clientY - startY;
        btn.style.left = `${initialLeft + dx}px`; btn.style.top = `${initialTop + dy}px`;
    });

    document.addEventListener('mouseup', () => { if (isDraggingToolbar) { isDraggingToolbar = false; dragHandle.style.cursor = 'grab'; } });
}

function handleTextSelection(event) {
    if (event && event.target && (event.target.closest('#hovermind-quick-btn') || event.target.closest('#hovermind-popup'))) {
        return;
    }

    setTimeout(() => {
        let selectedText = window.getSelection().toString().trim();
        let existingBtn = document.getElementById('hovermind-quick-btn');

        if (selectedText.length > 0) {
            if (existingBtn && currentSelectedText === selectedText) return;

            currentSelectedText = selectedText;
            let range = window.getSelection().getRangeAt(0);
            let rect = range.getBoundingClientRect();

            showToolbar(rect);

        } else {
            if (existingBtn) existingBtn.remove();
            currentSelectedText = "";
        }
    }, 10);
}

// Global Event Listeners
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
    if (btn && !btn.contains(event.target)) {
        btn.remove();
    }
});

document.addEventListener('scroll', () => {
    let btn = document.getElementById('hovermind-quick-btn');
    if (btn) {
        let selection = window.getSelection();
        let currentTextOnPage = selection.toString().trim();

        // Only recalculate position if the same text is still selected
        if (selection.rangeCount > 0 && currentTextOnPage === currentSelectedText) {
            let rect = selection.getRangeAt(0).getBoundingClientRect();
            btn.style.top = `${rect.bottom + 8}px`;
            btn.style.left = `${rect.left}px`;
        }
    }
}, true);

// AI Response Popup
function createPopup(rect, mode, lang) {
    let existingPopup = document.getElementById('hovermind-popup');
    if (existingPopup) existingPopup.remove();

    let popup = document.createElement('div');
    popup.id = 'hovermind-popup';

    let topPosition = rect.bottom + 12;
    if (rect.bottom + 350 > window.innerHeight) {
        topPosition = rect.top - 360;
        if (topPosition < 0) topPosition = 20;
    }

    // Transparent wrapper to avoid double-block effect
    popup.style.cssText = `
        position: fixed;
        z-index: 2147483647;
        top: ${topPosition}px;
        left: ${rect.left}px;
        background: transparent !important;
        border: none !important;
        box-shadow: none !important;
    `;

    const txtAnalyzed = chrome.i18n.getMessage("analyzedText") || "Texto analizado:";
    const txtLoading = chrome.i18n.getMessage("loading") || "Conectando con la IA...";

    popup.innerHTML = `
        <style>
            /* Light mode */
            :root {
                --hm-bg: rgba(255, 255, 255, 0.45);
                --hm-blur: blur(16px);
                --hm-border: 1px solid rgba(99, 102, 241, 0.3);
                --hm-shadow: 0 8px 32px rgba(0, 0, 0, 0.1), inset 0 0 0 1px rgba(255, 255, 255, 0.5);
                --hm-text: #1e293b;
                --hm-text-muted: #64748b;
                --hm-neon-blue: #4f46e5;
                --hm-neon-red: #dc2626;
                --hm-separator: rgba(0, 0, 0, 0.1);
                --hm-popover-bg: rgba(255, 255, 255, 0.65);
            }
            
            /* Dark mode */
            @media (prefers-color-scheme: dark) {
                :root {
                    --hm-bg: rgba(15, 23, 42, 0.5);
                    --hm-border: 1px solid rgba(0, 240, 255, 0.2);
                    --hm-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 15px rgba(0, 240, 255, 0.05), inset 0 0 8px rgba(0, 240, 255, 0.1);
                    --hm-text: #f8fafc;
                    --hm-text-muted: #94a3b8;
                    --hm-neon-blue: #00f0ff;
                    --hm-neon-red: #ff3366;
                    --hm-separator: rgba(255, 255, 255, 0.15);
                    --hm-popover-bg: rgba(15, 23, 42, 0.7);
                }
            }

            .hm-glass-popup {
                background: var(--hm-popover-bg); backdrop-filter: var(--hm-blur); -webkit-backdrop-filter: var(--hm-blur);
                border: var(--hm-border); box-shadow: var(--hm-shadow); border-radius: 12px; color: var(--hm-text);
                width: 320px; font-family: -apple-system, sans-serif; display: flex; flex-direction: column;
                overflow: hidden;
            }

            .hm-glass-header {
                display: flex; justify-content: space-between; align-items: center; padding: 10px 14px;
                border-bottom: 1px solid var(--hm-separator); background: rgba(0,0,0,0.05);
                cursor: grab; user-select: none;
            }
            .hm-glass-header:active { cursor: grabbing; }
            
            #hovermind-back-btn, #hovermind-close-btn {
                background: none; border: none; color: var(--hm-text-muted); cursor: pointer;
                transition: all 0.2s; display: flex; align-items: center; justify-content: center; padding: 4px;
            }
            #hovermind-back-btn:hover { color: var(--hm-neon-blue); filter: drop-shadow(0 0 4px var(--hm-neon-blue)); transform: translateX(-2px); }
            #hovermind-close-btn { font-size: 20px; line-height: 1; }
            #hovermind-close-btn:hover { color: var(--hm-neon-red); filter: drop-shadow(0 0 4px var(--hm-neon-red)); transform: scale(1.1); }
            
            .hm-glass-content { padding: 14px; max-height: 400px; overflow-y: auto; scrollbar-width: thin; }
            .hm-glass-content hr { border: 0; border-top: 1px solid var(--hm-separator); margin: 12px 0; }
            
            /* Markdown Styles */
            .hm-glass-content code { background: rgba(0,0,0,0.05) !important; color: var(--hm-neon-blue) !important; }
            @media (prefers-color-scheme: dark) { .hm-glass-content code { background: rgba(255,255,255,0.1) !important; color: var(--hm-neon-blue) !important; } }
            .hm-glass-content pre { background: rgba(0,0,0,0.05) !important; color: var(--hm-text) !important; border: 1px solid var(--hm-separator); }
            @media (prefers-color-scheme: dark) { .hm-glass-content pre { background: rgba(0,0,0,0.3) !important; } }
        </style>

        <div class="hm-glass-popup">
            <div class="hm-glass-header" id="hovermind-drag-handle">
                <div style="display: flex; align-items: center; gap: 6px;">
                    <button id="hovermind-back-btn" title="${chrome.i18n.getMessage("btnBack") || "Back"}">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"></path><polyline points="12 19 5 12 12 5"></polyline></svg>
                    </button>
                    <span style="font-weight: bold; font-size: 14px;">✨ HoverMind</span>
                </div>
                <button id="hovermind-close-btn">&times;</button>
            </div>
            <div class="hm-glass-content">
                <p style="margin: 0; font-size: 13px; color: var(--hm-text-muted);"><strong>${txtAnalyzed}</strong> <br/>"${currentSelectedText}"</p>
                <hr />
                <div id="hovermind-ai-response" style="font-size: 14px;">
                    <p style="color: var(--hm-neon-blue); animation: pulse 1.5s infinite;">${txtLoading}</p>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(popup);

    const header = document.getElementById('hovermind-drag-handle');
    let isDragging = false;
    let startX, startY, initialLeft, initialTop;

    header.addEventListener('mousedown', (e) => {
        if (e.target.id === 'hovermind-close-btn' || e.target.closest('#hovermind-back-btn')) return;
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

    document.addEventListener('mouseup', () => { isDragging = false; });

    const responseContainer = document.getElementById('hovermind-ai-response');
    const port = chrome.runtime.connect({ name: "hovermind-stream" });
    let isCancelled = false;

    document.getElementById('hovermind-close-btn').addEventListener('click', () => {
        isCancelled = true; port.disconnect(); popup.remove();
    });

    document.getElementById('hovermind-back-btn').addEventListener('click', (e) => {
        e.stopPropagation(); isCancelled = true; port.disconnect(); popup.remove(); showToolbar(rect);
    });

    port.postMessage({ action: "analyzeText", text: currentSelectedText, mode: mode, lang: lang });

    let textBuffer = ""; let displayedText = ""; let streamFinished = false; let hasError = false; let isInstant = false;

    function typeWriterEffect() {
        if (hasError || isCancelled) return;

        if (textBuffer.length > 0) {
            if (displayedText === "") responseContainer.innerHTML = "";

            let charsToTake = isInstant ? textBuffer.length : Math.max(1, Math.floor(textBuffer.length / 15));
            let nextChars = textBuffer.substring(0, charsToTake);
            textBuffer = textBuffer.substring(charsToTake);

            displayedText += nextChars;
            let formattedHtml = parseMarkdown(displayedText);

            responseContainer.innerHTML = `<div style="white-space: pre-wrap; line-height: 1.6; color: var(--hm-text);">${formattedHtml}${isInstant ? '' : '<span style="font-weight: bold; color: var(--hm-neon-blue); animation: blink 1s step-end infinite;">|</span>'}</div>`;

            const contentDiv = document.querySelector('.hm-glass-content');
            if (contentDiv) contentDiv.scrollTop = contentDiv.scrollHeight;

            setTimeout(typeWriterEffect, 20);
        } else {
            if (!streamFinished) { setTimeout(typeWriterEffect, 50); }
            else {
                let formattedHtml = parseMarkdown(displayedText);
                responseContainer.innerHTML = `<div style="white-space: pre-wrap; line-height: 1.6; color: var(--hm-text);">${formattedHtml}</div>`;
                port.disconnect();
            }
        }
    }

    typeWriterEffect();

    port.onMessage.addListener((response) => {
        if (response.errorHtml) {
            hasError = true; responseContainer.innerHTML = response.errorHtml;
            const optionsBtn = document.getElementById('hovermind-open-options-btn');
            if (optionsBtn) { optionsBtn.addEventListener('click', () => { chrome.runtime.sendMessage({ action: "openOptions" }); }); }
            port.disconnect();
        }
        else if (response.chunk) { if (response.isCached) isInstant = true; textBuffer += response.chunk; }
        else if (response.done) { streamFinished = true; }
    });
}