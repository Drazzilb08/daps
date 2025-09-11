/**
 * TextField Component
 * 
 * Basic text input field component following the standard field interface.
 * Supports placeholder text, validation states, and accessibility features.
 */

import React, { useCallback } from 'react';

/**
 * TextField component for text input
 * 
 * @param {Object} props - Component props
 * @param {Object} props.field - Field configuration object
 * @param {string} props.value - Current field value
 * @param {Function} props.onChange - Value change handler
 * @param {boolean} props.disabled - Field disabled state
 * @param {boolean} props.highlightInvalid - Show validation error state
 * @param {string} props.errorMessage - Error message to display
 */
export const TextField = React.memo(({
  field,
  value,
  onChange,
  disabled = false,
  highlightInvalid = false,
  errorMessage = null
}) => {
  const handleChange = useCallback((e) => {
    onChange(e.target.value);
  }, [onChange]);

  const inputId = `field-${field.key}`;
  const inputValue = value || '';
  
  return (
    <>
      <label htmlFor={inputId} className="field-label">
        {field.label}
        {field.required && <span className="required-indicator">*</span>}
      </label>
      
      <input
        id={inputId}
        type="text"
        name={field.key}
        value={inputValue}
        placeholder={field.placeholder}
        disabled={disabled}
        required={field.required}
        maxLength={field.maxLength}
        minLength={field.minLength}
        pattern={field.pattern}
        onChange={handleChange}
        className={`field-input ${highlightInvalid ? 'field-input--invalid' : ''}`}
        aria-describedby={
          (field.description || errorMessage) 
            ? `${inputId}-description ${inputId}-error`.trim() 
            : undefined
        }
        aria-invalid={highlightInvalid}
      />
      
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
    </>
  );
});

TextField.displayName = 'TextField';

export default TextField;