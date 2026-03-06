# ✨ HoverMind: Tu Asistente en el Navegador

HoverMind es una extensión para Google Chrome. Selecciona cualquier texto en la web y obtén contexto e explicaciones instantáneas directamente desde **Wikipedia** y **Google Search**, de manera rápida y sin salir de tu pestaña actual.

## 🚀 Características Principales

* **Búsqueda Instantánea:** Selecciona cualquier texto para buscar automáticamente su contexto o definición en Wikipedia o realizar una búsqueda en Google.
* **Interfaz No Intrusiva:** Aparece un botón contextual (`✨ HoverMind`) solo cuando seleccionas texto (con el ratón o atajos de teclado).
* **Ventana Flotante Inteligente:** Un popup arrastrable (Drag & Drop) que se adapta a los márgenes de la pantalla y persigue el texto original al hacer scroll.

## 🛠️ Tecnologías Utilizadas

* **Vanilla JavaScript (ES6+)**
* **HTML5 & CSS3**
* **Chrome Extension API (Manifest V3)**
* Arquitectura asíncrona (Promesas y `async/await`)

## 📦 Instalación Local (Modo Desarrollador)

Puedes instalar la extensión para probarla localmente:

1. Clona este repositorio o descarga el archivo `.zip` y extráelo.
   ```bash
   git clone https://github.com/chrgiga/hovermind.git
   ```
2. Abre Google Chrome y ve a `chrome://extensions/`.
3. Activa el **"Modo desarrollador"** (Developer mode) en la esquina superior derecha.
4. Haz clic en **"Cargar descomprimida"** (Load unpacked) y selecciona la carpeta de la extensión (`extension-init`).

## ⚙️ Uso Básico

1. Selecciona cualquier texto en una página web.
2. Al aparecer la ventana de HoverMind, podrás consultar instantáneamente la información obtenida desde Wikipedia o lanzar una búsqueda en Google para ese texto específico.

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - mira el archivo [LICENSE](LICENSE) para más detalles.