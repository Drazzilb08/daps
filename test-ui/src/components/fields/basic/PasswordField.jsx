/**
 * PasswordField Component
 * 
 * Password input field with show/hide toggle using primitive composition.
 * Follows standard field interface with additional security considerations.
 */

import React, { useState, useCallback } from 'react';
import { FieldWrapper, FieldLabel, FieldError, FieldDescription, InputBase } from '../primitives';

/**
 * PasswordField component for password input
 * 
 * @param {Object} props - Component props
 * @param {Object} props.field - Field configuration object
 * @param {string} props.value - Current field value
 * @param {Function} props.onChange - Value change handler
 * @param {boolean} props.disabled - Field disabled state
 * @param {boolean} props.highlightInvalid - Show validation error state
 * @param {string} props.errorMessage - Error message to display
 */
export const PasswordField = React.memo(({
  field,
  value,
  onChange,
  disabled = false,
  highlightInvalid = false,
  errorMessage = null
}) => {
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = useCallback((e) => {
    onChange(e.target.value);
  }, [onChange]);

  const togglePasswordVisibility = useCallback(() => {
    setShowPassword(prev => !prev);
  }, []);

  const inputId = `field-${field.key}`;
  const inputValue = value || '';
  
  return (
    <FieldWrapper invalid={highlightInvalid}>
      <FieldLabel 
        htmlFor={inputId} 
        label={field.label} 
        required={field.required} 
      />
      
      <div className="field-input-group">
        <InputBase
          id={inputId}
          type={showPassword ? 'text' : 'password'}
          name={field.key}
          value={inputValue}
          placeholder={field.placeholder}
          disabled={disabled}
          required={field.required}
          maxLength={field.maxLength}
          minLength={field.minLength}
          onChange={handleChange}
          className="field-input--password"
          invalid={highlightInvalid}
          autoComplete="current-password"
          aria-describedby={`${inputId}-desc ${inputId}-error`.trim()}
          aria-invalid={highlightInvalid}
        />
        
        <button
          type="button"
          onClick={togglePasswordVisibility}
          disabled={disabled}
          className="field-input-toggle"
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          tabIndex={0}
        >
          {showPassword ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
              <line x1="1" y1="1" x2="23" y2="23"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          )}
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

PasswordField.displayName = 'PasswordField';

export default PasswordField;