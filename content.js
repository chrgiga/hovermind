let currentSelectedText = "";
let currentModels = [];
let lastUsedModelId = null;
let currentDefaultLang = "es";
let currentDefaultAction = "translation";
let currentDefaultModelId = null;

chrome.storage.local.get(['lastUsedModelId'], (res) => {
    if (res.lastUsedModelId) lastUsedModelId = res.lastUsedModelId;
});

chrome.storage.sync.get(['customModels', 'defaultLang', 'defaultAction', 'defaultModelId'], (res) => {
    // Si no hay configurados, ponemos los de por defecto
    currentModels = res.customModels || [
        { id: "1", name: "Gemini Flash", provider: "gemini", apiModel: "gemini-latest-flash" },
        { id: "2", name: "GPT-3.5 Turbo", provider: "openai", apiModel: "gpt-3.5-turbo" }
    ];
    currentDefaultLang = res.defaultLang || 'es';
    currentDefaultAction = res.defaultAction || 'translation';
    currentDefaultModelId = res.defaultModelId || (currentModels[0] ? currentModels[0].id : null);
});
// Escuchar cambios por si el usuario añade uno nuevo sin recargar la página
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes.customModels) currentModels = changes.customModels.newValue;
});

function handleTextSelection(event) {
    if (event && event.target && (event.target.closest('#hovermind-quick-btn') || event.target.closest('#hovermind-popup'))) {
        return;
    }

    setTimeout(() => {
        let selectedText = window.getSelection().toString().trim();
        let existingBtn = document.getElementById('hovermind-quick-btn');

        if (selectedText.length > 0) {
            if (existingBtn && currentSelectedText === selectedText) return;

            if (existingBtn) existingBtn.remove();
            currentSelectedText = selectedText;

            let range = window.getSelection().getRangeAt(0);
            let rect = range.getBoundingClientRect();
            let btn = document.createElement('div');
            btn.id = 'hovermind-quick-btn';
            btn.style.top = `${rect.bottom + 8}px`;
            btn.style.left = `${rect.left}px`;

            // 1. Leer los defaults (debes tenerlos guardados en variables globales arriba, igual que currentModels)
            let actionType = currentDefaultAction || 'translation';
            let lang = currentDefaultLang || 'es';
            let modelId = currentDefaultModelId || (currentModels[0] ? currentModels[0].id : null);

            // Generar las opciones de IA para el selector combinado
            const modelOptionsHtml = currentModels.map(m =>
                `<option value="model_${m.id}">${m.name}</option>`
            ).join('');

            const txtTransText = chrome.i18n.getMessage("tbTransText") || "🌐 Traducir texto";
            const txtDefModelLabel = chrome.i18n.getMessage("tbDefModelLabel") || "✨ Definir con Modelo IA:";
            const txtLangEs = chrome.i18n.getMessage("tbLangEs") || "Español";
            const txtLangEn = chrome.i18n.getMessage("tbLangEn") || "Inglés";
            const txtOpenOptions = chrome.i18n.getMessage("tbOpenOptions") || "Abrir Panel de Opciones ↗";
            const txtBtnTrans = chrome.i18n.getMessage("tbBtnTrans") || "Traducir";
            const txtBtnDef = chrome.i18n.getMessage("tbBtnDef") || "Definir";
            const txtSettingsTooltip = chrome.i18n.getMessage("tbSettingsTooltip") || "Ajustes de consulta";
            const txtCloseTooltip = chrome.i18n.getMessage("tbCloseTooltip") || "Cerrar";

            // Preparar el botón principal según la acción por defecto
            let btnText = actionType === 'translation' ? txtBtnTrans : txtBtnDef;
            let btnIcon = actionType === 'translation' ? "🌐" : "✨";
            let selectValue = actionType === 'translation' ? "translation" : `model_${modelId}`;

            btn.innerHTML = `
                <div class="hm-minimal-row">
                    <button id="hm-action-start" class="hm-btn-main" style="flex: 1;">
                        <span id="hm-icon-start">${btnIcon}</span>
                        <span id="hm-text-start">${btnText}</span>
                    </button>
                    <button id="hm-action-toggle-settings" class="hm-tool-btn" title="${txtSettingsTooltip}">⚙️</button>
                    <button id="hm-action-close" class="hm-tool-btn" style="color: #ef4444; font-size: 22px; line-height: 0.5; padding: 0 6px;" title="${txtCloseTooltip}">&times;</button>
                </div>
                
                <div id="hm-settings-popover" class="hm-settings-popover">
                    <select id="hm-combined-select" class="hm-tool-select">
                        <option value="translation">${txtTransText}</option>
                        <optgroup label="${txtDefModelLabel}">
                            ${modelOptionsHtml}
                        </optgroup>
                    </select>
                    <select id="hm-lang-select" class="hm-tool-select">
                        <option value="es">${txtLangEs}</option>
                        <option value="en">${txtLangEn}</option>
                    </select>
                    <a href="#" id="hm-link-options" style="font-size: 11px; color: #4f46e5; text-align: center; text-decoration: none; margin-top: 4px;">${txtOpenOptions}</a>
                </div>
            `;

            // Marcar los selectores con los valores actuales
            btn.querySelector('#hm-combined-select').value = selectValue;
            btn.querySelector('#hm-lang-select').value = lang;

            // Lógica para cambiar dinámicamente el botón grande si el usuario cambia el selector combinado
            btn.querySelector('#hm-combined-select').addEventListener('change', (e) => {
                const val = e.target.value;
                const icon = document.getElementById('hm-icon-start');
                const text = document.getElementById('hm-text-start');
                if (val === 'translation') {
                    icon.innerText = '🌐'; text.innerText = txtBtnTrans;
                } else {
                    icon.innerText = '✨'; text.innerText = txtBtnDef;
                }
            });

            // Lógica de clics principal
            btn.addEventListener('click', function (e) {
                e.stopPropagation();

                if (e.target.closest('#hm-action-close')) {
                    btn.remove();
                }
                else if (e.target.closest('#hm-action-toggle-settings')) {
                    // Muestra u oculta el popover de ajustes
                    document.getElementById('hm-settings-popover').classList.toggle('show');
                }
                else if (e.target.closest('#hm-link-options')) {
                    e.preventDefault();
                    chrome.runtime.sendMessage({ action: "openOptions" });
                    btn.remove();
                }
                else if (e.target.closest('#hm-action-start')) {
                    const combinedVal = document.getElementById('hm-combined-select').value;
                    const finalLang = document.getElementById('hm-lang-select').value;

                    let finalMode = combinedVal === 'translation' ? 'translation' : 'definition';
                    let finalModelId = combinedVal.startsWith('model_') ? combinedVal.replace('model_', '') : null;

                    btn.remove();
                    createPopup(rect, finalMode, finalLang, finalModelId);
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
    if (btn && !btn.contains(event.target)) {
        btn.remove();
    }
    // No cerramos el popup grande para que el usuario pueda copiar texto
});

// Rastreador de scroll para mantener el botón pegado al texto
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

function createPopup(rect, mode, lang, modelId) {
    let existingPopup = document.getElementById('hovermind-popup');
    if (existingPopup) existingPopup.remove();

    let popup = document.createElement('div');
    popup.id = 'hovermind-popup';

    let topPosition = rect.bottom + 12;
    if (rect.bottom + 350 > window.innerHeight) {
        topPosition = rect.top - 360;
        if (topPosition < 0) topPosition = 20;
    }

    popup.style.position = 'fixed';
    popup.style.zIndex = '2147483647';
    popup.style.top = `${topPosition}px`;
    popup.style.left = `${rect.left}px`;

    const txtAnalyzed = chrome.i18n.getMessage("analyzedText") || "Texto analizado:";
    const txtLoading = chrome.i18n.getMessage("loading") || "Conectando con la IA...";

    popup.innerHTML = `
        <div class="hovermind-header" id="hovermind-drag-handle">
            <span class="hovermind-title">✨ HoverMind</span>
            <button id="hovermind-close-btn">&times;</button>
        </div>
        <div class="hovermind-content">
            <p><strong>${txtAnalyzed}</strong> "${currentSelectedText}"</p>
            <hr />
            <div id="hovermind-ai-response">
                <p class="hovermind-loading">${txtLoading}</p>
            </div>
        </div>
    `;

    document.body.appendChild(popup);

    // Lógica de arrastre
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

    document.addEventListener('mouseup', () => { isDragging = false; });

    document.getElementById('hovermind-close-btn').addEventListener('click', () => {
        popup.remove();
    });

    // --- CONEXIÓN POR STREAMING Y EFECTO MÁQUINA DE ESCRIBIR ---
    const responseContainer = document.getElementById('hovermind-ai-response');
    const port = chrome.runtime.connect({ name: "hovermind-stream" });

    port.postMessage({ action: "analyzeText", text: currentSelectedText, mode: mode, lang: lang, modelId: modelId });

    let textBuffer = ""; // Aquí llegan los paquetes grandes de la IA
    let displayedText = ""; // Aquí guardamos lo que ya se ha dibujado en pantalla
    let streamFinished = false; // Bandera para saber cuándo cerrar
    let hasError = false; // Bandera para frenar el motor
    let isInstant = false; // Bandera para respuestas cacheadas

    // Motor de escritura fluida
    function typeWriterEffect() {
        if (hasError) return;

        if (textBuffer.length > 0) {
            if (displayedText === "") responseContainer.innerHTML = "";

            // Si es instantáneo, cogemos todo el buffer de golpe. Si no, de poco a poco.
            let charsToTake = isInstant ? textBuffer.length : Math.max(1, Math.floor(textBuffer.length / 15));
            let nextChars = textBuffer.substring(0, charsToTake);
            textBuffer = textBuffer.substring(charsToTake);

            displayedText += nextChars;
            responseContainer.innerHTML = `<p>${displayedText.replace(/\n/g, '<br>')}${isInstant ? '' : '<span style="font-weight: bold; animation: blink 1s step-end infinite;">|</span>'}</p>`;

            const contentDiv = document.querySelector('.hovermind-content');
            if (contentDiv) contentDiv.scrollTop = contentDiv.scrollHeight;

            setTimeout(typeWriterEffect, 20);
        } else {
            if (!streamFinished) {
                setTimeout(typeWriterEffect, 50);
            } else {
                responseContainer.innerHTML = `<p>${displayedText.replace(/\n/g, '<br>')}</p>`;
                port.disconnect();
            }
        }
    }

    typeWriterEffect();

    // Escuchamos lo que entra por el túnel y lo metemos al Buffer
    port.onMessage.addListener((response) => {
        if (response.errorHtml) {
            hasError = true; //Activamos la bandera de error para frenar el motor
            responseContainer.innerHTML = response.errorHtml;
            const optionsBtn = document.getElementById('hovermind-open-options-btn');
            if (optionsBtn) {
                optionsBtn.addEventListener('click', () => {
                    chrome.runtime.sendMessage({ action: "openOptions" });
                });
            }

            port.disconnect();
        }
        else if (response.chunk) {
            if (response.isCached) isInstant = true; // Activamos el modo instantáneo
            textBuffer += response.chunk; // Metemos el trozo nuevo a la "sala de espera"
        }
        else if (response.done) {
            streamFinished = true; // Avisamos al motor de escritura de que ya no llegará más texto
        }
    });
}
