document.addEventListener('DOMContentLoaded', () => {
    // Referencias de las API Keys
    const geminiKeyInput = document.getElementById('geminiKey');
    const openaiKeyInput = document.getElementById('openaiKey');
    const anthropicKeyInput = document.getElementById('anthropicKey');
    const deepseekKeyInput = document.getElementById('deepseekKey');
    const saveKeysBtn = document.getElementById('saveKeysBtn');
    const statusMessage = document.getElementById('statusMessage');

    // Modelos por defecto
    const DEFAULT_MODELS = [
        { id: "1", name: "Gemini Flash", provider: "gemini", apiModel: "gemini-latest-flash" },
        { id: "2", name: "GPT-3.5 Turbo", provider: "openai", apiModel: "gpt-3.5-turbo" }
    ];

    let customModels = [];

    // --- 1. CARGA INICIAL ---
    chrome.storage.sync.get(['geminiKey', 'openaiKey', 'anthropicKey', 'deepseekKey', 'customModels'], (result) => {
        // Cargar Keys
        if (result.geminiKey) geminiKeyInput.value = result.geminiKey;
        if (result.openaiKey) openaiKeyInput.value = result.openaiKey;
        if (result.anthropicKey) anthropicKeyInput.value = result.anthropicKey;
        if (result.deepseekKey) deepseekKeyInput.value = result.deepseekKey;

        // Cargar Modelos
        customModels = result.customModels || DEFAULT_MODELS;
        renderModels();
    });

    // --- 2. GESTIÓN DE API KEYS ---
    saveKeysBtn.addEventListener('click', () => {
        chrome.storage.sync.set({
            geminiKey: geminiKeyInput.value.trim(),
            openaiKey: openaiKeyInput.value.trim(),
            anthropicKey: anthropicKeyInput.value.trim(),
            deepseekKey: deepseekKeyInput.value.trim()
        }, () => {
            statusMessage.textContent = "¡Claves guardadas correctamente!";
            statusMessage.className = 'success';
            setTimeout(() => { statusMessage.textContent = ''; statusMessage.className = ''; }, 3000);
        });
    });

    // --- 3. GESTIÓN DE MODELOS (TABLA CON DRAG & DROP Y EDICIÓN AVANZADA) ---
    let draggedIndex = null;
    let editingModelId = null;

    function renderModels() {
        const list = document.getElementById('modelsList');
        list.innerHTML = '';

        const providerNames = {
            'gemini': 'Google Gemini',
            'openai': 'OpenAI',
            'anthropic': 'Anthropic',
            'deepseek': 'DeepSeek'
        };

        customModels.forEach((model, index) => {
            const tr = document.createElement('tr');
            tr.setAttribute('draggable', 'true');
            tr.dataset.index = index;

            tr.innerHTML = `
                <td class="drag-handle" title="Arrastrar para ordenar">☰</td>
                <td><strong>${model.name}</strong></td>
                <td><span style="background: #e0e7ff; color: #3730a3; padding: 2px 8px; border-radius: 12px; font-size: 12px;">${providerNames[model.provider]}</span></td>
                <td><code>${model.apiModel}</code></td>
                <td>
                    <div class="action-cell">
                        <button data-id="${model.id}" class="btn-edit" title="Editar modelo">✏️</button>
                        <button data-id="${model.id}" class="btn-delete" title="Borrar modelo">🗑️</button>
                    </div>
                </td>
            `;

            // --- EVENTOS DE DRAG & DROP ---
            tr.addEventListener('dragstart', function (e) {
                draggedIndex = +this.dataset.index;
                this.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', '');
            });
            tr.addEventListener('dragover', function (e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; return false; });
            tr.addEventListener('dragenter', function (e) { e.preventDefault(); this.classList.add('drag-over'); });
            tr.addEventListener('dragleave', function (e) { this.classList.remove('drag-over'); });
            tr.addEventListener('drop', function (e) {
                e.stopPropagation();
                const dropIndex = +this.dataset.index;
                if (draggedIndex !== null && draggedIndex !== dropIndex) {
                    const draggedItem = customModels[draggedIndex];
                    customModels.splice(draggedIndex, 1);
                    customModels.splice(dropIndex, 0, draggedItem);
                    saveModels();
                }
                return false;
            });
            tr.addEventListener('dragend', function (e) {
                this.classList.remove('dragging');
                document.querySelectorAll('#modelsList tr').forEach(row => row.classList.remove('drag-over'));
            });

            list.appendChild(tr);
        });

        // Evento para Editar
        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                const model = customModels.find(m => m.id === id);
                if (model) {
                    document.getElementById('newModelName').value = model.name;
                    document.getElementById('newModelProvider').value = model.provider;
                    document.getElementById('newModelId').value = model.apiModel;

                    editingModelId = id;
                    const addBtn = document.getElementById('addModelBtn');
                    addBtn.textContent = 'Actualizar';
                    addBtn.style.backgroundColor = '#f59e0b';

                    // Mostramos el botón de cancelar
                    document.getElementById('cancelEditBtn').style.display = 'block';
                }
            });
        });

        // Evento para Borrar con Confirmación
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetId = e.currentTarget.dataset.id;
                const modelToDelete = customModels.find(m => m.id === targetId);

                // Pedimos confirmación al usuario
                if (confirm(`¿Estás seguro de que deseas borrar el modelo "${modelToDelete.name}"?`)) {
                    customModels = customModels.filter(m => m.id !== targetId);
                    saveModels();

                    // Si estaba editando el modelo que acaba de borrar, salimos del modo edición
                    if (editingModelId === targetId) resetEditMode();
                }
            });
        });
    }

    function saveModels() {
        chrome.storage.sync.set({ customModels: customModels }, () => {
            renderModels();
        });
    }

    // Función para resetear el modo edición
    function resetEditMode() {
        editingModelId = null;
        document.getElementById('newModelName').value = '';
        document.getElementById('newModelId').value = '';

        const addBtn = document.getElementById('addModelBtn');
        addBtn.textContent = 'Añadir';
        addBtn.style.backgroundColor = '#10b981';

        document.getElementById('cancelEditBtn').style.display = 'none';
    }

    // Botón Cancelar
    document.getElementById('cancelEditBtn').addEventListener('click', resetEditMode);

    // Añadir o Actualizar modelo
    document.getElementById('addModelBtn').addEventListener('click', () => {
        const name = document.getElementById('newModelName').value.trim();
        const provider = document.getElementById('newModelProvider').value;
        const apiModel = document.getElementById('newModelId').value.trim();

        if (name && apiModel) {
            if (editingModelId) {
                // Modo Actualizar
                const modelIndex = customModels.findIndex(m => m.id === editingModelId);
                if (modelIndex > -1) {
                    customModels[modelIndex].name = name;
                    customModels[modelIndex].provider = provider;
                    customModels[modelIndex].apiModel = apiModel;
                }
                resetEditMode(); // Volvemos al estado normal
            } else {
                // Modo Añadir Nuevo
                customModels.push({
                    id: Date.now().toString(),
                    name: name,
                    provider: provider,
                    apiModel: apiModel
                });

                // Limpiar inputs
                document.getElementById('newModelName').value = '';
                document.getElementById('newModelId').value = '';
            }
            saveModels();
        } else {
            alert("Por favor, rellena el Nombre y el ID del API.");
        }
    });
});