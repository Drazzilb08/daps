/**
 * TextareaField Component
 * 
 * Multi-line text input field using primitive composition.
 */

import React, { useCallback } from 'react';
import { FieldWrapper, FieldLabel, FieldError, FieldDescription, TextareaBase } from '../primitives';

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
  
  return (
    <FieldWrapper invalid={highlightInvalid}>
      <FieldLabel 
        htmlFor={inputId} 
        label={field.label} 
        required={field.required} 
      />
      <TextareaBase
        id={inputId}
        name={field.key}
        value={value || ''}
        placeholder={field.placeholder}
        disabled={disabled}
        required={field.required}
        maxLength={field.maxLength}
        minLength={field.minLength}
        rows={field.rows || 4}
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

TextareaField.displayName = 'TextareaField';