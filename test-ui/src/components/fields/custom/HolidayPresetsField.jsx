/**
 * HolidayPresetsField Component
 *
 * Holiday presets selector field using primitive composition.
 * Provides predefined holiday configurations with colors and schedules.
 * Tracks already-added presets and prevents duplicates.
 */

import React, { useMemo, useCallback } from 'react';
import { FieldWrapper, FieldLabel, FieldError, FieldDescription, SelectBase } from '../primitives';
import { Card } from '../../ui';

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

/**
 * HolidayPresetsField component for holiday preset selection
 *
 * @param {Object} props - Component props
 * @param {Object} props.field - Field configuration object
 * @param {string} props.value - Current field value (preset name)
 * @param {Function} props.onChange - Value change handler
 * @param {boolean} props.disabled - Field disabled state
 * @param {boolean} props.highlightInvalid - Show validation error state
 * @param {string} props.errorMessage - Error message to display
 * @param {Function} props.onPresetSelected - Callback when preset is selected
 * @param {Object} props.moduleConfig - Module configuration for tracking already added presets
 */
export const HolidayPresetsField = React.memo(
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
        // Extract already used holiday names from moduleConfig
        const alreadyAddedNames = useMemo(() => {
            // Check moduleConfig.holidays array for already added preset names
            if (Array.isArray(moduleConfig?.holidays)) {
                return moduleConfig.holidays.map(entry => entry?.name).filter(Boolean);
            }
            return [];
        }, [moduleConfig]);

        // Names excluding current selection so current can remain enabled
        const usedNamesExceptSelected = useMemo(() => {
            return alreadyAddedNames.filter(name => name !== value);
        }, [alreadyAddedNames, value]);

        // Transform presets to SelectBase options format
        const options = useMemo(() => {
            const baseOptions = [{ value: '', label: '— Select preset... —' }];

            const presetOptions = HOLIDAY_PRESETS.map(preset => {
                const alreadyAdded = usedNamesExceptSelected.includes(preset.name);
                return {
                    value: preset.name,
                    label: preset.name + (alreadyAdded ? ' (Already Added)' : ''),
                    disabled: alreadyAdded,
                };
            });

            return [...baseOptions, ...presetOptions];
        }, [usedNamesExceptSelected]);

        const handleChange = useCallback(
            e => {
                const selectedValue = e.target.value;
                onChange(selectedValue);

                if (onPresetSelected && selectedValue) {
                    const selectedPreset = HOLIDAY_PRESETS.find(p => p.name === selectedValue);
                    if (selectedPreset) {
                        onPresetSelected({
                            [field.key]: selectedValue,
                            ...selectedPreset,
                        });
                    }
                }
            },
            [onChange, onPresetSelected, field.key]
        );

        const inputId = `field-${field.key}`;
        const inputValue = value || '';

        // Find selected preset for detail display
        const selectedPreset = HOLIDAY_PRESETS.find(p => p.name === value);

        return (
            <FieldWrapper invalid={highlightInvalid} variant="form-section">
                <FieldLabel htmlFor={inputId} label={field.label || 'Holiday Presets'} required={field.required} />

                <SelectBase
                    id={inputId}
                    name={field.key}
                    value={inputValue}
                    onChange={handleChange}
                    disabled={disabled}
                    required={field.required}
                    invalid={highlightInvalid}
                    options={options}
                    ariaDescribedby={`${inputId}-desc ${inputId}-error`.trim()}
                />

                <FieldDescription id={`${inputId}-desc`} description={field.description} />
                <FieldError id={`${inputId}-error`} message={errorMessage} />

                {/* Holiday Preset Details Card */}
                {selectedPreset && (
                    <Card
                        data={selectedPreset}
                        excludeKeys={[]}
                        className="mt-3 bg-surface-elevated"
                        variant="bordered"
                    />
                )}
            </FieldWrapper>
        );
    }
);

HolidayPresetsField.displayName = 'HolidayPresetsField';