import React, { useCallback } from 'react';

/**
 * Enhanced time input component with 24-hour validation
 * @param {string} value - Time value in HH:mm format (24-hour)
 * @param {Function} onChange - Value change callback
 * @param {boolean} disabled - Whether the input is disabled
 * @param {boolean} required - Whether the input is required
 * @param {string} placeholder - Placeholder text
 * @param {string} className - Additional CSS classes
 */
export const TimeInput = React.memo(
    ({
        value = '12:00',
        onChange,
        disabled = false,
        required = false,
        placeholder = '12:00',
        className = '',
    }) => {
        const handleChange = useCallback(
            e => {
                const newValue = e.target.value;
                // Basic validation for 24-hour format (HH:mm)
                if (newValue === '' || /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(newValue)) {
                    onChange(newValue);
                }
            },
            [onChange]
        );

        const handleBlur = useCallback(
            e => {
                const currentValue = e.target.value;
                // Auto-format incomplete time entries
                if (currentValue && currentValue.length === 4 && !currentValue.includes(':')) {
                    // Handle formats like "1230" -> "12:30"
                    const formatted = `${currentValue.slice(0, 2)}:${currentValue.slice(2)}`;
                    if (/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(formatted)) {
                        onChange(formatted);
                    }
                } else if (
                    currentValue &&
                    currentValue.length === 3 &&
                    !currentValue.includes(':')
                ) {
                    // Handle formats like "930" -> "09:30"
                    const formatted = `0${currentValue.slice(0, 1)}:${currentValue.slice(1)}`;
                    if (/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(formatted)) {
                        onChange(formatted);
                    }
                }
            },
            [onChange]
        );

        return (
            <input
                type="time"
                value={value || ''}
                onChange={handleChange}
                onBlur={handleBlur}
                disabled={disabled}
                required={required}
                placeholder={placeholder}
                className={`
                px-3 py-2 border border-border rounded-md
                min-h-11 bg-surface text-primary
                transition-colors duration-200
                ${
                    disabled
                        ? 'opacity-50 cursor-not-allowed bg-surface-disabled'
                        : 'hover:border-border-hover focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                }
                ${className}
            `}
            />
        );
    }
);

TimeInput.displayName = 'TimeInput';

export default TimeInput;
