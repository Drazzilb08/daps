import React from 'react';
import PropTypes from 'prop-types';

/**
 * Individual menu item for toolbar overflow
 *
 * @param {Object} props - Component props
 * @param {string} props.label - Item label text
 * @param {string} [props.iconName] - Icon name for the item
 * @param {Function} [props.onPress] - Click handler for the item
 * @param {boolean} [props.isDisabled] - Whether item is disabled
 * @param {Function} props.onClose - Callback to close the menu
 */
const OverflowMenuItem = ({
  label,
  iconName,
  onPress,
  isDisabled = false,
  onClose,
  ...otherProps
}) => {
  const handleClick = (event) => {
    event.preventDefault();
    if (!isDisabled && onPress) {
      onPress();
      onClose(); // Close menu after action
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleClick(event);
    }
  };

  return (
    <div
      className={`toolbar-overflow-menu-item ${isDisabled ? 'disabled' : ''}`}
      role="menuitem"
      tabIndex={isDisabled ? -1 : 0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-disabled={isDisabled}
      {...otherProps}
    >
      {iconName && (
        <span className="toolbar-overflow-menu-item-icon material-symbols-outlined" aria-hidden="true">
          {iconName}
        </span>
      )}
      <span className="toolbar-overflow-menu-item-label">
        {label}
      </span>
    </div>
  );
};

OverflowMenuItem.propTypes = {
  label: PropTypes.string.isRequired,
  iconName: PropTypes.string,
  onPress: PropTypes.func,
  isDisabled: PropTypes.bool,
  onClose: PropTypes.func.isRequired
};

export default OverflowMenuItem;