import { fetchConfig, moduleList, setupPasswordToggles } from './helper.js';
import { humanize, showToast } from './util.js';
import {
    modalHeaderHtml,
    modalFooterHtml,
    setupModalCloseOnOutsideClick,
} from './settings/modals.js';
import { buildNotificationPayload } from './payload.js'; // already present

// Add placeholder values as needed per field:
const NOTIFY_TYPES = [
  { type: 'discord', label: 'Discord', fields: [
    { key: 'bot_name', label: 'Bot Name', type: 'text', required: true, placeholder: 'My DAPS Bot' },
    { key: 'color', label: 'Embed Color', type: 'color', required: false, placeholder: '#7289da' },
    { key: 'webhook', label: 'Webhook', type: 'text', required: true, placeholder: 'https://discord.com/api/webhooks/...', validate: v => /^https:\/\/discord(app)?\.com\/api\/webhooks\//.test(v) }
  ]},
  { type: 'notifiarr', label: 'Notifiarr', fields: [
    { key: 'bot_name', label: 'Bot Name', type: 'text', required: true, placeholder: 'My Notifiarr Bot' },
    { key: 'color', label: 'Embed Color', type: 'color', required: false, placeholder: '#ff7300' },
    { key: 'webhook', label: 'Webhook', type: 'text', required: true, placeholder: 'https://notifiarr.com/api/...', validate: v => /^https:\/\/notifiarr\.com\/api\//.test(v) },
    { key: 'channel_id', label: 'Channel ID', type: 'text', required: true, placeholder: '1234567890', validate: v => /^\d+$/.test(v) }
  ]},
  { type: 'email', label: 'Email', fields: [
    { key: 'smtp_server', label: 'SMTP Server', type: 'text', required: true, placeholder: 'smtp.gmail.com' },
    { key: 'smtp_port', label: 'Port', type: 'number', required: true, placeholder: '587' },
    { key: 'use_tls', label: 'Use TLS', type: 'slider', required: true },
    { key: 'username', label: 'Username', type: 'text', required: true, placeholder: 'user@email.com' },
    { key: 'password', label: 'Password', type: 'password', required: true, placeholder: '••••••••' },
    { key: 'to', label: 'From', type: 'text', required: true, placeholder: 'My App <bot@email.com>' },
    { key: 'from', label: 'Recipients', type: 'text', required: true, placeholder: 'someone@email.com, another@email.com' }
  ]}
];

function getNotificationTypeIcon(type) {
    // Customize SVG for each notification type
    if (type === 'discord') {
        return `<img src="/web/static/icons/discord.svg" alt="Discord logo" />`;
    }
    if (type === 'notifiarr') {
        return `<img src="/web/static/icons/notifiarr.svg" alt="Notifiarr logo" />`;
    }
    if (type === 'email') {
        return `<i class="material-icons">email</i>`;
    }
    // Default generic bell
    return `<i class="material-icons">notifications</i>`;
}

function getTestIcon() {
    // Flask/test tube SVG, matches material 'science'
    return `<i class="material-icons">science</i>`;
}

function getSpinner() {
    return `<span class="spinner"></span>`;
}

function getTypeDef(type) {
    return NOTIFY_TYPES.find((n) => n.type === type);
}
function humanizeName(module, type) {
    const mod = moduleList.find((m) => m === module) ? humanize(module) : humanize(module);
    const def = getTypeDef(type);
    return `${mod} - ${def ? def.label : humanize(type)}`;
}

export async function loadNotifications() {
    const root = document.getElementById('notifications-list');
    if (!root) return;
    root.innerHTML = '';
    const config = await fetchConfig();
    const notifications = config.notifications || {};

    // Group by module:
    Object.entries(notifications).forEach(([module, notifTypes]) => {
        if (!notifTypes || typeof notifTypes !== 'object') return;
        // Header
        const group = document.createElement('div');
        group.className = 'notification-group';

        const header = document.createElement('div');
        header.className = 'notification-group-header';
        header.textContent = humanize(module);
        group.appendChild(header);

        // Card list
        const list = document.createElement('div');
        list.className = 'card-list';
        Object.entries(notifTypes).forEach(([type, settings]) => {
            list.appendChild(makeNotificationCard(module, type, settings, notifications));
        });
        const usedTypes = Object.keys(notifTypes || {});
        const unused = NOTIFY_TYPES.filter((n) => !usedTypes.includes(n.type));
        if (unused.length > 0) {
            list.appendChild(makeAddCardForModule(module, notifications));
        }
        group.appendChild(list);

        root.appendChild(group);
    });
    // If no notifications, show a global add
    if (!Object.keys(notifications).length) {
        root.appendChild(makeAddCardForModule(null, notifications));
    }
}

function makeNotificationCard(module, type, settings, notifications) {
    const card = document.createElement('div');
    card.className = 'card notification-card';
    card.tabIndex = 0;

    // Type icon
    const iconDiv = document.createElement('div');
    iconDiv.className = 'notification-type-icon icon';
    iconDiv.innerHTML = getNotificationTypeIcon(type);
    card.appendChild(iconDiv);

    // Type label
    const labelDiv = document.createElement('div');
    labelDiv.className = 'notification-type-label';
    labelDiv.textContent = getTypeDef(type)?.label || type;
    card.appendChild(labelDiv);

    // --- Button area: matches schedule ---
    const btnWrap = document.createElement('div');
    btnWrap.className = 'notification-btn-wrap';

    const testBtn = document.createElement('button');
    testBtn.className = 'btn--icon test-btn';
    testBtn.type = 'button';
    testBtn.title = `Test ${humanize(module)} ${getTypeDef(type)?.label || type}`;
    testBtn.innerHTML = getTestIcon();

    // Tooltip (DOM)
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
            testBtn.innerHTML = getTestIcon();
            tooltip.textContent = `Send test to ${getTypeDef(type)?.label || type}`;
        }
    };

    card.appendChild(btnWrap);

    card.onclick = (e) => {
        if (e.target.closest('.test-btn')) return; // Don't fire for test button
        showSettingsModal(module, type, settings, notifications, true);
    };

    return card;
}

// --- ADD CARD: for grouped modules ---
function makeAddCardForModule(module, notifications) {
    const card = document.createElement('div');
    card.className = 'card card-add';
    card.tabIndex = 0;
    card.innerHTML = `<div class="card-add-plus">&#43;</div>`;
    card.onclick = () =>
        module ? showTypePickerModal(module, notifications) : showModulePickerModal(notifications);
    return card;
}

function showModulePickerModal(notifications) {
    closeModals();

    // Build usedPairs as module -> Set of types already assigned
    const usedPairs = {};
    Object.entries(notifications).forEach(([module, notifTypes]) => {
        usedPairs[module] = new Set(Object.keys(notifTypes || {}));
    });

    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.innerHTML = `
        <div class="modal-content small-modal">
            ${modalHeaderHtml({ title: 'Select Module' })}
            <div class="modal-body">
                <div class="notify-type-list">
                ${moduleList
                    .map((module) => {
                        const disabled =
                            usedPairs[module] && usedPairs[module].size >= NOTIFY_TYPES.length;
                        return `<button class="notify-type-btn" data-module="${module}" ${
                            disabled ? 'disabled' : ''
                        }>
                        ${humanize(module)}
                    </button>`;
                    })
                    .join('')}
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    document.body.classList.add('modal-open');
    setupModalCloseOnOutsideClick(modal);
    modal.querySelectorAll('.notify-type-btn').forEach((btn) => {
        if (!btn.disabled) {
            btn.onclick = () => {
                closeModals();
                showTypePickerModal(btn.dataset.module, notifications);
            };
        }
    });
    modal.querySelector('.modal-close-x').onclick = closeModals;
}

function showTypePickerModal(module, notifications) {
    closeModals();
    const existing = new Set(
        notifications[module] && typeof notifications[module] === 'object'
            ? Object.keys(notifications[module])
            : []
    );
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.innerHTML = `
        <div class="modal-content small-modal">
            ${modalHeaderHtml({ title: 'Select Notification Type' })}
            <div class="modal-body">
                <div class="notify-type-list">
                ${NOTIFY_TYPES.map(
                    (n) => `
                    <button class="notify-type-btn" data-type="${n.type}" ${
                        existing.has(n.type) ? 'disabled' : ''
                    }>
                        ${n.label}
                    </button>
                `
                ).join('')}
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    document.body.classList.add('modal-open');
    setupModalCloseOnOutsideClick(modal);
    modal.querySelectorAll('.notify-type-btn').forEach((btn) => {
        if (!btn.disabled) {
            btn.onclick = () => {
                closeModals();
                showSettingsModal(module, btn.dataset.type, {}, notifications, false);
            };
        }
    });
    modal.querySelector('.modal-close-x').onclick = closeModals;
}

function showSettingsModal(module, type, editSettings = {}, notifications, isEdit = false) {
    closeModals();
    const def = getTypeDef(type);
    if (!def) return;
    const modal = document.createElement('div');
    modal.className = 'modal show';
    const modalTitle = `${isEdit ? 'Edit' : 'Add'} ${humanizeName(module, type)} Notification`;

    // Footer Buttons
    const footerButtons = [
        { id: 'test-btn', label: 'Test', class: '', type: 'button' },
        { id: 'cancel-modal-btn', label: 'Cancel', class: 'btn--cancel', type: 'button' },
        {
            id: isEdit ? 'save-btn' : 'add-btn',
            label: isEdit ? 'Save' : 'Add',
            class: 'btn--success',
            type: 'submit',
        },
    ];
    if (isEdit) {
        footerButtons.push({
            id: 'delete-modal-btn',
            label: 'Delete',
            class: 'btn--remove-item',
            type: 'button',
        });
    }

    modal.innerHTML = `
        <div class="modal-content">
            ${modalHeaderHtml({ title: modalTitle })}
            <form class="modal-body notify-settings-form" id="notification-modal-form" autocomplete="off">
                <div>
                    <b>Name:</b> <span>${humanizeName(module, type)}</span>
                </div>
                ${def.fields
                    .map((f) => {
                        if (f.type === 'password') {
                            const pwdId = `pwd-${module}-${type}-${f.key}`;
                            return `<label>${f.label}
                            <div class="password-wrapper">
                                <input type="password" id="${pwdId}" name="${
                                f.key
                            }" class="input masked-input" value="${
                                editSettings[f.key] || ''
                            }" placeholder="${f.placeholder || ''}">
                                <span class="toggle-password" tabindex="0" role="button" aria-label="Show/hide password" data-input="${pwdId}">&#128065;</span>
                            </div>
                        </label>`;
                        }
                        if (f.type === 'slider') {
                            const checked =
                                editSettings[f.key] === true ||
                                editSettings[f.key] === 'true' ||
                                editSettings[f.key] === 'on';
                            return `
                            <label class="toggle-switch-block">
                                <span class="form-toggle-label">${f.label}</span>
                                <span class="toggle-switch-label">
                                    <input type="checkbox" name="${f.key}" id="${
                                f.key
                            }" class="toggle-switch-input" ${checked ? 'checked' : ''}>
                                    <span class="slider"></span>
                                </span>
                            </label>
                        `;
                        }
                        if (f.type === 'color') {
                            const colorId = `color-input-${f.key}`;
                            return `
        <div class="color-input-row">
            <label for="${colorId}">${f.label}</label>
            <input type="color" id="${colorId}" name="${f.key}" class="input" value="${
                                editSettings[f.key] || '#ff7300'
                            }" ${f.required ? 'required' : ''}>
        </div>`;
                        }
                        return `<label>${f.label}<input type="${f.type}" name="${
                            f.key
                        }" class="input" value="${editSettings[f.key] || ''}" placeholder="${
                            f.placeholder || ''
                        }" ${f.required ? 'required' : ''}></label>`;
                    })
                    .join('')}
                ${modalFooterHtml(footerButtons)}
            </form>
        </div>
    `;
    document.body.appendChild(modal);
    document.body.classList.add('modal-open');
    setupModalCloseOnOutsideClick(modal);

    // Show/hide password logic (for all .toggle-password)
    setupPasswordToggles(modal);

    modal.querySelector('.modal-close-x').onclick = modal.querySelector(
        '#cancel-modal-btn'
    ).onclick = () => closeModals();

    // Test button
    modal.querySelector('#test-btn').onclick = async () => {
        const data = formToNotificationObj(def, modal);
        if (!validateNotification(def, data, modal)) return;
        const res = await runTestNotification(type, data);
        const success = res.ok === true || res.result === true;
        const msg =
            res.message || res.error || (success ? 'Test notification sent!' : 'Test failed');
        showToast(msg, success ? 'success' : 'error');
        // Do NOT close modal on error; only if you want to close on success, uncomment below:
        // if (success) closeModals();
    };

    // Delete button
    if (isEdit) {
        modal.querySelector('#delete-modal-btn').onclick = async () => {
            if (!confirm(`Delete this notification for ${humanizeName(module, type)}?`)) return;
            const config = await fetchConfig();
            config.notifications = config.notifications || {};
            if (config.notifications[module] && config.notifications[module][type]) {
                delete config.notifications[module][type];
                if (Object.keys(config.notifications[module]).length === 0)
                    delete config.notifications[module];
            }
            const resp = await fetch('/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config),
            });
            if (resp.ok) {
                showToast('Notification deleted', 'success');
                closeModals();
                loadNotifications();
            } else {
                showToast('Failed to delete', 'error');
            }
        };
    }

    // Save
    modal.querySelector('form').onsubmit = async (e) => {
        e.preventDefault();

        // Build notification object from form
        const payload = await buildNotificationPayload();
        if (payload && payload.error && Array.isArray(payload.error)) {
            showToast(payload.error.join('\n'), 'error');
            return;
        }
        if (!payload) {
            showToast('Unknown error: could not build payload', 'error');
            return;
        }

        // Try test notification BEFORE save
        let testRes = null;
        try {
            // Get type and data for this notification
            const def = getTypeDef(type);
            const form = modal.querySelector('form');
            const data = formToNotificationObj(def, modal);
            // Validate fields (reuse logic from test)
            if (!validateNotification(def, data, modal)) return;

            // Actually send test
            testRes = await runTestNotification(type, data);
            const success = testRes.ok === true || testRes.result === true;
            if (!success) {
                showToast(testRes.error || 'Test notification failed.', 'error');
                // DO NOT close modal
                return;
            }
        } catch (err) {
            showToast('Test notification failed: ' + (err?.message || err), 'error');
            return;
        }

        // If test succeeded, do the actual save
        const resp = await fetch('/api/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        let respData = {};
        try {
            respData = await resp.json();
        } catch {}

        if (resp.ok && !respData.error) {
            showToast('Notification saved!', 'success');
            closeModals();
            loadNotifications();
        } else {
            showToast(respData.error || 'Failed to save', 'error');
            // DO NOT close the modal!
        }
    };
}

function formToNotificationObj(def, modal) {
    const form = modal.querySelector('form');
    const formData = new FormData(form);
    const obj = {};
    def.fields.forEach((f) => {
        obj[f.key] = formData.get(f.key) || '';
    });
    return obj;
}

function validateNotification(def, obj, modal) {
    for (const f of def.fields) {
        if (f.required && !obj[f.key]) {
            showToast(`Field "${f.label}" is required`, 'error');
            modal.querySelector(`[name="${f.key}"]`).focus();
            return false;
        }
        if (f.validate && obj[f.key] && !f.validate(obj[f.key])) {
            showToast(`Invalid value for "${f.label}"`, 'error');
            modal.querySelector(`[name="${f.key}"]`).focus();
            return false;
        }
    }
    return true;
}

function closeModals() {
    document.querySelectorAll('.modal').forEach((m) => m.remove());
    document.body.classList.remove('modal-open');
}

async function runTestNotification(type, data) {
    try {
        const payload = {
            module: 'notifications',
            notifications: { [type]: data },
        };
        const res = await fetch('/api/test-notification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const result = await res.json().catch(() => ({}));
        if (!res.ok) {
            // Always show error from standardized response
            return { ok: false, error: result.error || 'Error' };
        }
        // New schema: always has 'success' and 'results'
        if (result.results && Array.isArray(result.results)) {
            // If any ok, show as success, else show most relevant error
            const okTarget = result.results.find((r) => r.ok === true);
            if (okTarget) {
                return { ok: true, message: okTarget.message || 'Test notification sent!' };
            }
            // Otherwise, show errors for the first failing target
            const failTarget = result.results.find((r) => r.ok === false);
            if (failTarget) {
                return {
                    ok: false,
                    error:
                        failTarget.error ||
                        failTarget.message ||
                        result.error ||
                        'Test notification failed.',
                };
            }
        }
        // Fallback if not matching schema
        if (result.success) return { ok: true, message: 'Test notification sent!' };
        return { ok: false, error: result.error || 'Test notification failed (unknown error)' };
    } catch (err) {
        return { ok: false, error: String(err) };
    }
}

// On page load
if (document.getElementById('notifications-list')) loadNotifications();
