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

    // Extract onChange from context and create wrapper
    const { onChange: contextOnChange, ...restContext } = context;
    const onChange = contextOnChange
        ? value => contextOnChange(field.key, value)
        : value => {
              console.warn(`onChange not provided for field ${field.key}, value:`, value);
          };

    return (
        <Renderer
            field={field}
            value={immediateData?.[field.key]}
            onChange={onChange}
            moduleConfig={moduleConfig}
            rootConfig={rootConfig}
            {...restContext}
            {...(field.onValidityChange ? { onValidityChange: field.onValidityChange } : {})}
        />
    );
}
