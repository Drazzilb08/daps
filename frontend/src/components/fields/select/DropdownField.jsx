/**
 * DropdownField Component
 *
 * Dropdown/select field using primitive composition.
 * Supports validation states, accessibility features, and custom styling.
 */

import React, { useCallback, useMemo } from 'react';
import { FieldWrapper, FieldLabel, FieldError, FieldDescription, SelectBase } from '../primitives';

/**
 * DropdownField component for select input
 *
 * @param {Object} props - Component props
 * @param {Object} props.field - Field configuration object
 * @param {string} props.value - Current field value
 * @param {Function} props.onChange - Value change handler
 * @param {boolean} props.disabled - Field disabled state
 * @param {boolean} props.highlightInvalid - Show validation error state
 * @param {string} props.errorMessage - Error message to display
 */
export const DropdownField = React.memo(
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
        const inputValue = value || '';

        // Transform options to SelectBase format
        const options = useMemo(() => {
            if (!field.options) return [];
            return field.options.map(option => {
                if (typeof option === 'string') {
                    return { value: option, label: option };
                }
                return {
                    value: option.value,
                    label: option.label || option.value,
                    disabled: option.disabled,
                };
            });
        }, [field.options]);

        return (
            <FieldWrapper invalid={highlightInvalid}>
                <FieldLabel htmlFor={inputId} label={field.label} required={field.required} />

                <SelectBase
                    id={inputId}
                    name={field.key}
                    value={inputValue}
                    onChange={handleChange}
                    disabled={disabled}
                    required={field.required}
                    invalid={highlightInvalid}
                    options={options}
                    placeholder={field.placeholder || 'Select an option...'}
                    ariaDescribedby={`${inputId}-desc ${inputId}-error`.trim()}
                />

                <FieldDescription id={`${inputId}-desc`} description={field.description} />
                <FieldError id={`${inputId}-error`} message={errorMessage} />
            </FieldWrapper>
        );
    }
);

DropdownField.displayName = 'DropdownField';
