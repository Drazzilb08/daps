export function renderPasswordField(field, immediateData) {
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
    input.value = immediateData[field.key] ?? '';
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

    // Save to immediateData on input
    input.addEventListener('input', () => {
        immediateData[field.key] = input.value;
    });

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

export function renderTextField(field, immediateData) {
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
    input.value = immediateData[field.key] ?? '';

    if (field.placeholder) input.placeholder = field.placeholder;
    if (field.modal === 'directoryPickerModal') input.readOnly = true;

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

export function renderJsonField(field, immediateData) {
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

    if (typeof immediateData[field.key] === 'object' && immediateData[field.key] !== null) {
        textarea.value = JSON.stringify(immediateData[field.key], null, 2);
    } else if (typeof immediateData[field.key] === 'string') {
        textarea.value = immediateData[field.key];
    } else {
        textarea.value = '';
    }

    autoResizeTextarea(textarea);

    textarea.addEventListener('input', () => {
        try {
            immediateData[field.key] = JSON.parse(textarea.value);
        } catch {
            immediateData[field.key] = textarea.value;
        }
    });

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

// Integer-only number input for settings (no percent/float logic)
export function renderNumberField(field, immediateData) {
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
    if (field.min !== undefined) input.min = field.min;
    if (field.max !== undefined) input.max = field.max;
    if (field.step !== undefined) input.step = field.step;
    input.value = immediateData[field.key] ?? '';

    // Save as int to immediateData on input
    input.addEventListener('input', () => {
        let v = input.value;
        immediateData[field.key] = v === '' ? '' : parseInt(v, 10);
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

// Float/percent field: always 0..1 (float in config), displays as percent to user
export function renderFloatField(field, immediateData) {
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
    input.min = 0;
    input.max = 100;
    input.step = 1;
    if (field.placeholder) input.placeholder = field.placeholder;

    // Display as percent string if value exists
    if (typeof immediateData[field.key] === 'number') {
        input.value = Math.round(immediateData[field.key] * 100 * 100) / 100;
    } else if (typeof immediateData[field.key] === 'string' && immediateData[field.key] !== '') {
        input.value = Math.round(parseFloat(immediateData[field.key]) * 100 * 100) / 100;
    } else {
        input.value = '';
    }

    // Save as float (0..1) to immediateData on input
    input.addEventListener('input', () => {
        let v = input.value;
        let floatVal = v === '' ? '' : Math.min(1, Math.max(0, parseFloat(v) / 100));
        immediateData[field.key] = v === '' ? '' : floatVal;
    });

    // Percent symbol
    const percentContainer = document.createElement('div');
    percentContainer.style.display = 'flex';
    percentContainer.style.alignItems = 'center';
    percentContainer.style.gap = '6px';
    input.style.flex = '1 1 auto';
    percentContainer.appendChild(input);
    const percentSpan = document.createElement('span');
    percentSpan.textContent = '%';
    percentContainer.appendChild(percentSpan);
    inputWrap.appendChild(percentContainer);

    if (field.description) {
        const help = document.createElement('div');
        help.className = 'field-help-text';
        help.textContent = field.description;
        inputWrap.appendChild(help);
    }

    row.appendChild(inputWrap);
    return row;
}

export function renderTextareaField(field, immediateData) {
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
    textarea.value = Array.isArray(immediateData[field.key])
        ? immediateData[field.key].join('\n')
        : immediateData[field.key] ?? '';

    autoResizeTextarea(textarea);

    textarea.addEventListener('input', () => {
        immediateData[field.key] = textarea.value;
    });

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
