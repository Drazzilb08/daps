import React, { useCallback } from 'react';
import { TimeInput } from './TimeInput.jsx';
import { WeekdaySelector } from './WeekdaySelector.jsx';
import { MonthdaySelector } from './MonthdaySelector.jsx';
import { CronInput } from './CronInput.jsx';

/**
 * Dynamic content panel that renders appropriate inputs based on schedule type
 * @param {string} scheduleType - Current schedule type
 * @param {Object} scheduleData - Current schedule data object
 * @param {Function} onDataChange - Schedule data change callback
 * @param {boolean} disabled - Whether the panel is disabled
 */
export const ScheduleTypePanel = React.memo(({
    scheduleType,
    scheduleData,
    onDataChange,
    disabled = false
}) => {
    const updateScheduleData = useCallback((updates) => {
        // Always use functional update to ensure stable reference
        onDataChange(prevData => ({
            ...prevData,
            ...updates
        }));
    }, [onDataChange]);

    const renderHourlyPanel = () => (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-secondary mb-2">
                    Minute (0-59)
                </label>
                <input
                    type="number"
                    min="0"
                    max="59"
                    value={scheduleData.minute || 0}
                    onChange={(e) => updateScheduleData({ minute: parseInt(e.target.value) || 0 })}
                    disabled={disabled}
                    className="w-20 px-3 py-2 border border-border rounded-md min-h-11 bg-surface"
                />
                <div className="text-xs text-tertiary mt-1">
                    Run at this minute past every hour
                </div>
            </div>
        </div>
    );

    const renderDailyPanel = () => {
        const times = scheduleData.times || ['09:00'];

        const addTime = () => {
            const newTimes = [...times, '12:00'];
            updateScheduleData({ times: newTimes });
        };

        const removeTime = (index) => {
            const newTimes = times.filter((_, i) => i !== index);
            updateScheduleData({ times: newTimes });
        };

        const updateTime = (index, newTime) => {
            const newTimes = [...times];
            newTimes[index] = newTime;
            updateScheduleData({ times: newTimes });
        };

        return (
            <div className="space-y-4">
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-secondary">
                            Daily Times
                        </label>
                        <button
                            type="button"
                            onClick={addTime}
                            disabled={disabled || times.length >= 8}
                            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Add Time
                        </button>
                    </div>
                    <div className="space-y-2">
                        {times.map((time, index) => (
                            <div key={index} className="flex items-center gap-2">
                                <TimeInput
                                    value={time}
                                    onChange={(newTime) => updateTime(index, newTime)}
                                    disabled={disabled}
                                />
                                {times.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => removeTime(index)}
                                        disabled={disabled}
                                        className="px-2 py-1 text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
                                    >
                                        Remove
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    const renderWeeklyPanel = () => (
        <div className="space-y-4">
            <WeekdaySelector
                selectedDays={scheduleData.days || []}
                onDaysChange={(days) => updateScheduleData({ days })}
                disabled={disabled}
            />
            <div>
                <label className="block text-sm font-medium text-secondary mb-2">
                    Time
                </label>
                <TimeInput
                    value={scheduleData.time || '09:00'}
                    onChange={(time) => updateScheduleData({ time })}
                    disabled={disabled}
                />
            </div>
        </div>
    );

    const renderMonthlyPanel = () => (
        <div className="space-y-4">
            <MonthdaySelector
                selectedDays={scheduleData.days || []}
                onDaysChange={(days) => updateScheduleData({ days })}
                disabled={disabled}
            />
            <div>
                <label className="block text-sm font-medium text-secondary mb-2">
                    Time
                </label>
                <TimeInput
                    value={scheduleData.time || '09:00'}
                    onChange={(time) => updateScheduleData({ time })}
                    disabled={disabled}
                />
            </div>
        </div>
    );

    const renderCronPanel = () => (
        <div className="space-y-4">
            <CronInput
                value={scheduleData.expression || ''}
                onChange={(expression) => updateScheduleData({ expression })}
                onValidityChange={(isValid) => updateScheduleData({ isValid })}
                disabled={disabled}
            />
        </div>
    );

    // Render appropriate panel based on schedule type
    const renderPanel = () => {
        switch (scheduleType) {
            case 'hourly':
                return renderHourlyPanel();
            case 'daily':
                return renderDailyPanel();
            case 'weekly':
                return renderWeeklyPanel();
            case 'monthly':
                return renderMonthlyPanel();
            case 'cron':
                return renderCronPanel();
            default:
                return (
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-md text-center text-gray-600">
                        Please select a schedule type above
                    </div>
                );
        }
    };

    return (
        <div className="mb-4">
            {renderPanel()}
        </div>
    );
});

ScheduleTypePanel.displayName = 'ScheduleTypePanel';

export default ScheduleTypePanel;