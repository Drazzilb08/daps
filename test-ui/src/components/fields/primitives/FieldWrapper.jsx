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
  variant = "standard",
  className = ""
}) => {
  // Base classes always applied
  const baseClasses = ['field-wrapper'];

  // Variant-specific utility classes
  const variantClasses = {
    standard: ['flex', 'flex-col', 'gap-1', 'mb-4', 'w-full'],
    'form-section': ['flex', 'flex-col', 'gap-4', 'mb-4', 'w-full'],
    checkbox: ['mb-4', 'w-full'], // Minimal wrapper, inner content handles layout
    inline: ['flex', 'items-center', 'gap-2', 'mb-4', 'w-full'],
    minimal: ['w-full'] // Just width, no spacing
  };

  const wrapperClasses = [
    ...baseClasses,
    ...(variantClasses[variant] || variantClasses.standard),
    invalid ? 'field-wrapper--invalid' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={wrapperClasses}>
      {children}
    </div>
  );
};