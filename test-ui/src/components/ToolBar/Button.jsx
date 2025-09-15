import React from 'react';
import PropTypes from 'prop-types';

/**
 * Button - Generic toolbar button component
 * 
 * Individual toolbar button with icon, label, and state management.
 * Supports disabled, loading states and click handling.
 * This is a reusable component that can be used in any toolbar context.
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
const Button = React.forwardRef(({
  label,
  iconName,
  spinningName,
  isSpinning = false,
  isDisabled = false,
  onPress,
  overflowComponent: OverflowComponent,
  ...otherProps
}, ref) => {
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
    'btn',
    'inline-flex',
    'items-center',
    'justify-center',
    'touch-target',
    'text-base',
    'font-medium',
    'border',
    'rounded-md',
    'cursor-pointer',
    'transition',
    isDisabled && 'page-toolbar-button--disabled',
    isSpinning && 'page-toolbar-button--spinning'
  ].filter(Boolean).join(' ');

  const displayIcon = isSpinning && spinningName ? spinningName : iconName;

  return (
    <button
      ref={ref}
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
});

Button.displayName = 'Button';

Button.propTypes = {
  label: PropTypes.string.isRequired,
  iconName: PropTypes.string.isRequired,
  spinningName: PropTypes.string,
  isSpinning: PropTypes.bool,
  isDisabled: PropTypes.bool,
  onPress: PropTypes.func,
  overflowComponent: PropTypes.elementType
};

export default Button;