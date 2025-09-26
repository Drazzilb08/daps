import React, { useState, useEffect, useCallback } from 'react';
import { configAPI } from '../../../utils/api/config.js';
import { SETTINGS_SCHEMA } from '../../../utils/constants/settings_schema.js';
import { FieldRegistry } from '../../../components/fields/FieldRegistry.jsx';
import { Accordion } from '../../../components/Accordion.jsx';
import { AccordionItem } from '../../../components/AccordionItem.jsx';

/**
 * Schema-driven accordion interface with real configuration loading and state management
 * @returns {JSX.Element} Module settings page component
 */
export const ModuleSettingsPage = () => {
  const [expandedModules, setExpandedModules] = useState(['sync_gdrive']);

  // Configuration state
  const [config, setConfig] = useState(null);
  const [formData, setFormData] = useState({});
  const [lastSaved, setLastSaved] = useState('{}');
  const [isDirty, setIsDirty] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load configuration on mount
  useEffect(() => {
    const loadConfig = async () => {
      try {
        setIsLoading(true);
        const cfg = await configAPI.fetchConfig();
        setConfig(cfg);
        setFormData(cfg || {});
        setLastSaved(JSON.stringify(cfg || {}));
        setIsDirty(false);
        setSaveError(null);
      } catch (error) {
        console.error('Failed to load config:', error);
        setSaveError('Failed to load configuration');
      } finally {
        setIsLoading(false);
      }
    };

    loadConfig();
  }, []);

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

  const toggleModule = (moduleKey) => {
    setExpandedModules(prev =>
      prev.includes(moduleKey)
        ? prev.filter(key => key !== moduleKey)
        : [...prev, moduleKey]
    );
  };

  // Handle field changes
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

  // Save configuration
  const handleSave = async () => {
    if (!isDirty || isSaving) return;

    try {
      setIsSaving(true);
      setSaveError(null);

      await configAPI.updateConfig(formData);

      // Update tracking after successful save
      setConfig(formData);
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

  // Reset to last saved state
  const handleReset = () => {
    if (config) {
      setFormData(config);
      setIsDirty(false);
      setSaveError(null);
    }
  };

  // Loading state
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
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header with save controls */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold mb-2 text-text-primary">Module Settings</h1>
            <p className="text-text-secondary">Configure DAPS module settings</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Status indicator */}
            {isDirty && (
              <span className="text-sm text-warning flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">edit</span>
                Unsaved changes
              </span>
            )}

            {saveSuccess && (
              <span className="text-sm text-success flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">check_circle</span>
                Saved successfully
              </span>
            )}

            {/* Action buttons */}
            <button
              onClick={handleReset}
              disabled={!isDirty || isSaving}
              className="px-3 py-1 text-sm border border-border rounded hover:bg-surface-hover disabled:opacity-50 disabled:cursor-not-allowed text-text-primary"
            >
              Reset
            </button>

            <button
              onClick={handleSave}
              disabled={!isDirty || isSaving}
              className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Saving...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">save</span>
                  Save Changes
                </>
              )}
            </button>
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

      {/* Module accordion */}
      <Accordion>
        {SETTINGS_SCHEMA.map(module => (
          <AccordionItem
            key={module.key}
            title={module.label}
            isExpanded={expandedModules.includes(module.key)}
            onToggle={() => toggleModule(module.key)}
          >
            {module.fields && module.fields.length > 0 ? (
              <div className="space-y-4">
                {module.fields.map(field => {
                  const FieldComponent = FieldRegistry.getField(field.type);
                  const currentValue = formData[module.key]?.[field.key];

                  if (!FieldComponent) {
                    return (
                      <div key={field.key} className="p-2 bg-warning-bg text-warning rounded">
                        Field type '{field.type}' not implemented
                      </div>
                    );
                  }

                  return (
                    <FieldComponent
                      key={field.key}
                      field={field}
                      value={currentValue}
                      onChange={(value) => handleFieldChange(module.key, field.key, value)}
                      disabled={isSaving}
                      highlightInvalid={false} // Phase 2: no validation yet
                      errorMessage="" // Phase 2: no validation yet
                    />
                  );
                })}
              </div>
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

export default ModuleSettingsPage;