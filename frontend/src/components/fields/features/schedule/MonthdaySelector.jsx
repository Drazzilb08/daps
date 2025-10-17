import React, { useCallback } from 'react';

/**
 * Month day selection component with grid layout for days 1-31
 * @param {Array} selectedDays - Array of selected day numbers (e.g., [1, 15, 30])
 * @param {Function} onDaysChange - Callback when selection changes
 * @param {boolean} disabled - Whether the selector is disabled
 * @param {string} className - Additional CSS classes
 */
export const MonthdaySelector = React.memo(
    ({ selectedDays = [], onDaysChange, disabled = false, className = '' }) => {
        const handleDayToggle = useCallback(
            day => {
                if (disabled) return;

                const newSelectedDays = selectedDays.includes(day)
                    ? selectedDays.filter(d => d !== day)
                    : [...selectedDays, day].sort((a, b) => a - b); // Keep sorted

                onDaysChange(newSelectedDays);
            },
            [selectedDays, onDaysChange, disabled]
        );

        // Generate days 1-31
        const days = Array.from({ length: 31 }, (_, i) => i + 1);

        return (
            <div className={`mb-4 ${className}`}>
                <div className="text-sm font-medium text-secondary mb-2">Select Days of Month</div>

                {/* Mobile: Responsive grid layout for touch accessibility */}
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-7 gap-2 mb-2">
                    {days.map(day => {
                        const isSelected = selectedDays.includes(day);

                        return (
                            <button
                                key={day}
                                type="button"
                                onClick={() => handleDayToggle(day)}
                                disabled={disabled}
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
                                {day}
                            </button>
                        );
                    })}
                </div>
                {selectedDays.length > 0 && (
                    <div className="text-xs text-tertiary">
                        Selected: {selectedDays.join(', ')}
                        {selectedDays.length > 6 && ' (and more)'}
                    </div>
                )}
                <div className="text-xs text-tertiary mt-1">
                    Note: Days 29-31 may not exist in all months
                </div>
            </div>
        );
    }
);

MonthdaySelector.displayName = 'MonthdaySelector';

export default MonthdaySelector;
