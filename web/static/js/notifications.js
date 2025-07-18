import { fetchConfig, postConfig, runTestNotification } from './api.js';
import { humanize, showToast, getIcon, getSpinner } from './util.js';
import { openModal } from './settings/modals.js';
import { modalHeaderHtml, setupModalCloseOnOutsideClick } from './settings/modal_helpers.js';
import { buildNotificationPayload } from './payload.js';

// --- Notification schema (local only) ---
const NOTIFICATIONS_SCHEMA = [
    {
        type: 'discord',
        label: 'Discord',
        fields: [
            {
                key: 'bot_name',
                label: 'Bot Name',
                type: 'text',
                required: true,
                placeholder: 'My DAPS Bot',
            },
            {
                key: 'color',
                label: 'Embed Color',
                type: 'color',
                required: false,
                placeholder: '#7289da',
            },
            {
                key: 'webhook',
                label: 'Webhook',
                type: 'text',
                required: true,
                placeholder: 'https://discord.com/api/webhooks/...',
                validate: (v) => /^https:\/\/discord(app)?\.com\/api\/webhooks\//.test(v),
            },
        ],
    },
    {
        type: 'notifiarr',
        label: 'Notifiarr',
        fields: [
            {
                key: 'bot_name',
                label: 'Bot Name',
                type: 'text',
                required: true,
                placeholder: 'My Notifiarr Bot',
            },
            {
                key: 'color',
                label: 'Embed Color',
                type: 'color',
                required: false,
                placeholder: '#ff7300',
            },
            {
                key: 'webhook',
                label: 'Webhook',
                type: 'text',
                required: true,
                placeholder: 'https://notifiarr.com/api/...',
                validate: (v) => /^https:\/\/notifiarr\.com\/api\//.test(v),
            },
            {
                key: 'channel_id',
                label: 'Channel ID',
                type: 'text',
                required: true,
                placeholder: '1234567890',
                validate: (v) => /^\d+$/.test(v),
            },
        ],
    },
    {
        type: 'email',
        label: 'Email',
        fields: [
            {
                key: 'smtp_server',
                label: 'SMTP Server',
                type: 'text',
                required: true,
                placeholder: 'smtp.gmail.com',
            },
            { key: 'smtp_port', label: 'Port', type: 'number', required: true, placeholder: '587' },
            { key: 'use_tls', label: 'Use TLS', type: 'check_box', required: true },
            {
                key: 'username',
                label: 'Username',
                type: 'text',
                required: true,
                placeholder: 'user@email.com',
            },
            {
                key: 'password',
                label: 'Password',
                type: 'password',
                required: true,
                placeholder: '••••••••',
            },
            {
                key: 'to',
                label: 'From',
                type: 'text',
                required: true,
                placeholder: 'My App <bot@email.com>',
            },
            {
                key: 'from',
                label: 'Recipients',
                type: 'text',
                required: true,
                placeholder: 'someone@email.com, another@email.com',
            },
        ],
    },
];

// --- Utility to find type def ---
function getTypeDef(type) {
    return NOTIFICATIONS_SCHEMA.find((n) => n.type === type);
}

// --- Notification Modal (now local, calls openModal directly) ---
function openNotificationModal({
    module,
    type,
    settings = {},
    notifications,
    isEdit = false,
    notifyTypes = NOTIFICATIONS_SCHEMA,
    onSaved,
    onSave,
    onDelete,
}) {
    const def = notifyTypes.find((n) => n.type === type);
    if (!def) return;

    const modalTitle = `${isEdit ? 'Edit' : 'Add'} ${humanize(module)} - ${
        def?.label || humanize(type)
    } Notification`;

    const footerButtons = [
        { id: 'test-btn', label: 'Test', class: '', type: 'button' },
        { id: 'cancel-modal-btn', label: 'Cancel', class: 'btn--cancel', type: 'button' },
        {
            id: isEdit ? 'save-btn' : 'add-btn',
            label: isEdit ? 'Save' : 'Add',
            class: 'btn--success',
            type: 'submit',
        },
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
    ];

    const entry = { ...settings };

    // --- Modal Button Handlers ---
    const buttonHandler = {
        'test-btn': async ({ modal, entry, schema, bodyDiv }) => {
            // Gather current field values from form
            const inputs = bodyDiv.querySelectorAll('input, textarea, select');
            const data = {};
            inputs.forEach((input) => {
                if (!input.name) return;
                if (input.type === 'checkbox') {
                    data[input.name] = input.checked;
                } else {
                    data[input.name] = input.value;
                }
            });
            const btn = modal.querySelector('#test-btn');
            btn.disabled = true;
            btn.innerHTML = `<span class="spinner"></span>`;
            const result = await runTestNotification(type, data);
            if (result.ok) {
                showToast(result.message, 'success');
            } else {
                showToast(result.error || 'Test failed', 'error');
            }
            btn.disabled = false;
            btn.innerHTML = 'Test';
        },
        'cancel-modal-btn': ({ closeModal }) => {
            closeModal();
        },
        'save-btn': async ({ closeModal, entry, schema, bodyDiv, event }) => {
            const errorFields = window.validateModalFields
                ? window.validateModalFields(schema, bodyDiv)
                : [];
            if (errorFields.length) {
                const first = bodyDiv.querySelector('.input-error');
                if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
                event.preventDefault();
                console.warn('DEBUG: Validation errors:', errorFields);
                return;
            }
            // Gather all standard fields
            const inputs = bodyDiv.querySelectorAll('input, textarea, select');
            inputs.forEach((input) => {
                if (!input.name) return;
                if (input.type === 'checkbox') {
                    entry[input.name] = input.checked;
                } else {
                    entry[input.name] = input.value;
                }
                // Log each input
            });

            // DEBUG: Log entry after field extraction

            // Explicitly handle color field if present in schema
            schema.forEach((f) => {
                if (f.type === 'color') {
                    const colorInput = bodyDiv.querySelector('.field-color input[type="color"]');
                    if (colorInput) {
                        entry[f.key] = colorInput.value;
                    } else {
                        console.warn(`DEBUG: No color input found for field "${f.key}"`);
                    }
                }
            });

            // Log entry after color patch

            if (typeof onSave === 'function') {
                await onSave(entry);
            }
            closeModal();
        },
        'add-btn': async ({ closeModal, entry, schema, bodyDiv, event }) => {
            const errorFields = window.validateModalFields
                ? window.validateModalFields(schema, bodyDiv)
                : [];
            if (errorFields.length) {
                const first = bodyDiv.querySelector('.input-error');
                if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
                event.preventDefault();
                console.warn('DEBUG: Validation errors:', errorFields);
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
                // Log each input
            });

            // DEBUG: Log entry after field extraction

            // Explicitly handle color field if present in schema
            schema.forEach((f) => {
                if (f.type === 'color') {
                    const colorInput = bodyDiv.querySelector('.field-color input[type="color"]');
                    if (colorInput) {
                        entry[f.key] = colorInput.value;
                    } else {
                        console.warn(`DEBUG: No color input found for field "${f.key}"`);
                    }
                }
            });

            // Log entry after color patch

            if (typeof onSave === 'function') {
                await onSave(entry);
            }
            closeModal();
        },
        'delete-modal-btn': async ({ closeModal }) => {
            if (typeof onDelete === 'function') {
                await onDelete();
            }
            closeModal();
        },
    };

    openModal({
        schema: def.fields,
        entry,
        title: modalTitle,
        isEdit,
        footerButtons,
        buttonHandler,
    });
}

// --- MAIN RENDER FUNCTION ---
export async function loadNotifications() {
    const root = document.getElementById('notifications-list');
    if (!root) return;
    root.innerHTML = '';
    // Always get fresh config
    const config = await fetchConfig();
    const notifications = config.notifications || {};

    Object.entries(notifications).forEach(([module, notifTypes]) => {
        if (!notifTypes || typeof notifTypes !== 'object') return;
        const group = document.createElement('div');
        group.className = 'notification-group';

        const header = document.createElement('div');
        header.className = 'notification-group-header';
        header.textContent = humanize(module);
        group.appendChild(header);

        const list = document.createElement('div');
        list.className = 'card-list';

        Object.entries(notifTypes).forEach(([type, settings]) => {
            list.appendChild(makeNotificationCard(module, type, settings, notifications));
        });

        // Show Add if unused types exist
        const usedTypes = Object.keys(notifTypes || {});
        const unused = NOTIFICATIONS_SCHEMA.filter((n) => !usedTypes.includes(n.type));
        if (unused.length > 0) {
            list.appendChild(makeAddCardForModule(module, notifications));
        }
        group.appendChild(list);
        root.appendChild(group);
    });

    // If no modules yet, show Add for any module
    if (!Object.keys(notifications).length) {
        root.appendChild(makeAddCardForModule(null, notifications));
    }
}

// --- EDIT CARD ---
function makeNotificationCard(module, type, settings, notifications) {
    const card = document.createElement('div');
    card.className = 'card notification-card';
    card.tabIndex = 0;

    // --- ICON (top, center) ---
    const iconDiv = document.createElement('div');
    iconDiv.className = 'notification-type-icon icon';
    iconDiv.innerHTML = getIcon(type);
    card.appendChild(iconDiv);

    // --- LABEL (center) ---
    const labelDiv = document.createElement('div');
    labelDiv.className = 'notification-type-label';
    labelDiv.textContent = getTypeDef(type)?.label || type;
    card.appendChild(labelDiv);

    // --- TEST BUTTON (bottom center with tooltip) ---
    const btnWrap = document.createElement('div');
    btnWrap.className = 'notification-btn-wrap';

    const testBtn = document.createElement('button');
    testBtn.type = 'button';
    testBtn.className = 'btn--icon test-btn';
    testBtn.title = `Test ${humanize(module)} ${getTypeDef(type)?.label || type}`;
    testBtn.innerHTML = getIcon('test'); // flask/science icon

    // Tooltip
    const tooltip = document.createElement('div');
    tooltip.className = 'btn-tooltip';
    tooltip.textContent = `Send test to ${getTypeDef(type)?.label || type}`;
    btnWrap.appendChild(testBtn);
    btnWrap.appendChild(tooltip);

    // Tooltip events
    testBtn.onmouseenter = () => tooltip.classList.add('show');
    testBtn.onmouseleave = () => tooltip.classList.remove('show');
    testBtn.onfocus = testBtn.onmouseenter;
    testBtn.onblur = testBtn.onmouseleave;

    testBtn.onclick = async (e) => {
        e.stopPropagation();
        testBtn.disabled = true;
        testBtn.innerHTML = getSpinner();
        tooltip.textContent = 'Testing...';
        try {
            const data = settings;
            const res = await runTestNotification(type, data);
            const success = res.ok === true || res.result === true;
            const msg =
                res.message || res.error || (success ? 'Test notification sent!' : 'Test failed');
            tooltip.textContent = msg;
            showToast(msg, success ? 'success' : 'error');
        } finally {
            testBtn.disabled = false;
            testBtn.innerHTML = getIcon('test');
            tooltip.textContent = `Send test to ${getTypeDef(type)?.label || type}`;
        }
    };

    card.appendChild(btnWrap);

    // Card opens modal except when clicking test button
    card.onclick = (e) => {
        if (e.target.closest('.test-btn')) return;
        // Always fetch latest config (in case backend was updated)
        fetchConfig().then((config) => {
            const notifications = config.notifications || {};
            openNotificationModal({
                module,
                type,
                settings,
                notifications,
                isEdit: true,
                notifyTypes: NOTIFICATIONS_SCHEMA,
                onSaved: async () => {
                    await loadNotifications();
                },
                onSave: async (entry) => {
                    const updated = JSON.parse(JSON.stringify(notifications));
                    if (!updated[module]) updated[module] = {};
                    updated[module][type] = { ...entry };
                    const payload = buildNotificationPayload(updated, entry, module, type);
                    if (payload && payload.error) {
                        showToast(
                            payload.error.join ? payload.error.join('\n') : String(payload.error),
                            'error'
                        );
                        return false;
                    }
                    const resp = await postConfig(payload);
                    if (resp.success) {
                        showToast('Notification saved!', 'success');
                        await loadNotifications();
                        return true;
                    }
                    showToast(resp.error || 'Failed to save', 'error');
                    return false;
                },
                onDelete: async () => {
                    const updated = JSON.parse(JSON.stringify(notifications));
                    if (updated[module]) {
                        delete updated[module][type];
                        // Always keep the parent key, even if empty
                        if (Object.keys(updated[module]).length === 0) {
                            updated[module] = {};
                        }
                    }
                    const resp = await postConfig({ notifications: updated });
                    if (resp.success) {
                        showToast('Notification deleted!', 'success');
                        await loadNotifications();
                        return true;
                    }
                    showToast(resp.error || 'Failed to delete', 'error');
                    return false;
                },
            });
        });
    };

    return card;
}

// --- ADD CARD (per module) ---
function makeAddCardForModule(module, notifications) {
    const card = document.createElement('div');
    card.className = 'card card-add';
    card.tabIndex = 0;
    card.innerHTML = `<div class="card-add-plus">&#43;</div>`;
    card.onclick = async () => {
        // Always fetch fresh config before add
        const config = await fetchConfig();
        const notifications = config.notifications || {};
        showTypePickerModal(module, notifications, NOTIFICATIONS_SCHEMA, (args) => {
            openNotificationModal({
                ...args,
                onSaved: loadNotifications,
                onSave: async (entry) => {
                    const updated = JSON.parse(JSON.stringify(notifications));
                    if (!updated[args.module]) updated[args.module] = {};
                    updated[args.module][args.type] = { ...entry };
                    const payload = buildNotificationPayload(
                        updated,
                        entry,
                        args.module,
                        args.type
                    );
                    if (payload && payload.error) {
                        showToast(
                            payload.error.join ? payload.error.join('\n') : String(payload.error),
                            'error'
                        );
                        return false;
                    }
                    const resp = await postConfig(payload);
                    if (resp.success) {
                        showToast('Notification saved!', 'success');
                        await loadNotifications();
                        return true;
                    }
                    showToast(resp.error || 'Failed to save', 'error');
                    return false;
                },
            });
        });
    };
    return card;
}

function showTypePickerModal(module, notifications, notify_types, showNotificationModal) {
    // Remove any existing modal of this type
    document.querySelectorAll('.modal.type-picker-modal').forEach((m) => m.remove());

    // Modal HTML
    const modal = document.createElement('div');
    modal.className = 'modal show type-picker-modal';

    const content = document.createElement('div');
    content.className = 'modal-content small-modal';

    content.innerHTML =
        modalHeaderHtml({ title: 'Select Notification Type' }) +
        `
        <div class="modal-body">
            <div class="notify-type-list">
                ${notify_types
                    .map(
                        (n) => `
                        <button class="notify-type-btn" data-type="${n.type}" ${
                            notifications[module] && notifications[module][n.type] ? 'disabled' : ''
                        }>${n.label}</button>
                    `
                    )
                    .join('')}
            </div>
        </div>
    `;
    modal.appendChild(content);
    document.body.appendChild(modal);
    document.body.classList.add('modal-open');

    // Setup close on outside click
    setupModalCloseOnOutsideClick(modal);

    // Wire up X button
    const closeBtn = modal.querySelector('.modal-close-x');
    if (closeBtn) {
        closeBtn.onclick = () => {
            if (modal && typeof modal._closeModal === 'function') {
                modal._closeModal();
            } else {
                modal.remove();
                document.body.classList.remove('modal-open');
            }
        };
    }
    modal._closeModal = () => {
        modal.remove();
        document.body.classList.remove('modal-open');
    };

    // Wire up type buttons
    modal.querySelectorAll('.notify-type-btn').forEach((btn) => {
        if (!btn.disabled) {
            btn.onclick = () => {
                modal._closeModal();
                showNotificationModal({
                    module,
                    type: btn.dataset.type,
                    settings: {},
                    notifications,
                    isEdit: false,
                    notifyTypes: notify_types,
                });
            };
        }
    });
}

// --- Auto-load on page ready ---
if (document.getElementById('notifications-list')) {
    loadNotifications();
}
