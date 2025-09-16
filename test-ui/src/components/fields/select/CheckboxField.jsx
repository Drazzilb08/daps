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
    <FieldWrapper invalid={highlightInvalid}>
      <div
        className={`checkbox-field flex items-start gap-3 p-3 rounded min-h-touch-comfortable cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${highlightInvalid ? 'border-red-500' : ''}`}
        onClick={handleClick}
      >
        <div className="checkbox-container">
          <input
            id={inputId}
            type="checkbox"
            name={field.key}
            checked={isChecked}
            disabled={disabled}
            required={field.required}
            onChange={() => {}} // Controlled by wrapper click
            className="checkbox-input"
          />
          <div className="checkbox-box">
            {isChecked && (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20,6 9,17 4,12"/>
              </svg>
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <FieldLabel
            htmlFor={inputId}
            label={field.label}
            required={field.required}
            className="cursor-pointer"
            onClick={(e) => e.preventDefault()} // Prevent double firing
          />

          <FieldDescription
            id={`${inputId}-desc`}
            description={field.description}
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