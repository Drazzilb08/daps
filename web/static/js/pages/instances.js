// /web/static/js/instances.js

import { fetchConfig, postConfig, testInstance } from '../api.js';
import { humanize, getIcon, showToast } from '../util.js';
import { openModal } from '../common/modals.js';
import { buildInstancesPayload } from '../payload.js';
import { INSTANCE_SCHEMA } from '../constants/instance_schema.js';

// --------- Render all instances (groups/cards) ----------
async function loadInstances() {
    const config = await fetchConfig();
    const instances = config.instances || {};
    const root = document.getElementById('instances-list');
    if (!root) return;
    root.innerHTML = '';

    Object.entries(instances).forEach(([service, items]) => {
        const group = document.createElement('div');
        group.className = 'instance-group';

        // Group header
        const header = document.createElement('div');
        header.className = 'instance-group-header';
        header.innerHTML = `
            <span>${humanize(service)}</span>
            <span class="instance-group-icon icon">${getIcon(service) || ''}</span>
        `;
        group.appendChild(header);

        // Card-list grid
        const groupGrid = document.createElement('div');
        groupGrid.className = 'card-list';

        Object.entries(items).forEach(([name, settings]) => {
            groupGrid.appendChild(makeInstanceCard(service, name, settings, instances));
        });

        groupGrid.appendChild(makeAddInstanceCard(service, instances));
        group.appendChild(groupGrid);
        root.appendChild(group);
    });
}

// --------- Instance modal (local, calls openModal directly) ----------
function openInstanceModal({
    service,
    name = '',
    settings = {},
    isEdit = false,
    schema = INSTANCE_SCHEMA,
    allInstances,
    onSaved,
}) {
    const entry = {
        name: name || '',
        url: settings.url || '',
        api: settings.api || '',
    };

    const modalTitle = isEdit ? `Edit ${humanize(service)}` : `Add ${humanize(service)}`;

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

    const buttonHandler = {
        'test-btn': async ({ modal, entry, bodyDiv }) => {
            const nameInput = modal.querySelector('input[name="name"]');
            const urlInput = modal.querySelector('input[name="url"]');
            const apiInput = modal.querySelector('input[name="api"]');
            const btn = modal.querySelector('#test-btn');
            btn.disabled = true;
            btn.textContent = 'Testing...';
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
                    const err = await res.json().catch(() => ({}));
                    showToast(`Test failed: ${err.error || res.statusText}`, 'error');
                }
            } catch (err) {
                showToast('Test failed', 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = 'Test';
            }
        },
        'cancel-modal-btn': ({ closeModal }) => {
            closeModal();
        },
        'save-btn': async ({ closeModal, entry, bodyDiv, event }) => {
            // Validate required fields
            const errorFields = window.validateModalFields
                ? window.validateModalFields(schema, bodyDiv)
                : [];
            if (errorFields.length) {
                const first = bodyDiv.querySelector('.input-error');
                if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
                event.preventDefault();
                return;
            }
            // Gather updated values
            const inputs = bodyDiv.querySelectorAll('input, textarea, select');
            inputs.forEach((input) => {
                if (!input.name) return;
                if (input.type === 'checkbox') {
                    entry[input.name] = input.checked;
                } else {
                    entry[input.name] = input.value;
                }
            });
            if (!entry.name || !entry.url || !entry.api) {
                showToast('All fields required', 'error');
                return false;
            }
            if (!(await testInstance(service, entry))) return false;

            // Deep clone for update, handle renaming
            const updated = JSON.parse(JSON.stringify(allInstances));
            updated[service] = updated[service] || {};
            if (isEdit && name !== entry.name) delete updated[service][name];
            updated[service][entry.name] = {
                url: entry.url,
                api: entry.api,
            };

            const payload = await buildInstancesPayload(updated);
            const { success, error } = await postConfig(payload);
            if (success) {
                showToast('Instance saved!', 'success');
                loadInstances();
                closeModal();
                return true;
            }
            showToast(error || 'Failed to save instance', 'error');
            return false;
        },
        'add-btn': async ({ closeModal, entry, bodyDiv, event }) => {
            // Same as save
            const errorFields = window.validateModalFields
                ? window.validateModalFields(schema, bodyDiv)
                : [];
            if (errorFields.length) {
                const first = bodyDiv.querySelector('.input-error');
                if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
                event.preventDefault();
                return;
            }
            const inputs = bodyDiv.querySelectorAll('input, textarea, select');
            inputs.forEach((input) => {
                if (!input.name) return;
                if (input.type === 'checkbox') {
                    entry[input.name] = input.checked;
                } else {
                    entry[input.name] = input.value;
                }
            });
            if (!entry.name || !entry.url || !entry.api) {
                showToast('All fields required', 'error');
                return false;
            }
            if (!(await testInstance(service, entry))) return false;

            const updated = JSON.parse(JSON.stringify(allInstances));
            updated[service] = updated[service] || {};
            updated[service][entry.name] = {
                url: entry.url,
                api: entry.api,
            };
            const payload = await buildInstancesPayload(updated);
            const { success, error } = await postConfig(payload);
            if (success) {
                showToast('Instance saved!', 'success');
                loadInstances();
                closeModal();
                return true;
            }
            showToast(error || 'Failed to save instance', 'error');
            return false;
        },
        'delete-modal-btn': async ({ closeModal }) => {
            if (!confirm(`Delete ${service} instance "${name}"?`)) return;
            const updated = JSON.parse(JSON.stringify(allInstances));
            delete updated[service][name];
            const payload = await buildInstancesPayload(updated);
            const { success, error } = await postConfig(payload);
            if (success) {
                showToast('Instance deleted!', 'success');
                loadInstances();
                closeModal();
                return true;
            }
            showToast(error || 'Failed to delete instance', 'error');
            return false;
        },
    };

    openModal({
        schema,
        entry,
        title: modalTitle,
        isEdit,
        footerButtons,
        buttonHandler,
    });
}

// --------- Create one instance card (edit) ----------
function makeInstanceCard(service, name, settings, allInstances) {
    const card = document.createElement('div');
    card.className = 'card';
    card.tabIndex = 0;

    const title = document.createElement('div');
    title.className = 'card-title';
    title.textContent = name;
    card.appendChild(title);

    card.onclick = () =>
        openInstanceModal({
            service,
            name,
            settings,
            isEdit: true,
            schema: INSTANCE_SCHEMA,
            allInstances,
        });
    return card;
}

// --------- "Add Instance" card ----------
function makeAddInstanceCard(service, allInstances) {
    const card = document.createElement('div');
    card.className = 'card card-add';
    card.tabIndex = 0;

    card.onclick = () =>
        openInstanceModal({
            service,
            name: '',
            settings: {},
            isEdit: false,
            schema: INSTANCE_SCHEMA,
            allInstances,
        });

    const plus = document.createElement('div');
    plus.className = 'card-add-plus';
    plus.innerHTML = '&#43;';
    card.appendChild(plus);
    return card;
}
// ---- DOM Builder for SPA Page ----
function ensureInstancesDOM() {
    const container = document.getElementById('viewFrame');
    if (!container) return;

    // Remove all children except loader modal, if any
    [...container.children].forEach((child) => {
        if (
            !child.classList.contains('loader-modal') &&
            !child.classList.contains('poster-search-loader-modal')
        ) {
            container.removeChild(child);
        }
    });

    // Card list (if missing)
    let cardList = container.querySelector('#instances-list');
    if (!cardList) {
        cardList = document.createElement('div');
        cardList.className = 'card-list';
        cardList.id = 'instances-list';
        container.appendChild(cardList);
    } else {
        cardList.innerHTML = '';
    }
}

// ---- Orchestrator ----
export function initInstances() {
    ensureInstancesDOM();
    loadInstances();
}
