/**
 * Determines if a field should be validated based on instance type conditions
 * @param {Object} field - Field configuration object
 * @param {Object} formData - Current form data
 * @param {Object} rootConfig - Root configuration object with instances
 * @returns {boolean} Whether the field should be validated
 */
function shouldValidateField(field, formData, rootConfig) {
    if (!field.show_if_instance_type) return true;
    const instanceName = formData.instance;
    let matchedType = null;
    if (instanceName && rootConfig && rootConfig.instances) {
        for (const type of Object.keys(rootConfig.instances)) {
            if (rootConfig.instances[type][instanceName] !== undefined) {
                matchedType = type.toLowerCase();
                break;
            }
        }
    }
    return matchedType && matchedType === field.show_if_instance_type.toLowerCase();
}

/**
 * Validates a single field based on its configuration and current value
 * @param {Object} field - Field configuration object
 * @param {Object} formData - Current form data
 * @returns {string|null} Error message or null if valid
 */
function validateField(field, formData) {
    let value = formData[field.key];
    let isEmpty =
        value === undefined ||
        value === null ||
        (typeof value === 'string' && value.trim() === '') ||
        (Array.isArray(value) && value.length === 0);

    if (field.type && field.type.startsWith('dir_')) {
        if (!Array.isArray(value)) value = [value];
        isEmpty = value.every(v => !v || (typeof v === 'string' && v.trim() === ''));
    }
    if (field.type === 'color_list') {
        isEmpty = Array.isArray(value) ? value.filter(v => !!v).length === 0 : !value;
    }

    if (field.required && isEmpty) {
        return field.label ? `${field.label} cannot be empty.` : 'This field cannot be empty.';
    }
    return null;
}

/**
 * Validates all fields in a schema against form data
 * @param {Array} schema - Array of field configuration objects
 * @param {Object} formData - Current form data
 * @param {Object} options - Validation options
 * @param {Object|null} [options.rootConfig=null] - Root configuration for conditional validation
 * @param {boolean} [options.isModal=false] - Whether validation is for modal context
 * @returns {Object} Object with field keys mapping to error messages
 */
export function validateFields(schema, formData, { rootConfig = null, isModal = false } = {}) {
    const invalidFields = {};
    schema.forEach(field => {
        if (field.exclude_on_save) return;
        if (!shouldValidateField(field, formData, rootConfig)) return;
        const errorMsg = validateField(field, formData, { rootConfig, isModal });
        if (errorMsg) invalidFields[field.key] = errorMsg;
    });
    return invalidFields;
}
