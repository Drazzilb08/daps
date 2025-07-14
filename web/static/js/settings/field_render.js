import { humanize } from '../util.js';
import { openModal } from './modals.js';
import * as Modals from './modals.js';
import { markDirty, showToast } from '../util.js';


function renderTextField(field, value, config) {
    const row = document.createElement('div');
    row.className = 'settings-field-row';

    // LABEL COLUMN
    const labelCol = document.createElement('div');
    labelCol.className = 'settings-field-labelcol';

    const label = document.createElement('label');
    label.textContent = field.label;
    label.htmlFor = field.key;
    labelCol.appendChild(label);

    row.appendChild(labelCol);

    // INPUT COLUMN
    const inputWrap = document.createElement('div');
    inputWrap.className = 'settings-field-inputwrap';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'input';
    input.name = field.key;
    input.id = field.key;
    input.value = value ?? '';
    if (field.modal === 'directoryPickerModal') input.readOnly = true;
    if (config) {
        input.addEventListener('input', () => {
            config[field.key] = input.value;
        });
    }
    inputWrap.appendChild(input);

    if (field.description) {
        const help = document.createElement('div');
        help.className = 'field-help-text';
        help.textContent = field.description;
        inputWrap.appendChild(help);
    }

    row.appendChild(inputWrap);
    return row;
}

function renderNumberField(field, value, config) {
    const row = document.createElement('div');
    row.className = 'settings-field-row';

    const labelCol = document.createElement('div');
    labelCol.className = 'settings-field-labelcol';

    const label = document.createElement('label');
    label.textContent = field.label;
    label.htmlFor = field.key;
    labelCol.appendChild(label);

    row.appendChild(labelCol);

    const inputWrap = document.createElement('div');
    inputWrap.className = 'settings-field-inputwrap';

    const input = document.createElement('input');
    input.type = 'number';
    input.className = 'input';
    input.name = field.key;
    input.id = field.key;
    input.value = value ?? '';
    if (config) {
        input.addEventListener('input', () => {
            config[field.key] = input.value === '' ? null : parseInt(input.value, 10);
        });
    }
    inputWrap.appendChild(input);

    if (field.description) {
        const help = document.createElement('div');
        help.className = 'field-help-text';
        help.textContent = field.description;
        inputWrap.appendChild(help);
    }

    row.appendChild(inputWrap);
    return row;
}

function renderDropdownField(field, value, config) {
    const row = document.createElement('div');
    row.className = 'settings-field-row';

    const labelCol = document.createElement('div');
    labelCol.className = 'settings-field-labelcol';

    const label = document.createElement('label');
    label.textContent = field.label;
    label.htmlFor = field.key;
    labelCol.appendChild(label);

    row.appendChild(labelCol);

    const inputWrap = document.createElement('div');
    inputWrap.className = 'settings-field-inputwrap';

    const select = document.createElement('select');
    select.className = 'select';
    select.name = field.key;
    select.id = field.key;
    field.options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt;
        option.selected = value === opt;
        option.textContent = opt;
        select.appendChild(option);
    });
    if (config) {
        select.addEventListener('change', () => {
            config[field.key] = select.value;
        });
    }
    inputWrap.appendChild(select);

    if (field.description) {
        const help = document.createElement('div');
        help.className = 'field-help-text';
        help.textContent = field.description;
        inputWrap.appendChild(help);
    }

    row.appendChild(inputWrap);
    return row;
}

function renderDirField(field, value, config) {
    const row = document.createElement('div');
    row.className = 'settings-field-row field-dir';

    // LABEL COLUMN
    const labelCol = document.createElement('div');
    labelCol.className = 'settings-field-labelcol';
    const label = document.createElement('label');
    label.textContent = field.label;
    label.htmlFor = field.key;
    labelCol.appendChild(label);
    row.appendChild(labelCol);

    // INPUT COLUMN
    const inputWrap = document.createElement('div');
    inputWrap.className = 'settings-field-inputwrap';

    const input = document.createElement('input');
    input.type = 'text';
    input.name = field.key;
    input.className = 'input field-input';
    input.readOnly = !!field.modal;

    // ***** FORCE-SET VALUE FROM CONFIG IF DEFINED *****
    let inputValue = (config && config[field.key]) ? config[field.key] : value ?? '';
    input.value = inputValue;

    // Only add click handler if NOT in a modal
    if (field.modal && typeof Modals[field.modal] === 'function' && !document.body.classList.contains('modal-open')) {
        input.addEventListener('click', () => {
            Modals.directoryPickerModal(input, config)
        });
    }
    if (config) {
        input.addEventListener('input', () => {
            config[field.key] = input.value;
        });
    }
    inputWrap.appendChild(input);

    if (field.description) {
        const help = document.createElement('div');
        help.className = 'field-help-text';
        help.textContent = field.description;
        inputWrap.appendChild(help);
    }

    row.appendChild(inputWrap);
    return row;
}

function renderInstancesField(field, value = [], config, rootConfig) {
    // Defensive clone for state
    value = (
        Array.isArray(value) &&
        value.length &&
        typeof value[0] === 'object' &&
        value[0] !== null &&
        'instance' in value[0]
    )
        ? value.map(obj => ({
            [obj.instance]: { library_names: Array.isArray(obj.library_names) ? obj.library_names : [] }
        }))
        : value;
    // Instance types
    const instanceTypes = field.instance_types && Array.isArray(field.instance_types)
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

    // Optional description/help text
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
                x => typeof x === 'object' && x !== null && Object.keys(x)[0] === name
            );
        }
        return selected.includes(name);
    }

    function getPlexLibraries(name) {
        const entry = selected.find(
            x => typeof x === 'object' && x !== null && Object.keys(x)[0] === name
        );
        return entry ? (entry[name].library_names || []) : [];
    }

    function setPlexLibraries(name, libs) {
        const idx = selected.findIndex(
            x => typeof x === 'object' && x !== null && Object.keys(x)[0] === name
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
            .then(async r => {
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
            .then(libraries => {
                container.innerHTML = '';
                if (Array.isArray(libraries) && libraries.length) {
                    libraries.forEach(lib => {
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
                                libs = libs.filter(l => l !== lib);
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
            .catch(e => {
                showToast('Error loading libraries: ' + e.message, 'error');
                console.error('Error fetching Plex libraries:', e);
            });
    }

    // -- Main render logic for content column --
function renderSelf() {
    inputWrap.innerHTML = '';

    // --- 1. Radarr/Sonarr Columns Side-by-Side (filtered by instanceTypes) ---
    const typeColumns = instanceTypes.filter(type => type === 'radarr' || type === 'sonarr');
    const columns = {};

    typeColumns.forEach(type => {
        const all = rootConfig.instances && rootConfig.instances[type]
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

        all.forEach(instName => {
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
                markDirty();
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
        inputWrap.appendChild(columnsWrap);
    }

    // --- 2. Plex: Below, full width, each as a card/block, only if 'plex' in instanceTypes ---
    if (instanceTypes.includes('plex') && rootConfig.instances && rootConfig.instances.plex) {
        Object.keys(rootConfig.instances.plex).forEach(instName => {
            // Instance block for each Plex instance
            const instanceBlock = document.createElement('div');
            instanceBlock.className = 'instance-block';

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
            const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            svg.setAttribute("viewBox", "0 0 64 64");
            svg.setAttribute("height", "24");
            svg.setAttribute("width", "24");
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

            // --- Add Posters text button toggle (Option 4) ---
            // Always create the Add Posters text button for each instance
            let plexEntry = selected.find(
                x => typeof x === 'object' && x !== null && Object.keys(x)[0] === instName
            );
            const addPostersBtn = document.createElement('button');
            addPostersBtn.type = 'button';
            addPostersBtn.className = 'add-posters-text-btn';
            addPostersBtn.setAttribute('aria-pressed', plexEntry && plexEntry[instName] && plexEntry[instName].add_posters ? 'true' : 'false');
            addPostersBtn.textContent = 'Upload Posters: ' + (plexEntry && plexEntry[instName] && plexEntry[instName].add_posters ? 'ON' : 'OFF');

            // Button click handler
            addPostersBtn.onclick = () => {
                // Ensure config entry
                let entry = selected.find(
                    x => typeof x === 'object' && x !== null && Object.keys(x)[0] === instName
                );
                if (!entry) {
                    entry = { [instName]: { library_names: [], add_posters: false } };
                    selected.push(entry);
                }
                const current = !!entry[instName].add_posters;
                entry[instName].add_posters = !current;
                addPostersBtn.setAttribute('aria-pressed', entry[instName].add_posters ? 'true' : 'false');
                addPostersBtn.textContent = 'Upload Posters: ' + (entry[instName].add_posters ? 'ON' : 'OFF');
                config[field.key] = Array.isArray(value) ? selected.slice() : [];
                markDirty();
            };

            // Show/hide the button only if instance is selected
            addPostersBtn.style.display = chk.checked ? '' : 'none';
            instanceHeader.appendChild(addPostersBtn);

            // When the instance checkbox is toggled, update Add Posters button visibility
            chkLabel.addEventListener('click', (e) => {
                e.preventDefault();
                chk.checked = !chk.checked;
                updateCheckedClass();
                if (chk.checked) {
                    // Ensure config has entry
                    let entry = selected.find(
                        x => typeof x === 'object' && x !== null && Object.keys(x)[0] === instName
                    );
                    if (!entry) {
                        entry = { [instName]: { library_names: [], add_posters: false } };
                        selected.push(entry);
                        config[field.key] = Array.isArray(value) ? selected.slice() : [];
                    }
                    addPostersBtn.style.display = '';
                    libList.classList.add('expanded');
                } else {
                    addPostersBtn.style.display = 'none';
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
}

    renderSelf();
    row.appendChild(inputWrap);
    return row;
}

function renderDirListField(field, value = [], config) {
    const row = document.createElement('div');
    row.className = 'settings-field-row field-dir-list';

    // --- LABEL COLUMN ---
    const labelCol = document.createElement('div');
    labelCol.className = 'settings-field-labelcol dirlist-label-col';

    const label = document.createElement('label');
    label.textContent = field.label;
    label.htmlFor = field.key;
    labelCol.appendChild(label);

    // Filler flex so button is pushed to bottom of labelCol
    const filler = document.createElement('div');
    filler.style.flex = "1";
    labelCol.appendChild(filler);

    // Add Directory button
    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'btn add-btn';
    addBtn.textContent = 'Add Directory';
    addBtn.onclick = () => {
        value.push('');
        if (config) config[field.key] = [...value];
        renderRows();
    };
    labelCol.appendChild(addBtn);

    // --- INPUT COLUMN ---
    const inputWrap = document.createElement('div');
    inputWrap.className = 'settings-field-inputwrap dirlist-input-col';

    if (!Array.isArray(value) || value.length === 0) value = [''];

    function renderRows() {
        inputWrap.innerHTML = '';
        value.forEach((dir, idx) => {
            const item = document.createElement('div');
            item.className = 'field-dragdrop-row';

            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'input field-input';
            input.name = field.key;
            input.value = dir || '';
            if (field.modal === 'directoryPickerModal') {
                input.readOnly = true;
                input.addEventListener('click', () => Modals.directoryPickerModal(input, config));
            }
            input.addEventListener('input', () => {
                value[idx] = input.value;
                if (config) config[field.key] = [...value];
            });
            item.appendChild(input);

            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'btn btn--remove-item remove-btn';
            removeBtn.innerText = '−';
            removeBtn.disabled = value.length === 1;
            removeBtn.addEventListener('click', () => {
                if (value.length > 1) {
                    value.splice(idx, 1);
                    if (config) config[field.key] = [...value];
                    renderRows();
                }
            });
            item.appendChild(removeBtn);

            inputWrap.appendChild(item);
        });

        if (field.description) {
            const help = document.createElement('div');
            help.className = 'field-help-text';
            help.textContent = field.description;
            inputWrap.appendChild(help);
        }
    }

    renderRows();

    row.appendChild(labelCol);
    row.appendChild(inputWrap);
    return row;
}

function renderColorListField(field, value = [], config) {
    
    // Should show poster border preview?
    const shouldPreview = String(field.preview) === "true";

    // Store available posters (cached)
    let posterAssets = [];
    let posterFetchPromise = null;

    // Fetch and cache all poster asset filenames
    function fetchPosterAssets() {
        if (posterFetchPromise) return posterFetchPromise;
        posterFetchPromise = fetch("/api/poster_assets")
            .then(r => r.json())
            .then(arr => Array.isArray(arr) ? arr : [])
            .then(arr => posterAssets = arr)
            .catch(() => posterAssets = []);
        return posterFetchPromise;
    }

    // Utility: Pick random poster asset, never default to poster.jpg
    function getRandomPoster() {
        if (posterAssets.length) {
            return "/web/static/assets/" + posterAssets[Math.floor(Math.random() * posterAssets.length)];
        }
        return null;
    }

    // Utility: Convert hex to RGB
    function hexToRgb(hex) {
        hex = hex.replace(/^#/, '');
        if (hex.length === 3) hex = hex.split('').map(x => x + x).join('');
        const num = parseInt(hex, 16);
        return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
    }

    // Detect artwork bounds inside a white border
    function detectArtworkBounds(img, cb) {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(0, 0, img.width, img.height).data;
        const whiteT = 235, pad = 0;
        function isWhite(i) {
            const r = data[i], g = data[i+1], b = data[i+2];
            return r > whiteT && g > whiteT && b > whiteT &&
                Math.abs(r-g) < 14 && Math.abs(r-b) < 14 && Math.abs(g-b) < 14;
        }
        let left = 0, right = img.width-1, top = 0, bottom = img.height-1;
        outer: for (; left < img.width; ++left)  { for (let y=0; y<img.height; ++y) if (!isWhite((y*img.width+left)*4)) break outer; }
        outer: for (; right > left; --right)     { for (let y=0; y<img.height; ++y) if (!isWhite((y*img.width+right)*4)) break outer; }
        outer: for (; top < img.height; ++top)   { for (let x=left; x<=right; ++x) if (!isWhite((top*img.width+x)*4)) break outer; }
        outer: for (; bottom > top; --bottom)    { for (let x=left; x<=right; ++x) if (!isWhite((bottom*img.width+x)*4)) break outer; }
        left = Math.max(0, left - pad); right = Math.min(img.width-1, right + pad);
        top  = Math.max(0, top - pad);  bottom = Math.min(img.height-1, bottom + pad);
        cb({left, right, top, bottom, width: right-left+1, height: bottom-top+1});
    }

    // Canvas: Replace white border with color
    function renderPosterPreviewCanvas(imgUrl, borderColor, callback, options = {}) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        img.onload = function() {
            const width = options.width || img.width;
            const height = options.height || img.height;
            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);
            const imgData = ctx.getImageData(0, 0, width, height);
            const d = imgData.data;
            const rgb = hexToRgb(borderColor);
            const tolerance = 235;
            const border = 26;
            for (let y = 0; y < height; ++y) {
                for (let x = 0; x < width; ++x) {
                    if (
                        x < border || x >= width - border ||
                        y < border || y >= height - border
                    ) {
                        const i = (y * width + x) * 4;
                        if (
                            d[i] > tolerance && d[i+1] > tolerance && d[i+2] > tolerance &&
                            Math.abs(d[i] - d[i+1]) < 18 &&
                            Math.abs(d[i] - d[i+2]) < 18 &&
                            Math.abs(d[i+1] - d[i+2]) < 18
                        ) {
                            d[i]   = rgb.r;
                            d[i+1] = rgb.g;
                            d[i+2] = rgb.b;
                        }
                    }
                }
            }
            ctx.putImageData(imgData, 0, 0);
            callback(canvas);
        };
        img.src = imgUrl;
    }

    // Canvas: Crop to detected artwork only (no border)
    function renderNoBorderPreview(imgUrl, callback, options = {}) {
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        img.onload = function() {
            detectArtworkBounds(img, (bounds) => {
                const canvas = document.createElement('canvas');
                canvas.width = bounds.width;
                canvas.height = bounds.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img,
                    bounds.left, bounds.top, bounds.width, bounds.height,
                    0, 0, bounds.width, bounds.height
                );
                callback(canvas);
            });
        };
        img.src = imgUrl;
    }

    // Initialize posters, and color objects
    async function ensureInitialPostersAndRender() {
        await fetchPosterAssets();
        if (!Array.isArray(value)) value = [];
        value = value.map(v =>
            typeof v === "string"
                ? { color: v, poster: getRandomPoster() }
                : (v && v.color && !v.poster)
                    ? { color: v.color, poster: getRandomPoster() }
                    : v
        );
        if (value.length && value.some(v => !v.poster)) {
            value = value.map(v =>
                v.poster ? v : { ...v, poster: getRandomPoster() }
            );
        }
        renderColors();
        if (shouldPreview) updateBorderPreview();
    }

    // UI Structure
    const row = document.createElement('div');
    row.className = 'settings-field-row field-dir-list field-color-list';
    const labelCol = document.createElement('div');
    labelCol.className = 'settings-field-labelcol dirlist-label-col';
    const label = document.createElement('label');
    label.textContent = field.label || 'Colors';
    labelCol.appendChild(label);
    const filler = document.createElement('div'); filler.style.flex = "1"; labelCol.appendChild(filler);

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'btn add-btn';
    addBtn.textContent = 'Add Color';
    addBtn.onclick = async () => {
        await fetchPosterAssets();
        const poster = getRandomPoster();
        if (!poster) return;
        value.push({ color: '#ffffff', poster });
        renderColors();
        if (config) config[field.key] = value.slice();
        if (shouldPreview) updateBorderPreview();
    };
    labelCol.appendChild(addBtn);
    row.appendChild(labelCol);

    const inputWrap = document.createElement('div');
    inputWrap.className = 'settings-field-inputwrap dirlist-input-col';
    const colorsDiv = document.createElement('div');
    colorsDiv.className = 'color-list-container';
    inputWrap.appendChild(colorsDiv);

    let previewWrap = null;
    if (shouldPreview) {
        previewWrap = document.createElement('div');
        previewWrap.className = 'poster-border-preview-wrap';
        inputWrap.appendChild(previewWrap);
    }

    // --- Help/Description block (always present, always at the bottom) ---
    const help = document.createElement('div');
    help.className = 'field-help-text';
    help.textContent = field.description || '';
    inputWrap.appendChild(help);

    function renderColors() {
        colorsDiv.innerHTML = '';
        value.forEach((v, idx) => {
            const swatch = document.createElement('div');
            swatch.className = 'color-picker-swatch';

            const input = document.createElement('input');
            input.type = 'color';
            input.value = v.color || '#ffffff';
            input.addEventListener('change', () => {
                value[idx].color = input.value;
                if (config) config[field.key] = value.slice();
                if (shouldPreview) updateBorderPreview();
            });
            input.addEventListener('input', () => {
                value[idx].color = input.value;
                if (shouldPreview) updateBorderPreview();
            });

            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'remove-btn';
            removeBtn.textContent = '−';
            removeBtn.onclick = () => {
                value.splice(idx, 1);
                renderColors();
                if (config) config[field.key] = value.slice();
                if (shouldPreview) updateBorderPreview();
            };

            swatch.appendChild(input);
            swatch.appendChild(removeBtn);
            colorsDiv.appendChild(swatch);
        });
        if (shouldPreview) updateBorderPreview();
    }

    function updateBorderPreview() {
        if (!previewWrap) return;
        previewWrap.innerHTML = '';
        // Remove any old notifications before re-adding
        let oldNote = inputWrap.querySelector('.no-border-notification');
        if (oldNote) oldNote.remove();

        if (value.length && posterAssets.length) {
            value.forEach((v) => {
                if (!v.poster) return;
                const previewDiv = document.createElement('div');
                previewDiv.className = 'poster-preview-container';
                renderPosterPreviewCanvas(
                    v.poster,
                    v.color || '#ffffff',
                    (canvas) => {
                        canvas.className = 'poster-preview-img';
                        previewDiv.appendChild(canvas);
                    },
                    { width: 156, height: 234 }
                );
                previewWrap.appendChild(previewDiv);
            });
        } else if (posterAssets.length) {
            // No colors: show blank artwork, random poster
            const previewDiv = document.createElement('div');
            previewDiv.className = 'poster-preview-container';
            const poster = getRandomPoster();
            if (!poster) return;
            renderNoBorderPreview(
                poster,
                (canvas) => {
                    canvas.className = 'poster-preview-img';
                    previewDiv.appendChild(canvas);
                },
                { width: 156, height: 234 }
            );
            previewWrap.appendChild(previewDiv);

            // --- Add notification above help text ---
            const note = document.createElement('div');
            note.className = 'no-border-notification';
            note.textContent = 'No colors selected. The white border will be removed.';
            // Insert notification before help/description
            inputWrap.insertBefore(note, help);
        }
    }

    row.appendChild(inputWrap);
    // Initial fetch and migration—set up all posters on first load!
    ensureInitialPostersAndRender();
    return row;
}

function renderDirListDragDropField(field, value = [], config) {
    const row = document.createElement('div');
    row.className = 'settings-field-row field-dir-list';

    // --- LABEL COLUMN ---
    const labelCol = document.createElement('div');
    labelCol.className = 'settings-field-labelcol dirlist-label-col';

    const label = document.createElement('label');
    label.textContent = field.label;
    label.htmlFor = field.key;
    labelCol.appendChild(label);

    // Filler flex so button is pushed to bottom of labelCol
    const filler = document.createElement('div');
    filler.style.flex = "1";
    labelCol.appendChild(filler);

    // Add Directory button
    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'btn add-btn';
    addBtn.textContent = 'Add Directory';
    addBtn.onclick = () => {
        value.push('');
        if (config) config[field.key] = [...value];
        renderRows();
    };
    labelCol.appendChild(addBtn);

    // --- INPUT COLUMN ---
    const inputWrap = document.createElement('div');
    inputWrap.className = 'settings-field-inputwrap dirlist-input-col';
    

    if (!Array.isArray(value) || value.length === 0) value = [''];
    let dragSrcIdx = null;

    function renderRows() {
        inputWrap.innerHTML = '';
        value.forEach((dir, idx) => {
            const item = document.createElement('div');
            item.className = 'field-dragdrop-row';
            item.setAttribute('draggable', 'true');

            const handle = document.createElement('span');
            handle.className = 'drag-handle';
            handle.innerText = '⋮⋮';
            item.appendChild(handle);

            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'input field-input';
            input.name = field.key;
            input.value = dir || '';
            if (field.modal === 'directoryPickerModal') {
                input.readOnly = true;
                input.addEventListener('click', () => Modals.directoryPickerModal(input, config));
            }
            input.addEventListener('input', () => {
                value[idx] = input.value;
                if (config) config[field.key] = [...value];
            });
            item.appendChild(input);

            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'btn btn--remove-item remove-btn';
            removeBtn.innerText = '−';
            removeBtn.disabled = value.length === 1;
            removeBtn.addEventListener('click', () => {
                if (value.length > 1) {
                    value.splice(idx, 1);
                    if (config) config[field.key] = [...value];
                    renderRows();
                }
            });
            item.appendChild(removeBtn);

            // Drag events
            item.addEventListener('dragstart', () => {
                dragSrcIdx = idx;
                item.classList.add('dragging');
            });
            item.addEventListener('dragend', () => {
                dragSrcIdx = null;
                item.classList.remove('dragging');
            });
            item.addEventListener('dragover', e => e.preventDefault());
            item.addEventListener('drop', e => {
                e.preventDefault();
                if (dragSrcIdx === null || dragSrcIdx === idx) return;
                const moved = value.splice(dragSrcIdx, 1)[0];
                value.splice(idx, 0, moved);
                if (config) config[field.key] = [...value];
                renderRows();
                markDirty();
            });

            inputWrap.appendChild(item);
        });
        if (field.description) {
            const help = document.createElement('div');
            help.className = 'field-help-text';
            help.textContent = field.description;
            inputWrap.appendChild(help);
        }
    }

    renderRows();

    row.appendChild(labelCol);
    row.appendChild(inputWrap);
    return row;
}


function renderTextareaField(field, value) {
    const row = document.createElement('div');
    row.className = 'settings-field-row';

    const labelCol = document.createElement('div');
    labelCol.className = 'settings-field-labelcol';

    const label = document.createElement('label');
    label.textContent = field.label;
    labelCol.appendChild(label);

    row.appendChild(labelCol);

    const inputWrap = document.createElement('div');
    inputWrap.className = 'settings-field-inputwrap';

    const textarea = document.createElement('textarea');
    textarea.className = 'textarea';
    textarea.name = field.key;
    textarea.rows = 6;
    textarea.placeholder = field.placeholder || '';
    textarea.value = Array.isArray(value) ? value.join('\n') : (value ?? '');

    autoResizeTextarea(textarea);

    inputWrap.appendChild(textarea);

    if (field.description) {
        const help = document.createElement('div');
        help.className = 'field-help-text';
        help.textContent = field.description;
        inputWrap.appendChild(help);
    }

    row.appendChild(inputWrap);
    return row;
}

function renderJsonField(field, value, config) {
    const row = document.createElement('div');
    row.className = 'settings-field-row';

    // LEFT COLUMN
    const labelCol = document.createElement('div');
    labelCol.className = 'settings-field-labelcol';

    const label = document.createElement('label');
    label.textContent = field.label;
    label.htmlFor = field.key;
    labelCol.appendChild(label);

    row.appendChild(labelCol);

    // RIGHT COLUMN
    const inputWrap = document.createElement('div');
    inputWrap.className = 'settings-field-inputwrap';

    const textarea = document.createElement('textarea');
    textarea.className = 'textarea';
    textarea.name = field.key;
    textarea.id = field.key;
    textarea.rows = 6;
    textarea.placeholder = field.placeholder || '';
    if (typeof value === 'object' && value !== null) {
        textarea.value = JSON.stringify(value, null, 2);
    } else if (typeof value === 'string') {
        textarea.value = value;
    } else {
        textarea.value = '';
    }

    autoResizeTextarea(textarea);

    // Save changes to config as you type, if config is provided
    if (config) {
        textarea.addEventListener('input', () => {
            try {
                config[field.key] = JSON.parse(textarea.value);
            } catch {
                // Not valid JSON: don't update config
            }
        });
    }

    inputWrap.appendChild(textarea);

    if (field.description) {
        const help = document.createElement('div');
        help.className = 'field-help-text';
        help.textContent = field.description;
        inputWrap.appendChild(help);
    }

    row.appendChild(inputWrap);
    return row;
}

function renderCheckBoxField(field, value, config) {
    const row = document.createElement('div');
    row.className = 'settings-field-row';

    // LABEL COLUMN
    const labelCol = document.createElement('div');
    labelCol.className = 'settings-field-labelcol';

    const label = document.createElement('label');
    label.textContent = field.label;
    label.htmlFor = field.key;
    labelCol.appendChild(label);
    row.appendChild(labelCol);

    // INPUT COLUMN
    const inputWrap = document.createElement('div');
    inputWrap.className = 'settings-field-inputwrap';

    // The checkbox itself
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.className = 'settings-checkbox';
    input.name = field.key;
    input.id = field.key;
    input.checked = !!value;
    input.addEventListener('change', () => {
        if (config) config[field.key] = input.checked;
    });
    inputWrap.appendChild(input);

    if (field.description) {
        const help = document.createElement('div');
        help.className = 'field-help-text';
        help.textContent = field.description;
        inputWrap.appendChild(help);
    }

    row.appendChild(inputWrap);
    return row;
}


function renderDirListOptionsField(field, value = [], config) {
    // Markup/class structure matches renderDirListDragDropField except: no drag handle, select dropdown for options.
    const row = document.createElement('div');
    row.className = 'settings-field-row field-dir-list';

    // --- LABEL COLUMN ---
    const labelCol = document.createElement('div');
    labelCol.className = 'settings-field-labelcol dirlist-label-col';

    // 1. Label
    const label = document.createElement('label');
    label.textContent = field.label;
    label.htmlFor = field.key;
    labelCol.appendChild(label);

    // 2. Filler flex so button is pushed to bottom of labelCol
    const filler = document.createElement('div');
    filler.style.flex = "1";
    labelCol.appendChild(filler);

    // 3. Add Directory button
    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'btn add-btn';
    addBtn.textContent = 'Add Directory';
    addBtn.onclick = () => {
        // If options, store as { path, mode }, else as string
        if (field.options && field.options.length) {
            value.push({ path: '', mode: field.options[0] });
        } else {
            value.push('');
        }
        if (config) config[field.key] = [...value];
        renderRows();
    };
    labelCol.appendChild(addBtn);

    // --- INPUT COLUMN ---
    const inputWrap = document.createElement('div');
    inputWrap.className = 'settings-field-inputwrap dirlist-input-col';

    if (!Array.isArray(value) || value.length === 0) {
        if (field.options && field.options.length) {
            value = [{ path: '', mode: field.options[0] }];
        } else {
            value = [''];
        }
    }

    function renderRows() {
        inputWrap.innerHTML = '';
        value.forEach((dir, idx) => {
            const item = document.createElement('div');
            item.className = 'field-dragdrop-row dir-list-option-row';
            // No drag handle!

            // Directory input
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'input field-input';
            input.name = field.key;
            input.value = (typeof dir === 'object' && dir !== null) ? (dir.path || '') : (dir || '');
            if (field.modal === 'directoryPickerModal') {
                input.readOnly = true;
                input.addEventListener('click', () => Modals.directoryPickerModal(input, config));
            }
            input.addEventListener('input', () => {
                if (typeof dir === 'object' && dir !== null) {
                    dir.path = input.value;
                } else {
                    value[idx] = input.value;
                }
                if (config) config[field.key] = [...value];
            });
            item.appendChild(input);

            // Mode select (for options)
            if (field.options && Array.isArray(field.options)) {
                const select = document.createElement('select');
                select.className = 'select dir-list-mode';
                field.options.forEach(opt => {
                    const option = document.createElement('option');
                    option.value = opt;
                    option.textContent = humanize(opt);
                    if ((typeof dir === 'object' && dir !== null && dir.mode === opt) ||
                        (typeof dir === 'object' && dir !== null && !dir.mode && field.options[0] === opt)) {
                        option.selected = true;
                    }
                    select.appendChild(option);
                });
                select.addEventListener('change', () => {
                    if (typeof dir === 'object' && dir !== null) {
                        dir.mode = select.value;
                    } else {
                        value[idx] = { path: input.value, mode: select.value };
                    }
                    if (config) config[field.key] = [...value];
                });
                item.appendChild(select);
            }

            // Remove button
            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'btn btn--remove-item remove-btn';
            removeBtn.innerText = '−';
            removeBtn.disabled = value.length === 1;
            removeBtn.addEventListener('click', () => {
                if (value.length > 1) {
                    value.splice(idx, 1);
                    if (config) config[field.key] = [...value];
                    renderRows();
                }
            });
            item.appendChild(removeBtn);

            inputWrap.appendChild(item);
        });
        if (field.description) {
            const help = document.createElement('div');
            help.className = 'field-help-text';
            help.textContent = field.description;
            inputWrap.appendChild(help);
        }
    }

    // Helper to humanize mode option names
    function humanize(str) {
        if (!str) return '';
        return str.replace(/_/g, ' ')
            .replace(/\b\w/g, (l) => l.toUpperCase());
    }

    renderRows();
    row.appendChild(labelCol);
    row.appendChild(inputWrap);
    return row;
}

function renderInstanceDropdownField(field, value, config, rootConfig) {
    const div = document.createElement('div');
    div.className = 'field field-instance-dropdown';

    const label = document.createElement('label');
    label.textContent = field.label || 'Instance';
    div.appendChild(label);

    const select = document.createElement('select');
    select.className = 'select instance-dropdown-select';
    select.name = field.key;

    // Helper to humanize instance names
    function humanize(str) {
        if (!str) return '';
        return str.replace(/_/g, ' ')
                  .replace(/\b\w/g, (l) => l.toUpperCase());
    }

    // Helper to set options
    function setOptions(selectedType) {
        select.innerHTML = '';
        let types = [];

        // Support "from" as array (static allowed types) or string (dynamic parent)
        if (Array.isArray(field.from)) {
            types = field.from;
        } else if (typeof field.from === 'string') {
            // Look up parent field value (app_type or other)
            const parentVal = config[field.from];
            if (parentVal) types = [parentVal];
            // Try to get from modal if config doesn't have it
            if (!parentVal) {
                const modalDiv = div.closest('.modal-content');
                if (modalDiv) {
                    const parentSelect = modalDiv.querySelector(`[name="${field.from}"]`);
                    if (parentSelect && parentSelect.value) types = [parentSelect.value];
                }
            }
        } else {
            // fallback: show all
            types = Object.keys(rootConfig.instances || {});
        }

        // Build option list (all instance names for allowed types)
        let options = [];
        types.forEach(type => {
            if (rootConfig.instances && rootConfig.instances[type]) {
                options.push(...Object.keys(rootConfig.instances[type]));
            }
        });

        options.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt;
            option.textContent = humanize(opt);
            select.appendChild(option);
        });

        // Auto-select value: prefer config, else first option
        if (options.length > 0) {
            let selected = value || config[field.key];
            if (!selected || !options.includes(selected)) {
                selected = options[0];
                config[field.key] = selected; // auto-set
            }
            select.value = selected;
        } else {
            config[field.key] = '';
        }
    }

    // Listen for parent field changes if from is a string
    if (typeof field.from === 'string') {
        setTimeout(() => {
            const modalDiv = div.closest('.modal-content');
            if (modalDiv) {
                const parentSelect = modalDiv.querySelector(`[name="${field.from}"]`);
                if (parentSelect) {
                    parentSelect.addEventListener('change', () => {
                        config[field.from] = parentSelect.value;
                        setOptions(parentSelect.value);
                    });
                }
            }
        }, 0);
    }

    setOptions();

    select.onchange = () => {
        config[field.key] = select.value;
    };

    div.appendChild(select);
    return div;
}

function renderGDriveCustomField(field, value = [], rootConfig, config) {
    config = config || arguments[3];
    value = Array.isArray(config?.[field.key]) ? config[field.key] : Array.isArray(value) ? value : [];
    const subfields = Array.isArray(field.fields) ? field.fields : [];

    // --- Outer container: settings field row
    const row = document.createElement('div');
    row.className = 'settings-field-row';

    // --- Label column
    const labelCol = document.createElement('div');
    labelCol.className = 'settings-field-labelcol';

    const label = document.createElement('label');
    label.textContent = field.label;
    label.htmlFor = field.key;
    labelCol.appendChild(label);
    row.appendChild(labelCol);

    // --- Main content column
    const inputWrap = document.createElement('div');
    inputWrap.className = 'settings-field-inputwrap';

    if (field.description) {
        const desc = document.createElement('div');
        desc.className = 'field-help-text';
        desc.textContent = field.description;
        inputWrap.appendChild(desc);
    }

    // --- Card-list (single column, full width)
    const listArea = document.createElement('div');
    listArea.className = 'settings-card-list';
    inputWrap.appendChild(listArea);

    function renderList() {
        listArea.innerHTML = '';

        if (!Array.isArray(value) || !value.length) {
            listArea.appendChild(createAddCard());
            return;
        }

        value.forEach((item, idx) => {
            const card = document.createElement('div');
            card.className = 'settings-entry-card';

            // ID row
            const idRow = document.createElement('div');
            idRow.className = 'settings-entry-row';
            idRow.innerHTML = `<span class="settings-label">ID:</span>
                               <span class="settings-value">${item.id || ''}</span>`;
            card.appendChild(idRow);

            // Name row
            const nameRow = document.createElement('div');
            nameRow.className = 'settings-entry-row';
            nameRow.innerHTML = `<span class="settings-label">Name:</span>
                                 <span class="settings-value">${item.name || ''}</span>`;
            card.appendChild(nameRow);

            // Location row
            const locRow = document.createElement('div');
            locRow.className = 'settings-entry-row';
            locRow.innerHTML = `<span class="settings-label">Location:</span>
                                <span class="settings-value">${item.location || ''}</span>`;
            card.appendChild(locRow);

            // Make card clickable for editing
            card.tabIndex = 0;
            card.setAttribute('role', 'button');
            card.setAttribute('aria-label', 'Edit Google Drive Entry');
            card.addEventListener('click', () =>
                openEditModal(idx, { value, field, config, renderList, subfields, rootConfig })
            );
            card.addEventListener('keydown', e => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openEditModal(idx, { value, field, config, renderList, subfields, rootConfig });
                }
            });

            listArea.appendChild(card);
        });

        listArea.appendChild(createAddCard());
    }

    function createAddCard() {
        const addCard = document.createElement('div');
        addCard.className = 'settings-entry-card settings-add-card';
        addCard.tabIndex = 0;
        addCard.setAttribute('role', 'button');
        addCard.setAttribute('aria-label', `Add ${field.label.replace(/s$/, '')}`);
        addCard.addEventListener('click', () => openEditModal(null, { value, field, config, renderList, subfields, rootConfig }));
        addCard.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openEditModal(null, { value, field, config, renderList, subfields, rootConfig });
            }
        });

        const plus = document.createElement('span');
        plus.className = 'card-add-plus';
        plus.textContent = '+';
        addCard.appendChild(plus);

        return addCard;
    }

    renderList();
    row.appendChild(inputWrap);
    return row;
}

function renderReplacerrCustomField(field, value = [], rootConfig, config) {
    config = config || arguments[3];
    value = Array.isArray(config?.[field.key]) ? config[field.key] : Array.isArray(value) ? value : [];
    const subfields = Array.isArray(field.fields) ? field.fields : [];

    // --- Outer container: settings field row
    const row = document.createElement('div');
    row.className = 'settings-field-row';

    // --- Label column
    const labelCol = document.createElement('div');
    labelCol.className = 'settings-field-labelcol';
    const label = document.createElement('label');
    label.textContent = field.label;
    label.htmlFor = field.key;
    labelCol.appendChild(label);
    row.appendChild(labelCol);

    // --- Main content column
    const inputWrap = document.createElement('div');
    inputWrap.className = 'settings-field-inputwrap';

    if (field.description) {
        const desc = document.createElement('div');
        desc.className = 'field-help-text';
        desc.textContent = field.description;
        inputWrap.appendChild(desc);
    }

    // --- Holidays card-list (flex row of cards)
    const listArea = document.createElement('div');
    listArea.className = 'settings-card-list twocol'
    inputWrap.appendChild(listArea);

    function renderList() {
        listArea.innerHTML = '';

        if (!Array.isArray(value) || !value.length) {
            // Show add button only if empty
            listArea.appendChild(createAddCard());
            return;
        }

        // Render each holiday as a card
        value.forEach((item, idx) => {
            const card = document.createElement('div');
            card.className = 'settings-entry-card';

            // Name row (main)
            const nameRow = document.createElement('div');
            nameRow.className = 'settings-entry-row settings-entry-main';
            const nameVal = document.createElement('span');
            nameVal.className = 'settings-value';
            nameVal.textContent = item.name || '';
            nameRow.appendChild(nameVal);
            card.appendChild(nameRow);

            // Schedule row
            const schedRow = document.createElement('div');
            schedRow.className = 'settings-entry-row';
            const schedLabel = document.createElement('span');
            schedLabel.className = 'settings-label';
            schedLabel.textContent = 'Schedule:';
            const schedVal = document.createElement('span');
            schedVal.className = 'settings-value';
            // Custom rendering for schedule: extract MM/DD–MM/DD if "range(MM/DD-MM/DD)"
            let schedText = '';
            if (typeof item.schedule === 'string') {
                const m = item.schedule.match(/^range\(\s*(\d{2}\/\d{2})\s*-\s*(\d{2}\/\d{2})\s*\)$/);
                if (m) {
                    schedText = `${m[1]} – ${m[2]}`;
                } else {
                    schedText = item.schedule;
                }
            } else {
                schedText = item.schedule || '';
            }
            schedVal.textContent = schedText;
            schedRow.appendChild(schedLabel);
            schedRow.appendChild(schedVal);
            card.appendChild(schedRow);

            // Colors row
            const colorRow = document.createElement('div');
            colorRow.className = 'settings-entry-row';
            const colorLabel = document.createElement('span');
            colorLabel.className = 'settings-label';
            colorLabel.textContent = 'Colors:';
            colorRow.appendChild(colorLabel);
            const colorsWrap = document.createElement('span');
            colorsWrap.className = 'settings-entry-swatches';
            (item.color || []).forEach(color => {
                const swatch = document.createElement('span');
                swatch.className = 'color-list-swatch replacerr-swatch';
                swatch.style.background = color;
                swatch.title = color;
                colorsWrap.appendChild(swatch);
            });
            colorRow.appendChild(colorsWrap);
            card.appendChild(colorRow);

            // Make card clickable for editing
            card.tabIndex = 0;
            card.setAttribute('role', 'button');
            card.setAttribute('aria-label', 'Edit Holiday');
            card.addEventListener('click', () =>
                openEditModal(idx, { value, field, config, renderList, subfields, rootConfig })
            );
            card.addEventListener('keydown', e => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openEditModal(idx, { value, field, config, renderList, subfields, rootConfig });
                }
            });

            listArea.appendChild(card);
        });

        // Add “fat plus” card at the end
        listArea.appendChild(createAddCard());
    }

    // Add card helper
    function createAddCard() {
        const addCard = document.createElement('div');
        addCard.className = 'settings-entry-card settings-add-card';
        addCard.tabIndex = 0;
        addCard.setAttribute('role', 'button');
        addCard.setAttribute('aria-label', `Add ${field.label.replace(/s$/, '')}`);
        addCard.addEventListener('click', () => openEditModal(null, { value, field, config, renderList, subfields, rootConfig }));
        addCard.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openEditModal(null, { value, field, config, renderList, subfields, rootConfig });
            }
        });

        const plus = document.createElement('span');
        plus.className = 'card-add-plus';
        plus.textContent = '+';
        addCard.appendChild(plus);

        return addCard;
    }

    renderList();
    row.appendChild(inputWrap);
    return row;
}

function renderUpgradinatorrCustomField(field, value = [], rootConfig, config) {
  config = config || arguments[3];
  value = Array.isArray(config?.[field.key]) ? config[field.key] : Array.isArray(value) ? value : [];
  const subfields = Array.isArray(field.fields) ? field.fields : [];

  const row = document.createElement('div');
  row.className = 'settings-field-row';

  const labelCol = document.createElement('div');
  labelCol.className = 'settings-field-labelcol';
  const label = document.createElement('label');
  label.textContent = field.label;
  label.htmlFor = field.key;
  labelCol.appendChild(label);
  row.appendChild(labelCol);

  const inputWrap = document.createElement('div');
  inputWrap.className = 'settings-field-inputwrap';

  if (field.description) {
    const desc = document.createElement('div');
    desc.className = 'field-help-text';
    desc.textContent = field.description;
    inputWrap.appendChild(desc);
  }

  // Render list container
  const listArea = document.createElement('div');
  listArea.className = 'settings-card-list twocol'
  inputWrap.appendChild(listArea);

  function renderList() {
    listArea.innerHTML = '';

    if (!Array.isArray(value) || !value.length) {
      listArea.appendChild(createAddCard());
      return;
    }

    value.forEach((item, idx) => {
      const card = document.createElement('div');
      card.className = 'settings-entry-card';

      // Render each subfield label and value inside the card
      subfields.forEach(sf => {
        if (sf.type === 'modal_helper' || sf.type === 'helper') return;

        // Only show fields for the correct instance type, if specified
        if (
            sf.show_if_instance && rootConfig && rootConfig.instances &&
            item.instance && (
            !rootConfig.instances[sf.show_if_instance] ||
            !(item.instance in rootConfig.instances[sf.show_if_instance])
            )
        ) {
            return;
        }

        // Hide empty/null/undefined fields except for instance, count, tag_name
        if (
            (typeof item[sf.key] === 'undefined' || item[sf.key] === null || item[sf.key] === '') &&
            !['instance', 'count', 'tag_name'].includes(sf.key)
        ) {
            return;
        }

        // Fix Season Monitored Threshold: If array, just show the first value
        let fieldValue = item[sf.key];
        if (Array.isArray(fieldValue)) fieldValue = fieldValue[0];

        // Instance label: bold and bigger
        let fieldDiv, labelSpan, valueSpan;
        if (sf.key === 'instance') {
          fieldDiv = document.createElement('div');
          fieldDiv.className = 'settings-entry-row settings-entry-main';
          labelSpan = document.createElement('span');
          labelSpan.className = 'settings-label';
          labelSpan.textContent = sf.label + ': ';
          valueSpan = document.createElement('span');
          valueSpan.className = 'settings-value';
          valueSpan.textContent = fieldValue ?? '';
          fieldDiv.appendChild(labelSpan);
          fieldDiv.appendChild(valueSpan);
        } else {
          fieldDiv = document.createElement('div');
          fieldDiv.className = 'settings-entry-row';
          labelSpan = document.createElement('span');
          labelSpan.className = 'settings-label';
          labelSpan.textContent = sf.label + ': ';
          valueSpan = document.createElement('span');
          valueSpan.className = 'settings-value';
          valueSpan.textContent = fieldValue ?? '';
          fieldDiv.appendChild(labelSpan);
          fieldDiv.appendChild(valueSpan);
        }
        card.appendChild(fieldDiv);
      });

      // Make card clickable for editing (call shared openEditModal)
      card.tabIndex = 0;
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', 'Edit entry');
      card.addEventListener('click', () =>
        openEditModal(idx, { value, field, config, renderList, subfields, rootConfig })
      );
      card.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openEditModal(idx, { value, field, config, renderList, subfields, rootConfig });
        }
      });

      listArea.appendChild(card);
    });

    listArea.appendChild(createAddCard());
  }

  function createAddCard() {
    const addCard = document.createElement('div');
    addCard.className = 'settings-entry-card settings-add-card';
    addCard.tabIndex = 0;
    addCard.setAttribute('role', 'button');
    addCard.setAttribute('aria-label', `Add ${field.label.replace(/s$/, '')}`);
    addCard.addEventListener('click', () =>
      openEditModal(null, { value, field, config, renderList, subfields, rootConfig })
    );
    addCard.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openEditModal(null, { value, field, config, renderList, subfields, rootConfig });
      }
    });

    const plus = document.createElement('span');
    plus.className = 'card-add-plus';
    plus.textContent = '+';
    addCard.appendChild(plus);

    return addCard;
  }

  renderList();
  row.appendChild(inputWrap);
  return row;
}

function renderLabelarrCustomField(field, value = [], rootConfig, config) {
    config = config || arguments[3];
    value = Array.isArray(config?.[field.key]) ? config[field.key] : Array.isArray(value) ? value : [];
    const subfields = Array.isArray(field.fields) ? field.fields : [];

    // --- Outer container: settings field row
    const row = document.createElement('div');
    row.className = 'settings-field-row';

    // --- Label column
    const labelCol = document.createElement('div');
    labelCol.className = 'settings-field-labelcol';

    const label = document.createElement('label');
    label.textContent = field.label;
    label.htmlFor = field.key;
    labelCol.appendChild(label);
    row.appendChild(labelCol);

    // --- Main content column
    const inputWrap = document.createElement('div');
    inputWrap.className = 'settings-field-inputwrap';

    if (field.description) {
        const desc = document.createElement('div');
        desc.className = 'field-help-text';
        desc.textContent = field.description;
        inputWrap.appendChild(desc);
    }

    // --- Card-list (single column, full width)
    const listArea = document.createElement('div');
    listArea.className = 'settings-card-list';
    inputWrap.appendChild(listArea);

    function humanize(str) {
        if (!str) return '';
        return str.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    function renderList() {
        listArea.innerHTML = '';

        if (!Array.isArray(value) || !value.length) {
            listArea.appendChild(createAddCard());
            return;
        }

        value.forEach((item, idx) => {
            const card = document.createElement('div');
            card.className = 'settings-entry-card';

            // --- App Instance ---
            const appRow = document.createElement('div');
            appRow.className = 'settings-entry-row settings-entry-main';
            appRow.innerHTML = `<span class="settings-label">App Instance:</span>
                                <span class="settings-value">${humanize(item.app_instance || '')}</span>`;
            card.appendChild(appRow);

            // --- Labels row ---
            const labelsRow = document.createElement('div');
            labelsRow.className = 'settings-entry-row';
            labelsRow.innerHTML = `<span class="settings-label">Labels:</span>
                                   <span class="settings-value">${Array.isArray(item.labels) ? item.labels.join(', ') : (item.labels || '')}</span>`;
            card.appendChild(labelsRow);

            // --- Plex libraries block ---
            if (Array.isArray(item.plex_instances)) {
                item.plex_instances.forEach((plex, pidx) => {
                    const plexRow = document.createElement('div');
                    plexRow.className = 'settings-entry-row settings-plexmap-block';

                    // Label (same class for width alignment)
                    const plexLabel = document.createElement('span');
                    plexLabel.className = 'settings-label';
                    plexLabel.textContent = 'Plex Libraries:';
                    plexRow.appendChild(plexLabel);

                    // Value wrap (align pill and names as single value field)
                    const valueWrap = document.createElement('span');
                    valueWrap.className = 'settings-value';

                    // Pill
                    const pill = document.createElement('span');
                    pill.className = 'settings-plex-name plex-pill';
                    pill.textContent = plex.instance ? humanize(plex.instance) : `Plex ${pidx + 1}`;
                    valueWrap.appendChild(pill);

                    // Library names (comma-separated, normal font)
                    const libNames = document.createElement('span');
                    libNames.className = 'settings-plex-libs';
                    libNames.textContent = Array.isArray(plex.library_names) ? ' ' + plex.library_names.join(', ') : '';
                    valueWrap.appendChild(libNames);

                    plexRow.appendChild(valueWrap);
                    card.appendChild(plexRow);
                });
            }

            // Make card clickable for editing
            card.tabIndex = 0;
            card.setAttribute('role', 'button');
            card.setAttribute('aria-label', 'Edit Mapping');
            card.addEventListener('click', () => openEditModal(idx));
            card.addEventListener('keydown', e => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openEditModal(idx);
                }
            });

            listArea.appendChild(card);
        });

        // Add “fat plus” card at the end
        listArea.appendChild(createAddCard());
    }

    // Add card helper
    function createAddCard() {
        const addCard = document.createElement('div');
        addCard.className = 'settings-entry-card settings-add-card';
        addCard.tabIndex = 0;
        addCard.setAttribute('role', 'button');
        addCard.setAttribute('aria-label', `Add ${field.label.replace(/s$/, '')}`);
        addCard.addEventListener('click', () => openEditModal(null));
        addCard.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openEditModal(null);
            }
        });

        const plus = document.createElement('span');
        plus.className = 'card-add-plus';
        plus.textContent = '+';
        addCard.appendChild(plus);

        return addCard;
    }

    function openEditModal(idx) {
        const isEdit = typeof idx === 'number';
        const entry = isEdit ? { ...value[idx] } : {};

        openModal({
            schema: subfields,
            entry,
            title: isEdit
                ? `Edit ${field.label.replace(/s$/, '')}`
                : `Add ${field.label.replace(/s$/, '')}`,
            onSave: newEntry => {
                if (isEdit) value[idx] = newEntry;
                else value.push(newEntry);
                config[field.key] = value.slice();
                renderList();
                markDirty();
            },
            onDelete: isEdit
                ? () => {
                    value.splice(idx, 1);
                    config[field.key] = value.slice();
                    renderList();
                    markDirty();
                }
                : null,
            context: { listInUse: value, editingIdx: isEdit ? idx : null, rootConfig },
            isEdit,
        });
    }

    renderList();
    row.appendChild(inputWrap);
    return row;
}

function renderModalHelperField(field, value, config, rootConfig) {
    const div = document.createElement('div');
    div.className = 'field field-modal-helper';
    div.dataset.helper = field.helper || '';
    div.dataset.key = field.key || '';
    const hookDiv = document.createElement('div');
    hookDiv.className = 'modal-helper-hook';
    div.appendChild(hookDiv);
    return div;
}


// -------- FIELD DISPATCHER ----------

export function renderField(field, value, config, rootConfig) {
    switch (field.type) {
        case 'dropdown': return renderDropdownField(field, value, config);
        case 'textarea': return renderTextareaField(field, value, config);
        case 'json': return renderJsonField(field, value, config);
        case 'number': return renderNumberField(field, value, config);
        case 'dir': return renderDirField(field, value, config);
        case 'dir_list': return renderDirListField(field, value, config);
        case 'dir_list_drag_drop': return renderDirListDragDropField(field, value, config);
        case 'dir_list_options': return renderDirListOptionsField(field, value, config);

        case 'color_list': return renderColorListField(field, value, config);
        case 'instances': return renderInstancesField(field, value, config, rootConfig);
        case 'modal_helper': return renderModalHelperField(field, value, config, rootConfig);
        case "check_box": return renderCheckBoxField(field, value, config);
        case 'instance_dropdown': return renderInstanceDropdownField(field, value, config, rootConfig);
        case 'gdrive_custom': return renderGDriveCustomField(field, value, rootConfig, config);
        case 'replacerr_custom': return renderReplacerrCustomField(field, value, rootConfig, config);
        case 'upgradinatorr_custom': return renderUpgradinatorrCustomField(field, value, rootConfig, config);
        case 'labelarr_custom': return renderLabelarrCustomField(field, value, rootConfig, config);


        default: return renderTextField(field, value, config);
    }
}


// ---------- HELPER FUNCTIONS -----------

function autoResizeTextarea(textarea) {
    setTimeout(() => {
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = textarea.scrollHeight + 'px';
            textarea.addEventListener('input', () => {
                textarea.style.height = 'auto';
                textarea.style.height = textarea.scrollHeight + 'px';
            });
        }
    }, 0);
}

function openEditModal(idx, { value, field, config, renderList, subfields, rootConfig }) {
    const isEdit = typeof idx === 'number';
    const entry = isEdit ? { ...value[idx] } : {};
    const footerButtons = [
        ...(isEdit ? [{ id: 'delete-modal-btn', label: 'Delete', class: 'btn--remove' }] : []),
        { id: 'cancel-modal-btn', label: 'Cancel', class: 'btn--remove-item' },
        { id: 'save-modal-btn', label: 'Save', class: 'btn--success' },
    ];
    
    openModal({
        schema: subfields || field.fields,
        entry,
        title: isEdit 
            ? `Edit ${field.label.replace(/s$/, '')}` 
            : `Add ${field.label.replace(/s$/, '')}`,
        onSave: (newEntry) => {
            if (isEdit) value[idx] = newEntry;
            else value.push(newEntry);
            config[field.key] = value.slice();
            renderList();
            markDirty();
        },
        onDelete: isEdit ? () => {
            value.splice(idx, 1);
            config[field.key] = value.slice();
            renderList();
            markDirty();
        } : null,
        context: {
            listInUse: value,
            editingIdx: isEdit ? idx : null,
            rootConfig
        },
        footerButtons,
        isEdit
    });
}