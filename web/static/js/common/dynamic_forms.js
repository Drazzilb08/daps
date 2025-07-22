// web/static/js/settings/dynamic_forms.js

import { SETTINGS_SCHEMA } from '../constants/settings_schema.js';
import { renderField } from './field_render.js';

// -------- MAIN FORM RENDERER -------------
export function renderSettingsForm(formFields, moduleName, config, rootConfig) {
    const schema = SETTINGS_SCHEMA.find((s) => s.key === moduleName);
    const immediateData = config;
    const moduleConfig = config;
    if (!schema) return;

    formFields.innerHTML = '';

    const fieldsList = document.createElement('div');
    fieldsList.className = 'settings-fields-list';

    schema.fields.forEach((field) => {
        // At top-level, immediateData and moduleConfig are both 'config'
        const fieldNode = renderField(field, immediateData, moduleConfig, rootConfig);
        if (fieldNode) fieldsList.appendChild(fieldNode);
    });

    formFields.appendChild(fieldsList);
}
