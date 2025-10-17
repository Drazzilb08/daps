/**
 * TextareaField Component
 *
 * Multi-line text input field using primitive composition.
 */

import React, { useCallback } from 'react';
import {
    FieldWrapper,
    FieldLabel,
    FieldError,
    FieldDescription,
    TextareaBase,
} from '../primitives';
import { useOptionalFormField } from '../../forms/FormContext';

export const TextareaField = React.memo(
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
        const handleChange = useCallback(
            e => {
                finalOnChange(e.target.value);
            },
            [finalOnChange]
        );

        const inputId = field.id || `field-${field.key}`;

        return (
            <FieldWrapper invalid={finalHighlightInvalid}>
                <FieldLabel htmlFor={inputId} label={field.label} required={field.required} />
                <TextareaBase
                    id={inputId}
                    name={field.key}
                    value={finalValue || ''}
                    placeholder={field.placeholder}
                    disabled={disabled}
                    required={field.required}
                    maxLength={field.maxLength}
                    minLength={field.minLength}
                    rows={field.rows || 4}
                    onChange={handleChange}
                    onBlur={finalOnBlur}
                    invalid={finalHighlightInvalid}
                    aria-describedby={`${field.descId || `${inputId}-desc`} ${field.errorId || `${inputId}-error`}`.trim()}
                    aria-invalid={finalHighlightInvalid}
                />
                <FieldDescription
                    id={field.descId || `${inputId}-desc`}
                    description={field.description}
                />
                <FieldError id={field.errorId || `${inputId}-error`} message={finalErrorMessage} />
            </FieldWrapper>
        );
    }
);

TextareaField.displayName = 'TextareaField';
