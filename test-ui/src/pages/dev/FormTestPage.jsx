/**
 * Form Test Page - Comprehensive demonstration of DAPS form system
 * 
 * This page showcases all field types, validation, and form features.
 * Provides interactive testing for the complete form system.
 */

import React, { useState } from 'react';
import FormRenderer from '../../components/forms/FormRenderer.jsx';
import FieldRegistry from '../../components/fields/FieldRegistry.jsx';
import { SETTINGS_SCHEMA } from '../../utils/constants/settings_schema.js';
import { useToast } from '../../contexts/ToastContext.jsx';

const FormTestPage = () => {
  const toast = useToast();
  const [activeDemo, setActiveDemo] = useState('basic');
  const [formValues, setFormValues] = useState({});

  // Demo form schemas
  const basicFieldsSchema = {
    key: 'basic_demo',
    label: 'Basic Form Fields Demo',
    description: 'Demonstration of basic form field types with validation',
    fields: [
      {
        key: 'name',
        label: 'Full Name',
        type: 'text',
        required: true,
        placeholder: 'Enter your full name',
        description: 'Your first and last name',
        minLength: 2
      },
      {
        key: 'email',
        label: 'Email Address',
        type: 'text',
        required: true,
        placeholder: 'user@example.com',
        description: 'A valid email address',
        pattern: '^[^\s@]+@[^\s@]+\.[^\s@]+$',
        patternMessage: 'Please enter a valid email address'
      },
      {
        key: 'password',
        label: 'Password',
        type: 'password',
        required: true,
        placeholder: 'Enter secure password',
        description: 'At least 8 characters',
        minLength: 8
      },
      {
        key: 'age',
        label: 'Age',
        type: 'number',
        required: true,
        min: 0,
        max: 150,
        placeholder: '25',
        description: 'Your age in years'
      },
      {
        key: 'score',
        label: 'Score',
        type: 'float',
        required: false,
        min: 0.0,
        max: 100.0,
        placeholder: '85.5',
        description: 'Decimal number between 0 and 100'
      },
      {
        key: 'newsletter',
        label: 'Subscribe to Newsletter',
        type: 'check_box',
        description: 'Receive monthly updates via email'
      },
      {
        key: 'plan',
        label: 'Plan Type',
        type: 'dropdown',
        required: true,
        options: ['free', 'basic', 'premium', 'enterprise'],
        description: 'Choose your subscription plan'
      },
      {
        key: 'bio',
        label: 'Biography',
        type: 'textarea',
        required: false,
        placeholder: 'Tell us about yourself...',
        description: 'A brief description about yourself',
        rows: 4,
        maxLength: 500
      },
      {
        key: 'preferences',
        label: 'Preferences (JSON)',
        type: 'json',
        required: false,
        placeholder: '{\n  "theme": "dark",\n  "language": "en"\n}',
        description: 'Your app preferences in JSON format'
      }
    ]
  };

  const advancedFieldsSchema = {
    key: 'advanced_demo',
    label: 'Advanced Form Fields Demo',
    description: 'Demonstration of advanced and complex field types',
    fields: [
      {
        key: 'log_level',
        label: 'Log Level',
        type: 'dropdown',
        options: ['debug', 'info', 'warn', 'error'],
        required: true,
        description: 'Application logging verbosity level'
      },
      {
        key: 'config_dir',
        label: 'Configuration Directory',
        type: 'dir',
        required: true,
        description: 'Directory where configuration files are stored'
      },
      {
        key: 'data_dirs',
        label: 'Data Directories',
        type: 'dirlist',
        required: false,
        description: 'List of directories containing data files'
      },
      {
        key: 'theme_colors',
        label: 'Theme Colors',
        type: 'color_list',
        required: false,
        description: 'Custom color palette for the application theme'
      },
      {
        key: 'server_instances',
        label: 'Server Instances',
        type: 'instances',
        required: false,
        instance_types: ['web', 'api', 'database'],
        description: 'Configured server instances'
      }
    ]
  };

  // Real DAPS schema example
  const dapsSchema = SETTINGS_SCHEMA.find(module => module.key === 'general') || {
    key: 'daps_general',
    label: 'DAPS General Settings',
    description: 'General configuration for DAPS application',
    fields: [
      {
        key: 'log_level',
        label: 'Log Level',
        type: 'dropdown',
        options: ['debug', 'info', 'warn', 'error'],
        required: true,
        description: 'Set the logging verbosity for the application'
      }
    ]
  };

  const handleFormSubmit = async (values) => {
    console.log('Form submitted:', values);
    toast.success(`Form submitted successfully! Check console for values.`);
  };

  const handleFormChange = (values) => {
    setFormValues(values);
  };

  const registeredFieldTypes = FieldRegistry.getFieldTypes();

  return (
    <div className="form-test-page">
      <h1>🎛️ Form System Demonstration</h1>
      <p>
        Comprehensive testing interface for the DAPS schema-driven form system.
        This page demonstrates all field types, validation, and accessibility features.
      </p>

      {/* Form System Overview */}
      <section className="form-system-overview">
        <h2 className="form-overview-title">📋 Form System Overview</h2>
        <div className="form-overview-grid">
          <div className="field-category">
            <h4>Registered Field Types ({registeredFieldTypes.length})</h4>
            <div className="registered-field-types">
              {registeredFieldTypes.map(type => (
                <div key={type} className="field-type-item">
                  <code className="field-type-code">
                    {type}
                  </code>
                </div>
              ))}
            </div>
          </div>
          <div className="field-category">
            <h4>Form Features</h4>
            <ul className="form-features-list">
              <li>Schema-driven form generation</li>
              <li>Real-time validation</li>
              <li>Mobile-first responsive design</li>
              <li>WCAG 2.1 AA accessibility</li>
              <li>Custom field components</li>
              <li>Toast notifications</li>
              <li>Error boundary protection</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Form Demo Selector */}
      <section className="form-demo-section">
        <h2 className="form-demo-title">🎮 Interactive Form Demos</h2>
        <div className="demo-selector">
          <button 
            onClick={() => setActiveDemo('basic')}
            className={`demo-button ${activeDemo === 'basic' ? 'active' : ''}`}
          >
            Basic Fields
          </button>
          <button 
            onClick={() => setActiveDemo('advanced')}
            className={`demo-button ${activeDemo === 'advanced' ? 'active' : ''}`}
          >
            Advanced Fields
          </button>
          <button 
            onClick={() => setActiveDemo('daps')}
            className={`demo-button ${activeDemo === 'daps' ? 'active' : ''}`}
          >
            DAPS Schema
          </button>
        </div>

        {/* Current Form Values Display */}
        <div className="form-values-display">
          <h4 className="form-values-title">Current Form Values:</h4>
          <pre className="form-values-code">
            {JSON.stringify(formValues, null, 2)}
          </pre>
        </div>
      </section>

      {/* Active Form Demo */}
      <section className="form-demo-section">
        <div className="form-demo-container">
          {activeDemo === 'basic' && (
            <FormRenderer
              schema={basicFieldsSchema}
              initialValues={formValues}
              onSubmit={handleFormSubmit}
              onChange={handleFormChange}
              validateOnChange={true}
              submitText="Submit Basic Form"
            />
          )}
          
          {activeDemo === 'advanced' && (
            <FormRenderer
              schema={advancedFieldsSchema}
              initialValues={formValues}
              onSubmit={handleFormSubmit}
              onChange={handleFormChange}
              validateOnChange={true}
              submitText="Submit Advanced Form"
            />
          )}
          
          {activeDemo === 'daps' && (
            <FormRenderer
              schema={dapsSchema}
              initialValues={formValues}
              onSubmit={handleFormSubmit}
              onChange={handleFormChange}
              validateOnChange={true}
              submitText="Save DAPS Settings"
            />
          )}
        </div>
      </section>

      {/* Field Type Reference */}
      <section className="field-reference-section">
        <h2 className="field-reference-title">🔧 Field Type Reference</h2>
        <p className="field-reference-description">Documentation of available field types and their properties:</p>
        
        <div className="field-reference-grid">
          <div className="field-category">
            <h4>Basic Fields</h4>
            <ul className="field-type-list">
              <li><strong>text</strong> - Single line text input</li>
              <li><strong>password</strong> - Password input with show/hide</li>
              <li><strong>number</strong> - Integer number input</li>
              <li><strong>float</strong> - Decimal number input</li>
              <li><strong>check_box</strong> - Boolean checkbox</li>
              <li><strong>dropdown</strong> - Select from options</li>
              <li><strong>textarea</strong> - Multi-line text input</li>
            </ul>
          </div>
          
          <div className="field-category">
            <h4>Advanced Fields</h4>
            <ul className="field-type-list">
              <li><strong>json</strong> - JSON text editor with validation</li>
              <li><strong>dir</strong> - Directory path input</li>
              <li><strong>dirlist</strong> - List of directories</li>
              <li><strong>color_list</strong> - Color picker/manager</li>
              <li><strong>instances</strong> - Complex instance config</li>
            </ul>
          </div>
          
          <div className="field-category">
            <h4>DAPS Specific</h4>
            <ul className="field-type-list">
              <li><strong>gdrive_custom</strong> - Google Drive config</li>
              <li><strong>replacerr_custom</strong> - Holiday config</li>
              <li><strong>instances</strong> - Plex/Sonarr/Radarr instances</li>
              <li><strong>holiday_schedule</strong> - Holiday scheduling</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Mobile Testing Instructions */}
      <section className="mobile-testing-section">
        <h3 className="mobile-testing-title">📱 Mobile Testing</h3>
        <p className="mobile-testing-paragraph">
          <strong>Test responsive behavior:</strong> Resize your browser window to test mobile layouts (375px, 768px, 1024px+).
          All form fields should be touch-friendly with 44px minimum touch targets.
        </p>
        <p className="mobile-testing-paragraph">
          <strong>Accessibility testing:</strong> Use keyboard navigation (Tab, Enter, Space) and screen reader testing.
          All fields include proper labels, descriptions, and error messages.
        </p>
      </section>
    </div>
  );
};

export default FormTestPage;