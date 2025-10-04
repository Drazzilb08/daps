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
    const sizeMap = {
        small: 'w-4 h-4',
        medium: 'w-6 h-6',
        large: 'w-8 h-8',
    };

    const sizeClasses = sizeMap[size] || sizeMap.medium;

    const spinnerElement = (
        <div className={`inline-block ${className}`.trim()}>
            <div
                className={`rounded-full animate-spin ${sizeClasses} border-2 border-border border-t-primary`}
            />
        </div>
    );

    if (center) {
        return (
            <div className="flex items-center justify-center p-4 min-h-content">
                <div className="flex flex-col items-center gap-3">
                    {spinnerElement}
                    {text && <p className="text-sm m-0 text-secondary">{text}</p>}
                </div>
            </div>
        );
    }

    return (
        <>
            {spinnerElement}
            {text && <span className="text-sm m-0 text-secondary">{text}</span>}
        </>
    );
};

export default Spinner;
