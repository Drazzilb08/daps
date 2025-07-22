import { directoryPickerModal } from '../modals.js';

export function renderDirPickerField(field, immediateData) {
    let value = immediateData[field.key];

    if (value && typeof value === 'object' && value instanceof HTMLInputElement) {
        value = value.value;
    }

    const row = document.createElement('div');
    row.className = 'settings-field-row field-dir-picker';

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
    input.type = 'text';
    input.className = 'input dir-picker-input';
    input.name = field.key;
    input.value = value ?? '';
    input.placeholder = field.placeholder || 'Choose directory…';
    input.autocomplete = 'off';

    inputWrap.appendChild(input);

    const dirList = document.createElement('ul');
    dirList.className = 'dir-list';
    inputWrap.appendChild(dirList);

    const dirCache = {};
    let suggestionTimeout = null;

    async function showPath(val) {
        input.value = val;
        immediateData[field.key] = String(input.value);
        if (!dirCache[val]) {
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

    function updateDirList(current) {
        dirList.innerHTML = '';
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
                input.value = current.endsWith('/') ? current + name : current + '/' + name;
                immediateData[field.key] = String(input.value);
                dirList.innerHTML = '';
            };
            dirList.appendChild(li);
        });
    }

    input.addEventListener('input', (e) => {
        const val = e.target.value.trim() || '/';
        clearTimeout(suggestionTimeout);
        suggestionTimeout = setTimeout(() => {
            showPath(val);
        }, 200);
        immediateData[field.key] = String(input.value);
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            showPath(input.value.trim() || '/');
        }
    });

    showPath(input.value.trim() || '/');

    if (field.description) {
        const help = document.createElement('div');
        help.className = 'field-help-text';
        help.textContent = field.description;
        inputWrap.appendChild(help);
    }

    row.appendChild(inputWrap);

    if (
        typeof immediateData[field.key] === 'object' &&
        immediateData[field.key] instanceof HTMLInputElement
    ) {
        immediateData[field.key] = immediateData[field.key].value;
    }
    return row;
}

export function renderDirField(field, immediateData) {
    const row = document.createElement('div');
    row.className = 'settings-field-row field-dir';

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
    input.type = 'text';
    input.name = field.key;
    input.className = 'input field-input';

    let inputValue = immediateData && immediateData[field.key] ? immediateData[field.key] : '';
    input.value = inputValue;

    input.addEventListener('click', async () => {
        if (typeof directoryPickerModal === 'function') {
            const selectedPath = await directoryPickerModal(input.value || '/');
            if (selectedPath && selectedPath !== input.value) {
                input.value = selectedPath;
                immediateData[field.key] = selectedPath;
                const event = new Event('input', { bubbles: true });
                input.dispatchEvent(event);
            }
        }
    });

    input.addEventListener('input', () => {
        immediateData[field.key] = input.value;
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

export function renderDirListField(field, immediateData) {
    let value = immediateData[field.key] ?? [];
    const row = document.createElement('div');
    row.className = 'settings-field-row field-dir-list';

    const labelCol = document.createElement('div');
    labelCol.className = 'settings-field-labelcol dirlist-label-col';

    const label = document.createElement('label');
    label.textContent = field.label;
    label.htmlFor = field.key;
    labelCol.appendChild(label);

    const filler = document.createElement('div');
    filler.style.flex = '1';
    labelCol.appendChild(filler);

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'btn add-btn';
    addBtn.textContent = 'Add Directory';
    addBtn.onclick = () => {
        value.push('');
        immediateData[field.key] = [...value];
        renderRows();
    };
    labelCol.appendChild(addBtn);

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

            input.readOnly = false;
            input.addEventListener('click', async () => {
                if (typeof directoryPickerModal === 'function') {
                    const selectedPath = await directoryPickerModal(input.value || '/');
                    if (selectedPath && selectedPath !== input.value) {
                        input.value = selectedPath;
                        value[idx] = selectedPath;
                        immediateData[field.key] = [...value];
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                }
            });

            input.addEventListener('input', () => {
                value[idx] = input.value;
                immediateData[field.key] = [...value];
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
                    immediateData[field.key] = [...value];
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

// Drag/drop and options functions (no logic omitted):

function isTouchDevice() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

export function renderDirListDragDropField(field, immediateData) {
    let value = immediateData[field.key] ?? [];
    const row = document.createElement('div');
    row.className = 'settings-field-row field-dir-list';

    const labelCol = document.createElement('div');
    labelCol.className = 'settings-field-labelcol dirlist-label-col';

    const label = document.createElement('label');
    label.textContent = field.label;
    label.htmlFor = field.key;
    labelCol.appendChild(label);

    const filler = document.createElement('div');
    filler.style.flex = '1';
    labelCol.appendChild(filler);

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'btn add-btn';
    addBtn.textContent = 'Add Directory';
    addBtn.onclick = () => {
        value.push('');
        immediateData[field.key] = [...value];
        renderRows();
    };
    labelCol.appendChild(addBtn);

    const inputWrap = document.createElement('div');
    inputWrap.className = 'settings-field-inputwrap dirlist-input-col';

    if (!Array.isArray(value) || value.length === 0) value = [''];
    const useTouch = isTouchDevice();

    let lastMovedIndex = null;

    function animateButtonPop(btn) {
        btn.classList.add('clicked');
        requestAnimationFrame(() => {
            setTimeout(() => btn.classList.remove('clicked'), 180);
        });
    }

    function renderRows() {
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
                        immediateData[field.key] = [...value];
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
                        immediateData[field.key] = [...value];
                        lastMovedIndex = idx + 1;
                        renderRows();
                    }
                });
                upDownWrap.appendChild(downBtn);

                item.appendChild(upDownWrap);

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

            input.readOnly = false;
            input.addEventListener('click', async () => {
                if (typeof directoryPickerModal === 'function') {
                    const selectedPath = await directoryPickerModal(input.value || '/');
                    if (selectedPath && selectedPath !== input.value) {
                        input.value = selectedPath;
                        value[idx] = selectedPath;
                        immediateData[field.key] = [...value];
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                }
            });
            input.addEventListener('input', () => {
                value[idx] = input.value;
                immediateData[field.key] = [...value];
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
                    immediateData[field.key] = [...value];
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

        // FLIP animation for drag/drop
        if (useTouch && oldPositions.length > 0) {
            const newNodes = Array.from(inputWrap.children).filter((el) =>
                el.classList?.contains('field-dragdrop-row')
            );
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
            animList.forEach(({ node }) => void node.offsetWidth);
            requestAnimationFrame(() => {
                animList.forEach(({ node }) => {
                    node.style.transition = 'transform 0.38s cubic-bezier(.44,1.13,.73,.98)';
                    node.style.transform = '';
                });
            });
        }

        // Drag-and-drop (desktop only)
        if (!useTouch) {
            makeDraggable(inputWrap, value, immediateData, field, renderRows);
        }
    }

    function makeDraggable(list, valueArr, immediateDataObj, fieldObj, rerender) {
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
                    if (immediateDataObj) immediateDataObj[fieldObj.key] = [...valueArr];
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

// Options variant:
export function renderDirListOptionsField(field, immediateData) {
    let value = immediateData[field.key] ?? [];
    const row = document.createElement('div');
    row.className = 'settings-field-row field-dir-list';

    const labelCol = document.createElement('div');
    labelCol.className = 'settings-field-labelcol dirlist-label-col';

    const label = document.createElement('label');
    label.textContent = field.label;
    label.htmlFor = field.key;
    labelCol.appendChild(label);

    const filler = document.createElement('div');
    filler.style.flex = '1';
    labelCol.appendChild(filler);

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'btn add-btn';
    addBtn.textContent = 'Add Directory';
    addBtn.onclick = () => {
        if (field.options && field.options.length) {
            value.push({ path: '', mode: field.options[0] });
        } else {
            value.push('');
        }
        immediateData[field.key] = [...value];
        renderRows();
    };
    labelCol.appendChild(addBtn);

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

            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'input field-input';
            input.name = field.key;
            input.value = typeof dir === 'object' && dir !== null ? dir.path || '' : dir || '';

            input.readOnly = false;
            input.addEventListener('click', async () => {
                if (typeof directoryPickerModal === 'function') {
                    const selectedPath = await directoryPickerModal(input.value || '/');
                    if (selectedPath && selectedPath !== input.value) {
                        input.value = selectedPath;
                        if (typeof dir === 'object' && dir !== null) {
                            dir.path = selectedPath;
                        } else {
                            value[idx] = selectedPath;
                        }
                        immediateData[field.key] = [...value];
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                }
            });

            input.addEventListener('input', () => {
                if (typeof dir === 'object' && dir !== null) {
                    dir.path = input.value;
                } else {
                    value[idx] = input.value;
                }
                immediateData[field.key] = [...value];
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
                    immediateData[field.key] = [...value];
                });
                item.appendChild(select);
            }

            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'btn btn--remove-item remove-btn';
            removeBtn.innerText = '−';
            removeBtn.disabled = value.length === 1;
            removeBtn.addEventListener('click', () => {
                if (value.length > 1) {
                    value.splice(idx, 1);
                    immediateData[field.key] = [...value];
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

    function humanize(str) {
        if (!str) return '';
        return str.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
    }

    renderRows();
    row.appendChild(labelCol);
    row.appendChild(inputWrap);
    return row;
}
