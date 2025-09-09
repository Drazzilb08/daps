import React from 'react';
import PropTypes from 'prop-types';

/**
 * OverflowMenuItem - Generic overflow menu item component
 * 
 * Menu item for toolbar overflow dropdown based on Radarr patterns.
 * Renders as a menu item with icon and label.
 * 
 * @param {Object} props - Component props
 * @param {string} props.iconName - Material icon name
 * @param {string} props.label - Menu item label
 * @param {boolean} [props.isDisabled=false] - Disabled state
 * @param {boolean} [props.isSpinning=false] - Loading state
 * @param {Function} [props.onPress] - Click handler
 */
const OverflowMenuItem = ({
  iconName,
  label,
  isDisabled = false,
  isSpinning = false,
  onPress,
  ...otherProps
}) => {
  const handleClick = (event) => {
    event.preventDefault();
    
    if (isDisabled || isSpinning) {
      return;
    }
    
    if (onPress) {
      onPress(event);
    }
  };

  const itemClassName = [
    'page-toolbar-overflow-menu-item',
    isDisabled && 'page-toolbar-overflow-menu-item--disabled',
    isSpinning && 'page-toolbar-overflow-menu-item--spinning'
  ].filter(Boolean).join(' ');

  return (
    <div 
      className={itemClassName}
      onClick={handleClick}
      role="menuitem"
      tabIndex={isDisabled ? -1 : 0}
      {...otherProps}
    >
      <span className={`page-toolbar-overflow-menu-item-icon material-symbols-outlined ${isSpinning ? 'spinning' : ''}`}>
        {iconName}
      </span>
      <span className="page-toolbar-overflow-menu-item-label">
        {label}
      </span>
    </div>
  );
};

OverflowMenuItem.propTypes = {
  iconName: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  isDisabled: PropTypes.bool,
  isSpinning: PropTypes.bool,
  onPress: PropTypes.func
};

export default OverflowMenuItem;