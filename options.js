document.addEventListener('DOMContentLoaded', () => {
    const providerSelect = document.getElementById('provider');
    const geminiGroup = document.getElementById('geminiGroup');
    const openaiGroup = document.getElementById('openaiGroup');
    const anthropicGroup = document.getElementById('anthropicGroup');
    const deepseekGroup = document.getElementById('deepseekGroup');

    const geminiKeyInput = document.getElementById('geminiKey');
    const openaiKeyInput = document.getElementById('openaiKey');
    const anthropicKeyInput = document.getElementById('anthropicKey');
    const deepseekKeyInput = document.getElementById('deepseekKey');

    const saveBtn = document.getElementById('saveBtn');
    const statusMessage = document.getElementById('statusMessage');

    function toggleKeyInputs() {
        const selected = providerSelect.value;
        geminiGroup.style.display = selected === 'gemini' ? 'block' : 'none';
        openaiGroup.style.display = selected === 'openai' ? 'block' : 'none';
        anthropicGroup.style.display = selected === 'anthropic' ? 'block' : 'none';
        deepseekGroup.style.display = selected === 'deepseek' ? 'block' : 'none';
    }

    providerSelect.addEventListener('change', toggleKeyInputs);

    // Cargar configuración
    chrome.storage.sync.get(['provider', 'geminiKey', 'openaiKey', 'anthropicKey', 'deepseekKey'], (result) => {
        if (result.provider) providerSelect.value = result.provider;
        if (result.geminiKey) geminiKeyInput.value = result.geminiKey;
        if (result.openaiKey) openaiKeyInput.value = result.openaiKey;
        if (result.anthropicKey) anthropicKeyInput.value = result.anthropicKey;
        if (result.deepseekKey) deepseekKeyInput.value = result.deepseekKey;
        toggleKeyInputs();
    });

    // Guardar configuración
    saveBtn.addEventListener('click', () => {
        chrome.storage.sync.set({
            provider: providerSelect.value,
            geminiKey: geminiKeyInput.value.trim(),
            openaiKey: openaiKeyInput.value.trim(),
            anthropicKey: anthropicKeyInput.value.trim(),
            deepseekKey: deepseekKeyInput.value.trim()
        }, () => {
            statusMessage.textContent = chrome.i18n.getMessage("saveSuccess");
            statusMessage.className = 'success';
            setTimeout(() => {
                statusMessage.textContent = '';
                statusMessage.className = '';
            }, 3000);
        });
    });
});