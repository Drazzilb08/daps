/**
 * CheckboxField Component
 * 
 * Checkbox field using primitive composition with large clickable area.
 * The entire wrapper including label is clickable.
 */

import React, { useCallback } from 'react';
import { FieldWrapper, FieldLabel, FieldError, FieldDescription } from '../primitives';

/**
 * CheckboxField component for boolean input
 * 
 * @param {Object} props - Component props
 * @param {Object} props.field - Field configuration object
 * @param {boolean} props.value - Current field value
 * @param {Function} props.onChange - Value change handler
 * @param {boolean} props.disabled - Field disabled state
 * @param {boolean} props.highlightInvalid - Show validation error state
 * @param {string} props.errorMessage - Error message to display
 */
export const CheckboxField = React.memo(({
  field,
  value,
  onChange,
  disabled = false,
  highlightInvalid = false,
  errorMessage = null
}) => {
  const handleClick = useCallback(() => {
    if (disabled) return;
    onChange(!value);
  }, [onChange, value, disabled]);

  const inputId = `field-${field.key}`;
  const isChecked = Boolean(value);

  return (
    <FieldWrapper variant="checkbox" invalid={highlightInvalid}>
      <div
        className={`checkbox-field flex items-start gap-3 p-3 rounded min-h-touch-comfortable ${disabled ? 'checkbox-field--disabled' : ''} ${highlightInvalid ? 'checkbox-field--invalid' : ''}`}
        onClick={handleClick}
      >
        <div className="checkbox-field__input relative flex-shrink-0">
          <input
            id={inputId}
            type="checkbox"
            name={field.key}
            checked={isChecked}
            disabled={disabled}
            required={field.required}
            onChange={() => {}} // Controlled by wrapper click
            tabIndex={-1} // Use wrapper for keyboard navigation
            aria-hidden="true" // Screen readers use the wrapper
            className="absolute opacity-0 w-0 h-0"
          />
          <div className="checkbox-field__indicator field-base" aria-hidden="true">
            {isChecked && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20,6 9,17 4,12"/>
              </svg>
            )}
          </div>
        </div>

        <div className="checkbox-field__content flex-1 min-w-0">
          <FieldLabel
            htmlFor={inputId}
            label={field.label}
            required={field.required}
            className="checkbox-field__label"
            onClick={(e) => e.preventDefault()} // Prevent double firing
          />

          <FieldDescription
            id={`${inputId}-desc`}
            description={field.description}
            className="checkbox-field__description"
          />

          <FieldError
            id={`${inputId}-error`}
            message={errorMessage}
          />
        </div>
      </div>
    </FieldWrapper>
  );
});

CheckboxField.displayName = 'CheckboxField';

export default CheckboxField;