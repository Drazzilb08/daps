import React, { useCallback } from 'react';
import PropTypes from 'prop-types';

/**
 * ButtonBase - Core button primitive with interaction and styling
 *
 * Responsibilities:
 * - Base <button> element with semantic HTML
 * - Focus management and keyboard navigation
 * - Disabled state handling
 * - Click interaction
 * - Size variants (small, medium, large)
 * - Variant styles (primary, secondary, success, danger, ghost)
 * - Full width option
 * - ARIA attributes for accessibility
 * - Theme-aware colors via utility classes
 *
 * @param {Object} props - Component props
 * @param {ReactNode} props.children - Button content (icons, text, spinner)
 * @param {Function} props.onClick - Click handler
 * @param {boolean} props.disabled - Disabled state
 * @param {string} props.variant - Button variant (primary, secondary, success, danger, ghost)
 * @param {string} props.size - Button size (small, medium, large)
 * @param {boolean} props.fullWidth - Expand to full container width
 * @param {string} props.type - Button type (button, submit, reset)
 * @param {string} props.className - Additional CSS classes
 * @param {string} props['aria-label'] - Accessibility label
 * @returns {JSX.Element}
 */
export const ButtonBase = React.memo(
    ({
        children,
        onClick,
        disabled = false,
        variant = 'primary',
        size = 'medium',
        fullWidth = false,
        type = 'button',
        className = '',
        'aria-label': ariaLabel,
        ...htmlButtonProps
    }) => {
        // Handle click with disabled check
        const handleClick = useCallback(
            event => {
                if (!disabled && onClick) {
                    onClick(event);
                }
            },
            [disabled, onClick]
        );

        // Build class names from utility classes
        // Base styles: layout, spacing, typography, cursor, transitions
        const baseClasses = [
            'inline-flex',
            'items-center',
            'justify-center',
            'border-0',
            'font-medium',
            'cursor-pointer',
            'transition-all',
            'duration-150',
        ];

        // Variant styles: theme-aware colors
        const variantClasses = {
            primary: ['bg-primary', 'text-primary-contrast'],
            secondary: ['bg-secondary', 'text-secondary-contrast'],
            success: ['bg-success', 'text-success-contrast'],
            danger: ['bg-danger', 'text-danger-contrast'],
            ghost: ['bg-transparent', 'text-text-primary', 'border', 'border-border'],
        };

        // Size styles: dimensions and spacing
        const sizeClasses = {
            small: ['min-h-9', 'px-3', 'py-1.5', 'text-sm'],
            medium: ['min-h-11', 'px-4', 'py-2', 'text-base'],
            large: ['min-h-12', 'px-5', 'py-3', 'text-lg'],
        };

        // State styles: hover, active, disabled, focus
        const stateClasses = [
            'hover:-translate-y-0.5',
            'hover:shadow-md',
            'active:translate-y-0',
            'disabled:opacity-50',
            'disabled:cursor-not-allowed',
            'focus-visible:outline',
            'focus-visible:outline-2',
            'focus-visible:outline-offset-2',
            'focus-visible:outline-focus',
        ];

        // Border radius
        const roundedClasses = ['rounded-md'];

        // Full width
        const widthClasses = fullWidth ? ['w-full'] : [];

        // Compose all utility classes
        const buttonClasses = [
            ...baseClasses,
            ...(variantClasses[variant] || variantClasses.primary),
            ...(sizeClasses[size] || sizeClasses.medium),
            ...roundedClasses,
            ...stateClasses,
            ...widthClasses,
            className,
        ]
            .filter(Boolean)
            .join(' ');

        return (
            <button
                className={buttonClasses}
                onClick={handleClick}
                disabled={disabled}
                type={type}
                aria-label={ariaLabel}
                {...htmlButtonProps}
            >
                {children}
            </button>
        );
    }
);

ButtonBase.displayName = 'ButtonBase';

ButtonBase.propTypes = {
    children: PropTypes.node,
    onClick: PropTypes.func,
    disabled: PropTypes.bool,
    variant: PropTypes.oneOf(['primary', 'secondary', 'success', 'danger', 'ghost']),
    size: PropTypes.oneOf(['small', 'medium', 'large']),
    fullWidth: PropTypes.bool,
    type: PropTypes.oneOf(['button', 'submit', 'reset']),
    className: PropTypes.string,
    'aria-label': PropTypes.string,
};
