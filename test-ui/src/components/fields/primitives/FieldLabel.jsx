/**
 * FieldLabel Primitive Component
 * 
 * Universal label component with required indicator support.
 * This primitive is composed by ALL field types for consistent labeling.
 * 
 * @param {Object} props - Component props
 * @param {string} props.htmlFor - ID of the associated form control
 * @param {string} props.label - Label text to display
 * @param {boolean} [props.required=false] - Show required indicator
 * @param {string} [props.className=""] - Additional CSS classes
 */
export const FieldLabel = ({ 
  htmlFor, 
  label, 
  required = false, 
  className = "" 
}) => {
  if (!label) return null;
  
  return (
    <label 
      htmlFor={htmlFor} 
      className={`field-label ${className}`.trim()}
    >
      {label}
      {required && <span className="required-indicator">*</span>}
    </label>
  );
};