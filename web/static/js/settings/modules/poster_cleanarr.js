import { renderHelp } from '../../helper.js';
import { renderField, renderPlexSonarrRadarrInstancesField } from '../settings_helpers.js';

export function renderPosterCleanarrSettings(formFields, config, rootConfig) {
    const wrapper = document.createElement('div');
    const help = renderHelp('poster_cleanarr');
    if (help) wrapper.appendChild(help);
    wrapper.className = 'settings-wrapper';
    Object.entries(config).forEach(([key, value]) => {
        if (key === 'instances') {
            renderPlexSonarrRadarrInstancesField(wrapper, value, rootConfig, 'poster_cleanarr');
        } else {
            renderField(wrapper, key, value);
        }
    });
    formFields.appendChild(wrapper);
}
