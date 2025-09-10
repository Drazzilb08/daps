/**
 * Spinner - Reusable loading spinner component
 * 
 * A simple, reusable spinner that can be used in buttons, forms, 
 * Suspense fallbacks, or anywhere a loading indicator is needed.
 * 
 * @param {Object} props - Component props
 * @param {string} [props.size='medium'] - Spinner size: 'small', 'medium', 'large'
 * @param {string} [props.text] - Optional text to display below spinner
 * @param {string} [props.className] - Additional CSS classes
 * @param {boolean} [props.center=false] - Center the spinner with padding
 * @returns {JSX.Element} Spinner component
 */
const Spinner = ({ size = 'medium', text, className = '', center = false }) => {
  const sizeClass = `spinner-${size}`;
  
  const spinnerElement = (
    <div className={`spinner ${sizeClass} ${className}`.trim()}>
      <div className="spinner-circle" />
    </div>
  );
  
  // If center is true, wrap in centered container (for Suspense fallbacks)
  if (center) {
    return (
      <div className="spinner-center">
        <div className="spinner-container">
          {spinnerElement}
          {text && <p className="spinner-text">{text}</p>}
        </div>
      </div>
    );
  }
  
  // Simple inline spinner (for buttons, forms, etc)
  return (
    <>
      {spinnerElement}
      {text && <span className="spinner-text">{text}</span>}
    </>
  );
};

export default Spinner;