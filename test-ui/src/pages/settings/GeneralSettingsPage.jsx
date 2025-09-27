/**
 * GeneralSettingsPage Component
 *
 * Page for managing general DAPS settings like logging and notifications.
 * Uses the same form architecture as ModuleSettingsPage but for general configuration.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { GENERAL_SETTINGS_SCHEMA } from '../../utils/constants/general_settings_schema.js';
import { FieldRegistry } from '../../components/fields/FieldRegistry.jsx';

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
 * GeneralSettingsPage component for managing general DAPS configuration
 * @returns {JSX.Element} General settings page component
 */
export const GeneralSettingsPage = () => {
    // Mock data - in real app this would come from API
    const [formData, setFormData] = useState({
        general: {
            log_level: 'info',
            max_logs: 9,
            update_notifications: true
        }
    });
    const [lastSaved, setLastSaved] = useState('{}');
    const [isDirty, setIsDirty] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState(null);
    const [saveSuccess, setSaveSuccess] = useState(false);

    // Initialize form data
    useEffect(() => {
        setLastSaved(JSON.stringify(formData));
        setIsDirty(false);
        setSaveError(null);
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

        };

        window.addEventListener('keydown', handleKeyboard);
        return () => window.removeEventListener('keydown', handleKeyboard);
    }, [isDirty, isSaving]);


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

            // Mock API call - replace with actual API call
            await new Promise(resolve => setTimeout(resolve, 500));

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

    // Reset to last saved state
    const handleReset = () => {
        setFormData(JSON.parse(lastSaved));
        setIsDirty(false);
        setSaveError(null);
    };

    return (
        <div className="p-4 md:p-6 max-w-4xl mx-auto">
            {/* Header with save controls */}
            <div className="mb-6 md:mb-8">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-xl md:text-2xl font-semibold mb-2 text-text-primary">General Settings</h1>
                        <p className="text-sm md:text-base text-text-secondary">Configure general DAPS application settings</p>
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

            {/* Settings card */}
            {GENERAL_SETTINGS_SCHEMA.map((module, moduleIndex) => (
                <div key={`module-${module.key}-${moduleIndex}`} className="bg-surface border border-border-subtle rounded-lg p-4 md:p-6">
                    <h2 className="text-lg md:text-xl font-semibold mb-4 text-text-primary">{module.label}</h2>

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

                                    // Get field value from current module data
                                    const moduleData = formData[module.key] || {};
                                    let fieldValue = moduleData[field.key];

                                    // Handle special case for nested values
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
                            <p>No general settings available</p>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

export default GeneralSettingsPage;