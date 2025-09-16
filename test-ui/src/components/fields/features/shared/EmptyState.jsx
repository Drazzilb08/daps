/**
 * EmptyState Primitive Component
 * 
 * Truly atomic component for displaying empty collection states.
 * Designed for maximum reusability across different contexts.
 * 
 * Use cases:
 * - "No colors added yet"
 * - "No items found"
 * - "No results"
 * - "No files selected"
 * - Any empty collection state
 * - Search with no results
 * - Filtered lists with no matches
 * 
 * Features:
 * - Accessible with proper semantics
 * - Customizable icon and messaging
 * - Support for primary/secondary messaging
 * - Optional call-to-action integration
 * - Visual variants for different contexts
 * - Mobile-first responsive design
 */

import React from 'react';

/**
 * Generic empty state component for empty collections
 * 
 * @param {Object} props - Component props
 * @param {string} props.message - Primary empty state message
 * @param {string} props.secondaryMessage - Optional secondary/help message
 * @param {string} props.icon - Icon to display (optional)
 * @param {React.ReactNode} props.children - Optional child content (e.g., call-to-action buttons)
 * @param {string} props.variant - Visual style variant ('default', 'subtle', 'prominent')
 * @param {string} props.size - Size variant ('small', 'medium', 'large')
 * @param {boolean} props.showIcon - Whether to show the icon
 * @param {string} props.iconPosition - Icon position ('top', 'left', 'none')
 * @param {string} props.textAlign - Text alignment ('left', 'center', 'right')
 * @param {string} props.className - Additional CSS classes
 * @param {Object} props.ariaProps - Additional ARIA properties
 */
export const EmptyState = React.memo(({
  message = 'No items found',
  secondaryMessage = '',
  icon = '',
  children = null,
  variant = 'default',
  size = 'medium',
  showIcon = Boolean(icon),
  iconPosition = 'top',
  textAlign = 'center',
  className = '',
  ariaProps = {},
  ...props
}) => {
  // Use utility classes instead of phantom classes
  const baseClasses = `flex flex-col items-center p-4 rounded-md text-${textAlign}`;
  const sizeClasses = size === 'small' ? 'gap-2' : 'gap-4';
  const variantClasses = variant === 'subtle' ? 'text-secondary' : 'text-primary';
  const emptyStateClasses = `${baseClasses} ${sizeClasses} ${variantClasses} ${className}`.trim();

  return (
    <div
      className={emptyStateClasses}
      role="status"
      aria-live="polite"
      {...ariaProps}
      {...props}
    >
      {showIcon && icon && iconPosition !== 'none' && (
        <div className="text-lg opacity-60" aria-hidden="true">
          {typeof icon === 'string' ? (
            <span>{icon}</span>
          ) : (
            icon
          )}
        </div>
      )}

      <div className="text-center">
        <div className="font-medium text-primary">
          {message}
        </div>

        {secondaryMessage && (
          <div className="text-sm text-secondary mt-1">
            {secondaryMessage}
          </div>
        )}

        {children && (
          <div className="mt-3">
            {children}
          </div>
        )}
      </div>
    </div>
  );
});

EmptyState.displayName = 'EmptyState';

export default EmptyState;