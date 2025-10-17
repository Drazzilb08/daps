/**
 * FieldDescription Primitive Component
 *
 * Universal help text display component with ARIA attributes.
 * This primitive is composed by ALL field types for consistent help text.
 *
 * @param {Object} props - Component props
 * @param {string} props.id - Unique ID for ARIA association with form controls
 * @param {string} props.description - Help text to display (if falsy, nothing renders)
 * @param {string} [props.className=""] - Additional CSS classes
 */
export const FieldDescription = ({ id, description, className = '' }) => {
    if (!description) return null;

    return (
        <div id={id} className={`text-xs text-secondary mt-1 ${className}`.trim()}>
            {description}
        </div>
    );
};
