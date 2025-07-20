import { markDirty } from '../../util.js';

export function renderInstancesField(field, value = [], config, rootConfig) {
    // Defensive clone for state
    value =
        Array.isArray(value) &&
        value.length &&
        typeof value[0] === 'object' &&
        value[0] !== null &&
        'instance' in value[0]
            ? value.map((obj) => ({
                  [obj.instance]: {
                      library_names: Array.isArray(obj.library_names) ? obj.library_names : [],
                  },
              }))
            : value;
    // Instance types
    const instanceTypes =
        field.instance_types && Array.isArray(field.instance_types)
            ? field.instance_types
            : ['radarr', 'sonarr', 'plex'];
    let selected = Array.isArray(value) ? value.slice() : [];

    // ========== CREATE ROW (two columns) ==========
    const row = document.createElement('div');
    row.className = 'settings-field-row';

    // ----- LABEL COLUMN -----
    const labelCol = document.createElement('div');
    labelCol.className = 'settings-field-labelcol';

    const label = document.createElement('label');
    label.textContent = field.label || 'Instances';
    labelCol.appendChild(label);

    // description/help text
    // if (field.description) {
    //     const help = document.createElement('div');
    //     help.className = 'field-help-text';
    //     help.textContent = field.description;
    //     labelCol.appendChild(help);
    // }
    row.appendChild(labelCol);

    // ----- INPUT COLUMN -----
    const inputWrap = document.createElement('div');
    inputWrap.className = 'settings-field-inputwrap';

    // -- State helpers --
    function isSelected(type, name) {
        if (type === 'plex') {
            return selected.some(
                (x) => typeof x === 'object' && x !== null && Object.keys(x)[0] === name
            );
        }
        return selected.includes(name);
    }

    function getPlexLibraries(name) {
        const entry = selected.find(
            (x) => typeof x === 'object' && x !== null && Object.keys(x)[0] === name
        );
        return entry ? entry[name].library_names || [] : [];
    }

    function setPlexLibraries(name, libs) {
        const idx = selected.findIndex(
            (x) => typeof x === 'object' && x !== null && Object.keys(x)[0] === name
        );
        if (idx !== -1) {
            selected[idx][name].library_names = libs;
            config[field.key] = Array.isArray(value) ? selected.slice() : [];
        }
    }

    // -- Plex libraries list fetcher --
    // Render the list of libraries for a Plex instance as pills with checkboxes
    function renderPlexLibraries(name, container, checkedLibs) {
        container.innerHTML = 'Loading libraries...';
        fetch(`/api/plex/libraries?instance=${encodeURIComponent(name)}`)
            .then(async (r) => {
                let data;
                try {
                    data = await r.clone().json();
                } catch {
                    data = await r.text();
                }
                if (!r.ok) {
                    let errorMsg = r.statusText;
                    if (data && typeof data === 'object' && data.error) {
                        errorMsg = data.error;
                    } else if (typeof data === 'string') {
                        errorMsg = data;
                    }
                    throw new Error(errorMsg);
                }
                return data;
            })
            .then((libraries) => {
                container.innerHTML = '';
                if (Array.isArray(libraries) && libraries.length) {
                    libraries.forEach((lib) => {
                        const label = document.createElement('label');
                        label.className = 'instance-pill'; // For styling

                        // Hidden checkbox for state
                        const input = document.createElement('input');
                        input.type = 'checkbox';
                        input.checked = checkedLibs.includes(lib);
                        input.setAttribute('aria-label', lib);

                        // Visual checkmark
                        const checkmark = document.createElement('span');
                        checkmark.className = 'pill-checkmark';

                        // Library label
                        const pillLabel = document.createElement('span');
                        pillLabel.className = 'pill-label';
                        pillLabel.textContent = lib;

                        // Toggle checked state & styling
                        input.onchange = () => {
                            let libs = getPlexLibraries(name).slice();
                            if (input.checked) {
                                if (!libs.includes(lib)) libs.push(lib);
                                label.classList.add('checked');
                            } else {
                                libs = libs.filter((l) => l !== lib);
                                label.classList.remove('checked');
                            }
                            setPlexLibraries(name, libs);
                        };
                        if (input.checked) label.classList.add('checked');

                        // Compose pill
                        label.appendChild(input);
                        label.appendChild(checkmark);
                        label.appendChild(pillLabel);
                        container.appendChild(label);
                    });
                } else {
                    container.textContent = 'No libraries found for this instance.';
                }
            })
            .catch((e) => {
                showToast('Error loading libraries: ' + e.message, 'error');
                console.error('Error fetching Plex libraries:', e);
            });
    }

    // -- Main render logic for content column --
    function renderSelf() {
        inputWrap.innerHTML = '';

        // --- 1. Radarr/Sonarr Columns Side-by-Side (filtered by instanceTypes) ---
        const typeColumns = instanceTypes.filter((type) => type === 'radarr' || type === 'sonarr');
        const columns = {};

        typeColumns.forEach((type) => {
            const all =
                rootConfig.instances && rootConfig.instances[type]
                    ? Object.keys(rootConfig.instances[type])
                    : [];
            if (!all.length) return;

            // Build a column for each type
            const col = document.createElement('div');
            col.className = 'instance-type-col';

            // Heading
            const typeLabel = document.createElement('div');
            typeLabel.className = 'instance-type-label';
            typeLabel.textContent = type.charAt(0).toUpperCase() + type.slice(1);
            col.appendChild(typeLabel);

            all.forEach((instName) => {
                const pillLabel = document.createElement('label');
                pillLabel.className = 'instance-pill';

                const chk = document.createElement('input');
                chk.type = 'checkbox';
                chk.checked = isSelected(type, instName);
                chk.id = `${type}_${instName}_chk`;

                chk.addEventListener('change', () => {
                    if (chk.checked) {
                        if (!selected.includes(instName)) selected.push(instName);
                    } else {
                        const idx = selected.indexOf(instName);
                        if (idx !== -1) selected.splice(idx, 1);
                    }
                    config[field.key] = Array.isArray(value) ? selected.slice() : [];
                });

                // Optional: visually consistent label text
                const pillText = document.createElement('span');
                pillText.className = 'pill-label';
                pillText.textContent = instName;

                pillLabel.appendChild(chk);
                pillLabel.appendChild(pillText);

                col.appendChild(pillLabel);
            });

            columns[type] = col;
        });

        // Only render columns row if either exists
        if (columns.radarr || columns.sonarr) {
            const columnsWrap = document.createElement('div');
            columnsWrap.className = 'instances-multicol';
            if (columns.radarr) columnsWrap.appendChild(columns.radarr);
            if (columns.sonarr) columnsWrap.appendChild(columns.sonarr);

            const block = document.createElement('div');
            block.className = 'instance-block';
            block.appendChild(columnsWrap);

            inputWrap.appendChild(block);
        }

        // --- 2. Plex: Below, full width, each as a card/block, only if 'plex' in instanceTypes ---
        let plexRendered = false;
        if (instanceTypes.includes('plex') && rootConfig.instances && rootConfig.instances.plex) {
            Object.keys(rootConfig.instances.plex).forEach((instName) => {
                plexRendered = true;
                // Instance block for each Plex instance
                const instanceBlock = document.createElement('div');
                instanceBlock.className = 'plex-instance-card';

                // Instance header row with animated SVG checkbox and instance label
                const instanceHeader = document.createElement('div');
                instanceHeader.className = 'instance-header';

                // --- Custom animated SVG checkbox ---
                const chkLabel = document.createElement('label');
                chkLabel.className = 'instance-checkbox-container';

                // Hidden native checkbox for accessibility/state
                const chk = document.createElement('input');
                chk.type = 'checkbox';
                chk.checked = isSelected('plex', instName);
                chk.style.display = 'none';

                // SVG animated checkbox
                const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                svg.setAttribute('viewBox', '0 0 64 64');
                svg.setAttribute('height', '24');
                svg.setAttribute('width', '24');
                svg.innerHTML = `<path d="M 0 16 V 56 A 8 8 90 0 0 8 64 H 56 A 8 8 90 0 0 64 56 V 8 A 8 8 90 0 0 56 0 H 8 A 8 8 90 0 0 0 8 V 16 L 32 48 L 64 16 V 8 A 8 8 90 0 0 56 0 H 8 A 8 8 90 0 0 0 8 V 56 A 8 8 90 0 0 8 64 H 56 A 8 8 90 0 0 64 56 V 16"
  pathLength="575.0541381835938"
  class="instance-checkbox-path"></path>`;

                chkLabel.appendChild(chk);
                chkLabel.appendChild(svg);

                // Animation fix: always update checked class and prevent double-renders
                function updateCheckedClass() {
                    if (chk.checked) {
                        chkLabel.classList.add('checked');
                    } else {
                        chkLabel.classList.remove('checked');
                    }
                }
                // Plex name label
                const lbl = document.createElement('span');
                lbl.className = 'instance-label';
                lbl.textContent = instName;

                // Use animated SVG checkbox and label
                instanceHeader.appendChild(chkLabel);
                instanceHeader.appendChild(lbl);

                // --- Conditionally Add Posters text button ---
                let addPostersBtn = null;
                if (field.add_posters_option !== false) {
                    let plexEntry = selected.find(
                        (x) => typeof x === 'object' && x !== null && Object.keys(x)[0] === instName
                    );
                    addPostersBtn = document.createElement('button');
                    addPostersBtn.type = 'button';
                    addPostersBtn.className = 'add-posters-text-btn';
                    addPostersBtn.setAttribute(
                        'aria-pressed',
                        plexEntry && plexEntry[instName] && plexEntry[instName].add_posters
                            ? 'true'
                            : 'false'
                    );
                    addPostersBtn.textContent =
                        'Upload Posters: ' +
                        (plexEntry && plexEntry[instName] && plexEntry[instName].add_posters
                            ? 'ON'
                            : 'OFF');

                    // Button click handler
                    addPostersBtn.onclick = () => {
                        // Ensure config entry
                        let entry = selected.find(
                            (x) =>
                                typeof x === 'object' &&
                                x !== null &&
                                Object.keys(x)[0] === instName
                        );
                        if (!entry) {
                            entry = { [instName]: { library_names: [], add_posters: false } };
                            selected.push(entry);
                        }
                        const current = !!entry[instName].add_posters;
                        entry[instName].add_posters = !current;
                        addPostersBtn.setAttribute(
                            'aria-pressed',
                            entry[instName].add_posters ? 'true' : 'false'
                        );
                        addPostersBtn.textContent =
                            'Upload Posters: ' + (entry[instName].add_posters ? 'ON' : 'OFF');
                        config[field.key] = Array.isArray(value) ? selected.slice() : [];
                        markDirty();
                    };

                    // Show/hide the button only if instance is selected
                    addPostersBtn.style.display = chk.checked ? '' : 'none';
                    instanceHeader.appendChild(addPostersBtn);
                }

                // Always handle checkbox label clicks for select/deselect
                chkLabel.addEventListener('click', (e) => {
                    e.preventDefault();
                    chk.checked = !chk.checked;
                    updateCheckedClass();
                    if (chk.checked) {
                        // Ensure config has entry
                        let entry = selected.find(
                            (x) =>
                                typeof x === 'object' &&
                                x !== null &&
                                Object.keys(x)[0] === instName
                        );
                        if (!entry) {
                            entry = { [instName]: { library_names: [], add_posters: false } };
                            selected.push(entry);
                            config[field.key] = Array.isArray(value) ? selected.slice() : [];
                        }
                        if (addPostersBtn) addPostersBtn.style.display = '';
                        libList.classList.add('expanded');
                    } else {
                        if (addPostersBtn) addPostersBtn.style.display = 'none';
                        libList.classList.remove('expanded');
                    }
                });
                // Call once for initial state
                updateCheckedClass();

                instanceBlock.appendChild(instanceHeader);

                // Always render the library list, toggle .expanded for animation.
                // Always keep libList in DOM
                const libList = document.createElement('div');
                libList.className = 'instance-library-list';
                const libs = getPlexLibraries(instName);
                renderPlexLibraries(instName, libList, libs);

                // Only toggle the class; don't clear out innerHTML
                if (chk.checked) {
                    libList.classList.add('expanded');
                } else {
                    libList.classList.remove('expanded');
                }
                instanceBlock.appendChild(libList);

                inputWrap.appendChild(instanceBlock);
            });
        }

        // === NO INSTANCES MESSAGE ===
        const radarrExists =
            rootConfig.instances &&
            rootConfig.instances.radarr &&
            Object.keys(rootConfig.instances.radarr).length > 0;
        const sonarrExists =
            rootConfig.instances &&
            rootConfig.instances.sonarr &&
            Object.keys(rootConfig.instances.sonarr).length > 0;
        const plexExists =
            rootConfig.instances &&
            rootConfig.instances.plex &&
            Object.keys(rootConfig.instances.plex).length > 0;

        if (!radarrExists && !sonarrExists && !plexExists) {
            const emptyMsg = document.createElement('div');
            emptyMsg.className = 'instances-empty-message';
            emptyMsg.textContent =
                'No instances have been configured. Please add at least one instance in the Instances settings first.';
            inputWrap.appendChild(emptyMsg);

        }
    }

    renderSelf();
    row.appendChild(inputWrap);
    return row;
}
