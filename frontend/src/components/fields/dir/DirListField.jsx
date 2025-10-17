/**
 * DirListField Component
 *
 * Directory list input field component using primitive composition.
 * Uses DirectoryArray for consistent directory management patterns.
 * Supports placeholder text, validation states, and accessibility features.
 */

import React, { useMemo, useCallback } from 'react';
import { FieldWrapper, FieldLabel, FieldError, FieldDescription } from '../primitives';
import { DirectoryArray } from '../features/dir';

/**
 * DirListField component for managing a list of directory paths
 *
 * @param {Object} props - Component props
 * @param {Object} props.field - Field configuration object
 * @param {Array|string} props.value - Current field value (array of directory paths or single path)
 * @param {Function} props.onChange - Value change handler
 * @param {boolean} props.disabled - Field disabled state
 * @param {boolean} props.highlightInvalid - Show validation error state
 * @param {string} props.errorMessage - Error message to display
 */
export const DirListField = React.memo(
    ({
        field,
        value,
        onChange,
        disabled = false,
        highlightInvalid = false,
        errorMessage = null,
    }) => {
        // Convert value to array format, ensuring at least one empty entry for initial state
        const directoriesArray = useMemo(() => {
            if (!value) return [''];
            if (Array.isArray(value)) {
                return value.length > 0 ? value : [''];
            }
            return [value];
        }, [value]);

        // Handle directory list changes with proper output format
        const handleChange = useCallback(
            newDirectories => {
                // Field configuration determines output format
                const outputFormat = field.output_format || 'array';

                if (outputFormat === 'string' || outputFormat === 'comma_separated') {
                    // Output as comma-separated string
                    onChange(newDirectories.join(', '));
                } else {
                    // Output as array (default)
                    onChange(newDirectories);
                }
            },
            [onChange, field.output_format]
        );

        const inputId = `field-${field.key}`;

        // Extract field configuration options
        const minDirectories = field.min_directories || field.minDirectories || 1; // Default to 1 for dir lists
        const label = field.label || 'Directories';

        return (
            <FieldWrapper invalid={highlightInvalid}>
                <FieldLabel
                    id={`${inputId}-label`}
                    htmlFor={inputId}
                    label={label}
                    required={field.required}
                />

                <DirectoryArray
                    directories={directoriesArray}
                    onChange={handleChange}
                    disabled={disabled}
                    invalid={highlightInvalid}
                    baseId={inputId}
                    label={label.toLowerCase()}
                    minDirectories={minDirectories}
                    addButtonText={field.add_button_text || 'Add Directory'}
                    removeButtonText={field.remove_button_text || 'Remove'}
                    placeholder={field.placeholder || 'Click to select directory...'}
                    emptyMessage={field.empty_message || 'No directories added yet.'}
                    emptySecondaryMessage={
                        field.empty_secondary_message || 'Click "Add Directory" to get started.'
                    }
                    aria-describedby={`${inputId}-desc ${inputId}-error`.trim()}
                />

                <FieldDescription id={`${inputId}-desc`} description={field.description} />
                <FieldError id={`${inputId}-error`} message={errorMessage} />
            </FieldWrapper>
        );
    }
);

DirListField.displayName = 'DirListField';

export default DirListField;
