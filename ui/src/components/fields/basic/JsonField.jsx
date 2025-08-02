import React, { useRef, useEffect } from 'react';

export function JsonField({
    field,
    value,
    onChange,
    highlightInvalid = false,
    errorMessage = null,
}) {
    const textareaRef = useRef(null);

    // Serialize object to prettified JSON, or string fallback
    const stringValue =
        typeof value === 'object' && value !== null
            ? JSON.stringify(value, null, 2)
            : typeof value === 'string'
              ? value
              : '';

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [stringValue]);

    const handleInput = e => {
        const val = e.target.value;
        try {
            onChange(field.key, JSON.parse(val));
        } catch {
            onChange(field.key, val);
        }
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
                    placeholder={field.placeholder || ''}
                    value={stringValue}
                    onChange={handleInput}
                    style={{ resize: 'vertical' }}
                />
                {field.description && <div className="field-help-text">{field.description}</div>}
                {highlightInvalid && errorMessage && (
                    <div className="field-error-text">{errorMessage}</div>
                )}
            </div>
        </div>
    );
}
