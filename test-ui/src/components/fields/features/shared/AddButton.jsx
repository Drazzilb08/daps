/**
 * AddButton Primitive Component
 * 
 * Truly atomic component for adding items to any collection.
 * Designed for maximum reusability across different contexts.
 * 
 * Use cases:
 * - Adding colors to color arrays
 * - Adding items to any list
 * - Adding tags, options, rules, filters, etc.
 * - Any "add new item" scenario
 * 
 * Features:
 * - Touch-optimized (44px minimum height)
 * - Accessible with proper ARIA labels
 * - Disabled state handling
 * - Customizable icon and text
 * - Mobile-first responsive design
 */

import React from 'react';

/**
 * Generic add button for adding items to collections
 * 
 * @param {Object} props - Component props
 * @param {Function} props.onClick - Click handler
 * @param {boolean} props.disabled - Disabled state
 * @param {string} props.text - Button text (e.g., "Add Color", "Add Item", "Add Tag")
 * @param {string} props.itemType - Type of item being added (for aria-label)
 * @param {string} props.disabledReason - Tooltip text when disabled
 * @param {string} props.icon - Icon to display (defaults to "+")
 * @param {string} props.className - Additional CSS classes
 * @param {Object} props.ariaProps - Additional ARIA properties
 */
export const AddButton = React.memo(({
  onClick,
  disabled = false,
  text = 'Add Item',
  itemType = 'item',
  disabledReason = 'Cannot add more items',
  icon = '+',
  className = '',
  ariaProps = {},
  ...props
}) => {
  const handleClick = (e) => {
    if (disabled) return;
    onClick?.(e);
  };

  const buttonClasses = [
    'btn',
    'btn--add',
    'inline-flex-center-both',
    'py-2',
    'px-3',
    'rounded-md',
    'cursor-pointer',
    'transition-fast',
    disabled && 'state-disabled',
    className
  ].filter(Boolean).join(' ');

  return (
    <button
      type="button"
      className={buttonClasses}
      onClick={handleClick}
      disabled={disabled}
      aria-label={`Add new ${itemType.toLowerCase()}`}
      title={disabled ? disabledReason : `Add new ${itemType.toLowerCase()}`}
      {...ariaProps}
      {...props}
    >
      <span className="inline-block mr-1" aria-hidden="true">{icon}</span>
      <span className="inline-block">{text}</span>
    </button>
  );
});

AddButton.displayName = 'AddButton';

export default AddButton;