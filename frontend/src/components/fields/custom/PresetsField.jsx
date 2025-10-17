/**
 * PresetsField Component - Unified schema-driven preset selector
 *
 * Replaces HolidayPresetsField and GDrivePresetsField with a single
 * configurable component that uses schema to determine behavior.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { FieldWrapper, FieldLabel, FieldError, FieldDescription, SelectBase } from '../primitives';
import { Card } from '../../ui';

// Holiday presets data
const HOLIDAY_PRESETS = [
    {
        name: "🎆 New Year's Day",
        schedule: 'range(12/30-01/02)',
        colors: ['#00BFFF', '#FFD700'],
    },
    {
        name: "💘 Valentine's Day",
        schedule: 'range(02/05-02/15)',
        colors: ['#D41F3A', '#FFC0CB'],
    },
    {
        name: '🐣 Easter',
        schedule: 'range(03/31-04/02)',
        colors: ['#FFB6C1', '#87CEFA', '#98FB98'],
    },
    {
        name: "🌸 Mother's Day",
        schedule: 'range(05/10-05/15)',
        colors: ['#FF69B4', '#FFDAB9'],
    },
    {
        name: "👨‍👧‍👦 Father's Day",
        schedule: 'range(06/15-06/20)',
        colors: ['#1E90FF', '#4682B4'],
    },
    {
        name: '🗽 Independence Day',
        schedule: 'range(07/01-07/05)',
        colors: ['#FF0000', '#FFFFFF', '#0000FF'],
    },
    {
        name: '🧹 Labor Day',
        schedule: 'range(09/01-09/07)',
        colors: ['#FFD700', '#4682B4'],
    },
    {
        name: '🎃 Halloween',
        schedule: 'range(10/01-10/31)',
        colors: ['#FFA500', '#000000'],
    },
    {
        name: '🦃 Thanksgiving',
        schedule: 'range(11/01-11/30)',
        colors: ['#FFA500', '#8B4513'],
    },
    {
        name: '🎄 Christmas',
        schedule: 'range(12/01-12/31)',
        colors: ['#FF0000', '#00FF00'],
    },
];

// const GDRIVE_PRESETS_URL =
//     'https://raw.githubusercontent.com/Drazzilb08/daps-gdrive-presets/CL2K/presets.json';

/**
 * PresetsField component for schema-driven preset selection
 *
 * @param {Object} props - Component props
 * @param {Object} props.field - Field configuration object with preset schema
 * @param {string} props.value - Current field value
 * @param {Function} props.onChange - Value change handler
 * @param {boolean} props.disabled - Field disabled state
 * @param {boolean} props.highlightInvalid - Show validation error state
 * @param {string} props.errorMessage - Error message to display
 * @param {Function} props.onPresetSelected - Callback when preset is selected
 * @param {Object} props.moduleConfig - Module configuration for tracking already added presets
 */
export const PresetsField = React.memo(
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

        // Extract preset configuration from field schema
        const presetType = field.presetType || 'holiday'; // Default to holiday
        const presetUrl = field.presetUrl;
        const presetData = field.presetData;
        const targetFields = useMemo(() => field.targetFields || [], [field.targetFields]);
        const identifierField = field.identifierField || 'name'; // Field used to identify presets
        const moduleConfigKey = field.moduleConfigKey; // Key in moduleConfig to check for duplicates

        // Load presets based on configuration
        useEffect(() => {
            let mounted = true;

            if (presetType === 'holiday') {
                // Use local holiday presets
                setPresets(HOLIDAY_PRESETS);
                return;
            }

            if (presetType === 'gdrive' && presetUrl) {
                // Fetch remote GDrive presets
                setLoading(true);
                fetch(presetUrl)
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
            }

            if (presetData) {
                // Use provided preset data
                setPresets(presetData);
            }
        }, [presetType, presetUrl, presetData]);

        // Extract already used preset identifiers from moduleConfig
        const alreadyAddedIds = useMemo(() => {
            if (moduleConfigKey && Array.isArray(moduleConfig?.[moduleConfigKey])) {
                return moduleConfig[moduleConfigKey]
                    .map(entry => entry?.[identifierField])
                    .filter(Boolean);
            }
            return [];
        }, [moduleConfig, moduleConfigKey, identifierField]);

        // IDs excluding current selection so current can remain enabled
        const usedIdsExceptSelected = useMemo(() => {
            return alreadyAddedIds.filter(id => id !== value);
        }, [alreadyAddedIds, value]);

        // Transform presets to SelectBase options format
        const options = useMemo(() => {
            const baseOptions = [{ value: '', label: '— Select preset... —' }];

            const presetOptions = presets.map(preset => {
                const identifier = preset[identifierField];
                const alreadyAdded = usedIdsExceptSelected.includes(identifier);
                return {
                    value: identifier,
                    label: preset.name + (alreadyAdded ? ' (Already Added)' : ''),
                    disabled: alreadyAdded,
                };
            });

            return [...baseOptions, ...presetOptions];
        }, [presets, usedIdsExceptSelected, identifierField]);

        const handleChange = useCallback(
            e => {
                const selectedValue = e.target.value;
                console.log('[PresetsField] handleChange called:', {
                    selectedValue,
                    presetType,
                    targetFields,
                    onPresetSelected: !!onPresetSelected,
                    presetsLength: presets.length,
                    field: field.key,
                });

                onChange(selectedValue);

                if (onPresetSelected && selectedValue) {
                    const selectedPreset = presets.find(p => p[identifierField] === selectedValue);
                    console.log('[PresetsField] selectedPreset found:', selectedPreset);

                    if (selectedPreset && targetFields.length > 0) {
                        // Build preset data mapping based on targetFields configuration
                        const presetFieldUpdates = {};

                        // Map preset data to target field names
                        targetFields.forEach(targetField => {
                            if (Object.hasOwn(selectedPreset, targetField)) {
                                presetFieldUpdates[targetField] = selectedPreset[targetField];
                            }
                        });

                        // Always include the current field's value
                        presetFieldUpdates[field.key] = selectedValue;

                        console.log(
                            '[PresetsField] calling onPresetSelected with:',
                            presetFieldUpdates
                        );
                        onPresetSelected(presetFieldUpdates);
                    } else {
                        console.log('[PresetsField] No targetFields or selectedPreset not found:', {
                            selectedPreset: !!selectedPreset,
                            targetFieldsLength: targetFields.length,
                        });
                    }
                } else {
                    console.log(
                        '[PresetsField] onPresetSelected not available or no selectedValue:',
                        {
                            onPresetSelected: !!onPresetSelected,
                            selectedValue,
                        }
                    );
                }
            },
            [
                onChange,
                onPresetSelected,
                presets,
                field.key,
                identifierField,
                targetFields,
                presetType,
            ]
        );

        const inputId = `field-${field.key}`;
        const inputValue = value || '';

        // Find selected preset for detail display
        const selectedPreset = presets.find(p => p[identifierField] === value);

        return (
            <FieldWrapper invalid={highlightInvalid} variant="form-section">
                <FieldLabel
                    htmlFor={inputId}
                    label={field.label || `${presetType} Presets`}
                    required={field.required}
                />

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

                {/* Preset Details Card - Only show for gdrive presets */}
                {selectedPreset && presetType === 'gdrive' && (
                    <Card
                        data={selectedPreset}
                        excludeKeys={[identifierField === 'id' ? 'id' : '']}
                        title={`${presetType} Preset Details`}
                    />
                )}
            </FieldWrapper>
        );
    }
);

PresetsField.displayName = 'PresetsField';
