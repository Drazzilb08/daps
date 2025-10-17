/**
 * TagInputField - Form integration for tag input system
 *
 * Provides primitive composition following test-ui patterns with standard
 * field interface. Handles both tag_input and tag_display via configuration.
 *
 * Field Types Supported:
 * - tag_input: Full editing capabilities with add/remove (primary color)
 * - tag_display: Display-only mode (accent color)
 *
 * Configuration Mapping:
 * - field.suggestions → TagInput suggestions (array or function)
 * - field.allowCustom → TagInput allowCustom (default: true)
 * - field.placeholder → TagInput placeholder
 * - field.maxItems → TagInput maxItems
 * - field.caseSensitive → TagInput caseSensitive (default: false)
 */

import React, { useCallback } from 'react';
import { FieldWrapper, FieldLabel, FieldError, FieldDescription } from '../primitives';
import { TagInput } from '../features/tag/TagInput';

/**
 * TagInputField component for form integration of tag input system
 *
 * @param {Object} field - Field configuration object from schema
 * @param {string|string[]} value - Current field value (array of strings)
 * @param {Function} onChange - Value change handler (value) => void
 * @param {boolean} disabled - Field disabled state
 * @param {boolean} highlightInvalid - Show validation error state
 * @param {string} errorMessage - Error message to display
 */
export const TagInputField = React.memo(
    ({
        field,
        value,
        onChange,
        disabled = false,
        highlightInvalid = false,
        errorMessage = null,
    }) => {
        // Handle both string and array values gracefully
        const normalizedValue = React.useMemo(() => {
            if (Array.isArray(value)) return value;
            if (typeof value === 'string') {
                // Handle comma-separated string values
                return value
                    ? value
                          .split(',')
                          .map(item => item.trim())
                          .filter(Boolean)
                    : [];
            }
            return [];
        }, [value]);

        // Standard onChange handler following field patterns
        const handleItemsChange = useCallback(
            newItems => {
                onChange(newItems);
            },
            [onChange]
        );

        // Field ID generation following test-ui patterns
        const inputId = `field-${field.key}`;

        // Determine field behavior based on type and disabled state
        const isTagDisplay = field.type === 'tag_display';
        const isDisplayMode = disabled || field.disabled || isTagDisplay;

        // Map field configuration to TagInput props
        const tagInputProps = {
            items: normalizedValue,
            onItemsChange: handleItemsChange,
            suggestions: field.suggestions || [],
            allowCustom: field.allowCustom ?? true,
            placeholder: field.placeholder || 'Add item...',
            disabled: isDisplayMode,
            maxItems: field.maxItems,
            caseSensitive: field.caseSensitive ?? false,

            // Validation function from field config
            validateItem: field.validateItem,

            // Custom filter function from field config
            filterFunction: field.filterFunction,

            // Badge configuration with field-type specific colors
            badgeProps: {
                variant: isTagDisplay ? 'accent' : 'interactive',
                size: 'medium',
                ...field.badgeProps, // Allow field-level badge customization
            },

            // Accessibility labels
            addLabel: field.addLabel || `Add ${field.itemType || 'item'}`,
            removeLabel: field.removeLabel || `Remove ${field.itemType || 'item'}`,

            // ARIA integration with field primitives
            'aria-describedby': `${inputId}-desc ${inputId}-error`.trim(),
            'aria-invalid': highlightInvalid,
            'aria-labelledby': `${inputId}-label`,
        };

        return (
            <FieldWrapper invalid={highlightInvalid}>
                <FieldLabel
                    id={`${inputId}-label`}
                    htmlFor={inputId}
                    label={field.label}
                    required={field.required}
                />

                <TagInput
                    {...tagInputProps}
                    // Additional props for proper form integration
                    id={inputId}
                    name={field.key}
                />

                <FieldDescription id={`${inputId}-desc`} description={field.description} />
                <FieldError id={`${inputId}-error`} message={errorMessage} />
            </FieldWrapper>
        );
    }
);

TagInputField.displayName = 'TagInputField';

export default TagInputField;
