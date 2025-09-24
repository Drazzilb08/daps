import React from 'react';
import cronstrue from 'cronstrue';

/**
 * Human-readable schedule description component
 * @param {string} scheduleType - 'hourly' | 'daily' | 'weekly' | 'monthly' | 'cron'
 * @param {Object} scheduleValue - Parsed schedule configuration object
 * @param {string} cronExpression - Raw cron expression for cron type
 * @param {string} className - Additional CSS classes
 */
export const ScheduleSummary = React.memo(({
    scheduleType,
    scheduleValue,
    cronExpression,
    className = ''
}) => {
    const generateSummary = () => {
        if (!scheduleType || !scheduleValue) {
            return 'No schedule configured';
        }

        try {
            switch (scheduleType) {
                case 'hourly': {
                    const minute = scheduleValue.minute || 0;
                    return `Every hour at ${minute.toString().padStart(2, '0')} minutes past the hour`;
                }

                case 'daily': {
                    const times = scheduleValue.times || [];
                    if (times.length === 0) {
                        return 'Daily (no times specified)';
                    }
                    if (times.length === 1) {
                        return `Daily at ${times[0]}`;
                    }
                    return `Daily at ${times.slice(0, -1).join(', ')} and ${times[times.length - 1]}`;
                }

                case 'weekly': {
                    const days = scheduleValue.days || [];
                    const time = scheduleValue.time || '09:00';

                    if (days.length === 0) {
                        return `Weekly at ${time} (no days specified)`;
                    }

                    const dayNames = {
                        sunday: 'Sunday',
                        monday: 'Monday',
                        tuesday: 'Tuesday',
                        wednesday: 'Wednesday',
                        thursday: 'Thursday',
                        friday: 'Friday',
                        saturday: 'Saturday'
                    };

                    const readableDays = days.map(day => dayNames[day]).filter(Boolean);

                    if (readableDays.length === 1) {
                        return `Every ${readableDays[0]} at ${time}`;
                    }
                    return `Every ${readableDays.slice(0, -1).join(', ')} and ${readableDays[readableDays.length - 1]} at ${time}`;
                }

                case 'monthly': {
                    const days = scheduleValue.days || [];
                    const time = scheduleValue.time || '09:00';

                    if (days.length === 0) {
                        return `Monthly at ${time} (no days specified)`;
                    }

                    const ordinalSuffix = (num) => {
                        const j = num % 10;
                        const k = num % 100;
                        if (j === 1 && k !== 11) return num + 'st';
                        if (j === 2 && k !== 12) return num + 'nd';
                        if (j === 3 && k !== 13) return num + 'rd';
                        return num + 'th';
                    };

                    const ordinalDays = days.map(day => ordinalSuffix(day));

                    if (ordinalDays.length === 1) {
                        return `Monthly on the ${ordinalDays[0]} at ${time}`;
                    }
                    return `Monthly on the ${ordinalDays.slice(0, -1).join(', ')} and ${ordinalDays[ordinalDays.length - 1]} at ${time}`;
                }

                case 'cron': {
                    if (!cronExpression || !cronExpression.trim()) {
                        return 'Custom schedule (no cron expression)';
                    }

                    try {
                        const humanReadable = cronstrue.toString(cronExpression, {
                            throwExceptionOnParseError: false,
                            verbose: false,
                            use24HourTimeFormat: true
                        });
                        return `Custom: ${humanReadable}`;
                    } catch (error) {
                        return `Custom schedule (invalid cron expression)`;
                    }
                }

                default:
                    return `Unknown schedule type: ${scheduleType}`;
            }
        } catch (error) {
            return `Error generating schedule summary: ${error.message}`;
        }
    };

    const summary = generateSummary();
    const isEmpty = summary === 'No schedule configured';

    return (
        <div className={`p-3 rounded-md border ${isEmpty ? 'bg-gray-50 border-gray-200' : 'bg-blue-50 border-blue-200'} ${className}`}>
            <div className="text-sm">
                <div className={`font-medium ${isEmpty ? 'text-gray-600' : 'text-blue-800'}`}>
                    Schedule Summary
                </div>
                <div className={`mt-1 ${isEmpty ? 'text-gray-500' : 'text-blue-700'}`}>
                    {summary}
                </div>
            </div>
        </div>
    );
});

ScheduleSummary.displayName = 'ScheduleSummary';

export default ScheduleSummary;