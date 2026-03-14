chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "analyzeText") {
        handleAIRequest(request.text)
            .then(response => sendResponse({ result: response }))
            .catch(error => {
                const errMsg = chrome.i18n.getMessage("unexError");
                sendResponse({ result: `${errMsg}${error.message}` });
            });
        return true;
    } else if (request.action === "openOptions") {
        chrome.runtime.openOptionsPage();
        sendResponse({ success: true });
    }
});

async function handleAIRequest(text) {
    return new Promise((resolve) => {
        chrome.storage.sync.get(['provider', 'geminiKey', 'openaiKey', 'anthropicKey', 'deepseekKey'], async (config) => {
            const provider = config.provider || 'google';

            try {
                if (provider === 'openai') {
                    if (!config.openaiKey) return resolve(getMissingKeyUI());
                    resolve(await callOpenAI(text, config.openaiKey));
                }
                else if (provider === 'gemini') {
                    if (!config.geminiKey) return resolve(getMissingKeyUI());
                    resolve(await callGemini(text, config.geminiKey));
                }
                else if (provider === 'anthropic') {
                    if (!config.anthropicKey) return resolve(getMissingKeyUI());
                    resolve(await callAnthropic(text, config.anthropicKey));
                }
                else if (provider === 'deepseek') {
                    if (!config.deepseekKey) return resolve(getMissingKeyUI());
                    resolve(await callDeepSeek(text, config.deepseekKey));
                }
                else {
                    resolve(await buildFallbackUI(text));
                }
            } catch (error) {
                resolve(await buildFallbackUI(text, error.message));
            }
        });
    });
}

// UI: Falta la API Key
function getMissingKeyUI() {
    const msgMissing = chrome.i18n.getMessage("missingKey");
    const msgBtn = chrome.i18n.getMessage("configBtn");

    return `
        <div style="text-align: center; padding: 10px 0;">
            <p style="color: #ef4444; margin-top: 0;">${msgMissing}</p>
            <button id="hovermind-open-options-btn" style="background-color: #4f46e5; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: bold; margin-top: 5px; transition: background 0.2s;">${msgBtn}</button>
        </div>
    `;
}

// UI: Fallback (Google / Wikipedia Multi-idioma)
async function buildFallbackUI(text, errorMsg = null) {
    const cleanText = text.trim().substring(0, 50);
    const query = encodeURIComponent(cleanText);
    const searchUrl = `https://www.google.com/search?q=${query}`;

    // Obtenemos los textos traducidos
    const txtAiFailed = chrome.i18n.getMessage("aiFailed");
    const txtAlts = chrome.i18n.getMessage("alternatives");
    const txtSearch = chrome.i18n.getMessage("searchGoogle");
    const txtWikiTitle = chrome.i18n.getMessage("wikiTitle");
    const txtReadMore = chrome.i18n.getMessage("readMore");
    const txtNoWiki = chrome.i18n.getMessage("noWiki");

    // Detectamos el idioma del navegador para buscar en la Wikipedia correcta
    const uiLang = chrome.i18n.getUILanguage();
    const wikiLang = uiLang.startsWith('es') ? 'es' : 'en';

    let html = ``;
    if (errorMsg) html += `<p style="color: #ef4444; font-size: 12px; margin-bottom: 12px; margin-top: 0;"><em>${txtAiFailed}${errorMsg}${txtAlts}</em></p>`;

    html += `<div style="margin-bottom: 15px;"><a href="${searchUrl}" target="_blank" style="display: inline-block; background-color: #f3f4f6; color: #1f2937; padding: 8px 12px; border-radius: 6px; text-decoration: none; font-weight: bold; border: 1px solid #d1d5db;">${txtSearch}</a></div>`;

    try {
        const wikiResponse = await fetch(`https://${wikiLang}.wikipedia.org/api/rest_v1/page/summary/${query}`);
        if (wikiResponse.ok) {
            const wikiData = await wikiResponse.json();
            if (wikiData.extract) {
                html += `<div style="border-top: 1px solid #e5e7eb; padding-top: 12px;"><p style="margin-top: 0; margin-bottom: 5px;"><strong>${txtWikiTitle}</strong></p><p style="margin-top: 0; font-size: 13.5px;">${wikiData.extract}</p><a href="${wikiData.content_urls.desktop.page}" target="_blank" style="color: #4f46e5; text-decoration: none; font-weight: bold; font-size: 12px;">${txtReadMore}</a></div>`;
            } else throw new Error();
        } else throw new Error();
    } catch (err) {
        html += `<div style="border-top: 1px solid #e5e7eb; padding-top: 12px; color: #6b7280; font-size: 13px;"><em>${txtNoWiki}</em></div>`;
    }
    return html;
}

// 1. OpenAI
async function callOpenAI(text, key) {
    const prompt = chrome.i18n.getMessage("systemPrompt");

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Authorization": `Bearer ${key}`
        },
        body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
                ...(prompt ? [{ role: "system", content: prompt }] : []),
                { role: "user", content: text }
            ],
            temperature: 0.7,
            max_tokens: 500
        })
    });

    if (!response.ok) {
        const errText = await response.text();
        console.error("OpenAI API error:", errText);
        throw new Error(chrome.i18n.getMessage("errOpenAI"));
    }

    const data = await response.json();

    if (!data?.choices?.length) {
        console.error("Unexpected OpenAI response:", data);
        throw new Error(chrome.i18n.getMessage("errOpenAI"));
    }

    const content = data.choices[0].message?.content ?? "";

    return `<p>${content.replace(/\n/g, "<br>")}</p>`;
}

// 2. Gemini
async function callGemini(text, key) {
    const promptGemini = chrome.i18n.getMessage("systemPromptGemini");
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-goog-api-key': key },
        body: JSON.stringify({ contents: [{ parts: [{ text: `${promptGemini}"${text}"` }] }] })
    });
    if (!response.ok) throw new Error(chrome.i18n.getMessage("errGemini"));
    const data = await response.json();
    return `<p>${data.candidates[0].content.parts[0].text.replace(/\n/g, '<br>')}</p>`;
}

// 3. Anthropic (Claude)
async function callAnthropic(text, key) {
    const prompt = chrome.i18n.getMessage("systemPrompt");
    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Api-Key': key,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
            model: "claude-opus-4-6",
            max_tokens: 1024,
            system: prompt,
            messages: [{ role: "user", content: text }]
        })
    });
    if (!response.ok) throw new Error(chrome.i18n.getMessage("errAnthropic"));
    const data = await response.json();
    return `<p>${data.content[0].text.replace(/\n/g, '<br>')}</p>`;
}

// 4. DeepSeek
async function callDeepSeek(text, key) {
    const prompt = chrome.i18n.getMessage("systemPrompt");
    const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
        body: JSON.stringify({
            model: "deepseek-chat",
            messages: [{ role: "system", content: prompt }, { role: "user", content: text }]
        })
    });
    if (!response.ok) throw new Error(chrome.i18n.getMessage("errDeepSeek"));
    const data = await response.json();
    return `<p>${data.choices[0].message.content.replace(/\n/g, '<br>')}</p>`;
}