import { renderField } from '../settings_helpers.js';
import { renderHelp } from '../../helper.js';
import { upgradinatorrModal } from '../modals.js';
import { humanize } from '../../common.js';

let upgradinatorrData = [];

export function renderUpgradinatorrSettings(formFields, config, rootConfig) {
    const wrapper = document.createElement('div');
    wrapper.className = 'settings-wrapper';

    const help = renderHelp('upgradinatorr');
    if (help) wrapper.appendChild(help);

    Object.entries(config).forEach(([key, value]) => {
        if (key !== 'instances_list') {
            if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
                return;
            }
            renderField(wrapper, key, value);
        }
    });

    const instanceField = document.createElement('div');
    instanceField.className = 'field setting-field';
    instanceField.innerHTML = `
        <label>Instances</label>
        <button type="button" id="add-instance-btn" class="btn add-control-btn">➕ Add Instance</button>
        <div class="card-body">
            <table id="upgradinatorr-table" class="upgradinatorr-table">
                <thead>
                    <tr>
                        <th>Instance</th>
                        <th>Count</th>
                        <th>Tag Name</th>
                        <th>Ignore Tag</th>
                        <th>Unattended</th>
                        <th>Threshold</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody></tbody>
            </table>
        </div>
    `;
    wrapper.appendChild(instanceField);

    const tbody = instanceField.querySelector('tbody');
    upgradinatorrData = Object.entries(config.instances_list || {}).map(([inst, opts]) => {
        const entry = {
            instance: opts.instance,
            count: opts.count,
            tag_name: opts.tag_name,
            ignore_tag: opts.ignore_tag,
            unattended: opts.unattended,
        };
        if (typeof opts.season_monitored_threshold !== 'undefined') {
            entry.season_monitored_threshold = opts.season_monitored_threshold;
        }
        return entry;
    });

    function updateTable() {
        tbody.innerHTML = upgradinatorrData
            .map(
                (entry, i) => `
            <tr>
                <td>${humanize(entry.instance)}</td>
                <td>${entry.count}</td>
                <td>${entry.tag_name}</td>
                <td>${entry.ignore_tag}</td>
                <td>${entry.unattended}</td>
                <td>${entry.season_monitored_threshold ?? ''}</td>
                <td>
                    <button type="button" class="edit-upgrade btn" data-idx="${i}">Edit</button>
                    <button type="button" class="remove-btn btn--cancel btn--remove-item btn" data-idx="${i}">-</button>
                </td>
            </tr>
        `
            )
            .join('');
        tbody.querySelectorAll('.remove-btn').forEach((btn) => {
            btn.onclick = () => {
                const confirmed = confirm('Are you sure you want to remove this instance?');
                if (confirmed) {
                    const idx = parseInt(btn.dataset.idx, 10);
                    upgradinatorrData.splice(idx, 1);
                    updateTable();
                }
            };
        });
        tbody.querySelectorAll('.edit-upgrade').forEach((btn) => {
            btn.onclick = () => {
                const idx = parseInt(btn.dataset.idx, 10);
                upgradinatorrModal(idx, upgradinatorrData, rootConfig, updateTable);
            };
        });
    }

    instanceField
        .querySelector('#add-instance-btn')
        .addEventListener('click', () =>
            upgradinatorrModal(undefined, upgradinatorrData, rootConfig, updateTable)
        );
    updateTable();

    formFields.appendChild(wrapper);
}

export function getUpgradinatorrData() {
    return upgradinatorrData;
}
