import React from 'react';

export const DropdownField = React.memo(function DropdownField({
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
                <select
                    className={`select${highlightInvalid ? ' input-error' : ''}`}
                    id={field.key}
                    name={field.key}
                    value={value ?? ''}
                    onChange={e => onChange(e.target.value)}
                >
                    {field.options.map(opt => (
                        <option key={opt} value={opt}>
                            {opt}
                        </option>
                    ))}
                </select>
                {field.description && <div className="field-help-text">{field.description}</div>}
                {errorMessage && <div className="field-error-text">{errorMessage}</div>}
            </div>
        </div>
    );
});
