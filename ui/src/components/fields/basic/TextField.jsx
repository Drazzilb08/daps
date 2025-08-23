import React from 'react';

/**
 * Text input field component with validation support
 * @param {Object} props - Component props
 * @param {Object} props.field - Field configuration object
 * @param {string} props.value - Current field value
 * @param {Function} props.onChange - Value change handler
 * @param {boolean} [props.highlightInvalid=false] - Whether to show error styling
 * @param {string|null} [props.errorMessage=null] - Error message to display
 * @returns {JSX.Element} Text input field with label and validation
 */
export const TextField = React.memo(function TextField({
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
                    onChange={e => onChange(e.target.value)}
                />
                {field.description && <div className="field-help-text">{field.description}</div>}
                {highlightInvalid && errorMessage && (
                    <div className="field-error-text">{errorMessage}</div>
                )}
            </div>
        </div>
    );
});
