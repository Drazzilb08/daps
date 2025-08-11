import React from 'react';

export const NumberField = React.memo(function NumberField({
    field,
    value,
    onChange,
    highlightInvalid = false,
    errorMessage = null,
}) {
    return (
        <div className={`settings-field-row${highlightInvalid ? ' field-error' : ''}`}>
            <div className="settings-field-labelcol">
                <label htmlFor={field.key}>{field.label}</label>
            </div>
            <div className="settings-field-inputwrap">
                <input
                    type="number"
                    className={`input${highlightInvalid ? ' input-error' : ''}`}
                    name={field.key}
                    id={field.key}
                    placeholder={field.placeholder}
                    min={field.min}
                    max={field.max}
                    step={field.step}
                    value={value ?? ''}
                    onChange={e =>
                        onChange(e.target.value === '' ? '' : parseInt(e.target.value, 10))
                    }
                />
                {field.description && <div className="field-help-text">{field.description}</div>}
                {highlightInvalid && errorMessage && (
                    <div className="field-error-text">{errorMessage}</div>
                )}
            </div>
        </div>
    );
});
