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
    if (request.mode === 'translation') {
        await callFreeTranslation(request.text, request.lang, port);
        return;
    }

    chrome.storage.sync.get(['provider', 'geminiKey', 'openaiKey', 'anthropicKey', 'deepseekKey'], async (config) => {
        const provider = config.provider || 'google';

        try {
            if (provider === 'openai') {
                if (!config.openaiKey) return port.postMessage({ errorHtml: getMissingKeyUI() });
                await callOpenAIStream(request.text, config.openaiKey, port, request.lang);
            }
            else if (provider === 'gemini') {
                if (!config.geminiKey) return port.postMessage({ errorHtml: getMissingKeyUI() });
                await callGeminiStream(request.text, config.geminiKey, port, request.lang);
            }
            else if (provider === 'anthropic') {
                if (!config.anthropicKey) return port.postMessage({ errorHtml: getMissingKeyUI() });
                await callAnthropicStream(request.text, config.anthropicKey, port, request.lang);
            }
            else if (provider === 'deepseek') {
                if (!config.deepseekKey) return port.postMessage({ errorHtml: getMissingKeyUI() });
                await callDeepSeekStream(request.text, config.deepseekKey, port, request.lang);
            }
            else {
                port.postMessage({ errorHtml: await buildFallbackUI(text) });
            }
        } catch (error) {
            port.postMessage({ errorHtml: await buildFallbackUI(text, error.message) });
        }
    });
}

async function readStream(response, port, extractTextFn) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            let lines = buffer.split('\n');
            buffer = lines.pop(); // Guardar el fragmento incompleto para la siguiente iteración

            for (let line of lines) {
                line = line.trim();

                if (line.startsWith('data:')) {
                    const dataStr = line.slice(5).trim();
                    if (dataStr === '[DONE]' || dataStr === '') continue;

                    try {
                        const parsed = JSON.parse(dataStr);
                        const textChunk = extractTextFn(parsed);
                        if (textChunk) {
                            port.postMessage({ chunk: textChunk });
                        }
                    } catch (e) {
                        // Ignoramos fragmentos JSON rotos (muy común en streams)
                    }
                }
            }
        }
    } catch (e) {
        port.postMessage({ errorHtml: await buildFallbackUI("Error", hrome.i18n.getMessage("errStream")) });
    } finally {
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
async function callFreeTranslation(text, targetLang, port) {
    // targetLang será 'es' o 'en'. Autodetect averigua el idioma de origen.
    const langPair = `Autodetect|${targetLang}`;
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langPair}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.responseData && data.responseData.translatedText) {
            // Enviamos el texto completo al túnel. 
            // ¡El motor de escritura fluida del content.js se encargará de animarlo!
            port.postMessage({ chunk: data.responseData.translatedText });
            port.postMessage({ done: true });
        } else {
            throw new Error("No se pudo traducir el texto.");
        }
    } catch (error) {
        port.postMessage({ errorHtml: await buildFallbackUI(text, "Error en el servicio de traducción gratuito.") });
        port.postMessage({ done: true });
    }
}

// Proveedores
async function callOpenAIStream(text, key, port, lang) {
    const prompt = buildDynamicPrompt(lang);
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
        body: JSON.stringify({
            model: "gpt-3.5-turbo",
            stream: true,
            messages: [{ role: "system", content: prompt }, { role: "user", content: text }]
        })
    });
    if (!response.ok) throw new Error(chrome.i18n.getMessage("errOpenAI") || "Llave incorrecta");
    await readStream(response, port, (parsed) => parsed.choices?.[0]?.delta?.content);
}

async function callGeminiStream(text, key, port, lang) {
    const prompt = buildDynamicPrompt(lang, text);
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:streamGenerateContent?alt=sse&key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: `${prompt}"${text}"` }] }] })
    });
    if (!response.ok) throw new Error(chrome.i18n.getMessage("errGemini") || "Llave incorrecta");
    await readStream(response, port, (parsed) => parsed.candidates?.[0]?.content?.parts?.[0]?.text);
}

async function callAnthropicStream(text, key, port, lang) {
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
            model: "claude-3-haiku-20240307",
            max_tokens: 1024,
            stream: true,
            system: prompt,
            messages: [{ role: "user", content: text }]
        })
    });
    if (!response.ok) throw new Error(chrome.i18n.getMessage("errAnthropic") || "Llave incorrecta");
    await readStream(response, port, (parsed) => {
        if (parsed.type === 'content_block_delta') return parsed.delta?.text;
        return null;
    });
}

async function callDeepSeekStream(text, key, port, lang) {
    const prompt = buildDynamicPrompt(lang);
    const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
        body: JSON.stringify({
            model: "deepseek-chat",
            stream: true,
            messages: [{ role: "system", content: prompt }, { role: "user", content: text }]
        })
    });
    if (!response.ok) throw new Error(chrome.i18n.getMessage("errDeepSeek") || "Llave incorrecta");
    await readStream(response, port, (parsed) => parsed.choices?.[0]?.delta?.content);
}

// Fallbacks
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