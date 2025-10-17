/**
 * DateRangeField Component
 *
 * Date range selection field using primitive composition.
 * Supports month/day selection with proper validation and accessibility.
 * Uses format: range(MM/DD-MM/DD)
 */

import React, { useCallback, useMemo } from 'react';
import { FieldWrapper, FieldLabel, FieldError, FieldDescription, SelectBase } from '../primitives';

// Month configuration with days
const months = [
    { value: '01', label: 'January', days: 31 },
    { value: '02', label: 'February', days: 29 },
    { value: '03', label: 'March', days: 31 },
    { value: '04', label: 'April', days: 30 },
    { value: '05', label: 'May', days: 31 },
    { value: '06', label: 'June', days: 30 },
    { value: '07', label: 'July', days: 31 },
    { value: '08', label: 'August', days: 31 },
    { value: '09', label: 'September', days: 30 },
    { value: '10', label: 'October', days: 31 },
    { value: '11', label: 'November', days: 30 },
    { value: '12', label: 'December', days: 31 },
];

/**
 * DateRangeField component for date range selection
 *
 * @param {Object} props - Component props
 * @param {Object} props.field - Field configuration object
 * @param {string} props.value - Current field value in format range(MM/DD-MM/DD)
 * @param {Function} props.onChange - Value change handler
 * @param {boolean} props.disabled - Field disabled state
 * @param {boolean} props.highlightInvalid - Show validation error state
 * @param {string} props.errorMessage - Error message to display
 */
export const DateRangeField = React.memo(
    ({
        field,
        value,
        onChange,
        disabled = false,
        highlightInvalid = false,
        errorMessage = null,
    }) => {
        // Parse the string value into components
        const parseSchedule = useCallback(val => {
            let fromMonth = '01',
                fromDay = '01',
                toMonth = '01',
                toDay = '01';

            if (typeof val === 'string' && val.startsWith('range(')) {
                const match = val.match(/^range\((\d{2})\/(\d{2})-(\d{2})\/(\d{2})\)/);
                if (match) {
                    [, fromMonth, fromDay, toMonth, toDay] = match;
                }
            }
            return { fromMonth, fromDay, toMonth, toDay };
        }, []);

        const { fromMonth, fromDay, toMonth, toDay } = useMemo(
            () => parseSchedule(value),
            [value, parseSchedule]
        );

        // Generate day options for a given month
        const generateDayOptions = useCallback(monthValue => {
            const monthData = months.find(m => m.value === monthValue);
            const days = monthData?.days || 31;

            return Array.from({ length: days }, (_, i) => {
                const dayValue = String(i + 1).padStart(2, '0');
                return { value: dayValue, label: dayValue };
            });
        }, []);

        const fromDayOptions = useMemo(
            () => generateDayOptions(fromMonth),
            [fromMonth, generateDayOptions]
        );
        const toDayOptions = useMemo(
            () => generateDayOptions(toMonth),
            [toMonth, generateDayOptions]
        );

        // Month options for SelectBase
        const monthOptions = useMemo(
            () =>
                months.map(month => ({
                    value: month.value,
                    label: month.label,
                })),
            []
        );

        // Handle changes to date components
        const handleChange = useCallback(
            newValues => {
                const fm = newValues.fromMonth ?? fromMonth;
                const fd = newValues.fromDay ?? fromDay;
                const tm = newValues.toMonth ?? toMonth;
                const td = newValues.toDay ?? toDay;

                onChange(`range(${fm}/${fd}-${tm}/${td})`);
            },
            [fromMonth, fromDay, toMonth, toDay, onChange]
        );

        // Individual change handlers
        const handleFromMonthChange = useCallback(
            e => {
                handleChange({ fromMonth: e.target.value, fromDay: '01' });
            },
            [handleChange]
        );

        const handleFromDayChange = useCallback(
            e => {
                handleChange({ fromDay: e.target.value });
            },
            [handleChange]
        );

        const handleToMonthChange = useCallback(
            e => {
                handleChange({ toMonth: e.target.value, toDay: '01' });
            },
            [handleChange]
        );

        const handleToDayChange = useCallback(
            e => {
                handleChange({ toDay: e.target.value });
            },
            [handleChange]
        );

        const inputId = `field-${field.key}`;

        return (
            <FieldWrapper invalid={highlightInvalid}>
                <FieldLabel
                    htmlFor={inputId}
                    label={field.label || 'Date Range'}
                    required={field.required}
                />

                {/* Enhanced accessibility with fieldset grouping */}
                <fieldset aria-labelledby={inputId} className="border-0 p-0 m-0">
                    <legend className="sr-only">Date range selection</legend>

                    {/* Mobile: Stack vertically, Desktop: Horizontal layout */}
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
                        {/* From Date Group - Grouped Container */}
                        <div className="p-3 flex-1">
                            <div className="flex flex-col gap-1 mb-2">
                                <span
                                    className="text-sm font-medium text-primary"
                                    id={`${inputId}-from-label`}
                                >
                                    From
                                </span>
                            </div>
                            <div
                                className="flex gap-2"
                                role="group"
                                aria-labelledby={`${inputId}-from-label`}
                            >
                                {/* From Month */}
                                <div className="flex flex-col flex-1 min-w-24">
                                    <label
                                        className="text-xs text-secondary mb-1"
                                        htmlFor={`${inputId}-from-month`}
                                    >
                                        Month
                                    </label>
                                    <SelectBase
                                        id={`${inputId}-from-month`}
                                        name={`${field.key}-from-month`}
                                        value={fromMonth}
                                        onChange={handleFromMonthChange}
                                        disabled={disabled}
                                        invalid={highlightInvalid}
                                        options={monthOptions}
                                        ariaDescribedby={`${inputId}-desc ${inputId}-error`.trim()}
                                        aria-label="From month selection"
                                    />
                                </div>

                                {/* From Day */}
                                <div className="flex flex-col w-16">
                                    <label
                                        className="text-xs text-secondary mb-1"
                                        htmlFor={`${inputId}-from-day`}
                                    >
                                        Day
                                    </label>
                                    <SelectBase
                                        id={`${inputId}-from-day`}
                                        name={`${field.key}-from-day`}
                                        value={fromDay}
                                        onChange={handleFromDayChange}
                                        disabled={disabled}
                                        invalid={highlightInvalid}
                                        options={fromDayOptions}
                                        ariaDescribedby={`${inputId}-desc ${inputId}-error`.trim()}
                                        aria-label="From day selection"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* To Connector - De-emphasized */}
                        <div className="flex items-center justify-center py-2">
                            <span className="text-secondary text-sm opacity-75" aria-hidden="true">
                                to
                            </span>
                        </div>

                        {/* To Date Group - Grouped Container */}
                        <div className="p-3 flex-1">
                            <div className="flex flex-col gap-1 mb-2">
                                <span
                                    className="text-sm font-medium text-primary"
                                    id={`${inputId}-to-label`}
                                >
                                    To
                                </span>
                            </div>
                            <div
                                className="flex gap-2"
                                role="group"
                                aria-labelledby={`${inputId}-to-label`}
                            >
                                {/* To Month */}
                                <div className="flex flex-col flex-1 min-w-24">
                                    <label
                                        className="text-xs text-secondary mb-1"
                                        htmlFor={`${inputId}-to-month`}
                                    >
                                        Month
                                    </label>
                                    <SelectBase
                                        id={`${inputId}-to-month`}
                                        name={`${field.key}-to-month`}
                                        value={toMonth}
                                        onChange={handleToMonthChange}
                                        disabled={disabled}
                                        invalid={highlightInvalid}
                                        options={monthOptions}
                                        ariaDescribedby={`${inputId}-desc ${inputId}-error`.trim()}
                                        aria-label="To month selection"
                                    />
                                </div>

                                {/* To Day */}
                                <div className="flex flex-col w-16">
                                    <label
                                        className="text-xs text-secondary mb-1"
                                        htmlFor={`${inputId}-to-day`}
                                    >
                                        Day
                                    </label>
                                    <SelectBase
                                        id={`${inputId}-to-day`}
                                        name={`${field.key}-to-day`}
                                        value={toDay}
                                        onChange={handleToDayChange}
                                        disabled={disabled}
                                        invalid={highlightInvalid}
                                        options={toDayOptions}
                                        ariaDescribedby={`${inputId}-desc ${inputId}-error`.trim()}
                                        aria-label="To day selection"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </fieldset>

                <FieldDescription id={`${inputId}-desc`} description={field.description} />
                <FieldError id={`${inputId}-error`} message={errorMessage} />
            </FieldWrapper>
        );
    }
);

DateRangeField.displayName = 'DateRangeField';
