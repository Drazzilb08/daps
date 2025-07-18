import * as Modals from '../modals.js';

export function renderDirPickerField(field, value, config) {
    // Defensive: If value is an input element, use its value string
    if (value && typeof value === 'object' && value instanceof HTMLInputElement) {
        value = value.value;
    }
    if (
        config &&
        config[field.key] &&
        typeof config[field.key] === 'object' &&
        config[field.key] instanceof HTMLInputElement
    ) {
        config[field.key] = config[field.key].value;
    }

    const row = document.createElement('div');
    row.className = 'settings-field-row field-dir-picker';

    // Label column
    const labelCol = document.createElement('div');
    labelCol.className = 'settings-field-labelcol';
    const label = document.createElement('label');
    label.textContent = field.label;
    label.htmlFor = field.key;
    labelCol.appendChild(label);
    row.appendChild(labelCol);

    // Input column
    const inputWrap = document.createElement('div');
    inputWrap.className = 'settings-field-inputwrap';

    // Main input
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'input dir-picker-input';
    input.name = field.key;
    input.value = value ?? '';
    input.placeholder = field.placeholder || 'Choose directory…';
    input.autocomplete = 'off';

    inputWrap.appendChild(input);

    // Directory list element
    const dirList = document.createElement('ul');
    dirList.className = 'dir-list';
    inputWrap.appendChild(dirList);

    // Directory cache (could be global)
    const dirCache = {};
    let suggestionTimeout = null;

    // Show a directory's contents in the list
    async function showPath(val) {
        input.value = val;
        if (config) config[field.key] = String(input.value);
        if (!dirCache[val]) {
            // Fetch directory from backend
            try {
                const res = await fetch(`/api/list?path=${encodeURIComponent(val)}`);
                const data = await res.json();
                dirCache[val] = data.directories || [];
            } catch (e) {
                dirCache[val] = [];
            }
        }
        updateDirList(val);
    }

    // Update the <ul> with current entries
    function updateDirList(current) {
        dirList.innerHTML = '';
        // ".." for up
        if (current !== '/') {
            const up = document.createElement('li');
            up.textContent = '..';
            up.onclick = () => {
                const parent = current.split('/').slice(0, -1).join('/') || '/';
                showPath(parent);
            };
            dirList.appendChild(up);
        }
        (dirCache[current] || []).sort().forEach((name) => {
            const li = document.createElement('li');
            li.textContent = name;
            li.onclick = () => {
                const newPath = current.endsWith('/') ? current + name : current + '/' + name;
                showPath(newPath);
            };
            li.ondblclick = () => {
                // Double click: select this path
                input.value = current.endsWith('/') ? current + name : current + '/' + name;
                if (config) config[field.key] = String(input.value);
                dirList.innerHTML = ''; // Hide suggestion list after selection
            };
            dirList.appendChild(li);
        });
    }

    // Input handlers
    input.addEventListener('input', (e) => {
        const val = e.target.value.trim() || '/';
        clearTimeout(suggestionTimeout);
        suggestionTimeout = setTimeout(() => {
            showPath(val);
        }, 200);
        // Always update config as the user types
        if (config) config[field.key] = String(input.value);
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            showPath(input.value.trim() || '/');
        }
    });

    // Initial list load
    showPath(input.value.trim() || '/');

    // Help/description
    if (field.description) {
        const help = document.createElement('div');
        help.className = 'field-help-text';
        help.textContent = field.description;
        inputWrap.appendChild(help);
    }

    row.appendChild(inputWrap);
    // Final defensive: If config has input element, force to string
    if (
        config &&
        typeof config[field.key] === 'object' &&
        config[field.key] instanceof HTMLInputElement
    ) {
        config[field.key] = config[field.key].value;
    }
    return row;
}

export function renderDirField(field, value, config) {
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

    // Set initial value from config or fallback
    let inputValue = config && config[field.key] ? config[field.key] : value ?? '';
    input.value = inputValue;

    // If we have a modal defined AND not inside a modal-open context (to avoid recursion)
    if (
        field.modal &&
        typeof Modals[field.modal] === 'function' &&
        !document.body.classList.contains('modal-open')
    ) {
        input.addEventListener('click', async () => {
            try {
                // Wait for modal selection to finish and get new path
                const selectedPath = await Modals[field.modal](input.value || '/', config);

                if (selectedPath && selectedPath !== input.value) {
                    input.value = selectedPath;
                    if (config) {
                        config[field.key] = selectedPath;
                    }
                    // Optional: trigger any change listeners or custom event
                    const event = new Event('input', { bubbles: true });
                    input.dispatchEvent(event);
                }
            } catch (e) {
                console.error('Directory picker modal failed or was canceled', e);
            }
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

export function renderDirListField(field, value = [], config) {
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
    filler.style.flex = '1';
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
                input.addEventListener('click', async () => {
                    // The modal returns a path (string), NOT an input element!
                    const selectedPath = await Modals.directoryPickerModal(input.value || '/');
                    if (selectedPath && selectedPath !== input.value) {
                        input.value = selectedPath;
                        value[idx] = selectedPath;
                        if (config) config[field.key] = [...value];
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                });
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
                    const form = row.closest('form');
                    if (form) form.dispatchEvent(new Event('input', { bubbles: true }));
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

function isTouchDevice() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

export function renderDirListDragDropField(field, value = [], config) {
    const row = document.createElement('div');
    row.className = 'settings-field-row field-dir-list';

    // --- LABEL COLUMN ---
    const labelCol = document.createElement('div');
    labelCol.className = 'settings-field-labelcol dirlist-label-col';

    const label = document.createElement('label');
    label.textContent = field.label;
    label.htmlFor = field.key;
    labelCol.appendChild(label);

    const filler = document.createElement('div');
    filler.style.flex = '1';
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
    const useTouch = isTouchDevice();

    // Used for row move animation on touch
    let lastMovedIndex = null;

    function animateButtonPop(btn) {
        btn.classList.add('clicked');
        requestAnimationFrame(() => {
            setTimeout(() => btn.classList.remove('clicked'), 180);
        });
    }

    function renderRows() {
        // 1. Save previous row positions for FLIP
        const oldPositions = [];
        Array.from(inputWrap.children).forEach((node) => {
            if (node.classList?.contains('field-dragdrop-row')) {
                oldPositions.push({
                    key: node.dataset?.rowKey,
                    top: node.getBoundingClientRect().top,
                });
            }
        });

        inputWrap.innerHTML = '';

        value.forEach((dir, idx) => {
            const item = document.createElement('div');
            item.className = 'field-dragdrop-row draggable';
            item.dataset.rowKey = dir + '__' + idx;

            // --- Left: up/down arrows (touch) or drag handle (desktop)
            if (useTouch) {
                const upDownWrap = document.createElement('div');
                upDownWrap.className = 'dirlist-arrows';

                const upBtn = document.createElement('button');
                upBtn.type = 'button';
                upBtn.className = 'arrow-btn arrow-up';
                upBtn.title = 'Move Up';
                upBtn.innerHTML = '▲';
                upBtn.disabled = idx === 0;
                upBtn.addEventListener('click', () => {
                    animateButtonPop(upBtn);
                    if (idx > 0) {
                        [value[idx - 1], value[idx]] = [value[idx], value[idx - 1]];
                        if (config) config[field.key] = [...value];
                        lastMovedIndex = idx - 1;
                        renderRows();
                    }
                });
                upDownWrap.appendChild(upBtn);

                const downBtn = document.createElement('button');
                downBtn.type = 'button';
                downBtn.className = 'arrow-btn arrow-down';
                downBtn.title = 'Move Down';
                downBtn.innerHTML = '▼';
                downBtn.disabled = idx === value.length - 1;
                downBtn.addEventListener('click', () => {
                    animateButtonPop(downBtn);
                    if (idx < value.length - 1) {
                        [value[idx + 1], value[idx]] = [value[idx], value[idx + 1]];
                        if (config) config[field.key] = [...value];
                        lastMovedIndex = idx + 1;
                        renderRows();
                    }
                });
                upDownWrap.appendChild(downBtn);

                item.appendChild(upDownWrap);

                // Add move animation class if this is the row that was just moved
                if (idx === lastMovedIndex) {
                    item.classList.add('row-just-moved');
                    setTimeout(() => item.classList.remove('row-just-moved'), 380);
                }
            } else {
                const handle = document.createElement('span');
                handle.className = 'drag-handle';
                handle.innerText = '⋮⋮';
                item.appendChild(handle);
            }

            // --- Input
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'input field-input';
            input.name = field.key;
            input.value = dir || '';
            if (field.modal === 'directoryPickerModal') {
                input.readOnly = true;
                input.addEventListener('click', async () => {
                    const selectedPath = await Modals.directoryPickerModal(input.value || '/');
                    if (selectedPath && selectedPath !== input.value) {
                        input.value = selectedPath;
                        value[idx] = selectedPath;
                        if (config) config[field.key] = [...value];
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                });
            }
            input.addEventListener('input', () => {
                value[idx] = input.value;
                if (config) config[field.key] = [...value];
            });
            item.appendChild(input);

            // --- Remove
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
                    const form = row.closest('form');
                    if (form) form.dispatchEvent(new Event('input', { bubbles: true }));
                }
            });
            item.appendChild(removeBtn);

            inputWrap.appendChild(item);
        });

        // 2. FLIP Animation for row moves (touch only, fallback for desktop)
        if (useTouch && oldPositions.length > 0) {
            const newNodes = Array.from(inputWrap.children).filter((el) =>
                el.classList?.contains('field-dragdrop-row')
            );
            // 1. Set initial transform, no transition yet
            const animList = [];
            newNodes.forEach((node) => {
                node.style.transition = 'none';
                const key = node.dataset?.rowKey;
                const prev = oldPositions.find((e) => e.key === key);
                let dy = 0;
                if (prev) {
                    const newTop = node.getBoundingClientRect().top;
                    dy = prev.top - newTop;
                    if (Math.abs(dy) > 2) {
                        node.style.transform = `translateY(${dy}px)`;
                    } else {
                        node.style.transform = '';
                    }
                }
                animList.push({ node, key, dy });
            });

            // 2. Force browser to recognize initial state
            animList.forEach(({ node }) => void node.offsetWidth);

            // 3. Animate to new position
            requestAnimationFrame(() => {
                animList.forEach(({ node }) => {
                    node.style.transition = 'transform 0.38s cubic-bezier(.44,1.13,.73,.98)';
                    node.style.transform = '';
                });
            });
        }

        // 3. Drag-and-drop (desktop only)
        if (!useTouch) {
            makeDraggable(inputWrap, value, config, field, renderRows);
        }

        // 4. Field description/help
        if (field.description) {
            const help = document.createElement('div');
            help.className = 'field-help-text';
            help.textContent = field.description;
            inputWrap.appendChild(help);
        }
    }

    // Desktop drag and drop logic
    function makeDraggable(list, valueArr, configObj, fieldObj, rerender) {
        let dragged = null;
        list.querySelectorAll('.field-dragdrop-row').forEach((item) => {
            item.setAttribute('draggable', true);

            item.addEventListener('dragstart', (e) => {
                dragged = item;
                item.classList.add('dragging');
                item.style.opacity = '0.5';
                item.style.transform = 'scale(1.05)';
                e.dataTransfer.effectAllowed = 'move';
            });

            item.addEventListener('dragover', (e) => {
                e.preventDefault();
                if (item === dragged) return;
                item.classList.add('drag-over');
                const rect = item.getBoundingClientRect();
                const offset = e.clientY - rect.top;
                if (offset > rect.height / 2) {
                    if (item.nextSibling !== dragged) {
                        list.insertBefore(dragged, item.nextSibling);
                    }
                } else {
                    if (item !== dragged.nextSibling) {
                        list.insertBefore(dragged, item);
                    }
                }
            });

            item.addEventListener('dragleave', () => {
                item.classList.remove('drag-over');
            });

            item.addEventListener('drop', (e) => {
                e.preventDefault();
                item.classList.remove('drag-over');
            });

            item.addEventListener('dragend', () => {
                item.classList.remove('dragging');
                item.style.opacity = '';
                item.style.transform = '';
                list.querySelectorAll('.drag-over').forEach((el) =>
                    el.classList.remove('drag-over')
                );
                dragged = null;
                // After drop, update value array to new order
                const items = Array.from(list.querySelectorAll('.field-dragdrop-row'));
                const newOrder = items.map((el) => el.querySelector('input').value);
                if (JSON.stringify(valueArr) !== JSON.stringify(newOrder)) {
                    valueArr.length = 0;
                    newOrder.forEach((v) => valueArr.push(v));
                    if (configObj) configObj[fieldObj.key] = [...valueArr];
                    if (typeof rerender === 'function') rerender();
                }
            });
        });
    }

    renderRows();
    row.appendChild(labelCol);
    row.appendChild(inputWrap);
    return row;
}

export function renderDirListOptionsField(field, value = [], config) {
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
    filler.style.flex = '1';
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
            input.value = typeof dir === 'object' && dir !== null ? dir.path || '' : dir || '';
            if (field.modal === 'directoryPickerModal') {
                input.readOnly = true;
                input.addEventListener('click', async () => {
                    const selectedPath = await Modals.directoryPickerModal(input.value || '/');
                    if (selectedPath && selectedPath !== input.value) {
                        input.value = selectedPath;
                        if (typeof dir === 'object' && dir !== null) {
                            dir.path = selectedPath;
                        } else {
                            value[idx] = selectedPath;
                        }
                        if (config) config[field.key] = [...value];
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                });
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
                field.options.forEach((opt) => {
                    const option = document.createElement('option');
                    option.value = opt;
                    option.textContent = humanize(opt);
                    if (
                        (typeof dir === 'object' && dir !== null && dir.mode === opt) ||
                        (typeof dir === 'object' &&
                            dir !== null &&
                            !dir.mode &&
                            field.options[0] === opt)
                    ) {
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
                    const form = row.closest('form');
                    if (form) form.dispatchEvent(new Event('input', { bubbles: true }));
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
        return str.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
    }

    renderRows();
    row.appendChild(labelCol);
    row.appendChild(inputWrap);
    return row;
}
