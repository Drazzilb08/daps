/**
 * CheckboxField Component
 * 
 * Checkbox input field with custom styling and accessibility features.
 * Supports toggle switch mode and proper labeling.
 */

import React, { useCallback } from 'react';

/**
 * CheckboxField component for boolean input
 * 
 * @param {Object} props - Component props
 * @param {Object} props.field - Field configuration object
 * @param {boolean} props.value - Current field value
 * @param {Function} props.onChange - Value change handler
 * @param {boolean} props.disabled - Field disabled state
 * @param {boolean} props.highlightInvalid - Show validation error state
 * @param {string} props.errorMessage - Error message to display
 */
export const CheckboxField = React.memo(({
  field,
  value,
  onChange,
  disabled = false,
  highlightInvalid = false,
  errorMessage = null
}) => {
  const handleChange = useCallback((e) => {
    onChange(e.target.checked);
  }, [onChange]);

  const inputId = `field-${field.key}`;
  const isChecked = Boolean(value);
  
  // Check if field should render as toggle switch
  const isToggle = field.variant === 'toggle';
  
  return (
    <div className={`field-checkbox-wrapper ${disabled ? 'field-checkbox-wrapper--disabled' : ''}`}>
      <div className={`field-checkbox ${isToggle ? 'field-checkbox--toggle' : ''} ${highlightInvalid ? 'field-checkbox--invalid' : ''}`}>
        <input
          id={inputId}
          type="checkbox"
          name={field.key}
          checked={isChecked}
          disabled={disabled}
          required={field.required}
          onChange={handleChange}
          aria-describedby={
            (field.description || errorMessage) 
              ? `${inputId}-description ${inputId}-error`.trim() 
              : undefined
          }
          aria-invalid={highlightInvalid}
        />
        <span className="field-checkbox__indicator" aria-hidden="true"></span>
      </div>
      
      <div className="field-checkbox-content">
        <label htmlFor={inputId} className="field-checkbox-label">
          {field.label}
          {field.required && <span className="required-indicator">*</span>}
        </label>
        
        {field.description && (
          <div id={`${inputId}-description`} className="field-description">
            {field.description}
          </div>
        )}
        
        {errorMessage && (
          <div id={`${inputId}-error`} className="field-error" role="alert">
            {errorMessage}
          </div>
        )}
      </div>
    </div>
  );
});

CheckboxField.displayName = 'CheckboxField';

export default CheckboxField;