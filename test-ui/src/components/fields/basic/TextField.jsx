
import React, { useCallback } from 'react';
import { FieldWrapper, FieldLabel, FieldError, FieldDescription, InputBase } from '../primitives';

export const TextField = React.memo(
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

        const inputId = field.id || `field-${field.key}`;

        return (
            <FieldWrapper invalid={highlightInvalid}>
                <FieldLabel htmlFor={inputId} label={field.label} required={field.required} />
                <InputBase
                    id={inputId}
                    type="text"
                    name={field.key}
                    value={value || ''}
                    placeholder={field.placeholder}
                    disabled={disabled}
                    required={field.required}
                    maxLength={field.maxLength}
                    minLength={field.minLength}
                    pattern={field.pattern}
                    onChange={handleChange}
                    invalid={highlightInvalid}
                    aria-describedby={`${field.descId || `${inputId}-desc`} ${field.errorId || `${inputId}-error`}`.trim()}
                    aria-invalid={highlightInvalid}
                />
                <FieldDescription id={field.descId || `${inputId}-desc`} description={field.description} />
                <FieldError id={field.errorId || `${inputId}-error`} message={errorMessage} />
            </FieldWrapper>
        );
    }
);

TextField.displayName = 'TextField';

export default TextField;
