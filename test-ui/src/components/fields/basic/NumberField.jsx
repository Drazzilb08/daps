/**
 * NumberField Component
 *
 * Number input field with +/- buttons using primitive composition.
 * Prevents text input and forces button-only interaction for better UX.
 */

import React, { useCallback } from 'react';
import { FieldWrapper, FieldLabel, FieldError, FieldDescription, InputBase } from '../primitives';
import { FieldButton } from '../features/shared';

export const NumberField = React.memo(
    ({
        field,
        value,
        onChange,
        disabled = false,
        highlightInvalid = false,
        errorMessage = null,
    }) => {
        const numValue = value !== null && value !== undefined ? Number(value) : 0;
        const step = field.step || 1;
        const min = field.min !== undefined ? Number(field.min) : undefined;
        const max = field.max !== undefined ? Number(field.max) : undefined;

        const handleInputChange = useCallback(
            e => {
                const inputValue = e.target.value;

                // Allow empty string, digits, decimal point, and minus sign
                if (inputValue === '' || /^-?\d*\.?\d*$/.test(inputValue)) {
                    // If it's a valid number, convert and validate bounds
                    if (inputValue !== '' && !isNaN(inputValue)) {
                        const newValue = Number(inputValue);
                        if (min !== undefined && newValue < min) return;
                        if (max !== undefined && newValue > max) return;
                        onChange(newValue);
                    } else if (inputValue === '') {
                        onChange(null);
                    } else {
                        // Allow partial input (like "-" or "1." while typing)
                        onChange(inputValue);
                    }
                }
            },
            [min, max, onChange]
        );

        const handleDecrement = useCallback(() => {
            const newValue = numValue - step;
            if (min !== undefined && newValue < min) return;
            onChange(newValue);
        }, [numValue, step, min, onChange]);

        const handleIncrement = useCallback(() => {
            const newValue = numValue + step;
            if (max !== undefined && newValue > max) return;
            onChange(newValue);
        }, [numValue, step, max, onChange]);

        const inputId = `field-${field.key}`;
        const decrementDisabled = disabled || (min !== undefined && numValue <= min);
        const incrementDisabled = disabled || (max !== undefined && numValue >= max);

        return (
            <FieldWrapper invalid={highlightInvalid}>
                <FieldLabel htmlFor={inputId} label={field.label} required={field.required} />

                <div className="input-group">
                    <FieldButton
                        onClick={handleDecrement}
                        disabled={decrementDisabled}
                        ariaLabel={`Decrease ${field.label}`}
                        className="btn btn--number-field btn--number-field-left btn--small inline-flex-center-both py-2 px-3 rounded-md cursor-pointer transition-fast"
                    >
                        −
                    </FieldButton>

                    <InputBase
                        id={inputId}
                        type="text"
                        name={field.key}
                        value={typeof value === 'string' ? value : numValue || ''}
                        onChange={handleInputChange}
                        disabled={disabled}
                        required={field.required}
                        placeholder={field.placeholder}
                        invalid={highlightInvalid}
                        className="input-group-child flex-1 number-field-display"
                        aria-describedby={`${inputId}-desc ${inputId}-error`.trim()}
                        aria-invalid={highlightInvalid}
                    />

                    <FieldButton
                        onClick={handleIncrement}
                        disabled={incrementDisabled}
                        ariaLabel={`Increase ${field.label}`}
                        className="btn btn--number-field btn--number-field-right btn--small inline-flex-center-both py-2 px-3 rounded-md cursor-pointer transition-fast"
                    >
                        +
                    </FieldButton>
                </div>

                <FieldDescription id={`${inputId}-desc`} description={field.description} />
                <FieldError id={`${inputId}-error`} message={errorMessage} />
            </FieldWrapper>
        );
    }
);

NumberField.displayName = 'NumberField';
