import { fetchConfig } from './api.js';
import { humanize, showToast, setupPasswordToggles, getIcon } from './util.js';
import { modalHeaderHtml, modalFooterHtml } from './settings/modals.js';

export async function loadInstances() {
    const config = await fetchConfig();
    const instances = config.instances || {};
    const root = document.getElementById('instances-list');
    if (!root) return;
    root.innerHTML = '';

    // For each group (Radarr/Sonarr/Plex)
    Object.entries(instances).forEach(([service, items]) => {
        // Create the group container (like notifications/schedule)
        const group = document.createElement('div');
        group.className = 'instance-group';

        // Group header with icon
        const header = document.createElement('div');
        header.className = 'instance-group-header';
        header.innerHTML = `
            <span>${humanize(service)}</span>
            <span class="instance-group-icon icon">${getIcon(service) || ''}</span>
        `;
        group.appendChild(header);

        // .card-list section
        const groupGrid = document.createElement('div');
        groupGrid.className = 'card-list';

        // Add instance cards
        Object.entries(items).forEach(([name, settings]) => {
            groupGrid.appendChild(makeCard(service, name, settings, config));
        });

        // Always add "+" at end
        groupGrid.appendChild(makeAddCard(service, config));

        group.appendChild(groupGrid);
        root.appendChild(group);
    });
}

function makeCard(service, name, settings, config) {
    const card = document.createElement('div');
    card.className = 'card';
    card.tabIndex = 0;

    const title = document.createElement('div');
    title.className = 'card-title';
    title.textContent = name;
    card.appendChild(title);

    card.onclick = () => {
        instanceModal({
            service,
            name,
            settings,
            config,
            onReload: loadInstances,
        });
    };
    return card;
}

function makeAddCard(service, config) {
    const card = document.createElement('div');
    card.className = 'card card-add';
    card.tabIndex = 0;
    card.onclick = () => {
        instanceModal({
            service,
            name: '',
            settings: {},
            config,
            onReload: loadInstances,
        });
    };

    const plus = document.createElement('div');
    plus.className = 'card-add-plus';
    plus.innerHTML = '&#43;';
    card.appendChild(plus);

    return card;
}

if (document.getElementById('instances-list')) {
    loadInstances();
}

function instanceModal({ service, name = '', settings = {}, config, onReload }) {
    const isEdit = !!name;
    const modalId = 'instance-modal-edit';
    let modal = document.getElementById(modalId);
    if (!modal) {
        modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'modal show';
        document.body.appendChild(modal);
    }

    // Footer buttons config (Delete always left, others right)
    const footerButtons = [
        ...(isEdit
            ? [
                  {
                      id: 'delete-modal-btn',
                      label: 'Delete',
                      class: 'btn--remove-item',
                      type: 'button',
                  },
              ]
            : []),
        { id: 'test-btn', label: 'Test', class: '', type: 'button' },
        { id: 'cancel-modal-btn', label: 'Cancel', class: 'btn--cancel', type: 'button' },
        {
            id: isEdit ? 'save-btn' : 'add-btn',
            label: isEdit ? 'Save' : 'Add',
            class: 'btn--success',
            type: 'submit',
        },
    ];

    modal.innerHTML = `
    <div class="modal-content">
        ${modalHeaderHtml({ title: isEdit ? `Edit ${service}` : `Add ${service}` })}
        <form class="modal-body" id="instance-modal-form" autocomplete="off">
            <label>Instance Name</label>
            <input type="text" id="instance-modal-name" class="input" placeholder="e.g. radarr_hd" value="${
                name || ''
            }" />
            <label>URL</label>
            <input type="text" id="instance-modal-url" class="input" placeholder="http://host:port" value="${
                settings.url || ''
            }" />
            <label>API Key
            <div class="password-wrapper">
                <input
                type="password"
                id="instance-modal-api"
                class="input masked-input"
                autocomplete="off"
                placeholder="API Key"
                value="${settings.api || ''}"
                />
                <span
                class="toggle-password"
                tabindex="0"
                role="button"
                aria-label="Show/hide API key"
                data-input="instance-modal-api"
                >&#128065;</span>
            </div>
            </label>
            <!-- Footer goes *inside* form so submit/enter triggers save -->
            ${modalFooterHtml(footerButtons, ['delete-modal-btn'])}
        </form>
    </div>
    `;
    setupPasswordToggles(modal);
    modal.classList.add('show');
    document.body.classList.add('modal-open');
    document.documentElement.classList.add('modal-open');

    setTimeout(() => {
        const firstInput = modal.querySelector('input, select, textarea, button:not([disabled])');
        if (firstInput) firstInput.focus();
    }, 100);

    function closeModal() {
        modal.classList.remove('show');
        document.body.classList.remove('modal-open');
        document.documentElement.classList.remove('modal-open');
    }

    modal.onclick = (e) => {
        if (e.target === modal) closeModal();
    };
    modal.querySelector('.modal-close-x').onclick = closeModal;
    modal.querySelector('#cancel-modal-btn').onclick = closeModal;

    const nameInput = modal.querySelector('#instance-modal-name');
    const urlInput = modal.querySelector('#instance-modal-url');
    const apiInput = modal.querySelector('#instance-modal-api');
    const form = modal.querySelector('#instance-modal-form');
    const testBtn = modal.querySelector('#test-btn');
    const deleteBtn = modal.querySelector('#delete-modal-btn');

    // Test button handler
    testBtn.onclick = async () => {
        testBtn.disabled = true;
        testBtn.textContent = 'Testing...';
        try {
            const res = await fetch('/api/test-instance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    service,
                    name: nameInput.value.trim(),
                    url: urlInput.value.trim(),
                    api: apiInput.value.trim(),
                }),
            });
            if (res.ok) {
                showToast('Connection successful!', 'success');
            } else {
                const err = await res.json();
                showToast(`Test failed: ${err.error || res.statusText}`, 'error');
            }
        } catch (err) {
            showToast('Test failed', 'error');
        } finally {
            testBtn.disabled = false;
            testBtn.textContent = 'Test';
        }
    };

    // Save/Add handler (submit on form)
    form.onsubmit = async (e) => {
        e.preventDefault();

        const n = nameInput.value.trim();
        const u = urlInput.value.trim();
        const a = apiInput.value.trim();
        if (!n || !u || !a) {
            showToast('All fields required', 'error');
            return;
        }

        // Run test *first* before saving
        testBtn.disabled = true;
        testBtn.textContent = 'Testing...';
        let testRes;
        try {
            testRes = await fetch('/api/test-instance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    service,
                    name: n,
                    url: u,
                    api: a,
                }),
            });
        } catch (err) {
            showToast('Cannot save: Test failed', 'error');
            testBtn.disabled = false;
            testBtn.textContent = 'Test';
            return;
        }
        if (!testRes.ok) {
            const err = await testRes.json().catch(() => ({}));
            showToast(`Cannot save: Test failed: ${err.error || testRes.statusText}`, 'error');
            testBtn.disabled = false;
            testBtn.textContent = 'Test';
            return;
        }
        testBtn.disabled = false;
        testBtn.textContent = 'Test';

        // Now save if test passed
        const newConfig = JSON.parse(JSON.stringify(config));
        newConfig.instances = newConfig.instances || {};
        newConfig.instances[service] = newConfig.instances[service] || {};
        if (isEdit && n !== name) {
            delete newConfig.instances[service][name];
        }
        newConfig.instances[service][n] = { url: u, api: a };

        const payload = await buildInstancesPayload(newConfig.instances);
        const res = await fetch('/api/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (res.ok) {
            showToast('Instance saved!', 'success');
            closeModal();
            if (typeof onReload === 'function') onReload();
        } else {
            showToast('Failed to save instance', 'error');
        }
    };

    // Delete button handler
    if (deleteBtn) {
        deleteBtn.onclick = async () => {
            if (!confirm(`Delete ${service} instance "${name}"?`)) return;
            const newConfig = JSON.parse(JSON.stringify(config));
            newConfig.instances = newConfig.instances || {};
            newConfig.instances[service] = newConfig.instances[service] || {};
            delete newConfig.instances[service][name];

            const payload = await buildInstancesPayload(newConfig.instances);
            const res = await fetch('/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (res.ok) {
                showToast('Instance deleted!', 'success');
                closeModal();
                if (typeof onReload === 'function') onReload();
            } else {
                showToast('Failed to delete instance', 'error');
            }
        };
    }
}
