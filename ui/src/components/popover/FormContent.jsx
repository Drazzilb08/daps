import React, { useCallback } from 'react';
import PropTypes from 'prop-types';

/**
 * FormContent - Generic form renderer for popover content
 *
 * Supports the form pattern from PopoverTest.jsx including:
 * - Text inputs, selects, and other form fields
 * - Form validation and submission
 * - Cancel and submit actions
 * - Accessible form labeling
 *
 * @param {Object} props - Component props
 * @param {string} [props.title] - Form title
 * @param {Array} props.fields - Form field definitions
 * @param {Array} [props.actions] - Form actions (cancel, submit)
 * @param {Function} [props.onSubmit] - Submit handler
 * @param {Function} props.onClose - Callback to close popover
 */
const FormContent = React.memo(
    ({ title = 'Form', fields = [], actions = ['cancel', 'submit'], onSubmit, onClose }) => {
        // Handle form submission
        const handleSubmit = useCallback(
            e => {
                e.preventDefault();

                if (onSubmit) {
                    // Get form data
                    const formData = new FormData(e.target);
                    const data = Object.fromEntries(formData.entries());

                    const result = onSubmit(data);

                    // Close popover if submission successful
                    if (result !== false) {
                        onClose();
                    }
                } else {
                    // Default behavior - just close
                    onClose();
                }
            },
            [onSubmit, onClose]
        );

        // Render form field based on type
        const renderField = field => {
            const {
                key,
                type,
                label,
                placeholder,
                options,
                required,
                defaultValue,
                ...fieldProps
            } = field;

            const commonStyle = {
                width: '100%',
                padding: 'var(--space-2)',
                border: '1px solid var(--divider)',
                borderRadius: 'var(--radius-1)',
                fontSize: 'var(--font-size-1)',
                backgroundColor: 'var(--surface)',
                minHeight: type === 'textarea' ? '80px' : '44px', // Touch target compliance
            };

            switch (type) {
                case 'select':
                    return (
                        <select
                            name={key}
                            id={key}
                            defaultValue={defaultValue}
                            required={required}
                            style={commonStyle}
                            {...fieldProps}
                        >
                            {placeholder && <option value="">{placeholder}</option>}
                            {(options || []).map(option => (
                                <option
                                    key={typeof option === 'string' ? option : option.value}
                                    value={typeof option === 'string' ? option : option.value}
                                >
                                    {typeof option === 'string' ? option : option.label}
                                </option>
                            ))}
                        </select>
                    );

                case 'textarea':
                    return (
                        <textarea
                            name={key}
                            id={key}
                            placeholder={placeholder}
                            defaultValue={defaultValue}
                            required={required}
                            style={{
                                ...commonStyle,
                                resize: 'vertical',
                                fontFamily: 'inherit',
                            }}
                            {...fieldProps}
                        />
                    );

                case 'checkbox':
                    return (
                        <div style={{ display: 'flex', alignItems: 'center', minHeight: '44px' }}>
                            <input
                                type="checkbox"
                                name={key}
                                id={key}
                                defaultChecked={defaultValue}
                                style={{
                                    marginRight: 'var(--space-2)',
                                    minWidth: '16px',
                                    minHeight: '16px',
                                }}
                                {...fieldProps}
                            />
                            <span>{label}</span>
                        </div>
                    );

                case 'number':
                    return (
                        <input
                            type="number"
                            name={key}
                            id={key}
                            placeholder={placeholder}
                            defaultValue={defaultValue}
                            required={required}
                            style={commonStyle}
                            {...fieldProps}
                        />
                    );

                case 'email':
                    return (
                        <input
                            type="email"
                            name={key}
                            id={key}
                            placeholder={placeholder}
                            defaultValue={defaultValue}
                            required={required}
                            style={commonStyle}
                            {...fieldProps}
                        />
                    );

                case 'password':
                    return (
                        <input
                            type="password"
                            name={key}
                            id={key}
                            placeholder={placeholder}
                            defaultValue={defaultValue}
                            required={required}
                            style={commonStyle}
                            {...fieldProps}
                        />
                    );

                default: // text input
                    return (
                        <input
                            type="text"
                            name={key}
                            id={key}
                            placeholder={placeholder}
                            defaultValue={defaultValue}
                            required={required}
                            style={commonStyle}
                            {...fieldProps}
                        />
                    );
            }
        };

        return (
            <>
                <div className="popover__title">{title}</div>
                <div className="popover__content">
                    <form
                        onSubmit={handleSubmit}
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 'var(--space-4)',
                        }}
                    >
                        {/* Form Fields */}
                        {fields.map(field => (
                            <div key={field.key}>
                                {/* Label (except for checkbox which handles its own) */}
                                {field.type !== 'checkbox' && (
                                    <label
                                        htmlFor={field.key}
                                        style={{
                                            display: 'block',
                                            fontSize: 'var(--font-size-1)',
                                            fontWeight: '500',
                                            color: 'var(--text-primary)',
                                            marginBottom: 'var(--space-1)',
                                        }}
                                    >
                                        {field.label}
                                        {field.required && (
                                            <span
                                                style={{
                                                    color: 'var(--error)',
                                                    marginLeft: 'var(--space-1)',
                                                }}
                                            >
                                                *
                                            </span>
                                        )}
                                    </label>
                                )}

                                {/* Field Input */}
                                {renderField(field)}

                                {/* Help text */}
                                {field.help && (
                                    <div
                                        style={{
                                            fontSize: 'var(--font-size-0)',
                                            color: 'var(--text-secondary)',
                                            marginTop: 'var(--space-1)',
                                        }}
                                    >
                                        {field.help}
                                    </div>
                                )}
                            </div>
                        ))}

                        {/* Actions */}
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'flex-end',
                                gap: 'var(--space-2)',
                                marginTop: 'var(--space-4)',
                                paddingTop: 'var(--space-4)',
                                borderTop: '1px solid var(--divider)',
                            }}
                        >
                            {actions.includes('cancel') && (
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={onClose}
                                    style={{ minHeight: '44px' }}
                                >
                                    Cancel
                                </button>
                            )}

                            {actions.includes('submit') && (
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    style={{ minHeight: '44px' }}
                                >
                                    {fields.find(f => f.submitLabel)?.submitLabel || 'Submit'}
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            </>
        );
    }
);

FormContent.propTypes = {
    title: PropTypes.string,
    fields: PropTypes.arrayOf(
        PropTypes.shape({
            key: PropTypes.string.isRequired,
            type: PropTypes.oneOf([
                'text',
                'number',
                'email',
                'password',
                'select',
                'textarea',
                'checkbox',
            ]),
            label: PropTypes.string.isRequired,
            placeholder: PropTypes.string,
            required: PropTypes.bool,
            defaultValue: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.bool]),
            options: PropTypes.arrayOf(
                PropTypes.oneOfType([
                    PropTypes.string,
                    PropTypes.shape({
                        value: PropTypes.string.isRequired,
                        label: PropTypes.string.isRequired,
                    }),
                ])
            ),
            help: PropTypes.string,
            submitLabel: PropTypes.string,
        })
    ).isRequired,
    actions: PropTypes.arrayOf(PropTypes.oneOf(['cancel', 'submit'])),
    onSubmit: PropTypes.func,
    onClose: PropTypes.func.isRequired,
};

FormContent.displayName = 'FormContent';

export default FormContent;
