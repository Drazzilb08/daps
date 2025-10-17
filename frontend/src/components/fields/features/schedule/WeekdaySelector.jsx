import React, { useCallback } from 'react';

const WEEKDAYS = [
    { key: 'sunday', label: 'Sun', fullName: 'Sunday' },
    { key: 'monday', label: 'Mon', fullName: 'Monday' },
    { key: 'tuesday', label: 'Tue', fullName: 'Tuesday' },
    { key: 'wednesday', label: 'Wed', fullName: 'Wednesday' },
    { key: 'thursday', label: 'Thu', fullName: 'Thursday' },
    { key: 'friday', label: 'Fri', fullName: 'Friday' },
    { key: 'saturday', label: 'Sat', fullName: 'Saturday' },
];

/**
 * Weekday selection component with multi-select pills
 * @param {Array} selectedDays - Array of selected weekday strings (e.g., ['monday', 'friday'])
 * @param {Function} onDaysChange - Callback when selection changes
 * @param {boolean} disabled - Whether the selector is disabled
 * @param {string} className - Additional CSS classes
 */
export const WeekdaySelector = React.memo(
    ({ selectedDays = [], onDaysChange, disabled = false, className = '' }) => {
        const handleDayToggle = useCallback(
            dayKey => {
                if (disabled) return;

                const newSelectedDays = selectedDays.includes(dayKey)
                    ? selectedDays.filter(day => day !== dayKey)
                    : [...selectedDays, dayKey];

                onDaysChange(newSelectedDays);
            },
            [selectedDays, onDaysChange, disabled]
        );

        return (
            <div className={`mb-4 ${className}`}>
                <div className="text-sm font-medium text-secondary mb-2">Select Days</div>

                {/* Mobile: Stack layout for touch accessibility */}
                <div className="md:hidden space-y-2">
                    {WEEKDAYS.map(day => {
                        const isSelected = selectedDays.includes(day.key);

                        return (
                            <button
                                key={day.key}
                                type="button"
                                onClick={() => handleDayToggle(day.key)}
                                disabled={disabled}
                                className={`
                                w-full min-h-11 px-4 py-3 text-sm font-medium rounded transition-colors
                                flex items-center justify-between
                                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                                ${
                                    isSelected
                                        ? 'bg-primary text-white border border-primary shadow-sm'
                                        : 'bg-surface-elevated text-primary border border-border hover:bg-primary hover:border-border-light'
                                }
                            `}
                            >
                                <span>{day.fullName}</span>
                                <span className="text-xs opacity-70">{day.label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Desktop: Grid layout (768px and up) */}
                <div className="hidden md:grid grid-cols-7 gap-2">
                    {WEEKDAYS.map(day => {
                        const isSelected = selectedDays.includes(day.key);

                        return (
                            <button
                                key={day.key}
                                type="button"
                                onClick={() => handleDayToggle(day.key)}
                                disabled={disabled}
                                title={day.fullName}
                                className={`
                                px-2 py-2 text-sm font-medium rounded transition-colors min-h-11
                                flex items-center justify-center
                                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                                ${
                                    isSelected
                                        ? 'bg-primary text-white border border-primary shadow-sm'
                                        : 'bg-surface-elevated text-primary border border-border hover:bg-primary hover:border-border-light'
                                }
                            `}
                            >
                                {day.label}
                            </button>
                        );
                    })}
                </div>

                {selectedDays.length > 0 && (
                    <div className="text-xs text-tertiary mt-2">
                        Selected:{' '}
                        {selectedDays
                            .map(day => WEEKDAYS.find(w => w.key === day)?.fullName)
                            .join(', ')}
                    </div>
                )}
            </div>
        );
    }
);

WeekdaySelector.displayName = 'WeekdaySelector';

export default WeekdaySelector;
