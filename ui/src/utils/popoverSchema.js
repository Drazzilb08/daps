/**
 * Popover Schema Validation and Processing Utilities
 *
 * Provides comprehensive validation and processing for schema-driven popover configurations.
 * Supports all existing PopoverTest.jsx patterns while enabling centralized management.
 */

/**
 * Supported popover content types
 */
export const CONTENT_TYPES = {
    FILTER_BUILDER: 'filterBuilder',
    MULTI_SELECT: 'multiSelect',
    FILTER_HUB: 'filterHub',
    FORM: 'form',
    LIST: 'list',
    CUSTOM: 'custom',
};

/**
 * Supported popover variants (from existing Popover component)
 */
export const POPOVER_VARIANTS = {
    DEFAULT: 'default',
    HELP: 'help',
    SELECTOR: 'selector',
    ACTIONS: 'actions',
};

/**
 * Validate a complete popover schema
 *
 * @param {Object} schema - The popover schema to validate
 * @param {Object} schema.state - State binding configuration
 * @param {Object} schema.popovers - Popover definitions
 * @returns {Object} Validation result with isValid boolean and errors array
 */
export const validatePopoverSchema = schema => {
    const errors = [];

    if (!schema || typeof schema !== 'object') {
        errors.push('Schema must be an object');
        return { isValid: false, errors };
    }

    const { state = {}, popovers = {} } = schema;

    // Validate state bindings
    Object.entries(state).forEach(([key, binding]) => {
        if (!validateStateBinding(binding)) {
            errors.push(`Invalid state binding for "${key}": ${JSON.stringify(binding)}`);
        }
    });

    // Validate popover definitions
    Object.entries(popovers).forEach(([key, popover]) => {
        const popoverErrors = validatePopoverDefinition(popover, key);
        errors.push(...popoverErrors);
    });

    return {
        isValid: errors.length === 0,
        errors,
    };
};

/**
 * Validate a single state binding
 *
 * @param {Object} binding - State binding configuration
 * @param {string} binding.binding - State property name
 * @param {string} [binding.setter] - Setter function name
 * @returns {boolean} Whether the binding is valid
 */
export const validateStateBinding = binding => {
    if (!binding || typeof binding !== 'object') {
        return false;
    }

    const { binding: bindingProp, setter } = binding;

    // binding property is required
    if (typeof bindingProp !== 'string' || bindingProp.length === 0) {
        return false;
    }

    // setter is optional but must be string if provided
    if (setter !== undefined && (typeof setter !== 'string' || setter.length === 0)) {
        return false;
    }

    return true;
};

/**
 * Validate a single popover definition
 *
 * @param {Object} popover - Popover configuration
 * @param {string} key - Popover key for error reporting
 * @returns {Array<string>} Array of validation errors
 */
export const validatePopoverDefinition = (popover, key) => {
    const errors = [];

    if (!popover || typeof popover !== 'object') {
        errors.push(`Popover "${key}" must be an object`);
        return errors;
    }

    const { variant = 'default', content, trapFocus, className, position, offset } = popover;

    // Validate variant
    if (!Object.values(POPOVER_VARIANTS).includes(variant)) {
        errors.push(`Popover "${key}" has invalid variant: "${variant}"`);
    }

    // Validate optional properties
    if (trapFocus !== undefined && typeof trapFocus !== 'boolean') {
        errors.push(`Popover "${key}" trapFocus must be boolean`);
    }

    if (className !== undefined && typeof className !== 'string') {
        errors.push(`Popover "${key}" className must be string`);
    }

    if (position !== undefined && !['top', 'bottom', 'left', 'right', 'auto'].includes(position)) {
        errors.push(`Popover "${key}" has invalid position: "${position}"`);
    }

    if (offset !== undefined && (typeof offset !== 'number' || offset < 0)) {
        errors.push(`Popover "${key}" offset must be non-negative number`);
    }

    // Validate content configuration
    if (content) {
        const contentErrors = validateContentDefinition(content, key);
        errors.push(...contentErrors);
    }

    return errors;
};

/**
 * Validate popover content configuration
 *
 * @param {Object} content - Content configuration
 * @param {string} popoverKey - Popover key for error reporting
 * @returns {Array<string>} Array of validation errors
 */
export const validateContentDefinition = (content, popoverKey) => {
    const errors = [];

    if (!content || typeof content !== 'object') {
        errors.push(`Popover "${popoverKey}" content must be an object`);
        return errors;
    }

    const { type, ...contentConfig } = content;

    // Validate content type
    if (!Object.values(CONTENT_TYPES).includes(type)) {
        errors.push(`Popover "${popoverKey}" has invalid content type: "${type}"`);
        return errors;
    }

    // Type-specific validation
    switch (type) {
        case CONTENT_TYPES.FILTER_BUILDER:
            errors.push(...validateFilterBuilderContent(contentConfig, popoverKey));
            break;
        case CONTENT_TYPES.MULTI_SELECT:
            errors.push(...validateMultiSelectContent(contentConfig, popoverKey));
            break;
        case CONTENT_TYPES.FILTER_HUB:
            errors.push(...validateFilterHubContent(contentConfig, popoverKey));
            break;
        case CONTENT_TYPES.FORM:
            errors.push(...validateFormContent(contentConfig, popoverKey));
            break;
        case CONTENT_TYPES.LIST:
            errors.push(...validateListContent(contentConfig, popoverKey));
            break;
        case CONTENT_TYPES.CUSTOM:
            // Custom content requires component prop
            if (!contentConfig.component) {
                errors.push(`Popover "${popoverKey}" custom content requires component prop`);
            }
            break;
    }

    return errors;
};

/**
 * Validate filter builder content configuration
 */
export const validateFilterBuilderContent = (content, popoverKey) => {
    const errors = [];
    const { fields, operators, conditions } = content;

    if (!Array.isArray(fields)) {
        errors.push(`FilterBuilder "${popoverKey}" requires fields array`);
    }

    if (typeof operators !== 'function') {
        errors.push(`FilterBuilder "${popoverKey}" requires operators function`);
    }

    if (conditions && !validateStateBinding(conditions)) {
        errors.push(`FilterBuilder "${popoverKey}" conditions must be valid state binding`);
    }

    return errors;
};

/**
 * Validate multi-select content configuration
 */
export const validateMultiSelectContent = (content, popoverKey) => {
    const errors = [];
    const { options, selected } = content;

    if (!Array.isArray(options)) {
        errors.push(`MultiSelect "${popoverKey}" requires options array`);
    }

    if (selected && !validateStateBinding(selected)) {
        errors.push(`MultiSelect "${popoverKey}" selected must be valid state binding`);
    }

    return errors;
};

/**
 * Validate filter hub content configuration
 */
export const validateFilterHubContent = (content, popoverKey) => {
    const errors = [];
    const { categories } = content;

    if (!Array.isArray(categories)) {
        errors.push(`FilterHub "${popoverKey}" requires categories array`);
    }

    return errors;
};

/**
 * Validate form content configuration
 */
export const validateFormContent = (content, popoverKey) => {
    const errors = [];
    const { fields } = content;

    if (!Array.isArray(fields)) {
        errors.push(`Form "${popoverKey}" requires fields array`);
    }

    return errors;
};

/**
 * Validate list content configuration
 */
export const validateListContent = (content, popoverKey) => {
    const errors = [];
    const { items } = content;

    if (!Array.isArray(items)) {
        errors.push(`List "${popoverKey}" requires items array`);
    }

    return errors;
};

/**
 * Process and normalize a validated schema for use in usePopoverManager
 *
 * @param {Object} schema - Validated popover schema
 * @param {Object} stateRefs - Map of state references from component
 * @returns {Object} Processed schema with resolved state bindings
 */
export const processPopoverSchema = (schema, stateRefs) => {
    const { state = {}, popovers = {} } = schema;

    // Create state binding resolver
    const resolveStateBinding = binding => {
        if (!binding || typeof binding !== 'object') {
            return null;
        }

        const { binding: bindingProp, setter } = binding;
        const stateValue = stateRefs[bindingProp];
        const setterFunction = setter ? stateRefs[setter] : null;

        return {
            value: stateValue,
            setValue: setterFunction,
            binding: bindingProp,
            setter,
        };
    };

    // Process each popover definition
    const processedPopovers = {};

    Object.entries(popovers).forEach(([key, popover]) => {
        const processedPopover = { ...popover };

        // Process content state bindings
        if (popover.content) {
            processedPopover.content = processContentBindings(popover.content, resolveStateBinding);
        }

        processedPopovers[key] = processedPopover;
    });

    return {
        ...schema,
        popovers: processedPopovers,
        _resolvedState: Object.entries(state).reduce((acc, [key, binding]) => {
            acc[key] = resolveStateBinding(binding);
            return acc;
        }, {}),
    };
};

/**
 * Process content bindings recursively
 *
 * @param {Object} content - Content configuration
 * @param {Function} resolveStateBinding - State binding resolver function
 * @returns {Object} Content with resolved state bindings
 */
export const processContentBindings = (content, resolveStateBinding) => {
    const processed = { ...content };

    // Recursively process all properties that might contain state bindings
    Object.entries(content).forEach(([key, value]) => {
        if (value && typeof value === 'object') {
            if (value.binding || value.stateBinding) {
                // This is a state binding - resolve it
                processed[key] = resolveStateBinding({
                    binding: value.binding || value.stateBinding,
                    setter: value.setter,
                });
            } else if (Array.isArray(value)) {
                // Process array items
                processed[key] = value.map(item =>
                    typeof item === 'object'
                        ? processContentBindings(item, resolveStateBinding)
                        : item
                );
            } else {
                // Process nested objects
                processed[key] = processContentBindings(value, resolveStateBinding);
            }
        }
    });

    return processed;
};

/**
 * Create a schema builder for easier schema creation
 *
 * @returns {Object} Schema builder interface
 */
export const createSchemaBuilder = () => {
    const schema = {
        state: {},
        popovers: {},
    };

    return {
        /**
         * Add state binding
         *
         * @param {string} key - State key
         * @param {string} binding - State property name
         * @param {string} [setter] - Setter function name
         */
        addState(key, binding, setter) {
            schema.state[key] = { binding, setter };
            return this;
        },

        /**
         * Add popover definition
         *
         * @param {string} key - Popover key
         * @param {Object} definition - Popover definition
         */
        addPopover(key, definition) {
            schema.popovers[key] = definition;
            return this;
        },

        /**
         * Add filter builder popover
         *
         * @param {string} key - Popover key
         * @param {Object} config - Filter builder configuration
         */
        addFilterBuilder(key, config) {
            return this.addPopover(key, {
                variant: 'default',
                className: 'popover--wide',
                trapFocus: true,
                content: {
                    type: CONTENT_TYPES.FILTER_BUILDER,
                    ...config,
                },
            });
        },

        /**
         * Add multi-select popover
         *
         * @param {string} key - Popover key
         * @param {Object} config - Multi-select configuration
         */
        addMultiSelect(key, config) {
            return this.addPopover(key, {
                variant: 'selector',
                trapFocus: true,
                content: {
                    type: CONTENT_TYPES.MULTI_SELECT,
                    ...config,
                },
            });
        },

        /**
         * Add filter hub popover
         *
         * @param {string} key - Popover key
         * @param {Object} config - Filter hub configuration
         */
        addFilterHub(key, config) {
            return this.addPopover(key, {
                variant: 'default',
                trapFocus: true,
                content: {
                    type: CONTENT_TYPES.FILTER_HUB,
                    ...config,
                },
            });
        },

        /**
         * Build and validate the schema
         *
         * @returns {Object} Schema validation result with schema property if valid
         */
        build() {
            const validation = validatePopoverSchema(schema);
            return {
                ...validation,
                schema: validation.isValid ? schema : null,
            };
        },
    };
};
