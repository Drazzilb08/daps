// ===== Config Field Type Definitions =====
window.fetchConfig = async function()
{
    try
    {
        const res = await fetch("/api/config");
        if (!res.ok) throw new Error("Failed to fetch config");
        return await res.json();
    }
    catch (err)
    {
        console.error("Error loading config:", err);
        return {};
    }
};
const BOOL_FIELDS = ['dry_run', 'skip', 'sync_posters', 'run_border_replacerr', 'print_files', 'rename_folders', 'unattended', 'enable_batching', 'asset_folders', 'print_only_renames', 'incremental_border_replacerr', 'silent', "disable_batching", "replace_border"];
const JSON_FIELDS = ['token'];
const DROP_DOWN_FIELDS = ['log_level', 'action_type', 'app_type', 'app_instance'];
const INT_FIELDS = ['border_width', 'count', 'radarr_count', 'sonarr_count', 'searches', "season_monitored_threshold:"];
const TEXT_FIELDS = ['client_id', 'client_secret', 'gdrive_sa_location', 'id', 'name', 'tag_name', 'ignore_tag', 'labels'];
const DIR_PICKER = ['source_dirs', 'destination_dir', 'data_dir', 'location'];
const TEXTAREA_FIELDS = ['exclude_profiles', 'exclude_movies', 'exclude_series', 'exclusion_list', 'ignore_root_folders', 'ignore_collections', 'ignore_media', 'exclude'];
const COLOR_PICKER = ['border_colors', 'color']
const ARR_AND_PLEX_INSTANCES = ['poster_renamerr', 'poster_cleanarr', 'unmatched_assets'];
const RENDER_TABLE = ['gdrive_list', 'Holidays', 'instances_list', 'mappings'];
const DROP_DOWN_OPTIONS = {
    log_level: ['info', 'debug'],
    action_type: ['copy', 'move', 'hardlink', 'symlink'],
};
// ===== Module-Specific Settings Renderers =====
const MODULE_RENDERERS = {
    'poster_renamerr': renderPosterRenamerrSettings,
    'labelarr': renderLabelarrSettings,
    'border_replacerr': renderReplacerrSettings,
    'upgradinatorr': renderUpgradinatorrSettings,
    'sync_gdrive': renderGdriveSettings,
    'nohl': renderNohlSettings,
    'jduparr': renderJduparrSettings,
    'health_checkarr': renderHealthCheckarrSettings,
    'poster_cleanarr': renderPosterCleanarrSettings,
    'renameinatorr': renderRenameinatorrSettings,
    'unmatched_assets': renderUnmatchedAssetsSettings,
    'main': renderMain
};
// ===== Global Help Renderer =====
function renderGlobalHelp(moduleName = window.currentModuleName)
{
    const helpEntry = Array.isArray(window.help?.settings) ?
        window.help.settings.find(h => h[moduleName]) :
        null;
    if (!helpEntry) return null;
    const helpWrapper = document.createElement('div');
    helpWrapper.className = 'settings-help';
    const helpToggle = document.createElement('button');
    helpToggle.type = 'button';
    helpToggle.className = 'settings-help-toggle';
    helpToggle.innerHTML = `<span class='help-label'>Need help with ${window.humanize(moduleName)}?</span>`;
    const helpContent = document.createElement('pre');
    helpContent.className = 'settings-help-content';
    helpContent.innerHTML = helpEntry[moduleName].map(entry =>
    {
        if (typeof entry === 'string')
        {
            return `<div>${entry}</div>`;
        }
        else if (typeof entry === 'object' && entry.type === 'link')
        {
            return `<div><a href="${entry.url}" target="_blank" rel="noopener noreferrer">${entry.text}</a></div>`;
        }
        return '';
    }).join('');
    let isToggling = false;
    helpToggle.addEventListener('click', () =>
    {
        if (isToggling) return;
        isToggling = true;
        helpContent.classList.toggle('show');
        setTimeout(() =>
        {
            isToggling = false;
        }, 300);
    });
    helpWrapper.appendChild(helpToggle);
    helpWrapper.appendChild(helpContent);
    return helpWrapper;
}
// ===== Generic Field Renderer =====
function renderField(formFields, key, value)
{
    if (DROP_DOWN_FIELDS.includes(key))
    {
        const opts = DROP_DOWN_OPTIONS[key] || [];
        formFields.appendChild(renderDropdownField(key, value, opts));
    }
    else if (BOOL_FIELDS.includes(key))
    {
        formFields.appendChild(renderBooleanField(key, value));
    }
    else if (INT_FIELDS.includes(key))
    {
        formFields.appendChild(renderNumberField(key, value));
    }
    else if (TEXTAREA_FIELDS.includes(key))
    {
        formFields.appendChild(renderTextareaArrayField(key, value));
    }
    else if (TEXT_FIELDS.includes(key))
    {
        formFields.appendChild(renderTextField(key, value));
    }
    else if (DIR_PICKER.includes(key))
    {
        formFields.appendChild(renderTextField(key, value));
    }
    else
    {
        formFields.appendChild(renderTextField(key, value));
    }
}
// ===== Field Rendering Helpers =====
function createField(label, html)
{
    const div = document.createElement('div');
    div.className = 'field';
    div.innerHTML = `
      <label>${label}</label>
      <div class="field-control">${html}</div>
    `;
    return div;
}
/**
 * Generate HTML for a boolean dropdown (true/false).
 * @param {string} name - The name attribute for the select element.
 * @param {boolean} selected - The current selected value.
 * @returns {string} HTML string for the select element.
 */
function boolDropdown(name, selected)
{
    return `<select class="select" name="${name}">
        <option value="true"${selected ? ' selected' : ''}>True</option>
        <option value="false"${!selected ? ' selected' : ''}>False</option>
    </select>`;
}
/**
 * Render a text input field, optionally wired as a directory picker.
 * @param {string} name - The field name and label key.
 * @param {string} value - The current value for the input.
 * @returns {HTMLDivElement} The created field element.
 */
function renderTextField(name, value)
{
    /**
     * Render a list-of-directories field (no drag handles, no drag logic).
     * @param {string} name
     * @param {string[]} list
     */
    function createListField(name, list)
    {
        const label = window.humanize(name);
        const moduleName = window.currentModuleName;
        const placeholder = window.PLACEHOLDER_TEXT[moduleName]?.[name] ?? '';
        const field = document.createElement('div');
        field.className = 'field field--three-col setting-field setting-field--three-col';
        field.innerHTML = `
            <label>${label}</label>
            <button type="button" class="btn add-control-btn">➕ Add ${label}</button>
            <div class="subfield-list"></div>
        `;
        const container = field.querySelector('.subfield-list');
        let data = Array.isArray(list) ? [...list] : [];
        const supportsMode = moduleName === 'nohl';
        data = data.map(entry =>
        {
            if (typeof entry === 'string')
            {
                return supportsMode ?
                {
                    path: entry,
                    mode: 'resolve'
                } :
                {
                    path: entry
                };
            }
            return entry;
        });
        if (data.length === 0)
        {
            data = [supportsMode ?
            {
                path: '',
                mode: 'resolve'
            } :
            {
                path: ''
            }];
        }

        function renderSubfield(entry)
        {
            const sub = document.createElement('div');
            sub.className = 'subfield';
            sub.innerHTML = `
                <input type="text" class="input source-path" name="${name}" value="${entry.path}" readonly placeholder="${placeholder}" />
                ${supportsMode ? `
                    <select class="select source-mode" name="mode">
                        <option value="resolve"${entry.mode === 'resolve' ? ' selected' : ''}>Resolve</option>
                        <option value="scan"${entry.mode === 'scan' ? ' selected' : ''}>Scan</option>
                    </select>` : ''}
                <button type="button" class="btn remove-item remove-dir-btn">−</button>
            `;
            const txt = sub.querySelector('input.source-path');
            txt.addEventListener('click', () => window.directoryPickerModal(txt));
            sub.querySelector('.remove-item').onclick = () =>
            {
                sub.remove();
                window.isDirty = true;
                updateRemoveButtons();
            };
            return sub;
        }
        data.forEach(entry => container.appendChild(renderSubfield(entry)));

        function updateRemoveButtons()
        {
            const subs = container.querySelectorAll('.subfield');
            subs.forEach(sub =>
            {
                const btn = sub.querySelector('.remove-item');
                btn.disabled = subs.length <= 1;
                btn.style.opacity = btn.disabled ? '0.5' : '';
                btn.style.cursor = btn.disabled ? 'not-allowed' : '';
            });
        }
        updateRemoveButtons();
        field.querySelector('.add-control-btn').onclick = () =>
        {
            container.appendChild(renderSubfield(supportsMode ?
            {
                path: '',
                mode: 'resolve'
            } :
            {
                path: ''
            }));
            window.isDirty = true;
            updateRemoveButtons();
        };
        return field;
    }
    if (name === 'source_dirs')
    {
        // Use the generic list field for source_dirs
        return createListField(name, Array.isArray(value) ? value : [value]);
    }
    const label = window.humanize(name);
    const isDir = DIR_PICKER.includes(name);
    const readonly = isDir ? 'readonly' : '';
    // Determine placeholder: module-specific first, then directory hint, then empty
    const moduleName = window.currentModuleName;
    const placeholder = window.PLACEHOLDER_TEXT[moduleName]?.[name] ??
        (isDir ? 'Click to pick a directory' : '');
    const field = createField(
        label,
        `<input type="text" class="input" name="${name}" value="${value || ''}" ${readonly} placeholder="${placeholder}" />`
    );
    if (isDir)
    {
        const input = field.querySelector(`input[name="${name}"]`);
        input.addEventListener('click', () => window.directoryPickerModal(input));
    }
    return field;
}
/**
 * Render a boolean (true/false) dropdown field.
 * @param {string} name - The field name.
 * @param {boolean|string} value - The current value.
 * @returns {HTMLDivElement} The created field element.
 */
function renderBooleanField(name, value)
{
    const label = window.humanize(name);
    return createField(label, boolDropdown(name, value === true || value === 'true'));
}

/**
 * Render a special boolean field for remove_borders, enforcing logic based on border_colors.
 * - If border_colors is non-empty, remove_borders is forced false and cannot be toggled true (with warning).
 * - If border_colors is empty, remove_borders is forced true and cannot be toggled false (with warning).
 * - Otherwise, acts as a normal boolean field.
 * A hint message is shown below the select explaining the logic.
 * @param {Object} config - The config object containing at least remove_borders and border_colors.
 * @returns {HTMLDivElement} The created field element.
 */
function renderRemoveBordersBooleanField(config)
{
    const name = "remove_borders";
    const label = window.humanize(name);
    const borderColors = Array.isArray(config.border_colors) ? config.border_colors.filter(Boolean) : [];
    let forcedValue, disabled, warning = "";

    if (borderColors.length === 0) {
        // No colors: always True, disabled
        forcedValue = true;
        disabled = true;
        warning = "Borders will be removed because no border colors are set. Add a border color to disable this option.";
    } else {
        // One or more colors: always False, disabled
        forcedValue = false;
        disabled = true;
        warning = "Cannot remove borders while custom border colors are set. Remove all border colors to enable this option.";
    }

    // The rest stays the same
    let html = `<select class="select" name="${name}"${disabled ? " disabled" : ""}>
        <option value="true"${forcedValue ? ' selected' : ''}>True</option>
        <option value="false"${!forcedValue ? ' selected' : ''}>False</option>
    </select>`;
    html += `<div class="field-hint" style="margin-top:0.25em;font-size:0.95em;color:#888;">
        <strong>Note:</strong> This setting is <b>automatically controlled</b>:
        <ul style="margin:0.25em 0 0.25em 1.5em;padding:0;">
            <li>If any border colors are set, borders will not be removed.</li>
            <li>If no border colors are set, borders will always be removed.</li>
        </ul>
        ${warning ? `<span style="color:#b22;">${warning}</span>` : ""}
    </div>`;
    return createField(label, html);
}
/**
 * Render a dropdown select field with custom options.
 * @param {string} name - The name attribute for the select.
 * @param {string} value - The currently selected option.
 * @param {string[]} options - Array of option values.
 * @returns {HTMLDivElement} The created field element.
 */
function renderDropdownField(name, value, options)
{
    // Determine module-specific placeholder for this dropdown, if any
    const moduleName = window.currentModuleName;
    const placeholder = window.PLACEHOLDER_TEXT[moduleName]?.[name];
    // Build the <select> with an optional disabled placeholder option
    let html = `<select class="select" name="${name}">`;
    if (placeholder)
    {
        html += `<option value="" disabled${value == null || value === '' ? ' selected' : ''}>${placeholder}</option>`;
    }
    html += options.map(opt =>
        `<option value="${opt}"${value === opt ? ' selected' : ''}>${window.humanize(opt)}</option>`
    ).join('');
    html += `</select>`;
    return createField(window.humanize(name), html);
}
/**
 * Render a textarea for array or JSON input, auto-resizing to content.
 * @param {string} name - The field name (key).
 * @param {Array|Object|string} values - Array of lines or JSON object/string.
 * @returns {HTMLDivElement} The created field element.
 */
function renderTextareaArrayField(name, values)
{
    let content = '';
    let placeholder = '';
    if (name === 'token')
    {
        // Use placeholder for the full default placeholder text, preserve multiline
        placeholder = window.PLACEHOLDER_TEXT?.[window.currentModuleName]?.token ?? '';
        content = (values === null || values === 'null') ?
            '' :
            (typeof values === 'object' ? JSON.stringify(values, null, 2) : values);
    }
    else
    {
        content = Array.isArray(values) ? values.join('\n') : '';
        placeholder = 'Enter items, one per line';
    }
    const moduleName = window.currentModuleName;
    placeholder = window.PLACEHOLDER_TEXT?.[moduleName]?.[name] ?? placeholder;
    // Create textarea element directly to allow multiline placeholder
    const textarea = document.createElement('textarea');
    textarea.name = name;
    textarea.rows = 6;
    textarea.className = 'textarea';
    textarea.value = content;
    textarea.placeholder = placeholder;
    const field = createField(window.humanize(name), '');
    field.querySelector('.field-control').appendChild(textarea);
    setTimeout(() =>
    {
        if (textarea)
        {
            textarea.style.height = 'auto';
            textarea.style.height = textarea.scrollHeight + 'px';
            textarea.addEventListener('input', () =>
            {
                textarea.style.height = 'auto';
                textarea.style.height = textarea.scrollHeight + 'px';
            });
        }
    }, 0);
    return field;
}
/**
 * Render a number input field.
 * @param {string} name - The field name.
 * @param {number} value - The current value.
 * @returns {HTMLDivElement} The created field element.
 */
function renderNumberField(name, value)
{
    const label = window.humanize(name);
    const html = `<input type="number" class="input number-field" name="${name}" value="${value}" min="0" step="1" />`;
    return createField(label, html);
}
// ===== Modals Initialization and Helpers =====
function renderModals()
{
    // Cache directory listings to avoid repeated backend calls
    const directoryCache = {};

    function directoryPickerModal(inputElement)
    {
        let suggestionTimeout;
        let modal = document.getElementById('dir-modal');
        if (!modal)
        {
            modal = document.createElement('div');
            modal.id = 'dir-modal';
            modal.className = 'modal';
            modal.style.display = 'none';
            modal.innerHTML = `
  <div class="modal-content">
    <h2>Select Directory</h2>
    <input type="text" id="dir-path-input" class="input" placeholder="Type or paste a path…" />
    <ul id="dir-list" class="dir-list"></ul>
    <div class="modal-footer">
      <button type="button" id="dir-create" class="btn">New Folder</button>
      <button type="button" id="dir-accept" class="btn btn--success">Accept</button>
      <button type="button" id="dir-cancel" class="btn btn--cancel">Cancel</button>
    </div>
  </div>`;
            document.body.appendChild(modal);
            const dirList = modal.querySelector('#dir-list');
            const pathInput = modal.querySelector('#dir-path-input');
            async function updateDirList()
            {
                const current = window.currentPath;
                const list = directoryCache[current] || [];
                dirList.innerHTML = '';
                // up one
                const up = document.createElement('li');
                up.textContent = '..';
                up.onclick = () =>
                {
                    if (current !== '/')
                    {
                        window.currentPath = current.split('/').slice(0, -1).join('/') || '/';
                        showPath(window.currentPath);
                    }
                };
                dirList.appendChild(up);
                // children
                (directoryCache[current] || []).sort().forEach(name =>
                {
                    const li = document.createElement('li');
                    li.textContent = name;
                    li.onclick = () =>
                    {
                        window.currentPath = current.endsWith('/') ? current + name : current + '/' + name;
                        showPath(window.currentPath);
                    };
                    li.ondblclick = () =>
                    {
                        inputElement.value = window.currentPath;
                        closeModal();
                    };
                    dirList.appendChild(li);
                });
            }

            function showPath(val)
            {
                window.currentPath = val;
                pathInput.value = val;
                if (!directoryCache[val])
                {
                    fetch(`/api/list?path=${encodeURIComponent(val)}`)
                        .then(res => res.json())
                        .then(d =>
                        {
                            directoryCache[val] = d.directories;
                            updateDirList();
                        })
                        .catch(e =>
                        {
                            console.error('List error:', e);
                        });
                }
                else
                {
                    updateDirList();
                }
            }

            function closeModal()
            {
                modal.style.display = 'none';
                window.currentInput = null;
            }
            pathInput.addEventListener('input', () =>
            {
                const val = pathInput.value.trim() || '/';
                window.currentPath = val;
                clearTimeout(suggestionTimeout);
                suggestionTimeout = setTimeout(() =>
                {
                    // Live-filter the directory list from cache without backend calls
                    const parent = val === '/' ? '/' : val.replace(/\/?[^/]+$/, '') || '/';
                    const partial = val.slice(parent.length).replace(/^\/+/, '').toLowerCase();
                    const entries = directoryCache[parent] || [];
                    if (entries.length)
                    {
                        dirList.innerHTML = '';
                        // Up one level
                        const up = document.createElement('li');
                        up.textContent = '..';
                        up.onclick = () =>
                        {
                            if (parent !== '/')
                            {
                                window.currentPath = parent.split('/').slice(0, -1).join('/') || '/';
                                showPath(window.currentPath);
                            }
                        };
                        dirList.appendChild(up);
                        // Filtered entries
                        entries
                            .filter(name => name.toLowerCase().startsWith(partial))
                            .sort()
                            .forEach(name =>
                            {
                                const li = document.createElement('li');
                                li.textContent = name;
                                li.onclick = () =>
                                {
                                    window.currentPath = parent.endsWith('/') ? parent + name : parent + '/' + name;
                                    showPath(window.currentPath);
                                };
                                li.ondblclick = () =>
                                {
                                    inputElement.value = window.currentPath;
                                    closeModal();
                                };
                                dirList.appendChild(li);
                            });
                    }
                    // If exact, navigate immediately
                    const entry = val.slice(parent.length).replace(/^\/+/, '');
                    if (directoryCache[parent]?.includes(entry))
                    {
                        showPath(val);
                    }
                }, 200);
            });
            pathInput.addEventListener('keydown', e =>
            {
                if (e.key === 'Enter')
                {
                    e.preventDefault();
                    showPath(pathInput.value.trim() || '/');
                }
            });
            modal.querySelector('#dir-create').onclick = async () =>
            {
                const name = prompt('New folder name:');
                if (!name) return;
                const newPath = window.currentPath.endsWith('/') ? window.currentPath + name : window.currentPath + '/' + name;
                try
                {
                    await fetch(`/api/create-folder?path=${encodeURIComponent(newPath)}`,
                    {
                        method: 'POST'
                    });
                    if (!directoryCache[window.currentPath]) directoryCache[window.currentPath] = [];
                    directoryCache[window.currentPath].push(name);
                    showPath(newPath);
                }
                catch (e)
                {
                    alert('Create failed: ' + e.message);
                }
            };
            modal.querySelector('#dir-cancel').onclick = closeModal;
            // expose helpers on modal for use below
            modal.updateDirList = updateDirList;
            modal.showPath = showPath;
            modal.closeModal = closeModal;
        }
        // open modal
        window.currentInput = inputElement;
        // Always bind the accept button to the latest input field
        const acceptBtn = modal.querySelector('#dir-accept');
        acceptBtn.onclick = () =>
        {
            window.currentInput.value = window.currentPath;
            modal.closeModal();
        };
        window.currentPath = inputElement.value.trim() || '/';
        const pathInput = modal.querySelector('#dir-path-input');
        pathInput.value = window.currentPath;
        // Use the same placeholder as the triggering input, if provided
        if (inputElement.placeholder)
        {
            pathInput.placeholder = inputElement.placeholder;
        }
        // preload cache and UI
        if (!directoryCache[window.currentPath])
        {
            fetch(`/api/list?path=${encodeURIComponent(window.currentPath)}`)
                .then(res => res.json())
                .then(d =>
                {
                    directoryCache[window.currentPath] = d.directories;
                    modal.updateDirList();
                });
        }
        else
        {
            modal.updateDirList();
        }
        modal.style.display = 'flex';
    }
    async function populateGDrivePresetsDropdown()
    {
        const presetSelect = document.getElementById('gdrive-sync-preset');
        const presetDetail = document.getElementById('gdrive-preset-detail');
        const searchBox = document.getElementById('gdrive-preset-search');
        if (!presetSelect) return;
        // Always fetch/await presets from remote
        const entries = await window.gdrivePresets();
        // Clear and fill dropdown
        presetSelect.innerHTML = '<option value="">— No Preset —</option>' +
            entries.map(drive =>
                `<option value="${drive.id}" data-name="${drive.name}">${drive.name}</option>`
            ).join('');
        // Re-init Select2 for better UX
        setTimeout(function()
        {
            if ($('#gdrive-sync-preset').data('select2'))
            {
                $('#gdrive-sync-preset').select2('destroy');
            }
            $('#gdrive-sync-preset').select2(
            {
                placeholder: "Select a GDrive preset",
                allowClear: true,
                width: '100%',
                dropdownParent: $('#gdrive-sync-preset').closest('.modal-content'),
                language:
                {
                    searching: () => "Type to filter drives…",
                    noResults: () => "No matching presets",
                    inputTooShort: () => "Type to search…"
                }
            });
            $('#gdrive-sync-preset').on('select2:open', function()
            {
                setTimeout(() =>
                {
                    $('.select2-search__field').attr('placeholder', 'Type to search presets…');
                }, 0);
            });
        }, 0);

        function updatePresetDetail()
        {
            const id = presetSelect.value;
            const drive = entries.find(d => String(d.id) === String(id));
            if (id && drive)
            {
                // Fill in the modal's input fields if present
                if (document.getElementById('gdrive-id')) document.getElementById('gdrive-id').value = drive.id ?? '';
                if (document.getElementById('gdrive-name')) document.getElementById('gdrive-name').value = drive.name ?? '';
                if (document.getElementById('gdrive-location')) document.getElementById('gdrive-location').value = drive.location ?? '';
                // Build detail panel showing all fields
                if (presetDetail)
                {
                    let metaLines = '';
                    // Type (subtle highlight)
                    if ('type' in drive)
                    {
                        metaLines += `<div class="preset-field"><span class="preset-label">Type:</span> <span class="preset-type">${drive.type}</span></div>`;
                    }
                    // Content/Remarks, light blue block
                    if ('content' in drive && drive.content)
                    {
                        metaLines += `<div class="preset-field"><span class="preset-label">Content:</span></div>`;
                        if (Array.isArray(drive.content))
                        {
                            metaLines += `<div class="preset-content">${drive.content.map(line => `<div>${line}</div>`).join('')}</div>`;
                        }
                        else
                        {
                            metaLines += `<div class="preset-content">${drive.content}</div>`;
                        }
                    }
                    // All other fields, show in a muted label/value pair
                    for (const key of Object.keys(drive))
                    {
                        if (['name', 'id', 'type', 'content'].includes(key)) continue;
                        metaLines += `<div class="preset-field"><span class="preset-label">${key.charAt(0).toUpperCase() + key.slice(1)}:</span> <span>${drive[key]}</span></div>`;
                    }
                    presetDetail.innerHTML = `<div class="preset-card">${metaLines || "<i>No extra metadata</i>"}</div>`;
                }
            }
            else if (presetDetail)
            {
                presetDetail.innerHTML = '';
            }
        }
        presetSelect.onchange = updatePresetDetail;
        updatePresetDetail();
        // Search box filter (if present)
        if (searchBox)
        {
            searchBox.addEventListener('input', () =>
            {
                const filter = searchBox.value.toLowerCase();
                Array.from(presetSelect.options).forEach(opt =>
                {
                    if (!opt.value) return;
                    opt.style.display = opt.text.toLowerCase().includes(filter) ? '' : 'none';
                });
                let firstVisible = Array.from(presetSelect.options).find(
                    opt => opt.style.display !== 'none' && opt.value
                );
                if (firstVisible)
                {
                    presetSelect.value = firstVisible.value;
                    updatePresetDetail();
                }
                else
                {
                    presetSelect.value = '';
                    updatePresetDetail();
                }
            });
        }
    }

    function gdriveSyncModal(editIdx)
    {
        const moduleName = 'sync_gdrive';
        const isEdit = typeof editIdx === 'number';
        let modal = document.getElementById('gdrive-sync-modal');
        if (!modal)
        {
            modal = document.createElement('div');
            modal.id = 'gdrive-sync-modal';
            modal.className = 'modal';
            modal.innerHTML = `
          <div class="modal-content">
            <label>Preset (optional)</label>
            <select id="gdrive-sync-preset" class="select">
              <option value="">— No Preset —</option>
            </select>
            <div id="gdrive-preset-detail" style="margin-bottom: 0.75rem;"></div>
            <label>Name</label><input type="text" id="gdrive-name" class="input" placeholder="${window.PLACEHOLDER_TEXT[moduleName]?.name ?? ''}" />
            <label>GDrive ID</label><input type="text" id="gdrive-id" class="input" placeholder="${window.PLACEHOLDER_TEXT[moduleName]?.id ?? ''}" />
            <label>Location</label><input type="text" id="gdrive-location" class="input" readonly placeholder="${window.PLACEHOLDER_TEXT[moduleName]?.location ?? ''}" />
            <div class="modal-footer">
              <button class="btn btn--success" id="gdrive-save-btn"></button>
              <button class="btn btn--cancel" id="gdrive-cancel-btn">Cancel</button>
            </div>
          </div>
        `;
            document.body.appendChild(modal);
            modal.querySelector('#gdrive-location').addEventListener('click', () => directoryPickerModal(modal.querySelector('#gdrive-location')));
            modal.querySelector('#gdrive-cancel-btn').onclick = () =>
            {
                modal.style.display = 'none';
            };
            setTimeout(populateGDrivePresetsDropdown, 0);
        }
        const presetSelect = modal.querySelector('#gdrive-sync-preset');
        const presetDetail = modal.querySelector('#gdrive-preset-detail');
        if (presetSelect)
        {
            // If using Select2, clear UI
            if ($(presetSelect).data('select2'))
            {
                $(presetSelect).val('').trigger('change');
            }
            else
            {
                presetSelect.value = '';
            }
        }
        if (presetDetail) presetDetail.innerHTML = '';
        const nameInput = modal.querySelector('#gdrive-name');
        const idInput = modal.querySelector('#gdrive-id');
        const locInput = modal.querySelector('#gdrive-location');
        if (isEdit)
        {
            const entry = window.gdriveSyncData[editIdx];
            nameInput.value = entry.name || '';
            idInput.value = entry.id || '';
            locInput.value = entry.location || '';
        }
        else
        {
            nameInput.value = '';
            idInput.value = '';
            locInput.value = '';
        }
        const heading = modal.querySelector('h2');
        if (heading)
        {
            heading.textContent = (isEdit ? 'Edit' : 'Add') + ' GDrive Sync';
        }
        const saveBtn = modal.querySelector('#gdrive-save-btn');
        if (saveBtn)
        {
            saveBtn.textContent = isEdit ? 'Save' : 'Add';
        }
        // Rebind Save button for each open
        if (saveBtn)
        {
            saveBtn.onclick = () =>
            {
                const name = modal.querySelector('#gdrive-name').value.trim();
                const id = modal.querySelector('#gdrive-id').value.trim();
                const loc = modal.querySelector('#gdrive-location').value.trim();
                if (!name || !id || !loc)
                {
                    return alert('All fields must be filled.');
                }
                const entry = {
                    id,
                    location: loc,
                    name
                };
                if (typeof editIdx === 'number')
                {
                    window.gdriveSyncData[editIdx] = entry;
                }
                else
                {
                    window.gdriveSyncData.push(entry);
                }
                window.updateGdriveList();
                window.isDirty = true;
                modal.style.display = 'none';
            };
        }
        modal.style.display = 'flex';
    }

    function borderReplacerrModal(editIdx)
    {
        const moduleName = 'border_replacerr';
        const isEdit = typeof editIdx === 'number';
        let modal = document.getElementById('border-replacerr-modal');
        if (!modal)
        {
            modal = document.createElement('div');
            modal.id = 'border-replacerr-modal';
            modal.className = 'modal';
            modal.innerHTML = `
          <div class="modal-content">
          <h2 id="border-replacerr-modal-heading"></h2>
            <label>Holiday Preset</label>
            <select id="holiday-preset" class="select">
              <option value="">Select preset...</option>
            </select>
            
            <label>Holiday Name</label>
            <input type="text" id="holiday-name" class="input" placeholder="${window.PLACEHOLDER_TEXT[moduleName]?.holiday_name ?? ''}" />
            
            <label>Schedule</label>
            <div class="schedule-range">
              <select id="schedule-from-month" class="select"></select>
              <select id="schedule-from-day" class="select"></select>
              <span class="schedule-to-label">To</span>
              <select id="schedule-to-month" class="select"></select>
              <select id="schedule-to-day" class="select"></select>
            </div>
            
            <label>Colors</label>
            <div id="border-colors-container" class="border-colors-container"></div>
            <button type="button" id="addBorderColor" class="btn">➕ Add Color</button>
            
            <div class="modal-footer">
              <button type="button" id="holiday-save-btn" class="btn btn--success"></button>
              <button type="button" id="holiday-cancel-btn" class="btn btn--cancel">Cancel</button>
            </div>
          </div>
        `;
            document.body.appendChild(modal);
        }
        loadHolidayPresets();
        populateScheduleDropdowns();
        const heading = modal.querySelector('h2');
        if (heading)
        {
            heading.textContent = (isEdit ? 'Edit' : 'Add') + ' Holiday';
        }
        const saveBtn = modal.querySelector('#holiday-save-btn');
        if (saveBtn)
        {
            saveBtn.textContent = isEdit ? 'Save' : 'Add';
        }
        const colorContainer = modal.querySelector('#border-colors-container');
        const addColorBtn = modal.querySelector('#addBorderColor');

        function addBorderColor(color = '#ffffff')
        {
            const swatch = document.createElement('div');
            swatch.className = 'subfield';
            swatch.innerHTML = `
          <input type="color" value="${color}" />
          <button type="button" class="remove-color btn">−</button>
        `;
            swatch.querySelector('.remove-color').onclick = () => swatch.remove();
            colorContainer.appendChild(swatch);
        }
        addColorBtn.onclick = () => addBorderColor();
        modal.querySelector('#holiday-cancel-btn').onclick = () =>
        {
            modal.style.display = 'none';
        };
        modal.querySelector('#holiday-save-btn').onclick = () =>
        {
            const name = modal.querySelector('#holiday-name').value.trim();
            const existing = window.borderReplacerrData || [];
            const duplicate = existing.some((entry, i) =>
                entry.holiday === name && (!isEdit || i !== editIdx)
            );
            if (duplicate)
            {
                alert('A holiday with this name already exists.');
                return;
            }
            const scheduleFrom = `${modal.querySelector('#schedule-from-month').value}/${modal.querySelector('#schedule-from-day').value}`;
            const scheduleTo = `${modal.querySelector('#schedule-to-month').value}/${modal.querySelector('#schedule-to-day').value}`;
            const colors = Array.from(modal.querySelectorAll('#border-colors-container input[type="color"]')).map(input => input.value);
            if (!name || !scheduleFrom || !scheduleTo || !colors.length)
            {
                alert('All fields are required.');
                return;
            }
            const schedule = `range(${scheduleFrom}-${scheduleTo})`;
            const holidayEntry = {
                holiday: name,
                schedule,
                color: colors
            };
            if (!window.borderReplacerrData) window.borderReplacerrData = [];
            if (isEdit)
            {
                window.borderReplacerrData[editIdx] = holidayEntry;
            }
            else
            {
                window.borderReplacerrData.push(holidayEntry);
            }
            modal.style.display = 'none';
            window.updateBorderReplacerrUI && window.updateBorderReplacerrUI();
            window.isDirty = true;
        };
        colorContainer.innerHTML = '';
        if (isEdit)
        {
            const entry = window.borderReplacerrData[editIdx];
            modal.querySelector('#holiday-name').value = entry.holiday || '';
            let from = '',
                to = '';
            if (entry.schedule && entry.schedule.startsWith('range(') && entry.schedule.endsWith(')'))
            {
                const range = entry.schedule.slice(6, -1);
                const [f, t] = range.split('-');
                from = f || '';
                to = t || '';
            }
            if (from)
            {
                const [fromMonth, fromDay] = from.split('/');
                modal.querySelector('#schedule-from-month').value = fromMonth || '';
                modal.querySelector('#schedule-from-day').value = fromDay || '';
            }
            if (to)
            {
                const [toMonth, toDay] = to.split('/');
                modal.querySelector('#schedule-to-month').value = toMonth || '';
                modal.querySelector('#schedule-to-day').value = toDay || '';
            }
            (entry.color || []).forEach(addBorderColor);
        }
        else
        {
            modal.querySelector('#holiday-name').value = '';
            modal.querySelector('#schedule-from-month').selectedIndex = 0;
            modal.querySelector('#schedule-from-day').selectedIndex = 0;
            modal.querySelector('#schedule-to-month').selectedIndex = 0;
            modal.querySelector('#schedule-to-day').selectedIndex = 0;
            addBorderColor();
        }
        modal.style.display = 'flex';
    }

    function loadHolidayPresets()
    {
        const presetSelect = document.getElementById('holiday-preset');
        if (!presetSelect) return;
        presetSelect.innerHTML = '<option value="">Select preset...</option>' +
            Object.keys(window.holidayPresets ||
            {}).map(
                label => `<option value="${label}">${label}</option>`
            ).join('');
        presetSelect.onchange = function()
        {
            const label = presetSelect.value;
            const modal = presetSelect.closest('.modal-content');
            if (!label || !window.holidayPresets[label]) return;
            const preset = window.holidayPresets[label];
            modal.querySelector('#holiday-name').value = label;
            if (preset.schedule && preset.schedule.startsWith('range(') && preset.schedule.endsWith(')'))
            {
                const range = preset.schedule.slice(6, -1);
                const [from, to] = range.split('-');
                if (from)
                {
                    const [fromMonth, fromDay] = from.split('/');
                    modal.querySelector('#schedule-from-month').value = fromMonth || '';
                    modal.querySelector('#schedule-from-day').value = fromDay || '';
                }
                if (to)
                {
                    const [toMonth, toDay] = to.split('/');
                    modal.querySelector('#schedule-to-month').value = toMonth || '';
                    modal.querySelector('#schedule-to-day').value = toDay || '';
                }
            }
            const colorContainer = modal.querySelector('#border-colors-container');
            colorContainer.innerHTML = '';
            (preset.colors || []).forEach(color =>
            {
                const swatch = document.createElement('div');
                swatch.className = 'subfield';
                swatch.innerHTML = `
            <input type="color" value="${color}" />
            <button type="button" class="remove-color btn">−</button>
          `;
                swatch.querySelector('.remove-color').onclick = () => swatch.remove();
                colorContainer.appendChild(swatch);
            });
        };
    }

    function populateScheduleDropdowns()
    {
        const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthDayCounts = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        ['from', 'to'].forEach(type =>
        {
            const monthSel = document.getElementById(`schedule-${type}-month`);
            const daySel = document.getElementById(`schedule-${type}-day`);
            if (!monthSel || !daySel) return;
            monthSel.innerHTML = monthLabels.map((label, idx) =>
            {
                const value = String(idx + 1).padStart(2, '0');
                return `<option value="${value}">${label}</option>`;
            }).join('');

            function updateDays()
            {
                const m = parseInt(monthSel.value, 10);
                const days = monthDayCounts[m - 1];
                let opts = '';
                for (let d = 1; d <= days; d++)
                {
                    const dd = String(d).padStart(2, '0');
                    opts += `<option value="${dd}">${dd}</option>`;
                }
                daySel.innerHTML = opts;
            }
            monthSel.addEventListener('change', updateDays);
            updateDays();
        });
    }

    function labelarrModal(editIdx, rootConfig)
    {
        const moduleName = 'labelarr';
        const isEdit = typeof editIdx === 'number';
        let modal = document.getElementById('labelarr-modal');
        if (!modal)
        {
            modal = document.createElement('div');
            modal.id = 'labelarr-modal';
            modal.className = 'modal';
            modal.innerHTML = `
              <div class="modal-content">
                <h2 id="labelarr-modal-heading"></h2>
                <label>App Type</label>
                <select id="labelarr-app-type" class="select">
                  <option value="radarr">Radarr</option>
                  <option value="sonarr">Sonarr</option>
                </select>
                <label>App Instance</label>
                <select id="labelarr-app-instance" class="select"></select>
                <label>Labels</label>
                <input type="text" id="labelarr-labels" class="input" placeholder="${window.PLACEHOLDER_TEXT[moduleName]?.labels ?? ''}" />
                <div id="labelarr-plex-list" class="instances-list"></div>
                <div class="modal-footer">
                  <button id="labelarr-save-btn" class="btn btn--success"></button>
                  <button id="labelarr-cancel-btn" class="btn btn--cancel">Cancel</button>
                </div>
              </div>
            `;
            document.body.appendChild(modal);
            const plexListDiv = modal.querySelector('#labelarr-plex-list');
            plexListDiv.innerHTML = '';
            const plexInstancesList = Object.keys(rootConfig.instances?.plex ||
            {});
            plexInstancesList.forEach(pi =>
            {
                const card = document.createElement('div');
                card.classList.add('card');
                card.innerHTML = `
  <div class="plex-instance-header">
    <span class="plex-instance-title">${window.humanize(pi)}</span>
    <button type="button" class="btn load-libs-btn" data-inst="${pi}">
      Load Libraries
    </button>
  </div>
  <div id="labelarr-plex-libs-${pi}" class="plex-libraries"></div>
`;
                plexListDiv.appendChild(card);
            });
            plexListDiv.querySelectorAll('.load-libs-btn').forEach(btn =>
            {
                btn.addEventListener('click', async () =>
                {
                    const inst = btn.dataset.inst;
                    const libsDiv = plexListDiv.querySelector(`#labelarr-plex-libs-${inst}`);
                    btn.disabled = true;
                    try
                    {
                        const res = await fetch(`/api/plex/libraries?instance=${encodeURIComponent(inst)}`);
                        const libs = await res.json();
                        const checkedLibs = Array.from(libsDiv.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
                        libsDiv.innerHTML = libs.map(l => `
                          <label class="library-pill">
                            <input type="checkbox" value="${l}" ${checkedLibs.includes(l) ? 'checked' : ''}/>
                            ${l}
                          </label>
                        `).join('');
                        libsDiv.classList.add('open');
                        libsDiv.querySelectorAll('input').forEach(cb2 => cb2.disabled = false);
                        // Set maxHeight to allow smooth expansion
                        libsDiv.style.maxHeight = libsDiv.scrollHeight + 'px';
                    }
                    finally
                    {
                        btn.disabled = false;
                    }
                });
            });
            modal.querySelector('#labelarr-cancel-btn').onclick = () =>
            {
                modal.style.display = 'none';
            };
            modal.querySelector('#labelarr-app-type').onchange = () =>
            {
                const type = modal.querySelector('#labelarr-app-type').value;
                const instSel = modal.querySelector('#labelarr-app-instance');
                instSel.innerHTML = '';
                Object.keys((rootConfig.instances?.[type] ||
                {})).forEach(inst =>
                {
                    const o = document.createElement('option');
                    o.value = inst;
                    o.textContent = window.humanize(inst);
                    instSel.appendChild(o);
                });
            };
            modal.querySelector('#labelarr-save-btn').onclick = () =>
            {
                const appType = modal.querySelector('#labelarr-app-type').value;
                const appInstance = modal.querySelector('#labelarr-app-instance').value;
                const labels = modal.querySelector('#labelarr-labels').value.split(',').map(s => s.trim()).filter(Boolean);
                const plex_instances = [];
                plexListDiv.querySelectorAll('.card').forEach(card =>
                {
                    const inst = card.querySelector('.load-libs-btn').dataset.inst;
                    const libs = Array.from(card.querySelectorAll('.plex-libraries input[type="checkbox"]:checked')).map(cb => cb.value);
                    if (libs.length)
                    {
                        plex_instances.push(
                        {
                            instance: inst,
                            library_names: libs
                        });
                    }
                });
                if (!labels.length || (!appInstance && plex_instances.length === 0))
                {
                    return alert('You must fill out labels and at least an App or Plex instance.');
                }
                const mapping = {
                    app_type: appType,
                    app_instance: appInstance,
                    labels,
                    plex_instances
                };
                if (typeof modal.dataset.editing !== 'undefined')
                {
                    window.labelarrData[modal.dataset.editing] = mapping;
                }
                else
                {
                    window.labelarrData.push(mapping);
                }
                modal.style.display = 'none';
                window.updateLabelarrTable();
                window.isDirty = true;
            };
        }
        modal = document.getElementById('labelarr-modal');
        delete modal.dataset.editing;
        const heading = modal.querySelector('#labelarr-modal-heading');
        if (heading)
        {
            heading.textContent = (isEdit ? 'Edit' : 'Add') + ' Mapping';
        }
        const saveBtn = modal.querySelector('#labelarr-save-btn');
        if (saveBtn)
        {
            saveBtn.textContent = isEdit ? 'Save' : 'Add';
        }
        if (isEdit)
        {
            const entry = window.labelarrData[editIdx];
            modal.dataset.editing = editIdx;
            modal.querySelector('#labelarr-app-type').value = entry.app_type;
            modal.querySelector('#labelarr-app-type').dispatchEvent(new Event('change'));
            modal.querySelector('#labelarr-app-instance').value = entry.app_instance;
            modal.querySelector('#labelarr-labels').value = (entry.labels || []).join(', ');
            const plexInstObj = {};
            (entry.plex_instances || []).forEach(inst =>
            {
                if (typeof inst === 'object' && inst.instance)
                {
                    plexInstObj[inst.instance] = {
                        library_names: inst.library_names || []
                    };
                }
            });
            const plexListDiv = modal.querySelector('#labelarr-plex-list');
            plexListDiv.querySelectorAll('.card').forEach(card =>
            {
                const inst = card.querySelector('.load-libs-btn').dataset.inst;
                const loadBtn = card.querySelector('.load-libs-btn');
                const libsDiv = card.querySelector('.plex-libraries');
                if (Object.keys(plexInstObj).includes(inst))
                {
                    libsDiv.classList.add('open');
                    const checkedLibs = plexInstObj[inst]?.library_names || [];
                    loadBtn.disabled = true;
                    fetch(`/api/plex/libraries?instance=${encodeURIComponent(inst)}`).then(res => res.json()).then(allLibs =>
                    {
                        libsDiv.innerHTML = allLibs.map(l => `
                            <label class="library-pill">
                                <input type="checkbox" value="${l}" ${checkedLibs.includes(l) ? 'checked' : ''}/> ${l}
                            </label>
                        `).join('');
                        libsDiv.classList.add('open');
                        libsDiv.querySelectorAll('input').forEach(cb2 => cb2.disabled = false);
                    }).finally(() =>
                    {
                        loadBtn.disabled = false;
                    });
                }
                else
                {
                    libsDiv.classList.remove('open');
                    libsDiv.innerHTML = '';
                    libsDiv.style.maxHeight = null;
                }
            });
        }
        else
        {
            modal.querySelector('#labelarr-app-type').value = 'radarr';
            modal.querySelector('#labelarr-app-type').dispatchEvent(new Event('change'));
            modal.querySelector('#labelarr-labels').value = '';
            modal.querySelectorAll('#labelarr-plex-list .plex-libraries').forEach(div =>
            {
                div.innerHTML = '';
                div.classList.remove('open');
                div.style.maxHeight = null;
            });
        }
        modal.style.display = 'flex';
    }

    function upgradinatorrModal(editIdx, rootConfig)
    {
        const moduleName = 'upgradinatorr';
        const isEdit = typeof editIdx === 'number';
        let modal = document.getElementById('upgradinatorr-modal');
        if (!modal)
        {
            modal = document.createElement('div');
            modal.id = 'upgradinatorr-modal';
            modal.className = 'modal';
            modal.innerHTML = `
                  <div class="modal-content">
                    <h2>${isEdit ? 'Edit' : 'Add'} Instance</h2>
                    <label>Instance</label>
                    <select id="upgradinatorr-instance" class="select"></select>
                    <label>Count</label>
                    <input type="number" id="upgradinatorr-count" class="input" />
                    <label>Tag Name</label>
                    <input type="text" id="upgradinatorr-tag-name" class="input" placeholder="${window.PLACEHOLDER_TEXT[moduleName]?.tag_name ?? ''}" />
                    <label>Ignore Tag</label>
                    <input type="text" id="upgradinatorr-ignore-tag" class="input" placeholder="${window.PLACEHOLDER_TEXT[moduleName]?.ignore_tag ?? ''}" />
                    <label>Unattended</label>
                    <select id="upgradinatorr-unattended" class="select">
                      <option value="true">True</option>
                      <option value="false">False</option>
                    </select>
                    <div id="season-threshold-container" style="display:none;">
                      <label>Season Monitored Threshold</label>
                      <input type="number" id="upgradinatorr-season-threshold" class="input" min="0" step="1" />
                    </div>
                    <div class="modal-footer">
                      <button id="upgradinatorr-save-btn" class="btn btn--success">${isEdit ? 'Save' : 'Add'}</button>
                      <button id="upgradinatorr-cancel-btn" class="btn btn--cancel">Cancel</button>
                    </div>
                  </div>
                `;
            document.body.appendChild(modal);
            const instSelect = modal.querySelector('#upgradinatorr-instance');
            const instList = [
                ...Object.keys(rootConfig.instances.radarr ||
                {}),
                ...Object.keys(rootConfig.instances.sonarr ||
                {})
            ];
            instList.forEach(inst =>
            {
                const opt = document.createElement('option');
                opt.value = inst;
                opt.textContent = window.humanize(inst);
                instSelect.appendChild(opt);
            });
            modal.querySelector('#upgradinatorr-cancel-btn').onclick = () =>
            {
                modal.style.display = 'none';
            };
            // Show/hide season threshold input based on instance type
            const thresholdField = modal.querySelector('#season-threshold-container');
            instSelect.addEventListener('change', () =>
            {
                const selected = instSelect.value;
                const isSonarr = Object.keys(rootConfig.instances.sonarr ||
                {}).includes(selected);
                thresholdField.style.display = isSonarr ? '' : 'none';
            });
            // trigger once on open
            instSelect.dispatchEvent(new Event('change'));
            modal.querySelector('#upgradinatorr-save-btn').onclick = () =>
            {
                const inst = modal.querySelector('#upgradinatorr-instance').value;
                const count = parseInt(modal.querySelector('#upgradinatorr-count').value, 10) || 0;
                const tag_name = modal.querySelector('#upgradinatorr-tag-name').value.trim();
                const ignore_tag = modal.querySelector('#upgradinatorr-ignore-tag').value.trim();
                const unattended = modal.querySelector('#upgradinatorr-unattended').value === 'true';
                const isSonarr = Object.keys(rootConfig.instances.sonarr ||
                {}).includes(inst);
                const season_threshold = isSonarr ? parseInt(modal.querySelector('#upgradinatorr-season-threshold').value, 10) || 0 : undefined;
                const entry = {
                    instance: inst,
                    count,
                    tag_name,
                    ignore_tag,
                    unattended
                };
                if (isSonarr) entry.season_monitored_threshold = season_threshold;
                // Instead of blindly pushing or replacing by editIdx, merge/replace by instance name:
                const existingIdx = window.upgradinatorrData.findIndex(e => e.instance === inst);
                if (existingIdx !== -1)
                {
                    window.upgradinatorrData[existingIdx] = entry;
                }
                else
                {
                    window.upgradinatorrData.push(entry);
                }
                updateTable();
                window.isDirty = true;
                modal.style.display = 'none';
            };
        }
        modal.querySelector('#upgradinatorr-instance').value = isEdit ? window.upgradinatorrData[editIdx].instance : '';
        modal.querySelector('#upgradinatorr-count').value = isEdit ? window.upgradinatorrData[editIdx].count : '';
        modal.querySelector('#upgradinatorr-tag-name').value = isEdit ? window.upgradinatorrData[editIdx].tag_name : '';
        modal.querySelector('#upgradinatorr-ignore-tag').value = isEdit ? window.upgradinatorrData[editIdx].ignore_tag : '';
        modal.querySelector('#upgradinatorr-unattended').value = isEdit ? String(window.upgradinatorrData[editIdx].unattended) : 'false';
        // Set season threshold field if editing or adding
        const seasonThresholdInput = modal.querySelector('#upgradinatorr-season-threshold');
        if (seasonThresholdInput)
        {
            seasonThresholdInput.value = isEdit ?
                (typeof window.upgradinatorrData[editIdx].season_monitored_threshold !== 'undefined' ?
                    window.upgradinatorrData[editIdx].season_monitored_threshold :
                    '') :
                '99';
        }
        // Update threshold field visibility on open
        const instSelect = modal.querySelector('#upgradinatorr-instance');
        const thresholdField = modal.querySelector('#season-threshold-container');
        if (instSelect && thresholdField)
        {
            instSelect.dispatchEvent(new Event('change'));
        }
        const heading = modal.querySelector('h2');
        if (heading)
        {
            heading.textContent = (isEdit ? 'Edit' : 'Add') + ' Upgradinatorr Instance List';
        }
        const saveBtn = modal.querySelector('#upgradinatorr-save-btn');
        if (saveBtn)
        {
            saveBtn.textContent = isEdit ? 'Save' : 'Add';
        }
        modal.style.display = 'flex';
    }
    window.gdriveSyncModal = gdriveSyncModal;
    window.directoryPickerModal = directoryPickerModal;
    window.borderReplacerrModal = borderReplacerrModal;
    window.labelarrModal = labelarrModal;
    window.upgradinatorrModal = upgradinatorrModal;
}
renderModals();
/**
 * Render a special table UI with an Add button and action column.
 * Uses a header row for most tables, but omits headers for GDrive sync.
 * @param {string} labelText - Visible label above the table.
 * @param {string} editBtnID - ID for the Add button.
 * @param {string} editBtnText - Button text.
 * @param {string} remBtnID - ID for the Remove button.
 * @param {string} remBtnText - Button text.
 * @param {string} tableId - ID for the <table> element.
 * @param {string[]} columns - Column names for headers.
 * @returns {HTMLDivElement} The container element for the table field.
 */
// ===== Module Settings Renderers =====
/**
 * Render the settings UI for the Poster Renamerr module.
 *
 * @param {HTMLElement} formFields - The container element to append fields to.
 * @param {Object} config - The module configuration object.
 * @param {Object} rootConfig - The full root configuration object.
 * @returns {void}
 */
function renderPosterRenamerrSettings(formFields, config, rootConfig)
{
    const wrapper = document.createElement('div');
    const help = renderGlobalHelp('poster_renamerr');
    if (help) wrapper.appendChild(help);
    wrapper.className = 'settings-wrapper module--poster_renamerr';
    /**
     * Creates a DOM element for a drag/drop directory list field.
     * @param {string} name - Field name for input elements.
     * @param {string[]} list - Array of directory paths.
     * @returns {HTMLDivElement}
     */
    function createDragDropField(name, list)
    {
        const field = document.createElement('div');
        // Determine placeholder text for this field based on module and field name
        const moduleName = window.currentModuleName;
        const placeholder = window.PLACEHOLDER_TEXT[moduleName]?.[name] || '';
        field.className = 'field field--three-col setting-field setting-field--three-col';
        field.innerHTML = `
          <label>${window.humanize(name)}</label>
          <button type="button" class="btn add-control-btn">➕ Add Directory</button>
          <div class="subfield-list"></div>
      `;
        const container = field.querySelector('.subfield-list');
        (Array.isArray(list) ? list : [list]).forEach((dir, idx) =>
        {
            const sub = document.createElement('div');
            sub.className = 'subfield';
            sub.innerHTML = `
             <span class="drag-handle" style="cursor: grab;">⋮⋮</span>
             <input type="text" name="${name}" value="${dir}" readonly placeholder="${placeholder}"/>
             <button type="button" class="remove-item remove-dir-btn">−</button>
           `;
            const txt = sub.querySelector('input[type="text"]');
            txt.addEventListener('click', () => window.directoryPickerModal(txt));
            sub.querySelector('.remove-item').onclick = () =>
            {
                sub.remove();
                window.isDirty = true;
                updateRemoveButtons();
            };
            container.appendChild(sub);
        });
        const updateRemoveButtons = () =>
        {
            const subs = container.querySelectorAll('.subfield');
            subs.forEach(sub =>
            {
                const btn = sub.querySelector('.remove-item');
                if (subs.length <= 1)
                {
                    btn.disabled = true;
                    btn.style.opacity = '0.5';
                    btn.style.cursor = 'not-allowed';
                }
                else
                {
                    btn.disabled = false;
                    btn.style.opacity = '';
                    btn.style.cursor = '';
                }
            });
        };
        updateRemoveButtons();
        const addBtn = field.querySelector('.add-control-btn');
        addBtn.onclick = () =>
        {
            const sub = document.createElement('div');
            sub.className = 'subfield';
            sub.innerHTML = `
             <span class="drag-handle" style="cursor: grab;">⋮⋮</span>
             <input type="text" name="${name}" readonly placeholder="${placeholder}"/>
             <button type="button" class="remove-item remove-dir-btn">−</button>
           `;
            const txt = sub.querySelector('input[type="text"]');
            txt.addEventListener('click', () => window.directoryPickerModal(txt));
            sub.querySelector('.remove-item').onclick = () =>
            {
                sub.remove();
                window.isDirty = true;
                updateRemoveButtons();
            };
            container.appendChild(sub);
            window.isDirty = true;
            updateRemoveButtons();
            makeDraggable(container);
        };

        function makeDraggable(list)
        {
            let dragged;
            list.querySelectorAll('.subfield').forEach(item =>
            {
                item.setAttribute('draggable', true);
                item.classList.add('draggable');
                item.style.transition = 'transform 0.2s ease, opacity 0.2s ease';
                item.addEventListener('dragstart', e =>
                {
                    dragged = item;
                    item.classList.add('dragging');
                    item.style.opacity = '0.5';
                    item.style.transform = 'scale(1.05)';
                    e.dataTransfer.effectAllowed = 'move';
                });
                item.addEventListener('dragover', e =>
                {
                    e.preventDefault();
                    const bounding = item.getBoundingClientRect();
                    const offset = e.clientY - bounding.top + (bounding.height / 2);
                    if (offset > bounding.height)
                    {
                        list.insertBefore(dragged, item.nextSibling);
                    }
                    else
                    {
                        list.insertBefore(dragged, item);
                    }
                });
                item.addEventListener('dragleave', () =>
                {
                    item.classList.remove('drag-over');
                });
                item.addEventListener('drop', e =>
                {
                    e.preventDefault();
                    item.classList.remove('drag-over');
                    window.isDirty = true;
                });
                item.addEventListener('dragend', () =>
                {
                    dragged.classList.remove('dragging');
                    dragged.style.opacity = '';
                    dragged.style.transform = '';
                    list.querySelectorAll('.subfield').forEach(sub => sub.classList.remove('drag-over'));
                });
            });
        }
        makeDraggable(container);
        return field;
    }
    Object.entries(config).forEach(([key, value]) =>
    {
        if (key === 'source_dirs')
        {
            wrapper.appendChild(createDragDropField(key, value));
        }
        else if (DIR_PICKER.includes(key))
        {
            wrapper.appendChild(renderTextField(key, value));
        }
        else if (key === 'instances')
        {
            renderPlexSonarrRadarrInstancesField(wrapper, value, rootConfig, 'poster_renamerr');
        }
        else
        {
            renderField(wrapper, key, value);
        }
    });
    formFields.appendChild(wrapper);
}
/**
 * Render the settings UI for the Labelarr module.
 *
 * @param {HTMLElement} formFields - The container element to append fields to.
 * @param {Object} config - The module configuration object.
 * @param {Object} rootConfig - The full root configuration object.
 * @returns {void}
 */
function renderLabelarrSettings(formFields, config, rootConfig)
{
    const wrapper = document.createElement('div');
    const help = renderGlobalHelp('labelarr');
    if (help) wrapper.appendChild(help);
    wrapper.className = 'settings-wrapper module--labelarr';
    Object.entries(config).forEach(([key, value]) =>
    {
        if (key !== 'mappings')
        {
            renderField(wrapper, key, value);
        }
    });
    const mappingsField = document.createElement('div');
    mappingsField.className = 'field field--three-col setting-field setting-field--three-col';
    mappingsField.innerHTML = `
        <label>Mappings</label>
        <button type="button" id="add-mapping-btn" class="btn add-control-btn">➕ Add Mapping</button>
        <div id="labelarr-mappings-container" class="mappings-container"></div>
    `;
    wrapper.appendChild(mappingsField);
    const mappingsContainer = mappingsField.querySelector('#labelarr-mappings-container');
    window.labelarrData = Array.isArray(config.mappings) ? [...config.mappings] : [];

    function updateMappings()
    {
        mappingsContainer.innerHTML = '';
        window.labelarrData.forEach((entry, i) =>
        {
            const card = document.createElement('div');
            card.className = 'mapping-card';
            const header = document.createElement('div');
            header.className = 'mapping-header';
            header.innerHTML = `
                <span class="mapping-app">${window.humanize(entry.app_type)} – ${window.humanize(entry.app_instance)}</span>
                <span class="mapping-labels">Labels: ${(entry.labels || []).map(window.humanize).join(', ')}</span>
                <div class="mapping-actions">
                    <button type="button" class="btn edit-btn" data-idx="${i}">Edit</button>
                    <button type="button" class="btn remove-btn" data-idx="${i}">Remove</button>
                </div>
            `;
            card.appendChild(header);
            const plexList = document.createElement('ul');
            plexList.className = 'mapping-plex-list';
            (entry.plex_instances || []).forEach(pi =>
            {
                const instKey = Object.keys(pi).find(k => k !== 'library_names');
                const libraries = Array.isArray(pi.library_names) ? pi.library_names : [];
                const plexItem = document.createElement('li');
                plexItem.innerHTML = `
                    <strong>${window.humanize(instKey)}</strong>
                    <ul class="library-names">
                        ${libraries.map(lib => `<li>${lib}</li>`).join('')}
                    </ul>
                `;
                plexList.appendChild(plexItem);
            });
            card.appendChild(plexList);
            mappingsContainer.appendChild(card);
        });
        mappingsContainer.querySelectorAll('.remove-btn').forEach(btn =>
        {
            btn.onclick = () =>
            {
                const idx = parseInt(btn.dataset.idx, 10);
                if (!isNaN(idx))
                {
                    const confirmed = confirm('Are you sure you want to remove this mapping?');
                    if (!confirmed) return;
                    window.labelarrData.splice(idx, 1);
                    updateMappings();
                    window.isDirty = true;
                }
            };
        });
        mappingsContainer.querySelectorAll('.edit-btn').forEach(btn =>
        {
            btn.onclick = () =>
            {
                const idx = parseInt(btn.dataset.idx, 10);
                if (!isNaN(idx))
                {
                    window.labelarrModal(idx, rootConfig);
                }
            };
        });
    }
    mappingsField.querySelector('#add-mapping-btn').onclick = () => window.labelarrModal(undefined, rootConfig);
    window.updateLabelarrMappings = updateMappings;
    window.updateLabelarrTable = updateMappings;
    updateMappings();
    formFields.appendChild(wrapper);
}
/**
 * Render the settings UI for the Border Replacerr module.
 *
 * @param {HTMLElement} formFields - The container element to append fields to.
 * @param {Object} config - The module configuration object.
 * @param {Object} rootConfig - The full root configuration object.
 * @returns {void}
 */
/**
 * Utility to (re)render the Remove Borders field in the DOM, ensuring only one instance and always in sync.
 * @param {Object} config - The config object.
 * @param {HTMLElement} wrapper - The settings wrapper DOM node.
 */
function rerenderRemoveBordersField(config, wrapper) {
    // Remove any existing Remove Borders field
    Array.from(wrapper.querySelectorAll('.field')).forEach(field => {
        const label = field.querySelector('label');
        if (label && label.textContent.trim().toLowerCase() === 'remove borders') {
            field.remove();
        }
    });
    // Always append at the end (the caller controls placement)
    const field = renderRemoveBordersBooleanField(config);
    wrapper.appendChild(field);
}

function renderReplacerrSettings(formFields, config, rootConfig)
{
    const wrapper = document.createElement('div');
    const help = renderGlobalHelp('border_replacerr');
    if (help) wrapper.appendChild(help);
    wrapper.className = 'settings-wrapper module--poster_renamerr';

    // 1. Render all fields except holidays, border_colors, remove_borders, exclusion_list, exclude
    Object.entries(config).forEach(([key, value]) =>
    {
        if (!['holidays', 'border_colors', 'remove_borders', 'exclusion_list', 'exclude'].includes(key))
        {
            renderField(wrapper, key, value);
        }
    });

    // 2. Render Border Colors field
    const borderColorField = document.createElement('div');
    borderColorField.className = 'field';
    borderColorField.innerHTML = `
    <label>Border Colors</label>
    <div id="border-colors-container"></div>
    <button type="button" id="addBorderColor" class="btn add-control-btn">➕ Add Color</button>
  `;
    // 3. Render Exclusion List fields (if present) before Remove Borders and Border Colors
    let exclusionFields = [];
    ['exclusion_list', 'exclude'].forEach(fieldKey => {
        if (fieldKey in config) {
            exclusionFields.push(renderTextareaArrayField(fieldKey, config[fieldKey]));
        }
    });

    // 4. Render Remove Borders field (after exclusion fields, before border colors)
    // Remove any existing Remove Borders field (should not exist yet, but for safety)
    Array.from(wrapper.querySelectorAll('.field')).forEach(field => {
        const label = field.querySelector('label');
        if (label && label.textContent.trim().toLowerCase() === 'remove borders') {
            field.remove();
        }
    });
    const removeBordersField = renderRemoveBordersBooleanField(config);

    // Insert exclusion fields and Remove Borders before Border Colors
    if (exclusionFields.length > 0) {
        exclusionFields.forEach(fieldNode => {
            wrapper.appendChild(fieldNode);
        });
    }
    wrapper.appendChild(removeBordersField);

    // 5. Render Border Colors field
    wrapper.appendChild(borderColorField);
    const borderColorsContainer = borderColorField.querySelector('#border-colors-container');

    // Helper to update config.border_colors and rerender Remove Borders field
    function updateBorderColorsFromDOM() {
        config.border_colors = Array.from(borderColorsContainer.querySelectorAll('input[type="color"]')).map(input => input.value);
        // Remove and re-insert Remove Borders field after exclusion fields
        Array.from(wrapper.querySelectorAll('.field')).forEach(field => {
            const label = field.querySelector('label');
            if (label && label.textContent.trim().toLowerCase() === 'remove borders') {
                field.remove();
            }
        });
        // Insert Remove Borders field after exclusion fields
        let insertAfter = null;
        // Find last exclusion field
        for (let i = wrapper.children.length - 1; i >= 0; i--) {
            const node = wrapper.children[i];
            const label = node.querySelector && node.querySelector('label');
            if (label && (label.textContent.trim().toLowerCase() === 'exclusion list' || label.textContent.trim().toLowerCase() === 'exclude')) {
                insertAfter = node;
                break;
            }
        }
        const removeBordersField = renderRemoveBordersBooleanField(config);
        if (insertAfter && insertAfter.nextSibling) {
            wrapper.insertBefore(removeBordersField, insertAfter.nextSibling);
        } else if (insertAfter) {
            wrapper.appendChild(removeBordersField);
        } else {
            // fallback: before borderColorField
            wrapper.insertBefore(removeBordersField, borderColorField);
        }
        window.isDirty = true;
    }

    function addColorPicker(container, color = '#ffffff')
    {
        const subfield = document.createElement('div');
        subfield.className = 'subfield';
        subfield.innerHTML = `
      <input type="color" value="${color}"/>
      <button type="button" class="btn remove-color">−</button>
    `;
        const colorInput = subfield.querySelector('input[type="color"]');
        colorInput.addEventListener('input', () => {
            updateBorderColorsFromDOM();
        });
        subfield.querySelector('.remove-color').onclick = () => {
            subfield.remove();
            updateBorderColorsFromDOM();
        };
        container.appendChild(subfield);
        updateBorderColorsFromDOM();
    }
    // Initial render
    (config.border_colors || []).forEach(color => addColorPicker(borderColorsContainer, color));
    borderColorField.querySelector('#addBorderColor').onclick = () => addColorPicker(borderColorsContainer, '#ffffff');

    // 5. (Border Colors field is already appended above)

    // --- PATCH: Native lock icon placeholder for managed fields ---
if (
    (rootConfig?.poster_renamerr?.run_border_replacerr === true) ||
    (window.run_border_replacerr === true)
) {
    ['source_dirs', 'destination_dir'].forEach(fieldKey => {
        // There may be multiple inputs for source_dirs
        const fields = wrapper.querySelectorAll(`[name="${fieldKey}"]`);
        fields.forEach(field => {
            field.disabled = true;
            field.value = '';
            field.placeholder = '🔒 Managed by Poster Renamerr with \'Run Border Replacerr\'';
            field.title = 'Managed by Poster Renamerr with \'Run Border Replacerr\'';

            // For source_dirs, hide add/remove buttons
            if (fieldKey === 'source_dirs') {
                const fieldContainer = field.closest('.field');
                if (fieldContainer) {
                    // Hide add button
                    const addBtn = fieldContainer.querySelector('.add-control-btn');
                    if (addBtn) addBtn.style.display = 'none';
                    // Hide remove buttons
                    fieldContainer.querySelectorAll('.remove-item').forEach(btn => btn.style.display = 'none');
                }
            }
        });
    });
}


    // 5. Render Holidays field
    const holidaysField = document.createElement('div');
    holidaysField.className = 'field field--three-col setting-field setting-field--three-col';
    holidaysField.innerHTML = `
    <label>Holidays</label>
    <button type="button" id="add-holiday-btn" class="btn add-control-btn">➕ Add Holiday</button>
    <div id="holidays-container"></div>
  `;
    wrapper.appendChild(holidaysField);
    const holidaysContainer = holidaysField.querySelector('#holidays-container');
    window.borderReplacerrData = Object.entries(config.holidays ||
    {}).map(([holiday, details]) => (
    {
        holiday,
        schedule: details.schedule,
        color: details.color,
    }));

    function updateBorderReplacerrUI()
    {
        holidaysContainer.innerHTML = '';
        if (window.borderReplacerrData.length === 0)
        {
            const msg = document.createElement('p');
            msg.className = 'no-entries';
            msg.innerHTML = '🎄 No holidays configured yet.';
            holidaysContainer.appendChild(msg);
        }
        else
        {
            window.borderReplacerrData.forEach((entry, i) =>
            {
                const card = document.createElement('div');
                card.className = 'mapping-card';
                card.innerHTML = `
            <div class="mapping-header">
              <span><strong>${entry.holiday}</strong></span>
              <span>${entry.schedule}</span>
              <div class="mapping-actions">
                <button type="button" class="btn edit-btn" data-idx="${i}">Edit</button>
                <button type="button" class="btn remove-btn" data-idx="${i}">Remove</button>
              </div>
            </div>
            <div>${entry.color.map(c => `<span class="holiday-swatch" style="background:${c}"></span>`).join('')}</div>
          `;
                holidaysContainer.appendChild(card);
            });
            holidaysContainer.querySelectorAll('.remove-btn').forEach(btn =>
            {
                btn.onclick = () =>
                {
                    window.borderReplacerrData.splice(btn.dataset.idx, 1);
                    updateBorderReplacerrUI();
                    window.isDirty = true;
                };
            });
            holidaysContainer.querySelectorAll('.edit-btn').forEach(btn =>
            {
                btn.onclick = () =>
                {
                    const idx = parseInt(btn.dataset.idx, 10);
                    if (!isNaN(idx))
                    {
                        window.borderReplacerrModal(idx);
                    }
                }
            });
        }
    }
    holidaysField.querySelector('#add-holiday-btn').addEventListener('click', () => window.borderReplacerrModal());
    window.updateBorderReplacerrUI = updateBorderReplacerrUI;
    updateBorderReplacerrUI();
    formFields.appendChild(wrapper);
}
/**
 * Render the settings UI for the Upgradinatorr module.
 *
 * @param {HTMLElement} formFields - The container element to append fields to.
 * @param {Object} config - The module configuration object.
 * @param {Object} rootConfig - The full root configuration object.
 * @returns {void}
 */
function renderUpgradinatorrSettings(formFields, config, rootConfig)
{
    const wrapper = document.createElement('div');
    const help = renderGlobalHelp('upgradinatorr');
    if (help) wrapper.appendChild(help);
    wrapper.className = 'settings-wrapper module--upgradinatorr';
    Object.entries(config).forEach(([key, value]) =>
    {
        if (key !== 'instances_list')
        {
            // Prevent rendering [object Object] if the field is not a primitive or expected array/string
            if (typeof value === 'object' && !Array.isArray(value) && value !== null)
            {
                return;
            }
            renderField(wrapper, key, value);
        }
    });
    const instanceField = document.createElement('div');
    instanceField.className = 'field field--three-col setting-field setting-field--three-col';
    instanceField.innerHTML = `
        <label>Instances</label>
        <button type="button" id="add-instance-btn" class="btn add-control-btn">➕ Add Instance</button>
        <div class="card-body">
            <table id="upgradinatorr-table" class="upgradinatorr-table">
            <thead>
                <tr>
                <th>Instance</th>
                <th>Count</th>
                <th>Tag Name</th>
                <th>Ignore Tag</th>
                <th>Unattended</th>
                <th>Season Threshold</th>
                <th>Actions</th>
                </tr>
            </thead>
            <tbody></tbody>
            </table>
        </div>
    `;
    wrapper.appendChild(instanceField);
    const tbody = instanceField.querySelector('tbody');
    window.upgradinatorrData = Object.entries(config.instances_list ||
        {})
        .map(([inst, opts]) =>
        {
            // Copy all fields, including season_monitored_threshold if present
            const entry = {
                instance: opts.instance,
                count: opts.count,
                tag_name: opts.tag_name,
                ignore_tag: opts.ignore_tag,
                unattended: opts.unattended,
            };
            if (typeof opts.season_monitored_threshold !== 'undefined')
            {
                entry.season_monitored_threshold = opts.season_monitored_threshold;
            }
            return entry;
        });

    function updateTable()
    {
        tbody.innerHTML = window.upgradinatorrData.map((entry, i) => `
            <tr>
              <td>${window.humanize(entry.instance)}</td>
              <td>${entry.count}</td>
              <td>${entry.tag_name}</td>
              <td>${entry.ignore_tag}</td>
              <td>${entry.unattended}</td>
              <td>${entry.season_monitored_threshold ?? ''}</td>
              <td>
                <button type="button" class="edit-upgrade btn" data-idx="${i}">Edit</button>
                <button type="button" class="remove-upgrade btn" data-idx="${i}">Remove</button>
              </td>
            </tr>
          `).join('');
        tbody.querySelectorAll('.remove-upgrade').forEach(btn =>
        {
            btn.onclick = () =>
            {
                const confirmed = confirm('Are you sure you want to remove this instance?');
                if (confirmed)
                {
                    const idx = parseInt(btn.dataset.idx, 10);
                    window.upgradinatorrData.splice(idx, 1);
                    updateTable();
                    window.isDirty = true;
                }
            }
        });
        tbody.querySelectorAll('.edit-upgrade').forEach(btn =>
        {
            btn.onclick = () =>
            {
                const idx = parseInt(btn.dataset.idx, 10);
                upgradinatorrModal(idx, rootConfig);
            };
        });
    }
    instanceField.querySelector('#add-instance-btn').addEventListener('click', () => window.upgradinatorrModal(undefined, rootConfig));
    window.updateTable = updateTable;
    updateTable();
    formFields.appendChild(wrapper);
}
/**
 * Render the settings UI for the Nohl module.
 *
 * @param {HTMLElement} formFields - The container element to append fields to.
 * @param {Object} config - The module configuration object.
 * @param {Object} rootConfig - The full root configuration object.
 * @returns {void}
 */
function renderNohlSettings(formFields, config, rootConfig)
{
    const wrapper = document.createElement('div');
    const help = renderGlobalHelp('nohl');
    if (help) wrapper.appendChild(help);
    wrapper.className = 'settings-wrapper module--poster_renamerr';
    Object.entries(config).forEach(([key, value]) =>
    {
        if (key === 'source_dirs')
        {
            renderField(wrapper, key, value);
        }
        else if (key === 'instances')
        {
            renderPlexSonarrRadarrInstancesField(wrapper, value, rootConfig, 'nohl');
        }
        else
        {
            renderField(wrapper, key, value);
        }
    });
    formFields.appendChild(wrapper);
}
/**
 * Render the settings UI for the Jduparr module.
 *
 * @param {HTMLElement} formFields - The container element to append fields to.
 * @param {Object} config - The module configuration object.
 * @param {Object} rootConfig - The full root configuration object.
 * @returns {void}
 */
function renderJduparrSettings(formFields, config, rootConfig)
{
    const wrapper = document.createElement('div');
    const help = renderGlobalHelp('jduparr');
    if (help) wrapper.appendChild(help);
    wrapper.className = 'settings-wrapper module--poster_renamerr';
    Object.entries(config).forEach(([key, value]) =>
    {
        renderField(wrapper, key, value)
    });
    formFields.appendChild(wrapper);
}
/**
 * Render the settings UI for the Health Checkarr module.
 *
 * @param {HTMLElement} formFields - The container element to append fields to.
 * @param {Object} config - The module configuration object.
 * @param {Object} rootConfig - The full root configuration object.
 * @returns {void}
 */
function renderHealthCheckarrSettings(formFields, config, rootConfig)
{
    const wrapper = document.createElement('div');
    const help = renderGlobalHelp('health_checkarr');
    if (help) wrapper.appendChild(help);
    wrapper.className = 'settings-wrapper module--poster_renamerr';
    Object.entries(config).forEach(([key, value]) =>
    {
        if (key === 'instances')
        {
            renderPlexSonarrRadarrInstancesField(wrapper, value, rootConfig, 'health_checkarr');
        }
        else
        {
            renderField(wrapper, key, value)
        }
    });
    formFields.appendChild(wrapper);
}
/**
 * Render the settings UI for the Poster Cleanarr module.
 *
 * @param {HTMLElement} formFields - The container element to append fields to.
 * @param {Object} config - The module configuration object.
 * @param {Object} rootConfig - The full root configuration object.
 * @returns {void}
 */
function renderPosterCleanarrSettings(formFields, config, rootConfig)
{
    const wrapper = document.createElement('div');
    const help = renderGlobalHelp('poster_cleanarr');
    if (help) wrapper.appendChild(help);
    wrapper.className = 'settings-wrapper module--poster_renamerr';
    Object.entries(config).forEach(([key, value]) =>
    {
        if (key === 'instances')
        {
            renderPlexSonarrRadarrInstancesField(wrapper, value, rootConfig, 'poster_cleanarr');
        }
        else
        {
            renderField(wrapper, key, value)
        }
    });
    formFields.appendChild(wrapper);
}
/**
 * Render the settings UI for the Renameinatorr module.
 *
 * @param {HTMLElement} formFields - The container element to append fields to.
 * @param {Object} config - The module configuration object.
 * @param {Object} rootConfig - The full root configuration object.
 * @returns {void}
 */
function renderRenameinatorrSettings(formFields, config, rootConfig)
{
    const wrapper = document.createElement('div');
    const help = renderGlobalHelp('renameinatorr');
    if (help) wrapper.appendChild(help);
    wrapper.className = 'settings-wrapper module--poster_renamerr';
    Object.entries(config).forEach(([key, value]) =>
    {
        if (key === 'instances')
        {
            renderPlexSonarrRadarrInstancesField(wrapper, value, rootConfig, 'renameinatorr');
        }
        else
        {
            renderField(wrapper, key, value)
        }
    });
    formFields.appendChild(wrapper);
}
/**
 * Render the settings UI for the Unmatched Assets module.
 *
 * @param {HTMLElement} formFields - The container element to append fields to.
 * @param {Object} config - The module configuration object.
 * @param {Object} rootConfig - The full root configuration object.
 * @returns {void}
 */
function renderUnmatchedAssetsSettings(formFields, config, rootConfig)
{
    const wrapper = document.createElement('div');
    const help = renderGlobalHelp('unmatched_assets');
    if (help) wrapper.appendChild(help);
    wrapper.className = 'settings-wrapper module--poster_renamerr';
    Object.entries(config).forEach(([key, value]) =>
    {
        if (key === 'instances')
        {
            renderPlexSonarrRadarrInstancesField(wrapper, value, rootConfig, 'unmatched_assets');
        }
        else
        {
            renderField(wrapper, key, value)
        }
    });
    formFields.appendChild(wrapper);
}
/**
 * Render the settings UI for the Main module.
 *
 * @param {HTMLElement} formFields - The container element to append fields to.
 * @param {Object} config - The module configuration object.
 * @param {Object} rootConfig - The full root configuration object.
 * @returns {void}
 */
function renderMain(formFields, config, rootConfig)
{
    const wrapper = document.createElement('div');
    const help = renderGlobalHelp('main');
    if (help) wrapper.appendChild(help);
    wrapper.className = 'settings-wrapper module--poster_renamerr';
    Object.entries(config).forEach(([key, value]) =>
    {
        renderField(wrapper, key, value)
    });
    formFields.appendChild(wrapper);
}
/**
 * Render the settings UI for the GDrive Sync module.
 *
 * @param {HTMLElement} formFields - The container element to append fields to.
 * @param {Object} config - The module configuration object.
 * @param {Object} rootConfig - The full root configuration object.
 * @returns {void}
 */
function renderGdriveSettings(formFields, config, rootConfig)
{
    const wrapper = document.createElement('div');
    const help = renderGlobalHelp('gdrive_sync');
    if (help) wrapper.appendChild(help);
    wrapper.className = 'settings-wrapper module--sync_gdrive';
    Object.entries(config).forEach(([key, value]) =>
    {
        if (key === 'token')
        {
            wrapper.appendChild(renderTextareaArrayField(key, value));
        }
        else if (key === 'gdrive_list')
        {
            const field = document.createElement('div');
            field.className = 'field field--three-col setting-field setting-field--three-col';
            field.innerHTML = `
                <label>GDrive Sync</label>
                <button type="button" id="add-gdrive-sync" class="btn add-control-btn">➕ Add gDrive</button>
                <div id="gdrive-sync-list" class="sync-list-container"></div>
            `;
            wrapper.appendChild(field);
            const syncList = field.querySelector('#gdrive-sync-list');
            window.gdriveSyncData = Array.isArray(value) ? [...value] : [];

            function updateList()
            {
                if (!Array.isArray(window.gdriveSyncData) || window.gdriveSyncData.length === 0)
                {
                    syncList.innerHTML = `
                        <div class="no-entries">
                          <p>🚫 No drives to list.</p>
                          <p>Click <strong>"Add gDrive"</strong> to configure one.</p>
                        </div>
                    `;
                }
                else
                {
                    const validEntries = window.gdriveSyncData.filter(e => e && e.id && e.location);
                    if (validEntries.length === 0)
                    {
                        syncList.innerHTML = `
                            <div class="no-entries">
                              <p>🚫 No valid drives to list.</p>
                              <p>Click <strong>"Add gDrive"</strong> to configure one.</p>
                            </div>
                        `;
                        return;
                    }
                    syncList.innerHTML = validEntries.map((entry, i) => `
                      <div class="card setting-entry">
                        <div class="setting-entry-content">
                          <strong>${entry.name || entry.id}</strong> → <em class="path-text">${entry.location}</em>
                        </div>
                        <div class="setting-entry-actions">
                          <button type="button" data-idx="${i}" class="btn edit-btn">Edit</button>
                          <button type="button" data-idx="${i}" class="btn remove-sync">Remove</button>
                        </div>
                      </div>
                    `).join('');
                }
                syncList.querySelectorAll('.remove-sync').forEach(btn =>
                {
                    btn.onclick = () =>
                    {
                        const confirmed = confirm('Are you sure you want to remove this sync?');
                        if (confirmed)
                        {
                            window.gdriveSyncData.splice(parseInt(btn.dataset.idx), 1);
                            updateList();
                            window.isDirty = true;
                        }
                    };
                });
                syncList.querySelectorAll('.edit-btn').forEach(btn =>
                {
                    btn.onclick = () =>
                    {
                        const idx = parseInt(btn.dataset.idx, 10);
                        gdriveSyncModal(idx);
                    };
                });
            }
            window.updateGdriveList = updateList;
            field.querySelector('#add-gdrive-sync').onclick = () => gdriveSyncModal();
            updateList();
        }
        else
        {
            renderField(wrapper, key, value);
        }
    });
    formFields.appendChild(wrapper);
}
/**
 * Render the instances selection section for Plex, Sonarr, or Radarr modules.
 *
 * @param {HTMLElement} formFields - The container element to which fields should be appended.
 * @param {string[]} instanceList - Array of instance keys (e.g., ['radarr_hd', 'sonarr_1']).
 * @param {Object} rootConfig - The full root configuration object, including all module instances.
 * @param {string} moduleName - The current module’s name (used to scope CSS classes).
 */
function renderPlexSonarrRadarrInstancesField(formFields, instanceList, rootConfig, moduleName)
{
    const allInstancesEmpty = !rootConfig.instances ||
        !Object.values(rootConfig.instances).some(group =>
            group && typeof group === 'object' && Object.keys(group).length > 0
        );
    if (allInstancesEmpty)
    {
        // Create a field container with label and list
        const field = document.createElement('div');
        field.className = `field instances-field ${moduleName}`;
        field.innerHTML = `<label>Instances</label><div class="instances-list"></div>`;
        formFields.appendChild(field);
        // Append a blank card inside the listDiv for the fallback message
        const listDiv = field.querySelector('.instances-list');
        const noCard = document.createElement('div');
        noCard.className = 'card plex-instance-card';
        noCard.innerHTML = `

          <div class="plex-libraries">
            <p class="no-entries" style="margin: 0.5em 0 0 1em;">
              🚫 No instances configured for ${window.humanize(moduleName)}.
            </p>
          </div>
        `;
        listDiv.appendChild(noCard);
        return;
    }
    const field = document.createElement('div');
    field.className = 'field instances-field poster-cleanarr';
    field.innerHTML = `<label>Instances</label><div class="instances-list"></div>`;
    formFields.appendChild(field);
    const listDiv = field.querySelector('.instances-list');
    const scalarInst = [];
    const plexData = {};
    (instanceList || []).forEach(item =>
    {
        if (typeof item === 'string') scalarInst.push(item);
        else if (typeof item === 'object')
        {
            const inst = Object.keys(item)[0];
            plexData[inst] = item[inst];
        }
    });
    // Group Radarr and Sonarr instances into separate cards
    function renderARRGroupCard(instType, instances)
    {
        const card = document.createElement('div');
        card.className = `card plex-instance-card`;
        card.innerHTML = `
          <div class="plex-instance-header">
            <h3>${window.humanize(instType)}</h3>
          </div>
          <div class="plex-libraries open"></div>
        `;
        const groupDiv = card.querySelector('.plex-libraries.open');
        instances.forEach(instanceName =>
        {
            const label = document.createElement('label');
            label.className = 'library-pill';
            label.innerHTML = `
                <input type="checkbox" name="instances" value="${instanceName}" ${scalarInst.includes(instanceName) ? 'checked' : ''}/>
                ${window.humanize(instanceName)}
            `;
            groupDiv.appendChild(label);
        });
        return card;
    }
    // --- Begin replacement for Radarr/Sonarr ---
    const radarrDefs = rootConfig.instances.radarr ||
    {};
    const radarrInstances = Object.keys(rootConfig.instances.radarr ||
    {});
    if (radarrInstances.length)
    {
        listDiv.appendChild(renderARRGroupCard('radarr', radarrInstances));
    }
    else
    {
        const noRadarrCard = document.createElement('div');
        noRadarrCard.className = 'card plex-instance-card';
        noRadarrCard.innerHTML = `
          <div class="plex-instance-header">
            <h3>${window.humanize('radarr')}</h3>
          </div>
          <div class="plex-libraries">
            <p class="no-entries" style="margin: 0.5em 0 0 1em;">🚫 No instances configured for ${window.humanize('radarr')}.</p>
          </div>
        `;
        listDiv.appendChild(noRadarrCard);
    }
    const sonarrDefs = rootConfig.instances.sonarr ||
    {};
    const sonarrInstances = Object.keys(rootConfig.instances.sonarr ||
    {});;
    if (sonarrInstances.length)
    {
        listDiv.appendChild(renderARRGroupCard('sonarr', sonarrInstances));
    }
    else
    {
        const noSonarrCard = document.createElement('div');
        noSonarrCard.className = 'card plex-instance-card';
        noSonarrCard.innerHTML = `
          <div class="plex-instance-header">
            <h3>${window.humanize('sonarr')}</h3>
          </div>
          <div class="plex-libraries">
            <p class="no-entries" style="margin: 0.5em 0 0 1em;">🚫 No instances configured for ${window.humanize('sonarr')}.</p>
          </div>
        `;
        listDiv.appendChild(noSonarrCard);
    }
    // --- End replacement for Radarr/Sonarr ---
    // --- Begin replacement for ARR_AND_PLEX_INSTANCES block ---
    if (ARR_AND_PLEX_INSTANCES.includes(moduleName))
    {
        const plexInstances = Object.keys(rootConfig.instances.plex ||
        {});
        if (plexInstances.length)
        {
            const plexWrapper = document.createElement('div');
            plexWrapper.className = 'card';
            plexWrapper.innerHTML = '<h3>Plex</h3>';
            listDiv.appendChild(plexWrapper);
            plexInstances.forEach(pi =>
            {
                const libs = plexData[pi]?.library_names || [];
                const wrapper = document.createElement('div');
                wrapper.innerHTML = `
            <div class="plex-instance-header">
                <h3>${window.humanize(pi)}</h3>
            </div>
            <div class="library-actions">
                <div style="display: flex; gap: 0.5rem;">
                    <button type="button" class="btn select-all-libs" data-inst="${pi}">Select All</button>
                    <button type="button" class="btn deselect-all-libs" data-inst="${pi}">Deselect All</button>
                </div>
                <button type="button" class="btn load-libs-btn plex-instance-header" data-inst="${pi}">Load Libraries</button>
            </div>
            <div id="plex-libs-${pi}" class="plex-libraries" style="max-height: 0px;"></div>
            `;
                plexWrapper.appendChild(wrapper);
                const loadBtn = wrapper.querySelector('.load-libs-btn');
                const libsDiv = wrapper.querySelector(`#plex-libs-${pi}`);
                loadBtn.addEventListener('click', async () =>
                {
                    try
                    {
                        const res = await fetch(`/api/plex/libraries?instance=${encodeURIComponent(pi)}`);
                        if (!res.ok) throw new Error(await res.text());
                        const fetchedLibs = await res.json();
                        const existing = plexData[pi]?.library_names || [];
                        libsDiv.innerHTML = fetchedLibs.map(l => `
            <label class="library-pill">
                <input type="checkbox" name="instances.${pi}.library_names" value="${l}" ${existing.includes(l) ? 'checked' : ''}/>
                ${l}
            </label>
        `).join('');
                        // Open container after inserting content
                        requestAnimationFrame(() =>
                        {
                            libsDiv.classList.add('open');
                            libsDiv.style.maxHeight = libsDiv.scrollHeight + 'px';
                        });
                        window.showToast?.(`✅ Loaded libraries for ${window.humanize(pi)}`, 'success');
                    }
                    catch (err)
                    {
                        window.showToast?.(`❌ Failed to load libraries for ${window.humanize(pi)}: ${err.message}`, 'error');
                    }
                });
                wrapper.querySelector('.select-all-libs')?.addEventListener('click', () =>
                {
                    libsDiv.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = true);
                    window.isDirty = true;
                });
                wrapper.querySelector('.deselect-all-libs')?.addEventListener('click', () =>
                {
                    libsDiv.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
                    window.isDirty = true;
                });
                // Pre-populate existing selected Plex libraries from config
                if (libs.length)
                {
                    libsDiv.innerHTML = libs.map(l => `
                        <label class="library-pill">
                            <input type="checkbox" name="instances.${pi}.library_names" value="${l}" checked/>
                            ${l}
                        </label>
                    `).join('');
                    // Open container after inserting content
                    requestAnimationFrame(() =>
                    {
                        libsDiv.classList.add('open');
                        libsDiv.style.maxHeight = libsDiv.scrollHeight + 'px';
                    });
                }
            });
        }
        else
        {
            const noPlexCard = document.createElement('div');
            noPlexCard.className = 'card plex-instance-card';
            noPlexCard.innerHTML = `
              <div class="plex-instance-header">
                <h3>${window.humanize('plex')}</h3>
              </div>
              <div class="plex-libraries">
                <p class="no-entries" style="margin: 0.5em 0 0 1em;">🚫 No instances configured for ${window.humanize('plex')}.</p>
              </div>
            `;
            listDiv.appendChild(noPlexCard);
        }
    }
    // --- End replacement for ARR_AND_PLEX_INSTANCES block ---
}
/**
 * Load and render settings for a given module.
 * Fetches the config, clears the form, and invokes the module renderer.
 * Also wires up form submission and Save button behavior.
 * @param {string} moduleName - The key of the module to load.
 */
window.loadSettings = async function(moduleName)
{
    window.currentModuleName = moduleName;
    const formFields = document.getElementById('form-fields');
    formFields.innerHTML = '';
    const res = await fetch('/api/config');
    const rootConfig = await res.json();
    const moduleConfig = rootConfig[moduleName] ||
    {};
    const renderer = MODULE_RENDERERS[moduleName];
    if (renderer)
    {
        renderer(formFields, moduleConfig, rootConfig);
    }
    window.isDirty = false;
    const settingsForm = document.getElementById('settings-form');
    const saveBtn = document.getElementById('saveBtn');
    window.DAPS.bindSaveButton(
        saveBtn,
        () => Promise.resolve(window.DAPS.buildSettingsPayload(window.currentModuleName)),
        window.currentModuleName
    );
    window.saveChanges = async () => window.saveSection(
        () => Promise.resolve(window.DAPS.buildSettingsPayload(window.currentModuleName)),
        window.currentModuleName
    );
};
/**
 * Build a payload object containing only the original config keys with
 * their updated values from the form and modal.
 * @returns {Object|null} The payload for POST, or null if validation fails.
 */
function buildPayload(moduleName)
{
    function fillPayloadFromFormData(data, payload, excludeKeys = [])
    {
        for (const [key, val] of data.entries())
        {
            if (excludeKeys.includes(key)) continue;
            if (BOOL_FIELDS.includes(key))
            {
                payload[key] = val === 'true';
            }
            else if (INT_FIELDS.includes(key))
            {
                payload[key] = parseInt(val, 10) || 0;
            }
            else if (TEXTAREA_FIELDS.includes(key))
            {
                payload[key] = val.split('\n').map(s => s.trim()).filter(Boolean);
            }
            else if (JSON_FIELDS.includes(key))
            {
                try
                {
                    payload[key] = JSON.parse(val);
                }
                catch
                {
                    payload[key] = val;
                }
            }
            else
            {
                payload[key] = val;
            }
        }
    }

    function normalizeJsonStringKeysAndValues(jsonStr)
    {
        try
        {
            // If it's already valid JSON, just normalize it and return
            const parsed = JSON.parse(jsonStr);
            return JSON.stringify(parsed);
        }
        catch
        {
            // Step 1: Convert single-quoted values to double-quoted
            let normalized = jsonStr.replace(/:\s*'([^']*)'/g, ': "$1"');
            // Step 2: Wrap unquoted keys in double quotes
            normalized = normalized.replace(/([{,]\s*)([a-zA-Z0-9_]+)(\s*:)/g, '$1"$2"$3');
            // Step 3: Wrap unquoted string values in double quotes
            normalized = normalized.replace(/:\s*([^"{\[\]\s,]+)(?=\s*[,}])/g, (match, val) =>
            {
                const trimmed = val.trim();
                if (
                    /^".*"$/.test(trimmed) || // already double-quoted
                    /^[\d.eE+-]+$/.test(trimmed) || // number
                    /^(true|false|null)$/.test(trimmed) // bool/null
                )
                {
                    return match;
                }
                return `: "${trimmed}"`;
            });
            return normalized;
        }
    }
    const form = document.getElementById('settings-form');
    if (!form) return null;
    const data = new FormData(form);
    const payload = {};
    const excludeKeys = [];
    if (moduleName === 'nohl')
    {
        excludeKeys.push('mode', 'source_dirs');
    }
    if (moduleName === 'sync_gdrive')
    {
        try
        {
            const raw = data.get('token') || '{}';
            const fixed = normalizeJsonStringKeysAndValues(raw);
            payload.token = JSON.parse(fixed);
        }
        catch
        {
            alert('Invalid token JSON');
            return null;
        }
        payload.gdrive_list = (window.gdriveSyncData || []).filter(
            e => e && Object.keys(e).length > 0
        );
        excludeKeys.push('token', 'gdrive_list');
    }
    if (moduleName === 'labelarr')
    {
        payload.mappings = window.labelarrData || [];
    }
    if (moduleName === 'upgradinatorr')
    {
        payload.instances_list = window.upgradinatorrData
    }
    if (moduleName === 'border_replacerr')
    {
        const holidayArray = window.borderReplacerrData || [];
        const holidaysObj = {};
        holidayArray.forEach(entry =>
        {
            holidaysObj[entry.holiday] = {
                schedule: entry.schedule,
                color: entry.color
            };
        });
        const globalColorContainer = document.querySelector('#border-colors-container');
        const globalColorInputs = Array.from(globalColorContainer.children || [])
            .filter(el => el.classList.contains('subfield') && el.querySelector('input[type="color"]'))
            .flatMap(el => Array.from(el.querySelectorAll('input[type="color"]')));
        payload.border_colors = globalColorInputs
            .map(i => i.value)
            .filter((val, idx, arr) => arr.indexOf(val) === idx); // remove duplicates
        payload.holidays = holidaysObj;
    }
    if (moduleName === 'nohl')
    {
        // Structured {path,mode} payload
        const sourceFields = form.querySelectorAll('.subfield-list .subfield');
        if (sourceFields.length > 0)
        {
            payload.source_dirs = Array.from(sourceFields)
                .map(sub =>
                {
                    const path = sub.querySelector('input[name="source_dirs"]')?.value.trim();
                    const mode = sub.querySelector('select[name="mode"]')?.value || 'resolve';
                    return path ?
                    {
                        path,
                        mode
                    } : null;
                })
                .filter(Boolean);
        }
    }
    else if (moduleName === 'jduparr')
    {
        // Legacy simple array of strings
        const sourceFields = form.querySelectorAll('.subfield-list .subfield');
        if (sourceFields.length > 0)
        {
            payload.source_dirs = Array.from(sourceFields)
                .map(sub => sub.querySelector('input[name="source_dirs"]')?.value.trim())
                .filter(Boolean);
        }
    }
    const scalarInstances = data.getAll('instances');
    const nestedInstances = {};
    for (const [key, val] of data.entries())
    {
        const match = key.match(/^instances\.(.+?)\.library_names$/);
        if (match)
        {
            const inst = match[1];
            nestedInstances[inst] = nestedInstances[inst] ||
            {
                library_names: []
            };
            nestedInstances[inst].library_names.push(val);
        }
    }
    const combinedInstances = [
        ...scalarInstances,
        ...Object.entries(nestedInstances).map(([k, v]) => (
        {
            [k]: v
        }))
    ];
    excludeKeys.push('instances', ...Array.from(data.keys ? data.keys() : []).filter(k => k.startsWith('instances.')));
    fillPayloadFromFormData(data, payload, excludeKeys);
    // Collect all source_dirs inputs into an array, overriding any single value
    if (data.has('source_dirs'))
    {
        payload.source_dirs = data.getAll('source_dirs')
            .map(v => v.trim())
            .filter(Boolean);
    }
    if (combinedInstances.length > 0)
    {
        payload.instances = combinedInstances;
    }
    return payload;
}