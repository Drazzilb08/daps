import { useId, useCallback } from 'react';
import { FieldWrapper } from '../primitives/FieldWrapper';
import { FieldLabel } from '../primitives/FieldLabel';
import { FieldDescription } from '../primitives/FieldDescription';
import { FieldError } from '../primitives/FieldError';
import { ColorField } from './ColorField';

/**
 * ColorListField Component - Manages an array of color values
 * 
 * Composed from ColorField components for consistent color input behavior.
 * Provides add/remove functionality for dynamic color list management.
 * Follows mobile-first design with touch-optimized controls.
 * 
 * @param {Object} props - Component props
 * @param {Object} props.field - Field configuration object
 * @param {string} props.field.key - Unique field identifier
 * @param {string} props.field.label - Display label for the field
 * @param {string} [props.field.description] - Help text description
 * @param {boolean} [props.field.required=false] - Whether field is required
 * @param {number} [props.field.minItems=0] - Minimum number of colors
 * @param {number} [props.field.maxItems] - Maximum number of colors
 * @param {string} [props.field.defaultColor='#000000'] - Default color for new items
 * @param {string} [props.field.addLabel='Add Color'] - Label for add button
 * @param {string} [props.field.removeLabel='Remove'] - Label for remove buttons
 * @param {Array<string>} props.value - Current array of color values
 * @param {Function} props.onChange - Value change handler, receives array of colors
 * @param {boolean} [props.highlightInvalid=false] - Whether to show validation errors
 * @param {string} [props.errorMessage] - Validation error message to display
 */
export const ColorListField = ({
  field,
  value,
  onChange,
  highlightInvalid = false,
  errorMessage,
  ...fieldProps
}) => {
  const inputId = useId();
  
  // Ensure value is always an array
  const colors = Array.isArray(value) ? value : [];
  
  const minItems = field.minItems ?? 0;
  const maxItems = field.maxItems;
  const defaultColor = field.defaultColor || '#000000';
  const addLabel = field.addLabel || 'Add Color';
  const removeLabel = field.removeLabel || 'Remove';
  
  // Add new color to the list
  const handleAddColor = useCallback(() => {
    if (maxItems && colors.length >= maxItems) return;
    
    const newColors = [...colors, defaultColor];
    onChange(newColors);
  }, [colors, onChange, maxItems, defaultColor]);
  
  // Remove color at specific index
  const handleRemoveColor = useCallback((index) => {
    if (colors.length <= minItems) return;
    
    const newColors = colors.filter((_, idx) => idx !== index);
    onChange(newColors);
  }, [colors, onChange, minItems]);
  
  // Update color at specific index
  const handleColorChange = useCallback((index, newColor) => {
    const newColors = [...colors];
    newColors[index] = newColor;
    onChange(newColors);
  }, [colors, onChange]);
  
  const canAdd = !maxItems || colors.length < maxItems;
  const canRemove = colors.length > minItems;
  
  return (
    <FieldWrapper 
      invalid={highlightInvalid} 
      className="color-list-field"
    >
      <FieldLabel
        htmlFor={inputId}
        label={field.label}
        required={field.required}
      />
      
      <div className="color-list-container">
        {colors.length === 0 && (
          <div className="color-list-empty">
            No colors added yet.
          </div>
        )}
        
        {colors.map((color, index) => (
          <div key={index} className="color-list-item">
            <div className="color-list-item-field">
              <ColorField
                field={{
                  ...field,
                  key: `${field.key}_${index}`,
                  label: `Color ${index + 1}`,
                  required: false,
                  defaultColor: defaultColor
                }}
                value={color}
                onChange={(newColor) => handleColorChange(index, newColor)}
                highlightInvalid={highlightInvalid}
                {...fieldProps}
              />
            </div>
            
            {canRemove && (
              <button
                type="button"
                onClick={() => handleRemoveColor(index)}
                className="color-list-remove-btn"
                aria-label={`${removeLabel} color ${index + 1}`}
              >
                <span aria-hidden="true">×</span>
              </button>
            )}
          </div>
        ))}
        
        {canAdd && (
          <button
            type="button"
            onClick={handleAddColor}
            className="color-list-add-btn"
            aria-label={addLabel}
          >
            <span className="color-list-add-icon" aria-hidden="true">+</span>
            {addLabel}
          </button>
        )}
      </div>
      
      {(minItems > 0 || maxItems) && (
        <div className="color-list-limits" aria-live="polite">
          {colors.length} of {maxItems ? `${minItems}-${maxItems}` : `${minItems}+`} colors
        </div>
      )}
      
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