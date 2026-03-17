# ✨ HoverMind: Tu Asistente de IA en el Navegador

HoverMind es una extensión para Google Chrome basada en el modelo **BYOK (Bring Your Own Key)** y **BYOM (Bring Your Own Model)**. Selecciona cualquier texto en la web y obtén contexto, explicaciones o traducciones instantáneas utilizando tus propios modelos de Inteligencia Artificial favoritos, sin suscripciones de terceros, ahorrando tokens y manteniendo el control total de tus datos.

## 🚀 Características Principales

* **Soporte Multi-Motor y BYOM:** Integración nativa con las APIs de **OpenAI (ChatGPT), Google Gemini, Anthropic (Claude) y DeepSeek**. Además, gracias a su **Gestor de Modelos Dinámico**, puedes añadir, editar, reordenar y utilizar cualquier modelo nuevo que estas empresas lancen en el futuro sin esperar a que se actualice la extensión.
* **Ahorro de Tokens (Caché Inteligente):** HoverMind memoriza tus consultas recientes de forma cronológica. Si vuelves a consultar un texto, la respuesta será instantánea y no gastará saldo de tu API. Incluye un panel para revisar tu historial de consultas.
* **Motor de Traducción Gratuita:** ¿Solo quieres traducir? Utiliza el modo "Traducir" respaldado por la API gratuita de MyMemory, reservando el poder de la IA solo para definiciones complejas.
* **Interfaz Minimalista y No Intrusiva:** Al seleccionar texto, aparece una elegante pastilla flotante que te permite ejecutar tu acción por defecto con un solo clic, o desplegar los ajustes rápidos (⚙️) para cambiar de IA al vuelo.
* **Ventana Flotante Inteligente:** Un popup arrastrable (Drag & Drop) con efecto de "máquina de escribir" en tiempo real por streaming.
* **Internacionalización (i18n):** Interfaz y prompts dinámicos adaptados automáticamente al español o inglés según la configuración de tu navegador.
* **Privacidad Total:** Tus API Keys se guardan cifradas en el almacenamiento local de Chrome (`chrome.storage.sync`). Ningún dato pasa por servidores intermedios.

## 🛠️ Tecnologías Utilizadas

* **Vanilla JavaScript (ES6+)**
* **HTML5 & CSS3 (CSS Grid & Flexbox)**
* **Chrome Extension API (Manifest V3)**
* Arquitectura asíncrona (Promesas, `async/await` y *Server-Sent Events* para el Streaming).
* API nativa de Drag & Drop de HTML5.

## 📦 Instalación Local (Modo Desarrollador)

Como esta extensión te permite usar tus propias claves, puedes instalarla directamente desde este repositorio:

1. Clona este repositorio o descarga el archivo `.zip` y extráelo.
   \`\`\`bash
   git clone https://github.com/chrgiga/hovermind.git
   \`\`\`
2. Abre Google Chrome y ve a \`chrome://extensions/\`.
3. Activa el **"Modo desarrollador"** (Developer mode) en la esquina superior derecha.
4. Haz clic en **"Cargar descomprimida"** (Load unpacked) y selecciona la carpeta de \`HoverMind\`.

## ⚙️ Configuración y Uso

1. Selecciona cualquier texto en el navegador y haz clic en el icono del engranaje (⚙️) de la barra flotante para acceder a **Opciones** (o desde el menú de extensiones de Chrome).
2. En la sección **Claves de Acceso**, pega las API Keys de los proveedores que desees utilizar y guárdalas.
3. En la sección **Gestor de Modelos (BYOM)**, puedes añadir, borrar, editar o reordenar los modelos de IA exactos que quieres que te aparezcan al usar la extensión.
4. En **Ajustes Generales**, selecciona tu acción por defecto (Traducir o Definir) y tu modelo favorito.
5. ¡Listo! Vuelve a cualquier página, selecciona texto y deja que la IA haga su magia.

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - mira el archivo [LICENSE](LICENSE) para más detalles.