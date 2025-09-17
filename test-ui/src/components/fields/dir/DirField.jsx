/**
 * DirField Component
 *
 * Directory selection input field component using primitive composition.
 * Provides a text input with a browse button for directory selection.
 * Supports placeholder text, validation states, and accessibility features.
 */

import React, { useCallback } from 'react';
import { FieldWrapper, FieldLabel, FieldError, FieldDescription, InputBase } from '../primitives';
import { DirectoryBrowse } from '../features/shared';

/**
 * DirField component for directory path input
 *
 * @param {Object} props - Component props
 * @param {Object} props.field - Field configuration object
 * @param {string} props.value - Current field value (directory path)
 * @param {Function} props.onChange - Value change handler
 * @param {boolean} props.disabled - Field disabled state
 * @param {boolean} props.highlightInvalid - Show validation error state
 * @param {string} props.errorMessage - Error message to display
 */
export const DirField = React.memo(
    ({
        field,
        value,
        onChange,
        disabled = false,
        highlightInvalid = false,
        errorMessage = null,
    }) => {
        const handleChange = useCallback(
            e => {
                onChange(e.target.value);
            },
            [onChange]
        );

        const handleDirectorySelect = useCallback(
            dirPath => {
                onChange(dirPath);
            },
            [onChange]
        );

        const inputId = `field-${field.key}`;

        return (
            <FieldWrapper invalid={highlightInvalid}>
                <FieldLabel htmlFor={inputId} label={field.label} required={field.required} />

                <div className="input-group">
                    <InputBase
                        id={inputId}
                        type="text"
                        name={field.key}
                        value={value || ''}
                        placeholder={field.placeholder || 'Enter directory path or click Browse...'}
                        disabled={disabled}
                        required={field.required}
                        onChange={handleChange}
                        invalid={highlightInvalid}
                        aria-describedby={`${inputId}-desc ${inputId}-error`.trim()}
                        aria-invalid={highlightInvalid}
                        className="input-group-child dir-field-display"
                    />

                    <DirectoryBrowse
                        onDirectorySelect={handleDirectorySelect}
                        disabled={disabled}
                        ariaLabel="Browse for directory"
                        buttonText="Browse..."
                        className="btn btn--dir-field btn--small inline-flex-center-both py-2 px-3 rounded-md cursor-pointer transition-fast"
                        multiple={false}
                    />
                </div>

                <FieldDescription id={`${inputId}-desc`} description={field.description} />
                <FieldError id={`${inputId}-error`} message={errorMessage} />
            </FieldWrapper>
        );
    }
);

DirField.displayName = 'DirField';

export default DirField;