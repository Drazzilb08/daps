/**
 * DirListOptionsField Component
 *
 * Directory list input field with mode selection dropdowns.
 * Extends DirListField functionality by adding mode selection per directory.
 * Uses DirectoryArray with modeOptions to leverage existing tools.
 */

import React, { useMemo, useCallback } from 'react';
import { FieldWrapper, FieldLabel, FieldError, FieldDescription } from '../primitives';
import { DirectoryArray } from '../features/dir';

/**
 * DirListOptionsField component for managing directories with mode selection
 *
 * @param {Object} props - Component props
 * @param {Object} props.field - Field configuration object
 * @param {Array|Object} props.value - Current field value (array of {path, mode} objects or legacy format)
 * @param {Function} props.onChange - Value change handler
 * @param {boolean} props.disabled - Field disabled state
 * @param {boolean} props.highlightInvalid - Show validation error state
 * @param {string} props.errorMessage - Error message to display
 */
export const DirListOptionsField = React.memo(
    ({
        field,
        value,
        onChange,
        disabled = false,
        highlightInvalid = false,
        errorMessage = null,
    }) => {
        // Parse value into directories and modes arrays
        const { directoriesArray, modesArray } = useMemo(() => {
            if (!value) return { directoriesArray: [''], modesArray: [''] };

            if (Array.isArray(value)) {
                // Handle array of objects: [{path: "...", mode: "..."}, ...]
                if (
                    value.length > 0 &&
                    typeof value[0] === 'object' &&
                    value[0].path !== undefined
                ) {
                    const directories = value.map(item => item.path || '');
                    const modes = value.map(item => item.mode || '');
                    return {
                        directoriesArray: directories.length > 0 ? directories : [''],
                        modesArray: modes.length > 0 ? modes : [''],
                    };
                }
                // Handle legacy array of strings (backwards compatibility)
                return {
                    directoriesArray: value.length > 0 ? value : [''],
                    modesArray: new Array(value.length || 1).fill(''),
                };
            }

            // Handle single value
            return { directoriesArray: [value], modesArray: [''] };
        }, [value]);

        // Handle directory list changes
        const handleDirectoryChange = useCallback(
            newDirectories => {
                // Ensure modes array matches directories length
                const newModes = [...modesArray];
                while (newModes.length < newDirectories.length) {
                    newModes.push(''); // Default mode for new directories
                }
                if (newModes.length > newDirectories.length) {
                    newModes.splice(newDirectories.length); // Remove excess modes
                }

                // Output as array of objects with path and mode
                const newValue = newDirectories.map((path, index) => ({
                    path: path || '',
                    mode: newModes[index] || '',
                }));

                onChange(newValue);
            },
            [modesArray, onChange]
        );

        // Handle mode selection changes
        const handleModeChange = useCallback(
            (index, newMode) => {
                const newValue = directoriesArray.map((path, i) => ({
                    path: path || '',
                    mode: i === index ? newMode : modesArray[i] || '',
                }));

                onChange(newValue);
            },
            [directoriesArray, modesArray, onChange]
        );

        const inputId = `field-${field.key}`;

        // Extract field configuration options
        const minDirectories = field.min_directories || field.minDirectories || 1;
        const label = field.label || 'Directories with Options';

        // Extract mode options from field configuration
        // Support multiple field schema formats: options, mode_options, modeOptions with stable reference
        const rawOptions = useMemo(
            () => field.options || field.mode_options || field.modeOptions || [],
            [field.options, field.mode_options, field.modeOptions]
        );

        // Convert to expected format: [{value, label}, ...]
        const modeOptions = useMemo(() => {
            if (!Array.isArray(rawOptions)) return [];

            return rawOptions.map(option => {
                // If already in object format, use as-is
                if (typeof option === 'object' && option.value !== undefined) {
                    return option;
                }
                // Convert string to {value, label} format
                return {
                    value: option,
                    label: option,
                };
            });
        }, [rawOptions]);

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
                    onChange={handleDirectoryChange}
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
                    // Mode selection props - this is what makes it different from DirListField
                    modeOptions={modeOptions}
                    modes={modesArray}
                    onModeChange={handleModeChange}
                    aria-describedby={`${inputId}-desc ${inputId}-error`.trim()}
                />

                <FieldDescription id={`${inputId}-desc`} description={field.description} />
                <FieldError id={`${inputId}-error`} message={errorMessage} />
            </FieldWrapper>
        );
    }
);

DirListOptionsField.displayName = 'DirListOptionsField';

export default DirListOptionsField;
