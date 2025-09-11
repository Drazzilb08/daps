/**
 * DAPS Settings Page - Real Settings Configuration
 * 
 * This page renders the actual DAPS settings using the SETTINGS_SCHEMA.
 * Each module section is rendered as a separate form using FormRenderer.
 * Tests the complete field system with real DAPS configuration data.
 */

import React, { useState, useCallback } from 'react';
import { SETTINGS_SCHEMA } from '../../utils/constants/settings_schema.js';
import { FormRenderer } from '../../components/forms/FormRenderer.jsx';
import { useToast } from '../../contexts/ToastContext.jsx';

/**
 * Settings section component for each module
 */
const SettingsSection = React.memo(({ section, isExpanded, onToggle }) => {
  const toast = useToast();
  
  // Mock initial values for testing
  const getInitialValues = useCallback((fields) => {
    const values = {};
    
    fields.forEach(field => {
      switch (field.type) {
        case 'dropdown':
          values[field.key] = field.options?.[0] || '';
          break;
        case 'check_box':
          values[field.key] = false;
          break;
        case 'number':
        case 'float':
          values[field.key] = null;
          break;
        case 'json':
          values[field.key] = field.placeholder || '{}';
          break;
        case 'color_list':
          values[field.key] = ['#FF0000', '#00FF00', '#0000FF'];
          break;
        case 'instances':
          values[field.key] = [];
          break;
        case 'gdrive_custom':
          values[field.key] = [];
          break;
        case 'dir':
          values[field.key] = '/path/to/directory';
          break;
        case 'dirlist':
          values[field.key] = ['/path/to/dir1', '/path/to/dir2'];
          break;
        default:
          values[field.key] = field.placeholder || '';
      }
    });
    
    return values;
  }, []);
  
  const [formValues, setFormValues] = useState(() => 
    getInitialValues(section.fields || [])
  );
  
  const handleFormSubmit = useCallback((values) => {
    console.log(`[${section.key}] Form submitted:`, values);
    toast.success(`${section.label} settings saved successfully!`);
  }, [section, toast]);
  
  const handleFormChange = useCallback((values) => {
    setFormValues(values);
    // Uncomment for debugging
    // console.log(`[${section.key}] Form changed:`, values);
  }, [section]);
  
  // Skip sections with no fields
  if (!section.fields || section.fields.length === 0) {
    return (
      <div className="settings-section settings-section--empty">
        <div 
          className="settings-section__header"
          onClick={onToggle}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onToggle()}
        >
          <h2 className="settings-section__title">{section.label}</h2>
          <div className="settings-section__toggle">
            {isExpanded ? '−' : '+'}
          </div>
        </div>
        {isExpanded && (
          <div className="settings-section__content">
            <p className="settings-section__empty-message">
              No configuration options available for this module.
            </p>
          </div>
        )}
      </div>
    );
  }
  
  return (
    <div className="settings-section">
      <div 
        className="settings-section__header"
        onClick={onToggle}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onToggle()}
      >
        <h2 className="settings-section__title">{section.label}</h2>
        <div className="settings-section__badge">
          {section.fields.length} field{section.fields.length !== 1 ? 's' : ''}
        </div>
        <div className="settings-section__toggle">
          {isExpanded ? '−' : '+'}
        </div>
      </div>
      
      {isExpanded && (
        <div className="settings-section__content">
          <FormRenderer
            schema={section}
            initialValues={formValues}
            onSubmit={handleFormSubmit}
            onChange={handleFormChange}
            submitText={`Save ${section.label}`}
            validateOnChange={false}
            layout="vertical"
          />
        </div>
      )}
    </div>
  );
});

SettingsSection.displayName = 'SettingsSection';

/**
 * Field type statistics component
 */
const FieldTypeStats = React.memo(() => {
  const fieldTypes = {};
  
  SETTINGS_SCHEMA.forEach(section => {
    if (section.fields) {
      section.fields.forEach(field => {
        fieldTypes[field.type] = (fieldTypes[field.type] || 0) + 1;
      });
    }
  });
  
  const totalFields = Object.values(fieldTypes).reduce((sum, count) => sum + count, 0);
  
  return (
    <div className="field-stats">
      <h3 className="field-stats__title">Field Type Coverage</h3>
      <div className="field-stats__summary">
        <strong>Total Fields:</strong> {totalFields} across {SETTINGS_SCHEMA.length} modules
      </div>
      <div className="field-stats__grid">
        {Object.entries(fieldTypes).map(([type, count]) => (
          <div key={type} className="field-stats__item">
            <span className="field-stats__type">{type}</span>
            <span className="field-stats__count">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
});

FieldTypeStats.displayName = 'FieldTypeStats';

/**
 * Main DAPS Settings Page component
 */
const DapsSettingsPage = () => {
  const [expandedSections, setExpandedSections] = useState({
    sync_gdrive: true, // Expand first section by default
  });
  
  const toggleSection = useCallback((sectionKey) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  }, []);
  
  const expandAll = useCallback(() => {
    const allExpanded = {};
    SETTINGS_SCHEMA.forEach(section => {
      allExpanded[section.key] = true;
    });
    setExpandedSections(allExpanded);
  }, []);
  
  const collapseAll = useCallback(() => {
    setExpandedSections({});
  }, []);
  
  return (
    <div className="daps-settings-page">
      <div className="daps-settings-header">
        <h1 className="daps-settings-title">DAPS Configuration</h1>
        <p className="daps-settings-description">
          Real DAPS module configuration using the actual SETTINGS_SCHEMA. 
          This page tests all field types with authentic DAPS settings structure.
        </p>
        
        <div className="daps-settings-controls">
          <button onClick={expandAll} className="control-button secondary">
            Expand All
          </button>
          <button onClick={collapseAll} className="control-button secondary">
            Collapse All
          </button>
        </div>
      </div>

      {/* Field type statistics */}
      <FieldTypeStats />

      {/* Settings sections */}
      <div className="settings-sections">
        {SETTINGS_SCHEMA.map(section => (
          <SettingsSection
            key={section.key}
            section={section}
            isExpanded={expandedSections[section.key] || false}
            onToggle={() => toggleSection(section.key)}
          />
        ))}
      </div>
      
      <div className="daps-settings-footer">
        <p className="settings-footer__note">
          <strong>Note:</strong> This is a functional settings interface using real DAPS configuration schema.
          Form submissions are logged to console and show success toasts.
        </p>
      </div>
    </div>
  );
};

DapsSettingsPage.displayName = 'DapsSettingsPage';

export default DapsSettingsPage;