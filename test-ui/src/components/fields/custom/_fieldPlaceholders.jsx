/**
 * Field Placeholders
 * 
 * Placeholder implementations for complex field types.
 * These provide basic functionality while the full implementations are developed.
 */

import React from 'react';

// Basic placeholder component for complex fields
const PlaceholderField = ({ field, value, onChange, errorMessage, highlightInvalid }) => {
  const inputId = `field-${field.key}`;
  
  return (
    <>
      <label htmlFor={inputId} className="field-label">
        {field.label}
        {field.required && <span className="required-indicator">*</span>}
      </label>
      
      <div className="field-placeholder">
        <div style={{
          padding: 'var(--space-3)',
          border: '2px dashed var(--color-border)',
          borderRadius: 'var(--radius-2)',
          textAlign: 'center',
          color: 'var(--color-text-secondary)',
          fontSize: 'var(--font-size-sm)'
        }}>
          {field.type} field - Implementation pending
          <br />
          <small>Current value: {JSON.stringify(value)}</small>
        </div>
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
};

// JSON Field with comprehensive validation and formatting
export const JsonField = React.memo(({ field, value, onChange, disabled, highlightInvalid, errorMessage }) => {
  const [jsonError, setJsonError] = React.useState(null);
  const [showFormatted, setShowFormatted] = React.useState(true);
  
  // Convert value to string representation
  const getStringValue = React.useCallback(() => {
    if (typeof value === 'string') {
      return value;
    } else if (typeof value === 'object' && value !== null) {
      try {
        return JSON.stringify(value, null, 2);
      } catch (e) {
        return String(value);
      }
    }
    return value || '';
  }, [value]);

  const [textValue, setTextValue] = React.useState(() => getStringValue());

  // Update text value when prop value changes
  React.useEffect(() => {
    setTextValue(getStringValue());
  }, [getStringValue]);

  // Validate JSON and update parent
  const handleChange = React.useCallback((e) => {
    const newTextValue = e.target.value;
    setTextValue(newTextValue);
    
    // Clear previous JSON error
    setJsonError(null);
    
    // If empty, just pass through
    if (!newTextValue.trim()) {
      onChange('');
      return;
    }
    
    // Try to parse as JSON
    try {
      const parsed = JSON.parse(newTextValue);
      onChange(newTextValue); // Store as string for form handling
      setJsonError(null);
    } catch (error) {
      // Still update the form value so user can keep typing
      onChange(newTextValue);
      setJsonError(`Invalid JSON: ${error.message}`);
    }
  }, [onChange]);

  // Format JSON
  const formatJson = React.useCallback(() => {
    try {
      const parsed = JSON.parse(textValue);
      const formatted = JSON.stringify(parsed, null, 2);
      setTextValue(formatted);
      onChange(formatted);
      setJsonError(null);
      setShowFormatted(true);
    } catch (error) {
      setJsonError(`Cannot format invalid JSON: ${error.message}`);
    }
  }, [textValue, onChange]);

  // Minify JSON
  const minifyJson = React.useCallback(() => {
    try {
      const parsed = JSON.parse(textValue);
      const minified = JSON.stringify(parsed);
      setTextValue(minified);
      onChange(minified);
      setJsonError(null);
      setShowFormatted(false);
    } catch (error) {
      setJsonError(`Cannot minify invalid JSON: ${error.message}`);
    }
  }, [textValue, onChange]);

  const inputId = `field-${field.key}`;
  const hasError = Boolean(errorMessage || jsonError);
  const errorToShow = errorMessage || jsonError;
  
  return (
    <>
      <div className="json-field-header">
        <label htmlFor={inputId} className="field-label">
          {field.label}
          {field.required && <span className="required-indicator">*</span>}
        </label>
        
        <div className="json-field-controls">
          <button
            type="button"
            onClick={formatJson}
            disabled={disabled || !textValue.trim()}
            className="json-control-button"
            title="Format JSON"
          >
            Format
          </button>
          <button
            type="button"
            onClick={minifyJson}
            disabled={disabled || !textValue.trim()}
            className="json-control-button"
            title="Minify JSON"
          >
            Minify
          </button>
        </div>
      </div>
      
      <div className="json-field-container">
        <textarea
          id={inputId}
          name={field.key}
          value={textValue}
          placeholder={field.placeholder || '{\n  "key": "value"\n}'}
          disabled={disabled}
          required={field.required}
          rows={Math.max(8, Math.min(20, (textValue.match(/\n/g) || []).length + 3))}
          onChange={handleChange}
          className={`field-textarea field-textarea--json ${hasError ? 'field-textarea--invalid' : ''}`}
          spellCheck={false}
        />
        
        {jsonError && (
          <div className="json-validation-indicator json-validation-indicator--error">
            ❌ {jsonError}
          </div>
        )}
        
        {!jsonError && textValue.trim() && (
          <div className="json-validation-indicator json-validation-indicator--valid">
            ✅ Valid JSON
          </div>
        )}
      </div>
      
      {field.description && (
        <div id={`${inputId}-description`} className="field-description">
          {field.description}
        </div>
      )}
      
      {errorToShow && (
        <div id={`${inputId}-error`} className="field-error" role="alert">
          {errorToShow}
        </div>
      )}
    </>
  );
});

// FloatField with button-only interface (same as NumberField but with decimal precision)
export const FloatField = React.memo(({ field, value, onChange, disabled = false, highlightInvalid = false, errorMessage = null }) => {
  const floatValue = value !== null && value !== undefined ? Number(value) : 0.0;
  const step = field.step || 0.1;
  const min = field.min !== undefined ? Number(field.min) : undefined;
  const max = field.max !== undefined ? Number(field.max) : undefined;

  const handleDecrement = React.useCallback(() => {
    const newValue = Math.round((floatValue - step) * 100) / 100; // Round to 2 decimals
    if (min !== undefined && newValue < min) return;
    onChange(newValue);
  }, [floatValue, step, min, onChange]);

  const handleIncrement = React.useCallback(() => {
    const newValue = Math.round((floatValue + step) * 100) / 100; // Round to 2 decimals
    if (max !== undefined && newValue > max) return;
    onChange(newValue);
  }, [floatValue, step, max, onChange]);

  const inputId = `field-${field.key}`;
  const decrementDisabled = disabled || (min !== undefined && floatValue <= min);
  const incrementDisabled = disabled || (max !== undefined && floatValue >= max);
  
  return (
    <>
      <label htmlFor={inputId} className="field-label">
        {field.label}
        {field.required && <span className="required-indicator">*</span>}
      </label>
      
      <div className="number-field-container">
        <button
          type="button"
          onClick={handleDecrement}
          disabled={decrementDisabled}
          className="number-field-button number-field-decrement"
          aria-label={`Decrease ${field.label}`}
          tabIndex={disabled ? -1 : 0}
        >
          −
        </button>
        
        <input
          id={inputId}
          type="text"
          name={field.key}
          value={floatValue.toFixed(2)}
          readOnly
          disabled={disabled}
          required={field.required}
          className={`field-input number-field-display ${highlightInvalid ? 'field-input--invalid' : ''}`}
          aria-describedby={
            (field.description || errorMessage) 
              ? `${inputId}-description ${inputId}-error`.trim() 
              : undefined
          }
          aria-invalid={highlightInvalid}
          aria-label={`${field.label} value: ${floatValue.toFixed(2)}`}
          tabIndex={-1}
        />
        
        <button
          type="button"
          onClick={handleIncrement}
          disabled={incrementDisabled}
          className="number-field-button number-field-increment"
          aria-label={`Increase ${field.label}`}
          tabIndex={disabled ? -1 : 0}
        >
          +
        </button>
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

// Directory Field - Input field with file browser button
export const DirField = React.memo(({ field, value, onChange, disabled, highlightInvalid, errorMessage }) => {
  const handleInputChange = React.useCallback((e) => {
    onChange(e.target.value);
  }, [onChange]);

  const handleBrowseClick = React.useCallback(() => {
    // In a real implementation, this would open a directory picker dialog
    // For now, just show a placeholder message
    alert('Directory browser not yet implemented. Please type the path manually.');
  }, []);

  const inputId = `field-${field.key}`;
  
  return (
    <>
      <label htmlFor={inputId} className="field-label">
        {field.label}
        {field.required && <span className="required-indicator">*</span>}
      </label>
      
      <div className="dir-field-container">
        <input
          id={inputId}
          type="text"
          name={field.key}
          value={value || ''}
          placeholder={field.placeholder || '/path/to/directory'}
          disabled={disabled}
          required={field.required}
          onChange={handleInputChange}
          className={`field-input dir-field-input ${highlightInvalid ? 'field-input--invalid' : ''}`}
        />
        
        <button
          type="button"
          onClick={handleBrowseClick}
          disabled={disabled}
          className="dir-field-button"
          title="Browse for directory"
        >
          Browse...
        </button>
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

// Color List Field - Manage an array of color values
export const ColorListField = React.memo(({ field, value, onChange, disabled, highlightInvalid, errorMessage }) => {
  // Ensure value is always an array
  const colorList = React.useMemo(() => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string' && value.trim()) {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [value];
      } catch {
        return [value];
      }
    }
    return ['#000000']; // Default color
  }, [value]);

  const handleColorChange = React.useCallback((index, newColor) => {
    const newList = [...colorList];
    newList[index] = newColor;
    onChange(newList);
  }, [colorList, onChange]);

  const handleAddColor = React.useCallback(() => {
    const newList = [...colorList, '#000000'];
    onChange(newList);
  }, [colorList, onChange]);

  const handleRemoveColor = React.useCallback((index) => {
    if (colorList.length <= 1) return; // Keep at least one color
    const newList = colorList.filter((_, i) => i !== index);
    onChange(newList);
  }, [colorList, onChange]);

  // Validate color format (hex)
  const isValidColor = React.useCallback((color) => {
    return /^#[0-9A-Fa-f]{6}$/.test(color);
  }, []);

  const inputId = `field-${field.key}`;
  
  return (
    <>
      <label htmlFor={inputId} className="field-label">
        {field.label}
        {field.required && <span className="required-indicator">*</span>}
      </label>
      
      <div className="color-list-container">
        <div className="color-list-items">
          {colorList.map((color, index) => (
            <div key={index} className="color-list-item">
              <div 
                className="color-list-preview" 
                style={{ backgroundColor: isValidColor(color) ? color : '#cccccc' }}
                title={`Color preview: ${color}`}
              />
              
              <div className="color-list-input-container">
                <input
                  type="color"
                  value={isValidColor(color) ? color : '#000000'}
                  onChange={(e) => handleColorChange(index, e.target.value)}
                  disabled={disabled}
                  className="color-list-color-picker"
                  title="Choose color"
                />
                <input
                  type="text"
                  value={color}
                  onChange={(e) => handleColorChange(index, e.target.value)}
                  placeholder="#FF0000"
                  disabled={disabled}
                  className={`color-list-input ${!isValidColor(color) ? 'field-input--invalid' : ''}`}
                  pattern="^#[0-9A-Fa-f]{6}$"
                />
              </div>
              
              <button
                type="button"
                onClick={() => handleRemoveColor(index)}
                disabled={disabled || colorList.length <= 1}
                className="btn-primary color-list-remove"
                title="Remove color"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        
        <button
          type="button"
          onClick={handleAddColor}
          disabled={disabled}
          className="btn-primary color-list-add"
        >
          Add Color
        </button>
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

export const DirListField = React.memo((props) => (
  <PlaceholderField {...props} />
));

export const InstanceDropdownField = React.memo((props) => (
  <PlaceholderField {...props} />
));

export const InstancesField = React.memo((props) => (
  <PlaceholderField {...props} />
));

export const GDriveCustomField = React.memo((props) => (
  <PlaceholderField {...props} />
));

export const ReplacerCustomField = React.memo((props) => (
  <PlaceholderField {...props} />
));

export const UpgradinatorCustomField = React.memo((props) => (
  <PlaceholderField {...props} />
));

export const LabelarrCustomField = React.memo((props) => (
  <PlaceholderField {...props} />
));

export const GDrivePresetsField = React.memo((props) => (
  <PlaceholderField {...props} />
));

export const HolidayPresetsField = React.memo((props) => (
  <PlaceholderField {...props} />
));

export const HolidayScheduleField = React.memo((props) => (
  <PlaceholderField {...props} />
));

export const DirListDragDropField = React.memo((props) => (
  <PlaceholderField {...props} />
));

export const DirListOptionsField = React.memo((props) => (
  <PlaceholderField {...props} />
));