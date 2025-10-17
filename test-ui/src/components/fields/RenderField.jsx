import { FieldRegistry } from './FieldRegistry.jsx';

/**
 * Renders a form field component based on field configuration
 * Following main UI pattern for proper config data passing
 *
 * @param {Object} field - Field configuration object from schema
 * @param {Object} immediateData - Current form data for this module
 * @param {Object} moduleConfig - Module-specific configuration
 * @param {Object} rootConfig - Full application configuration
 * @param {Object} [context={}] - Additional rendering context
 * @returns {JSX.Element} Rendered field component
 * @throws {Error} When field is invalid or renderer not found
 */
export function renderField(field, immediateData, moduleConfig, rootConfig, context = {}) {
    const FieldComponent = FieldRegistry.getField(field.type);

    if (!field || typeof field !== 'object' || !field.key) {
        throw new Error('Invalid field passed to renderField: ' + JSON.stringify(field));
    }

    if (!FieldComponent) {
        throw new Error(
            `Field type "${field.type}" does not have a registered component in FieldRegistry!`
        );
    }

    const { onChange: contextOnChange, ...restContext } = context;
    const onChange = contextOnChange
        ? value => contextOnChange(field.key, value)
        : value => {
              console.warn(`onChange not provided for field ${field.key}, value:`, value);
          };

    // Get field value with proper fallback chain
    const value =
        field.value !== undefined
            ? field.value
            : immediateData?.[field.key] !== undefined
              ? immediateData[field.key]
              : field.defaultValue;

    return (
        <FieldComponent
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
