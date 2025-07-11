import { SETTINGS_SCHEMA } from './settings_schema.js';
import { renderField } from './field_render.js';

// -------- MAIN FORM RENDERER -------------
export function renderSettingsForm(formFields, moduleName, config, rootConfig) {
    const schema = SETTINGS_SCHEMA.find(s => s.key === moduleName);
    if (!schema) return;

    formFields.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.className = 'settings-wrapper';

    schema.fields.forEach(field => {
        const fieldNode = renderField(field, config[field.key], config, rootConfig);
        if (fieldNode) wrapper.appendChild(fieldNode);
    });

    formFields.appendChild(wrapper);
}