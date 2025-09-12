/**
 * DropdownField Component
 * 
 * Dropdown/select field using primitive composition.
 * Supports validation states, accessibility features, and custom styling.
 */

import React, { useCallback } from 'react';
import { FieldWrapper, FieldLabel, FieldError, FieldDescription } from '../primitives';

/**
 * DropdownField component for select input
 * 
 * @param {Object} props - Component props
 * @param {Object} props.field - Field configuration object
 * @param {string} props.value - Current field value
 * @param {Function} props.onChange - Value change handler
 * @param {boolean} props.disabled - Field disabled state
 * @param {boolean} props.highlightInvalid - Show validation error state
 * @param {string} props.errorMessage - Error message to display
 */
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
    <FieldWrapper invalid={highlightInvalid}>
      <FieldLabel 
        htmlFor={inputId} 
        label={field.label} 
        required={field.required} 
      />
      
      <div className="field-select-wrapper">
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
              ? `${inputId}-desc ${inputId}-error`.trim() 
              : undefined
          }
          aria-invalid={highlightInvalid}
        >
          {!field.required && <option value="">Select an option...</option>}
          {field.options && field.options.map((option, index) => {
            const optionValue = typeof option === 'string' ? option : option.value;
            const optionLabel = typeof option === 'string' ? option : option.label;
            return (
              <option key={optionValue || index} value={optionValue}>
                {optionLabel}
              </option>
            );
          })}
        </select>
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

DropdownField.displayName = 'DropdownField';