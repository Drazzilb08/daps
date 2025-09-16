/**
 * CheckboxBase Primitive Component
 *
 * Base checkbox element with standardized styling and behavior.
 * Used by ALL checkbox-based field types for consistency.
 *
 * @param {Object} props - Component props
 * @param {string} props.id - Input ID for accessibility
 * @param {string} props.name - Input name attribute
 * @param {boolean} props.checked - Checked state
 * @param {Function} props.onChange - Change handler
 * @param {boolean} [props.disabled=false] - Disabled state
 * @param {boolean} [props.required=false] - Required field
 * @param {boolean} [props.invalid=false] - Invalid/error state
 * @param {string} [props.className=""] - Additional CSS classes
 * @param {string} [props.ariaDescribedby] - ARIA described by
 */
import React, { useCallback } from 'react';

export const CheckboxBase = React.memo(
    ({
        id,
        name,
        checked,
        onChange,
        disabled = false,
        required = false,
        invalid = false,
        className = '',
        ariaDescribedby,
        ...rest
    }) => {
        const handleChange = useCallback(
            e => {
                onChange(e);
            },
            [onChange]
        );

        const checkboxClasses = [
            'field-checkbox-base', // Base checkbox styling
            'transition-fast',
            disabled ? 'field-disabled-state' : '',
            invalid ? 'field-input--invalid' : '',
            className,
        ]
            .filter(Boolean)
            .join(' ');

        return (
            <div className="relative inline-flex items-center">
                <input
                    id={id}
                    name={name}
                    type="checkbox"
                    checked={checked}
                    onChange={handleChange}
                    disabled={disabled}
                    required={required}
                    className="sr-only" // Hide native checkbox, use custom indicator
                    aria-describedby={ariaDescribedby}
                    aria-invalid={invalid}
                    {...rest}
                />

                {/* Custom checkbox indicator */}
                <div className={checkboxClasses}>
                    <div className="checkbox-field__indicator field-base">
                        {checked && (
                            <svg
                                width="12"
                                height="12"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                                aria-hidden="true"
                            >
                                <polyline points="20,6 9,17 4,12" />
                            </svg>
                        )}
                    </div>
                </div>
            </div>
        );
    }
);

CheckboxBase.displayName = 'CheckboxBase';
