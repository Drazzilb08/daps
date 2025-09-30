import { useId, useCallback, useState, useEffect } from 'react';
import { FieldWrapper } from '../primitives/FieldWrapper';
import { FieldLabel } from '../primitives/FieldLabel';
import { FieldDescription } from '../primitives/FieldDescription';
import { FieldError } from '../primitives/FieldError';
import { TextareaBase } from '../primitives/TextareaBase';

export const JsonField = ({
    field,
    value,
    onChange,
    disabled = false,
    highlightInvalid = false,
    errorMessage,
    ...fieldProps
}) => {
    const inputId = useId();
    const [jsonError, setJsonError] = useState(null);
    const [, setShowFormatted] = useState(true);

    // Convert value to string representation
    const getStringValue = useCallback(() => {
        if (typeof value === 'string') {
            return value;
        } else if (typeof value === 'object' && value !== null) {
            try {
                return JSON.stringify(value, null, 2);
            } catch {
                return String(value);
            }
        }
        return value || '';
    }, [value]);

    const [textValue, setTextValue] = useState(() => getStringValue());

    // Update text value when prop value changes
    useEffect(() => {
        setTextValue(getStringValue());
    }, [getStringValue]);

    // Validate JSON and update parent
    const handleChange = useCallback(
        e => {
            const newTextValue = e.target.value;
            setTextValue(newTextValue);

            // Clear previous JSON error
            setJsonError(null);

            // If empty, just pass through
            if (!newTextValue.trim()) {
                onChange('');
                return;
            }

            // Try to parse as JSON
            try {
                JSON.parse(newTextValue);
                onChange(newTextValue); // Store as string for form handling
                setJsonError(null);
            } catch (error) {
                // Still update the form value so user can keep typing
                onChange(newTextValue);
                setJsonError(`Invalid JSON: ${error.message}`);
            }
        },
        [onChange]
    );

    // Format JSON
    const formatJson = useCallback(() => {
        try {
            const parsed = JSON.parse(textValue);
            const formatted = JSON.stringify(parsed, null, 2);
            setTextValue(formatted);
            onChange(formatted);
            setJsonError(null);
            setShowFormatted(true);
        } catch (error) {
            setJsonError(`Cannot format invalid JSON: ${error.message}`);
        }
    }, [textValue, onChange]);

    // Minify JSON
    const minifyJson = useCallback(() => {
        try {
            const parsed = JSON.parse(textValue);
            const minified = JSON.stringify(parsed);
            setTextValue(minified);
            onChange(minified);
            setJsonError(null);
            setShowFormatted(false);
        } catch (error) {
            setJsonError(`Cannot minify invalid JSON: ${error.message}`);
        }
    }, [textValue, onChange]);

    const hasError = Boolean(errorMessage || jsonError);
    const errorToShow = errorMessage || jsonError;
    const minRows = field.minRows ?? 8;
    const maxRows = field.maxRows ?? 20;

    // Calculate dynamic rows based on content
    const rows = Math.max(minRows, Math.min(maxRows, (textValue.match(/\n/g) || []).length + 3));

    return (
        <FieldWrapper invalid={highlightInvalid || hasError}>
            <div>
                <FieldLabel htmlFor={inputId} label={field.label} required={field.required} />

                <div>
                    <button
                        type="button"
                        onClick={formatJson}
                        disabled={disabled || !textValue.trim()}
                        className="touch-target bg-surface text-primary px-3 py-2 border border-border rounded-md cursor-pointer transition-colors hover:bg-surface-hover inline-flex items-center justify-center text-sm"
                        title="Format JSON with indentation"
                        aria-label="Format JSON"
                    >
                        Format
                    </button>
                    <button
                        type="button"
                        onClick={minifyJson}
                        disabled={disabled || !textValue.trim()}
                        className="touch-target bg-surface text-primary px-3 py-2 border border-border rounded-md cursor-pointer transition-colors hover:bg-surface-hover inline-flex items-center justify-center text-sm"
                        title="Minify JSON to single line"
                        aria-label="Minify JSON"
                    >
                        Minify
                    </button>
                </div>
            </div>

            <div>
                <TextareaBase
                    id={inputId}
                    value={textValue}
                    onChange={handleChange}
                    placeholder={field.placeholder || '{\n  "key": "value"\n}'}
                    disabled={disabled}
                    required={field.required}
                    rows={rows}
                    className=""
                    spellCheck={false}
                    aria-describedby={
                        errorToShow
                            ? `${inputId}-error`
                            : field.description
                              ? `${inputId}-desc`
                              : undefined
                    }
                    aria-invalid={hasError}
                    {...fieldProps}
                />

                <div role="status" aria-live="polite">
                    {jsonError && (
                        <div>
                            <span
                                className="material-symbols-outlined text-error mr-1"
                                aria-hidden="true"
                            >
                                error
                            </span>
                            {jsonError}
                        </div>
                    )}

                    {!jsonError && textValue.trim() && (
                        <div>
                            <span
                                className="material-symbols-outlined text-success mr-1"
                                aria-hidden="true"
                            >
                                check_circle
                            </span>
                            Valid JSON
                        </div>
                    )}
                </div>
            </div>

            <FieldDescription id={`${inputId}-desc`} description={field.description} />

            <FieldError id={`${inputId}-error`} message={errorToShow} />
        </FieldWrapper>
    );
};
