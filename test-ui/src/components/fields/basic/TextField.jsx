/**
 * TextField Component
 * 
 * Basic text input field component using primitive composition.
 * Supports placeholder text, validation states, and accessibility features.
 */

import React, { useCallback } from 'react';
import { FieldWrapper, FieldLabel, FieldError, FieldDescription, InputBase } from '../primitives';

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
  
  return (
    <FieldWrapper invalid={highlightInvalid}>
      <FieldLabel 
        htmlFor={inputId} 
        label={field.label} 
        required={field.required} 
      />
      <InputBase
        id={inputId}
        type="text"
        name={field.key}
        value={value || ''}
        placeholder={field.placeholder}
        disabled={disabled}
        required={field.required}
        maxLength={field.maxLength}
        minLength={field.minLength}
        pattern={field.pattern}
        onChange={handleChange}
        invalid={highlightInvalid}
        aria-describedby={`${inputId}-desc ${inputId}-error`.trim()}
        aria-invalid={highlightInvalid}
      />
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

TextField.displayName = 'TextField';

export default TextField;