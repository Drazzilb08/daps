import React from 'react';

/**
 * Number input field component with min/max/step support and validation
 * @param {Object} props - Component props
 * @param {Object} props.field - Field configuration with min/max/step properties
 * @param {number|string} props.value - Current field value
 * @param {Function} props.onChange - Value change handler
 * @param {boolean} [props.highlightInvalid=false] - Whether to show error styling
 * @param {string|null} [props.errorMessage=null] - Error message to display
 * @returns {JSX.Element} Number input field with validation
 */
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
