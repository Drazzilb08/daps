import { renderField } from '../settings_helpers.js';
import { renderHelp } from '../../helper.js';

export function renderJduparrSettings(formFields, config) {
    const wrapper = document.createElement('div');
    const help = renderHelp('jduparr');
    if (help) wrapper.appendChild(help);
    wrapper.className = 'settings-wrapper';
    Object.entries(config).forEach(([key, value]) => {
        renderField(wrapper, key, value);
    });
    formFields.appendChild(wrapper);
}
