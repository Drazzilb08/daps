import { directoryPickerModal } from '../modals.js';
import { humanize } from '../../util.js';
import { fetchDirectoryList } from '../../api.js';

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
    input.setAttribute('aria-label', 'Directory path');
    inputWrap.appendChild(input);

    const dirList = document.createElement('ul');
    dirList.className = 'dir-list';
    inputWrap.appendChild(dirList);

    // Cache most recent loaded dirs for parent path
    let currentDir = '/';
    let dirCache = {};
    let filterText = '';
    let suggestionTimeout = null;
    let activeIdx = -1; // keyboard-highlighted item

    async function fetchAndDisplay(path) {
        const { directories } = await fetchDirectoryList(path);
        dirCache[path] = directories;
        currentDir = path;
        activeIdx = -1;
        displayDirList();
        await validateInput(); // Validate on any navigation
    }

    function displayDirList() {
        dirList.innerHTML = '';
        let items = [];
        // Parent dir row
        if (currentDir !== '/') {
            const up = document.createElement('li');
            up.textContent = '..';
            up.className = 'dir-parent';
            up.setAttribute('aria-label', 'Parent directory');
            up.onclick = () => {
                let parent = currentDir.replace(/\/+$/, '');
                parent = parent.substring(0, parent.lastIndexOf('/')) || '/';
                const parentPath = parent.endsWith('/') ? parent : parent + '/';
                input.value = parentPath;
                immediateData[field.key] = parentPath;
                filterText = '';
                activeIdx = -1;
                fetchAndDisplay(parentPath);
                input.focus();
            };
            dirList.appendChild(up);
            items.push(up);
        }
        let dirs = dirCache[currentDir] || [];
        if (filterText) {
            const lc = filterText.toLowerCase();
            dirs = dirs.filter((name) => name.toLowerCase().startsWith(lc));
        }
        dirs.forEach((name) => {
            const li = document.createElement('li');
            li.textContent = name;
            li.setAttribute('aria-label', name);
            li.onclick = () => {
                const newPath = currentDir.endsWith('/')
                    ? currentDir + name + '/'
                    : currentDir + '/' + name + '/';
                input.value = newPath;
                immediateData[field.key] = input.value;
                filterText = '';
                activeIdx = -1;
                fetchAndDisplay(newPath);
                input.focus();
            };
            dirList.appendChild(li);
            items.push(li);
        });
        // Keyboard highlight:
        items.forEach((el, i) => {
            el.classList.toggle('active', i === activeIdx);
            el.setAttribute('aria-selected', i === activeIdx ? 'true' : 'false');
        });
    }

    // Initial load
    let initialPath = input.value.trim() || '/';
    if (!initialPath.endsWith('/')) {
        const lastSlash = initialPath.lastIndexOf('/');
        currentDir = lastSlash >= 0 ? initialPath.slice(0, lastSlash) || '/' : '/';
        filterText = initialPath.slice(lastSlash + 1);
    } else {
        currentDir = initialPath;
        filterText = '';
    }
    fetchAndDisplay(currentDir);

    // Directory validation state and error UI
    let validDir = false;
    let errorDiv = null;
    function showError(msg) {
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.className = 'field-error-message';
            errorDiv.style.color = 'var(--error, #ff375f)';
            errorDiv.style.fontSize = '0.98em';
            errorDiv.style.marginTop = '0.28em';
            inputWrap.appendChild(errorDiv);
        }
        errorDiv.textContent = msg;
        input.classList.add('input-error');
    }
    function clearError() {
        if (errorDiv) errorDiv.textContent = '';
        input.classList.remove('input-error');
    }

    async function validateInput() {
        const val = input.value.trim();
        if (!val || !val.endsWith('/')) {
            showError('Must be a valid directory (end with /)');
            validDir = false;
        } else {
            const { exists } = await fetchDirectoryList(val);
            if (!exists) {
                showError('Directory does not exist.');
                validDir = false;
            } else {
                clearError();
                validDir = true;
            }
        }
        // Disable "accept" button if present
        const modal = row.closest('.modal-content');
        if (modal) {
            const accept = modal.querySelector('#dir-accept');
            if (accept) accept.disabled = !validDir;
        }
        return validDir;
    }

    // Handle input changes
    input.addEventListener('input', (e) => {
        const val = e.target.value.trim() || '/';
        immediateData[field.key] = val;
        clearTimeout(suggestionTimeout);
        suggestionTimeout = setTimeout(() => {
            if (val.endsWith('/')) {
                filterText = '';
                fetchAndDisplay(val);
            } else {
                const lastSlash = val.lastIndexOf('/');
                const parentDir = lastSlash >= 0 ? val.slice(0, lastSlash) || '/' : '/';
                filterText = val.slice(lastSlash + 1);
                if (parentDir !== currentDir) {
                    fetchAndDisplay(parentDir).then(() => displayDirList());
                } else {
                    displayDirList();
                }
            }
            activeIdx = -1;
            validateInput();
        }, 120);
    });

    input.addEventListener('keydown', (e) => {
        let items = Array.from(dirList.querySelectorAll('li'));
        // Tab or ArrowDown: next; Shift+Tab or ArrowUp: prev
        if ((e.key === 'Tab' && !e.shiftKey) || e.key === 'ArrowDown') {
            e.preventDefault();
            if (items.length === 0) return;
            activeIdx = (activeIdx + 1) % items.length;
            items.forEach((el, i) => {
                el.classList.toggle('active', i === activeIdx);
                el.setAttribute('aria-selected', i === activeIdx ? 'true' : 'false');
            });
            if (activeIdx >= 0 && items[activeIdx])
                items[activeIdx].scrollIntoView({ block: 'nearest' });
            return;
        }
        if ((e.key === 'Tab' && e.shiftKey) || e.key === 'ArrowUp') {
            e.preventDefault();
            if (items.length === 0) return;
            activeIdx = (activeIdx - 1 + items.length) % items.length;
            items.forEach((el, i) => {
                el.classList.toggle('active', i === activeIdx);
                el.setAttribute('aria-selected', i === activeIdx ? 'true' : 'false');
            });
            if (activeIdx >= 0 && items[activeIdx])
                items[activeIdx].scrollIntoView({ block: 'nearest' });
            return;
        }
        if (e.key === 'Enter') {
            if (activeIdx >= 0) {
                e.preventDefault();
                let items = Array.from(dirList.querySelectorAll('li'));
                if (items[activeIdx]) items[activeIdx].click();
                activeIdx = -1;
                return;
            }
            // Otherwise, allow Enter to be handled for path entry/save
        }
        if (e.key === 'Escape') {
            activeIdx = -1;
            items.forEach((el) => el.classList.remove('active'));
        }
    });

    // Optionally, focus/description
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

    // Expose validate helper for external use
    row.validateDirectoryExists = async function (path) {
        if (!path || !path.endsWith('/')) return false;
        const { exists } = await fetchDirectoryList(path);
        return exists;
    };

    // Validate on mount for initial value
    setTimeout(validateInput, 10);

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

    input.addEventListener('focus', () => {
        let parent = input.closest('form') || input.closest('.modal-content');
        if (parent) {
            const nameInput = parent.querySelector('input[name="name"]');
            if (nameInput) {
                const nameValue = nameInput.value;
                
            }
        }
    });

    input.addEventListener('click', async () => {
        let nameValue = '';
        let parent = input.closest('form') || input.closest('.modal-content');
        if (parent) {
            const nameInput = parent.querySelector('input[name="name"]');
            if (nameInput) nameValue = nameInput.value.trim();
        }
        if (typeof directoryPickerModal === 'function') {
            const selectedPath = await directoryPickerModal(input.value || '/', nameValue || null);
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
    let value = immediateData[field.key];

    if (typeof value === 'string') value = [value];
    if (value === null || value === undefined || !Array.isArray(value)) value = [''];
    immediateData[field.key] = [...value];
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

function isTouchDevice() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

export function renderDirListDragDropField(field, immediateData) {
    let value = immediateData[field.key];
    if (typeof value === 'string') value = [value];
    if (!Array.isArray(value) || value.length === 0) value = [''];
    immediateData[field.key] = [...value];
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

export function renderDirListOptionsField(field, immediateData) {
    let value = immediateData[field.key];

    if (typeof value === 'string') {
        value = [
            {
                path: value,
                mode: (field.options && field.options[0]) || '',
            },
        ];
    } else if (value && !Array.isArray(value)) {
        value = [
            {
                path: value.path ?? '',
                mode: value.mode ?? ((field.options && field.options[0]) || ''),
            },
        ];
    }
    if (!Array.isArray(value) || value.length === 0) {
        value = [
            {
                path: '',
                mode: (field.options && field.options[0]) || '',
            },
        ];
    }
    immediateData[field.key] = value.map((dir) =>
        typeof dir === 'object' && dir !== null
            ? {
                  path: dir.path ?? '',
                  mode: dir.mode ?? ((field.options && field.options[0]) || ''),
              }
            : { path: dir || '', mode: (field.options && field.options[0]) || '' }
    );
    value = immediateData[field.key];

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
        value.push({ path: '', mode: (field.options && field.options[0]) || '' });
        immediateData[field.key] = [...value];
        renderRows();
    };
    labelCol.appendChild(addBtn);

    const inputWrap = document.createElement('div');
    inputWrap.className = 'settings-field-inputwrap dirlist-input-col';

    function renderRows() {
        inputWrap.innerHTML = '';
        value.forEach((dir, idx) => {
            if (typeof dir !== 'object' || dir === null) {
                dir = { path: dir || '', mode: (field.options && field.options[0]) || '' };
                value[idx] = dir;
            } else {
                if (!dir.mode) dir.mode = (field.options && field.options[0]) || '';
                if (!('path' in dir)) dir.path = '';
            }

            const item = document.createElement('div');
            item.className = 'field-dragdrop-row dir-list-option-row';

            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'input field-input';
            input.name = field.key;
            input.value = dir.path || '';

            input.readOnly = false;
            input.addEventListener('click', async () => {
                if (typeof directoryPickerModal === 'function') {
                    const selectedPath = await directoryPickerModal(input.value || '/');
                    if (selectedPath && selectedPath !== input.value) {
                        input.value = selectedPath;
                        dir.path = selectedPath;
                        immediateData[field.key] = [...value];
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                }
            });

            input.addEventListener('input', () => {
                dir.path = input.value;
                immediateData[field.key] = [...value];
            });
            item.appendChild(input);

            if (field.options && Array.isArray(field.options)) {
                const select = document.createElement('select');
                select.className = 'select dir-list-mode';
                field.options.forEach((opt) => {
                    const option = document.createElement('option');
                    option.value = opt;
                    option.textContent = humanize(opt);
                    if (dir.mode === opt) {
                        option.selected = true;
                    }
                    select.appendChild(option);
                });
                select.addEventListener('change', () => {
                    dir.mode = select.value;
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

    renderRows();
    row.appendChild(labelCol);
    row.appendChild(inputWrap);

    return row;
}
