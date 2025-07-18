// web/static/js/settings/dynamic_forms.js

import { SETTINGS_SCHEMA } from './settings_schema.js';
import { renderField } from './field_render.js';

// -------- MAIN FORM RENDERER -------------
export function renderSettingsForm(formFields, moduleName, config, rootConfig) {
    const schema = SETTINGS_SCHEMA.find((s) => s.key === moduleName);
    if (!schema) return;

    formFields.innerHTML = '';

    const fieldsList = document.createElement('div');
    fieldsList.className = 'settings-fields-list';
    schema.fields.forEach((field) => {
        const fieldNode = renderField(field, config[field.key], config, rootConfig);
        if (fieldNode) fieldsList.appendChild(fieldNode);
    });

    formFields.appendChild(fieldsList);
}
