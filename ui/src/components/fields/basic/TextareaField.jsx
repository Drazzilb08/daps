import React, { useRef, useEffect } from 'react';

export const TextareaField = React.memo(function TextareaField({
    field,
    value,
    onChange,
    highlightInvalid = false,
    errorMessage = null,
}) {
    const textareaRef = useRef(null);

    useEffect(() => {
        if (textareaRef.current) {
            // Auto-resize on value change
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [value]);

    const handleInput = e => {
        onChange(field.key, e.target.value);
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    };

    return (
        <div className={'settings-field-row' + (highlightInvalid ? ' field-error' : '')}>
            <div className="settings-field-labelcol">
                <label htmlFor={field.key}>{field.label}</label>
            </div>
            <div className="settings-field-inputwrap">
                <textarea
                    ref={textareaRef}
                    className={'textarea' + (highlightInvalid ? ' input-error' : '')}
                    name={field.key}
                    id={field.key}
                    rows={6}
                    required={field.required}
                    placeholder={field.placeholder || ''}
                    value={Array.isArray(value) ? value.join('\n') : (value ?? '')}
                    onChange={handleInput}
                />
                {field.description && <div className="field-help-text">{field.description}</div>}
                {highlightInvalid && errorMessage && (
                    <div className="field-error-text">{errorMessage}</div>
                )}
            </div>
        </div>
    );
});
