import { renderField, renderPlexSonarrRadarrInstancesField } from '../settings_helpers.js';
import { renderHelp } from '../../helper.js';

export function renderNohlSettings(formFields, config, rootConfig) {
    const wrapper = document.createElement('div');
    const help = renderHelp('nohl');
    if (help) wrapper.appendChild(help);
    wrapper.className = 'settings-wrapper';
    Object.entries(config).forEach(([key, value]) => {
        if (key === 'source_dirs') {
            renderField(wrapper, key, value);
        } else if (key === 'instances') {
            renderPlexSonarrRadarrInstancesField(wrapper, value, rootConfig, 'nohl');
        } else {
            renderField(wrapper, key, value);
        }
    });
    formFields.appendChild(wrapper);
}
