import React, { useState, useCallback, useEffect } from 'react';
import { FieldWrapper, FieldLabel, FieldError, FieldDescription } from '../primitives';
import { PillSelector, ScheduleTypePanel, ScheduleSummary } from '../features/schedule';

// Schedule type options
const SCHEDULE_TYPES = [
    { type: 'hourly', label: 'Hourly' },
    { type: 'daily', label: 'Daily' },
    { type: 'weekly', label: 'Weekly' },
    { type: 'monthly', label: 'Monthly' },
    { type: 'cron', label: 'Cron' },
];

// Weekday mapping: backend format <-> frontend format
const DAY_ABBR_TO_KEY = {
    Sun: 'sunday',
    Mon: 'monday',
    Tue: 'tuesday',
    Wed: 'wednesday',
    Thu: 'thursday',
    Fri: 'friday',
    Sat: 'saturday',
};

const DAY_KEY_TO_ABBR = {
    sunday: 'Sun',
    monday: 'Mon',
    tuesday: 'Tue',
    wednesday: 'Wed',
    thursday: 'Thu',
    friday: 'Fri',
    saturday: 'Sat',
};

/**
 * Main schedule input component using atomic primitives
 * @param {Object} field - Field configuration
 * @param {string} value - Schedule string like "daily(14:30|18:00)" or "cron(0 9 * * 1-5)"
 * @param {Function} onChange - Value change handler
 * @param {boolean} disabled - Field disabled state
 * @param {boolean} highlightInvalid - Show validation errors
 * @param {string} errorMessage - Error message text
 */
export const ScheduleField = React.memo(
    ({
        field,
        value = '',
        onChange,
        disabled = false,
        highlightInvalid = false,
        errorMessage = null,
    }) => {
        const [scheduleType, setScheduleType] = useState('daily');
        const [scheduleData, setScheduleData] = useState({});
        const [, setIsValid] = useState(true);

        // Parse incoming value into type and data
        const parseScheduleValue = useCallback(val => {
            if (!val || typeof val !== 'string') {
                return { type: 'daily', data: {} };
            }

            try {
                // Parse strings like "hourly(30)", "daily(09:00|17:00)", "cron(0 0 * * *)", "cron()"
                const match = val.match(/^(\w+)\((.*)\)$/);
                if (!match) {
                    return { type: 'daily', data: {} };
                }

                const [, type, dataStr] = match;

                switch (type) {
                    case 'hourly': {
                        const minute = parseInt(dataStr, 10);
                        return { type, data: { minute: isNaN(minute) ? 0 : minute } };
                    }

                    case 'daily': {
                        const times = dataStr.split('|').filter(Boolean);
                        return { type, data: { times } };
                    }

                    case 'weekly': {
                        // Format: "Sun@14:00" or "Mon,Fri@09:00" (backend) or "monday@14:00" (legacy)
                        const parts = dataStr.split('@');
                        if (parts.length === 2) {
                            const rawDays = parts[0].split(',').filter(Boolean);
                            // Convert abbreviated names (Sun, Mon) to lowercase keys (sunday, monday)
                            const days = rawDays.map(
                                day => DAY_ABBR_TO_KEY[day] || day.toLowerCase()
                            );
                            const time = parts[1];
                            return { type, data: { days, time } };
                        }
                        return { type, data: {} };
                    }

                    case 'monthly': {
                        // Format: "1,15@14:00"
                        const parts = dataStr.split('@');
                        if (parts.length === 2) {
                            const days = parts[0]
                                .split(',')
                                .map(d => parseInt(d, 10))
                                .filter(d => !isNaN(d));
                            const time = parts[1];
                            return { type, data: { days, time } };
                        }
                        return { type, data: {} };
                    }

                    case 'cron': {
                        return { type, data: { expression: dataStr } };
                    }

                    default:
                        return { type: 'daily', data: {} };
                }
            } catch (error) {
                console.warn('Failed to parse schedule value:', val, error);
                return { type: 'daily', data: {} };
            }
        }, []);

        // Compose schedule string from type and data (pure function, no useCallback needed)
        const composeScheduleString = (type, data) => {
            if (!type || !data) {
                return '';
            }

            try {
                switch (type) {
                    case 'hourly': {
                        const minute = data.minute || 0;
                        return `hourly(${minute})`;
                    }

                    case 'daily': {
                        const times = data.times || [];
                        if (times.length === 0) return '';
                        return `daily(${times.join('|')})`;
                    }

                    case 'weekly': {
                        const days = data.days || [];
                        const time = data.time || '09:00';
                        if (days.length === 0) return '';
                        // Convert lowercase keys (sunday, monday) to abbreviated names (Sun, Mon) for backend
                        const abbrDays = days.map(day => DAY_KEY_TO_ABBR[day] || day);
                        return `weekly(${abbrDays.join(',')}@${time})`;
                    }

                    case 'monthly': {
                        const days = data.days || [];
                        const time = data.time || '09:00';
                        if (days.length === 0) return '';
                        return `monthly(${days.join(',')}@${time})`;
                    }

                    case 'cron': {
                        const expression = data.expression || '';
                        if (!expression.trim()) return 'cron()';
                        return `cron(${expression})`;
                    }

                    default:
                        return '';
                }
            } catch (error) {
                console.warn('Failed to compose schedule string:', type, data, error);
                return '';
            }
        };

        // Initialize from incoming value (only when fundamentally different)
        useEffect(() => {
            const parsed = parseScheduleValue(value);

            // Only update if the schedule type changed to prevent infinite loops
            // Data changes within the same type should not trigger re-initialization
            if (parsed.type !== scheduleType) {
                setScheduleType(parsed.type);
                setScheduleData(parsed.data);
            }
        }, [value, parseScheduleValue, scheduleType]);

        // Handle schedule type change
        const handleTypeChange = useCallback(
            newType => {
                if (newType === scheduleType) {
                    return; // Prevent unnecessary updates
                }
                setScheduleType(newType);

                // Reset data when switching types
                let newData = {};
                switch (newType) {
                    case 'hourly':
                        newData = { minute: 0 };
                        break;
                    case 'daily':
                        newData = { times: ['09:00'] };
                        break;
                    case 'weekly':
                        newData = { days: ['monday'], time: '09:00' };
                        break;
                    case 'monthly':
                        newData = { days: [1], time: '09:00' };
                        break;
                    case 'cron':
                        newData = { expression: '', isValid: true };
                        break;
                }

                setScheduleData(newData);

                // Compose and emit new value
                const newValue = composeScheduleString(newType, newData);
                onChange(newValue);
            },
            [scheduleType, onChange]
        ); // Include scheduleType dependency

        // Handle schedule data change
        const handleDataChange = useCallback(
            newDataOrUpdater => {
                // Always use functional update to avoid stale closure issues
                setScheduleData(prevData => {
                    const updatedData =
                        typeof newDataOrUpdater === 'function'
                            ? newDataOrUpdater(prevData)
                            : newDataOrUpdater;

                    // Update validity for cron expressions
                    if (scheduleType === 'cron') {
                        setIsValid(updatedData.isValid !== false);
                    }

                    // Compose new value
                    const prevValue = composeScheduleString(scheduleType, prevData);
                    const newValue = composeScheduleString(scheduleType, updatedData);

                    // Only emit onChange if the value actually changed
                    // This prevents infinite loops from validation-only updates
                    if (newValue !== prevValue) {
                        // Use setTimeout to break out of the current render cycle
                        setTimeout(() => onChange(newValue), 0);
                    }

                    return updatedData;
                });
            },
            [scheduleType, onChange]
        );

        const inputId = `field-${field.key}`;

        return (
            <FieldWrapper invalid={highlightInvalid}>
                <FieldLabel htmlFor={inputId} label={field.label} required={field.required} />

                <div className="schedule-field space-y-4">
                    {/* Schedule type selector */}
                    <PillSelector
                        options={SCHEDULE_TYPES}
                        selectedType={scheduleType}
                        onTypeChange={handleTypeChange}
                        disabled={disabled}
                    />

                    {/* Dynamic content panel based on schedule type */}
                    <ScheduleTypePanel
                        scheduleType={scheduleType}
                        scheduleData={scheduleData}
                        onDataChange={handleDataChange}
                        disabled={disabled}
                    />

                    {/* Human-readable schedule summary */}
                    <ScheduleSummary
                        scheduleType={scheduleType}
                        scheduleValue={scheduleData}
                        cronExpression={scheduleType === 'cron' ? scheduleData.expression : ''}
                    />
                </div>

                <FieldDescription id={`${inputId}-desc`} description={field.description} />
                <FieldError id={`${inputId}-error`} message={errorMessage} />
            </FieldWrapper>
        );
    }
);

ScheduleField.displayName = 'ScheduleField';

export default ScheduleField;
