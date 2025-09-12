import { useId, useCallback } from 'react';
import { FieldWrapper } from '../primitives/FieldWrapper';
import { FieldLabel } from '../primitives/FieldLabel';
import { FieldDescription } from '../primitives/FieldDescription';
import { FieldError } from '../primitives/FieldError';
import { InputBase } from '../primitives/InputBase';

/**
 * ColorField Component - Color picker input with hex value support
 * 
 * Composed from primitive components for consistent styling and behavior.
 * Provides both visual color picker and text input for hex values.
 * Follows mobile-first design with 44px touch targets.
 * 
 * @param {Object} props - Component props
 * @param {Object} props.field - Field configuration object
 * @param {string} props.field.key - Unique field identifier
 * @param {string} props.field.label - Display label for the field
 * @param {string} [props.field.description] - Help text description
 * @param {boolean} [props.field.required=false] - Whether field is required
 * @param {string} [props.field.placeholder] - Input placeholder text
 * @param {string} [props.field.defaultColor='#000000'] - Default color value
 * @param {string} props.value - Current color value (hex format)
 * @param {Function} props.onChange - Value change handler, receives hex color string
 * @param {boolean} [props.highlightInvalid=false] - Whether to show validation errors
 * @param {string} [props.errorMessage] - Validation error message to display
 */
export const ColorField = ({
  field,
  value,
  onChange,
  highlightInvalid = false,
  errorMessage,
  ...fieldProps
}) => {
  const inputId = useId();
  const colorPickerId = `${inputId}-picker`;
  
  // Ensure valid hex color format
  const normalizeColorValue = useCallback((colorValue) => {
    if (!colorValue) return field.defaultColor || '#000000';
    if (typeof colorValue !== 'string') return field.defaultColor || '#000000';
    
    // Ensure hex format with #
    const hex = colorValue.startsWith('#') ? colorValue : `#${colorValue}`;
    
    // Basic hex validation (3 or 6 digits after #)
    const hexPattern = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;
    return hexPattern.test(hex) ? hex : field.defaultColor || '#000000';
  }, [field.defaultColor]);
  
  const colorValue = normalizeColorValue(value);
  
  // Handle color picker change
  const handleColorPickerChange = useCallback((e) => {
    const newColor = e.target.value;
    onChange(newColor);
  }, [onChange]);
  
  // Handle text input change
  const handleTextChange = useCallback((e) => {
    const newColor = e.target.value;
    onChange(newColor);
  }, [onChange]);
  
  return (
    <FieldWrapper 
      invalid={highlightInvalid} 
      className="color-field"
    >
      <FieldLabel
        htmlFor={inputId}
        label={field.label}
        required={field.required}
      />
      
      <div className="color-field-container">
        <div className="color-field-picker-wrapper">
          <input
            id={colorPickerId}
            type="color"
            value={colorValue}
            onChange={handleColorPickerChange}
            className="color-field-picker"
            aria-label={`${field.label} color picker`}
            {...fieldProps}
          />
          <label 
            htmlFor={colorPickerId}
            className="color-field-picker-label"
            style={{ backgroundColor: colorValue }}
            aria-hidden="true"
          />
        </div>
        
        <InputBase
          id={inputId}
          type="text"
          value={value || ''}
          onChange={handleTextChange}
          placeholder={field.placeholder || '#000000'}
          pattern="^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$"
          maxLength={7}
          className="color-field-text"
          aria-describedby={errorMessage ? `${inputId}-error` : field.description ? `${inputId}-desc` : undefined}
          aria-invalid={highlightInvalid}
          {...fieldProps}
        />
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