import { FIELD_RENDERERS } from './FieldRegistry.jsx';

/**
 * Renders a form field component based on field configuration
 * @param {Object} field - Field configuration object
 * @param {Object} immediateData - Current form data
 * @param {Object} moduleConfig - Module-specific configuration
 * @param {Object} rootConfig - Root application configuration
 * @param {Object} [context={}] - Additional rendering context
 * @returns {JSX.Element} Rendered field component
 * @throws {Error} When field is invalid or renderer not found
 */
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

    const { onChange: contextOnChange, ...restContext } = context;
    const onChange = contextOnChange
        ? value => contextOnChange(field.key, value)
        : value => {
              console.warn(`onChange not provided for field ${field.key}, value:`, value);
          };

    const value =
        field.value !== undefined
            ? field.value
            : immediateData?.[field.key] !== undefined
              ? immediateData[field.key]
              : field.defaultValue;

    return (
        <Renderer
            field={field}
            value={value}
            onChange={onChange}
            moduleConfig={moduleConfig}
            rootConfig={rootConfig}
            {...restContext}
            {...(field.onValidityChange ? { onValidityChange: field.onValidityChange } : {})}
        />
    );
}
