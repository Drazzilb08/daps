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
export const RemoveButton = React.memo(({
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
  ...props
}) => {
  const handleClick = (e) => {
    if (disabled) return;
    onClick?.(e);
  };

  // Generate accessible label
  const ariaLabel = itemName 
    ? `Remove ${itemName}`
    : `Remove ${itemType}`;

  const buttonClasses = [
    'btn',
    'btn--remove',
    'btn--icon-only',
    size === 'small' ? 'btn--small' : size === 'large' ? 'btn--large' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <button
      type="button"
      className={buttonClasses}
      onClick={handleClick}
      disabled={disabled}
      aria-label={ariaLabel}
      title={ariaLabel}
      {...ariaProps}
      {...props}
    >
      <span className="remove-button-icon" aria-hidden="true">{icon}</span>
      {!iconOnly && (
        <span className="remove-button-text">{text}</span>
      )}
      {iconOnly && (
        <span className="sr-only">{text}</span>
      )}
    </button>
  );
});

RemoveButton.displayName = 'RemoveButton';

export default RemoveButton;