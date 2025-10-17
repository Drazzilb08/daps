/**
 * CheckboxField Component
 *
 * ENTIRE FIELD IS CLICKABLE - provides excellent UX
 * The full field area (including label and description) toggles the checkbox
 * Uses design tokens exclusively, no hardcoded values
 */

import React, { useCallback } from 'react';
import {
    FieldWrapper,
    FieldLabel,
    FieldError,
    FieldDescription,
    CheckboxBase,
} from '../primitives';

/**
 * CheckboxField component for boolean input
 *
 * @param {Object} props - Component props
 * @param {Object} props.field - Field configuration object
 * @param {boolean} props.value - Current field value
 * @param {Function} props.onChange - Value change handler
 * @param {boolean} props.disabled - Field disabled state
 * @param {boolean} props.highlightInvalid - Show validation error state
 * @param {string} props.errorMessage - Error message to display
 */
export const CheckboxField = React.memo(
    ({
        field,
        value,
        onChange,
        disabled = false,
        highlightInvalid = false,
        errorMessage = null,
    }) => {
        const handleContainerClick = useCallback(
            e => {
                // Don't handle click if it came from the label or checkbox input
                // This allows native label-checkbox association to work properly
                if (disabled) return;
                if (e.target.tagName === 'LABEL' || e.target.tagName === 'INPUT') return;

                onChange(!value);
            },
            [onChange, value, disabled]
        );

        const handleCheckboxChange = useCallback(
            e => {
                if (disabled) return;
                onChange(e.target.checked);
            },
            [onChange, disabled]
        );

        const inputId = field.id || `field-${field.key}`;
        const isChecked = Boolean(value);

        return (
            <FieldWrapper invalid={highlightInvalid}>
                {/* ENTIRE AREA IS CLICKABLE */}
                <div
                    className="flex items-center gap-3 py-2 px-3 bg-surface border rounded-md hover:bg-surface-hover focus:border-primary cursor-pointer transition-colors duration-200 ease-in-out"
                    onClick={handleContainerClick}
                    role="button"
                    tabIndex={disabled ? -1 : 0}
                    onKeyDown={e => {
                        if ((e.key === ' ' || e.key === 'Enter') && !disabled) {
                            e.preventDefault();
                            onChange(!value);
                        }
                    }}
                    aria-pressed={isChecked}
                    aria-disabled={disabled}
                    aria-describedby={
                        errorMessage ? field.errorId || `${inputId}-error` : undefined
                    }
                >
                    {/* Use existing CheckboxBase primitive - WRITE ONCE, USE EVERYWHERE */}
                    <CheckboxBase
                        id={inputId}
                        name={field.key}
                        checked={isChecked}
                        onChange={handleCheckboxChange}
                        disabled={disabled}
                        required={field.required}
                        invalid={highlightInvalid}
                        ariaDescribedby={
                            errorMessage ? field.errorId || `${inputId}-error` : undefined
                        }
                    />

                    {/* Field content */}
                    <div className="flex-1">
                        <FieldLabel
                            htmlFor={inputId}
                            label={field.label}
                            required={field.required}
                            className="text-sm font-normal leading-normal text-primary cursor-pointer select-none"
                        />

                        {field.description && (
                            <FieldDescription
                                id={field.descId || `${inputId}-desc`}
                                description={field.description}
                            />
                        )}
                    </div>
                </div>

                {errorMessage && (
                    <FieldError id={field.errorId || `${inputId}-error`} message={errorMessage} />
                )}
            </FieldWrapper>
        );
    }
);

CheckboxField.displayName = 'CheckboxField';

export default CheckboxField;
