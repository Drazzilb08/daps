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
                <label>{field.label}</label>
            </div>
            <div className="settings-field-inputwrap">
                <label className="checkbox-row">
                    <input
                        type="checkbox"
                        className={`settings-checkbox${highlightInvalid ? ' input-error' : ''}`}
                        checked={!!value}
                        onChange={e => onChange(e.target.checked)}
                    />
                    {field.description && (
                        <span className="checkbox-label field-help-text">{field.description}</span>
                    )}
                </label>
                {highlightInvalid && errorMessage && (
                    <div className="field-error-text">{errorMessage}</div>
                )}
            </div>
        </div>
    );
});
