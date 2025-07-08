import { fetchConfig } from './helper.js';
import { buildInstancesPayload } from './payload.js';

import { DAPS } from './common.js';
const { bindSaveButton, showToast, humanize, markDirty } = DAPS;

export async function loadInstances() {
    const config = await fetchConfig();
    const instances = config.instances || {};
    const form = document.getElementById('instancesForm');
    if (!form) return;
    form.innerHTML = '';
    for (const [service, items] of Object.entries(instances)) {
        const section = document.createElement('div');
        section.className = 'category';
        const h2 = document.createElement('h2');
        h2.textContent = humanize(service);
        section.appendChild(h2);
        const listDiv = document.createElement('div');
        for (const [name, settings] of Object.entries(items)) {
            const entry = createEntry(service, name, settings);
            listDiv.appendChild(entry);
        }
        const addBtn = document.createElement('button');
        addBtn.type = 'button';
        addBtn.className = 'instance-btn btn';
        addBtn.textContent = `+ Add ${humanize(service)}`;
        addBtn.addEventListener('click', () => {
            const newEntry = createEntry(
                service,
                '',
                {
                    url: '',
                    api: '',
                },
                true
            );
            listDiv.appendChild(newEntry);
            setTimeout(() => newEntry.classList.add('show-card'), 10);
        });
        section.appendChild(listDiv);
        section.appendChild(addBtn);
        form.appendChild(section);
    }

    document.querySelectorAll('.card').forEach((el, i) => {
        setTimeout(() => el.classList.add('show-card'), i * 80);
    });

    const saveBtn = document.getElementById('saveBtn');
    bindSaveButton(saveBtn, buildInstancesPayload, 'instances');
}

/**
 * Creates a DOM element representing an instance entry for a given service.
 *
 * @param {string} service - The service name.
 * @param {string} name - The instance name.
 * @param {Object} settings - The instance settings containing url and api key.
 * @param {boolean} [isNew=false] - Whether the entry is a newly added one.
 * @returns {HTMLElement} The DOM element representing the instance entry.
 */
function createEntry(service, name, settings, isNew = false) {
    const card = document.createElement('div');
    card.className = 'card';

    const field = document.createElement('div');
    field.className = 'field';

    const nameLabel = document.createElement('label');
    nameLabel.textContent = 'Name';
    const urlLabel = document.createElement('label');
    urlLabel.textContent = 'URL';
    const apiLabel = document.createElement('label');
    apiLabel.textContent = 'API Key';

    field.appendChild(nameLabel); // col 1
    field.appendChild(urlLabel); // col 2
    field.appendChild(apiLabel); // col 3
    field.appendChild(document.createElement('div')); // col 4 (empty)

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.name = `${service}__name`;
    nameInput.value = name;
    nameInput.required = true;
    nameInput.placeholder = 'Instance Name';
    nameInput.className = 'input';
    field.appendChild(nameInput);

    const urlInput = document.createElement('input');
    urlInput.type = 'text';
    urlInput.name = `${service}__url`;
    urlInput.value = settings.url || '';
    urlInput.placeholder = 'Instance URL';
    urlInput.className = 'input';
    field.appendChild(urlInput);

    const apiWrap = document.createElement('div');
    apiWrap.className = 'password-wrapper';
    const apiInput = document.createElement('input');
    apiInput.type = 'text';
    apiInput.name = `${service}__api`;
    apiInput.value = settings.api || '';
    apiInput.className = 'input masked-input';
    apiInput.autocomplete = 'off';
    apiInput.placeholder = 'Paste API Key here';
    const toggle = document.createElement('span');
    toggle.className = 'toggle-password';
    toggle.textContent = '👁️';
    toggle.addEventListener('click', () => {
        const masked = apiInput.classList.toggle('masked-input');
        toggle.textContent = masked ? '👁️' : '🙈';
    });
    apiWrap.appendChild(apiInput);
    apiWrap.appendChild(toggle);
    field.appendChild(apiWrap);

    const btnContainer = document.createElement('div');
    btnContainer.className = 'btn-container';

    const testBtn = document.createElement('button');
    testBtn.type = 'button';
    testBtn.textContent = 'Test';
    testBtn.className = 'btn run-btn';
    testBtn.addEventListener('click', async () => {
        testBtn.classList.remove('btn--success', 'btn--cancel', 'error');
        testBtn.textContent = 'Testing...';
        testBtn.classList.add('running');
        testBtn.disabled = true;
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
            showToast(`✅ ${nameInput.value.trim()} connection successful`, 'success');
            testBtn.textContent = 'Success';
            testBtn.classList.remove('running');
            testBtn.classList.add('btn--success');
        } else {
            const err = await res.json();
            showToast(
                `❌ ${nameInput.value.trim()} test failed: ${err.error || res.statusText}`,
                'error'
            );
            testBtn.textContent = 'Fail';
            testBtn.classList.remove('running');
            testBtn.classList.add('btn--cancel', 'error');
        }
        setTimeout(() => {
            testBtn.textContent = 'Test';
            testBtn.classList.remove('btn--success', 'btn--cancel', 'error', 'running');
            testBtn.disabled = false;
        }, 2500);
    });
    btnContainer.appendChild(testBtn);

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.textContent = '✖';
    removeBtn.className = 'btn btn--cancel remove-instance';
    removeBtn.addEventListener('click', () => {
        const instanceName = nameInput.value || '<unnamed>';
        if (confirm(`Are you sure you want to remove instance "${instanceName}"?`)) {
            markDirty();
            card.classList.add('removing');
            setTimeout(() => card.remove(), 350);
        }
    });
    btnContainer.appendChild(removeBtn);

    field.appendChild(btnContainer); // col 4, row 2

    for (let i = 0; i < 4; ++i) field.appendChild(document.createElement('div'));

    card.appendChild(field);

    if (isNew) setTimeout(() => nameInput.focus(), 50);

    [nameInput, urlInput, apiInput].forEach((input) =>
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') testBtn.click();
        })
    );

    return card;
}
