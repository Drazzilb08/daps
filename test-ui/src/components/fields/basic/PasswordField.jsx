import React, { useState, useCallback } from 'react';
import { FieldWrapper, FieldLabel, FieldError, FieldDescription, InputBase } from '../primitives';
import { FieldButton } from '../features/shared';
import { useOptionalFormField } from '../../forms/FormContext';

export const PasswordField = React.memo(
    ({
        field,
        value,
        onChange,
        disabled = false,
        highlightInvalid = false,
        errorMessage = null,
        onBlur,
    }) => {
        // Optional FormContext integration
        const formField = useOptionalFormField(field.key);

        // Use FormContext if available, otherwise use props
        const finalValue = formField?.value ?? value;
        const finalOnChange = formField?.onChange ?? onChange;
        const finalHighlightInvalid = formField?.highlightInvalid ?? highlightInvalid;
        const finalErrorMessage = formField?.errorMessage ?? errorMessage;
        const finalOnBlur = formField?.onBlur ?? onBlur;

        const [showPassword, setShowPassword] = useState(false);

        const handleChange = useCallback(
            e => {
                finalOnChange(e.target.value);
            },
            [finalOnChange]
        );

        const togglePasswordVisibility = useCallback(() => {
            setShowPassword(prev => !prev);
        }, []);

        const inputId = field.id || `field-${field.key}`;
        const inputValue = finalValue || '';

        return (
            <FieldWrapper invalid={finalHighlightInvalid}>
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
                        onBlur={finalOnBlur}
                        invalid={finalHighlightInvalid}
                        autoComplete="current-password"
                        aria-describedby={`${field.descId || `${inputId}-desc`} ${field.errorId || `${inputId}-error`}`.trim()}
                        aria-invalid={finalHighlightInvalid}
                        className="flex-1 border border-default bg-input rounded-l-md"
                    />

                    <FieldButton
                        onClick={togglePasswordVisibility}
                        disabled={disabled}
                        ariaLabel={showPassword ? 'Hide password' : 'Show password'}
                        variant="right"
                        className="text-brand-primary"
                    >
                        <span className="material-symbols-outlined text-lg" aria-hidden="true">
                            {showPassword ? 'visibility_off' : 'visibility'}
                        </span>
                    </FieldButton>
                </div>

                <FieldDescription
                    id={field.descId || `${inputId}-desc`}
                    description={field.description}
                />
                <FieldError id={field.errorId || `${inputId}-error`} message={finalErrorMessage} />
            </FieldWrapper>
        );
    }
);

PasswordField.displayName = 'PasswordField';

export default PasswordField;
