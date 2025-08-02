export function TextField({
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
                    type="text"
                    className={`input${highlightInvalid ? ' input-error' : ''}`}
                    name={field.key}
                    id={field.key}
                    value={value ?? ''}
                    placeholder={field.placeholder}
                    readOnly={field.modal === 'directoryPickerModal'}
                    onChange={e => {
                        onChange(field.key, e.target.value);
                    }}
                />
                {field.description && <div className="field-help-text">{field.description}</div>}
                {highlightInvalid && errorMessage && (
                    <div className="field-error-text">{errorMessage}</div>
                )}
            </div>
        </div>
    );
}
