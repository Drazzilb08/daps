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

        const inputId = field.id || `field-${field.key}`;
        const decrementDisabled = disabled || (min !== undefined && numValue <= min);
        const incrementDisabled = disabled || (max !== undefined && numValue >= max);

        return (
            <FieldWrapper invalid={highlightInvalid}>
                <FieldLabel htmlFor={inputId} label={field.label} required={field.required} />

                <div className="flex">
                    <FieldButton
                        onClick={handleDecrement}
                        disabled={decrementDisabled}
                        ariaLabel={`Decrease ${field.label}`}
                        variant="left"
                        className="text-brand-primary"
                    >
                        <span className="material-symbols-outlined text-lg">remove</span>
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
                        className="flex-1 border-t border-b  border-default bg-input text-center"
                        aria-describedby={`${field.descId || `${inputId}-desc`} ${field.errorId || `${inputId}-error`}`.trim()}
                        aria-invalid={highlightInvalid}
                    />

                    <FieldButton
                        onClick={handleIncrement}
                        disabled={incrementDisabled}
                        ariaLabel={`Increase ${field.label}`}
                        variant="right"
                        className="text-brand-primary"
                    >
                        <span className="material-symbols-outlined text-lg">add</span>
                    </FieldButton>
                </div>

                <FieldDescription
                    id={field.descId || `${inputId}-desc`}
                    description={field.description}
                />
                <FieldError id={field.errorId || `${inputId}-error`} message={errorMessage} />
            </FieldWrapper>
        );
    }
);

NumberField.displayName = 'NumberField';
