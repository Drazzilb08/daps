// ===== Save Payload =====
/**
 * Saves the given payload to the server configuration endpoint.
 *
 * @param {Object} payload - The payload object containing instances data.
 * @returns {Promise<void>} Resolves when the save operation completes.
 */
async function savePayload(payload)
{
    console.log(paylaod)
    const res = await fetch('/api/config',
    {
        method: 'POST',
        headers:
        {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });
    if (res.ok)
    {
        window.showToast('✅ Schedule updated successfully!', 'success');
    }
    else
    {
        const err = await res.json();
        window.showToast('❌ Failed to update schedule: ' + (err.error || res.statusText), 'error');
    }
}
/**
 * Save handler for instances settings, mirroring saveSettings style.
 */
async function saveInstances() {
    console.log('[DEBUG] saveInstances invoked');
  const payload = await buildInstancesPayload();
  if (!payload) return;
  try {
    const res = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw res;
    window.isDirty = false;
    window.showToast('✅ Instances updated!', 'success');
  } catch (err) {
    let msg = err.statusText || 'Save failed';
    try { const data = await err.json(); msg = data.error || msg; } catch {}
    window.showToast(`❌ ${msg}`, 'error');
  }
}

// ===== Load Instances =====
/**
 * Loads instances from the configuration and populates the form UI.
 *
 * @returns {Promise<void>} Resolves when instances are loaded and UI is updated.
 */
window.loadInstances = async function() {
    const config = await window.fetchConfig();
    const instances = config.instances || {};
    const form = document.getElementById('instancesForm');
    if (!form) return;
    form.innerHTML = '';
    for (const [service, items] of Object.entries(instances)) {
        const section = document.createElement('div');
        section.className = 'category';
        const h2 = document.createElement('h2');
        h2.textContent = window.humanize(service);
        section.appendChild(h2);
        const listDiv = document.createElement('div');
        listDiv.className = 'instance-entries';
        for (const [name, settings] of Object.entries(items)) {
            const entry = createEntry(service, name, settings);
            listDiv.appendChild(entry);
        }
        const addBtn = document.createElement('button');
        addBtn.type = 'button';
        addBtn.className = 'instance-btn';
        addBtn.textContent = `+ Add ${window.humanize(service)}`;
        addBtn.addEventListener('click', () => {
            const newEntry = createEntry(
                service,
                '',
                { url: '', api: '' },
                true
            );
            listDiv.appendChild(newEntry);
        });
        section.appendChild(listDiv);
        section.appendChild(addBtn);
        form.appendChild(section);
    }
    // Bind the Save button now that the fragment is loaded
    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) {
        saveBtn.type = 'button';
        saveBtn.onclick = saveInstances;
    }
};

// ===== Create Entry UI =====
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
    const div = document.createElement('div');
    div.className = 'instance-entries';
    const contentDiv = document.createElement('div');
    contentDiv.className = 'instance-entry';
    contentDiv.classList.add('instance-entry-animate');
    const nameDiv = document.createElement('div');
    nameDiv.className = 'instance-subfield';
    const nameLabel = document.createElement('label');
    nameLabel.textContent = 'Name';
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.name = `${service}__name`;
    nameInput.value = name;
    nameInput.required = true;
    nameInput.placeholder = 'Instnance Name';
    nameDiv.appendChild(nameLabel);
    nameDiv.appendChild(nameInput);
    contentDiv.appendChild(nameDiv);
    const urlDiv = document.createElement('div');
    urlDiv.className = 'instance-subfield';
    const urlLabel = document.createElement('label');
    urlLabel.textContent = 'URL';
    const urlInput = document.createElement('input');
    urlInput.type = 'text';
    urlInput.name = `${service}__url`;
    urlInput.value = settings.url || '';
    urlInput.placeholder = 'Instance URL';
    urlDiv.appendChild(urlLabel);
    urlDiv.appendChild(urlInput);
    contentDiv.appendChild(urlDiv);
    const apiDiv = document.createElement('div');
    apiDiv.className = 'instance-subfield';
    const apiLabel = document.createElement('label');
    apiLabel.textContent = 'API Key';
    apiDiv.appendChild(apiLabel);
    const wrapper = document.createElement('div');
    wrapper.className = 'api-wrapper';
    const apiInput = document.createElement('input');
    apiInput.type = 'text';
    apiInput.name = `${service}__api`;
    apiInput.value = settings.api || '';
    apiInput.className = 'masked-input';
    apiInput.setAttribute('autocomplete', 'off');
    apiInput.placeholder = 'Paste API Key here';
    const toggle = document.createElement('span');
    toggle.className = 'toggle-api';
    toggle.textContent = '👁️';
    toggle.addEventListener('click', () => {
        const isMasked = apiInput.classList.toggle('masked-input');
        toggle.textContent = isMasked ? '👁️' : '🙈';
    });
    wrapper.appendChild(apiInput);
    wrapper.appendChild(toggle);
    apiDiv.appendChild(wrapper);
    contentDiv.appendChild(apiDiv);
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'entry-actions';
    const testBtn = document.createElement('button');
    testBtn.type = 'button';
    testBtn.textContent = 'Test';
    testBtn.className = 'test-btn';
    testBtn.addEventListener('click', async () => {
        testBtn.classList.remove('success', 'error');
        testBtn.textContent = 'Testing...';
        testBtn.classList.add('testing');
        testBtn.disabled = true;
        const res = await fetch('/api/test-instance', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                service,
                name: nameInput.value.trim(),
                url: urlInput.value.trim(),
                api: apiInput.value.trim()
            })
        });
        if (res.ok) {
            window.showToast(`✅ ${nameInput.value.trim()} connection successful`, 'success');
            testBtn.textContent = 'Success';
            testBtn.classList.remove('testing');
            testBtn.classList.add('success');
        } else {
            const err = await res.json();
            window.showToast(`❌ ${nameInput.value.trim()} test failed: ${err.error || res.statusText}`, 'error');
            testBtn.textContent = 'Fail';
            testBtn.classList.remove('testing');
            testBtn.classList.add('error');
        }
        setTimeout(() => {
            testBtn.textContent = 'Test';
            testBtn.classList.remove('success', 'error', 'testing');
            testBtn.disabled = false;
        }, 2500);
    });
    actionsDiv.appendChild(testBtn);
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.textContent = '✖';
    removeBtn.className = 'remove-btn';
    removeBtn.addEventListener('click', () => {
        const instanceName = nameInput.value || '<unnamed>';
        if (confirm(`Are you sure you want to remove instance "${instanceName}"?`)) {
            window.markDirty();
            contentDiv.classList.add('removing');
            setTimeout(() => div.remove(), 300);
        }
    });
    actionsDiv.appendChild(removeBtn);
    contentDiv.appendChild(actionsDiv);
    div.appendChild(contentDiv);
    if (isNew) {
        setTimeout(() => nameInput.focus(), 50);
    }
    [nameInput, urlInput, apiInput].forEach(input =>
        input.addEventListener('keydown', e => {
            if (e.key === 'Enter') testBtn.click();
        })
    );
    return div;
}

// ===== Build Payload =====
/**
 * Builds the payload object from the current form state for saving instances.
 *
 * @returns {Promise<Object|null>} The payload object containing instances or null if invalid.
 */
async function buildInstancesPayload() {
    const form = document.getElementById('instancesForm');
    if (!form) return null;
    const data = new FormData(form);
    const newInstances = {};
    document.querySelectorAll('.category').forEach(section => {
        const service = section.querySelector('h2').textContent.toLowerCase().replace(/ /g, '_');
        newInstances[service] = {};
        section.querySelectorAll('.instance-entries .instance-entry').forEach(entryDiv => {
            const name = entryDiv.querySelector('input[name$="__name"]').value.trim();
            const url = entryDiv.querySelector('input[name$="__url"]').value.trim();
            const api = entryDiv.querySelector('input[name$="__api"]').value.trim();
            if (name) {
                newInstances[service][name] = {
                    url,
                    api
                };
            }
        });
    });
    const hasAny = Object.values(newInstances).some(serviceObj => Object.keys(serviceObj).length > 0);
    if (!hasAny) {
        alert('You must define at least one instance before saving.');
        return null;
    }
    return {
        instances: newInstances
    };
}

// Remove DOMContentLoaded block: Instances page is loaded dynamically.
window.saveChanges = saveInstances;