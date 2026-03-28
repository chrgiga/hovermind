// Cache engine
function getCacheKey(text, mode, lang, model) {
    const cleanText = text.replace(/[\s\u200B-\u200D\uFEFF]+/g, ' ').trim().toLowerCase();
    return `${mode}_${lang}_${model}_${cleanText}`;
}

function getCache(text, mode, lang, model) {
    return new Promise(resolve => {
        chrome.storage.local.get(['hovermind_cache'], (res) => {
            const cache = res.hovermind_cache || {};
            const entry = cache[getCacheKey(text, mode, lang, model)];

            // Backward compatibility: handle old string entries and new object entries
            if (entry) {
                resolve(typeof entry === 'string' ? entry : entry.text);
            } else {
                resolve(null);
            }
        });
    });
}

function setCache(text, mode, lang, model, responseText) {
    chrome.storage.local.get(['hovermind_cache'], (res) => {
        let cache = res.hovermind_cache || {};

        // Store object with text and timestamp
        cache[getCacheKey(text, mode, lang, model)] = {
            text: responseText,
            timestamp: Date.now()
        };

        const entries = Object.entries(cache);
        if (entries.length > 100) {
            // Sort by timestamp to remove oldest
            entries.sort((a, b) => {
                const timeA = typeof a[1] === 'object' ? a[1].timestamp : 0;
                const timeB = typeof b[1] === 'object' ? b[1].timestamp : 0;
                return timeA - timeB;
            });
            delete cache[entries[0][0]]; // Delete the oldest
        }

        chrome.storage.local.set({ hovermind_cache: cache });
    });
}

// Connections
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

    if (!text) {
        port.postMessage({ done: true });
        return;
    }

    // REDIRECT TO FREE TRANSLATION
    if (mode === 'translation') {
        const cachedResponse = await getCache(text, mode, lang, 'mymemory');
        if (cachedResponse) {
            port.postMessage({ chunk: cachedResponse });
            port.postMessage({ done: true });
            return;
        }
        await callFreeTranslation(text, lang, port, mode);
        return;
    }

    // CALL TO AIs (Definition/Analysis) - Agnostic Engine
    chrome.storage.sync.get(['aiConfigs'], async (config) => {
        try {
            // Look for the single active configuration
            const activeConfig = config.aiConfigs?.find(c => c.isActive);

            if (!activeConfig || !activeConfig.baseUrl) {
                return port.postMessage({ errorHtml: getMissingKeyUI() });
            }

            const providerFormat = activeConfig.provider; // 'openai', 'anthropic', or 'gemini'
            const apiModel = activeConfig.model;

            // CACHE INTERCEPTOR
            const cachedResponse = await getCache(text, mode, lang, apiModel);
            if (cachedResponse) {
                port.postMessage({ chunk: cachedResponse });
                port.postMessage({ done: true });
                return;
            }

            // ROUTER BY FORMAT
            if (providerFormat === 'openai') {
                await callOpenAIFormatStream(text, activeConfig, port, mode, lang);
            }
            else if (providerFormat === 'anthropic') {
                await callAnthropicFormatStream(text, activeConfig, port, mode, lang);
            }
            else if (providerFormat === 'gemini') {
                await callGeminiFormatStream(text, activeConfig, port, mode, lang);
            }
            else {
                throw new Error(chrome.i18n.getMessage("errRecognized") || "Unrecognized API format.");
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
            setCache(text, mode, lang, apiModel, fullResponseText);
        }
        port.postMessage({ done: true });
    }
}

// Language code to Name mapping for AI Prompts
const LANG_MAP = {
    "es": "Spanish", "en": "English", "fr": "French", "de": "German", "it": "Italian",
    "pt": "Portuguese", "ja": "Japanese", "zh": "Chinese", "ru": "Russian", "ko": "Korean",
    "ar": "Arabic", "hi": "Hindi", "nl": "Dutch", "tr": "Turkish", "pl": "Polish",
    "sv": "Swedish", "da": "Danish", "fi": "Finnish", "no": "Norwegian", "cs": "Czech",
    "el": "Greek", "he": "Hebrew", "id": "Indonesian", "ro": "Romanian", "hu": "Hungarian",
    "sk": "Slovak", "bg": "Bulgarian", "hr": "Croatian", "uk": "Ukrainian", "ca": "Catalan"
};

// Dynamic multi-language prompt generator
function buildDynamicPrompt(langCode, text = '') {
    // Look up English name for the prompt. Fallback to English.
    let langName = LANG_MAP[langCode] || "English";

    let prompt = `You are an expert assistant. Your task is to analyze the indicated text. STRICT RULE: You must ALWAYS answer in ${langName}, regardless of the original language of the text. Clearly and concisely explain the context or meaning of the text.`;

    if (text.length > 0) {
        prompt += "\n\nIndicated text: " + text;
    }
    return prompt;
}

// Free Translation (MyMemory API)
async function callFreeTranslation(text, targetLang, port, mode) {
    const langPair = `Autodetect|${targetLang}`;
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langPair}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.responseData && data.responseData.translatedText) {
            const resultText = data.responseData.translatedText;
            setCache(text, mode, targetLang, 'mymemory', resultText);
            port.postMessage({ chunk: resultText });
            port.postMessage({ done: true });
        } else {
            throw new Error(chrome.i18n.getMessage("errTranslation") || "Could not translate text.");
        }
    } catch (error) {
        port.postMessage({ errorHtml: await buildFallbackUI(text, chrome.i18n.getMessage("errFreeTrans") || "Error in free translation service.") });
        port.postMessage({ done: true });
    }
}

// Universal Format Engines

async function callOpenAIFormatStream(text, config, port, mode, lang) {
    const prompt = buildDynamicPrompt(lang);

    // Since it's a universal format (OpenAI), we only inject the Bearer Token if the user has provided an API Key
    const headers = { 'Content-Type': 'application/json' };
    if (config.apiKey) headers['Authorization'] = `Bearer ${config.apiKey}`;

    const response = await fetch(config.baseUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
            model: config.model,
            stream: true,
            messages: [{ role: "system", content: prompt }, { role: "user", content: text }]
        })
    });

    if (!response.ok) throw new Error(`${chrome.i18n.getMessage("errVerifyKey") || "Verify your Endpoint and API Key."} (HTTP ${response.status})`);
    await readStream(response, port, (parsed) => parsed.choices?.[0]?.delta?.content, text, mode, lang, config.model);
}

async function callAnthropicFormatStream(text, config, port, mode, lang) {
    const prompt = buildDynamicPrompt(lang);
    const response = await fetch(config.baseUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': config.apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
            model: config.model,
            max_tokens: 1024,
            stream: true,
            system: prompt,
            messages: [{ role: "user", content: text }]
        })
    });

    if (!response.ok) throw new Error(`${chrome.i18n.getMessage("errVerifyAnthropic") || "Verify your API Key de Anthropic."} (HTTP ${response.status})`);
    await readStream(response, port, (parsed) => (parsed.type === 'content_block_delta') ? parsed.delta?.text : null, text, mode, lang, config.model);
}

async function callGeminiFormatStream(text, config, port, mode, lang) {
    const prompt = buildDynamicPrompt(lang, text);

    // Gemini requires the model in the URL and the Key as a GET parameter
    let finalUrl = config.baseUrl.replace('{model}', config.model);
    if (!finalUrl.includes('?key=')) finalUrl += (finalUrl.includes('?') ? '&' : '?') + `key=${config.apiKey}`;
    if (!finalUrl.includes('alt=sse')) finalUrl += '&alt=sse';

    const response = await fetch(finalUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    if (!response.ok) throw new Error(`${chrome.i18n.getMessage("errVerifyGemini") || "Verify your API Key de Gemini."} (HTTP ${response.status})`);
    await readStream(response, port, (parsed) => parsed.candidates?.[0]?.content?.parts?.[0]?.text, text, mode, lang, config.model);
}

// Fallbacks and Error UIs
function getMissingKeyUI() {
    const msgMissing = chrome.i18n.getMessage("missingKey") || "Falta configurar la IA";
    const msgBtn = chrome.i18n.getMessage("configBtn") || "Abrir Opciones";
    return `<div style="text-align: center; padding: 10px 0;"><p style="color: #ef4444; margin-top: 0; font-weight: bold;">${msgMissing}</p><button id="hovermind-open-options-btn" style="background-color: #4f46e5; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: bold; margin-top: 5px;">${msgBtn}</button></div>`;
}

async function buildFallbackUI(text, errorMsg = null) {
    const cleanText = text.trim().substring(0, 50);
    const query = encodeURIComponent(cleanText);
    const txtSearch = chrome.i18n.getMessage("searchGoogle") || "Buscar en Google";
    let html = ``;
    if (errorMsg) html += `<p style="color: #ef4444; font-size: 13px; margin-bottom: 15px; margin-top: 0; background: #fee2e2; padding: 10px; border-radius: 6px;"><em>🚨 ${errorMsg}</em></p>`;
    html += `<div style="margin-bottom: 15px;"><a href="https://www.google.com/search?q=${query}" target="_blank" style="display: inline-block; background-color: #f3f4f6; color: #1f2937; padding: 8px 12px; border-radius: 6px; text-decoration: none; font-weight: bold; border: 1px solid #d1d5db;">${txtSearch}</a></div>`;
    return html;
}