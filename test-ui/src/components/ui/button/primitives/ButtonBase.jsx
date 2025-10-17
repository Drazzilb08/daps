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
 * - Variant styles (primary, secondary, success, danger, ghost, warning, info, muted, surface)
 * - Utility class overrides for edge cases (bgClass, textClass, sizeClass, hoverClass)
 * - Full width option
 * - ARIA attributes for accessibility
 * - Theme-aware colors via utility classes
 *
 * Usage Examples:
 *
 * // Common case: variant only
 * <ButtonBase variant="primary">Save</ButtonBase>
 *
 * // Extended variants: theme colors
 * <ButtonBase variant="warning">Warning Action</ButtonBase>
 * <ButtonBase variant="info">Info Action</ButtonBase>
 *
 * // Utility overrides: edge cases
 * <ButtonBase variant="primary" bgClass="bg-surface-elevated">Custom BG</ButtonBase>
 * <ButtonBase variant="ghost" sizeClass="px-8 py-5 text-2xl">Large Custom</ButtonBase>
 * <ButtonBase variant="secondary" hoverClass="hover:bg-warning-bg">Custom Hover</ButtonBase>
 *
 * // Precedence: utility overrides win
 * <ButtonBase variant="primary" bgClass="bg-warning" textClass="text-text-primary">
 *   // Uses warning background and primary text, NOT primary variant colors
 * </ButtonBase>
 *
 * @param {Object} props - Component props
 * @param {ReactNode} props.children - Button content (icons, text, spinner)
 * @param {Function} props.onClick - Click handler
 * @param {boolean} props.disabled - Disabled state
 * @param {string} props.variant - Button variant (primary, secondary, success, danger, ghost, warning, info, muted, surface)
 * @param {string} props.size - Button size (small, medium, large) - provides guidance for common cases
 * @param {string} props.bgClass - Background utility override (e.g., 'bg-surface-elevated', 'bg-warning')
 * @param {string} props.textClass - Text color utility override (e.g., 'text-warning', 'text-text-primary')
 * @param {string} props.sizeClass - Size utility override (e.g., 'px-8 py-4 text-xl', 'min-h-12 px-6')
 * @param {string} props.hoverClass - Hover state utility override (e.g., 'hover:bg-warning-bg', 'hover:shadow-lg')
 * @param {boolean} props.fullWidth - Expand to full container width
 * @param {string} props.type - Button type (button, submit, reset)
 * @param {string} props.className - Additional CSS classes (final catch-all)
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
        bgClass = '',
        textClass = '',
        sizeClass = '',
        hoverClass = '',
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

        // Variant background colors (overridden by bgClass)
        const variantBgClasses = {
            primary: 'bg-primary',
            secondary: 'bg-secondary',
            success: 'bg-success',
            danger: 'bg-danger',
            ghost: 'bg-transparent',
            warning: 'bg-warning',
            info: 'bg-info',
            muted: 'bg-muted',
            surface: 'bg-surface',
        };

        // Variant text colors (overridden by textClass)
        const variantTextClasses = {
            primary: 'text-primary-contrast',
            secondary: 'text-secondary-contrast',
            success: 'text-success-contrast',
            danger: 'text-danger-contrast',
            ghost: 'text-text-primary',
            warning: 'text-primary-contrast', // White text on warning bg
            info: 'text-primary-contrast', // White text on info bg
            muted: 'text-text-primary', // Primary text on muted bg
            surface: 'text-text-primary', // Primary text on surface bg
        };

        // Ghost variant needs border (not overridden by bgClass/textClass)
        const variantBorderClasses = variant === 'ghost' ? ['border', 'border-border'] : [];

        // Size styles: dimensions and spacing (overridden by sizeClass)
        const variantSizeClasses = {
            small: ['min-h-9', 'px-3', 'py-1.5', 'text-sm'],
            medium: ['min-h-11', 'px-4', 'py-2', 'text-base'],
            large: ['min-h-12', 'px-5', 'py-3', 'text-lg'],
        };

        // Variant hover states (overridden by hoverClass)
        // Note: Using opacity for subtle hover effects - works with all colors
        const variantHoverClasses = {
            primary: 'hover:opacity-90',
            secondary: 'hover:opacity-90',
            success: 'hover:opacity-90',
            danger: 'hover:opacity-90',
            ghost: 'hover:bg-surface-elevated',
            warning: 'hover:opacity-90',
            info: 'hover:opacity-90',
            muted: 'hover:opacity-90',
            surface: 'hover:bg-surface-elevated',
        };

        // State styles: active, disabled, focus
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

        // Compose all utility classes with override precedence
        // Precedence: Base → Variant (unless overridden) → Overrides → className
        const buttonClasses = [
            ...baseClasses,
            ...variantBorderClasses, // Ghost border (always applied)
            !bgClass && (variantBgClasses[variant] || variantBgClasses.primary), // Variant bg (unless overridden)
            !textClass && (variantTextClasses[variant] || variantTextClasses.primary), // Variant text (unless overridden)
            !sizeClass && (variantSizeClasses[size] || variantSizeClasses.medium).join(' '), // Variant size (unless overridden)
            bgClass, // Utility bg override
            textClass, // Utility text override
            sizeClass, // Utility size override
            ...roundedClasses,
            ...stateClasses,
            !hoverClass && (variantHoverClasses[variant] || variantHoverClasses.primary), // Variant hover (unless overridden)
            hoverClass, // Utility hover override
            ...widthClasses,
            className, // Final catch-all
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
    variant: PropTypes.oneOf([
        'primary',
        'secondary',
        'success',
        'danger',
        'ghost',
        'warning',
        'info',
        'muted',
        'surface',
    ]),
    size: PropTypes.oneOf(['small', 'medium', 'large']),
    bgClass: PropTypes.string,
    textClass: PropTypes.string,
    sizeClass: PropTypes.string,
    hoverClass: PropTypes.string,
    fullWidth: PropTypes.bool,
    type: PropTypes.oneOf(['button', 'submit', 'reset']),
    className: PropTypes.string,
    'aria-label': PropTypes.string,
};
