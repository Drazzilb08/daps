import { renderField } from '../settings_helpers.js';
import { renderHelp } from '../../helper.js';

export function renderMain(formFields, config) {
    const wrapper = document.createElement('div');
    const help = renderHelp('main');
    if (help) wrapper.appendChild(help);
    wrapper.className = 'settings-wrapper';
    Object.entries(config).forEach(([key, value]) => {
        renderField(wrapper, key, value);
    });
    formFields.appendChild(wrapper);
}
