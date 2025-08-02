import React, { useEffect, useState, useRef, useCallback } from 'react';
import { fetchConfig, postConfig } from '../../utils/api';
import { SETTINGS_SCHEMA } from '../../utils/constants/settings_schema';
import { renderField } from '../fields/RenderFields';
import SettingsToolbar from './SettingsToolbar';
import { validateFields } from '../validation';
import { useTheme } from '../providers/ThemeProvider';
import { useUnsavedChanges } from '../providers/UnsavedChangesProvider';
import { useToast } from '../providers/ToastProvider';

export default function SettingsForm({ moduleName }) {
    const [config, setConfig] = useState({});
    const [formData, setFormData] = useState({});
    const [invalidFields, setInvalidFields] = useState({});
    const [isDirty, setIsDirty] = useState(false);
    const { setTheme } = useTheme();
    const toast = useToast();

    const lastSavedDataRef = useRef({});

    // Load config on moduleName change
    useEffect(() => {
        fetchConfig().then(cfg => {
            setConfig(cfg);
            setFormData(cfg || {});
            lastSavedDataRef.current = JSON.stringify(cfg?.[moduleName] || {});
            setInvalidFields({});
            setIsDirty(false);
        });
    }, [moduleName]);

    // Mark dirty if current formData differs from last saved
    useEffect(() => {
        const currentDataString = JSON.stringify(formData[moduleName] || {});
        setIsDirty(currentDataString !== lastSavedDataRef.current);
    }, [formData, moduleName]);

    // ---- CONTEXT: Register Dirty State & Save Handler ----
    const { registerUnsavedChanges } = useUnsavedChanges();

    // Make a memoized save handler for registration
    const handleSaveInternal = useCallback(async () => {
        const schema = SETTINGS_SCHEMA.find(s => s.key === moduleName);
        const errors = validateFields(schema.fields, formData[moduleName] || {}, {
            isModal: false,
        });
        setInvalidFields(errors);

        if (Object.keys(errors).length > 0) {
            setTimeout(() => {
                const firstError = document.querySelector('.field-error, .input-error');
                if (firstError) firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 0);
            return;
        }

        try {
            await postConfig({ [moduleName]: formData[moduleName] });
            if (moduleName === 'user_interface') {
                const newTheme = formData[moduleName]?.theme;
                if (typeof newTheme === 'string') {
                    setTheme(newTheme);
                }
            }
            lastSavedDataRef.current = JSON.stringify(formData[moduleName] || {});
            setIsDirty(false);
            toast?.('Settings saved!', 'success');
        } catch (err) {
            console.error(err);
            toast?.('Failed to save settings', 'error');
        }
    }, [formData, moduleName, setInvalidFields, setIsDirty, setTheme, toast]);

    useEffect(() => {
        registerUnsavedChanges(isDirty, handleSaveInternal);
    }, [isDirty, handleSaveInternal, registerUnsavedChanges]);

    function handleChange(fieldKey, value) {
        console.log('SettingsForm handleChange:', fieldKey, value);
        setFormData(prev => {
            const prevModuleData = prev[moduleName] || {};
            if (invalidFields[fieldKey]) {
                setInvalidFields(prevInvalid => {
                    const updated = { ...prevInvalid };
                    delete updated[fieldKey];
                    return updated;
                });
            }
            return {
                ...prev,
                [moduleName]: {
                    ...prevModuleData,
                    [fieldKey]: value,
                },
            };
        });
    }

    // Normal save handler for toolbar/form
    async function handleSave(e) {
        e.preventDefault();
        await handleSaveInternal();
    }

    const schema = SETTINGS_SCHEMA.find(s => s.key === moduleName);

    return (
        <>
            <SettingsToolbar
                title={schema?.label || moduleName}
                onSave={handleSave}
                isDirty={isDirty}
            />
            <form onSubmit={handleSave} className="settings-form" autoComplete="off">
                <div className="settings-fields-list">
                    {schema?.fields.map(field => (
                        <div
                            key={field.key}
                            className={
                                'settings-field-row' +
                                (invalidFields[field.key] ? ' field-error' : '')
                            }
                        >
                            {renderField(
                                field,
                                formData[moduleName] || {},
                                config[moduleName] || {},
                                config,
                                {
                                    value: formData[moduleName]?.[field.key],
                                    onChange: handleChange,
                                    renderMode: 'settings',
                                    highlightInvalid: !!invalidFields[field.key],
                                    errorMessage: invalidFields[field.key] || null,
                                }
                            )}
                        </div>
                    ))}
                </div>
            </form>
        </>
    );
}
