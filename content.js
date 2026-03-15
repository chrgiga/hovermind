let currentSelectedText = "";

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

            // 1. Obtenemos textos i18n
            const txtModeDef = chrome.i18n.getMessage("modeDef") || "Definición";
            const txtModeTrans = chrome.i18n.getMessage("modeTrans") || "Traducción";
            const txtBtnDef = chrome.i18n.getMessage("btnDef") || "Definir";
            const txtBtnTrans = chrome.i18n.getMessage("btnTrans") || "Traducir";

            // 2. Detectamos el idioma del navegador del usuario (es, en, etc.)
            const browserLang = chrome.i18n.getUILanguage().startsWith('es') ? 'es' : 'en';

            // 3. Estructura de 2 filas
            btn.innerHTML = `
                <div class="hm-row">
                    <select id="hm-mode-select" class="hm-tool-select" title="Modo">
                        <option value="definition">${txtModeDef}</option>
                        <option value="translation">${txtModeTrans}</option>
                    </select>
                    <div class="hm-divider"></div>
                    <select id="hm-lang-select" class="hm-tool-select" title="Idioma">
                        <option value="es" ${browserLang === 'es' ? 'selected' : ''}>ES</option>
                        <option value="en" ${browserLang === 'en' ? 'selected' : ''}>EN</option>
                    </select>
                    <button id="hm-action-close" class="hm-tool-btn" title="Cerrar">&times;</button>
                </div>
                <div class="hm-row">
                    <button id="hm-action-start" class="hm-btn-main">
                        <span id="hm-icon-start">✨</span>
                        <span id="hm-text-start">${txtBtnDef}</span>
                    </button>
                </div>
            `;

            btn.style.top = `${rect.bottom + 8}px`;
            btn.style.left = `${rect.left}px`;

            // Evitamos que se pierda la selección al hacer clic
            btn.addEventListener('mousedown', function (e) {
                if (e.target.tagName !== 'SELECT' && e.target.tagName !== 'OPTION') {
                    e.preventDefault();
                }
            });

            // 4. Lógica de cambio dinámico del botón según el modo
            btn.querySelector('#hm-mode-select').addEventListener('change', (e) => {
                const icon = document.getElementById('hm-icon-start');
                const text = document.getElementById('hm-text-start');
                if (e.target.value === 'translation') {
                    icon.innerText = '🌐'; // Icono de traducir
                    text.innerText = txtBtnTrans;
                } else {
                    icon.innerText = '✨'; // Icono de definir
                    text.innerText = txtBtnDef;
                }
            });

            // 5. Lógica de clics (Cerrar o Iniciar)
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                if (e.target.closest('#hm-action-close')) {
                    btn.remove();
                } else if (e.target.closest('#hm-action-start')) {
                    let mode = document.getElementById('hm-mode-select').value;
                    let lang = document.getElementById('hm-lang-select').value;
                    btn.remove();
                    createPopup(rect, mode, lang);
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

// Rastreador de scroll para el botón
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

    port.postMessage({ action: "analyzeText", text: currentSelectedText, mode: mode, lang: lang });

    let textBuffer = ""; // Aquí llegan los paquetes grandes de la IA
    let displayedText = ""; // Aquí guardamos lo que ya se ha dibujado en pantalla
    let streamFinished = false; // Bandera para saber cuándo cerrar
    let hasError = false; // Bandera para frenar el motor

    // Motor de escritura fluida
    function typeWriterEffect() {
        if (hasError) return; // Si hay error, no escribimos

        if (textBuffer.length > 0) {
            // 1. Al pintar la primera letra real, borramos el "Cargando..."
            if (displayedText === "") {
                responseContainer.innerHTML = "";
            }

            // 2. Acelerador dinámico: Si el buffer se llena muy rápido, cogemos de 2 en 2 o más 
            // para que la animación no se quede atascada por detrás del tiempo real.
            let charsToTake = Math.max(1, Math.floor(textBuffer.length / 15));
            let nextChars = textBuffer.substring(0, charsToTake);
            textBuffer = textBuffer.substring(charsToTake);

            displayedText += nextChars;

            // 3. Dibujamos el texto actual + el cursor simulado
            responseContainer.innerHTML = `<p>${displayedText.replace(/\n/g, '<br>')}<span style="font-weight: bold; animation: blink 1s step-end infinite;">|</span></p>`;

            // 4. Auto-scroll hacia abajo si el texto crece mucho
            const contentDiv = document.querySelector('.hovermind-content');
            if (contentDiv) contentDiv.scrollTop = contentDiv.scrollHeight;

            // 5. Llamamos al siguiente frame en 20ms (Velocidad de escritura)
            setTimeout(typeWriterEffect, 20);
        } else {
            if (!streamFinished) {
                // Si el buffer está vacío pero la IA aún no ha terminado, esperamos pacientemente
                setTimeout(typeWriterEffect, 50);
            } else {
                // Si ya terminó del todo, quitamos el cursor simulado y cerramos el puerto
                responseContainer.innerHTML = `<p>${displayedText.replace(/\n/g, '<br>')}</p>`;
                port.disconnect();
            }
        }
    }

    // Arrancamos el motor de animación inmediatamente
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
            streamFinished = true;
        }
        else if (response.chunk) {
            textBuffer += response.chunk; // Metemos el trozo nuevo a la "sala de espera"
        }
        else if (response.done) {
            streamFinished = true; // Avisamos al motor de escritura de que ya no llegará más texto
        }
    });
}

document.addEventListener('mousedown', function (event) {
    let btn = document.getElementById('hovermind-quick-btn');
    if (btn && !btn.contains(event.target)) {
        btn.remove();
    }
    // OJO: No cerramos el popup grande al hacer clic fuera para que el usuario pueda copiar texto
});