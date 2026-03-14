# ✨ HoverMind: Tu Asistente de IA en el Navegador

HoverMind es una extensión para Google Chrome basada en el modelo **BYOK (Bring Your Own Key)**. Selecciona cualquier texto en la web y obtén contexto, explicaciones o traducciones instantáneas utilizando tus modelos de Inteligencia Artificial favoritos, sin suscripciones de terceros y manteniendo el control de tus datos.

## 🚀 Características Principales

* **Soporte Multi-Motor:** Integración nativa con las APIs de **OpenAI (ChatGPT), Google Gemini, Anthropic (Claude) y DeepSeek**.
* **Fallback Gratuito:** Si no tienes API Keys o te quedas sin saldo, HoverMind utiliza de forma inteligente la API gratuita de **Wikipedia** y la búsqueda de Google como red de seguridad.
* **Interfaz No Intrusiva:** Aparece un botón contextual (`✨ HoverMind`) solo cuando seleccionas texto (con el ratón o atajos de teclado).
* **Ventana Flotante Inteligente:** Un popup arrastrable (Drag & Drop) que se adapta a los márgenes de la pantalla y persigue el texto original al hacer scroll.
* **Internacionalización (i18n):** Adaptación automática al idioma del navegador (Soporte actual: Español e Inglés), incluyendo prompts dinámicos.
* **Privacidad Total:** Tus API Keys se guardan cifradas en el almacenamiento local de Chrome (`chrome.storage.sync`). Ningún dato pasa por servidores intermedios.

## 🛠️ Tecnologías Utilizadas

* **Vanilla JavaScript (ES6+)**
* **HTML5 & CSS3**
* **Chrome Extension API (Manifest V3)**
* Arquitectura asíncrona (Promesas y `async/await`)

## 📦 Instalación Local (Modo Desarrollador)

Como esta extensión te permite usar tus propias claves, puedes instalarla directamente desde este repositorio:

1. Clona este repositorio o descarga el archivo `.zip` y extráelo.
   \`\`\`bash
   git clone https://github.com/chrgiga/hovermind.git
   \`\`\`
2. Abre Google Chrome y ve a \`chrome://extensions/\`.
3. Activa el **"Modo desarrollador"** (Developer mode) en la esquina superior derecha.
4. Haz clic en **"Cargar descomprimida"** (Load unpacked) y selecciona la carpeta de \`HoverMind\`.

## ⚙️ Configuración

1. Haz clic en el icono de HoverMind en tu barra de extensiones.
2. Selecciona **"Opciones"** (o haz clic en el botón de la propia extensión cuando te avise de que falta la clave).
3. Selecciona tu proveedor de IA favorito en el menú desplegable.
4. Pega tu API Key oficial (puedes obtenerlas en las consolas de desarrollador de OpenAI, Google AI Studio, Anthropic o DeepSeek).
5. ¡Guarda y empieza a seleccionar texto!

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - mira el archivo [LICENSE](LICENSE) para más detalles.