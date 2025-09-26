/**
 * SelectBase Primitive Component
 *
 * Base select element with standardized styling and behavior.
 * Used by ALL selection-based field types for consistency.
 *
 * @param {Object} props - Component props
 * @param {string} props.id - Input ID for accessibility
 * @param {string} props.name - Input name attribute
 * @param {string} props.value - Current selected value
 * @param {Function} props.onChange - Change handler
 * @param {boolean} [props.disabled=false] - Disabled state
 * @param {boolean} [props.required=false] - Required field
 * @param {boolean} [props.invalid=false] - Invalid/error state
 * @param {Array} props.options - Array of option objects {value, label, disabled?}
 * @param {string} [props.placeholder] - Placeholder text
 * @param {string} [props.className=""] - Additional CSS classes
 * @param {string} [props.ariaDescribedby] - ARIA described by
 */
import React, { useCallback } from 'react';

export const SelectBase = React.memo(
    ({
        id,
        name,
        value,
        onChange,
        disabled = false,
        required = false,
        invalid = false,
        options = [],
        placeholder,
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

        // ATOMIC UTILITY COMPOSITION - using proper form control tokens
        const selectClasses = [
            // Base styling - atomic utilities only
            'h-11 w-full', // Consistent height (44px minimum)
            'px-3 py-2', // Padding using spacing utilities
            'bg-input border border-default rounded-md',
            'text-primary',
            'appearance-none', // Remove default styling
            'transition-colors',

            // Dropdown arrow styling
            'pr-11', // Right padding for arrow

            // Focus states (atomic utilities)
            'focus:outline-none focus:border-input-focus',

            // Hover states (atomic utilities)
            !disabled && 'hover:border-primary hover:bg-input-hover',

            // Error states (atomic utilities)
            invalid && 'border-input-error',

            // Disabled states (atomic utilities)
            disabled && 'opacity-60 cursor-not-allowed bg-input-disabled border-input-disabled',

            // Cursor states
            disabled ? 'cursor-not-allowed' : 'cursor-pointer',

            className,
        ]
            .filter(Boolean)
            .join(' ');

        return (
            <div className="relative inline-block w-full">
                <select
                    id={id}
                    name={name}
                    value={value || ''}
                    onChange={handleChange}
                    disabled={disabled}
                    required={required}
                    className={selectClasses}
                    aria-describedby={ariaDescribedby}
                    aria-invalid={invalid}
                    {...rest}
                >
                    {placeholder && (
                        <option value="" disabled>
                            {placeholder}
                        </option>
                    )}
                    {options.map((option, index) => (
                        <option
                            key={option.value || index}
                            value={option.value}
                            disabled={option.disabled}
                        >
                            {option.label || option.value}
                        </option>
                    ))}
                </select>
                {/* Dropdown chevron icon using Material Design icon */}
                <span
                    className={`material-symbols-outlined absolute top-1/2 right-3 pointer-events-none transition-colors -translate-y-1/2 text-accent leading-none ${disabled ? 'text-tertiary' : 'text-secondary'}`}
                    aria-hidden="true"
                >
                    keyboard_arrow_down
                </span>
            </div>
        );
    }
);

SelectBase.displayName = 'SelectBase';
