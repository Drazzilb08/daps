export function renderPasswordField(field, value) {
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

    // --- PASSWORD WRAPPER ---
    const pwWrap = document.createElement('div');
    pwWrap.className = 'password-wrapper';

    // Password input
    const input = document.createElement('input');
    input.type = 'password';
    input.className = 'input password-input masked-input';
    input.name = field.key;
    input.id = field.key;
    input.value = value ?? '';
    input.autocomplete = 'current-password';
    if (field.placeholder) input.placeholder = field.placeholder;
    pwWrap.appendChild(input);

    // Toggle button (eye)
    const toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.className = 'toggle-password';
    toggleBtn.setAttribute('aria-label', 'Show/Hide Password');
    toggleBtn.tabIndex = 0;
    toggleBtn.innerHTML = '<i class="material-icons">visibility</i>';
    pwWrap.appendChild(toggleBtn);

    // Toggle handler
    toggleBtn.onclick = (e) => {
        e.preventDefault();
        if (input.type === 'password') {
            input.type = 'text';
            input.classList.remove('masked-input');
            toggleBtn.innerHTML = '<i class="material-icons">visibility_off</i>';
        } else {
            input.type = 'password';
            input.classList.add('masked-input');
            toggleBtn.innerHTML = '<i class="material-icons">visibility</i>';
        }
    };

    inputWrap.appendChild(pwWrap);

    // Help text
    if (field.description) {
        const help = document.createElement('div');
        help.className = 'field-help-text';
        help.textContent = field.description;
        inputWrap.appendChild(help);
    }

    row.appendChild(inputWrap);
    return row;
}

export function renderTextField(field, value) {
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

    if (field.placeholder) input.placeholder = field.placeholder;
    if (field.modal === 'directoryPickerModal') input.readOnly = true;

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

export function renderJsonField(field, value) {
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

export function renderNumberField(field, value) {
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
    if (field.placeholder) input.placeholder = field.placeholder;

    // If float:true and show as percent, display percent
    let showAsPercent = !!field.float;
    if (showAsPercent) {
        input.min = 0;
        input.max = 100;
        input.step = 1;
        // Display as percent string if value exists
        if (typeof value === 'number') {
            input.value = Math.round(value * 100 * 100) / 100; // round to 2 decimals
        } else if (typeof value === 'string' && value !== '') {
            input.value = Math.round(parseFloat(value) * 100 * 100) / 100;
        } else {
            input.value = '';
        }
    } else {
        input.value = value ?? '';
    }

    // Helper percent symbol (optional)
    if (showAsPercent) {
        // Create a flex container
        const percentContainer = document.createElement('div');
        percentContainer.style.display = 'flex';
        percentContainer.style.alignItems = 'center';
        percentContainer.style.gap = '6px'; // Small gap

        input.style.flex = '1 1 auto';
        percentContainer.appendChild(input);

        const percentSpan = document.createElement('span');
        percentSpan.textContent = '%';
        percentContainer.appendChild(percentSpan);

        inputWrap.appendChild(percentContainer);
    } else {
        inputWrap.appendChild(input);
    }

    if (field.description) {
        const help = document.createElement('div');
        help.className = 'field-help-text';
        help.textContent = field.description;
        inputWrap.appendChild(help);
    }

    row.appendChild(inputWrap);
    return row;
}

export function renderTextareaField(field, value) {
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
    if (field.required) textarea.required = true;
    textarea.value = Array.isArray(value) ? value.join('\n') : value ?? '';

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
