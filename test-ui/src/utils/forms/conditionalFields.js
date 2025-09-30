/**
 * Conditional Field Utilities
 * Provides evaluation functions for schema-driven conditional field rendering
 */

/**
 * Supported condition types for field evaluation
 */
const CONDITION_TYPES = {
    instance_type_equals: (selectedValue, targetValue, apiData) => {
        console.log('[conditionalFields] Evaluating instance_type_equals:', {
            selectedValue,
            targetValue,
            instanceType: getInstanceType(selectedValue, apiData),
        });
        const instanceType = getInstanceType(selectedValue, apiData);
        return instanceType === targetValue;
    },
    equals: (selectedValue, targetValue) => {
        console.log('[conditionalFields] Evaluating equals:', { selectedValue, targetValue });
        return selectedValue === targetValue;
    },
    not_equals: (selectedValue, targetValue) => {
        console.log('[conditionalFields] Evaluating not_equals:', { selectedValue, targetValue });
        return selectedValue !== targetValue;
    },
    in: (selectedValue, targetValues) => {
        console.log('[conditionalFields] Evaluating in:', { selectedValue, targetValues });
        return Array.isArray(targetValues) && targetValues.includes(selectedValue);
    },
    not_in: (selectedValue, targetValues) => {
        console.log('[conditionalFields] Evaluating not_in:', { selectedValue, targetValues });
        return Array.isArray(targetValues) && !targetValues.includes(selectedValue);
    },
};

/**
 * Evaluate if a field should be visible based on conditional schema
 * @param {Object} field - Field schema with conditional properties
 * @param {Object} formData - Current form data values
 * @param {Object} apiData - API data for lookups (instances, etc.)
 * @returns {boolean} - Whether field should be shown
 */
export const shouldShowField = (field, formData, apiData = {}) => {
    console.log('[conditionalFields] Evaluating field visibility:', {
        fieldKey: field.key,
        fieldType: field.type,
        hasConditional: !!field.conditional,
        hasLegacyCondition: !!field.show_if_instance_type,
        formData: Object.keys(formData || {}),
        apiDataKeys: Object.keys(apiData),
    });

    // Handle new conditional format
    if (field.conditional) {
        const { field: dependentField, condition, value, api_lookup } = field.conditional;
        const selectedValue = formData[dependentField];
        const lookupData = api_lookup ? apiData[api_lookup] : null;

        console.log('[conditionalFields] Processing conditional field:', {
            dependentField,
            condition,
            value,
            selectedValue,
            api_lookup,
            hasLookupData: !!lookupData,
        });

        const evaluator = CONDITION_TYPES[condition];
        if (evaluator) {
            const result = evaluator(selectedValue, value, lookupData);
            console.log('[conditionalFields] Conditional evaluation result:', result);
            return result;
        } else {
            console.warn('[conditionalFields] Unknown condition type:', condition);
            return true;
        }
    }

    // Handle legacy format for backward compatibility
    if (field.show_if_instance_type) {
        const instanceField = field.instance_field || 'instance';
        const selectedInstance = formData[instanceField];
        const instanceType = getInstanceType(selectedInstance, apiData.instances);

        console.log('[conditionalFields] Processing legacy show_if_instance_type:', {
            instanceField,
            selectedInstance,
            instanceType,
            targetType: field.show_if_instance_type,
        });

        const result = instanceType === field.show_if_instance_type;
        console.log('[conditionalFields] Legacy evaluation result:', result);
        return result;
    }

    // Show by default if no conditions
    console.log('[conditionalFields] No conditions found, showing field by default');
    return true;
};

/**
 * Get instance type from instance name using API data
 * @param {string} instanceName - Selected instance name
 * @param {Object} instancesData - API response data structure
 * @returns {string|null} - Instance type (radarr, sonarr, plex) or null
 */
export const getInstanceType = (instanceName, instancesData) => {
    console.log('[conditionalFields] Looking up instance type:', {
        instanceName,
        hasInstancesData: !!instancesData,
        instancesDataKeys: instancesData ? Object.keys(instancesData) : [],
    });

    if (!instanceName || !instancesData) {
        console.log('[conditionalFields] Missing instanceName or instancesData');
        return null;
    }

    for (const [serviceType, instances] of Object.entries(instancesData)) {
        if (instances && typeof instances === 'object') {
            if (instances.hasOwnProperty(instanceName)) {
                console.log('[conditionalFields] Found instance type:', {
                    instanceName,
                    serviceType,
                });
                return serviceType;
            }
        }
    }

    console.log('[conditionalFields] Instance type not found for:', instanceName);
    return null;
};

/**
 * Generate dropdown options from instances API data
 * @param {Object} instancesData - API response data
 * @param {Array} allowedTypes - Array of allowed service types
 * @param {boolean} includePlaceholder - Whether to include placeholder as first option (default: true for backwards compatibility)
 * @returns {Array} - Dropdown options array
 */
export const generateInstanceOptions = (
    instancesData,
    allowedTypes = [],
    includePlaceholder = true
) => {
    console.log('[conditionalFields] Generating instance options:', {
        hasInstancesData: !!instancesData,
        allowedTypes,
        includePlaceholder,
        instancesDataKeys: instancesData ? Object.keys(instancesData) : [],
    });

    const options = includePlaceholder ? [{ value: '', label: '— Select instance... —' }] : [];

    if (!instancesData) {
        console.log('[conditionalFields] No instances data available');
        return options;
    }

    let generatedCount = 0;
    allowedTypes.forEach(serviceType => {
        const serviceInstances = instancesData[serviceType] || {};
        const instanceNames = Object.keys(serviceInstances);

        console.log('[conditionalFields] Processing service type:', {
            serviceType,
            instanceCount: instanceNames.length,
            instanceNames,
        });

        instanceNames.forEach(instanceName => {
            // Remove service type prefix and enhance humanization
            const cleanInstanceName = removeServicePrefix(instanceName, serviceType);
            const humanizedInstanceName = enhancedHumanize(cleanInstanceName);

            const option = {
                value: instanceName,
                label: `${humanize(serviceType)} ${humanizedInstanceName}`,
                instanceType: serviceType,
                serviceType: serviceType,
            };
            options.push(option);
            generatedCount++;

            console.log('[conditionalFields] Generated option:', option);
        });
    });

    console.log('[conditionalFields] Generated total options:', {
        totalCount: options.length,
        generatedCount,
        finalOptions: options,
    });

    return options;
};

/**
 * Humanize service type names for display
 * @param {string} text - Text to humanize
 * @returns {string} - Humanized text
 */
export const humanize = text => {
    if (!text) return '';
    return text.charAt(0).toUpperCase() + text.slice(1);
};

/**
 * Remove service type prefix from instance name to eliminate redundancy
 * @param {string} instanceName - Original instance name
 * @param {string} serviceType - Service type (radarr, sonarr, plex)
 * @returns {string} - Instance name with service prefix removed
 */
export const removeServicePrefix = (instanceName, serviceType) => {
    if (!instanceName || !serviceType) return instanceName || '';

    const lowerInstanceName = instanceName.toLowerCase();
    const lowerServiceType = serviceType.toLowerCase();

    // Check if instance name starts with service type
    if (lowerInstanceName.startsWith(lowerServiceType)) {
        // Remove the prefix and any following underscore or dash
        let cleaned = instanceName.substring(serviceType.length);

        // Remove leading separators (underscore, dash, or space)
        cleaned = cleaned.replace(/^[_\-\s]+/, '');

        // If nothing remains after removing prefix, return original name
        return cleaned || instanceName;
    }

    return instanceName;
};

/**
 * Enhanced humanization with better formatting rules
 * @param {string} text - Text to humanize
 * @returns {string} - Enhanced humanized text
 */
export const enhancedHumanize = text => {
    if (!text) return '';

    // Handle common patterns
    let result = text;

    // Replace underscores with spaces
    result = result.replace(/_/g, ' ');

    // Replace dashes with spaces
    result = result.replace(/-/g, ' ');

    // Split into words and process each
    const words = result.split(/\s+/).filter(word => word.length > 0);

    return words
        .map(word => {
            const lowerWord = word.toLowerCase();

            // Special case handling
            switch (lowerWord) {
                case '4k':
                    return '4K';
                case 'hd':
                    return 'HD';
                case 'anime':
                    return 'Anime';
                case 'test':
                    return 'Test';
                default:
                    // Standard capitalization
                    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
            }
        })
        .join(' ');
};

/**
 * Debug helper to log conditional field evaluation context
 * @param {string} context - Context description
 * @param {Object} data - Data to log
 */
export const logConditionalContext = (context, data) => {
    console.log(`[conditionalFields] ${context}:`, data);
};
