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

        // ATOMIC UTILITY COMPOSITION - replaces compositional classes
        const selectClasses = [
            // Base styling - atomic utilities only
            'h-11 w-full', // Consistent height (44px minimum)
            'px-3 py-2', // Padding using design tokens
            'bg-input border border-border rounded-md',
            'text-primary',
            'appearance-none', // Remove default styling
            'cursor-pointer',
            'transition-colors',

            // Dropdown arrow styling using CSS (inline style in component)
            'pr-11', // Right padding for arrow (var(--space-3) + var(--space-6) = 2.75rem)

            // Focus states (atomic utilities)
            'focus:outline-none focus:border-primary focus:ring-primary',

            // Hover states (atomic utilities)
            !disabled && 'hover:border-primary hover:bg-input-hover',

            // Error states (atomic utilities)
            invalid && 'border-error',
            invalid && 'focus:ring-error',

            // Disabled states (atomic utilities)
            disabled && 'opacity-60 cursor-not-allowed bg-input-disabled',

            className,
        ]
            .filter(Boolean)
            .join(' ');

        return (
            <div className="field-select-wrapper relative inline-block w-full">
                <select
                    id={id}
                    name={name}
                    value={value || ''}
                    onChange={handleChange}
                    disabled={disabled}
                    required={required}
                    className={`field-select ${selectClasses}`}
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
                {/* Dropdown chevron icon matching backup CSS exactly */}
                <div
                    className="absolute top-1/2 pointer-events-none transition-colors"
                    style={{
                        right: 'var(--space-3)', // 12px from backup CSS line 53
                        width: 'var(--size-icon-sm)', // 16px from backup CSS line 54
                        height: '12px', // Exact height from backup CSS line 55
                        backgroundColor: 'var(--primary)', // Background color from backup CSS line 56
                        // SVG mask from backup CSS lines 57-60
                        maskImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='black' d='m2 5 6 6 6-6'/%3e%3c/svg%3e\")",
                        maskRepeat: 'no-repeat',
                        maskSize: 'contain',
                        transform: 'translateY(-50%)' // Backup CSS line 60
                    }}
                    aria-hidden="true"
                />
            </div>
        );
    }
);

SelectBase.displayName = 'SelectBase';
