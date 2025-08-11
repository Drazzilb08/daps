import React, { useState } from 'react';

export const PasswordField = React.memo(function PasswordField({
    field,
    value,
    onChange,
    highlightInvalid = false,
    errorMessage = null,
}) {
    const [show, setShow] = useState(false);

    return (
        <div className={`settings-field-row${highlightInvalid ? ' field-error' : ''}`}>
            <div className="settings-field-labelcol">
                <label htmlFor={field.key}>{field.label}</label>
            </div>
            <div className="settings-field-inputwrap">
                <div className="password-wrapper">
                    <input
                        type={show ? 'text' : 'password'}
                        className={`input password-input${highlightInvalid ? ' input-error' : ''}${show ? '' : ' masked-input'}`}
                        name={field.key}
                        id={field.key}
                        value={value ?? ''}
                        placeholder={field.placeholder}
                        autoComplete="current-password"
                        onChange={e => onChange(e.target.value)}
                    />
                    <button
                        type="button"
                        className="toggle-password"
                        aria-label="Show/Hide Password"
                        tabIndex={0}
                        onClick={e => {
                            e.preventDefault();
                            setShow(v => !v);
                        }}
                    >
                        <i className="material-icons">{show ? 'visibility_off' : 'visibility'}</i>
                    </button>
                </div>
                {field.description && <div className="field-help-text">{field.description}</div>}
                {highlightInvalid && errorMessage && (
                    <div className="field-error-text">{errorMessage}</div>
                )}
            </div>
        </div>
    );
});
