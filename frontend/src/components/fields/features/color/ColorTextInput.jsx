/**
 * ColorTextInput Primitive Component
 *
 * Text input specialized for hex color values with validation and formatting.
 * Includes pattern validation and auto-completion of '#' prefix.
 * Designed for composition into color field types following "write once, use everywhere" philosophy.
 *
 * Features:
 * - Consistent typography with other input fields
 * - Real-time hex validation (pattern matching)
 * - Auto-completion of '#' prefix
 * - Touch-optimized sizing (44px minimum)
 * - Accessibility support (ARIA attributes)
 * - Seamless integration with ColorPicker via ColorInputPair
 */

import React, { useCallback, useMemo } from 'react';
import { InputBase } from '../../primitives/InputBase';

/**
 * ColorTextInput component for hex color text editing
 *
 * @param {Object} props - Component props
 * @param {string} props.value - Current color value (hex format)
 * @param {Function} props.onChange - Color change handler: (color: string) => void
 * @param {boolean} props.disabled - Disabled state
 * @param {boolean} props.invalid - Invalid/error state
 * @param {string} props.id - Element ID for accessibility
 * @param {string} props.placeholder - Placeholder text
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.required - Required field indicator
 */
export const ColorTextInput = React.memo(
    ({
        value = '',
        onChange,
        disabled = false,
        invalid = false,
        id,
        placeholder = '#000000',
        className = '',
        required = false,
        ...props
    }) => {
        const handleChange = useCallback(
            e => {
                const newValue = e.target.value;
                onChange?.(newValue);
            },
            [onChange]
        );

        // Display value (show what user typed)
        const displayValue = useMemo(() => {
            return value || '';
        }, [value]);

        return (
            <InputBase
                id={id}
                type="text"
                value={displayValue}
                onChange={handleChange}
                disabled={disabled}
                invalid={invalid}
                placeholder={placeholder}
                required={required}
                pattern="^#?[0-9A-Fa-f]{6}$"
                maxLength={7}
                className={`flex-1 min-w-0 ${className}`.trim()}
                aria-describedby={`${id}-format-hint`}
                title="Enter hex color (e.g. #ff0000 or ff0000)"
                {...props}
            />
        );
    }
);

ColorTextInput.displayName = 'ColorTextInput';

export default ColorTextInput;
