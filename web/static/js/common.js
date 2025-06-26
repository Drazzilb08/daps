const DAPS = {
    bindSaveButton,
    setSaveButtonState,
    markDirty,
    isDirty: false,
    skipDirtyCheck: false,
    showUnsavedModal,
    humanize,
    showToast,
};

function bindSaveButton(saveBtn, buildPayloadFn, key, postSave) {
    if (!saveBtn) return;
    saveBtn.type = 'button';
    saveBtn.onclick = async () => {
        await saveSection(buildPayloadFn, key, postSave);
    };
}
function setSaveButtonState(saveBtn, state, label = 'Save') {
    if (!saveBtn) return;
    if (state === 'saving') {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';
        saveBtn.classList.remove('btn--success');
    } else if (state === 'success') {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saved!';
        saveBtn.classList.add('btn--success');
        setTimeout(() => {
            saveBtn.disabled = false;
            saveBtn.textContent = label;
            saveBtn.classList.remove('btn--success');
        }, 2000);
    } else {
        saveBtn.disabled = false;
        saveBtn.textContent = label;
        saveBtn.classList.remove('btn--success');
    }
}
function markDirty() {
    DAPS.isDirty = true;
}

async function saveSection(buildPayload, key, postSave, saveBtn) {
    if (!saveBtn) saveBtn = document.getElementById('saveBtn');
    setSaveButtonState(saveBtn, 'saving');
    const payload = await buildPayload();
    if (!payload || typeof payload[key] === 'undefined') {
        setSaveButtonState(saveBtn, 'default');
        return;
    }
    try {
        const res = await fetch('/api/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (!res.ok) throw res;
        DAPS.isDirty = false;
        showToast(`✅ ${key.charAt(0).toUpperCase() + key.slice(1)} updated!`, 'success');
        setSaveButtonState(saveBtn, 'success');
        if (typeof postSave === 'function') postSave();
    } catch (err) {
        let msg = err.statusText || 'Save failed';
        try {
            const data = await err.json();
            msg = data.error || msg;
        } catch {}
        showToast(`❌ ${msg}`, 'error');
        setSaveButtonState(saveBtn, 'default');
    }
}

function showUnsavedModal() {
    return new Promise((resolve) => {
        let modal = document.getElementById('unsavedModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'unsavedModal';
            modal.innerHTML = `
                <div class="modal-content">
                <p>You have unsaved changes. What would you like to do?</p>
                <button class="save-btn">Save</button>
                <button class="discard-btn">Discard</button>
                <button class="cancel-btn">Cancel</button>
                </div>`;
            document.body.appendChild(modal);
        }
        modal.classList.add('show');
        requestAnimationFrame(() => {
            modal.classList.add('show');
            document.body.classList.add('modal-open');
        });

        const saveBtn = modal.querySelector('.save-btn');
        const discardBtn = modal.querySelector('.discard-btn');
        const cancelBtn = modal.querySelector('.cancel-btn');

        function cleanup(choice) {
            modal.classList.remove('show');
            document.body.classList.remove('modal-open');
            setTimeout(() => {
                modal.classList.remove('show');
            }, 250);
            resolve(choice);
        }
        saveBtn.addEventListener(
            'click',
            async function handler() {
                setSaveButtonState(saveBtn, 'saving', 'Save');
                const pageSaveBtn = document.getElementById('saveBtn');
                if (pageSaveBtn) {
                    pageSaveBtn.click();
                    DAPS.isDirty = false;
                } else {
                    console.warn('No Save button found for this page.');
                }
                setSaveButtonState(saveBtn, 'success', 'Save');
                saveBtn.removeEventListener('click', handler);
                setTimeout(() => cleanup('save'), 700);
            },
            { once: true }
        );
        discardBtn.addEventListener('click', () => cleanup('discard'), { once: true });
        cancelBtn.addEventListener('click', () => cleanup('cancel'), { once: true });
    });
}

function humanize(key) {
    return key.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function showToast(message, type = 'info', timeout = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toast.addEventListener('click', () => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode === container) container.removeChild(toast);
        }, 300);
    });
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode === container) container.removeChild(toast);
        }, 500);
    }, timeout);
}

export { DAPS, showToast, humanize, showUnsavedModal };
