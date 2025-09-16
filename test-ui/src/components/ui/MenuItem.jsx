import React from 'react';
import PropTypes from 'prop-types';

/**
 * Reusable menu item component
 *
 * Individual menu item with icon, label, and click handling.
 * Can be used in any menu context throughout the app.
 *
 * @param {Object} props - Component props
 * @param {string} props.label - Item label text
 * @param {string} [props.iconName] - Material Symbol icon name
 * @param {Function} [props.onPress] - Click handler for the item
 * @param {boolean} [props.isDisabled] - Whether item is disabled
 * @param {Function} [props.onClose] - Callback to close parent menu/dropdown
 * @param {string} [props.className] - Additional CSS classes
 */
const MenuItem = ({
  label,
  iconName,
  onPress,
  isDisabled = false,
  onClose,
  className = '',
  ...otherProps
}) => {
  const handleClick = (event) => {
    event.preventDefault();
    if (!isDisabled && onPress) {
      onPress();
      if (onClose) {
        onClose(); // Close parent menu after action
      }
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleClick(event);
    }
  };

  const itemClassName = [
    'menu-item',
    'flex items-center gap-2 py-2 px-3 touch-target bg-transparent text-secondary border-none rounded-sm cursor-pointer text-sm w-full text-left whitespace-nowrap',
    isDisabled && 'menu-item--disabled',
    className
  ].filter(Boolean).join(' ');

  return (
    <div
      className={itemClassName}
      role="menuitem"
      tabIndex={isDisabled ? -1 : 0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-disabled={isDisabled}
      {...otherProps}
    >
      {iconName && (
        <span className="menu-item__icon material-symbols-outlined flex-shrink-0 icon-md flex items-center justify-center" aria-hidden="true">
          {iconName}
        </span>
      )}
      <span className="menu-item__label flex-1 min-w-0 text-ellipsis">
        {label}
      </span>
    </div>
  );
};

MenuItem.propTypes = {
  label: PropTypes.string.isRequired,
  iconName: PropTypes.string,
  onPress: PropTypes.func,
  isDisabled: PropTypes.bool,
  onClose: PropTypes.func,
  className: PropTypes.string
};

export default MenuItem;