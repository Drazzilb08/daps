import { openModal } from '../modals.js';
import { markDirty } from '../../util.js';

// GDrive Custom Renderer
export function renderGDriveCustomField(field, immediateData, moduleConfig, rootConfig) {
    let value = Array.isArray(immediateData[field.key]) ? immediateData[field.key] : [];

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

            card.tabIndex = 0;
            card.setAttribute('role', 'button');
            card.setAttribute('aria-label', 'Edit Google Drive Entry');
            card.addEventListener('click', () =>
                openEditModal(idx, {
                    immediateData,
                    field,
                    moduleConfig,
                    subfields,
                    rootConfig,
                    buttonHandler: gdriveButtonHandler(idx),
                })
            );
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openEditModal(idx, {
                        immediateData,
                        field,
                        moduleConfig,
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

    function createAddCard() {
        const addCard = document.createElement('div');
        addCard.className = 'settings-entry-card settings-add-card';
        addCard.tabIndex = 0;
        addCard.setAttribute('role', 'button');
        addCard.setAttribute('aria-label', `Add ${field.label.replace(/s$/, '')}`);
        addCard.addEventListener('click', () =>
            openEditModal(null, {
                immediateData,
                field,
                moduleConfig,
                subfields,
                rootConfig,
                buttonHandler: gdriveButtonHandler(null),
            })
        );
        addCard.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openEditModal(null, {
                    immediateData,
                    field,
                    moduleConfig,
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
                if (typeof idx === 'number') {
                    value[idx] = entryObj;
                } else {
                    value.push(entryObj);
                }
                const prev = JSON.stringify(immediateData[field.key]);
                immediateData[field.key] = value.slice();
                const curr = JSON.stringify(immediateData[field.key]);
                if (prev !== curr) markDirty();
                renderList();
                closeModal();
            },
            ...(typeof idx === 'number' && {
                'delete-modal-btn': ({ closeModal }) => {
                    value.splice(idx, 1);
                    const prev = JSON.stringify(immediateData[field.key]);
                    immediateData[field.key] = value.slice();
                    const curr = JSON.stringify(immediateData[field.key]);
                    if (prev !== curr) markDirty();
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

// Replacerr Custom Renderer
export function renderReplacerrCustomField(field, immediateData, moduleConfig, rootConfig) {
    let value = Array.isArray(immediateData[field.key]) ? immediateData[field.key] : [];
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
    listArea.className = 'settings-card-list twocol';
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

            const nameRow = document.createElement('div');
            nameRow.className = 'settings-entry-row settings-entry-main';
            const nameVal = document.createElement('span');
            nameVal.className = 'settings-value';
            nameVal.textContent = item.name || '';
            nameRow.appendChild(nameVal);
            card.appendChild(nameRow);

            const schedRow = document.createElement('div');
            schedRow.className = 'settings-entry-row';
            const schedLabel = document.createElement('span');
            schedLabel.className = 'settings-label';
            schedLabel.textContent = 'Schedule:';
            const schedVal = document.createElement('span');
            schedVal.className = 'settings-value';
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

            card.tabIndex = 0;
            card.setAttribute('role', 'button');
            card.setAttribute('aria-label', 'Edit Holiday');
            card.addEventListener('click', () =>
                openEditModal(idx, {
                    immediateData,
                    field,
                    moduleConfig,
                    renderList,
                    subfields,
                    rootConfig,
                    buttonHandler: replacerrButtonHandler(idx),
                })
            );
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openEditModal(idx, {
                        immediateData,
                        field,
                        moduleConfig,
                        renderList,
                        subfields,
                        rootConfig,
                        buttonHandler: replacerrButtonHandler(idx),
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
                immediateData,
                field,
                moduleConfig,
                renderList,
                subfields,
                rootConfig,
                buttonHandler: replacerrButtonHandler(null),
            })
        );
        addCard.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openEditModal(null, {
                    immediateData,
                    field,
                    moduleConfig,
                    renderList,
                    subfields,
                    rootConfig,
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

    function replacerrButtonHandler(idx) {
        return {
            'save-modal-btn': ({ modal, closeModal, schema, bodyDiv }) => {
                const name = modal.querySelector('input[name="name"]')?.value?.trim() || '';
                const fromMonth = modal.querySelector('#schedule-from-month')?.value || '';
                const fromDay = modal.querySelector('#schedule-from-day')?.value || '';
                const toMonth = modal.querySelector('#schedule-to-month')?.value || '';
                const toDay = modal.querySelector('#schedule-to-day')?.value || '';
                const schedule =
                    fromMonth && fromDay && toMonth && toDay
                        ? `range(${fromMonth}/${fromDay}-${toMonth}/${toDay})`
                        : '';
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
                const prev = JSON.stringify(immediateData[field.key]);
                immediateData[field.key] = value.slice();
                const curr = JSON.stringify(immediateData[field.key]);
                if (prev !== curr) markDirty();
                renderList();
                closeModal();
            },
            ...(typeof idx === 'number' && {
                'delete-modal-btn': ({ closeModal }) => {
                    value.splice(idx, 1);
                    const prev = JSON.stringify(immediateData[field.key]);
                    immediateData[field.key] = value.slice();
                    const curr = JSON.stringify(immediateData[field.key]);
                    if (prev !== curr) markDirty();
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

// Upgradinatorr Custom Renderer
export function renderUpgradinatorrCustomField(field, immediateData, moduleConfig, rootConfig) {
    let value = Array.isArray(immediateData[field.key]) ? immediateData[field.key] : [];
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

                if (
                    sf.show_if_instance_type &&
                    item.instance &&
                    sf.show_if_instance_type.toLowerCase() !==
                        getInstanceType(item.instance, rootConfig)
                ) {
                    return;
                }

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
                if (sf.key === 'season_monitored_threshold') {
                    let percent = fieldValue;
                    if (typeof percent === 'string') percent = parseFloat(percent) * 100;
                    else if (typeof percent === 'number' && !isNaN(percent))
                        percent = percent * 100;
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
                    immediateData,
                    field,
                    moduleConfig,
                    subfields,
                    rootConfig,
                    buttonHandler: upgradinatorrButtonHandler(idx),
                })
            );
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openEditModal(idx, {
                        immediateData,
                        field,
                        moduleConfig,
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
                immediateData,
                field,
                moduleConfig,
                subfields,
                rootConfig,
                buttonHandler: upgradinatorrButtonHandler(null),
            })
        );
        addCard.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openEditModal(null, {
                    immediateData,
                    field,
                    moduleConfig,
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

    function getInstanceType(instanceName, rootConfig) {
        if (!rootConfig || !rootConfig.instances) return '';
        for (const type of Object.keys(rootConfig.instances)) {
            if (instanceName in (rootConfig.instances[type] || {})) return type;
        }
        return '';
    }

    function upgradinatorrButtonHandler(idx) {
        return {
            'save-modal-btn': ({ modal, closeModal, schema, bodyDiv }) => {
                const entryObj = {};
                let instanceType = null;
                schema.forEach((sf) => {
                    if (sf.key === 'instance') {
                        const instanceInput = bodyDiv.querySelector(`[name="${sf.key}"]`);
                        if (instanceInput)
                            instanceType = getInstanceType(instanceInput.value, rootConfig);
                    }
                });
                schema.forEach((sf) => {
                    if (sf.exclude_on_save) return;
                    if (
                        sf.show_if_instance_type &&
                        (!instanceType || sf.show_if_instance_type !== instanceType)
                    ) {
                        return;
                    }
                    const input = bodyDiv.querySelector(`[name="${sf.key}"]`);
                    if (!input) return;
                    if (input.type === 'checkbox') {
                        entryObj[sf.key] = input.checked;
                    } else if (sf.type === 'number') {
                        entryObj[sf.key] = input.value === '' ? '' : parseInt(input.value, 10);
                    } else if (sf.type === 'float') {
                        entryObj[sf.key] =
                            input.value === ''
                                ? ''
                                : Math.min(1, Math.max(0, parseFloat(input.value) / 100));
                    } else {
                        entryObj[sf.key] = input.value;
                    }
                });

                if (typeof idx === 'number') {
                    value[idx] = entryObj;
                } else {
                    value.push(entryObj);
                }
                const prev = JSON.stringify(immediateData[field.key]);
                immediateData[field.key] = value.slice();
                const curr = JSON.stringify(immediateData[field.key]);
                if (prev !== curr) markDirty();
                renderList();
                closeModal();
            },
            ...(typeof idx === 'number' && {
                'delete-modal-btn': ({ closeModal }) => {
                    value.splice(idx, 1);
                    const prev = JSON.stringify(immediateData[field.key]);
                    immediateData[field.key] = value.slice();
                    const curr = JSON.stringify(immediateData[field.key]);
                    if (prev !== curr) markDirty();
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

// Labelarr Custom Renderer
export function renderLabelarrCustomField(field, immediateData, moduleConfig, rootConfig) {
    let value = Array.isArray(immediateData[field.key]) ? immediateData[field.key] : [];

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

            const appRow = document.createElement('div');
            appRow.className = 'settings-entry-row settings-entry-main';
            appRow.innerHTML = `<span class="settings-label">App Instance:</span>
                                <span class="settings-value">${item.app_instance || ''}</span>`;
            card.appendChild(appRow);

            const labelsRow = document.createElement('div');
            labelsRow.className = 'settings-entry-row';
            labelsRow.innerHTML = `<span class="settings-label">Labels:</span>
                                   <span class="settings-value">${
                                       Array.isArray(item.labels)
                                           ? item.labels.join(', ')
                                           : item.labels || ''
                                   }</span>`;
            card.appendChild(labelsRow);

            if (Array.isArray(item.plex_instances) && item.plex_instances.length > 0) {
                item.plex_instances.forEach((plex, pidx) => {
                    const plexRow = document.createElement('div');
                    plexRow.className = 'settings-entry-row settings-plexmap-block';

                    const plexLabel = document.createElement('span');
                    plexLabel.className = 'settings-label';
                    plexLabel.textContent = 'Plex Libraries:';
                    plexRow.appendChild(plexLabel);

                    const valueWrap = document.createElement('span');
                    valueWrap.className = 'settings-value';
                    const pill = document.createElement('span');
                    pill.className = 'settings-plex-name plex-pill';
                    pill.textContent = plex.instance ? plex.instance : `Plex ${pidx + 1}`;
                    valueWrap.appendChild(pill);
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

            card.tabIndex = 0;
            card.setAttribute('role', 'button');
            card.setAttribute('aria-label', 'Edit Mapping');
            card.addEventListener('click', () =>
                openEditModal(idx, {
                    immediateData,
                    field,
                    moduleConfig,
                    renderList,
                    subfields: field.fields || [],
                    rootConfig,
                    buttonHandler: labelarrButtonHandler(idx),
                })
            );
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openEditModal(idx, {
                        immediateData,
                        field,
                        moduleConfig,
                        renderList,
                        subfields: field.fields || [],
                        rootConfig,
                        buttonHandler: labelarrButtonHandler(idx),
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
        addCard.setAttribute('aria-label', 'Add Mapping');
        addCard.addEventListener('click', () =>
            openEditModal(null, {
                immediateData,
                field,
                moduleConfig,
                renderList,
                subfields: field.fields || [],
                rootConfig,
                buttonHandler: labelarrButtonHandler(null),
            })
        );
        addCard.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openEditModal(null, {
                    immediateData,
                    field,
                    moduleConfig,
                    renderList,
                    subfields: field.fields || [],
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

    function labelarrButtonHandler(idx) {
        return {
            'save-modal-btn': ({ modal, closeModal, schema, bodyDiv }) => {
                const entryObj = {};
                (schema || []).forEach((sf) => {
                    if (sf.exclude_on_save) return;

                    if (sf.key === 'plex_instances' && sf.type === 'instances') {
                        entryObj.plex_instances = [];
                        const plexBlocks = bodyDiv.querySelectorAll(
                            '.instance-block, .plex-instance-card'
                        );
                        plexBlocks.forEach((block) => {
                            const chkLabel = block.querySelector('.instance-checkbox-container');
                            const chk = chkLabel
                                ? chkLabel.querySelector('input[type="checkbox"]')
                                : null;
                            if (chk && chk.checked) {
                                const instanceName =
                                    block.querySelector('.instance-label')?.textContent?.trim() ||
                                    chk.value ||
                                    '';
                                const libList = block.querySelector('.instance-library-list');
                                let library_names = [];
                                if (libList) {
                                    library_names = Array.from(
                                        libList.querySelectorAll('input[type="checkbox"]:checked')
                                    )
                                        .map(
                                            (cb) =>
                                                cb.nextSibling?.textContent?.trim() ||
                                                cb.value ||
                                                ''
                                        )
                                        .filter((name) => !!name && name !== 'on');
                                }
                                entryObj.plex_instances.push({
                                    instance: instanceName,
                                    library_names,
                                });
                            }
                        });
                        return;
                    }

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

                const prev = JSON.stringify(immediateData[field.key]);
                immediateData[field.key] = value.slice();
                const curr = JSON.stringify(immediateData[field.key]);
                if (prev !== curr) markDirty();
                renderList();
                closeModal();
            },
            ...(typeof idx === 'number' && {
                'delete-modal-btn': ({ closeModal }) => {
                    value.splice(idx, 1);
                    const prev = JSON.stringify(immediateData[field.key]);
                    immediateData[field.key] = value.slice();
                    const curr = JSON.stringify(immediateData[field.key]);
                    if (prev !== curr) markDirty();
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

// Edit Modal Helper
export function openEditModal(
    idx,
    { immediateData, field, moduleConfig, subfields, rootConfig = null, buttonHandler = null }
) {
    const isEdit = typeof idx === 'number';
    const entry = isEdit ? { ...immediateData[field.key][idx] } : {};

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
        immediateData,
        rootConfig,
        moduleConfig,
    });
}
