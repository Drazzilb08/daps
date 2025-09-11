/**
 * NumberField Component
 * 
 * Number input field with proper number handling and validation.
 */

import React, { useCallback } from 'react';

export const NumberField = React.memo(({
  field,
  value,
  onChange,
  disabled = false,
  highlightInvalid = false,
  errorMessage = null
}) => {
  const handleChange = useCallback((e) => {
    const numValue = e.target.value === '' ? null : Number(e.target.value);
    onChange(numValue);
  }, [onChange]);

  const inputId = `field-${field.key}`;
  const inputValue = value !== null && value !== undefined ? String(value) : '';
  
  return (
    <>
      <label htmlFor={inputId} className="field-label">
        {field.label}
        {field.required && <span className="required-indicator">*</span>}
      </label>
      
      <input
        id={inputId}
        type="number"
        name={field.key}
        value={inputValue}
        placeholder={field.placeholder}
        disabled={disabled}
        required={field.required}
        min={field.min}
        max={field.max}
        step="1"
        onChange={handleChange}
        className={`field-input field-input--number ${highlightInvalid ? 'field-input--invalid' : ''}`}
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

NumberField.displayName = 'NumberField';