/**
 * UISettingsPage Component
 *
 * Page for managing user interface settings like theme preferences.
 * Uses the same form architecture as ModuleSettingsPage but for UI configuration.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { UI_SETTINGS_SCHEMA } from '../../utils/constants/ui_settings_schema.js';
import { FieldRegistry } from '../../components/fields/FieldRegistry.jsx';
import { PageHeader } from '../../components/ui/PageHeader';
import { ToolBar } from '../../components/ToolBar';
import { useApiData } from '../../hooks/useApiData';
import { configAPI } from '../../utils/api/config';
import { useToast } from '../../contexts/ToastContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useToolbar } from '../../contexts/ToolbarContext';

/**
 * Memoized field component for better performance
 * Only re-renders when field value or key changes
 */
const MemoizedFieldComponent = React.memo(
    ({ field, value, onChange, ...props }) => {
        const FieldComponent = FieldRegistry.getField(field.type);

        if (!FieldComponent) {
            return (
                <div className="p-2 bg-warning-bg text-warning rounded">
                    Unknown field type: {field.type}
                </div>
            );
        }

        return <FieldComponent field={field} value={value} onChange={onChange} {...props} />;
    },
    (prevProps, nextProps) => {
        return (
            prevProps.value === nextProps.value &&
            prevProps.field.key === nextProps.field.key &&
            prevProps.disabled === nextProps.disabled &&
            prevProps.highlightInvalid === nextProps.highlightInvalid
        );
    }
);

MemoizedFieldComponent.displayName = 'MemoizedFieldComponent';

/**
 * UISettingsPage component for managing user interface configuration
 * @returns {JSX.Element} UI settings page component
 */
export const UISettingsPage = () => {
    const toast = useToast();
    const { setTheme } = useTheme();
    const { registerToolbar, clearToolbar } = useToolbar();

    // Load config from backend
    const {
        data: configData,
        isLoading,
        error: loadError,
        execute: refreshConfig,
    } = useApiData({
        apiFunction: configAPI.fetchConfig,
    });

    const [formData, setFormData] = useState({});
    const [lastSaved, setLastSaved] = useState('{}');
    const [isDirty, setIsDirty] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState(null);

    // Initialize form data when config loads
    useEffect(() => {
        if (configData?.data) {
            const initialData = {
                user_interface: configData.data.user_interface || {
                    theme: 'auto',
                },
            };
            setFormData(initialData);
            setLastSaved(JSON.stringify(initialData));
            setIsDirty(false);
            setSaveError(null);

            // Sync theme to ThemeContext
            const configTheme = initialData.user_interface?.theme;
            if (configTheme) {
                // Map 'auto' to 'system' for ThemeContext
                const themeValue = configTheme === 'auto' ? 'system' : configTheme;
                setTheme(themeValue);
            }
        }
    }, [configData, setTheme]);

    // Handle field changes
    const handleFieldChange = useCallback(
        (moduleKey, fieldKey, value) => {
            setFormData(prev => ({
                ...prev,
                [moduleKey]: {
                    ...prev[moduleKey],
                    [fieldKey]: value,
                },
            }));
            setSaveError(null);

            // If theme field changed, immediately update ThemeContext for live preview
            if (moduleKey === 'user_interface' && fieldKey === 'theme') {
                const themeValue = value === 'auto' ? 'system' : value;
                setTheme(themeValue);
            }
        },
        [setTheme]
    );

    // Save configuration
    const handleSave = useCallback(async () => {
        if (!isDirty || isSaving) return;

        try {
            setIsSaving(true);
            setSaveError(null);

            // Save to backend
            await configAPI.updateConfig(formData);

            // Refresh config with cache bypass
            await refreshConfig({ useCache: false });

            // Update tracking after successful save
            setLastSaved(JSON.stringify(formData));
            setIsDirty(false);

            toast.success('UI settings saved successfully');
        } catch (error) {
            console.error('Save failed:', error);
            const errorMessage = error.message || 'Failed to save configuration';
            setSaveError(errorMessage);
            toast.error(`Failed to save settings: ${errorMessage}`);
        } finally {
            setIsSaving(false);
        }
    }, [isDirty, isSaving, formData, refreshConfig, toast]);

    // Reset to last saved state
    const handleReset = useCallback(() => {
        setFormData(JSON.parse(lastSaved));
        setIsDirty(false);
        setSaveError(null);
    }, [lastSaved]);

    // Track changes for dirty state
    useEffect(() => {
        if (formData && lastSaved) {
            const currentData = JSON.stringify(formData);
            setIsDirty(currentData !== lastSaved);
        }
    }, [formData, lastSaved]);

    // Register toolbar with Save/Reset buttons
    useEffect(() => {
        const toolbarContent = (
            <ToolBar>
                <ToolBar.Section alignContent="right">
                    <ToolBar.Button
                        label="Reset"
                        iconName="restore"
                        isDisabled={!isDirty || isSaving}
                        onPress={handleReset}
                    />
                    <ToolBar.Button
                        label="Save"
                        iconName="save"
                        isDisabled={!isDirty || isSaving}
                        isSpinning={isSaving}
                        onPress={handleSave}
                    />
                </ToolBar.Section>
            </ToolBar>
        );

        registerToolbar(toolbarContent);

        // Cleanup on unmount
        return () => clearToolbar();
    }, [isDirty, isSaving, handleSave, handleReset, registerToolbar, clearToolbar]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyboard = e => {
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
    }, [isDirty, isSaving, handleReset, handleSave]);

    // Loading state
    if (isLoading) {
        return (
            <div className="flex justify-center items-center min-h-64">
                <div className="text-primary text-lg">Loading UI settings...</div>
            </div>
        );
    }

    // Error state
    if (loadError) {
        return (
            <div className="flex justify-center items-center min-h-64">
                <div className="text-error text-lg">
                    Error loading settings: {loadError.message}
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 max-w-4xl mx-auto">
            {/* Header */}
            <PageHeader
                title="User Interface Settings"
                description="Configure the appearance and behavior of the DAPS interface"
            />

            {/* Error display */}
            {saveError && (
                <div className="mb-6 p-3 bg-error-bg border border-error-border text-error rounded">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm">error</span>
                        {saveError}
                    </div>
                </div>
            )}

            {/* Settings card */}
            {UI_SETTINGS_SCHEMA.map((module, moduleIndex) => (
                <div
                    key={`module-${module.key}-${moduleIndex}`}
                    className="bg-surface border border-border-subtle rounded-lg p-4 md:p-6"
                >
                    <h2 className="text-lg md:text-xl font-semibold mb-4 text-primary">
                        {module.label}
                    </h2>

                    {module.fields && module.fields.length > 0 ? (
                        <form
                            onSubmit={e => {
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
                                    if (
                                        fieldValue &&
                                        typeof fieldValue === 'object' &&
                                        field.type === 'json'
                                    ) {
                                        fieldValue = JSON.stringify(fieldValue, null, 2);
                                    }

                                    return (
                                        <div
                                            key={`field-${module.key}-${field.key}-${fieldIndex}`}
                                            className="settings-field-row"
                                        >
                                            <MemoizedFieldComponent
                                                field={{
                                                    ...field,
                                                    id: uniqueId,
                                                    errorId,
                                                    descId,
                                                }}
                                                value={fieldValue}
                                                onChange={value =>
                                                    handleFieldChange(module.key, field.key, value)
                                                }
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
                                        <div
                                            key={`error-${module.key}-${field.key}-${fieldIndex}`}
                                            className="p-2 bg-warning-bg text-warning rounded"
                                        >
                                            Field type &apos;{field.type}&apos; error:{' '}
                                            {error.message}
                                        </div>
                                    );
                                }
                            })}
                        </form>
                    ) : (
                        <div className="text-center py-8 text-tertiary">
                            <span className="material-symbols-outlined text-4xl mb-2 block">
                                inbox
                            </span>
                            <p>No interface settings available</p>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

export default UISettingsPage;
