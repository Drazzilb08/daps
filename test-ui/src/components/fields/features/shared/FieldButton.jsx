/**
 * FieldButton - Simple reusable button for any field operation
 *
 * Write once, use everywhere pattern for field buttons.
 * Can be used for increment/decrement, show/hide password, or any field action.
 *
 * Features:
 * - Consistent styling across all field types
 * - Accessibility support with proper ARIA labels
 * - Touch-optimized button sizing
 * - Disabled state handling
 * - Generic enough for any field operation
 */

import React from 'react';

/**
 * Simple reusable button for field operations
 *
 * @param {Object} props - Component props
 * @param {Function} props.onClick - Button click handler
 * @param {boolean} props.disabled - Whether button is disabled
 * @param {string} props.ariaLabel - ARIA label for accessibility
 * @param {React.ReactNode} props.children - Button content (icon, text, etc.)
 * @param {string} props.className - Additional CSS classes
 */
export const FieldButton = React.memo(({
  onClick,
  disabled = false,
  ariaLabel,
  children,
  className = ''
}) => {
  const buttonClasses = className;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={buttonClasses}
      aria-label={ariaLabel}
      tabIndex={disabled ? -1 : 0}
    >
      {children}
    </button>
  );
});

FieldButton.displayName = 'FieldButton';

export default FieldButton;