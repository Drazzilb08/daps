import { renderHelp } from '../../helper.js';
import { renderField, renderPlexSonarrRadarrInstancesField } from '../settings_helpers.js';

export function renderHealthCheckarrSettings(formFields, config, rootConfig) {
    const wrapper = document.createElement('div');
    const help = renderHelp('health_checkarr');
    if (help) wrapper.appendChild(help);
    wrapper.className = 'settings-wrapper';
    Object.entries(config).forEach(([key, value]) => {
        if (key === 'instances') {
            renderPlexSonarrRadarrInstancesField(wrapper, value, rootConfig, 'health_checkarr');
        } else {
            renderField(wrapper, key, value);
        }
    });
    formFields.appendChild(wrapper);
}
