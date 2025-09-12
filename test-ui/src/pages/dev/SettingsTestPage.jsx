/**
 * DAPS Settings Page - Real Settings Configuration
 * 
 * This page renders the actual DAPS settings using the SETTINGS_SCHEMA.
 * Each module section is rendered as a separate form using FormRenderer.
 * Tests the complete field system with real DAPS configuration data.
 */

import React, { useState, useCallback } from 'react';
import { SETTINGS_SCHEMA } from '../../utils/constants/settings_schema.js';
import { FormRenderer } from '../../utils/forms/FormRenderer.jsx';
import { useToast } from '../../contexts/ToastContext.jsx';

/**
 * Settings section component for each module
 */
const SettingsSection = React.memo(({ section, isExpanded, onToggle }) => {
  const toast = useToast();
  
  // Define which field types are 100% complete vs incomplete/placeholder
  const COMPLETED_FIELDS = new Set([
    'text', 'password', 'number', 'float', 'textarea', 
    'dropdown', 'check_box', 'json', 'color_list', 'dir', 'dirlist'
  ]);
  
  // Filter out incomplete field types
  const completedFields = section.fields ? section.fields.filter(field => 
    COMPLETED_FIELDS.has(field.type)
  ) : [];
  
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
    getInitialValues(completedFields)
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
  
  // Skip sections with no completed fields
  if (completedFields.length === 0) {
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
          {completedFields.length} field{completedFields.length !== 1 ? 's' : ''}
        </div>
        <div className="settings-section__toggle">
          {isExpanded ? '−' : '+'}
        </div>
      </div>
      
      {isExpanded && (
        <div className="settings-section__content">
          <FormRenderer
            schema={{...section, fields: completedFields}}
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
 * Field completion status component - shows which field types are implemented vs not
 */
const FieldCompletionStatus = React.memo(() => {
  // Define which field types are 100% complete vs incomplete/placeholder
  const COMPLETED_FIELD_TYPES = new Set([
    'text', 'password', 'number', 'float', 'textarea', 
    'dropdown', 'check_box', 'json', 'color_list'
  ]);
  
  const INCOMPLETE_FIELD_TYPES = new Set([
    'dirlist_dragdrop', 'dirlist_options',
    'instances', 'instance_dropdown', 'gdrive_custom', 'gdrive_presets',
    'holiday_presets', 'holiday_schedule', 'replacerr_custom',
    'upgradinatorr_custom', 'labelarr_custom', 'color_list_poster', 'dir', 'dirlist'
  ]);
  
  // Count field instances by type
  const fieldTypeStats = {};
  SETTINGS_SCHEMA.forEach(section => {
    if (section.fields) {
      section.fields.forEach(field => {
        const type = field.type;
        fieldTypeStats[type] = (fieldTypeStats[type] || 0) + 1;
      });
    }
  });
  
  // Separate completed vs incomplete field types
  const completedTypes = Object.keys(fieldTypeStats).filter(type => 
    COMPLETED_FIELD_TYPES.has(type)
  ).sort();
  
  const incompleteTypes = Object.keys(fieldTypeStats).filter(type => 
    INCOMPLETE_FIELD_TYPES.has(type)
  ).sort();
  
  return (
    <div className="field-completion-status">
      <h3 className="field-completion-status__title">Field Implementation Progress</h3>
      
      <div className="implementation-summary">
        <div className="summary-card summary-card--completed">
          <div className="summary-number">{completedTypes.length}</div>
          <div className="summary-label">Field Types Complete</div>
        </div>
        <div className="summary-card summary-card--incomplete">
          <div className="summary-number">{incompleteTypes.length}</div>
          <div className="summary-label">Field Types Incomplete</div>
        </div>
        <div className="summary-card">
          <div className="summary-number">{completedTypes.length + incompleteTypes.length}</div>
          <div className="summary-label">Total Field Types</div>
        </div>
      </div>

      <div className="field-type-sections">
        <div className="field-type-section field-type-section--completed">
          <h4 className="section-title">✅ Complete Field Types (Shown in Forms)</h4>
          <div className="field-type-list">
            {completedTypes.map(type => (
              <div key={type} className="field-type-badge field-type-badge--completed">
                <span className="field-type-name">{type}</span>
                <span className="field-type-count">{fieldTypeStats[type]}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="field-type-section field-type-section--incomplete">
          <h4 className="section-title">🚧 Incomplete Field Types (Hidden from Forms)</h4>
          <div className="field-type-list">
            {incompleteTypes.map(type => (
              <div key={type} className="field-type-badge field-type-badge--incomplete">
                <span className="field-type-name">{type}</span>
                <span className="field-type-count">{fieldTypeStats[type]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});

FieldCompletionStatus.displayName = 'FieldCompletionStatus';

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

      {/* Field completion status */}
      <FieldCompletionStatus />

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