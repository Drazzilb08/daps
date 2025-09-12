/**
 * FieldWrapper Primitive Component
 * 
 * Universal field container component that provides consistent layout and error states.
 * This primitive is composed by ALL field types for consistent structure and styling.
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Field content to wrap
 * @param {boolean} [props.invalid=false] - Apply error/invalid styling
 * @param {string} [props.className=""] - Additional CSS classes
 */
export const FieldWrapper = ({ 
  children, 
  invalid = false, 
  className = "" 
}) => {
  const wrapperClasses = [
    'field-wrapper',
    invalid ? 'field-wrapper--invalid' : '',
    className
  ].filter(Boolean).join(' ');
  
  return (
    <div className={wrapperClasses}>
      {children}
    </div>
  );
};