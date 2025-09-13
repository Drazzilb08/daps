/**
 * FloatField Component
 * 
 * Percentage input field with +/- buttons using primitive composition.
 * Displays percentages (0-100%) but stores as decimal (0-1).
 */

import React, { useCallback } from 'react';
import { FieldWrapper, FieldLabel, FieldError, FieldDescription, InputBase } from '../primitives';

export const FloatField = React.memo(({
  field,
  value,
  onChange,
  disabled = false,
  highlightInvalid = false,
  errorMessage = null
}) => {
  // Convert decimal (0-1) to percentage (0-100) for display
  const percentageValue = value !== null && value !== undefined ? Number(value) * 100 : 0;
  const step = field.step || 1;
  const min = field.min !== undefined ? Number(field.min) : undefined;
  const max = field.max !== undefined ? Number(field.max) : undefined;

  const handleInputChange = useCallback((e) => {
    const inputValue = e.target.value;
    
    // Allow empty string, digits, decimal point, and minus sign
    if (inputValue === '' || /^-?\d*\.?\d*$/.test(inputValue)) {
      // If it's a valid number, convert and validate bounds
      if (inputValue !== '' && !isNaN(inputValue)) {
        const newPercentValue = Number(inputValue);
        const percentMin = min !== undefined ? min : 0;
        const percentMax = max !== undefined ? max : 100;
        if (newPercentValue < percentMin) return;
        if (newPercentValue > percentMax) return;
        // Convert percentage to decimal (0-1) for storage
        onChange(newPercentValue / 100);
      } else if (inputValue === '') {
        onChange(null);
      } else {
        // Allow partial input (like "-" or "1." while typing)
        onChange(inputValue);
      }
    }
  }, [min, max, onChange]);

  const handleDecrement = useCallback(() => {
    const newPercentValue = percentageValue - step;
    const percentMin = min !== undefined ? min : 0;
    if (newPercentValue < percentMin) return;
    // Convert percentage to decimal (0-1) for storage
    onChange(newPercentValue / 100);
  }, [percentageValue, step, min, onChange]);

  const handleIncrement = useCallback(() => {
    const newPercentValue = percentageValue + step;
    const percentMax = max !== undefined ? max : 100;
    if (newPercentValue > percentMax) return;
    // Convert percentage to decimal (0-1) for storage
    onChange(newPercentValue / 100);
  }, [percentageValue, step, max, onChange]);

  const inputId = `field-${field.key}`;
  const percentMin = min !== undefined ? min : 0;
  const percentMax = max !== undefined ? max : 100;
  const decrementDisabled = disabled || percentageValue <= percentMin;
  const incrementDisabled = disabled || percentageValue >= percentMax;
  
  return (
    <FieldWrapper invalid={highlightInvalid}>
      <FieldLabel 
        htmlFor={inputId} 
        label={field.label} 
        required={field.required} 
      />
      
      <div className="number-field-container">
        <button
          type="button"
          onClick={handleDecrement}
          disabled={decrementDisabled}
          className="btn btn--secondary btn--small number-field-decrement"
          aria-label={`Decrease ${field.label}`}
          tabIndex={disabled ? -1 : 0}
        >
          −
        </button>
        
        <div className="number-field-input-wrapper">
          <InputBase
            id={inputId}
            type="text"
            name={field.key}
            value={typeof value === 'string' ? value : (percentageValue || '')}
            onChange={handleInputChange}
            disabled={disabled}
            required={field.required}
            placeholder={field.placeholder}
            invalid={highlightInvalid}
            className="number-field-display"
            aria-describedby={`${inputId}-desc ${inputId}-error`.trim()}
            aria-invalid={highlightInvalid}
          />
          <span className="number-field-suffix">%</span>
        </div>
        
        <button
          type="button"
          onClick={handleIncrement}
          disabled={incrementDisabled}
          className="btn btn--secondary btn--small number-field-increment"
          aria-label={`Increase ${field.label}`}
          tabIndex={disabled ? -1 : 0}
        >
          +
        </button>
      </div>
      
      <FieldDescription 
        id={`${inputId}-desc`} 
        description={field.description} 
      />
      <FieldError 
        id={`${inputId}-error`} 
        message={errorMessage} 
      />
    </FieldWrapper>
  );
});

FloatField.displayName = 'FloatField';