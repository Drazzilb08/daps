import React from 'react';
import PropTypes from 'prop-types';

/**
 * Individual toolbar button with priority system for overflow management
 * 
 * This component implements the DAPS toolbar button pattern with:
 * - Priority-based visibility (higher priority buttons stay visible longer)
 * - Consistent touch-friendly sizing (44px minimum)
 * - ARIA accessibility support
 * - Design system integration via CSS custom properties
 * 
 * Priority system:
 * - 1: Essential (always visible)
 * - 2: High priority (visible on medium+ screens)
 * - 3: Medium priority (visible on large screens)
 * - 4: Low priority (hidden in overflow menu first)
 * 
 * @param {Object} props - Component props
 * @param {string} props.id - Unique button identifier for measurement and overflow tracking
 * @param {string} props.label - Button text content
 * @param {Function} props.onClick - Click handler function
 * @param {string} [props.icon] - Optional icon identifier (for future icon system)
 * @param {number} [props.priority=3] - Button priority (1=highest, 4=lowest)
 * @param {boolean} [props.disabled=false] - Whether button is disabled
 * @param {boolean} [props.active=false] - Whether button is in active state
 * @param {string} [props.className] - Additional CSS classes
 * @param {Object} [props.style] - Inline styles for measurement-based positioning
 */
export const ToolButton = ({
  id,
  label,
  onClick,
  icon,
  priority = 3,
  disabled = false,
  active = false,
  className = '',
  style = {},
  ...props
}) => {
  const handleClick = (event) => {
    if (!disabled && onClick) {
      onClick(event);
    }
  };

  const handleKeyDown = (event) => {
    if ((event.key === 'Enter' || event.key === ' ') && !disabled) {
      event.preventDefault();
      onClick?.(event);
    }
  };

  const buttonClasses = [
    'tool-button',
    active ? 'tool-button--active' : '',
    disabled ? 'tool-button--disabled' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <button
      id={id}
      type="button"
      className={buttonClasses}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      style={style}
      data-priority={priority}
      aria-pressed={active}
      aria-label={label}
      {...props}
    >
      {icon && (
        <span className="tool-button__icon" aria-hidden="true">
          {/* Icon content will be populated by icon system */}
          {icon}
        </span>
      )}
      <span className="tool-button__label">
        {label}
      </span>
    </button>
  );
};

ToolButton.propTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  onClick: PropTypes.func,
  icon: PropTypes.string,
  priority: PropTypes.oneOf([1, 2, 3, 4]),
  disabled: PropTypes.bool,
  active: PropTypes.bool,
  className: PropTypes.string,
  style: PropTypes.object
};

export default ToolButton;