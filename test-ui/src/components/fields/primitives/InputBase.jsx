/**
 * InputBase Primitive Component
 * 
 * Universal base input element with proper props extraction and HTML attribute pass-through.
 * This primitive is composed by ALL input-based field types for consistency.
 * 
 * @param {Object} props - Component props
 * @param {string} props.id - Input element ID for label association
 * @param {string} [props.type="text"] - HTML input type
 * @param {string|number} props.value - Input value
 * @param {Function} props.onChange - Change event handler
 * @param {string} [props.className=""] - Additional CSS classes
 * @param {boolean} [props.disabled] - Disable input
 * @param {boolean} [props.required] - Mark as required
 * @param {string} [props.placeholder] - Placeholder text
 * @param {number} [props.maxLength] - Maximum character length
 * @param {number} [props.minLength] - Minimum character length
 * @param {string} [props.pattern] - HTML pattern validation
 * @param {string} [props.aria-describedby] - ARIA describedby attribute
 * @param {boolean} [props.aria-invalid] - ARIA invalid state
 * @param {...Object} inputProps - Additional HTML input attributes
 */
export const InputBase = ({ 
  id, 
  type = "text", 
  value, 
  onChange, 
  className = "",
  // Field-specific props
  disabled, 
  required, 
  placeholder, 
  maxLength, 
  minLength, 
  pattern,
  // Accessibility props
  'aria-describedby': ariaDescribedby,
  'aria-invalid': ariaInvalid,
  // Extract invalid prop to prevent it reaching DOM
  invalid,
  // Pass through any other HTML input props
  ...inputProps 
}) => {
  return (
    <input
      id={id}
      type={type}
      value={value || ''}
      onChange={onChange}
      disabled={disabled}
      required={required}
      placeholder={placeholder}
      maxLength={maxLength}
      minLength={minLength}
      pattern={pattern}
      className={`field-input field-input-base field-input-typography field-input-layout w-full touch-target ${invalid ? 'is-invalid' : ''} ${disabled ? 'opacity-60 cursor-not-allowed' : ''} ${className}`.trim()}
      aria-describedby={ariaDescribedby}
      aria-invalid={ariaInvalid}
      {...inputProps}
    />
  );
};