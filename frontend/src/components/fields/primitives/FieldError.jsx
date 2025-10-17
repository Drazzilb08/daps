/**
 * FieldError Primitive Component
 *
 * Universal error message display component with ARIA attributes.
 * This primitive is composed by ALL field types for consistent error handling.
 *
 * @param {Object} props - Component props
 * @param {string} props.id - Unique ID for ARIA association
 * @param {string} props.message - Error message to display (if falsy, nothing renders)
 * @param {string} [props.className=""] - Additional CSS classes
 */
export const FieldError = ({ id, message, className = '' }) => {
    if (!message) return null;

    return (
        <div
            id={id}
            className={`text-xs text-error mt-1 flex items-center gap-1 ${className}`.trim()}
            role="alert"
            aria-live="polite"
        >
            {message}
        </div>
    );
};
