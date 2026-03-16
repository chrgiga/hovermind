// --- MOTOR DE CACHÉ ---
// Ahora la clave de caché incluye el modelo para no mezclar respuestas
function getCache(text, mode, lang, model) {
    return new Promise(resolve => {
        chrome.storage.local.get(['hovermind_cache'], (res) => {
            const cache = res.hovermind_cache || {};
            const key = `${mode}_${lang}_${model}_${text}`;
            resolve(cache[key] || null);
        });
    });
}

function setCache(text, mode, lang, model, responseText) {
    chrome.storage.local.get(['hovermind_cache'], (res) => {
        let cache = res.hovermind_cache || {};
        const key = `${mode}_${lang}_${model}_${text}`;
        cache[key] = responseText;

        // Límite de seguridad: guardamos solo las últimas 100 consultas para no saturar Chrome
        const keys = Object.keys(cache);
        if (keys.length > 100) {
            delete cache[keys[0]]; // Borra el registro más antiguo
        }

        chrome.storage.local.set({ hovermind_cache: cache });
    });
}

// --- CONEXIONES ---
chrome.runtime.onConnect.addListener((port) => {
    if (port.name === "hovermind-stream") {
        port.onMessage.addListener((request) => {
            if (request.action === "analyzeText") {
                handleAIStreamRequest(request, port);
            }
        });
    }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "openOptions") {
        chrome.runtime.openOptionsPage();
        sendResponse({ success: true });
    }
});

async function handleAIStreamRequest(request, port) {
    const text = request.text.trim();
    const mode = request.mode;
    const lang = request.lang;
    const selectedId = request.modelId; // ID del modelo seleccionado en la barra

    if (!text) {
        port.postMessage({ done: true });
        return;
    }

    // DESVÍO A TRADUCCIÓN GRATUITA
    if (mode === 'translation') {
        // Interceptor de caché específico para traducciones (usamos 'mymemory' como modelo)
        const cachedResponse = await getCache(text, mode, lang, 'mymemory');
        if (cachedResponse) {
            port.postMessage({ chunk: cachedResponse });
            port.postMessage({ done: true });
            return;
        }
        await callFreeTranslation(text, lang, port, mode);
        return;
    }

    // LLAMADA A IAs (Definición) - Motor Dinámico BYOM
    chrome.storage.sync.get(['customModels', 'geminiKey', 'openaiKey', 'anthropicKey', 'deepseekKey'], async (config) => {
        try {
            // Buscamos el modelo en la lista (o usamos un fallback por seguridad)
            const models = config.customModels || [
                { id: "fallback", provider: "gemini", apiModel: "gemini-latest-flash" }
            ];
            const modelDef = models.find(m => m.id === selectedId) || models[0];

            if (!modelDef) throw new Error("No hay modelos configurados en las opciones.");

            const provider = modelDef.provider;
            const apiModel = modelDef.apiModel;

            // INTERCEPTOR DE CACHÉ PARA IA (Usando el modelo exacto)
            const cachedResponse = await getCache(text, mode, lang, apiModel);
            if (cachedResponse) {
                port.postMessage({ chunk: cachedResponse });
                port.postMessage({ done: true });
                return;
            }

            if (provider === 'openai') {
                if (!config.openaiKey) return port.postMessage({ errorHtml: getMissingKeyUI() });
                await callOpenAIStream(text, config.openaiKey, port, mode, lang, apiModel);
            }
            else if (provider === 'gemini') {
                if (!config.geminiKey) return port.postMessage({ errorHtml: getMissingKeyUI() });
                await callGeminiStream(text, config.geminiKey, port, mode, lang, apiModel);
            }
            else if (provider === 'anthropic') {
                if (!config.anthropicKey) return port.postMessage({ errorHtml: getMissingKeyUI() });
                await callAnthropicStream(text, config.anthropicKey, port, mode, lang, apiModel);
            }
            else if (provider === 'deepseek') {
                if (!config.deepseekKey) return port.postMessage({ errorHtml: getMissingKeyUI() });
                await callDeepSeekStream(text, config.deepseekKey, port, mode, lang, apiModel);
            }
            else {
                port.postMessage({ errorHtml: await buildFallbackUI(text, "Proveedor de IA no reconocido.") });
            }
        } catch (error) {
            port.postMessage({ errorHtml: await buildFallbackUI(text, error.message) });
        }
    });
}

async function readStream(response, port, extractTextFn, text, mode, lang, apiModel) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";
    let fullResponseText = "";

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            let lines = buffer.split('\n');
            buffer = lines.pop();

            for (let line of lines) {
                line = line.trim();

                if (line.startsWith('data:')) {
                    const dataStr = line.slice(5).trim();
                    if (dataStr === '[DONE]' || dataStr === '') continue;

                    try {
                        const parsed = JSON.parse(dataStr);
                        const textChunk = extractTextFn(parsed);
                        if (textChunk) {
                            fullResponseText += textChunk;
                            port.postMessage({ chunk: textChunk });
                        }
                    } catch (e) { }
                }
            }
        }
    } catch (e) {
        port.postMessage({ errorHtml: await buildFallbackUI("Error", chrome.i18n.getMessage("errStream")) });
    } finally {
        if (fullResponseText.trim().length > 0) {
            setCache(text, mode, lang, apiModel, fullResponseText); // Guardamos usando apiModel
        }
        port.postMessage({ done: true });
    }
}

// --- GENERADOR DINÁMICO DE PROMPTS ---
function buildDynamicPrompt(lang, text = '') {
    let prompt = lang == 'es' ? "Eres un asistente experto. Tu tarea es analizar el texto indicado. REGLA ESTRICTA: Debes responder SIEMPRE en español, sin importar en qué idioma esté el texto original. Explica de forma clara y concisa el contexto o significado del texto." : "You are an expert assistant. Your task is to analyze the indicated text. STRICT RULE: You must ALWAYS answer in english, regardless of the original language. Clearly and concisely explain the context or meaning of the text.";

    if (text.length > 0) {
        prompt += "\n\n" + (lang == 'es' ? "Texto indicado" : "Indicated text") + ": " + text;
    }

    return prompt;
}

// --- TRADUCTOR GRATUITO (MyMemory API) ---
async function callFreeTranslation(text, targetLang, port, mode) {
    const langPair = `Autodetect|${targetLang}`;
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langPair}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.responseData && data.responseData.translatedText) {
            const resultText = data.responseData.translatedText;
            setCache(text, mode, targetLang, 'mymemory', resultText); // GUARDAMOS EN CACHÉ
            port.postMessage({ chunk: resultText });
            port.postMessage({ done: true });
        } else {
            throw new Error("No se pudo traducir el texto.");
        }
    } catch (error) {
        port.postMessage({ errorHtml: await buildFallbackUI(text, "Error en el servicio de traducción gratuito.") });
        port.postMessage({ done: true });
    }
}

// --- Proveedores Dinámicos ---
async function callOpenAIStream(text, key, port, mode, lang, apiModel) {
    const prompt = buildDynamicPrompt(lang);
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
        body: JSON.stringify({
            model: apiModel, // Dinámico
            stream: true,
            messages: [{ role: "system", content: prompt }, { role: "user", content: text }]
        })
    });
    if (!response.ok) throw new Error(chrome.i18n.getMessage("errOpenAI") || "Llave incorrecta");
    await readStream(response, port, (parsed) => parsed.choices?.[0]?.delta?.content, text, mode, lang, apiModel);
}

async function callGeminiStream(text, key, port, mode, lang, apiModel) {
    const prompt = buildDynamicPrompt(lang, text);
    // Dinámico en la URL de Google
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${apiModel}:streamGenerateContent?alt=sse&key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    console.log(response);
    if (!response.ok) {
        let apiErrorMsg = `HTTP Error ${response.status}`;
        try {
            const errorData = await response.json();
            apiErrorMsg = errorData.error?.message || apiErrorMsg;
        } catch (e) { }

        throw new Error(`Google API: ${apiErrorMsg}`);
    }
    await readStream(response, port, (parsed) => parsed.candidates?.[0]?.content?.parts?.[0]?.text, text, mode, lang, apiModel);
}

async function callAnthropicStream(text, key, port, mode, lang, apiModel) {
    const prompt = buildDynamicPrompt(lang);
    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': key,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
            model: apiModel, // Dinámico
            max_tokens: 1024,
            stream: true,
            system: prompt,
            messages: [{ role: "user", content: text }]
        })
    });
    if (!response.ok) throw new Error(chrome.i18n.getMessage("errAnthropic") || "Llave incorrecta");
    await readStream(response, port, (parsed) => (parsed.type === 'content_block_delta') ? parsed.delta?.text : null, text, mode, lang, apiModel);
}

async function callDeepSeekStream(text, key, port, mode, lang, apiModel) {
    const prompt = buildDynamicPrompt(lang);
    const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
        body: JSON.stringify({
            model: apiModel, // Dinámico
            stream: true,
            messages: [{ role: "system", content: prompt }, { role: "user", content: text }]
        })
    });
    if (!response.ok) throw new Error(chrome.i18n.getMessage("errDeepSeek") || "Llave incorrecta");
    await readStream(response, port, (parsed) => parsed.choices?.[0]?.delta?.content, text, mode, lang, apiModel);
}

// --- FALLBACKS Y UIs DE ERROR ---
function getMissingKeyUI() {
    const msgMissing = chrome.i18n.getMessage("missingKey") || "Falta API Key";
    const msgBtn = chrome.i18n.getMessage("configBtn") || "Configurar";
    return `<div style="text-align: center; padding: 10px 0;"><p style="color: #ef4444; margin-top: 0;">${msgMissing}</p><button id="hovermind-open-options-btn" style="background-color: #4f46e5; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: bold; margin-top: 5px;">${msgBtn}</button></div>`;
}

async function buildFallbackUI(text, errorMsg = null) {
    const cleanText = text.trim().substring(0, 50);
    const query = encodeURIComponent(cleanText);
    const txtSearch = chrome.i18n.getMessage("searchGoogle") || "Buscar en Google";
    let html = ``;
    if (errorMsg) html += `<p style="color: #ef4444; font-size: 12px; margin-bottom: 12px; margin-top: 0;"><em>Error: ${errorMsg}</em></p>`;
    html += `<div style="margin-bottom: 15px;"><a href="https://www.google.com/search?q=${query}" target="_blank" style="display: inline-block; background-color: #f3f4f6; color: #1f2937; padding: 8px 12px; border-radius: 6px; text-decoration: none; font-weight: bold; border: 1px solid #d1d5db;">${txtSearch}</a></div>`;
    return html;
}