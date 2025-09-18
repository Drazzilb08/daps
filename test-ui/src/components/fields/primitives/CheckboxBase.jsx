/**
 * CheckboxBase Primitive Component
 *
 * Base checkbox element with standardized styling and behavior.
 * Used by ALL checkbox-based field types for consistency.
 *
 * CRITICAL: This component provides a large clickable area (44px minimum)
 * for proper touch targets and accessibility compliance.
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

        const containerClasses = [
            'checkbox-container',
            disabled ? 'checkbox-field--disabled' : '',
            invalid ? 'field-input--invalid' : '',
            className,
        ]
            .filter(Boolean)
            .join(' ');

        return (
            <div className={containerClasses}>
                <input
                    id={id}
                    name={name}
                    type="checkbox"
                    checked={checked}
                    onChange={handleChange}
                    disabled={disabled}
                    required={required}
                    className="checkbox-input"
                    aria-describedby={ariaDescribedby}
                    aria-invalid={invalid}
                    {...rest}
                />

                {/* Large clickable checkbox indicator */}
                <div className="checkbox-box">
                    {checked && (
                        <svg
                            width="16"
                            height="16"
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
        );
    }
);

CheckboxBase.displayName = 'CheckboxBase';
