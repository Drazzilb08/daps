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

export function HolidayPresetsField({ field, value, onChange, onPresetSelected, moduleConfig }) {
    const addedNames = Array.isArray(moduleConfig?.holidays)
        ? moduleConfig.holidays.map(entry => entry?.name).filter(Boolean)
        : [];

    function handlePresetChange(e) {
        const selected = HOLIDAY_PRESETS.find(p => p.name === e.target.value);
        if (selected) {
            if (typeof onPresetSelected === 'function') {
                onPresetSelected(selected);
            } else if (typeof onChange === 'function') {
                onChange(selected);
            }
        }
    }

    return (
        <div className="settings-field-row modal-field-row">
            <div className="settings-field-labelcol modal-field-labelcol">
                <label htmlFor="holiday-preset">{field.label || 'Preset'}</label>
            </div>
            <div className="settings-field-inputwrap modal-field-inputwrap">
                <select
                    id="holiday-preset"
                    className="select"
                    value={value?.name || ''}
                    onChange={handlePresetChange}
                >
                    <option value="">Select preset...</option>
                    {HOLIDAY_PRESETS.map(preset => (
                        <option
                            key={preset.name}
                            value={preset.name}
                            disabled={addedNames.includes(preset.name)}
                        >
                            {preset.name}
                            {addedNames.includes(preset.name) ? ' (Already Added)' : ''}
                        </option>
                    ))}
                </select>
                {field.description && <div className="field-help-text">{field.description}</div>}
            </div>
        </div>
    );
}
