import {
    fetchConfig,
    NOTIFICATION_LIST,
    NOTIFICATION_DEFINITIONS,
    NOTIFICATION_TYPES_PER_MODULE,
} from './helper.js';
import { buildNotificationPayload } from './payload.js';
import { DAPS } from './common.js';
const { bindSaveButton, showToast } = DAPS;

export async function loadNotifications() {
    const form = document.getElementById('notificationsForm');
    if (!form) return;
    const config = await fetchConfig();
    const notifications = config.notifications || {};
    const modules = Array.isArray(NOTIFICATION_LIST)
        ? NOTIFICATION_LIST
        : Object.keys(notifications);
    const DEFINITIONS = NOTIFICATION_DEFINITIONS || {};
    const notifyTypes = Object.keys(DEFINITIONS);
    const allowedTypesMap = NOTIFICATION_TYPES_PER_MODULE || {};

    form.innerHTML = '';
    let cardIndex = 0;
    for (const module of modules) {
        const moduleSettings = notifications[module] || {};
        const enabledTypes = Object.keys(moduleSettings);

        const card = document.createElement('div');
        card.className = 'card';

        const header = document.createElement('div');
        header.className = 'card-header';
        header.textContent = module.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        card.appendChild(header);

        const moduleAllowedTypes = allowedTypesMap[module] || notifyTypes;
        for (const type of moduleAllowedTypes) {
            const def = DEFINITIONS[type];
            if (!def || !def.fields) continue;

            const isEnabled = enabledTypes.includes(type);
            const notifyObj =
                moduleSettings[type] && typeof moduleSettings[type] === 'object'
                    ? moduleSettings[type]
                    : {};

            const fieldRow = document.createElement('div');
            fieldRow.className = 'field toggle-row';

            const toggleWrapper = document.createElement('label');
            toggleWrapper.className = 'toggle-switch';
            const input = document.createElement('input');
            input.type = 'checkbox';
            input.name = `${module}_${type}`;
            input.checked = isEnabled;
            const slider = document.createElement('span');
            slider.className = 'slider';
            toggleWrapper.appendChild(input);
            toggleWrapper.appendChild(slider);

            const typeLabel = document.createElement('span');
            typeLabel.textContent = def.label;
            typeLabel.className = 'toggle-label';

            const flexSpacer = document.createElement('div');
            flexSpacer.className = 'flex-spacer';

            const testBtn = document.createElement('button');
            testBtn.type = 'button';
            testBtn.textContent = 'Test';
            testBtn.className = 'btn btn--test';
            if (isEnabled) testBtn.classList.add('enabled');

            fieldRow.appendChild(toggleWrapper);
            fieldRow.appendChild(typeLabel);
            fieldRow.appendChild(flexSpacer);
            fieldRow.appendChild(testBtn);

            const fieldset = document.createElement('div');
            fieldset.className = 'field notification-fieldset';
            if (isEnabled) {
                fieldset.classList.add('expanded');
                testBtn.classList.add('enabled');
                fieldRow.classList.add('toggle-row--expanded');
            }
            fieldset.dataset.notifyType = type;

            const legend = document.createElement('div');
            legend.className = 'fieldset-legend';
            legend.textContent = `${def.label} Settings`;
            fieldset.appendChild(legend);

            for (const fieldDef of def.fields) {
                const fieldContainer = document.createElement('div');
                fieldContainer.className = 'notification-field-container';
                const fieldLabel = document.createElement('label');
                fieldLabel.textContent = fieldDef.label;
                fieldLabel.setAttribute('for', `${type}_${fieldDef.key}_${module}`);
                fieldContainer.appendChild(fieldLabel);

                let inputElement;
                const isPassword = fieldDef.key.toLowerCase().includes('password');
                if (fieldDef.type === 'checkbox') {
                    const toggleWrap = document.createElement('label');
                    toggleWrap.className = 'toggle-switch';
                    inputElement = document.createElement('input');
                    inputElement.type = 'checkbox';
                    inputElement.className = 'toggle-input';
                    inputElement.name = `${type}_${fieldDef.key}_${module}`;
                    inputElement.required = fieldDef.required || false;
                    inputElement.id = `${type}_${fieldDef.key}_${module}`;
                    inputElement.checked = notifyObj[fieldDef.key] || false;
                    const toggleSlider = document.createElement('span');
                    toggleSlider.className = 'slider';
                    toggleWrap.appendChild(inputElement);
                    toggleWrap.appendChild(toggleSlider);
                    fieldContainer.appendChild(toggleWrap);
                } else if (fieldDef.type === 'textarea') {
                    inputElement = document.createElement('textarea');
                    inputElement.name = `${type}_${fieldDef.key}_${module}`;
                    inputElement.className = 'input textarea-input';
                    inputElement.required = fieldDef.required || false;
                    inputElement.id = `${type}_${fieldDef.key}_${module}`;
                    inputElement.rows = 1;
                    if (fieldDef.placeholder) inputElement.placeholder = fieldDef.placeholder;
                    if (notifyObj[fieldDef.key] !== undefined && notifyObj[fieldDef.key] !== null) {
                        inputElement.value = Array.isArray(notifyObj[fieldDef.key])
                            ? notifyObj[fieldDef.key].join(', ')
                            : notifyObj[fieldDef.key];
                    }

                    function autoExpandTextarea(el) {
                        el.style.height = 'auto';
                        el.style.height = el.scrollHeight + 'px';
                    }

                    inputElement.addEventListener('input', () => autoExpandTextarea(inputElement));

                    setTimeout(() => autoExpandTextarea(inputElement), 0);
                    fieldContainer.appendChild(inputElement);
                } else {
                    inputElement = document.createElement('input');
                    inputElement.type =
                        fieldDef.type === 'password'
                            ? 'password'
                            : fieldDef.type === 'number'
                            ? 'number'
                            : 'text';
                    inputElement.name = `${type}_${fieldDef.key}_${module}`;
                    inputElement.className = 'input';
                    inputElement.required = fieldDef.required || false;
                    inputElement.id = `${type}_${fieldDef.key}_${module}`;
                    if (fieldDef.placeholder) inputElement.placeholder = fieldDef.placeholder;
                    if (notifyObj[fieldDef.key] !== undefined && notifyObj[fieldDef.key] !== null) {
                        inputElement.value = notifyObj[fieldDef.key];
                    }
                }
                if (isPassword && fieldDef.type !== 'checkbox') {
                    const wrap = document.createElement('div');
                    wrap.className = 'password-wrapper';
                    wrap.style.position = 'relative';

                    inputElement.type = 'password';

                    const toggle = document.createElement('span');
                    toggle.className = 'toggle-password';
                    toggle.innerHTML = '👁️';
                    toggle.style.cursor = 'pointer';
                    toggle.addEventListener('click', () => {
                        if (inputElement.type === 'password') {
                            inputElement.type = 'text';
                            toggle.textContent = '🙈';
                        } else {
                            inputElement.type = 'password';
                            toggle.textContent = '👁️';
                        }
                    });
                    wrap.appendChild(inputElement);
                    wrap.appendChild(toggle);
                    fieldContainer.appendChild(wrap);
                } else if (fieldDef.type !== 'checkbox') {
                    fieldContainer.appendChild(inputElement);
                }
                fieldset.appendChild(fieldContainer);
            }

            testBtn.addEventListener('click', async () => {
                testBtn.classList.remove('btn--success', 'btn--cancel', 'running');
                testBtn.textContent = 'Testing...';
                testBtn.classList.add('running');
                testBtn.disabled = true;

                const missingFields = [];
                for (const fieldDef of def.fields) {
                    if (fieldDef.required) {
                        const name = `${type}_${fieldDef.key}_${module}`;
                        const inputEl = fieldset.querySelector(`[name="${name}"]`);
                        let value =
                            inputEl?.type === 'checkbox' ? inputEl.checked : inputEl?.value?.trim();
                        if (inputEl?.tagName === 'TEXTAREA')
                            value = inputEl.value
                                .split(/[\n,]+/)
                                .map((s) => s.trim())
                                .filter(Boolean);
                        if (!value || (Array.isArray(value) && value.length === 0)) {
                            missingFields.push(fieldDef.label);
                        }
                    }
                }
                if (missingFields.length > 0) {
                    showToast(
                        '❌ Required fields missing:\n' +
                            missingFields.map((f) => `• ${f}`).join('\n'),
                        'error',
                        6000
                    );
                    resetTestButton();
                    return;
                }

                const notifyObj = {};
                def.fields.forEach((fieldDef) => {
                    const name = `${type}_${fieldDef.key}_${module}`;
                    const input = fieldset.querySelector(`[name="${name}"]`);
                    if (!input) return;
                    let val;
                    if (input.type === 'checkbox') val = input.checked;
                    else if (input.tagName === 'TEXTAREA')
                        val = input.value
                            .split(/[\n,]+/)
                            .map((s) => s.trim())
                            .filter(Boolean);
                    else if (input.type === 'number') val = Number(input.value);
                    else val = input.value;
                    notifyObj[fieldDef.key] = val;
                });

                const payload = {
                    module,
                    notifications: { [type]: notifyObj },
                };

                const res = await fetch('/api/test-notification', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
                let result;
                try {
                    result = await res.json();
                } catch {
                    result = null;
                }

                if (res.ok && result && typeof result === 'object' && 'result' in result) {
                    if (result.result) {
                        showToast(
                            `✅ ${module} (${type}) test notification: ${
                                result.message || 'Success'
                            }`,
                            'success'
                        );
                        testBtn.textContent = 'Success';
                        testBtn.classList.remove('running');
                        testBtn.classList.add('btn--success');
                    } else {
                        showToast(
                            `❌ ${module} (${type}) test notification: ${
                                result.message || 'Failed'
                            }`,
                            'error',
                            6000
                        );
                        testBtn.textContent = 'Fail';
                        testBtn.classList.remove('running');
                        testBtn.classList.add('btn--cancel');
                    }
                } else {
                    showToast(
                        `❌ ${module} (${type}) test notification: Unexpected response`,
                        'error',
                        6000
                    );
                    testBtn.textContent = 'Fail';
                    testBtn.classList.remove('running');
                    testBtn.classList.add('btn--cancel');
                }
                setTimeout(() => {
                    testBtn.textContent = 'Test';
                    testBtn.classList.remove('btn--success', 'btn--cancel', 'running');
                    testBtn.disabled = false;
                }, 1200);
            });

            function resetTestButton() {
                testBtn.textContent = 'Test';
                testBtn.classList.remove('btn--success', 'btn--cancel', 'running');
                testBtn.disabled = false;
            }

            input.addEventListener('change', () => {
                if (input.checked) {
                    fieldset.classList.add('expanded');
                    testBtn.classList.add('enabled');
                } else {
                    fieldset.classList.remove('expanded');
                    testBtn.classList.remove('enabled');
                }
            });
            input.addEventListener('change', () => {
                if (input.checked) {
                    fieldRow.classList.add('toggle-row--expanded');
                    fieldset.classList.add('expanded');
                    testBtn.classList.add('enabled');
                } else {
                    fieldRow.classList.remove('toggle-row--expanded');
                    fieldset.classList.remove('expanded');
                    testBtn.classList.remove('enabled');
                }
            });

            card.appendChild(fieldRow);
            card.appendChild(fieldset);
        }

        form.appendChild(card);
        setTimeout(() => card.classList.add('show-card'), 40 * cardIndex);
        cardIndex++;
    }

    const searchInput = document.getElementById('notifications-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            window.skipDirtyCheck = true;
            searchInput.defaultValue = searchInput.value;
            const query = e.target.value.toLowerCase();
            document.querySelectorAll('.card').forEach((card) => {
                let text = '';
                const header = card.querySelector('.card-header');
                if (header) text += header.textContent + ' ';
                card.querySelectorAll('.fieldset-legend').forEach((leg) => {
                    text += leg.textContent + ' ';
                });
                card.querySelectorAll('input, textarea').forEach((input) => {
                    if (
                        input.tagName === 'TEXTAREA' ||
                        input.type === 'text' ||
                        input.type === 'number'
                    ) {
                        text += input.value + ' ';
                    } else if (input.type === 'checkbox') {
                        text += (input.checked ? 'true' : 'false') + ' ';
                    }
                });
                text = text.toLowerCase().trim();
                card.style.display = query === '' || text.includes(query) ? 'flex' : 'none';
            });
        });
    }

    const saveBtn = document.getElementById('saveBtn');
    bindSaveButton(saveBtn, buildNotificationPayload, 'notifications');
}
