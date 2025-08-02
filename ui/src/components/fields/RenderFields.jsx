import { FIELD_RENDERERS } from './FieldRegistry.jsx';

export function renderField(field, immediateData, moduleConfig, rootConfig, context = {}) {
    const Renderer = FIELD_RENDERERS[field.type] || FIELD_RENDERERS['default'];
    if (!field || typeof field !== 'object' || !field.key) {
        throw new Error('Invalid field passed to renderField: ' + JSON.stringify(field));
    }
    if (!Renderer) {
        throw new Error(
            `Field type "${field.type}" does not have a registered FIELD_RENDERERS component!`
        );
    }
    return (
        <Renderer
            field={field}
            value={immediateData?.[field.key]}
            moduleConfig={moduleConfig}
            rootConfig={rootConfig}
            {...context}
            {...(field.onValidityChange ? { onValidityChange: field.onValidityChange } : {})}
        />
    );
}
