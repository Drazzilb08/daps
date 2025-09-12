import { useId, useCallback } from 'react';
import { FieldWrapper } from '../primitives/FieldWrapper';
import { FieldLabel } from '../primitives/FieldLabel';
import { FieldDescription } from '../primitives/FieldDescription';
import { FieldError } from '../primitives/FieldError';
import { InputBase } from '../primitives/InputBase';

/**
 * FloatField Component - Percentage input (0-100%) that maps to float values (0-1)
 * 
 * Composed from primitive components for consistent styling and behavior.
 * Displays percentage values but stores as decimal float values (0-1 range).
 * Follows mobile-first design with 44px touch targets.
 * 
 * @param {Object} props - Component props
 * @param {Object} props.field - Field configuration object
 * @param {string} props.field.key - Unique field identifier
 * @param {string} props.field.label - Display label for the field
 * @param {string} [props.field.description] - Help text description
 * @param {boolean} [props.field.required=false] - Whether field is required
 * @param {number} [props.field.min=0] - Minimum percentage value (default 0)
 * @param {number} [props.field.max=100] - Maximum percentage value (default 100)
 * @param {number} [props.field.step=1] - Step increment for percentage values
 * @param {string} [props.field.placeholder] - Input placeholder text
 * @param {number|string} props.value - Current field value as decimal (0-1) or string
 * @param {Function} props.onChange - Value change handler, receives decimal value (0-1)
 * @param {boolean} [props.highlightInvalid=false] - Whether to show validation errors
 * @param {string} [props.errorMessage] - Validation error message to display
 */
export const FloatField = ({
  field,
  value,
  onChange,
  highlightInvalid = false,
  errorMessage,
  ...fieldProps
}) => {
  const inputId = useId();
  
  // Convert decimal (0-1) to percentage (0-100) for display
  const percentValue = useCallback(() => {
    if (value === null || value === undefined || value === '') return '';
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(numValue) ? '' : Math.round(numValue * 100);
  }, [value]);
  
  // Convert percentage (0-100) to decimal (0-1) for storage
  const handleChange = useCallback((e) => {
    const percentValue = e.target.value;
    
    // Allow empty string for clearing the field
    if (percentValue === '') {
      onChange('');
      return;
    }
    
    const numPercent = parseFloat(percentValue);
    if (!isNaN(numPercent)) {
      // Convert percentage to decimal (0-1 range)
      const decimalValue = numPercent / 100;
      onChange(decimalValue);
    }
  }, [onChange]);
  
  const min = field.min ?? 0;
  const max = field.max ?? 100;
  const step = field.step ?? 1;
  
  return (
    <FieldWrapper 
      invalid={highlightInvalid} 
      className="float-field"
    >
      <FieldLabel
        htmlFor={inputId}
        label={field.label}
        required={field.required}
      />
      
      <div className="float-field-container">
        <InputBase
          id={inputId}
          type="number"
          value={percentValue()}
          onChange={handleChange}
          min={min}
          max={max}
          step={step}
          placeholder={field.placeholder}
          aria-describedby={errorMessage ? `${inputId}-error` : field.description ? `${inputId}-desc` : undefined}
          aria-invalid={highlightInvalid}
          {...fieldProps}
        />
        <span className="float-field-suffix" aria-hidden="true">%</span>
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
};