import React from 'react';

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

export function HolidayScheduleField({ field, value, onChange }) {
    // Parse the string value into parts
    function parseSchedule(val) {
        let fromMonth = '01',
            fromDay = '01',
            toMonth = '01',
            toDay = '01';
        if (typeof val === 'string' && val.startsWith('range(')) {
            const m = val.match(/^range\((\d{2})\/(\d{2})-(\d{2})\/(\d{2})\)/);
            if (m) [, fromMonth, fromDay, toMonth, toDay] = m;
        }
        return { fromMonth, fromDay, toMonth, toDay };
    }

    // Always parse value prop—do not maintain own state!
    const { fromMonth, fromDay, toMonth, toDay } = parseSchedule(value);

    // Helper for day options
    function dayOptions(month) {
        const days = months.find(m => m.value === month)?.days || 31;
        return Array.from({ length: days }, (_, i) => {
            const d = String(i + 1).padStart(2, '0');
            return (
                <option key={d} value={d}>
                    {d}
                </option>
            );
        });
    }

    function handleChange(newVals) {
        const fm = newVals.fromMonth ?? fromMonth;
        const fd = newVals.fromDay ?? fromDay;
        const tm = newVals.toMonth ?? toMonth;
        const td = newVals.toDay ?? toDay;
        onChange(`range(${fm}/${fd}-${tm}/${td})`);
    }

    return (
        <div className="settings-field-row modal-field-row">
            <div className="settings-field-labelcol modal-field-labelcol">
                <label>{field.label || 'Schedule'}</label>
            </div>
            <div className="settings-field-inputwrap modal-field-inputwrap">
                <div className="schedule-range">
                    <select
                        id="schedule-from-month"
                        className="select"
                        value={fromMonth}
                        onChange={e => handleChange({ fromMonth: e.target.value, fromDay: '01' })}
                    >
                        {months.map(m => (
                            <option key={m.value} value={m.value}>
                                {m.label}
                            </option>
                        ))}
                    </select>
                    <select
                        id="schedule-from-day"
                        className="select"
                        value={fromDay}
                        onChange={e => handleChange({ fromDay: e.target.value })}
                    >
                        {dayOptions(fromMonth)}
                    </select>
                    <span className="schedule-to-label">To</span>
                    <select
                        id="schedule-to-month"
                        className="select"
                        value={toMonth}
                        onChange={e => handleChange({ toMonth: e.target.value, toDay: '01' })}
                    >
                        {months.map(m => (
                            <option key={m.value} value={m.value}>
                                {m.label}
                            </option>
                        ))}
                    </select>
                    <select
                        id="schedule-to-day"
                        className="select"
                        value={toDay}
                        onChange={e => handleChange({ toDay: e.target.value })}
                    >
                        {dayOptions(toMonth)}
                    </select>
                </div>
            </div>
        </div>
    );
}
