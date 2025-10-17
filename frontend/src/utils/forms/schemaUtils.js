export const normalizeFieldSchema = (fieldSchema, fieldKey) => {
    // Handle string shorthand (just field type)
    if (typeof fieldSchema === 'string') {
        fieldSchema = { type: fieldSchema };
    }

    // Ensure field has all required base properties
    const normalized = {
        key: fieldKey,
        type: fieldSchema.type || 'text',
        label: fieldSchema.label || formatFieldLabel(fieldKey),
        description: fieldSchema.description || null,
        placeholder: fieldSchema.placeholder || null,
        required: Boolean(fieldSchema.required),
        disabled: Boolean(fieldSchema.disabled),
        hidden: Boolean(fieldSchema.hidden),

        // Field-specific properties
        options: fieldSchema.options || null,
        multiple: Boolean(fieldSchema.multiple),

        // HTML input attributes
        maxLength: fieldSchema.maxLength || null,
        minLength: fieldSchema.minLength || null,
        pattern: fieldSchema.pattern || null,
        min: fieldSchema.min || null,
        max: fieldSchema.max || null,
        step: fieldSchema.step || null,

        // Validation rules
        validation: normalizeValidationRules(fieldSchema.validation || {}),

        // Custom validation function
        customValidate: fieldSchema.customValidate || null,

        // Conditional display rules
        conditionalOn: fieldSchema.conditionalOn || null,
        conditionalValue: fieldSchema.conditionalValue || null,
        conditionalOperator: fieldSchema.conditionalOperator || 'equals',

        // Default value
        default:
            fieldSchema.default !== undefined
                ? fieldSchema.default
                : getFieldTypeDefaultValue(fieldSchema.type),

        // Additional custom properties (passed through as-is)
        ...Object.keys(fieldSchema).reduce((acc, key) => {
            if (
                ![
                    'type',
                    'label',
                    'description',
                    'placeholder',
                    'required',
                    'disabled',
                    'hidden',
                    'options',
                    'multiple',
                    'maxLength',
                    'minLength',
                    'pattern',
                    'min',
                    'max',
                    'step',
                    'validation',
                    'customValidate',
                    'conditionalOn',
                    'conditionalValue',
                    'conditionalOperator',
                    'default',
                ].includes(key)
            ) {
                acc[key] = fieldSchema[key];
            }
            return acc;
        }, {}),
    };

    return normalized;
};

/**
 * Normalize validation rules to ensure consistent format
 *
 * @param {Object|Array} validationRules - Raw validation rules
 * @returns {Object} Normalized validation rules object
 */
export const normalizeValidationRules = validationRules => {
    if (!validationRules) return {};

    // Handle array format: ['required', 'email', { minLength: 5 }]
    if (Array.isArray(validationRules)) {
        const normalized = {};
        validationRules.forEach(rule => {
            if (typeof rule === 'string') {
                normalized[rule] = true;
            } else if (typeof rule === 'object') {
                Object.assign(normalized, rule);
            }
        });
        return normalized;
    }

    // Handle object format (already normalized)
    if (typeof validationRules === 'object') {
        return { ...validationRules };
    }

    return {};
};

/**
 * Get default value for a field type
 *
 * @param {string} fieldType - Field type string
 * @returns {*} Default value for the field type
 */
export const getFieldTypeDefaultValue = fieldType => {
    const defaults = {
        text: '',
        password: '',
        number: null,
        float: null,
        textarea: '',
        check_box: false,
        dropdown: null,
        multi_select: [],
        radio: null,
        color: '#000000',
        color_list: [],
        dir: '',
        dir_list: [],
        json: null,
        hidden: '',

        // Legacy field type mappings
        dirlist: [],
        dirlist_dragdrop: [],
        dirlist_options: [],

        // Custom field defaults
        instance_dropdown: null,
        instances: [],
        gdrive_presets: null,
        holiday_presets: null,
        holiday_schedule: [],
    };

    return defaults[fieldType] !== undefined ? defaults[fieldType] : null;
};

/**
 * Format field key into a human-readable label
 *
 * @param {string} fieldKey - Field key to format
 * @returns {string} Formatted label
 */
export const formatFieldLabel = fieldKey => {
    return fieldKey
        .replace(/([a-z])([A-Z])/g, '$1 $2') // camelCase to words
        .replace(/[_-]/g, ' ') // underscores and dashes to spaces
        .replace(/\b\w/g, l => l.toUpperCase()) // title case
        .trim();
};

/**
 * Parse and normalize a complete form schema
 *
 * @param {Object} schema - Raw form schema
 * @returns {Object} Normalized schema with fields, metadata, and validation
 */
export const parseFormSchema = schema => {
    if (!schema || typeof schema !== 'object') {
        throw new Error('Invalid schema: must be an object');
    }

    const normalized = {
        title: schema.title || 'Form',
        description: schema.description || null,
        submitLabel: schema.submitLabel || 'Submit',
        cancelLabel: schema.cancelLabel || 'Cancel',

        // Form-level validation
        customValidate: schema.customValidate || null,

        // Form layout and behavior options
        layout: schema.layout || 'vertical',
        showProgress: Boolean(schema.showProgress),
        validateOnChange: schema.validateOnChange !== false, // default true

        // Field definitions
        fields: {},

        // Field order (for layout)
        fieldOrder: schema.fieldOrder || [],

        // Form sections/groups
        sections: schema.sections || null,
    };

    // Process and normalize fields
    if (schema.fields && typeof schema.fields === 'object') {
        Object.entries(schema.fields).forEach(([fieldKey, fieldSchema]) => {
            normalized.fields[fieldKey] = normalizeFieldSchema(fieldSchema, fieldKey);
        });

        // If no field order specified, use object key order
        if (normalized.fieldOrder.length === 0) {
            normalized.fieldOrder = Object.keys(normalized.fields);
        }
    } else {
        throw new Error('Invalid schema: fields property is required and must be an object');
    }

    return normalized;
};

/**
 * Generate default form data from schema
 *
 * @param {Object} schema - Normalized form schema
 * @returns {Object} Default form data with all field defaults
 */
export const generateDefaultFormData = schema => {
    const defaultData = {};

    Object.entries(schema.fields || {}).forEach(([fieldKey, fieldSchema]) => {
        defaultData[fieldKey] = fieldSchema.default;
    });

    return defaultData;
};

/**
 * Resolve field dependencies and conditional display
 *
 * @param {Object} schema - Form schema
 * @param {Object} formData - Current form data
 * @returns {Object} Field visibility map { fieldKey: boolean }
 */
export const resolveFieldVisibility = (schema, formData) => {
    const visibility = {};

    Object.entries(schema.fields || {}).forEach(([fieldKey, fieldSchema]) => {
        // Check if field is hidden by schema
        if (fieldSchema.hidden) {
            visibility[fieldKey] = false;
            return;
        }

        // Check conditional display rules
        if (fieldSchema.conditionalOn) {
            const dependentValue = formData[fieldSchema.conditionalOn];
            const expectedValue = fieldSchema.conditionalValue;
            const operator = fieldSchema.conditionalOperator || 'equals';

            let isVisible = false;

            switch (operator) {
                case 'equals':
                    isVisible = dependentValue === expectedValue;
                    break;
                case 'not_equals':
                    isVisible = dependentValue !== expectedValue;
                    break;
                case 'truthy':
                    isVisible = Boolean(dependentValue);
                    break;
                case 'falsy':
                    isVisible = !dependentValue;
                    break;
                case 'contains':
                    isVisible =
                        Array.isArray(dependentValue) && dependentValue.includes(expectedValue);
                    break;
                case 'not_contains':
                    isVisible =
                        Array.isArray(dependentValue) && !dependentValue.includes(expectedValue);
                    break;
                case 'greater_than':
                    isVisible = parseFloat(dependentValue) > parseFloat(expectedValue);
                    break;
                case 'less_than':
                    isVisible = parseFloat(dependentValue) < parseFloat(expectedValue);
                    break;
                default:
                    isVisible = true;
            }

            visibility[fieldKey] = isVisible;
        } else {
            visibility[fieldKey] = true;
        }
    });

    return visibility;
};

/**
 * Get fields that should be displayed based on current form data
 *
 * @param {Object} schema - Form schema
 * @param {Object} formData - Current form data
 * @returns {Array} Array of field keys that should be visible
 */
export const getVisibleFields = (schema, formData) => {
    const visibility = resolveFieldVisibility(schema, formData);
    return Object.entries(visibility)
        .filter(([, isVisible]) => isVisible)
        .map(([fieldKey]) => fieldKey);
};

/**
 * Group fields by sections if defined in schema
 *
 * @param {Object} schema - Form schema
 * @param {Object} formData - Current form data (for conditional visibility)
 * @returns {Array} Array of section objects with fields
 */
export const groupFieldsBySections = (schema, formData) => {
    const visibleFields = getVisibleFields(schema, formData);

    // If no sections defined, return single section with all fields
    if (!schema.sections || !Array.isArray(schema.sections)) {
        return [
            {
                title: null,
                description: null,
                fields: visibleFields.map(fieldKey => schema.fields[fieldKey]).filter(Boolean),
            },
        ];
    }

    return schema.sections.map(section => {
        const sectionFields = (section.fields || [])
            .filter(fieldKey => visibleFields.includes(fieldKey))
            .map(fieldKey => schema.fields[fieldKey])
            .filter(Boolean);

        return {
            title: section.title || null,
            description: section.description || null,
            collapsible: Boolean(section.collapsible),
            collapsed: Boolean(section.collapsed),
            fields: sectionFields,
        };
    });
};

/**
 * Validate that a schema is well-formed
 *
 * @param {Object} schema - Schema to validate
 * @returns {Object} Validation result with isValid flag and errors array
 */
export const validateSchema = schema => {
    const errors = [];

    try {
        if (!schema || typeof schema !== 'object') {
            errors.push('Schema must be an object');
            return { isValid: false, errors };
        }

        if (!schema.fields || typeof schema.fields !== 'object') {
            errors.push('Schema must have a fields property that is an object');
            return { isValid: false, errors };
        }

        // Validate each field
        Object.entries(schema.fields).forEach(([fieldKey, fieldSchema]) => {
            if (
                !fieldSchema ||
                (typeof fieldSchema !== 'object' && typeof fieldSchema !== 'string')
            ) {
                errors.push(`Field "${fieldKey}" must be an object or string`);
            }

            if (typeof fieldSchema === 'object' && !fieldSchema.type) {
                errors.push(`Field "${fieldKey}" must have a type property`);
            }

            // Validate conditional dependencies
            if (fieldSchema.conditionalOn && !schema.fields[fieldSchema.conditionalOn]) {
                errors.push(
                    `Field "${fieldKey}" has conditional dependency on non-existent field "${fieldSchema.conditionalOn}"`
                );
            }
        });

        // Validate field order references
        if (schema.fieldOrder && Array.isArray(schema.fieldOrder)) {
            schema.fieldOrder.forEach(fieldKey => {
                if (!schema.fields[fieldKey]) {
                    errors.push(`Field order references non-existent field "${fieldKey}"`);
                }
            });
        }

        // Validate sections if present
        if (schema.sections && Array.isArray(schema.sections)) {
            schema.sections.forEach((section, index) => {
                if (section.fields && Array.isArray(section.fields)) {
                    section.fields.forEach(fieldKey => {
                        if (!schema.fields[fieldKey]) {
                            errors.push(
                                `Section ${index} references non-existent field "${fieldKey}"`
                            );
                        }
                    });
                }
            });
        }

        return { isValid: errors.length === 0, errors };
    } catch (error) {
        errors.push(`Schema validation error: ${error.message}`);
        return { isValid: false, errors };
    }
};

export default {
    normalizeFieldSchema,
    normalizeValidationRules,
    getFieldTypeDefaultValue,
    formatFieldLabel,
    parseFormSchema,
    generateDefaultFormData,
    resolveFieldVisibility,
    getVisibleFields,
    groupFieldsBySections,
    validateSchema,
};
