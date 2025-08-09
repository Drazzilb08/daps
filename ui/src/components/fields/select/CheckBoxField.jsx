import React from 'react';

export const CheckBoxField = React.memo(function CheckBoxField({
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
                    type="checkbox"
                    className={`settings-checkbox${highlightInvalid ? ' input-error' : ''}`}
                    id={field.key}
                    name={field.key}
                    checked={!!value}
                    onChange={e => onChange(field.key, e.target.checked)}
                />
                {field.description && <div className="field-help-text">{field.description}</div>}
                {highlightInvalid && errorMessage && (
                    <div className="field-error-text">{errorMessage}</div>
                )}
            </div>
        </div>
    );
});