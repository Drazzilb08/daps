import { renderHelp } from '../../helper.js';
import { renderField } from '../settings_helpers.js';
import { labelarrModal } from '../modals.js';
import { humanize } from '../../common.js';

let labelarrData = [];

export function renderLabelarrSettings(formFields, config, rootConfig) {
    const wrapper = document.createElement('div');
    wrapper.className = 'settings-wrapper';

    const help = renderHelp('labelarr');
    if (help) wrapper.appendChild(help);

    Object.entries(config).forEach(([key, value]) => {
        if (key !== 'mappings') {
            renderField(wrapper, key, value);
        }
    });

    const mappingsField = document.createElement('div');
    mappingsField.className = 'field setting-field';
    mappingsField.innerHTML = `
        <label>Mappings</label>
        <button type="button" id="add-mapping-btn" class="btn add-control-btn">➕ Add Mapping</button>
        <div id="labelarr-mappings-container" class="mappings-container"></div>
    `;
    wrapper.appendChild(mappingsField);

    const mappingsContainer = mappingsField.querySelector('#labelarr-mappings-container');

    labelarrData = Array.isArray(config.mappings)
        ? JSON.parse(JSON.stringify(config.mappings))
        : [];

    function updateMappings() {
        mappingsContainer.innerHTML = '';
        if (labelarrData.length === 0) {
            mappingsContainer.innerHTML = `
                <div class="no-entries labelarr-no-mappings">
                    🚫 No mappings yet. <br>
                    Click <b>"Add Mapping"</b> to create your first sync mapping.
                </div>
            `;
            return;
        }
        labelarrData.forEach((entry, i) => {
            try {
                const card = document.createElement('div');
                card.className = 'labelarr-mapping-card card show-card';

                const left = document.createElement('div');
                left.className = 'labelarr-mapping-left';
                left.innerHTML = `
                    <div class="mapping-app">${humanize(entry.app_type)}</div>
                    <div class="mapping-instance">Instance <span>${humanize(
                        entry.app_instance
                    )}:</span></div>
                    <div class="mapping-labels">
                        ${
                            entry.labels && entry.labels.length
                                ? entry.labels
                                      .map(
                                          (l) =>
                                              `<span class="labelarr-label">${humanize(l)}</span>`
                                      )
                                      .join('')
                                : '<span class="labelarr-label labelarr-label-empty">No label</span>'
                        }
                    </div>
                `;

                const center = document.createElement('div');
                center.className = 'labelarr-mapping-center';
                center.innerHTML = `<span class="labelarr-arrow">→</span>`;

                const right = document.createElement('div');
                right.className = 'labelarr-mapping-right';

                let plexHtml = '';
                (entry.plex_instances || []).forEach((inst) => {
                    const instance =
                        inst.instance || Object.keys(inst).find((k) => k !== 'library_names');
                    const libraries = Array.isArray(inst.library_names) ? inst.library_names : [];
                    plexHtml += `
                        <div class="labelarr-plex-target">
                            <span class="labelarr-plex-instance">${humanize(instance)}:</span>
                            ${libraries
                                .map(
                                    (lib) =>
                                        `<span class="labelarr-library">${humanize(lib)}</span>`
                                )
                                .join('')}
                        </div>
                    `;
                });
                right.innerHTML =
                    plexHtml || `<span class="labelarr-plex-none">No Plex Target</span>`;

                const actions = document.createElement('div');
                actions.className = 'labelarr-mapping-actions';
                actions.innerHTML = `
                    <button type="button" class="edit-btn btn" data-idx="${i}">Edit</button>
                    <button type="button" class="remove-btn btn--cancel btn--remove-item btn" data-idx="${i}">-</button>
                `;

                card.appendChild(left);
                card.appendChild(center);
                card.appendChild(right);
                card.appendChild(actions);

                mappingsContainer.appendChild(card);
            } catch (err) {
                console.error('Error rendering mapping entry:', entry, err);
            }
        });

        mappingsContainer.querySelectorAll('.remove-btn').forEach((btn) => {
            btn.onclick = () => {
                const idx = parseInt(btn.dataset.idx, 10);
                if (!isNaN(idx)) {
                    const confirmed = confirm('Are you sure you want to remove this mapping?');
                    if (!confirmed) return;
                    labelarrData.splice(idx, 1);
                    updateMappings();
                }
            };
        });

        mappingsContainer.querySelectorAll('.edit-btn').forEach((btn) => {
            btn.onclick = () => {
                const idx = parseInt(btn.dataset.idx, 10);
                if (!isNaN(idx)) {
                    labelarrModal(idx, labelarrData, rootConfig, updateMappings);
                }
            };
        });
    }

    mappingsField.querySelector('#add-mapping-btn').onclick = () =>
        labelarrModal(undefined, labelarrData, rootConfig, updateMappings);

    updateMappings();

    formFields.appendChild(wrapper);

    wrapper.flushLabelarrToConfig = () => {
        config.mappings = JSON.parse(JSON.stringify(labelarrData));
    };
}

export function getLabelarrData() {
    return labelarrData;
}
