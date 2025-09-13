/**
 * ColorField Component
 * 
 * Color input field component using primitive composition.
 * Supports hex color input with native color picker integration.
 * Follows "write once, use everywhere" philosophy.
 */

import React, { useCallback } from 'react';
import { FieldWrapper, FieldLabel, FieldError, FieldDescription, InputBase } from '../primitives';

/**
 * ColorField component for color selection
 * 
 * Simple, intuitive design with native color picker on LEFT and text input on RIGHT.
 * Both inputs sync their values bidirectionally for seamless user experience.
 * 
 * @param {Object} props - Component props
 * @param {Object} props.field - Field configuration object
 * @param {string} props.value - Current field value (hex color)
 * @param {Function} props.onChange - Value change handler
 * @param {boolean} props.disabled - Field disabled state
 * @param {boolean} props.highlightInvalid - Show validation error state
 * @param {string} props.errorMessage - Error message to display
 */
export const ColorField = React.memo(({
  field,
  value,
  onChange,
  disabled = false,
  highlightInvalid = false,
  errorMessage = null
}) => {
  const handleTextChange = useCallback((e) => {
    const newValue = e.target.value;
    onChange(newValue);
  }, [onChange]);

  const handleColorChange = useCallback((e) => {
    const newValue = e.target.value;
    onChange(newValue);
  }, [onChange]);

  const inputId = `field-${field.key}`;
  const colorPickerId = `${inputId}-color`;
  
  // Ensure value is a valid hex color, default to black
  const displayValue = value || '#000000';
  const hexValue = displayValue.startsWith('#') ? displayValue : `#${displayValue}`;
  
  return (
    <FieldWrapper invalid={highlightInvalid}>
      <FieldLabel 
        htmlFor={inputId} 
        label={field.label} 
        required={field.required} 
      />
      
      <div className="color-field-input">
        <input
          id={colorPickerId}
          type="color"
          value={hexValue}
          onChange={handleColorChange}
          disabled={disabled}
          aria-label={`Color picker for ${field.label}`}
          className="color-field-picker"
          title={`Select color: ${hexValue}`}
        />
        
        <InputBase
          id={inputId}
          type="text"
          name={field.key}
          value={displayValue}
          placeholder={field.placeholder || '#000000'}
          disabled={disabled}
          required={field.required}
          pattern="^#?[0-9A-Fa-f]{6}$"
          maxLength={7}
          onChange={handleTextChange}
          invalid={highlightInvalid}
          aria-describedby={`${inputId}-desc ${inputId}-error`.trim()}
          aria-invalid={highlightInvalid}
          className="color-field-text"
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
});

ColorField.displayName = 'ColorField';

export default ColorField;