/**
 * NumberField Component
 * 
 * Number input field with +/- buttons only (no text input allowed).
 * Prevents text input and forces button-only interaction for better UX.
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
  const numValue = value !== null && value !== undefined ? Number(value) : 0;
  const step = field.step || 1;
  const min = field.min !== undefined ? Number(field.min) : undefined;
  const max = field.max !== undefined ? Number(field.max) : undefined;

  const handleInputChange = useCallback((e) => {
    const inputValue = e.target.value;
    
    // Allow empty string, digits, decimal point, and minus sign
    if (inputValue === '' || /^-?\d*\.?\d*$/.test(inputValue)) {
      // If it's a valid number, convert and validate bounds
      if (inputValue !== '' && !isNaN(inputValue)) {
        const newValue = Number(inputValue);
        if (min !== undefined && newValue < min) return;
        if (max !== undefined && newValue > max) return;
        onChange(newValue);
      } else if (inputValue === '') {
        onChange(null);
      } else {
        // Allow partial input (like "-" or "1." while typing)
        onChange(inputValue);
      }
    }
  }, [min, max, onChange]);

  const handleDecrement = useCallback(() => {
    const newValue = numValue - step;
    if (min !== undefined && newValue < min) return;
    onChange(newValue);
  }, [numValue, step, min, onChange]);

  const handleIncrement = useCallback(() => {
    const newValue = numValue + step;
    if (max !== undefined && newValue > max) return;
    onChange(newValue);
  }, [numValue, step, max, onChange]);

  const inputId = `field-${field.key}`;
  const decrementDisabled = disabled || (min !== undefined && numValue <= min);
  const incrementDisabled = disabled || (max !== undefined && numValue >= max);
  
  return (
    <>
      <label htmlFor={inputId} className="field-label">
        {field.label}
        {field.required && <span className="required-indicator">*</span>}
      </label>
      
      <div className="number-field-container">
        <button
          type="button"
          onClick={handleDecrement}
          disabled={decrementDisabled}
          className="number-field-button number-field-decrement"
          aria-label={`Decrease ${field.label}`}
          tabIndex={disabled ? -1 : 0}
        >
          −
        </button>
        
        <input
          id={inputId}
          type="text"
          name={field.key}
          value={typeof value === 'string' ? value : (numValue || '')}
          onChange={handleInputChange}
          disabled={disabled}
          required={field.required}
          className={`field-input number-field-display ${highlightInvalid ? 'field-input--invalid' : ''}`}
          aria-describedby={
            (field.description || errorMessage) 
              ? `${inputId}-description ${inputId}-error`.trim() 
              : undefined
          }
          aria-invalid={highlightInvalid}
          placeholder={field.placeholder}
        />
        
        <button
          type="button"
          onClick={handleIncrement}
          disabled={incrementDisabled}
          className="number-field-button number-field-increment"
          aria-label={`Increase ${field.label}`}
          tabIndex={disabled ? -1 : 0}
        >
          +
        </button>
      </div>
      
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