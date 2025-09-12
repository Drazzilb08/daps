/**
 * FormTestPage - Comprehensive demonstration of schema-driven form system
 * 
 * Shows the full power of the compositional architecture with:
 * - Multiple form examples
 * - All field types in action
 * - Validation scenarios
 * - Performance monitoring
 * - Mobile responsiveness
 */

import React, { useState, useCallback, useMemo } from 'react';
import { FormRenderer, useFormRenderer } from '../../components/forms/FormRenderer';
import { FieldRegistry } from '../../components/fields/FieldRegistry';
import { 
  basicFormSchema,
  comprehensiveFieldSchema,
  conditionalFieldsSchema,
  validationShowcaseSchema
} from '../../data/schemas/formDemoSchemas';

/**
 * Performance monitor component
 */
const PerformanceMonitor = React.memo(({ label, startTime }) => {
  const renderTime = useMemo(() => {
    return performance.now() - startTime;
  }, [startTime]);

  return (
    <div className="performance-monitor">
      <small className="performance-label">{label}: </small>
      <span className="performance-time">{renderTime.toFixed(2)}ms</span>
    </div>
  );
});

PerformanceMonitor.displayName = 'PerformanceMonitor';

/**
 * Form example component with result display
 */
const FormExample = React.memo(({ 
  title, 
  description, 
  schema, 
  initialData = {}, 
  showJson = false,
  showPerformance = false 
}) => {
  const [startTime] = useState(() => performance.now());
  const [submitResult, setSubmitResult] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  
  const {
    formData,
    isValid,
    errors,
    handleFieldChange,
    handleValidationChange,
    reset
  } = useFormRenderer(schema, initialData);

  const handleSubmit = useCallback(async (data) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setSubmitResult({
      success: true,
      timestamp: new Date().toISOString(),
      data: data
    });
  }, []);

  const toggleExpanded = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  const clearResult = useCallback(() => {
    setSubmitResult(null);
  }, []);

  const validFieldCount = useMemo(() => {
    return Object.keys(formData).filter(key => {
      const value = formData[key];
      return value !== null && value !== undefined && value !== '';
    }).length;
  }, [formData]);

  return (
    <div className="form-example">
      <div className="form-example-header">
        <h3 className="form-example-title">{title}</h3>
        <p className="form-example-description">{description}</p>
        
        {showPerformance && (
          <div className="form-example-performance">
            <PerformanceMonitor label="Initial Render" startTime={startTime} />
            <div className="form-stats">
              <span>Fields: {Object.keys(schema.fields || {}).length}</span>
              <span>Completed: {validFieldCount}</span>
              <span>Valid: {isValid ? 'Yes' : 'No'}</span>
              <span>Errors: {Object.keys(errors).length}</span>
            </div>
          </div>
        )}
        
        <div className="form-example-controls">
          <button 
            onClick={toggleExpanded}
            className="form-example-toggle"
            aria-expanded={isExpanded}
          >
            {isExpanded ? 'Collapse' : 'Expand'} Example
          </button>
          {showJson && (
            <button onClick={clearResult} className="clear-result-button">
              Clear Result
            </button>
          )}
          <button onClick={reset} className="reset-form-button">
            Reset Form
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="form-example-content">
          <div className="form-example-container">
            <FormRenderer
              schema={schema}
              initialData={initialData}
              onSubmit={handleSubmit}
              onFieldChange={handleFieldChange}
              onValidationChange={handleValidationChange}
              options={{
                showProgress: true,
                validateOnChange: true,
                mobileOptimized: true
              }}
            />
          </div>

          {(submitResult || showJson) && (
            <div className="form-example-results">
              {submitResult && (
                <div className="submit-result success">
                  <h4>✅ Form Submitted Successfully!</h4>
                  <p>Submitted at: {new Date(submitResult.timestamp).toLocaleString()}</p>
                </div>
              )}
              
              {showJson && (
                <div className="json-display">
                  <h4>Current Form Data:</h4>
                  <pre className="json-content">
                    {JSON.stringify(formData, null, 2)}
                  </pre>
                  
                  {Object.keys(errors).length > 0 && (
                    <>
                      <h4>Validation Errors:</h4>
                      <pre className="json-content error">
                        {JSON.stringify(errors, null, 2)}
                      </pre>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

FormExample.displayName = 'FormExample';

/**
 * Field Registry Overview Component
 */
const FieldRegistryOverview = React.memo(() => {
  const [isExpanded, setIsExpanded] = useState(false);
  const fieldTypes = FieldRegistry.getFieldTypes();
  
  const toggleExpanded = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  const fieldCategories = useMemo(() => {
    const categories = {
      'Basic Input': ['text', 'password', 'number', 'float', 'textarea', 'hidden'],
      'Selection': ['check_box', 'dropdown', 'multi_select', 'radio'],
      'Visual': ['color', 'color_list'],
      'File/Directory': ['dir', 'dir_list', 'dirlist', 'dirlist_dragdrop', 'dirlist_options'],
      'Custom/Advanced': ['json', 'instance_dropdown', 'instances'],
      'Legacy/Specialized': [
        'gdrive_custom', 'replacerr_custom', 'upgradinatorr_custom', 
        'labelarr_custom', 'gdrive_presets', 'holiday_presets', 'holiday_schedule'
      ]
    };
    
    return Object.entries(categories).map(([category, types]) => ({
      category,
      types: types.filter(type => fieldTypes.includes(type)),
      count: types.filter(type => fieldTypes.includes(type)).length
    }));
  }, [fieldTypes]);

  return (
    <div className="field-registry-overview">
      <div className="overview-header">
        <h3>Field Registry Overview</h3>
        <p>Compositional field system with {fieldTypes.length} registered field types</p>
        <button 
          onClick={toggleExpanded}
          className="overview-toggle"
          aria-expanded={isExpanded}
        >
          {isExpanded ? 'Hide' : 'Show'} Field Types
        </button>
      </div>
      
      {isExpanded && (
        <div className="field-categories">
          {fieldCategories.map(({ category, types, count }) => (
            <div key={category} className="field-category">
              <h4 className="category-title">
                {category} ({count})
              </h4>
              <div className="field-type-list">
                {types.map(type => (
                  <span key={type} className="field-type-badge">
                    {type}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

FieldRegistryOverview.displayName = 'FieldRegistryOverview';

/**
 * Main FormTestPage Component
 */
const FormTestPage = () => {
  const [selectedTheme, setSelectedTheme] = useState('system');
  
  const handleThemeChange = useCallback((theme) => {
    setSelectedTheme(theme);
    // Apply theme (this would integrate with your theme system)
    document.documentElement.setAttribute('data-theme', theme);
  }, []);

  return (
    <div className="form-test-page">
      <div className="page-header">
        <h1>Schema-Driven Form System</h1>
        <p className="page-subtitle">
          Phase 4: Complete demonstration of compositional form architecture
        </p>
        
        <div className="page-controls">
          <div className="theme-selector">
            <label htmlFor="theme-select">Theme:</label>
            <select 
              id="theme-select"
              value={selectedTheme}
              onChange={(e) => handleThemeChange(e.target.value)}
            >
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
        </div>
      </div>

      <div className="page-content">
        {/* Field Registry Overview */}
        <section className="page-section">
          <FieldRegistryOverview />
        </section>

        {/* Form Examples */}
        <section className="page-section">
          <h2>Form Examples</h2>
          <p>Each example demonstrates different aspects of the schema-driven system:</p>
          
          <div className="form-examples">
            <FormExample
              title="1. Basic Registration Form"
              description="Simple form with common field types and validation"
              schema={basicFormSchema}
              initialData={{}}
              showJson={false}
              showPerformance={true}
            />

            <FormExample
              title="2. Comprehensive Field Showcase"
              description="All available field types with sections and progress indicator"
              schema={comprehensiveFieldSchema}
              initialData={{
                basicText: "Sample text",
                colorField: "#3498db"
              }}
              showJson={true}
              showPerformance={true}
            />

            <FormExample
              title="3. Conditional Dynamic Form"
              description="Fields that appear/disappear based on user selections"
              schema={conditionalFieldsSchema}
              initialData={{
                userType: "business"
              }}
              showJson={true}
              showPerformance={false}
            />

            <FormExample
              title="4. Advanced Validation Showcase"
              description="Complex validation rules including async validation"
              schema={validationShowcaseSchema}
              initialData={{}}
              showJson={true}
              showPerformance={false}
            />
          </div>
        </section>

        {/* Architecture Benefits */}
        <section className="page-section">
          <h2>Compositional Architecture Benefits</h2>
          <div className="benefits-grid">
            <div className="benefit-card">
              <h3>🔧 Write Once, Use Everywhere</h3>
              <p>
                Field components are created once and reused across all forms. 
                Changes to field behavior automatically apply everywhere.
              </p>
            </div>
            
            <div className="benefit-card">
              <h3>📋 Schema-Driven Generation</h3>
              <p>
                Forms are generated dynamically from JSON schemas. 
                No manual form building - just define the structure.
              </p>
            </div>
            
            <div className="benefit-card">
              <h3>✅ Comprehensive Validation</h3>
              <p>
                Built-in validation engine with field-level and form-level rules.
                Support for async validation and custom validators.
              </p>
            </div>
            
            <div className="benefit-card">
              <h3>📱 Mobile-First Responsive</h3>
              <p>
                All forms automatically work on mobile devices with 
                touch-optimized controls and responsive layouts.
              </p>
            </div>
            
            <div className="benefit-card">
              <h3>🎨 Design System Integration</h3>
              <p>
                Perfect integration with DAPS design tokens and themes.
                Consistent styling across all form components.
              </p>
            </div>
            
            <div className="benefit-card">
              <h3>⚡ Performance Optimized</h3>
              <p>
                React.memo, useCallback, and useMemo throughout.
                Efficient re-rendering and memory usage.
              </p>
            </div>
          </div>
        </section>

        {/* Integration Examples */}
        <section className="page-section">
          <h2>DAPS Integration Examples</h2>
          <div className="integration-examples">
            <div className="integration-card">
              <h3>Settings Configuration</h3>
              <p>
                DAPS modules can define their settings as schemas, and the 
                form system automatically generates the configuration UI.
              </p>
              <pre className="code-example">{`
// Module provides schema
const moduleSchema = {
  fields: {
    enabled: { type: "check_box", label: "Enable Module" },
    apiKey: { type: "password", label: "API Key", required: true },
    maxRetries: { type: "number", label: "Max Retries", default: 3 }
  }
};

// Form system generates UI automatically
<FormRenderer schema={moduleSchema} onSubmit={saveConfig} />
              `}</pre>
            </div>
            
            <div className="integration-card">
              <h3>Search Interface</h3>
              <p>
                Search plugins define their filter schemas, and the search 
                interface automatically generates the appropriate controls.
              </p>
              <pre className="code-example">{`
// Search plugin defines filters
const searchFilters = {
  fields: {
    genre: { type: "multi_select", options: genreOptions },
    year: { type: "number", min: 1900, max: 2024 },
    rating: { type: "dropdown", options: ratingOptions }
  }
};
              `}</pre>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default FormTestPage;