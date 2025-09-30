/**
 * DirField Component
 *
 * Directory selection input field component using primitive composition.
 * Provides a clickable read-only text input for directory selection.
 * Supports placeholder text, validation states, and accessibility features.
 */

import React, { useCallback } from 'react';
import { FieldWrapper, FieldLabel, FieldError, FieldDescription, InputBase } from '../primitives';

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
    ({ field, value, disabled = false, highlightInvalid = false, errorMessage = null }) => {
        const handleInputClick = useCallback(() => {
            if (!disabled) {
                // Placeholder functionality - show info about future modal implementation
                alert(
                    '🚧 Directory Browser Modal\n\nThis will open a modal to browse and select a directory when the modal system is implemented.'
                );
            }
        }, [disabled]);

        const inputId = `field-${field.key}`;

        return (
            <FieldWrapper invalid={highlightInvalid}>
                <FieldLabel htmlFor={inputId} label={field.label} required={field.required} />

                <InputBase
                    id={inputId}
                    type="text"
                    name={field.key}
                    value={value || ''}
                    placeholder={field.placeholder || 'Click to select directory...'}
                    disabled={disabled}
                    required={field.required}
                    readOnly={true}
                    onClick={handleInputClick}
                    invalid={highlightInvalid}
                    aria-describedby={`${inputId}-desc ${inputId}-error`.trim()}
                    aria-invalid={highlightInvalid}
                    className={disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
                />

                <FieldDescription id={`${inputId}-desc`} description={field.description} />
                <FieldError id={`${inputId}-error`} message={errorMessage} />
            </FieldWrapper>
        );
    }
);

DirField.displayName = 'DirField';

export default DirField;
