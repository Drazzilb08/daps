/**
 * Loads and renders all notification settings UI for each module.
 * Dynamically builds toggle switches, test buttons, and input fields based on definitions.
 */
window.loadNotifications = async function()
{
    const form = document.getElementById('notificationsForm');
    if (!form) return;
    const config = await window.fetchConfig();
    window.DAPS = window.DAPS ||
    {};
    window.DAPS.globalConfig = config;
    const notifications = config.notifications ||
    {};
    const modules = Array.isArray(window.notificationList) ? window.notificationList : Object.keys(notifications);
    const DEFINITIONS = window.NOTIFICATION_DEFINITIONS ||
    {};
    const notifyTypes = Object.keys(DEFINITIONS);
    const allowedTypesMap = window.NOTIFICATION_TYPES_PER_MODULE ||
    {};
    form.innerHTML = '';
    for (const module of modules)
    {
        const moduleSettings = notifications[module] ||
        {};
        const enabledTypes = Object.keys(moduleSettings);
        // ===== Notification Card and Toggle UI Rendering =====
        const card = document.createElement("div");
        card.className = "notification-card";
        card.style.position = "relative";
        const header = document.createElement("label");
        header.textContent = module.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        header.className = "notification-card-header";
        card.appendChild(header);
        // Notification fields container
        const field = document.createElement("div");
        field.className = "notification-fields-wrapper notification-fields";
        // Container for toggle+fieldset blocks
        const toggleFieldsetGroup = document.createElement("div");
        toggleFieldsetGroup.className = "notification-toggle-column";
        const moduleAllowedTypes = allowedTypesMap[module] || notifyTypes;
        for (const type of moduleAllowedTypes)
        {
            // Toggle block and fieldset
            const block = document.createElement("div");
            block.className = "notification-toggle-block";
            const wrapper = document.createElement("label");
            wrapper.className = "toggle-switch";
            const input = document.createElement("input");
            input.type = "checkbox";
            input.name = `${module}_${type}`;
            input.checked = enabledTypes.includes(type);
            const slider = document.createElement("span");
            slider.className = "slider";
            wrapper.appendChild(input);
            wrapper.appendChild(slider);
            const toggleLabel = document.createElement("span");
            toggleLabel.textContent = type.charAt(0).toUpperCase() + type.slice(1);
            toggleLabel.className = "toggle-label";
            const row = document.createElement("div");
            row.className = "toggle-row";
            row.appendChild(wrapper);
            // ===== Test Notification Handler =====
            const typeTestBtn = document.createElement("button");
            typeTestBtn.type = "button";
            typeTestBtn.textContent = "Test";
            typeTestBtn.className = "test-btn inline-test-btn";
            typeTestBtn.dataset.module = module;
            typeTestBtn.dataset.type = type;
            typeTestBtn.addEventListener("click", async () =>
            {
                typeTestBtn.classList.remove('success', 'error', 'testing');
                typeTestBtn.textContent = 'Testing...';
                typeTestBtn.classList.add('testing');
                const missingFields = [];
                for (const fieldDef of def.fields)
                {
                    if (fieldDef.required)
                    {
                        const name = `${type}_${fieldDef.key}_${module}`;
                        const inputEl = fieldset.querySelector(`[name="${name}"]`);
                        if (!inputEl)
                        {
                            missingFields.push(fieldDef.label);
                            continue;
                        }
                        let value;
                        if (inputEl.type === 'checkbox')
                        {
                            value = inputEl.checked;
                        }
                        else if (inputEl.tagName === 'TEXTAREA')
                        {
                            value = inputEl.value.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
                        }
                        else if (inputEl.type === 'number')
                        {
                            value = inputEl.value;
                        }
                        else
                        {
                            value = inputEl.value.trim();
                        }
                        if (
                            (Array.isArray(value) && value.length === 0) ||
                            (!Array.isArray(value) && (value === "" || value === null || value === undefined))
                        )
                        {
                            missingFields.push(fieldDef.label);
                        }
                    }
                }
                if (missingFields.length > 0)
                {
                    window.showToast(
                        "❌ Required fields missing:\n" + missingFields.map(f => `• ${f}`).join("\n"),
                        'error',
                        6000
                    );
                    resetTestButton();
                    return;
                }
                const notifyObj = {};
                def.fields.forEach(fieldDef =>
                {
                    const name = `${type}_${fieldDef.key}_${module}`;
                    const input = fieldset.querySelector(`[name="${name}"]`);
                    if (!input) return;
                    let val;
                    if (input.type === 'checkbox') val = input.checked;
                    else if (input.tagName === 'TEXTAREA') val = input.value.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
                    else if (input.type === 'number') val = Number(input.value);
                    else val = input.value;
                    notifyObj[fieldDef.key] = val;
                });
                const payload = {
                    module,
                    notifications:
                    {
                        [type]: notifyObj
                    }
                };
                const res = await fetch('/api/test-notification',
                {
                    method: 'POST',
                    headers:
                    {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });
                let result;
                try
                {
                    result = await res.json();
                }
                catch
                {
                    result = null;
                }
                if (res.ok && result && typeof result === 'object' && 'result' in result)
                {
                    if (result.result)
                    {
                        window.showToast(`✅ ${module} (${type}) test notification: ${result.message || 'Success'}`, 'success');
                        typeTestBtn.textContent = 'Success';
                        typeTestBtn.classList.remove('testing');
                        typeTestBtn.classList.add('success');
                    }
                    else
                    {
                        window.showToast(`❌ ${module} (${type}) test notification: ${result.message || 'Failed'}`, 'error', 6000);
                        typeTestBtn.textContent = 'Fail';
                        typeTestBtn.classList.remove('testing');
                        typeTestBtn.classList.add('error');
                    }
                }
                else
                {
                    window.showToast(`❌ ${module} (${type}) test notification: Unexpected response`, 'error', 6000);
                    typeTestBtn.textContent = 'Fail';
                    typeTestBtn.classList.remove('testing');
                    typeTestBtn.classList.add('error');
                }
                setTimeout(() =>
                {
                    typeTestBtn.textContent = 'Test';
                    typeTestBtn.classList.remove('success', 'error', 'testing');
                    typeTestBtn.disabled = false;
                }, 1000);
            });

            /**
             * Resets the visual state of a test notification button.
             */
            function resetTestButton()
            {
                typeTestBtn.textContent = 'Test';
                typeTestBtn.classList.remove('success', 'error', 'testing');
                typeTestBtn.disabled = false;
            }
            // Show button only when its associated toggle is on
            typeTestBtn.style.display = input.checked ? "inline-block" : "none";
            row.appendChild(toggleLabel);
            const isEnabled = enabledTypes.includes(type);
            const notifyObj = (moduleSettings[type] && typeof moduleSettings[type] === 'object') ? moduleSettings[type] :
            {};
            const def = DEFINITIONS[type];
            if (!def || !def.fields) continue;
            // ===== Notification Input Fields Rendering =====
            const fieldset = document.createElement("fieldset");
            fieldset.style.marginTop = "0.75rem";
            fieldset.style.border = "1px solid var(--shadow)";
            fieldset.style.borderRadius = "6px";
            fieldset.style.padding = "0.75rem";
            fieldset.style.background = "var(--input-bg)";
            if (isEnabled) fieldset.classList.add("expanded");
            fieldset.dataset.notifyType = type;
            const legend = document.createElement("legend");
            legend.textContent = def.label + " Settings";
            legend.style.fontWeight = "bold";
            fieldset.appendChild(legend);
            for (const fieldDef of def.fields)
            {
                const fieldContainer = document.createElement("div");
                fieldContainer.style.marginBottom = "0.65rem";
                const fieldLabel = document.createElement("label");
                fieldLabel.textContent = fieldDef.label;
                fieldLabel.style.display = "block";
                fieldLabel.style.marginBottom = "0.15rem";
                fieldLabel.setAttribute("for", `${type}_${fieldDef.key}_${module}`);
                fieldContainer.appendChild(fieldLabel);
                let inputElement;
                const isPassword = fieldDef.key.toLowerCase().includes("password");
                if (fieldDef.type === "checkbox")
                {
                    const toggleWrapper = document.createElement("label");
                    toggleWrapper.className = "toggle-switch";
                    inputElement = document.createElement("input");
                    inputElement.type = "checkbox";
                    inputElement.className = "toggle-input";
                    inputElement.name = `${type}_${fieldDef.key}_${module}`;
                    inputElement.required = fieldDef.required || false;
                    inputElement.id = `${type}_${fieldDef.key}_${module}`;
                    inputElement.setAttribute("autocomplete", "off");
                    inputElement.checked = notifyObj[fieldDef.key] || false;
                    const toggleSlider = document.createElement("span");
                    toggleSlider.className = "slider";
                    toggleWrapper.appendChild(inputElement);
                    toggleWrapper.appendChild(toggleSlider);
                    fieldContainer.appendChild(toggleWrapper);
                }
                else if (fieldDef.type === "textarea")
                {
                    inputElement = document.createElement("textarea");
                    inputElement.name = `${type}_${fieldDef.key}_${module}`;
                    inputElement.className = "input textarea-input";
                    inputElement.required = fieldDef.required || false;
                    inputElement.id = `${type}_${fieldDef.key}_${module}`;
                    inputElement.setAttribute("autocomplete", "off");
                    inputElement.rows = 3;
                    if (fieldDef.placeholder) inputElement.placeholder = fieldDef.placeholder;
                    if (notifyObj[fieldDef.key] !== undefined && notifyObj[fieldDef.key] !== null)
                    {
                        inputElement.value = Array.isArray(notifyObj[fieldDef.key]) ?
                            notifyObj[fieldDef.key].join(", ") :
                            notifyObj[fieldDef.key];
                    }
                    fieldContainer.appendChild(inputElement);
                    inputElement.style.overflow = 'hidden';
                    inputElement.style.resize = 'none';
                    const autoResize = (el) =>
                    {
                        el.style.height = 'auto';
                        el.style.height = el.scrollHeight + 'px';
                    };
                    inputElement.addEventListener('input', () => autoResize(inputElement));
                    requestAnimationFrame(() => autoResize(inputElement));
                }
                else
                {
                    inputElement = document.createElement("input");
                    inputElement.type = fieldDef.type === "password" ?
                        "password" :
                        (fieldDef.type === "number" ? "number" : "text");
                    inputElement.name = `${type}_${fieldDef.key}_${module}`;
                    inputElement.className = "input";
                    inputElement.required = fieldDef.required || false;
                    inputElement.id = `${type}_${fieldDef.key}_${module}`;
                    inputElement.setAttribute("autocomplete", "off");
                    if (fieldDef.placeholder) inputElement.placeholder = fieldDef.placeholder;
                    if (notifyObj[fieldDef.key] !== undefined && notifyObj[fieldDef.key] !== null)
                    {
                        inputElement.value = notifyObj[fieldDef.key];
                    }
                }
                if (isPassword && fieldDef.type !== "checkbox")
                {
                    inputElement.classList.add("masked-input");
                    inputElement.setAttribute("autocomplete", "off");
                    const wrapper = document.createElement("div");
                    wrapper.className = "password-wrapper";
                    const toggle = document.createElement("span");
                    toggle.className = "toggle-password";
                    toggle.innerHTML = "👁️";
                    toggle.addEventListener("click", () =>
                    {
                        const isMasked = inputElement.classList.toggle("masked-input");
                        toggle.textContent = isMasked ? "👁️" : "🙈";
                    });
                    wrapper.appendChild(inputElement);
                    wrapper.appendChild(toggle);
                    fieldContainer.appendChild(wrapper);
                }
                else if (fieldDef.type !== "checkbox")
                {
                    fieldContainer.appendChild(inputElement);
                }
                fieldset.appendChild(fieldContainer);
            }
            // Wrap fieldset in .notification-slide container
            const slideContainer = document.createElement("div");
            slideContainer.className = "notification-slide";
            if (isEnabled) slideContainer.classList.add("expanded");
            // Move test button to top right of the slide
            typeTestBtn.classList.remove("inline-test-btn");
            typeTestBtn.classList.add("test-btn-top-right");
            slideContainer.appendChild(typeTestBtn);
            slideContainer.appendChild(fieldset);
            input.addEventListener("change", () =>
            {
                slideContainer.classList.toggle("expanded", input.checked);
                typeTestBtn.style.display = input.checked ? "inline-block" : "none";
            });
            // Group toggle and slideContainer vertically
            block.appendChild(row);
            block.appendChild(slideContainer);
            toggleFieldsetGroup.appendChild(block);
        }
        // Add vertical group to field container
        field.appendChild(toggleFieldsetGroup);
        card.appendChild(field);
        form.appendChild(card);
        requestAnimationFrame(() => card.classList.add("show-card"));
    }
    // ===== Notification Search Functionality =====
    const searchInput = document.getElementById("notifications-search");
    if (searchInput)
    {
        searchInput.addEventListener("input", (e) =>
        {
            window.skipDirtyCheck = true;
            searchInput.defaultValue = searchInput.value;
            const query = e.target.value.toLowerCase();
            document.querySelectorAll(".notification-card").forEach((card) =>
            {
                let text = "";
                const header = card.querySelector(".notification-card-header");
                if (header) text += header.textContent + " ";
                card.querySelectorAll("legend").forEach(leg =>
                {
                    text += leg.textContent + " ";
                });
                card.querySelectorAll("input, textarea").forEach(input =>
                {
                    if (input.tagName === "TEXTAREA" || input.type === "text" || input.type === "number")
                    {
                        text += input.value + " ";
                    }
                    else if (input.type === "checkbox")
                    {
                        text += (input.checked ? "true" : "false") + " ";
                    }
                });
                text = text.toLowerCase().trim();
                card.style.display = query === "" || text.includes(query) ? "flex" : "none";
            });
        });
    }
    // Bind the Save button
    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) {
        saveBtn.type = 'button';
        saveBtn.onclick = saveNotifications;
    }
};
/**
 * Constructs the full notification settings payload from the form inputs.
 *
 * @returns {Promise<Object|null>} The payload object or null if validation fails.
 */
async function buildNotificationPayload()
{
    const form = document.getElementById('notificationsForm');
    if (!form) return null;
    const result = {};
    const DEFINITIONS = window.NOTIFICATION_DEFINITIONS ||
    {};
    const missingFields = [];
    document.querySelectorAll('.notification-card').forEach(card =>
    {
        const module = card.querySelector('.notification-card-header')?.textContent
            ?.toLowerCase().replace(/\s+/g, '_');
        if (!module) return;
        const moduleObj = {};
        const toggles = Array.from(card.querySelectorAll('.toggle-switch input[type="checkbox"]'));
        toggles.forEach(toggle =>
        {
            const match = toggle.name.match(new RegExp(`^${module}_(.+)$`));
            if (!match) return;
            const type = match[1];
            const def = DEFINITIONS[type];
            const fields = {};
            if (def?.fields && toggle.checked)
            {
                for (const field of def.fields)
                {
                    const input = form.querySelector(`[name="${type}_${field.key}_${module}"]`);
                    if (!input) continue;
                    let val;
                    if (input.type === 'checkbox')
                    {
                        val = input.checked;
                    }
                    else if (input.tagName === 'TEXTAREA' && field.key === 'to')
                    {
                        val = input.value.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
                    }
                    else if (input.type === 'number')
                    {
                        val = Number(input.value);
                    }
                    else
                    {
                        val = input.value.trim();
                    }
                    if (field.required && (val === "" || (Array.isArray(val) && val.length === 0)))
                    {
                        missingFields.push(`${module}: ${type} – ${field.label}`);
                    }
                    fields[field.key] = val;
                }
                moduleObj[type] = fields;
            }
            else if (toggle.checked)
            {
                moduleObj[type] = {};
            }
        });
        result[module] = moduleObj;
    });
    if (missingFields.length > 0)
    {
        const msg = "❌ Required fields missing:\n" + missingFields.map(f => `• ${f}`).join("\n");
        window.showToast(msg, 'error', 7000);
        return null;
    }
    return {
        notifications: result
    };
}
/**
 * Collects and sends updated notification settings to the backend.
 *
 * @returns {Promise<void>}
 */
/**
 * Save handler for notification settings, mirroring saveSettings style.
 */
async function saveNotifications() {
  const wrapper = await buildNotificationPayload();
  if (!wrapper || typeof wrapper.notifications !== 'object') return;
  const payload = { notifications: wrapper.notifications };
  try {
    const res = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw res;
    window.isDirty = false;
    window.showToast('✅ Notifications updated!', 'success');
  } catch (err) {
    let msg = err.statusText || 'Save failed';
    try { const data = await err.json(); msg = data.error || msg; } catch {}
    window.showToast(`❌ ${msg}`, 'error');
  }
}
// ===== Toggle Expand/Collapse Handler =====
document.querySelectorAll('.notification-toggle').forEach(toggle =>
{
    toggle.addEventListener('change', (e) =>
    {
        const container = e.target.closest('.notification-module');
        const content = container && container.querySelector('.toggle-content');
        if (content) {
            if (e.target.checked)
            {
                content.classList.add('open');
            }
            else
            {
                content.classList.remove('open');
            }
        }
    });
});

// Initialize notifications page on load
document.addEventListener('DOMContentLoaded', () => {
    if (typeof window.loadNotifications === 'function') {
        window.loadNotifications();
    }
});