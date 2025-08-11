import React from 'react';

export const FloatField = React.memo(function FloatField({
    field,
    value,
    onChange,
    highlightInvalid = false,
    errorMessage = null,
}) {
    // Show as percent (0..100), store as float (0..1)
    let percentValue = '';
    if (typeof value === 'number') {
        percentValue = Math.round(value * 100 * 100) / 100;
    } else if (typeof value === 'string' && value !== '') {
        percentValue = Math.round(parseFloat(value) * 100 * 100) / 100;
    }

    return (
        <div className={`settings-field-row${highlightInvalid ? ' field-error' : ''}`}>
            <div className="settings-field-labelcol">
                <label htmlFor={field.key}>{field.label}</label>
            </div>
            <div className="settings-field-inputwrap">
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input
                        type="number"
                        className={`input${highlightInvalid ? ' input-error' : ''}`}
                        name={field.key}
                        id={field.key}
                        min={0}
                        max={100}
                        step={1}
                        placeholder={field.placeholder}
                        value={percentValue}
                        onChange={e =>
                            onChange(
                                e.target.value === ''
                                    ? ''
                                    : Math.min(1, Math.max(0, parseFloat(e.target.value) / 100))
                            )
                        }
                        style={{ flex: '1 1 auto' }}
                    />
                    <span>%</span>
                </div>
                {field.description && <div className="field-help-text">{field.description}</div>}
                {errorMessage && <div className="field-error-text">{errorMessage}</div>}
            </div>
        </div>
    );
});
