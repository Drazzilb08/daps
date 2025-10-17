/**
 * ColorListField Component
 * Multiple color input field component for simple color lists.
 */

import React, { useCallback, useMemo } from 'react';
import { FieldWrapper, FieldLabel, FieldError, FieldDescription } from '../primitives';
import { ColorArray } from '../features/color/ColorArray';

/**
 * ColorListField component for multiple color selection
 *
 * Simple color list field.
 * Uses the ColorArray feature component for consistent color management.
 *
 * @param {Object} props - Component props
 * @param {Object} props.field - Field configuration object
 * @param {string[]|string} props.value - Current field value (array of hex colors or comma-separated string)
 * @param {Function} props.onChange - Value change handler
 * @param {boolean} props.disabled - Field disabled state
 * @param {boolean} props.highlightInvalid - Show validation error state
 * @param {string} props.errorMessage - Error message to display
 */
export const ColorListField = React.memo(
    ({
        field,
        value,
        onChange,
        disabled = false,
        highlightInvalid = false,
        errorMessage = null,
    }) => {
        // Convert value to array format (handle both array and string inputs)
        const colorsArray = useMemo(() => {
            if (!value) return [];
            if (Array.isArray(value)) return value;
            if (typeof value === 'string') {
                return value
                    .split(',')
                    .map(color => color.trim())
                    .filter(Boolean);
            }
            return [];
        }, [value]);

        // Handle color list changes with proper output format
        const handleChange = useCallback(
            newColors => {
                // Field configuration determines output format
                const outputFormat = field.output_format || 'array';

                if (outputFormat === 'string' || outputFormat === 'comma_separated') {
                    // Output as comma-separated string
                    onChange(newColors.join(', '));
                } else {
                    // Output as array (default)
                    onChange(newColors);
                }
            },
            [onChange, field.output_format]
        );

        const inputId = `field-${field.key}`;

        // Extract field configuration options
        const maxColors = field.max_colors || field.maxColors || 10;
        const minColors = field.min_colors || field.minColors || 0;
        const label = field.label || 'Colors';

        return (
            <FieldWrapper invalid={highlightInvalid}>
                <FieldLabel
                    id={`${inputId}-label`}
                    htmlFor={inputId}
                    label={label}
                    required={field.required}
                />

                <ColorArray
                    colors={colorsArray}
                    onChange={handleChange}
                    disabled={disabled}
                    invalid={highlightInvalid}
                    baseId={inputId}
                    label={label}
                    maxColors={maxColors}
                    minColors={minColors}
                    addButtonText={field.add_button_text || 'Add Color'}
                    removeButtonText={field.remove_button_text || 'Remove'}
                    emptyMessage={field.empty_message || 'No colors added yet.'}
                    emptySecondaryMessage={
                        field.empty_secondary_message || 'Click "Add Color" to get started.'
                    }
                    aria-describedby={`${inputId}-desc ${inputId}-error`.trim()}
                />

                <FieldDescription id={`${inputId}-desc`} description={field.description} />
                <FieldError id={`${inputId}-error`} message={errorMessage} />
            </FieldWrapper>
        );
    }
);

ColorListField.displayName = 'ColorListField';

export default ColorListField;
