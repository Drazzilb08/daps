/**
 * PasswordField Component
 * 
 * Password input field with show/hide toggle functionality.
 * Follows standard field interface with additional security considerations.
 */

import React, { useState, useCallback } from 'react';

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
    <>
      <label htmlFor={inputId} className="field-label">
        {field.label}
        {field.required && <span className="required-indicator">*</span>}
      </label>
      
      <div className="field-input-group">
        <input
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
          className={`field-input field-input--password ${highlightInvalid ? 'field-input--invalid' : ''}`}
          aria-describedby={
            (field.description || errorMessage) 
              ? `${inputId}-description ${inputId}-error`.trim() 
              : undefined
          }
          aria-invalid={highlightInvalid}
          autoComplete="current-password"
        />
        
        {inputValue && (
          <button
            type="button"
            onClick={togglePasswordVisibility}
            disabled={disabled}
            className="field-input-addon"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            tabIndex={0}
          >
            {showPassword ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            )}
          </button>
        )}
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

PasswordField.displayName = 'PasswordField';

export default PasswordField;