/**
 * TextareaBase Primitive Component
 *
 * Universal base textarea element with proper props extraction and HTML attribute pass-through.
 * This primitive is composed by ALL textarea-based field types for consistency.
 *
 * @param {Object} props - Component props
 * @param {string} props.id - Textarea element ID for label association
 * @param {string} props.value - Textarea value
 * @param {Function} props.onChange - Change event handler
 * @param {number} [props.rows=4] - Number of visible text rows
 * @param {string} [props.className=""] - Additional CSS classes
 * @param {boolean} [props.disabled] - Disable textarea
 * @param {boolean} [props.required] - Mark as required
 * @param {string} [props.placeholder] - Placeholder text
 * @param {number} [props.maxLength] - Maximum character length
 * @param {number} [props.minLength] - Minimum character length
 * @param {boolean} [props.spellCheck] - Enable/disable spell checking
 * @param {string} [props.aria-describedby] - ARIA describedby attribute
 * @param {boolean} [props.aria-invalid] - ARIA invalid state
 * @param {...Object} textareaProps - Additional HTML textarea attributes
 */
export const TextareaBase = ({
    id,
    value,
    onChange,
    rows = 4,
    className = '',
    // Field-specific props
    disabled,
    required,
    placeholder,
    maxLength,
    minLength,
    spellCheck,
    // Accessibility props
    'aria-describedby': ariaDescribedby,
    'aria-invalid': ariaInvalid,
    // Extract invalid prop to prevent it reaching DOM
    invalid,
    // Pass through any other HTML textarea props
    ...textareaProps
}) => {
    return (
        <textarea
            id={id}
            value={value || ''}
            onChange={onChange}
            rows={rows}
            disabled={disabled}
            required={required}
            placeholder={placeholder}
            maxLength={maxLength}
            minLength={minLength}
            spellCheck={spellCheck}
            className={[
                // Base textarea styling - atomic utilities only
                'w-full',
                'px-3 py-2', // Standard padding
                'bg-input border border-border rounded-md',
                'text-primary placeholder:text-secondary',
                'resize-y', // Allow vertical resize only
                'transition-colors',

                // Focus states (atomic utilities)
                'focus:outline-none focus:border-primary focus:ring-primary',

                // Hover states (atomic utilities)
                !disabled && 'hover:border-primary hover:bg-surface-hover',

                // Error states (atomic utilities)
                invalid && 'border-error',
                invalid && 'focus:ring-error',

                // Disabled states (atomic utilities)
                disabled && 'opacity-60 cursor-not-allowed bg-surface-dim',

                className,
            ]
                .filter(Boolean)
                .join(' ')}
            aria-describedby={ariaDescribedby}
            aria-invalid={ariaInvalid}
            {...textareaProps}
        />
    );
};
