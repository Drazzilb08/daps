// src/components/fields/select/ColorField.jsx
import React from 'react';

export function ColorField({
    field,
    value,
    onChange,
    highlightInvalid = false,
    errorMessage = null,
}) {
    const outerClass = 'settings-field-row field-color' + (highlightInvalid ? ' field-error' : '');
    const inputClass = highlightInvalid ? 'input-error' : undefined;
    return (
        <div className={outerClass}>
            <div className="settings-field-labelcol">
                <label>{field.label || 'Color'}</label>
            </div>
            <div className="settings-field-inputwrap">
                <div className="color-picker-swatch">
                    <input
                        type="color"
                        className={inputClass}
                        value={typeof value === 'string' ? value : '#ffffff'}
                        onChange={e => onChange?.(e.target.value)}
                        onInput={e => onChange?.(e.target.value)}
                    />
                </div>
                {field.description && <div className="field-help-text">{field.description}</div>}
                {errorMessage && <div className="field-error-text">{errorMessage}</div>}
            </div>
        </div>
    );
}
