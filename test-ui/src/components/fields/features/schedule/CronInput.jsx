import React, { useState, useCallback, useEffect } from 'react';
import { isValidCron } from 'cron-validator';
import cronstrue from 'cronstrue';

/**
 * Cron expression input with real-time validation and human-readable explanation
 * @param {string} value - Cron expression string
 * @param {Function} onChange - Value change callback
 * @param {Function} onValidityChange - Validation status callback
 * @param {boolean} disabled - Whether the input is disabled
 * @param {string} className - Additional CSS classes
 */
export const CronInput = React.memo(({
    value = '',
    onChange,
    onValidityChange,
    disabled = false,
    className = ''
}) => {
    const [isValid, setIsValid] = useState(true);
    const [explanation, setExplanation] = useState('');
    const [validationError, setValidationError] = useState('');

    // Validate and explain cron expression
    const validateCron = useCallback((cronExpression) => {
        if (!cronExpression.trim()) {
            setIsValid(true);
            setExplanation('');
            setValidationError('');
            return true;
        }

        try {
            const valid = isValidCron(cronExpression, { seconds: false });

            if (valid) {
                const humanReadable = cronstrue.toString(cronExpression, {
                    throwExceptionOnParseError: false,
                    verbose: false,
                    use24HourTimeFormat: true
                });

                setIsValid(true);
                setExplanation(humanReadable);
                setValidationError('');
                return true;
            } else {
                setIsValid(false);
                setExplanation('');
                setValidationError('Invalid cron expression format');
                return false;
            }
        } catch (error) {
            setIsValid(false);
            setExplanation('');
            setValidationError(error.message || 'Invalid cron expression');
            return false;
        }
    }, []);

    // Validate when value changes
    useEffect(() => {
        const valid = validateCron(value);
        if (onValidityChange) {
            onValidityChange(valid);
        }
    }, [value, validateCron]); // Remove onValidityChange from dependencies to prevent infinite loop

    const handleChange = useCallback((e) => {
        const newValue = e.target.value;
        onChange(newValue);
    }, [onChange]);

    return (
        <div className={`mb-4 ${className}`}>
            <div className="text-sm font-medium text-text-secondary mb-2">
                Cron Expression
            </div>

            <input
                type="text"
                value={value}
                onChange={handleChange}
                disabled={disabled}
                placeholder="0 9 * * 1-5  (9 AM on weekdays)"
                className={`
                    w-full px-3 py-2 border rounded-md min-h-11
                    bg-surface text-text-primary font-mono text-sm
                    transition-colors duration-200
                    ${disabled
                        ? 'opacity-50 cursor-not-allowed bg-surface-disabled'
                        : 'hover:border-border-hover focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                    }
                    ${!isValid && value.trim()
                        ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                        : 'border-border'
                    }
                `}
            />

            {/* Help text */}
            <div className="text-xs text-text-tertiary mt-1">
                Format: minute hour day month weekday
                <a
                    href="https://crontab.guru"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 text-blue-600 hover:text-blue-800 underline"
                >
                    crontab.guru helper
                </a>
            </div>

            {/* Real-time explanation or error */}
            {value.trim() && (
                <div className="mt-2">
                    {isValid && explanation ? (
                        <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                            <div className="text-sm text-green-800">
                                <strong>Schedule:</strong> {explanation}
                            </div>
                        </div>
                    ) : validationError ? (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                            <div className="text-sm text-red-800">
                                <strong>Error:</strong> {validationError}
                            </div>
                        </div>
                    ) : null}
                </div>
            )}

            {/* Common examples */}
            {!value.trim() && (
                <div className="mt-2 text-xs text-text-tertiary">
                    <div className="font-medium mb-1">Common examples:</div>
                    <div className="space-y-1">
                        <div><code className="bg-gray-100 px-1 py-0.5 rounded">0 9 * * *</code> - Daily at 9:00 AM</div>
                        <div><code className="bg-gray-100 px-1 py-0.5 rounded">0 9 * * 1-5</code> - Weekdays at 9:00 AM</div>
                        <div><code className="bg-gray-100 px-1 py-0.5 rounded">0 0 1 * *</code> - First day of every month</div>
                    </div>
                </div>
            )}
        </div>
    );
});

CronInput.displayName = 'CronInput';

export default CronInput;