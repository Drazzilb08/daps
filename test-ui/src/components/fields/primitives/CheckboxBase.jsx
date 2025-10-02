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
            'relative flex items-center touch-target cursor-pointer',
            disabled ? 'cursor-not-allowed' : '',
            invalid ? 'text-error' : '',
            className,
        ]
            .filter(Boolean)
            .join(' ');

        const indicatorClasses = [
            'relative flex items-center justify-center',
            'w-4 h-4',
            'border rounded-sm',
            'transition-colors transition-fast',
            'cursor-pointer shrink-0',
            checked ? 'bg-primary border-primary text-white' : 'bg-white border-default',
            !disabled && !checked && 'hover:border-primary',
            !disabled && checked && 'hover:bg-primary',
            'focus-within:border-primary',
            invalid && !checked && 'border-error',
            invalid && 'focus-within:border-error',
            disabled && 'opacity-60 cursor-not-allowed pointer-events-none',
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
                    className="sr-only"
                    aria-describedby={ariaDescribedby}
                    aria-invalid={invalid}
                    {...rest}
                />

                <div className={indicatorClasses}>
                    <svg
                        className={[
                            'w-3 h-3',
                            'stroke-current stroke-2',
                            'fill-none',
                            'transition-all',
                            checked ? 'opacity-100 scale-100' : 'opacity-0 scale-75',
                        ]
                            .filter(Boolean)
                            .join(' ')}
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                    >
                        <polyline points="20,6 9,17 4,12" />
                    </svg>
                </div>
            </div>
        );
    }
);

CheckboxBase.displayName = 'CheckboxBase';
