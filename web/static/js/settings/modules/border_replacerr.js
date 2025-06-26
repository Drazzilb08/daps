import { renderHelp } from '../../helper.js';
import { renderTextareaArrayField } from '../settings_helpers.js';
import { borderReplacerrModal } from '../modals.js';
import { renderField, renderRemoveBordersBooleanField } from '../settings_helpers.js';

let borderReplacerrData = [];

export function renderReplacerrSettings(formFields, config, rootConfig) {
    const wrapper = document.createElement('div');
    wrapper.className = 'settings-wrapper';

    const help = renderHelp('border_replacerr');
    if (help) wrapper.appendChild(help);

    Object.entries(config).forEach(([key, value]) => {
        if (
            !['holidays', 'border_colors', 'remove_borders', 'exclusion_list', 'exclude'].includes(
                key
            )
        ) {
            renderField(wrapper, key, value);
        }
    });

    ['exclusion_list', 'exclude'].forEach((fieldKey) => {
        if (config[fieldKey]) {
            wrapper.appendChild(renderTextareaArrayField(fieldKey, config[fieldKey]));
        }
    });

    let removeBordersField = renderRemoveBordersBooleanField(config);
    wrapper.appendChild(removeBordersField);

    // Border Colors
    const borderColorField = document.createElement('div');
    borderColorField.className = 'field';
    borderColorField.innerHTML = `
        <label>Border Colors</label>
        <button type="button" id="addBorderColor" class="btn add-control-btn">➕ Add Color</button>
        <div id="border-colors-container"></div>
    `;
    wrapper.appendChild(borderColorField);

    const borderColorsContainer = borderColorField.querySelector('#border-colors-container');
    function updateBorderColorsFromDOM() {
        config.border_colors = Array.from(
            borderColorsContainer.querySelectorAll('input[type="color"]')
        ).map((input) => input.value);

        if (removeBordersField && removeBordersField.parentNode)
            removeBordersField.parentNode.removeChild(removeBordersField);
        removeBordersField = renderRemoveBordersBooleanField(config);

        let insertAfter = null;
        for (let i = wrapper.children.length - 1; i >= 0; i--) {
            const node = wrapper.children[i];
            const label = node.querySelector && node.querySelector('label');
            if (label && /exclusion list|exclude/i.test(label.textContent.trim())) {
                insertAfter = node;
                break;
            }
        }
        if (insertAfter && insertAfter.nextSibling)
            wrapper.insertBefore(removeBordersField, insertAfter.nextSibling);
        else if (insertAfter) wrapper.appendChild(removeBordersField);
        else wrapper.insertBefore(removeBordersField, borderColorField);
    }
    function addColorPicker(container, color = '#ffffff') {
        const subfield = document.createElement('div');
        subfield.className = 'subfield';
        subfield.innerHTML = `
            <input type="color" value="${color}"/>
            <button type="button" class="remove-color btn--cancel btn--remove-item btn">−</button>
        `;
        const colorInput = subfield.querySelector('input[type="color"]');
        colorInput.addEventListener('input', updateBorderColorsFromDOM);
        subfield.querySelector('.remove-color').onclick = () => {
            subfield.remove();
            updateBorderColorsFromDOM();
        };
        container.appendChild(subfield);
        updateBorderColorsFromDOM();
    }
    (config.border_colors || []).forEach((color) => addColorPicker(borderColorsContainer, color));
    borderColorField.querySelector('#addBorderColor').onclick = () =>
        addColorPicker(borderColorsContainer, '#ffffff');

    if (rootConfig?.poster_renamerr?.run_border_replacerr === true) {
        ['source_dirs', 'destination_dir'].forEach((fieldKey) => {
            const fields = wrapper.querySelectorAll(`[name="${fieldKey}"]`);
            fields.forEach((field) => {
                field.disabled = true;
                field.value = '';
                field.placeholder = "🔒 Managed by Poster Renamerr with 'Run Border Replacerr'";
                field.title = "Managed by Poster Renamerr with 'Run Border Replacerr'";
                if (fieldKey === 'source_dirs') {
                    const fieldContainer = field.closest('.field');
                    if (fieldContainer) {
                        const addBtn = fieldContainer.querySelector('.add-control-btn');
                        if (addBtn) addBtn.style.display = 'none';
                        fieldContainer
                            .querySelectorAll('.remove-item')
                            .forEach((btn) => (btn.style.display = 'none'));
                    }
                }
            });
        });
    }

    const holidaysField = document.createElement('div');
    holidaysField.className = 'field';
    holidaysField.innerHTML = `
        <label>Holidays</label>
        <button type="button" id="add-holiday-btn" class="btn add-control-btn">➕ Add Holiday</button>
        <div id="holidays-container"></div>
    `;
    wrapper.appendChild(holidaysField);

    borderReplacerrData = Object.entries(config.holidays || {}).map(([holiday, details]) => ({
        holiday,
        schedule: details.schedule,
        color: details.color,
    }));

    const holidaysContainer = holidaysField.querySelector('#holidays-container');
    function updateBorderReplacerrUI() {
        holidaysContainer.innerHTML = '';
        if (borderReplacerrData.length === 0) {
            holidaysContainer.innerHTML = `<p class="no-entries">🎄 No holidays configured yet.</p>`;
        } else {
            borderReplacerrData.forEach((entry, i) => {
                const card = document.createElement('div');
                card.className = 'holiday-card card show-card';
                card.innerHTML = `
                    <div class="holiday-header">
                        <span><strong>${entry.holiday}</strong></span>
                        <span>${entry.schedule}</span>
                        <div class="holiday-actions">
                            <button type="button" class="btn edit-btn" data-idx="${i}">Edit</button>
                            <button type="button" class="remove-btn btn--cancel btn--remove-item btn" data-idx="${i}">-</button>
                        </div>
                    </div>
                    <div>${entry.color
                        .map((c) => `<span class="holiday-swatch" style="background:${c}"></span>`)
                        .join('')}</div>
                `;
                holidaysContainer.appendChild(card);
            });
            holidaysContainer.querySelectorAll('.edit-btn').forEach((btn) => {
                btn.onclick = () => {
                    const idx = parseInt(btn.dataset.idx, 10);
                    if (!isNaN(idx))
                        borderReplacerrModal(idx, borderReplacerrData, updateBorderReplacerrUI);
                };
            });
            holidaysContainer.querySelectorAll('.remove-btn').forEach((btn) => {
                btn.onclick = () => {
                    const confirmed = confirm('Are you sure you want to remove this holiday?');
                    if (confirmed) {
                        const idx = parseInt(btn.dataset.idx, 10);
                        borderReplacerrData.splice(idx, 1);
                        updateBorderReplacerrUI();
                    }
                };
            });
        }
    }
    holidaysField.querySelector('#add-holiday-btn').onclick = () =>
        borderReplacerrModal(null, borderReplacerrData, updateBorderReplacerrUI);

    updateBorderReplacerrUI();

    formFields.appendChild(wrapper);
}

export function getBorderReplacerrData() {
    return borderReplacerrData;
}
