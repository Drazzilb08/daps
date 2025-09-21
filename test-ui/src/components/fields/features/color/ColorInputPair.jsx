/**
 * ColorInputPair Primitive Component
 * Synchronized color picker and text input with bidirectional value sync.
 */

import React, { useCallback, useMemo } from 'react';
import { ColorPicker } from './ColorPicker';
import { ColorTextInput } from './ColorTextInput';

/**
 * ColorInputPair component combining picker and text input
 *
 * @param {Object} props - Component props
 * @param {string} props.value - Current color value (hex format)
 * @param {Function} props.onChange - Color change handler: (color: string) => void
 * @param {boolean} props.disabled - Disabled state for both inputs
 * @param {boolean} props.invalid - Invalid/error state for both inputs
 * @param {string} props.baseId - Base ID for generating input IDs
 * @param {string} props.label - Label text for ARIA descriptions
 * @param {string} props.placeholder - Placeholder for text input
 * @param {boolean} props.required - Required field indicator
 * @param {string} props.className - Additional CSS classes
 */
export const ColorInputPair = React.memo(
    ({
        value = '',
        onChange,
        disabled = false,
        invalid = false,
        baseId,
        label,
        placeholder = '#000000',
        required = false,
        className = '',
        ...props
    }) => {
        // Generate unique IDs for both inputs
        const pickerId = useMemo(() => `${baseId}-picker`, [baseId]);
        const textId = useMemo(() => `${baseId}-text`, [baseId]);

        // Normalize value to valid hex format for color picker
        const normalizedValue = useMemo(() => {
            if (!value) return '#000000';
            if (value.startsWith('#')) return value;
            return `#${value}`;
        }, [value]);

        // Handle changes from either input
        const handlePickerChange = useCallback(
            newColor => {
                onChange?.(newColor);
            },
            [onChange]
        );

        const handleTextChange = useCallback(
            newValue => {
                onChange?.(newValue);
            },
            [onChange]
        );

        // ARIA labels for accessibility
        const pickerAriaLabel = `Color picker for ${label}`;
        const textAriaLabel = `Hex color input for ${label}`;

        return (
            <div
                className={`flex gap-2 items-stretch ${className}`.trim()}
                role="group"
                aria-labelledby={`${baseId}-label`}
                {...props}
            >
                <ColorPicker
                    id={pickerId}
                    value={normalizedValue}
                    onChange={handlePickerChange}
                    disabled={disabled}
                    ariaLabel={pickerAriaLabel}
                    title={`Select color for ${label}: ${normalizedValue}`}
                    className={invalid ? 'invalid' : ''}
                />

                <ColorTextInput
                    id={textId}
                    value={value}
                    onChange={handleTextChange}
                    disabled={disabled}
                    invalid={invalid}
                    placeholder={placeholder}
                    required={required}
                    aria-label={textAriaLabel}
                />
            </div>
        );
    }
);

ColorInputPair.displayName = 'ColorInputPair';

export default ColorInputPair;
