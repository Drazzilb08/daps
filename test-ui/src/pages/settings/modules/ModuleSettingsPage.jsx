import React, { useState, useEffect, useCallback } from 'react';
import { configAPI } from '../../../utils/api/config.js';
import { SETTINGS_SCHEMA } from '../../../utils/constants/settings_schema.js';
import { FieldRegistry } from '../../../components/fields/FieldRegistry.jsx';
import { Accordion } from '../../../components/Accordion.jsx';
import { AccordionItem } from '../../../components/AccordionItem.jsx';
import { ConfigProvider, useConfig } from '../../../contexts/ConfigContext.jsx';

/**
 * Memoized field component for better performance
 * Only re-renders when field value or key changes
 */
const MemoizedFieldComponent = React.memo(({ field, value, onChange, ...props }) => {
  const FieldComponent = FieldRegistry.getField(field.type);

  if (!FieldComponent) {
    return (
      <div className="p-2 bg-warning-bg text-warning rounded">
        Unknown field type: {field.type}
      </div>
    );
  }

  return <FieldComponent field={field} value={value} onChange={onChange} {...props} />;
}, (prevProps, nextProps) => {
  return (
    prevProps.value === nextProps.value &&
    prevProps.field.key === nextProps.field.key &&
    prevProps.disabled === nextProps.disabled &&
    prevProps.highlightInvalid === nextProps.highlightInvalid
  );
});

MemoizedFieldComponent.displayName = 'MemoizedFieldComponent';

/**
 * Internal component that uses ConfigContext for optimal data access
 * @returns {JSX.Element} Module settings content component
 */
const ModuleSettingsContent = () => {
  const config = useConfig(); // Clean access to configuration data

  // Simplified state management for the UI
  const [expandedModules, setExpandedModules] = useState([]);
  const [formData, setFormData] = useState({});
  const [lastSaved, setLastSaved] = useState('{}');
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredModules, setFilteredModules] = useState(SETTINGS_SCHEMA);

  // Initialize form data from context when config loads
  useEffect(() => {
    if (config && Object.keys(config).length > 0) {
      setFormData(config);
      setLastSaved(JSON.stringify(config));
      setIsDirty(false);
      setSaveError(null);
    }
  }, [config]);

  // Track changes for dirty state
  useEffect(() => {
    if (formData && lastSaved) {
      const currentData = JSON.stringify(formData);
      setIsDirty(currentData !== lastSaved);
    }
  }, [formData, lastSaved]);

  // Clear success message after delay
  useEffect(() => {
    if (saveSuccess) {
      const timer = setTimeout(() => setSaveSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [saveSuccess]);

  // Search and filter functionality
  useEffect(() => {
    if (!searchTerm) {
      setFilteredModules(SETTINGS_SCHEMA);
    } else {
      const filtered = SETTINGS_SCHEMA.filter(module =>
        module.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        module.fields?.some(field =>
          field.label?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          field.key?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
      setFilteredModules(filtered);
    }
  }, [searchTerm]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyboard = (e) => {
      // Ctrl/Cmd + S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (isDirty && !isSaving) {
          handleSave();
        }
      }

      // Ctrl/Cmd + R to reset
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        if (isDirty) {
          handleReset();
        }
      }

      // Escape to collapse all
      if (e.key === 'Escape') {
        setExpandedModules([]);
      }
    };

    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [isDirty, isSaving]);

  const toggleModule = (moduleKey) => {
    setExpandedModules(prev =>
      prev.includes(moduleKey)
        ? prev.filter(key => key !== moduleKey)
        : [...prev, moduleKey]
    );
  };

  // Handle field changes following main UI pattern
  const handleFieldChange = useCallback((moduleKey, fieldKey, value) => {
    setFormData(prev => ({
      ...prev,
      [moduleKey]: {
        ...prev[moduleKey],
        [fieldKey]: value
      }
    }));
    setSaveError(null);
  }, []);

  // Save configuration - simplified with Context
  const handleSave = async () => {
    if (!isDirty || isSaving) return;

    try {
      setIsSaving(true);
      setSaveError(null);

      await configAPI.updateConfig(formData);

      // Update tracking after successful save
      setLastSaved(JSON.stringify(formData));
      setIsDirty(false);
      setSaveSuccess(true);

    } catch (error) {
      console.error('Save failed:', error);
      setSaveError(error.message || 'Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to last saved state - simplified with Context
  const handleReset = () => {
    setFormData(config);
    setIsDirty(false);
    setSaveError(null);
  };

  // No loading state needed - data comes from ConfigProvider

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      {/* Header with save controls */}
      <div className="mb-6 md:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold mb-2 text-text-primary">Module Settings</h1>
            <p className="text-sm md:text-base text-text-secondary">Configure DAPS module settings</p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            {/* Status indicators - responsive text */}
            {isDirty && (
              <span className="text-sm text-warning flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">edit</span>
                <span className="hidden sm:inline">Unsaved changes</span>
                <span className="sm:hidden">Unsaved</span>
              </span>
            )}

            {saveSuccess && (
              <span className="text-sm text-success flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">check_circle</span>
                <span className="hidden sm:inline">Saved successfully</span>
                <span className="sm:hidden">Saved</span>
              </span>
            )}

            {/* Mobile-optimized buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleReset}
                disabled={!isDirty || isSaving}
                className="flex-1 sm:flex-none px-3 py-2 text-sm border border-border rounded hover:bg-surface-hover disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] text-text-primary"
              >
                Reset
              </button>

              <button
                onClick={handleSave}
                disabled={!isDirty || isSaving}
                className="flex-1 sm:flex-none px-4 py-2 bg-primary text-white rounded hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-[44px]"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span className="hidden sm:inline">Saving...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm">save</span>
                    <span className="hidden sm:inline">Save Changes</span>
                    <span className="sm:hidden">Save</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Error display */}
        {saveError && (
          <div className="mt-4 p-3 bg-error-bg border border-error-border text-error rounded">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">error</span>
              {saveError}
            </div>
          </div>
        )}
      </div>

      {/* Search functionality */}
      <div className="mb-6">
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-3 text-text-secondary">
            search
          </span>
          <input
            type="text"
            placeholder="Search modules and fields..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent min-h-[44px] bg-surface text-text-primary"
          />
        </div>
      </div>

      {/* Module accordion */}
      <Accordion>
        {filteredModules.map((module, moduleIndex) => (
          <AccordionItem
            key={`module-${module.key}-${moduleIndex}`}
            title={module.label}
            isExpanded={expandedModules.includes(module.key)}
            onToggle={() => toggleModule(module.key)}
          >
            {module.fields && module.fields.length > 0 ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSave();
                }}
                className="space-y-4 md:space-y-6"
                noValidate
              >
                {module.fields.map((field, fieldIndex) => {
                  try {

                    // Generate unique IDs for this field instance
                    const uniqueId = `field-${module.key}-${field.key}-${fieldIndex}`;
                    const errorId = `${uniqueId}-error`;
                    const descId = `${uniqueId}-desc`;

                    // Get field value from current module data - CORRECTED VALUE MAPPING
                    // formData structure is flat: sync_gdrive, poster_renamerr, etc. are direct properties
                    const moduleData = formData[module.key] || {};
                    let fieldValue = moduleData[field.key];

                    // DEBUG: Detailed logging for sync_gdrive
                    if (module.key === 'sync_gdrive' && field.key === 'log_level') {
                      console.log('FULL DEBUG DATA:', {
                        'formData': formData,
                        'formDataKeys': Object.keys(formData),
                        'actualFormDataKeys': Object.keys(formData).map(key => `${key}: ${typeof formData[key]}`),
                        'moduleKey': module.key,
                        'moduleData': moduleData,
                        'moduleDataKeys': Object.keys(moduleData),
                        'directAccess': formData['sync_gdrive'],
                        'directAccessKeys': formData['sync_gdrive'] ? Object.keys(formData['sync_gdrive']) : 'undefined',
                        'fieldKey': field.key,
                        'rawFieldValue': fieldValue,
                        'fieldDefaultValue': field.defaultValue,
                        'fullFormDataStructure': JSON.stringify(formData, null, 2)
                      });
                    }

                    // Handle special case for nested values (like token)
                    if (fieldValue === undefined) {
                      fieldValue = field.defaultValue;
                    }

                    // Handle null values - convert to empty string for form fields
                    if (fieldValue === null) {
                      fieldValue = '';
                    }

                    // Handle object values - stringify for JSON fields
                    if (fieldValue && typeof fieldValue === 'object' && field.type === 'json') {
                      fieldValue = JSON.stringify(fieldValue, null, 2);
                    }

                    return (
                      <div key={`field-${module.key}-${field.key}-${fieldIndex}`} className="settings-field-row">
                        <MemoizedFieldComponent
                          field={{
                            ...field,
                            id: uniqueId,
                            errorId,
                            descId
                          }}
                          value={fieldValue}
                          onChange={(value) => handleFieldChange(module.key, field.key, value)}
                          disabled={isSaving}
                          highlightInvalid={false}
                          errorMessage={null}
                          rootConfig={formData}
                        />
                      </div>
                    );
                  } catch (error) {
                    console.error(`Error rendering field ${field.key}:`, error);
                    return (
                      <div key={`error-${module.key}-${field.key}-${fieldIndex}`} className="p-2 bg-warning-bg text-warning rounded">
                        Field type '{field.type}' error: {error.message}
                      </div>
                    );
                  }
                })}
              </form>
            ) : (
              <div className="text-center py-8 text-text-tertiary">
                <span className="material-symbols-outlined text-4xl mb-2 block">inbox</span>
                <p>This module's configuration is still being developed</p>
              </div>
            )}
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
};

/**
 * Main module settings page with optimal ConfigProvider architecture
 * This provides clean separation of concerns:
 * - ConfigProvider handles API data loading
 * - ModuleSettingsContent handles UI state and form interaction
 * @returns {JSX.Element} Module settings page component
 */
export const ModuleSettingsPage = () => {
  const [config, setConfig] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  // Load configuration data
  useEffect(() => {
    const loadConfig = async () => {
      try {
        setIsLoading(true);
        const response = await configAPI.fetchConfig();
        console.log('RAW API RESPONSE:', response);
        console.log('EXTRACTED DATA:', response?.data);
        // Extract the actual config data from the API response
        setConfig(response?.data || {});
      } catch (error) {
        console.error('Failed to load config:', error);
        setConfig({});
      } finally {
        setIsLoading(false);
      }
    };

    loadConfig();
  }, []);

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-text-secondary">Loading configuration...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ConfigProvider config={config}>
      <ModuleSettingsContent />
    </ConfigProvider>
  );
};

export default ModuleSettingsPage;