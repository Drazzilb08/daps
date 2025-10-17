import React from 'react';
import PropTypes from 'prop-types';

/**
 * ButtonIcon - Icon primitive using Material Symbols
 *
 * Responsibilities:
 * - Render Material Symbols icon
 * - Size variants matching button sizes
 * - Icon-only or icon with text spacing
 * - ARIA hidden for decorative icons
 * - Theme-aware icon colors (inherits from button)
 *
 * Size Scale Philosophy:
 * - Meaningful differentiation between sizes (12-16px gaps)
 * - Material Design guidelines: 24px minimum for toolbar icons
 * - Accessibility: Larger sizes improve visibility for users with visual differences
 *
 * @param {Object} props - Component props
 * @param {string} props.icon - Material Symbols icon name
 * @param {string} props.size - Icon size (small, medium, large)
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props['aria-hidden'] - Hide from screen readers
 * @returns {JSX.Element}
 */
export const ButtonIcon = React.memo(
    ({ icon, size = 'medium', className = '', 'aria-hidden': ariaHidden = true }) => {
        // Map size to text size utilities (Material Symbols uses font-size)
        // Redesigned scale with meaningful differentiation for accessibility
        const sizeClasses = {
            small: 'text-xl', // 1.25rem (20px) - Minimum for inline/compact contexts
            medium: 'text-2xl', // 1.5rem (24px) - Standard toolbar/button icons (Material Design)
            large: 'text-4xl', // 2.25rem (36px) - Prominent actions/headers
        };

        // Build class names using utility classes only
        const iconClasses = [
            'inline-flex', // Display: inline-flex for proper alignment
            'items-center', // Vertical center alignment
            'justify-center', // Horizontal center alignment
            sizeClasses[size], // Font size for icon
            className,
        ]
            .filter(Boolean)
            .join(' ');

        return (
            <span
                className={iconClasses}
                aria-hidden={ariaHidden}
                style={{ fontFamily: 'Material Symbols Outlined' }}
            >
                {icon}
            </span>
        );
    }
);

ButtonIcon.displayName = 'ButtonIcon';

ButtonIcon.propTypes = {
    icon: PropTypes.string.isRequired,
    size: PropTypes.oneOf(['small', 'medium', 'large']),
    className: PropTypes.string,
    'aria-hidden': PropTypes.bool,
};
