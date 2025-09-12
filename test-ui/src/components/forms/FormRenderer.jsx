/**
 * FormRenderer - Schema-driven form generation system
 * 
 * Dynamically creates forms from JSON schemas using the compositional field architecture.
 * Provides comprehensive form state management, validation, and conditional rendering.
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { FieldRegistry } from '../fields/FieldRegistry';
import { FormValidator, useFieldValidation } from './FormValidator';
import { 
  parseFormSchema, 
  generateDefaultFormData,
  groupFieldsBySections,
  validateSchema 
} from '../../utils/forms/schemaUtils';

/**
 * Individual field renderer that connects schema field to registered component
 * 
 * @param {Object} props - Component props
 * @param {Object} props.field - Normalized field schema
 * @param {*} props.value - Current field value
 * @param {Function} props.onChange - Value change handler
 * @param {boolean} props.disabled - Field disabled state
 */
const FieldRenderer = React.memo(({ field, value, onChange, disabled }) => {
  const { error, hasError, markTouched } = useFieldValidation(field.key);
  
  // Get field component from registry
  const FieldComponent = FieldRegistry.getField(field.type);
  
  const handleChange = useCallback((newValue) => {
    markTouched();
    onChange(field.key, newValue);
  }, [field.key, onChange, markTouched]);
  
  const handleFocus = useCallback(() => {
    markTouched();
  }, [markTouched]);

  return (
    <div className="form-field" data-field-type={field.type} data-field-key={field.key}>
      <FieldComponent
        field={field}
        value={value}
        onChange={handleChange}
        onFocus={handleFocus}
        disabled={disabled || field.disabled}
        highlightInvalid={hasError}
        errorMessage={error}
      />
    </div>
  );
});

FieldRenderer.displayName = 'FieldRenderer';

/**
 * Form section renderer for grouped field layout
 * 
 * @param {Object} props - Component props
 * @param {Object} props.section - Section configuration
 * @param {Object} props.formData - Current form data
 * @param {Function} props.onFieldChange - Field change handler
 * @param {boolean} props.disabled - Form disabled state
 */
const FormSection = React.memo(({ section, formData, onFieldChange, disabled }) => {
  const [collapsed, setCollapsed] = useState(section.collapsed || false);
  
  const toggleCollapsed = useCallback(() => {
    setCollapsed(prev => !prev);
  }, []);

  if (!section.fields || section.fields.length === 0) {
    return null;
  }

  return (
    <div className="form-section" data-section-collapsible={section.collapsible}>
      {section.title && (
        <div className="form-section-header">
          {section.collapsible ? (
            <button 
              type="button"
              className="form-section-toggle"
              onClick={toggleCollapsed}
              aria-expanded={!collapsed}
            >
              <span className={`form-section-toggle-icon ${collapsed ? 'collapsed' : 'expanded'}`}>
                ▼
              </span>
              <h3 className="form-section-title">{section.title}</h3>
            </button>
          ) : (
            <h3 className="form-section-title">{section.title}</h3>
          )}
          {section.description && (
            <p className="form-section-description">{section.description}</p>
          )}
        </div>
      )}
      
      {(!section.collapsible || !collapsed) && (
        <div className="form-section-fields">
          {section.fields.map((field) => (
            <FieldRenderer
              key={field.key}
              field={field}
              value={formData[field.key]}
              onChange={onFieldChange}
              disabled={disabled}
            />
          ))}
        </div>
      )}
    </div>
  );
});

FormSection.displayName = 'FormSection';

/**
 * Form progress indicator
 * 
 * @param {Object} props - Component props
 * @param {number} props.totalFields - Total number of fields
 * @param {number} props.completedFields - Number of completed fields
 * @param {boolean} props.isValid - Form validation state
 */
const FormProgress = React.memo(({ totalFields, completedFields, isValid }) => {
  const percentage = totalFields > 0 ? Math.round((completedFields / totalFields) * 100) : 0;
  
  return (
    <div className="form-progress">
      <div className="form-progress-bar">
        <div 
          className={`form-progress-fill ${isValid ? 'valid' : 'invalid'}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="form-progress-text">
        {completedFields} of {totalFields} fields completed ({percentage}%)
      </div>
    </div>
  );
});

FormProgress.displayName = 'FormProgress';

/**
 * FormRenderer - Main schema-driven form component
 * 
 * @param {Object} props - Component props
 * @param {Object} props.schema - Form schema object
 * @param {Object} props.initialData - Initial form data
 * @param {Function} props.onSubmit - Form submission handler
 * @param {Function} props.onFieldChange - Individual field change handler
 * @param {Function} props.onValidationChange - Validation state change handler
 * @param {Object} props.validation - Custom validation rules
 * @param {boolean} props.disabled - Disable entire form
 * @param {Object} props.options - Form rendering options
 * @param {boolean} props.options.showProgress - Show progress indicator
 * @param {boolean} props.options.validateOnChange - Enable real-time validation
 * @param {boolean} props.options.mobileOptimized - Enable mobile optimizations
 * @param {string} props.className - Additional CSS classes
 */
export const FormRenderer = React.memo(({
  schema: rawSchema,
  initialData = {},
  onSubmit,
  onFieldChange,
  onValidationChange,
  validation = {},
  disabled = false,
  options = {},
  className = ''
}) => {
  // Parse and validate schema
  const schema = useMemo(() => {
    try {
      const parsed = parseFormSchema(rawSchema);
      const validation = validateSchema(parsed);
      
      if (!validation.isValid) {
        console.error('[FormRenderer] Schema validation failed:', validation.errors);
        throw new Error(`Invalid schema: ${validation.errors.join(', ')}`);
      }
      
      return parsed;
    } catch (error) {
      console.error('[FormRenderer] Schema parsing failed:', error);
      throw error;
    }
  }, [rawSchema]);

  // Initialize form data
  const [formData, setFormData] = useState(() => {
    const defaultData = generateDefaultFormData(schema);
    return { ...defaultData, ...initialData };
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // Form options with defaults
  const formOptions = {
    showProgress: false,
    validateOnChange: true,
    mobileOptimized: true,
    ...options
  };

  // Handle field value changes
  const handleFieldChange = useCallback((fieldKey, value) => {
    setFormData(prev => ({
      ...prev,
      [fieldKey]: value
    }));
    
    if (onFieldChange) {
      onFieldChange(fieldKey, value);
    }
  }, [onFieldChange]);

  // Handle form submission
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    if (disabled || isSubmitting) {
      return;
    }
    
    setIsSubmitting(true);
    setSubmitError(null);
    
    try {
      if (onSubmit) {
        await onSubmit(formData);
      }
    } catch (error) {
      console.error('[FormRenderer] Form submission failed:', error);
      setSubmitError(error.message || 'Form submission failed');
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, onSubmit, disabled, isSubmitting]);

  // Calculate form progress
  const progressData = useMemo(() => {
    const fields = Object.values(schema.fields || {});
    const totalFields = fields.length;
    const completedFields = fields.filter(field => {
      const value = formData[field.key];
      
      // Consider field completed if it has a non-empty value or is not required
      if (!field.required) return true;
      if (value === null || value === undefined) return false;
      if (typeof value === 'string') return value.trim().length > 0;
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === 'boolean') return true; // Booleans are always "complete"
      if (typeof value === 'number') return !isNaN(value);
      
      return Boolean(value);
    }).length;
    
    return { totalFields, completedFields };
  }, [schema.fields, formData]);

  // Group fields by sections
  const sections = useMemo(() => {
    return groupFieldsBySections(schema, formData);
  }, [schema, formData]);

  // Form CSS classes
  const formClasses = [
    'form-renderer',
    `form-layout-${schema.layout || 'vertical'}`,
    formOptions.mobileOptimized ? 'mobile-optimized' : '',
    disabled ? 'disabled' : '',
    isSubmitting ? 'submitting' : '',
    className
  ].filter(Boolean).join(' ');

  // Reset form data when initialData changes
  useEffect(() => {
    const defaultData = generateDefaultFormData(schema);
    setFormData({ ...defaultData, ...initialData });
  }, [initialData, schema]);

  if (!schema) {
    return (
      <div className="form-renderer-error">
        <h3>Form Configuration Error</h3>
        <p>The form schema is invalid or missing. Please check the configuration.</p>
      </div>
    );
  }

  return (
    <FormValidator
      schema={schema}
      formData={formData}
      onValidationChange={onValidationChange}
      validateOnChange={formOptions.validateOnChange}
      customValidators={validation}
    >
      <form className={formClasses} onSubmit={handleSubmit} noValidate>
        {/* Form header */}
        {schema.title && (
          <div className="form-header">
            <h2 className="form-title">{schema.title}</h2>
            {schema.description && (
              <p className="form-description">{schema.description}</p>
            )}
          </div>
        )}

        {/* Progress indicator */}
        {formOptions.showProgress && (
          <FormProgress
            totalFields={progressData.totalFields}
            completedFields={progressData.completedFields}
            isValid={!submitError}
          />
        )}

        {/* Form sections and fields */}
        <div className="form-content">
          {sections.map((section, index) => (
            <FormSection
              key={index}
              section={section}
              formData={formData}
              onFieldChange={handleFieldChange}
              disabled={disabled}
            />
          ))}
        </div>

        {/* Submit error display */}
        {submitError && (
          <div className="form-submit-error" role="alert">
            <strong>Submission Error:</strong> {submitError}
          </div>
        )}

        {/* Form actions */}
        <div className="form-actions">
          {onSubmit && (
            <button
              type="submit"
              className="form-submit-button"
              disabled={disabled || isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : (schema.submitLabel || 'Submit')}
            </button>
          )}
          
          {schema.cancelLabel && (
            <button
              type="button"
              className="form-cancel-button"
              disabled={isSubmitting}
              onClick={() => {
                // Reset to initial data
                const defaultData = generateDefaultFormData(schema);
                setFormData({ ...defaultData, ...initialData });
                setSubmitError(null);
              }}
            >
              {schema.cancelLabel}
            </button>
          )}
        </div>
      </form>
    </FormValidator>
  );
});

FormRenderer.displayName = 'FormRenderer';

/**
 * Hook for managing form state with schema
 * 
 * @param {Object} schema - Form schema
 * @param {Object} initialData - Initial form data
 * @returns {Object} Form state and handlers
 */
export const useFormRenderer = (schema, initialData = {}) => {
  const [formData, setFormData] = useState(() => {
    if (!schema) return initialData;
    const defaultData = generateDefaultFormData(parseFormSchema(schema));
    return { ...defaultData, ...initialData };
  });
  
  const [isValid, setIsValid] = useState(true);
  const [errors, setErrors] = useState({});

  const handleFieldChange = useCallback((fieldKey, value) => {
    setFormData(prev => ({
      ...prev,
      [fieldKey]: value
    }));
  }, []);

  const handleValidationChange = useCallback((validation) => {
    setIsValid(validation.isValid);
    setErrors(validation.errors);
  }, []);

  const reset = useCallback(() => {
    if (schema) {
      const defaultData = generateDefaultFormData(parseFormSchema(schema));
      setFormData({ ...defaultData, ...initialData });
    } else {
      setFormData(initialData);
    }
    setIsValid(true);
    setErrors({});
  }, [schema, initialData]);

  return {
    formData,
    isValid,
    errors,
    handleFieldChange,
    handleValidationChange,
    reset,
    setFormData
  };
};

export default FormRenderer;