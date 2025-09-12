import { useId, useCallback, useState } from 'react';
import { FieldWrapper } from '../primitives/FieldWrapper';
import { FieldLabel } from '../primitives/FieldLabel';
import { FieldDescription } from '../primitives/FieldDescription';
import { FieldError } from '../primitives/FieldError';
import { InputBase } from '../primitives/InputBase';

/**
 * DirField Component - Directory path input with browse button
 * 
 * Composed from primitive components for consistent styling and behavior.
 * Provides text input for manual path entry with optional browse functionality.
 * Follows mobile-first design with 44px touch targets.
 * 
 * @param {Object} props - Component props
 * @param {Object} props.field - Field configuration object
 * @param {string} props.field.key - Unique field identifier
 * @param {string} props.field.label - Display label for the field
 * @param {string} [props.field.description] - Help text description
 * @param {boolean} [props.field.required=false] - Whether field is required
 * @param {string} [props.field.placeholder] - Input placeholder text
 * @param {boolean} [props.field.allowBrowse=true] - Show browse button
 * @param {string} [props.field.browseLabel='Browse'] - Label for browse button
 * @param {string} props.value - Current directory path value
 * @param {Function} props.onChange - Value change handler, receives path string
 * @param {boolean} [props.highlightInvalid=false] - Whether to show validation errors
 * @param {string} [props.errorMessage] - Validation error message to display
 */
export const DirField = ({
  field,
  value,
  onChange,
  highlightInvalid = false,
  errorMessage,
  ...fieldProps
}) => {
  const inputId = useId();
  const [isValidating, setIsValidating] = useState(false);
  
  const allowBrowse = field.allowBrowse !== false; // Default true
  const browseLabel = field.browseLabel || 'Browse';
  
  // Handle text input change
  const handleInputChange = useCallback((e) => {
    const newPath = e.target.value;
    onChange(newPath);
  }, [onChange]);
  
  // Handle browse button click
  const handleBrowse = useCallback(async () => {
    if (!window.electronAPI?.selectDirectory) {
      // Fallback for web environment - show file input
      const input = document.createElement('input');
      input.type = 'file';
      input.webkitdirectory = true;
      input.directory = true;
      
      input.onchange = (e) => {
        const files = e.target.files;
        if (files.length > 0) {
          // Get the directory path from the first file
          const firstFile = files[0];
          const pathParts = firstFile.webkitRelativePath.split('/');
          pathParts.pop(); // Remove filename
          const dirPath = pathParts.join('/');
          if (dirPath) {
            onChange(dirPath);
          }
        }
      };
      
      input.click();
      return;
    }
    
    try {
      setIsValidating(true);
      const result = await window.electronAPI.selectDirectory();
      if (result && !result.canceled && result.filePaths.length > 0) {
        onChange(result.filePaths[0]);
      }
    } catch (error) {
      console.error('Directory selection error:', error);
    } finally {
      setIsValidating(false);
    }
  }, [onChange]);
  
  return (
    <FieldWrapper 
      invalid={highlightInvalid} 
      className="dir-field"
    >
      <FieldLabel
        htmlFor={inputId}
        label={field.label}
        required={field.required}
      />
      
      <div className="dir-field-container">
        <InputBase
          id={inputId}
          type="text"
          value={value || ''}
          onChange={handleInputChange}
          placeholder={field.placeholder || '/path/to/directory'}
          className="dir-field-input"
          aria-describedby={errorMessage ? `${inputId}-error` : field.description ? `${inputId}-desc` : undefined}
          aria-invalid={highlightInvalid}
          {...fieldProps}
        />
        
        {allowBrowse && (
          <button
            type="button"
            onClick={handleBrowse}
            disabled={isValidating}
            className="dir-field-browse-btn"
            aria-label={`${browseLabel} for directory`}
          >
            {isValidating ? (
              <span className="dir-field-loading" aria-hidden="true">⏳</span>
            ) : (
              <span className="dir-field-browse-icon" aria-hidden="true">📁</span>
            )}
            {browseLabel}
          </button>
        )}
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