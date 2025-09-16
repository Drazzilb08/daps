/**
 * SelectBase Primitive Component
 *
 * Base select element with standardized styling and behavior.
 * Used by ALL selection-based field types for consistency.
 *
 * @param {Object} props - Component props
 * @param {string} props.id - Input ID for accessibility
 * @param {string} props.name - Input name attribute
 * @param {string} props.value - Current selected value
 * @param {Function} props.onChange - Change handler
 * @param {boolean} [props.disabled=false] - Disabled state
 * @param {boolean} [props.required=false] - Required field
 * @param {boolean} [props.invalid=false] - Invalid/error state
 * @param {Array} props.options - Array of option objects {value, label, disabled?}
 * @param {string} [props.placeholder] - Placeholder text
 * @param {string} [props.className=""] - Additional CSS classes
 * @param {string} [props.ariaDescribedby] - ARIA described by
 */
import React, { useCallback } from 'react';

export const SelectBase = React.memo(({
  id,
  name,
  value,
  onChange,
  disabled = false,
  required = false,
  invalid = false,
  options = [],
  placeholder,
  className = "",
  ariaDescribedby,
  ...rest
}) => {
  const handleChange = useCallback((e) => {
    onChange(e);
  }, [onChange]);

  const selectClasses = [
    'field-select',
    'field-input-base',
    'field-input-layout',
    'field-focus-behavior',
    'field-transition-behavior',
    'w-full',
    'touch-target',
    disabled ? 'field-disabled-state' : '',
    invalid ? 'is-invalid' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className="field-select-wrapper">
      <select
        id={id}
        name={name}
        value={value || ''}
        onChange={handleChange}
        disabled={disabled}
        required={required}
        className={selectClasses}
        aria-describedby={ariaDescribedby}
        aria-invalid={invalid}
        {...rest}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option, index) => (
          <option
            key={option.value || index}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label || option.value}
          </option>
        ))}
      </select>
    </div>
  );
});

SelectBase.displayName = 'SelectBase';