let currentSelectedText = "";

// 1. EMPAQUETAMOS LA LÓGICA EN UNA FUNCIÓN REUTILIZABLE
function handleTextSelection(event) {
    // Evitamos actuar si el clic o la tecla se originó dentro de nuestro popup o botón
    if (event && event.target && (event.target.closest('#hovermind-quick-btn') || event.target.closest('#hovermind-popup'))) {
        return;
    }

    setTimeout(() => {
        let selectedText = window.getSelection().toString().trim();
        let existingBtn = document.getElementById('hovermind-quick-btn');

        // Si hay texto seleccionado...
        if (selectedText.length > 0) {
            // Si el texto es exactamente el mismo y el botón ya existe (ej. al pulsar Ctrl+C), 
            // no hacemos nada para evitar que el botón parpadee.
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
            // Si el usuario deseleccionó el texto usando el teclado, ocultamos el botón
            if (existingBtn) existingBtn.remove();
            currentSelectedText = "";
        }
    }, 10);
}

// 2. ESCUCHAMOS LOS EVENTOS DEL RATÓN Y DEL TECLADO
// Cuando suelta el ratón
document.addEventListener('mouseup', handleTextSelection);

// Cuando suelta una tecla (Cubre Ctrl+A, Shift+Flechas, Ctrl+Alt, etc.)
document.addEventListener('keyup', function (event) {
    if (event.key === 'Escape') return; // La tecla Escape la manejamos abajo
    handleTextSelection(event);
});

// 3. Escape, clics fuera y creación del popup
document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
        let btn = document.getElementById('hovermind-quick-btn');
        let popup = document.getElementById('hovermind-popup');
        if (btn) btn.remove();
        if (popup) popup.remove();
    }
});

function createPopup(rect) {
    let existingPopup = document.getElementById('hovermind-popup');
    if (existingPopup) existingPopup.remove();

    let popup = document.createElement('div');
    popup.id = 'hovermind-popup';

    // Si el texto está muy abajo en la pantalla, abrimos el popup HACIA ARRIBA
    // para que no se corte con el final de la página (el "footer" de la ventana)
    let topPosition = rect.bottom + window.scrollY + 12;
    if (rect.bottom + 350 > window.innerHeight) {
        topPosition = rect.top + window.scrollY - 360; // Lo subimos
        if (topPosition < 0) topPosition = 20; // Si aún así se sale por arriba, lo pegamos al techo
    }

    popup.style.top = `${topPosition}px`;
    popup.style.left = `${rect.left}px`;

    // Obtenemos los textos en el idioma del usuario (i18n)
    const txtAnalyzed = chrome.i18n.getMessage("analyzedText") || "Texto analizado:";
    const txtLoading = chrome.i18n.getMessage("loading") || "Cargando respuesta de la IA...";

    popup.innerHTML = `
        <div class="hovermind-header" id="hovermind-drag-handle">
            <span class="hovermind-title">✨ HoverMind</span>
            <button id="hovermind-close-btn">&times;</button>
        </div>
        <div class="hovermind-content">
            <p><strong>${txtAnalyzed}</strong> "${currentSelectedText}"</p>
            <div id="hovermind-ai-response">
                <p class="hovermind-loading">${txtLoading}</p>
            </div>
        </div>
    `;

    document.body.appendChild(popup);

    // --- LÓGICA DE ARRASTRE (DRAG & DROP) ---
    const header = document.getElementById('hovermind-drag-handle');
    let isDragging = false;
    let startX, startY, initialLeft, initialTop;

    header.addEventListener('mousedown', (e) => {
        // Si hace clic en la X de cerrar, no arrastramos
        if (e.target.id === 'hovermind-close-btn') return;

        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        initialLeft = parseFloat(popup.style.left);
        initialTop = parseFloat(popup.style.top);
        e.preventDefault(); // Evita comportamientos raros del navegador al arrastrar
    });

    // Usamos el document para que no se pierda el arrastre si mueves el ratón muy rápido
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
    // ----------------------------------------

    // Botón de cerrar
    document.getElementById('hovermind-close-btn').addEventListener('click', () => {
        popup.remove();
    });

    // Conexión con el Background
    const responseContainer = document.getElementById('hovermind-ai-response');

    chrome.runtime.sendMessage({ action: "analyzeText", text: currentSelectedText }, (response) => {
        if (response && response.result) {
            responseContainer.innerHTML = response.result;
            const optionsBtn = document.getElementById('hovermind-open-options-btn');
            if (optionsBtn) {
                optionsBtn.addEventListener('click', () => {
                    chrome.runtime.sendMessage({ action: "openOptions" });
                });
            }
        } else {
            responseContainer.innerHTML = `<p style="color: #ef4444;">Error de comunicación con el motor de HoverMind.</p>`;
        }
    });
}

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

// Mantiene el botón pequeño pegado al texto cuando la página se mueve
document.addEventListener('scroll', () => {
    let btn = document.getElementById('hovermind-quick-btn');
    if (btn) {
        let selection = window.getSelection();
        if (selection.rangeCount > 0) {
            let rect = selection.getRangeAt(0).getBoundingClientRect();
            // Actualizamos la posición en tiempo real
            btn.style.top = `${rect.bottom + 8}px`;
            btn.style.left = `${rect.left}px`;
        }
    }
}, true); // El 'true' es vital: obliga a capturar el scroll de CUALQUIER contenedor interno de la web