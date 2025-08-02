import React from 'react';
import { isValidCron } from 'cron-validator';
import cronstrue from 'cronstrue/i18n';

const pills = [
    { type: 'hourly', label: 'Hourly' },
    { type: 'daily', label: 'Daily' },
    { type: 'weekly', label: 'Weekly' },
    { type: 'monthly', label: 'Monthly' },
    { type: 'cron', label: 'Cron' },
];

const WEEKDAYS = [
    { label: 'Sun', value: 'sunday' },
    { label: 'Mon', value: 'monday' },
    { label: 'Tue', value: 'tuesday' },
    { label: 'Wed', value: 'wednesday' },
    { label: 'Thu', value: 'thursday' },
    { label: 'Fri', value: 'friday' },
    { label: 'Sat', value: 'saturday' },
];

// Helper: Parse string into type/fields
function parseValue(v) {
    let initialType = 'daily',
        parsed = {};
    let m;
    if (typeof v === 'string') {
        if ((m = v.match(/^hourly\((\d{2})\)$/))) {
            initialType = 'hourly';
            parsed.minute = m[1];
        } else if ((m = v.match(/^daily\(([\d:|]+)\)$/))) {
            initialType = 'daily';
            parsed.times = m[1].split('|');
        } else if ((m = v.match(/^weekly\(([\w@|]+)\)$/))) {
            initialType = 'weekly';
            parsed.weekly = m[1];
        } else if ((m = v.match(/^monthly\(([\w@|]+)\)$/))) {
            initialType = 'monthly';
            parsed.monthly = m[1];
        } else if ((m = v.match(/^cron\(([^)]*)\)$/))) {
            initialType = 'cron';
            parsed.expr = m[1];
        }
    }
    return { initialType, parsed };
}

export function ScheduleField({ field, value, onChange, onValidityChange, onTypeChange }) {
    // Only parse parent value on mount!
    const initial = React.useMemo(() => parseValue(value), [value]);
    const [type, setType] = React.useState(initial.initialType);
    const [fields, setFields] = React.useState(initial.parsed);
    const [cronTouched, setCronTouched] = React.useState(false);
    const [cronError, setCronError] = React.useState('');
    const [cronHuman, setCronHuman] = React.useState('');

    React.useEffect(() => {
        if (onTypeChange) onTypeChange(type);
    }, [type, onTypeChange]);

    // Only allow external changes to overwrite type/fields on initial mount or reset
    const isEmptyValue = value === '' || value === undefined || value === null;
    React.useEffect(() => {
        // Only run if value actually changed and it's not our own change
        if (value === '' || value === undefined || value === null) {
            setType('daily');
            setFields({});
        } else if (typeof value === 'string') {
            const parsed = parseValue(value);
            setType(parsed.initialType);
            setFields(parsed.parsed);
        }
        // else ignore, keep local state
    }, [value, isEmptyValue]);

    // When pill is changed, reset fields to default for that type
    function handleTypeChange(newType) {
        setType(newType);
        if (newType === 'hourly') setFields({ minute: '0' });
        else if (newType === 'daily') setFields({ times: ['00:00'] });
        else if (newType === 'weekly') setFields({ weekly: '' });
        else if (newType === 'monthly') setFields({ monthly: '' });
        else if (newType === 'cron') setFields({ expr: '' });
        setCronTouched(false);
    }

    // Compose schedule string & validate cron
    React.useEffect(() => {
        let schedString = '';
        if (type === 'hourly') {
            const min = String(fields.minute || '0').padStart(2, '0');
            schedString = `hourly(${min})`;
        } else if (type === 'daily') {
            schedString = `daily(${(fields.times || []).join('|')})`;
        } else if (type === 'weekly') {
            schedString = `weekly(${fields.weekly || ''})`;
        } else if (type === 'monthly') {
            schedString = `monthly(${fields.monthly || ''})`;
        } else if (type === 'cron') {
            schedString = `cron(${fields.expr || ''})`;
        }
        onChange(schedString);

        // Validate cron
        if (type === 'cron') {
            let isValid = false;
            let errorMsg = '';
            let explanation = '';
            if (!fields.expr) {
                errorMsg = '';
                isValid = false;
                explanation = '';
            } else if (!isValidCron(fields.expr, { seconds: true, allowBlankDay: true })) {
                errorMsg =
                    'Invalid cron expression. Must be a standard cron string (5 or 6 fields).';
                isValid = false;
                explanation = '';
            } else {
                try {
                    explanation = cronstrue.toString(fields.expr, { locale: 'en' });
                    errorMsg = '';
                    isValid = true;
                } catch {
                    errorMsg = 'Expression cannot be parsed for human explanation.';
                    explanation = '';
                    isValid = false;
                }
            }
            setCronError(errorMsg);
            setCronHuman(explanation);
            if (onValidityChange) onValidityChange(isValid);
        } else {
            setCronError('');
            setCronHuman('');
            if (onValidityChange) onValidityChange(true);
        }
    }, [type, fields, onChange, onValidityChange]);

    // Summary string
    function getSummary() {
        if (type === 'hourly') return `Will run at minute ${fields.minute || '0'} of every hour.`;
        if (type === 'daily')
            return `Will run daily at ${(fields.times || []).join(', ') || '[no times set]'}`;
        if (type === 'weekly')
            return fields.weekly
                ? `Will run on ${fields.weekly.replace(/\|/g, ', ')}`
                : 'Pick at least one day of the week.';
        if (type === 'monthly')
            return fields.monthly
                ? `Will run on days ${fields.monthly.replace(/\|/g, ', ')}`
                : 'Pick at least one day of the month.';
        if (type === 'cron') {
            if (!fields.expr) return 'Enter a cron expression.';
            if (cronHuman) return `Will run: ${cronHuman}`;
            if (cronError) return '';
            return `Will run: (unparseable expression)`;
        }
        return '';
    }

    // Field updaters
    function updateDailyTime(idx, val) {
        setFields(f => ({
            ...f,
            times: f.times.map((t, i) => (i === idx ? val : t)),
        }));
    }
    function addDailyTime() {
        setFields(f => ({ ...f, times: [...(f.times || []), '12:00'] }));
    }
    function removeDailyTime(idx) {
        setFields(f => ({ ...f, times: f.times.filter((_, i) => i !== idx) }));
    }

    function toggleWeeklyDay(day) {
        setFields(f => {
            const parts = (f.weekly || '').split('|').filter(Boolean);
            if (parts.includes(day))
                return { ...f, weekly: parts.filter(d => d !== day).join('|') };
            else return { ...f, weekly: [...parts, day].join('|') };
        });
    }

    function setWeeklyTime(val) {
        setFields(f => {
            const days = (f.weekly || '').split('|').filter(Boolean);
            return {
                ...f,
                weekly: days.map(d => `${d.split('@')[0]}@${val}`).join('|'),
            };
        });
    }

    function toggleMonthlyDay(day) {
        setFields(f => {
            const parts = (f.monthly || '').split('|').filter(Boolean);
            if (parts.map(p => p.split('@')[0]).includes(day)) {
                return { ...f, monthly: parts.filter(p => p.split('@')[0] !== day).join('|') };
            } else {
                const time = parts[0]?.split('@')[1] || '12:00';
                return { ...f, monthly: [...parts, `${day}@${time}`].join('|') };
            }
        });
    }

    function setMonthlyTime(val) {
        setFields(f => {
            const days = (f.monthly || '').split('|').filter(Boolean);
            return {
                ...f,
                monthly: days.map(d => `${d.split('@')[0]}@${val}`).join('|'),
            };
        });
    }

    // UI
    return (
        <div className="settings-field-row field-schedule">
            <div className="settings-field-labelcol">
                <label>{field.label || 'Schedule'}</label>
            </div>
            <div className="settings-field-inputwrap">
                <div className="pill-group" style={{ marginBottom: 8 }}>
                    {pills.map(p => (
                        <button
                            key={p.type}
                            type="button"
                            className={`pill${type === p.type ? ' active' : ''}`}
                            onClick={() => handleTypeChange(p.type)}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
                {/* Hourly */}
                {type === 'hourly' && (
                    <>
                        <label>At minute:</label>
                        <input
                            type="number"
                            min="0"
                            max="59"
                            className="input schedule-hourly-minute"
                            value={fields.minute || '0'}
                            onChange={e => setFields(f => ({ ...f, minute: e.target.value }))}
                        />
                        <span style={{ marginLeft: 6 }}>(0 = top of hour)</span>
                    </>
                )}
                {/* Daily */}
                {type === 'daily' && (
                    <>
                        <label>Time(s):</label>
                        <div className="daily-times">
                            {(fields.times || []).map((t, i) => (
                                <div className="daily-times-row" key={i}>
                                    <input
                                        type="time"
                                        className="input"
                                        value={t}
                                        onChange={e => updateDailyTime(i, e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        className="btn btn--remove-item remove-btn"
                                        onClick={() => removeDailyTime(i)}
                                    >
                                        &minus;
                                    </button>
                                </div>
                            ))}
                            <button
                                type="button"
                                className="add-time-btn btn"
                                onClick={addDailyTime}
                            >
                                + Add time
                            </button>
                        </div>
                    </>
                )}
                {/* Weekly */}
                {type === 'weekly' && (
                    <>
                        <label>Day(s):</label>
                        <div className="weekday-pills">
                            {WEEKDAYS.map(({ label, value }) => (
                                <button
                                    type="button"
                                    key={value}
                                    className={`weekday-pill${
                                        (fields.weekly || '').includes(value) ? ' active' : ''
                                    }`}
                                    onClick={() => toggleWeeklyDay(value)}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                        <label style={{ marginTop: 8 }}>At:</label>
                        <input
                            type="time"
                            className="input"
                            value={
                                fields.weekly && fields.weekly.includes('@')
                                    ? fields.weekly.split('@')[1]
                                    : '12:00'
                            }
                            onChange={e => setWeeklyTime(e.target.value)}
                        />
                    </>
                )}
                {/* Monthly */}
                {type === 'monthly' && (
                    <>
                        <label>Day(s) of month:</label>
                        <div className="monthday-pills">
                            {Array.from({ length: 31 }).map((_, i) => {
                                const dayStr = String(i + 1);
                                const activeDays = (fields.monthly || '')
                                    .split('|')
                                    .map(p => p.split('@')[0]);
                                const isActive = activeDays.includes(dayStr);
                                return (
                                    <button
                                        type="button"
                                        key={dayStr}
                                        className={`monthday-pill${isActive ? ' active' : ''}`}
                                        onClick={() => toggleMonthlyDay(dayStr)}
                                    >
                                        {dayStr}
                                    </button>
                                );
                            })}
                        </div>
                        <label style={{ marginTop: 8 }}>At:</label>
                        <input
                            type="time"
                            className="input"
                            value={
                                fields.monthly && fields.monthly.includes('@')
                                    ? fields.monthly.split('@')[1]
                                    : '12:00'
                            }
                            onChange={e => setMonthlyTime(e.target.value)}
                        />
                    </>
                )}
                {/* Cron */}
                {type === 'cron' && (
                    <>
                        <label>Cron Expression</label>
                        <input
                            type="text"
                            className={`input${cronTouched && fields.expr && cronError ? ' input--error' : ''}`}
                            value={fields.expr || ''}
                            placeholder="e.g. 0 0 * * *"
                            onChange={e => {
                                setFields(f => ({ ...f, expr: e.target.value }));
                                setCronTouched(true);
                            }}
                        />
                        <div className="cron-msg-wrap">
                            {cronTouched && fields.expr && cronError && (
                                <div className="cron-msg-error">{cronError}</div>
                            )}
                        </div>
                        <div className="cron-link-hint">
                            <a
                                href="https://crontab.guru/"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                What is cron?
                            </a>
                        </div>
                    </>
                )}
                <div className="schedule-summary" style={{ marginTop: 12, fontStyle: 'italic' }}>
                    {getSummary()}
                </div>
            </div>
        </div>
    );
}
