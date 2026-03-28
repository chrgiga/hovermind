document.addEventListener('DOMContentLoaded', () => {
    // --- LOCALIZATION ---
    function localizeUI() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            const message = chrome.i18n.getMessage(key);
            if (message) {
                if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                    el.placeholder = message;
                } else if (el.tagName === 'TITLE') {
                    document.title = message;
                } else {
                    el.textContent = message;
                }
            }
        });
    }
    localizeUI();

    // --- AI ELEMENTS ---
    const container = document.getElementById('ai-rows-container');
    const select = document.getElementById('newProviderSelect');
    const saveBtn = document.getElementById('saveAiBtn');
    const statusMsg = document.getElementById('aiStatusMessage');

    // --- CACHE ELEMENTS ---
    const cacheContainer = document.getElementById('cache-container');
    const clearCacheBtn = document.getElementById('clearCacheBtn');

    // Default data when creating a new row
    const apiFormats = {
        'openai': { name: 'API Compatible (OpenAI)', defaultEndpoint: 'https://api.openai.com/v1/chat/completions', placeholderEndpoint: 'ej. https://api.aimlapi.com/v1/chat/completions' },
        'anthropic': { name: 'Anthropic (Claude)', defaultEndpoint: 'https://api.anthropic.com/v1/messages', placeholderEndpoint: 'https://api.anthropic.com/v1/messages' },
        'gemini': { name: 'Google Gemini', defaultEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models/{model}:streamGenerateContent', placeholderEndpoint: 'https://generativelanguage.googleapis.com/...' }
    };


    let aiConfigs = [];

    // SECTION 1: API MANAGEMENT

    chrome.storage.sync.get(['aiConfigs'], (res) => {
        if (res.aiConfigs && res.aiConfigs.length > 0) {
            aiConfigs = res.aiConfigs;
        } else {
            // Empty example row by default
            aiConfigs = [{ id: Date.now().toString(), provider: 'openai', baseUrl: '', apiKey: '', model: '', isActive: true }];
        }
        renderRows();
    });

    function renderRows() {
        container.innerHTML = '';

        if (aiConfigs.length === 0) {
            container.innerHTML = `<p style="text-align:center; color:#9ca3af; font-size:14px; padding: 20px 0;">${chrome.i18n.getMessage("rowNoApis") || "No hay APIs configuradas. Selecciona una abajo."}</p>`;
            return;
        }

        aiConfigs.forEach((config) => {
            const formatData = apiFormats[config.provider];
            const row = document.createElement('div');

            const rowBorder = config.isActive ? 'border-color: #4f46e5; box-shadow: 0 0 0 1px #4f46e5;' : 'border-color: #e5e7eb;';
            const bgActive = config.isActive ? 'background-color: #eff6ff;' : 'background-color: #ffffff;';

            row.className = 'api-row'; // For scrolling support
            row.style.cssText = `display: flex; flex-direction: column; gap: 10px; padding: 15px; border-radius: 8px; border: 1px solid; ${rowBorder} ${bgActive} transition: all 0.2s;`;

            row.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px; margin-bottom: 5px;">
                    <label style="display: flex; align-items: center; gap: 8px; font-weight: bold; cursor: pointer; color: #1f2937;">
                        <input type="radio" name="activeModel" value="${config.id}" ${config.isActive ? 'checked' : ''} style="transform: scale(1.2); cursor: pointer;">
                        ${formatData.name}
                    </label>
                    <button class="btn-delete-row" data-id="${config.id}" style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 16px;" title="${chrome.i18n.getMessage("rowDelete")}">🗑️</button>
                </div>
                
                <div>
                    <label style="font-size: 12px; font-weight: 600; color: #4b5563; display: block; margin-bottom: 4px;">${chrome.i18n.getMessage("rowEndpoint")}</label>
                    <input type="text" class="input-url" data-id="${config.id}" value="${config.baseUrl}" placeholder="${formatData.placeholderEndpoint}" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px; font-family: monospace; font-size: 12px; box-sizing: border-box; outline: none;">
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div>
                        <label style="font-size: 12px; font-weight: 600; color: #4b5563; display: block; margin-bottom: 4px;">${chrome.i18n.getMessage("rowApiKey")}</label>
                        <input type="password" class="input-apikey" data-id="${config.id}" value="${config.apiKey}" placeholder="sk-..." style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px; box-sizing: border-box; outline: none;">
                    </div>
                    <div>
                        <label style="font-size: 12px; font-weight: 600; color: #4b5563; display: block; margin-bottom: 4px;">${chrome.i18n.getMessage("rowModelName")}</label>
                        <input type="text" class="input-model" data-id="${config.id}" value="${config.model}" placeholder="ej. gpt-4o..." style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px; font-family: monospace; box-sizing: border-box; outline: none;">
                    </div>
                </div>
            `;
            container.appendChild(row);
        });

        attachRowEvents();
    }

    function attachRowEvents() {
        document.querySelectorAll('input[name="activeModel"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                const selectedId = e.target.value;
                aiConfigs.forEach(c => c.isActive = (c.id === selectedId));
                renderRows();
            });
        });

        document.querySelectorAll('.input-url').forEach(input => {
            input.addEventListener('input', (e) => {
                const config = aiConfigs.find(c => c.id === e.target.dataset.id);
                if (config) config.baseUrl = e.target.value.trim();
            });
        });

        document.querySelectorAll('.input-apikey').forEach(input => {
            input.addEventListener('input', (e) => {
                const config = aiConfigs.find(c => c.id === e.target.dataset.id);
                if (config) config.apiKey = e.target.value.trim();
            });
        });

        document.querySelectorAll('.input-model').forEach(input => {
            input.addEventListener('input', (e) => {
                const config = aiConfigs.find(c => c.id === e.target.dataset.id);
                if (config) config.model = e.target.value.trim();
            });
        });

        document.querySelectorAll('.btn-delete-row').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idToDelete = e.target.dataset.id;
                aiConfigs = aiConfigs.filter(c => c.id !== idToDelete);
                if (aiConfigs.length > 0 && !aiConfigs.some(c => c.isActive)) {
                    aiConfigs[0].isActive = true;
                }
                renderRows();
            });
        });
    }

    // Add row and Auto-Scroll
    select.addEventListener('change', (e) => {
        const provider = e.target.value;
        if (!provider) return;

        aiConfigs.forEach(c => c.isActive = false);

        aiConfigs.push({
            id: Date.now().toString(),
            provider: provider,
            baseUrl: apiFormats[provider].defaultEndpoint,
            apiKey: '',
            model: '',
            isActive: true
        });

        select.value = "";
        renderRows();

        // Auto-scroll to the newly created row
        setTimeout(() => {
            const rows = document.querySelectorAll('.api-row');
            if (rows.length > 0) {
                rows[rows.length - 1].scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 50);
    });

    saveBtn.addEventListener('click', () => {
        chrome.storage.sync.set({ aiConfigs: aiConfigs }, () => {
            statusMsg.textContent = chrome.i18n.getMessage("statusSaved") || "¡Configuración guardada con éxito!";
            statusMsg.style.color = "#10b981";
            setTimeout(() => { statusMsg.textContent = ''; }, 3000);
        });
    });


    // SECTION 2: CACHE MANAGEMENT

    // Markdown parser to render the cache
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

    function renderCache() {
        chrome.storage.local.get(['hovermind_cache'], (res) => {
            const cache = res.hovermind_cache || {};
            const keys = Object.keys(cache);

            if (keys.length === 0) {
                cacheContainer.innerHTML = `<p style="text-align:center; color:#9ca3af; font-size:14px; padding: 20px 0;">${chrome.i18n.getMessage("cacheEmpty") || "La caché está vacía."}</p>`;
                return;
            }

            cacheContainer.innerHTML = '';

            // Sort from newest to oldest by timestamp
            keys.sort((a, b) => {
                const timeA = cache[a].timestamp || 0;
                const timeB = cache[b].timestamp || 0;
                return timeB - timeA;
            });

            keys.forEach(key => {
                const item = cache[key];
                const textContent = typeof item === 'string' ? item : item.text;

                // Format the date
                let dateStr = 'Fecha desconocida';
                if (item.timestamp) {
                    const date = new Date(item.timestamp);
                    dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                }

                // Extract info from the key (e.g., "translation_es_mymemory_searched text")
                const parts = key.split('_');
                const actionType = parts[0] === 'translation' ? chrome.i18n.getMessage("cacheTraduccion") : chrome.i18n.getMessage("cacheDefinicion");
                const lang = parts[1] ? parts[1].toUpperCase() : 'ES';

                // The searched text is what remains after mode_lang_model
                const originalText = parts.slice(3).join('_') || 'Texto desconocido';

                const formattedContent = parseMarkdown(textContent); // Parse the content

                const div = document.createElement('div');
                div.className = 'cache-item';
                div.innerHTML = `
                    <div style="flex: 1; margin-right: 15px; overflow: hidden;">
                        <div class="cache-title">
                            <span style="background: #e0e7ff; color: #3730a3; padding: 2px 6px; border-radius: 4px; font-size: 10px; margin-right: 6px;">${actionType}</span>
                            <span style="background: #f3f4f6; color: #4b5563; padding: 2px 6px; border-radius: 4px; font-size: 10px; margin-right: 6px;">${lang}</span>
                            <span title="${originalText}">"${originalText.substring(0, 40)}${originalText.length > 40 ? '...' : ''}"</span>
                        </div>
                        
                        <!-- Container with parsed and expandable HTML -->
                        <div style="background: #f9fafb; padding: 10px; border-radius: 6px; border: 1px solid #f3f4f6; margin-bottom: 8px;">
                            <div class="cache-content-wrapper" style="font-size: 13px; color: #4b5563; max-height: 60px; overflow: hidden; position: relative; white-space: pre-wrap; line-height: 1.5; scrollbar-width: thin; transition: max-height 0.3s ease;">
                                ${formattedContent}
                            </div>
                            <button class="btn-toggle-expand" style="background: none; border: none; color: #4f46e5; font-size: 11px; cursor: pointer; padding: 6px 0 0 0; font-weight: bold; width: 100%; text-align: center; border-top: 1px dashed #e5e7eb; margin-top: 6px;">${chrome.i18n.getMessage("cacheShowMore")}</button>
                        </div>

                        <div class="cache-meta">${chrome.i18n.getMessage("cacheDatePrefix")}${dateStr}</div>
                    </div>
                    <button class="btn-delete-cache" data-key="${key}" style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 18px; padding: 5px;" title="Borrar registro">🗑️</button>
                `;
                cacheContainer.appendChild(div);
            });

            // Assign individual delete events
            document.querySelectorAll('.btn-delete-cache').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const keyToDelete = e.target.closest('button').dataset.key;
                    delete cache[keyToDelete];
                    chrome.storage.local.set({ hovermind_cache: cache }, renderCache);
                });
            });

            // Hide expand button if text is very short (less than 60px high)
            document.querySelectorAll('.cache-content-wrapper').forEach(wrapper => {
                if (wrapper.scrollHeight <= 60) {
                    wrapper.nextElementSibling.style.display = 'none';
                }
            });

            // Logic for Show More / Show Less button
            document.querySelectorAll('.btn-toggle-expand').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const wrapper = e.target.previousElementSibling;
                    if (wrapper.style.maxHeight === '60px') {
                        wrapper.style.maxHeight = '300px';
                        wrapper.style.overflowY = 'auto';
                        e.target.textContent = chrome.i18n.getMessage("cacheShowLess");
                    } else {
                        wrapper.style.maxHeight = '60px';
                        wrapper.style.overflowY = 'hidden';
                        e.target.textContent = chrome.i18n.getMessage("cacheShowMore");
                    }
                });
            });
        });
    }

    // Delete all cache button
    clearCacheBtn.addEventListener('click', () => {
        if (confirm(chrome.i18n.getMessage("cacheConfirmClear"))) {
            chrome.storage.local.remove('hovermind_cache', renderCache);
        }
    });

    // Initial cache load
    renderCache();
});