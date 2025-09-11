/**
 * TextareaField Component
 * 
 * Multi-line text input field with auto-resize support.
 */

import React, { useCallback } from 'react';

export const TextareaField = React.memo(({
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
      
      <textarea
        id={inputId}
        name={field.key}
        value={inputValue}
        placeholder={field.placeholder}
        disabled={disabled}
        required={field.required}
        maxLength={field.maxLength}
        minLength={field.minLength}
        rows={field.rows || 4}
        onChange={handleChange}
        className={`field-textarea ${highlightInvalid ? 'field-textarea--invalid' : ''}`}
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

TextareaField.displayName = 'TextareaField';