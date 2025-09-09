import React from 'react';
import PropTypes from 'prop-types';

/**
 * PageToolbarButton component based on Radarr architecture
 * 
 * Individual toolbar button with icon, label, and state management.
 * Supports disabled, loading states and click handling.
 * 
 * @param {Object} props - Component props
 * @param {string} props.label - Button label text
 * @param {string} props.iconName - Material icon name
 * @param {string} [props.spinningName] - Icon to show when spinning
 * @param {boolean} [props.isSpinning=false] - Loading/spinning state
 * @param {boolean} [props.isDisabled=false] - Disabled state
 * @param {Function} [props.onPress] - Click handler
 * @param {React.ComponentType} [props.overflowComponent] - Overflow menu component
 */
const PageToolbarButton = ({
  label,
  iconName,
  spinningName,
  isSpinning = false,
  isDisabled = false,
  onPress,
  overflowComponent: OverflowComponent,
  ...otherProps
}) => {
  const handleClick = (event) => {
    if (isDisabled || isSpinning) {
      event.preventDefault();
      return;
    }
    if (onPress) {
      onPress(event);
    }
  };

  const buttonClassName = [
    'page-toolbar-button',
    isDisabled && 'page-toolbar-button--disabled',
    isSpinning && 'page-toolbar-button--spinning'
  ].filter(Boolean).join(' ');

  const displayIcon = isSpinning && spinningName ? spinningName : iconName;

  return (
    <button
      className={buttonClassName}
      onClick={handleClick}
      disabled={isDisabled || isSpinning}
      aria-label={label}
      {...otherProps}
    >
      <span 
        className={`page-toolbar-button-icon material-symbols-outlined ${isSpinning ? 'spinning' : ''}`}
      >
        {displayIcon}
      </span>
      <div className="page-toolbar-button-label-container">
        <div className="page-toolbar-button-label">{label}</div>
      </div>
      {OverflowComponent && <OverflowComponent />}
    </button>
  );
};

PageToolbarButton.propTypes = {
  label: PropTypes.string.isRequired,
  iconName: PropTypes.string.isRequired,
  spinningName: PropTypes.string,
  isSpinning: PropTypes.bool,
  isDisabled: PropTypes.bool,
  onPress: PropTypes.func,
  overflowComponent: PropTypes.elementType
};

export default PageToolbarButton;