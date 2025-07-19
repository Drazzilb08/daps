import { openModal } from '../modals.js';
import { markDirty } from '../../util.js';

export function renderGDriveCustomField(field, value, config, rootConfig) {
    config = config || arguments[3];
    value = Array.isArray(config?.[field.key])
        ? config[field.key]
        : Array.isArray(value)
        ? value
        : [];
    const subfields = Array.isArray(field.fields) ? field.fields : [];
    // --- Outer container
    const row = document.createElement('div');
    row.className = 'settings-field-row';

    // --- Label
    const labelCol = document.createElement('div');
    labelCol.className = 'settings-field-labelcol';
    const label = document.createElement('label');
    label.textContent = field.label;
    label.htmlFor = field.key;
    labelCol.appendChild(label);
    row.appendChild(labelCol);

    // --- Main content
    const inputWrap = document.createElement('div');
    inputWrap.className = 'settings-field-inputwrap';

    if (field.description) {
        const desc = document.createElement('div');
        desc.className = 'field-help-text';
        desc.textContent = field.description;
        inputWrap.appendChild(desc);
    }

    // --- Card list
    const listArea = document.createElement('div');
    listArea.className = 'settings-card-list';
    inputWrap.appendChild(listArea);

    // --- Card list rendering
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

            // Edit behavior (always pass correct context to openEditModal)
            card.tabIndex = 0;
            card.setAttribute('role', 'button');
            card.setAttribute('aria-label', 'Edit Google Drive Entry');
            card.addEventListener('click', () =>
                openEditModal(idx, {
                    value,
                    field,
                    config,
                    subfields,
                    rootConfig,
                    buttonHandler: gdriveButtonHandler(idx),
                })
            );
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openEditModal(idx, {
                        value,
                        field,
                        config,
                        subfields,
                        rootConfig,
                        buttonHandler: gdriveButtonHandler(idx),
                    });
                }
            });

            listArea.appendChild(card);
        });

        listArea.appendChild(createAddCard());
    }

    // --- Add Card
    function createAddCard() {
        const addCard = document.createElement('div');
        addCard.className = 'settings-entry-card settings-add-card';
        addCard.tabIndex = 0;
        addCard.setAttribute('role', 'button');
        addCard.setAttribute('aria-label', `Add ${field.label.replace(/s$/, '')}`);
        addCard.addEventListener('click', () =>
            openEditModal(null, {
                value,
                field,
                config,
                subfields,
                rootConfig,
                buttonHandler: gdriveButtonHandler(null),
            })
        );
        addCard.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openEditModal(null, {
                    value,
                    field,
                    config,
                    subfields,
                    rootConfig,
                    buttonHandler: gdriveButtonHandler(null),
                });
            }
        });

        const plus = document.createElement('span');
        plus.className = 'card-add-plus';
        plus.textContent = '+';
        addCard.appendChild(plus);

        return addCard;
    }

    function gdriveButtonHandler(idx) {
        return {
            'save-modal-btn': ({ modal, closeModal, schema, bodyDiv }) => {
                const entryObj = {};
                (schema || []).forEach((sf) => {
                    if (sf.exclude_on_save) return;
                    const input = bodyDiv.querySelector(`[name="${sf.key}"]`);
                    if (input) {
                        if (input.type === 'checkbox') entryObj[sf.key] = input.checked;
                        else entryObj[sf.key] = input.value;
                    }
                });
                // 2. Only update the array at config[field.key], never assign entryObj to config directly!
                if (typeof idx === 'number') {
                    value[idx] = entryObj;
                } else {
                    value.push(entryObj);
                }

                config[field.key] = value.slice();
                markDirty();
                renderList();
                closeModal();
            },
            ...(typeof idx === 'number' && {
                'delete-modal-btn': ({ closeModal }) => {
                    value.splice(idx, 1);
                    config[field.key] = value.slice();
                    markDirty();
                    renderList();
                    closeModal();
                    // Don't need markDirty() or closeModal() here anymore!
                },
            }),
        };
    }
    renderList();
    row.appendChild(inputWrap);
    return row;
}

export function renderReplacerrCustomField(field, value, config) {
    config = config || arguments[3];
    value = Array.isArray(config?.[field.key])
        ? config[field.key]
        : Array.isArray(value)
        ? value
        : [];
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
    listArea.className = 'settings-card-list twocol';
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
                const m = item.schedule.match(
                    /^range\(\s*(\d{2}\/\d{2})\s*-\s*(\d{2}\/\d{2})\s*\)$/
                );
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
            (item.color || []).forEach((color) => {
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
                openEditModal(idx, {
                    value,
                    field,
                    config,
                    renderList,
                    subfields,
                    rootConfig: null,
                    buttonHandler: replacerrButtonHandler(idx),
                })
            );
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openEditModal(idx, {
                        value,
                        field,
                        config,
                        renderList,
                        subfields,
                        rootConfig: null,
                        buttonHandler: replacerrButtonHandler(idx),
                    });
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
        addCard.addEventListener('click', () =>
            openEditModal(null, {
                value,
                field,
                config,
                renderList,
                subfields,
                rootConfig: null,
                buttonHandler: replacerrButtonHandler(null),
            })
        );
        addCard.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openEditModal(null, {
                    value,
                    field,
                    config,
                    renderList,
                    subfields,
                    rootConfig: null,
                    buttonHandler: replacerrButtonHandler(null),
                });
            }
        });

        const plus = document.createElement('span');
        plus.className = 'card-add-plus';
        plus.textContent = '+';
        addCard.appendChild(plus);

        return addCard;
    }

    // ---- Custom save/delete handler: always builds full {name, schedule, color}
    function replacerrButtonHandler(idx) {
        return {
            'save-modal-btn': ({ modal, closeModal, schema, bodyDiv }) => {
                // Name
                const name = modal.querySelector('input[name="name"]')?.value?.trim() || '';
                // Schedule (holiday_schedule type)
                const fromMonth = modal.querySelector('#schedule-from-month')?.value || '';
                const fromDay = modal.querySelector('#schedule-from-day')?.value || '';
                const toMonth = modal.querySelector('#schedule-to-month')?.value || '';
                const toDay = modal.querySelector('#schedule-to-day')?.value || '';
                const schedule =
                    fromMonth && fromDay && toMonth && toDay
                        ? `range(${fromMonth}/${fromDay}-${toMonth}/${toDay})`
                        : '';
                // Color
                const color = Array.from(
                    modal.querySelectorAll(
                        '.field-color-list .color-list-container input[type="color"]'
                    )
                ).map((el) => el.value);

                const entryObj = { name, schedule, color };

                if (typeof idx === 'number') {
                    value[idx] = entryObj;
                } else {
                    value.push(entryObj);
                }
                config[field.key] = value.slice();

                markDirty();
                renderList();
                closeModal();
            },
            ...(typeof idx === 'number' && {
                'delete-modal-btn': ({ closeModal }) => {
                    value.splice(idx, 1);
                    config[field.key] = value.slice();

                    markDirty();
                    renderList();
                    closeModal();
                },
            }),
        };
    }

    renderList();
    row.appendChild(inputWrap);
    return row;
}

export function renderUpgradinatorrCustomField(field, value = [], config, rootConfig) {
    config = config || arguments[3];
    value = Array.isArray(config?.[field.key])
        ? config[field.key]
        : Array.isArray(value)
        ? value
        : [];
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

            subfields.forEach((sf) => {
                if (sf.exclude_on_save) return;

                // Only show fields for the correct instance type, if specified
                if (
                    sf.show_if_instance_type &&
                    rootConfig &&
                    rootConfig.instances &&
                    item.instance &&
                    (!rootConfig.instances[sf.show_if_instance_type] ||
                        !(item.instance in rootConfig.instances[sf.show_if_instance_type]))
                ) {
                    return;
                }

                // Hide empty/null/undefined fields except for instance, count, tag_name
                if (
                    (typeof item[sf.key] === 'undefined' ||
                        item[sf.key] === null ||
                        item[sf.key] === '') &&
                    !['instance', 'count', 'tag_name'].includes(sf.key)
                ) {
                    return;
                }

                let fieldValue = item[sf.key];
                if (Array.isArray(fieldValue)) fieldValue = fieldValue[0];

                // Add percent symbol for season_monitored_threshold
                if (sf.key === 'season_monitored_threshold') {
                    let percent = fieldValue;
                    // Support string, int, or float, always show as 0–100 %
                    if (typeof percent === 'string') percent = parseFloat(percent);
                    if (typeof percent === 'number' && !isNaN(percent)) {
                        percent = Math.round(percent);
                        fieldValue = percent + ' %';
                    } else {
                        fieldValue = '';
                    }
                }

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

            card.tabIndex = 0;
            card.setAttribute('role', 'button');
            card.setAttribute('aria-label', 'Edit entry');
            card.addEventListener('click', () =>
                openEditModal(idx, {
                    value,
                    field,
                    config,
                    subfields,
                    rootConfig,
                    buttonHandler: upgradinatorrButtonHandler(idx),
                })
            );
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openEditModal(idx, {
                        value,
                        field,
                        config,
                        subfields,
                        rootConfig,
                        buttonHandler: upgradinatorrButtonHandler(idx),
                    });
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
            openEditModal(null, {
                value,
                field,
                config,
                subfields,
                rootConfig,
                buttonHandler: upgradinatorrButtonHandler(null),
            })
        );
        addCard.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openEditModal(null, {
                    value,
                    field,
                    config,
                    subfields,
                    rootConfig,
                    buttonHandler: upgradinatorrButtonHandler(null),
                });
            }
        });

        const plus = document.createElement('span');
        plus.className = 'card-add-plus';
        plus.textContent = '+';
        addCard.appendChild(plus);

        return addCard;
    }

    // ---- Custom save/delete handler for Upgradinatorr
    function upgradinatorrButtonHandler(idx) {
        return {
            'save-modal-btn': ({ modal, closeModal, schema, bodyDiv }) => {
                const entryObj = {};
                schema.forEach((sf) => {
                    if (sf.exclude_on_save) return;
                    const input = bodyDiv.querySelector(`[name="${sf.key}"]`);
                    if (input) {
                        if (input.type === 'checkbox') entryObj[sf.key] = input.checked;
                        else entryObj[sf.key] = input.value;
                    }
                });
                if (typeof idx === 'number') {
                    value[idx] = entryObj;
                } else {
                    value.push(entryObj);
                }
                config[field.key] = value.slice();

                markDirty();
                renderList();
                closeModal();
            },
            ...(typeof idx === 'number' && {
                'delete-modal-btn': ({ closeModal }) => {
                    value.splice(idx, 1);
                    config[field.key] = value.slice();

                    markDirty();
                    renderList();
                    closeModal();
                },
            }),
        };
    }

    renderList();
    row.appendChild(inputWrap);
    return row;
}

export function renderLabelarrCustomField(field, value, config, rootConfig) {
    config = config || arguments[3];
    value = Array.isArray(config?.[field.key])
        ? config[field.key]
        : Array.isArray(value)
        ? value
        : [];
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
        return str.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
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
                                <span class="settings-value">${humanize(
                                    item.app_instance || ''
                                )}</span>`;
            card.appendChild(appRow);

            // --- Labels row ---
            const labelsRow = document.createElement('div');
            labelsRow.className = 'settings-entry-row';
            labelsRow.innerHTML = `<span class="settings-label">Labels:</span>
                                   <span class="settings-value">${
                                       Array.isArray(item.labels)
                                           ? item.labels.join(', ')
                                           : item.labels || ''
                                   }</span>`;
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
                    libNames.textContent = Array.isArray(plex.library_names)
                        ? ' ' + plex.library_names.join(', ')
                        : '';
                    valueWrap.appendChild(libNames);

                    plexRow.appendChild(valueWrap);
                    card.appendChild(plexRow);
                });
            }

            // Make card clickable for editing (use local handler)
            card.tabIndex = 0;
            card.setAttribute('role', 'button');
            card.setAttribute('aria-label', 'Edit Mapping');
            card.addEventListener('click', () =>
                openEditModal(idx, {
                    value,
                    field,
                    config,
                    subfields,
                    rootConfig,
                    buttonHandler: labelarrButtonHandler(idx),
                })
            );
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openEditModal(idx, {
                        value,
                        field,
                        config,
                        subfields,
                        rootConfig,
                        buttonHandler: labelarrButtonHandler(idx),
                    });
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
        addCard.addEventListener('click', () =>
            openEditModal(null, {
                value,
                field,
                config,
                subfields,
                rootConfig,
                buttonHandler: labelarrButtonHandler(null),
            })
        );
        addCard.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openEditModal(null, {
                    value,
                    field,
                    config,
                    subfields,
                    rootConfig,
                    buttonHandler: labelarrButtonHandler(null),
                });
            }
        });

        const plus = document.createElement('span');
        plus.className = 'card-add-plus';
        plus.textContent = '+';
        addCard.appendChild(plus);

        return addCard;
    }

    // ---- Custom save/delete handler for Labelarr
    function labelarrButtonHandler(idx) {
        return {
            'save-modal-btn': ({ modal, closeModal, schema, bodyDiv }) => {
                const entryObj = {};
                schema.forEach((sf) => {
                    if (sf.exclude_on_save) return;
                    const input = bodyDiv.querySelector(`[name="${sf.key}"]`);
                    if (input) {
                        if (input.type === 'checkbox') entryObj[sf.key] = input.checked;
                        else entryObj[sf.key] = input.value;
                    }
                });
                if (typeof idx === 'number') {
                    value[idx] = entryObj;
                } else {
                    value.push(entryObj);
                }
                config[field.key] = value.slice();

                markDirty();
                renderList();
                closeModal();
            },
            ...(typeof idx === 'number' && {
                'delete-modal-btn': ({ closeModal }) => {
                    value.splice(idx, 1);
                    config[field.key] = value.slice();

                    markDirty();
                    renderList();
                    closeModal();
                },
            }),
        };
    }

    renderList();
    row.appendChild(inputWrap);
    return row;
}

function openEditModal(
    idx,
    { value, field, config, subfields, rootConfig = null, buttonHandler = null }
) {
    const isEdit = typeof idx === 'number';
    // Create a local copy for editing, never reference config or value directly
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
        footerButtons,
        isEdit,
        buttonHandler: buttonHandler,
        value,
        rootConfig,
    });
}
