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
                    {field.options.map(opt => {
                        // Handle both string options and {value, label} objects
                        const value = typeof opt === 'string' ? opt : opt.value;
                        const label = typeof opt === 'string' ? opt : opt.label;
                        return (
                            <option key={value} value={value}>
                                {label}
                            </option>
                        );
                    })}
                </select>
                {field.description && <div className="field-help-text">{field.description}</div>}
                {errorMessage && <div className="field-error-text">{errorMessage}</div>}
            </div>
        </div>
    );
});
