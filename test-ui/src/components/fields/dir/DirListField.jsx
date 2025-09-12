import { useId, useCallback } from 'react';
import { FieldWrapper } from '../primitives/FieldWrapper';
import { FieldLabel } from '../primitives/FieldLabel';
import { FieldDescription } from '../primitives/FieldDescription';
import { FieldError } from '../primitives/FieldError';
import { DirField } from './DirField';

/**
 * DirListField Component - Manages an array of directory paths
 * 
 * Composed from DirField components for consistent directory input behavior.
 * Provides add/remove functionality for dynamic directory list management.
 * Follows mobile-first design with touch-optimized controls.
 * 
 * @param {Object} props - Component props
 * @param {Object} props.field - Field configuration object
 * @param {string} props.field.key - Unique field identifier
 * @param {string} props.field.label - Display label for the field
 * @param {string} [props.field.description] - Help text description
 * @param {boolean} [props.field.required=false] - Whether field is required
 * @param {number} [props.field.minItems=0] - Minimum number of directories
 * @param {number} [props.field.maxItems] - Maximum number of directories
 * @param {boolean} [props.field.allowBrowse=true] - Show browse buttons
 * @param {string} [props.field.addLabel='Add Directory'] - Label for add button
 * @param {string} [props.field.removeLabel='Remove'] - Label for remove buttons
 * @param {string} [props.field.browseLabel='Browse'] - Label for browse buttons
 * @param {Array<string>} props.value - Current array of directory paths
 * @param {Function} props.onChange - Value change handler, receives array of paths
 * @param {boolean} [props.highlightInvalid=false] - Whether to show validation errors
 * @param {string} [props.errorMessage] - Validation error message to display
 */
export const DirListField = ({
  field,
  value,
  onChange,
  highlightInvalid = false,
  errorMessage,
  ...fieldProps
}) => {
  const inputId = useId();
  
  // Ensure value is always an array
  const directories = Array.isArray(value) ? value : [];
  
  const minItems = field.minItems ?? 0;
  const maxItems = field.maxItems;
  const allowBrowse = field.allowBrowse !== false; // Default true
  const addLabel = field.addLabel || 'Add Directory';
  const removeLabel = field.removeLabel || 'Remove';
  const browseLabel = field.browseLabel || 'Browse';
  
  // Add new directory to the list
  const handleAddDirectory = useCallback(() => {
    if (maxItems && directories.length >= maxItems) return;
    
    const newDirectories = [...directories, ''];
    onChange(newDirectories);
  }, [directories, onChange, maxItems]);
  
  // Remove directory at specific index
  const handleRemoveDirectory = useCallback((index) => {
    if (directories.length <= minItems) return;
    
    const newDirectories = directories.filter((_, idx) => idx !== index);
    onChange(newDirectories);
  }, [directories, onChange, minItems]);
  
  // Update directory at specific index
  const handleDirectoryChange = useCallback((index, newPath) => {
    const newDirectories = [...directories];
    newDirectories[index] = newPath;
    onChange(newDirectories);
  }, [directories, onChange]);
  
  const canAdd = !maxItems || directories.length < maxItems;
  const canRemove = directories.length > minItems;
  
  return (
    <FieldWrapper 
      invalid={highlightInvalid} 
      className="dir-list-field"
    >
      <FieldLabel
        htmlFor={inputId}
        label={field.label}
        required={field.required}
      />
      
      <div className="dir-list-container">
        {directories.length === 0 && (
          <div className="dir-list-empty">
            No directories added yet.
          </div>
        )}
        
        {directories.map((directory, index) => (
          <div key={index} className="dir-list-item">
            <div className="dir-list-item-field">
              <DirField
                field={{
                  ...field,
                  key: `${field.key}_${index}`,
                  label: `Directory ${index + 1}`,
                  required: false,
                  allowBrowse: allowBrowse,
                  browseLabel: browseLabel
                }}
                value={directory}
                onChange={(newPath) => handleDirectoryChange(index, newPath)}
                highlightInvalid={highlightInvalid}
                {...fieldProps}
              />
            </div>
            
            {canRemove && (
              <button
                type="button"
                onClick={() => handleRemoveDirectory(index)}
                className="dir-list-remove-btn"
                aria-label={`${removeLabel} directory ${index + 1}`}
              >
                <span aria-hidden="true">×</span>
              </button>
            )}
          </div>
        ))}
        
        {canAdd && (
          <button
            type="button"
            onClick={handleAddDirectory}
            className="dir-list-add-btn"
            aria-label={addLabel}
          >
            <span className="dir-list-add-icon" aria-hidden="true">+</span>
            {addLabel}
          </button>
        )}
      </div>
      
      {(minItems > 0 || maxItems) && (
        <div className="dir-list-limits" aria-live="polite">
          {directories.length} of {maxItems ? `${minItems}-${maxItems}` : `${minItems}+`} directories
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