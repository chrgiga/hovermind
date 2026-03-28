# ✨ HoverMind: Your AI Assistant in the Browser

[![Available in the Chrome Web Store](https://img.shields.io/badge/Chrome_Web_Store-Available-blue?logo=google-chrome&logoColor=white&style=for-the-badge)](https://chromewebstore.google.com/detail/bjbmfolbemhnfjghekgdjligmfaaoceg?utm_source=item-share-cb)

HoverMind is a Google Chrome extension based on the **BYOK (Bring Your Own Key)** and **BYOM (Bring Your Own Model)** philosophy. Select any text on the web and get instant context, explanations, or translations using your favorite Artificial Intelligence models. No third-party subscriptions, save on tokens, and keep absolute control over your data.

## 🚀 Key Features

* **Universal Multi-Engine API Support:** Native integration with **OpenAI (ChatGPT), Google Gemini, and Anthropic (Claude)**. Thanks to its dynamic endpoint configuration, you can use any OpenAI-compatible API (DeepSeek, OpenRouter, Groq, Local LLMs, etc.).

* **Futuristic Glassmorphism UI:** A beautifully redesigned floating toolbar and response popup that automatically adapt to your system's Light/Dark theme. Enjoy a premium frosted glass effect with neon interactive accents.

* **Real-Time Markdown Rendering:** AI responses are formatted on the fly during the streaming typewriter effect. Enjoy bold text, perfectly structured lists, and highlighted code blocks right inside the popup.

* **Global Multilingual Support:** Need a translation or definition in Japanese, Russian, or Hindi? Use the new smart dropdown menu featuring a real-time search filter to instantly choose from over 30 supported languages.

* **Smart Cache & History Dashboard:** HoverMind memorizes your recent queries locally. If you consult the same text again, the response is instant and costs zero API tokens. Manage, expand, or delete your past queries in the dedicated History panel.

* **Free Translation Engine:** Just want a quick translation? Use the "Translate" mode backed by the free MyMemory API, saving your AI power for complex definitions.

* **Smart & Non-Intrusive Workflow:** A draggable (Drag & Drop) floating window with a new "Back" button, allowing you to switch between translating and defining without losing your text selection. It instantly cuts background connections when closed to save bandwidth.

* **Total Privacy:** Your API Keys and query history are stored safely in your browser's local storage (chrome.storage.local and sync). No data is ever sent to middleman servers.

## 🛠️ Technologies Used

* **Vanilla JavaScript (ES6+)**

* **HTML5 & Custom CSS** (CSS Variables, Flexbox, Grid, Glassmorphism)

* **Chrome Extension API (Manifest V3)**

* **Asynchronous Architecture** (Promises, async/await, and Server-Sent Events for streaming)

* **Lightweight Custom Markdown Parser** (Zero external dependencies)

* **HTML5 Native Drag & Drop API**

## 📦 Installation

### 🌐 Official Chrome Web Store (Recommended)

The easiest and safest way to install HoverMind is directly from the official store:

👉 [**Install HoverMind from the Chrome Web Store**](https://chromewebstore.google.com/detail/bjbmfolbemhnfjghekgdjligmfaaoceg?utm_source=item-share-cb)

### 🛠️ Local Installation (Developer Mode)

Since this extension allows you to use your own API keys, you can also install it manually from this repository:

1. Clone this repository or download and extract the .zip file.

   git clone https://github.com/chrgiga/hovermind.git

2. Open Google Chrome and navigate to chrome://extensions/.

3. Enable **"Developer mode"** in the top right corner.

4. Click on **"Load unpacked"** and select the HoverMind folder.

## ⚙️ Configuration and Usage

1. Select any text in your browser and click the gear icon (⚙️) on the floating toolbar to access **Options** (or open it from the Chrome extensions menu).

2. In the **AI Providers & Models** section, use the dropdown to add a new API configuration.

3. Enter the Endpoint URL, your API Key, and the exact Model name you want to use (e.g., gpt-4o, claude-3-5-sonnet-latest). Save your settings.

4. You can add multiple providers, but ensure only the one you want to use is selected via the radio button.

5. You're all set! Go back to any webpage, select some text, choose your target language from the smart dropdown, and let the AI do its magic.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.