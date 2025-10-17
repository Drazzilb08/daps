/**
 * ColorField Component
 * Color input field with synchronized color picker and hex text input.
 */

import React, { useCallback } from 'react';
import { FieldWrapper, FieldLabel, FieldError, FieldDescription } from '../primitives';
import { ColorInputPair } from '../features/color/ColorInputPair';

/**
 * ColorField component for single color selection
 * @param {Object} props - Component props
 * @param {Object} props.field - Field configuration object
 * @param {string} props.value - Current field value (hex color)
 * @param {Function} props.onChange - Value change handler
 * @param {boolean} props.disabled - Field disabled state
 * @param {boolean} props.highlightInvalid - Show validation error state
 * @param {string} props.errorMessage - Error message to display
 */
export const ColorField = React.memo(
    ({
        field,
        value,
        onChange,
        disabled = false,
        highlightInvalid = false,
        errorMessage = null,
    }) => {
        const handleChange = useCallback(
            newValue => {
                onChange(newValue);
            },
            [onChange]
        );

        const inputId = `field-${field.key}`;

        return (
            <FieldWrapper invalid={highlightInvalid}>
                <FieldLabel
                    id={`${inputId}-label`}
                    htmlFor={inputId}
                    label={field.label}
                    required={field.required}
                />

                <ColorInputPair
                    value={value}
                    onChange={handleChange}
                    disabled={disabled}
                    invalid={highlightInvalid}
                    baseId={inputId}
                    label={field.label}
                    placeholder={field.placeholder || '#000000'}
                    required={field.required}
                    aria-describedby={`${inputId}-desc ${inputId}-error`.trim()}
                />

                <FieldDescription id={`${inputId}-desc`} description={field.description} />
                <FieldError id={`${inputId}-error`} message={errorMessage} />
            </FieldWrapper>
        );
    }
);

ColorField.displayName = 'ColorField';

export default ColorField;
