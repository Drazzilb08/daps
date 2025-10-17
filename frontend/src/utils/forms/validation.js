export function validateField(field, value) {
    // Check required fields
    if (field.required && (value === undefined || value === null || value === '')) {
        return `${field.label || field.key} is required`;
    }

    // Skip validation for empty optional fields
    if (!field.required && (value === undefined || value === null || value === '')) {
        return null;
    }

    // Type-specific validation
    switch (field.type) {
        case 'number':
        case 'float':
            return validateNumber(field, value);

        case 'json':
            return validateJSON(field, value);

        case 'text':
        case 'password':
            return validateText(field, value);

        case 'dropdown':
            return validateDropdown(field, value);

        case 'dir':
            return validateDirectory(field, value);

        case 'color_list':
            return validateColorList(field, value);

        case 'instances':
            return validateInstances(field, value);

        default:
            // No specific validation for unknown field types
            return null;
    }
}

/**
 * Validate all fields in a form schema
 *
 * @param {Object} schema - Form schema object
 * @param {Object} values - Form values object
 * @returns {Object} Object with field keys as keys and error messages as values
 */
export function validateForm(schema, values) {
    const errors = {};

    if (!schema?.fields || !Array.isArray(schema.fields)) {
        return errors;
    }

    schema.fields.forEach(field => {
        const error = validateField(field, values[field.key], values);
        if (error) {
            errors[field.key] = error;
        }
    });

    return errors;
}

/**
 * Validate number fields
 */
function validateNumber(field, value) {
    if (typeof value === 'string' && value.trim() === '') {
        return null; // Empty string is handled by required check
    }

    const numValue = Number(value);

    if (isNaN(numValue)) {
        return `${field.label || field.key} must be a valid number`;
    }

    if (field.min !== undefined && numValue < field.min) {
        return `${field.label || field.key} must be at least ${field.min}`;
    }

    if (field.max !== undefined && numValue > field.max) {
        return `${field.label || field.key} must be at most ${field.max}`;
    }

    // Integer validation for number type (not float)
    if (field.type === 'number' && !Number.isInteger(numValue)) {
        return `${field.label || field.key} must be a whole number`;
    }

    return null;
}

/**
 * Validate JSON fields
 */
function validateJSON(field, value) {
    if (typeof value !== 'string') {
        return `${field.label || field.key} must be a JSON string`;
    }

    try {
        JSON.parse(value);
        return null;
    } catch (error) {
        return `${field.label || field.key} must be valid JSON: ${error.message}`;
    }
}

/**
 * Validate text fields
 */
function validateText(field, value) {
    if (typeof value !== 'string') {
        return `${field.label || field.key} must be text`;
    }

    if (field.minLength !== undefined && value.length < field.minLength) {
        return `${field.label || field.key} must be at least ${field.minLength} characters`;
    }

    if (field.maxLength !== undefined && value.length > field.maxLength) {
        return `${field.label || field.key} must be at most ${field.maxLength} characters`;
    }

    // Pattern validation
    if (field.pattern) {
        const regex = new RegExp(field.pattern);
        if (!regex.test(value)) {
            return field.patternMessage || `${field.label || field.key} format is invalid`;
        }
    }

    return null;
}

/**
 * Validate dropdown/select fields
 */
function validateDropdown(field, value) {
    if (!field.options || !Array.isArray(field.options)) {
        return null; // No options to validate against
    }

    if (!field.options.includes(value)) {
        return `${field.label || field.key} must be one of the available options`;
    }

    return null;
}

/**
 * Validate directory paths
 */
function validateDirectory(field, value) {
    if (typeof value !== 'string') {
        return `${field.label || field.key} must be a directory path`;
    }

    // Basic path validation (more sophisticated validation would require backend)
    if (value.includes('..')) {
        return `${field.label || field.key} cannot contain relative path elements`;
    }

    return null;
}

/**
 * Validate color list fields
 */
function validateColorList(field, value) {
    if (!Array.isArray(value)) {
        return `${field.label || field.key} must be a list of colors`;
    }

    // Validate each color in the list
    for (let i = 0; i < value.length; i++) {
        const color = value[i];
        if (!isValidColor(color)) {
            return `${field.label || field.key} contains invalid color at position ${i + 1}`;
        }
    }

    return null;
}

/**
 * Validate instances fields (complex validation)
 */
function validateInstances(field, value) {
    if (!Array.isArray(value)) {
        return `${field.label || field.key} must be a list of instances`;
    }

    // Each instance should have required properties based on field configuration
    for (let i = 0; i < value.length; i++) {
        const instance = value[i];
        if (!instance || typeof instance !== 'object') {
            return `${field.label || field.key} instance ${i + 1} is invalid`;
        }

        // Validate required instance fields if specified
        if (field.instance_types && Array.isArray(field.instance_types)) {
            if (!instance.type || !field.instance_types.includes(instance.type)) {
                return `${field.label || field.key} instance ${i + 1} must have a valid type`;
            }
        }
    }

    return null;
}

/**
 * Check if a string is a valid color (hex, rgb, hsl, named color)
 */
function isValidColor(color) {
    if (typeof color !== 'string') {
        return false;
    }

    // Hex colors
    if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color)) {
        return true;
    }

    // RGB/RGBA colors
    if (/^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(,\s*[\d.]+\s*)?\)$/.test(color)) {
        return true;
    }

    // HSL/HSLA colors
    if (/^hsla?\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*(,\s*[\d.]+\s*)?\)$/.test(color)) {
        return true;
    }

    // Named colors (basic check)
    const namedColors = [
        'red',
        'green',
        'blue',
        'white',
        'black',
        'yellow',
        'orange',
        'purple',
        'pink',
        'brown',
        'gray',
        'grey',
        'cyan',
        'magenta',
        'lime',
        'navy',
    ];

    return namedColors.includes(color.toLowerCase());
}

/**
 * Sanitize and normalize field values
 */
export function sanitizeFieldValue(field, value) {
    if (value === null || value === undefined) {
        return value;
    }

    switch (field.type) {
        case 'number':
        case 'float':
            if (typeof value === 'string') {
                const num = Number(value);
                return isNaN(num) ? value : num;
            }
            return value;

        case 'check_box':
            return Boolean(value);

        case 'json':
            if (typeof value === 'object') {
                return JSON.stringify(value, null, 2);
            }
            return value;

        case 'text':
        case 'password':
        case 'textarea':
            return String(value);

        default:
            return value;
    }
}

/**
 * Get default value for a field based on its type and configuration
 */
export function getDefaultFieldValue(field) {
    if (field.default !== undefined) {
        return field.default;
    }

    switch (field.type) {
        case 'check_box':
            return false;

        case 'number':
        case 'float':
            return field.required ? 0 : null;

        case 'text':
        case 'password':
        case 'textarea':
        case 'dropdown':
        case 'dir':
            return '';

        case 'json':
            return '{}';

        case 'color_list':
        case 'dirlist':
        case 'instances':
            return [];

        default:
            return null;
    }
}
