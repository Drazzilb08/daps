/**
 * PasswordField Component
 *
 * Password input field with show/hide toggle using primitive composition.
 * Follows standard field interface with additional security considerations.
 */

import React, { useState, useCallback } from 'react';
import { FieldWrapper, FieldLabel, FieldError, FieldDescription, InputBase } from '../primitives';
import { FieldButton } from '../features/shared';

/**
 * PasswordField component for password input
 *
 * @param {Object} props - Component props
 * @param {Object} props.field - Field configuration object
 * @param {string} props.value - Current field value
 * @param {Function} props.onChange - Value change handler
 * @param {boolean} props.disabled - Field disabled state
 * @param {boolean} props.highlightInvalid - Show validation error state
 * @param {string} props.errorMessage - Error message to display
 */
export const PasswordField = React.memo(
    ({
        field,
        value,
        onChange,
        disabled = false,
        highlightInvalid = false,
        errorMessage = null,
    }) => {
        const [showPassword, setShowPassword] = useState(false);

        const handleChange = useCallback(
            e => {
                onChange(e.target.value);
            },
            [onChange]
        );

        const togglePasswordVisibility = useCallback(() => {
            setShowPassword(prev => !prev);
        }, []);

        const inputId = `field-${field.key}`;
        const inputValue = value || '';

        return (
            <FieldWrapper invalid={highlightInvalid}>
                <FieldLabel htmlFor={inputId} label={field.label} required={field.required} />

                <div className="flex">
                    <InputBase
                        id={inputId}
                        type={showPassword ? 'text' : 'password'}
                        name={field.key}
                        value={inputValue}
                        placeholder={field.placeholder}
                        disabled={disabled}
                        required={field.required}
                        maxLength={field.maxLength}
                        minLength={field.minLength}
                        onChange={handleChange}
                        invalid={highlightInvalid}
                        autoComplete="current-password"
                        aria-describedby={`${inputId}-desc ${inputId}-error`.trim()}
                        aria-invalid={highlightInvalid}
                        className="flex-1 border border-r-0 border-input bg-input rounded-l-md"
                    />

                    <FieldButton
                        onClick={togglePasswordVisibility}
                        disabled={disabled}
                        ariaLabel={showPassword ? 'Hide password' : 'Show password'}
                        variant="right"
                    >
                        <span
                            className="material-symbols-outlined text-accent text-base leading-none"
                            aria-hidden="true"
                        >
                            {showPassword ? 'visibility_off' : 'visibility'}
                        </span>
                    </FieldButton>
                </div>

                <FieldDescription id={`${inputId}-desc`} description={field.description} />
                <FieldError id={`${inputId}-error`} message={errorMessage} />
            </FieldWrapper>
        );
    }
);

PasswordField.displayName = 'PasswordField';

export default PasswordField;
