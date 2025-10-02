/**
 * FieldWrapper Primitive Component
 *
 * Universal field container component that provides consistent layout and error states.
 * This primitive is composed by ALL field types for consistent structure and styling.
 * Supports multiple variants to handle different field layout patterns.
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Field content to wrap
 * @param {boolean} [props.invalid=false] - Apply error/invalid styling
 * @param {string} [props.variant="standard"] - Container variant type
 * @param {string} [props.className=""] - Additional CSS classes
 *
 * Variants:
 * - "standard": Default vertical layout (flex flex-col gap-1 mb-4 w-full)
 * - "form-section": Larger gap for complex fields (flex flex-col gap-4 mb-4 w-full)
 * - "checkbox": For checkbox-style fields needing special layout
 * - "inline": For fields that need horizontal layout
 * - "minimal": Minimal wrapper with no default spacing
 */
export const FieldWrapper = ({
    children,
    invalid = false,
    variant = 'standard',
    className = '',
}) => {
    const variantClasses = {
        standard: 'flex flex-col gap-1 mb-4 w-full',
        'form-section': 'flex flex-col gap-4 mb-4 w-full',
        checkbox: 'flex flex-row gap-2 items-center mb-2 w-full',
        inline: 'flex flex-row gap-2 items-center mb-3 w-full',
        minimal: 'w-full',
    };

    const baseClasses = variantClasses[variant] || variantClasses.standard;
    const invalidClasses = invalid ? 'text-error' : '';

    const wrapperClasses = [baseClasses, invalidClasses, className].filter(Boolean).join(' ');

    return <div className={wrapperClasses}>{children}</div>;
};
