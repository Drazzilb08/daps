/**
 * DropdownField Component
 * 
 * Dropdown/select field with options support.
 */

import React, { useCallback } from 'react';

export const DropdownField = React.memo(({
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
      
      <select
        id={inputId}
        name={field.key}
        value={inputValue}
        disabled={disabled}
        required={field.required}
        onChange={handleChange}
        className={`field-select ${highlightInvalid ? 'field-select--invalid' : ''}`}
        aria-describedby={
          (field.description || errorMessage) 
            ? `${inputId}-description ${inputId}-error`.trim() 
            : undefined
        }
        aria-invalid={highlightInvalid}
      >
        {!field.required && <option value="">Select an option...</option>}
        {field.options && field.options.map(option => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      
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

DropdownField.displayName = 'DropdownField';