/**
 * RemoveButton Primitive Component
 *
 * Truly atomic component for removing items from any collection.
 * Designed for maximum reusability across different contexts.
 *
 * Use cases:
 * - Removing colors from arrays
 * - Removing any list item
 * - Closing modals, deleting entries
 * - Removing tags, filters, options
 * - Any "remove/delete item" scenario
 *
 * Features:
 * - Touch-optimized (44px minimum target)
 * - Accessible with proper ARIA labels
 * - Disabled state handling
 * - Customizable icon and appearance
 * - Supports both icon-only and text variants
 * - Mobile-first responsive design
 */

import React from 'react';

/**
 * Generic remove button for removing items from collections
 *
 * @param {Object} props - Component props
 * @param {Function} props.onClick - Click handler
 * @param {boolean} props.disabled - Disabled state
 * @param {string} props.itemName - Name of specific item being removed (for aria-label)
 * @param {string} props.itemType - Type of item being removed (for aria-label)
 * @param {string} props.text - Optional button text (for text variant)
 * @param {string} props.icon - Icon to display (defaults to "×")
 * @param {boolean} props.iconOnly - Show only icon without text
 * @param {string} props.variant - Visual style variant ('default', 'danger', 'subtle')
 * @param {string} props.size - Size variant ('small', 'medium', 'large')
 * @param {string} props.className - Additional CSS classes
 * @param {Object} props.ariaProps - Additional ARIA properties
 */
export const RemoveButton = React.memo(
    ({
        onClick,
        disabled = false,
        itemName = '',
        itemType = 'item',
        text = 'Remove',
        icon = '×',
        iconOnly = true,
        variant = 'default',
        size = 'medium',
        className = '',
        ariaProps = {},
        disabledReason, // Extract to prevent passing to DOM
        ...domProps // Only pass valid DOM props
    }) => {
        const handleClick = e => {
            if (disabled) return;
            onClick?.(e);
        };

        // Generate accessible label
        const ariaLabel = itemName ? `Remove ${itemName}` : `Remove ${itemType}`;

        const buttonClasses = [
            // Base atomic utilities for consistent remove button styling
            'min-w-touch min-h-touch', // Square 44px x 44px minimum (matches original)
            'shrink-0', // flex-shrink: 0 (matches original .color-poster-remove-button)
            'leading-none',
            'whitespace-nowrap',
            'border',
            'border-error',
            'select-none',
            'bg-transparent',
            'text-error',
            'hover:bg-error',
            'hover:text-white',
            'inline-flex',
            'items-center',
            'justify-center',
            'text-lg',
            'font-bold',
            'rounded-md',
            'cursor-pointer',
            'transition-colors', // Added proper transition

            // Size variants (all maintain square proportions)
            size === 'small'
                ? 'min-w-9 min-h-9 text-sm'
                : size === 'large'
                  ? 'min-w-12 min-h-12 text-xl'
                  : '', // Use default touch target sizing
            disabled && 'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
            className,
        ]
            .filter(Boolean)
            .join(' ');

        return (
            <button
                type="button"
                className={buttonClasses}
                onClick={handleClick}
                disabled={disabled}
                aria-label={ariaLabel}
                title={disabledReason && disabled ? disabledReason : ariaLabel}
                {...ariaProps}
                {...domProps}
            >
                <span aria-hidden="true">
                    {icon}
                </span>
                {!iconOnly && <span>{text}</span>}
                {iconOnly && <span className="sr-only">{text}</span>}
            </button>
        );
    }
);

RemoveButton.displayName = 'RemoveButton';

export default RemoveButton;
