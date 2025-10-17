/**
 * Badge - Universal display component for string values
 *
 * Displays any string value with optional remove functionality.
 * Supports multiple visual variants and sizes for different use cases.
 * Includes full accessibility support and keyboard navigation.
 */

import React from 'react';

/**
 * Badge component for displaying string values with optional interaction
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Content to display (AGNOSTIC - any string/content)
 * @param {string} props.variant - Visual style variant
 * @param {string} props.size - Size variant for responsive scaling
 * @param {Function} props.onRemove - Optional remove handler (shows × when provided)
 * @param {Function} props.onClick - Optional click handler for interactive badges
 * @param {boolean} props.disabled - Disabled state
 * @param {boolean} props.focused - Focus state for keyboard navigation
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.removeLabel - Accessible label for remove button
 * @param {Object} props.ariaProps - Additional ARIA properties
 */
export const Badge = React.memo(
    ({
        children,
        variant = 'default',
        size = 'medium',
        onRemove,
        onClick,
        disabled = false,
        focused = false,
        className = '',
        removeLabel = 'Remove item',
        ariaProps = {},
        ...restProps
    }) => {
        // Development-time validation to prevent domain-specific prop drift
        if (import.meta.env.DEV) {
            const propNames = Object.keys({
                children,
                variant,
                size,
                onRemove,
                onClick,
                disabled,
                focused,
                className,
                removeLabel,
                ariaProps,
                ...restProps,
            });
            const forbidden = ['tag', 'label', 'status', 'category', 'type'];
            const hasForbidden = propNames.some(name =>
                forbidden.some(term => name.toLowerCase().includes(term))
            );
            if (hasForbidden) {
                console.error(
                    'Badge: Domain-specific prop detected!',
                    propNames,
                    'Use generic props instead'
                );
            }
        }

        const isInteractive = Boolean(onClick || onRemove);
        const isRemovable = Boolean(onRemove);
        const handleClick = e => {
            if (disabled) return;
            onClick?.(e);
        };

        const handleRemove = e => {
            e.stopPropagation(); // Prevent badge click when removing
            if (disabled) return;
            onRemove?.(e);
        };

        const handleKeyDown = e => {
            if (disabled) return;

            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick?.(e);
            }
            if ((e.key === 'Delete' || e.key === 'Backspace') && onRemove) {
                e.preventDefault();
                onRemove(e);
            }
        };

        const sizeClasses = {
            small: 'px-2 py-0.5 text-xs min-h-6',
            medium: 'px-3 py-1 text-sm min-h-8',
            large: 'px-4 py-2 text-base min-h-11 touch-target',
        };

        const variantClasses = {
            default: 'bg-surface-elevated text-secondary border-border',
            interactive: 'bg-primary text-white hover:opacity-80 cursor-pointer',
            accent: 'bg-accent text-white hover:opacity-80 cursor-pointer',
            success: 'bg-success text-white',
            warning: 'bg-warning text-black',
            error: 'bg-error text-white',
            info: 'bg-info text-white',
        };
        const badgeClasses = [
            'inline-flex',
            'items-center',
            'gap-1',
            'border',
            'rounded-full',
            'font-medium',
            'select-none',
            'transition-colors',
            'duration-200',
            sizeClasses[size],
            variantClasses[variant],
            isInteractive &&
                !disabled &&
                'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1',
            focused && 'ring-2 ring-primary ring-offset-1',
            disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
            className,
        ]
            .filter(Boolean)
            .join(' ');

        const removeButtonClasses = [
            'inline-flex',
            'items-center',
            'justify-center',
            'w-4',
            'h-4',
            'ml-1',
            'rounded-full',
            'hover:bg-black/20',
            'focus:bg-black/20',
            'focus:outline-none',
            'transition-colors',
            'duration-150',
            'cursor-pointer',
            size === 'large' && 'w-5 h-5',
        ]
            .filter(Boolean)
            .join(' ');
        const badgeAriaProps = {
            role: isInteractive ? 'button' : undefined,
            tabIndex: isInteractive && !disabled ? 0 : undefined,
            'aria-disabled': disabled,
            'aria-pressed': focused,
            ...ariaProps,
        };

        return (
            <span
                className={badgeClasses}
                onClick={onClick ? handleClick : undefined}
                onKeyDown={isInteractive ? handleKeyDown : undefined}
                {...badgeAriaProps}
                {...restProps}
            >
                {/* Content with proper text handling */}
                <span className="truncate">{children}</span>

                {/* Remove button with accessibility */}
                {isRemovable && (
                    <button
                        type="button"
                        className={removeButtonClasses}
                        onClick={handleRemove}
                        disabled={disabled}
                        aria-label={`${removeLabel}: ${children}`}
                        title={`${removeLabel}: ${children}`}
                        tabIndex={-1} // Badge itself handles focus
                    >
                        <span
                            className="material-symbols-outlined text-current"
                            style={{ fontSize: size === 'large' ? '16px' : '14px' }}
                            aria-hidden="true"
                        >
                            close
                        </span>
                    </button>
                )}
            </span>
        );
    }
);

Badge.displayName = 'Badge';

export default Badge;
