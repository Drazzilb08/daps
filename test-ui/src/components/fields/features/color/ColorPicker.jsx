/**
 * ColorPicker Primitive Component
 *
 * Native HTML color input with enhanced accessibility and touch optimization.
 * Designed for composition into color field types following "write once, use everywhere" philosophy.
 *
 * Features:
 * - Touch-optimized 44px minimum size (WCAG compliance)
 * - Full keyboard navigation support
 * - ARIA labeling for screen readers
 * - Mobile-first responsive design
 * - Seamless integration with ColorTextInput via ColorInputPair
 */

import React, { useCallback } from 'react';

/**
 * ColorPicker component for native color selection
 *
 * @param {Object} props - Component props
 * @param {string} props.value - Current color value (hex format)
 * @param {Function} props.onChange - Color change handler: (color: string) => void
 * @param {boolean} props.disabled - Disabled state
 * @param {string} props.id - Element ID for accessibility
 * @param {string} props.ariaLabel - ARIA label for screen readers
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.title - Tooltip text
 */
export const ColorPicker = React.memo(
    ({
        value = '#000000',
        onChange,
        disabled = false,
        id,
        ariaLabel,
        className = '',
        title,
        invalid, // Extract invalid prop to prevent it from being passed to DOM
        ...domProps // Only pass valid DOM props
    }) => {
        const handleChange = useCallback(
            e => {
                const newColor = e.target.value;
                onChange?.(newColor);
            },
            [onChange]
        );

        // Ensure value is always a valid hex color
        const normalizedValue = React.useMemo(() => {
            if (!value) return '#000000';
            if (value.startsWith('#')) return value;
            return `#${value}`;
        }, [value]);

        const displayTitle = title || `Select color: ${normalizedValue}`;

        return (
            <input
                id={id}
                type="color"
                value={normalizedValue}
                onChange={handleChange}
                disabled={disabled}
                className={`touch-target border-2 rounded-sm cursor-pointer transition-input color-picker-webkit-reset ${invalid ? 'color-picker-invalid' : ''} ${className}`.trim()}
                aria-label={ariaLabel}
                title={displayTitle}
                {...domProps}
            />
        );
    }
);

ColorPicker.displayName = 'ColorPicker';

export default ColorPicker;
