/**
 * GDrivePresetsField Component
 *
 * Google Drive presets selector field using primitive composition.
 * Fetches presets from remote URL and handles already-added preset tracking.
 * Displays preset details in a card format when selected.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { FieldWrapper, FieldLabel, FieldError, FieldDescription, SelectBase } from '../primitives';
import { Card } from '../../ui';

const PRESETS_URL =
    'https://raw.githubusercontent.com/Drazzilb08/daps-gdrive-presets/CL2K/presets.json';

/**
 * GDrivePresetsField component for Google Drive preset selection
 *
 * @param {Object} props - Component props
 * @param {Object} props.field - Field configuration object
 * @param {string} props.value - Current field value
 * @param {Function} props.onChange - Value change handler
 * @param {boolean} props.disabled - Field disabled state
 * @param {boolean} props.highlightInvalid - Show validation error state
 * @param {string} props.errorMessage - Error message to display
 * @param {Function} props.onPresetSelected - Callback when preset is selected
 * @param {Object} props.moduleConfig - Module configuration for tracking already added presets
 */
export const GDrivePresetsField = React.memo(
    ({
        field,
        value,
        onChange,
        disabled = false,
        highlightInvalid = false,
        errorMessage = null,
        onPresetSelected,
        moduleConfig = {},
    }) => {
        const [presets, setPresets] = useState([]);
        const [loading, setLoading] = useState(false);

        // Fetch presets on mount
        useEffect(() => {
            let mounted = true;
            setLoading(true);

            fetch(PRESETS_URL)
                .then(r => r.json())
                .then(data => {
                    let arr = Array.isArray(data)
                        ? data
                        : Object.entries(data).map(([name, v]) =>
                              typeof v === 'object' ? { name, ...v } : { name, id: v }
                          );
                    if (mounted) setPresets(arr);
                })
                .catch(() => mounted && setPresets([]))
                .finally(() => setLoading(false));

            return () => {
                mounted = false;
            };
        }, []);

        // Extract already used IDs from moduleConfig
        const alreadyAddedIds = useMemo(() => {
            // Use the explicit alreadyAddedIds from moduleConfig if available
            if (Array.isArray(moduleConfig?.alreadyAddedIds)) {
                return moduleConfig.alreadyAddedIds;
            }
            // fallback to gdrive_list IDs if not present
            if (Array.isArray(moduleConfig?.gdrive_list)) {
                return moduleConfig.gdrive_list.map(entry => entry.id).filter(Boolean);
            }
            return [];
        }, [moduleConfig]);

        // IDs excluding current selection so current can remain enabled
        const usedIdsExceptSelected = useMemo(() => {
            return alreadyAddedIds.filter(id => id !== value);
        }, [alreadyAddedIds, value]);

        // Transform presets to SelectBase options format
        const options = useMemo(() => {
            const baseOptions = [{ value: '', label: '— No Preset —' }];

            const presetOptions = presets.map(preset => {
                const alreadyAdded = usedIdsExceptSelected.includes(preset.id);
                return {
                    value: preset.id,
                    label: preset.name + (alreadyAdded ? ' (Already Added)' : ''),
                    disabled: alreadyAdded,
                };
            });

            return [...baseOptions, ...presetOptions];
        }, [presets, usedIdsExceptSelected]);

        const handleChange = useCallback(
            e => {
                const selectedValue = e.target.value;
                onChange(selectedValue);

                if (onPresetSelected && selectedValue) {
                    const selectedPreset = presets.find(p => p.id === selectedValue);
                    if (selectedPreset) {
                        onPresetSelected({
                            [field.key]: selectedValue,
                            name: selectedPreset.name,
                            id: selectedPreset.id,
                            ...selectedPreset,
                        });
                    }
                }
            },
            [onChange, onPresetSelected, presets, field.key]
        );

        const inputId = `field-${field.key}`;
        const inputValue = value || '';

        // Find selected preset for detail display
        const selectedPreset = presets.find(p => p.id === value);

        return (
            <FieldWrapper invalid={highlightInvalid} variant="form-section">
                <FieldLabel htmlFor={inputId} label={field.label || 'GDrive Presets'} required={field.required} />

                <SelectBase
                    id={inputId}
                    name={field.key}
                    value={inputValue}
                    onChange={handleChange}
                    disabled={disabled || loading}
                    required={field.required}
                    invalid={highlightInvalid}
                    options={options}
                    ariaDescribedby={`${inputId}-desc ${inputId}-error`.trim()}
                />

                <FieldDescription id={`${inputId}-desc`} description={field.description} />
                <FieldError id={`${inputId}-error`} message={errorMessage} />

                {/* Preset Details Card */}
                {selectedPreset && (
                    <Card
                        data={selectedPreset}
                        excludeKeys={['id']}
                        className="preset-details-card"
                        variant="bordered"
                    />
                )}
            </FieldWrapper>
        );
    }
);

GDrivePresetsField.displayName = 'GDrivePresetsField';