/**
 * Card Primitive Component
 *
 * Generic card component for displaying structured data in key-value pairs.
 * This primitive provides a reusable foundation for displaying object data
 * with consistent styling and layout patterns.
 *
 * @param {Object} props - Component props
 * @param {Object} props.data - Data object to display
 * @param {Array} [props.excludeKeys=[]] - Keys to exclude from display
 * @param {Function} [props.formatKey] - Function to format key display names
 * @param {Function} [props.formatValue] - Function to format value display
 * @param {string} [props.className=""] - Additional CSS classes
 * @param {string} [props.variant="standard"] - Card variant type
 *
 * Variants:
 * - "standard": Default card styling
 * - "compact": Smaller spacing and text
 * - "bordered": Card with visible borders
 * - "minimal": Minimal styling with no background
 */
export const Card = ({
    data = {},
    excludeKeys = [],
    formatKey,
    formatValue,
    className = '',
    variant = 'standard',
}) => {
    // Default key formatter - capitalize first letter
    const defaultFormatKey = key => {
        return key.charAt(0).toUpperCase() + key.slice(1);
    };

    // Default value formatter - handle arrays, objects, and primitives
    const defaultFormatValue = value => {
        if (Array.isArray(value)) {
            return (
                <ul className="m-0 pl-4 list-disc">
                    {value.map((item, index) => (
                        <li key={index} className="mb-1">
                            {String(item)}
                        </li>
                    ))}
                </ul>
            );
        }

        if (typeof value === 'object' && value !== null) {
            return (
                <pre className="bg-surface-elevated border border-default rounded-md p-3 m-0 font-mono text-sm overflow-x-auto whitespace-pre-wrap text-tertiary">
                    {JSON.stringify(value, null, 2)}
                </pre>
            );
        }

        return <span>{String(value)}</span>;
    };

    // Use provided formatters or defaults
    const keyFormatter = formatKey || defaultFormatKey;
    const valueFormatter = formatValue || defaultFormatValue;

    // Filter out excluded keys and entries with undefined/null values
    const entries = Object.entries(data).filter(
        ([key, value]) => !excludeKeys.includes(key) && value !== undefined && value !== null
    );

    if (entries.length === 0) {
        return null;
    }

    // Build CSS classes using utilities
    const baseClasses = 'flex flex-col gap-3 p-4 bg-surface rounded-md';
    const variantClasses = {
        standard: 'border border-default',
        compact: 'gap-2 p-3 text-sm',
        bordered: 'border border-primary',
        minimal: 'bg-transparent p-2 rounded-none gap-2',
    };

    const cardClasses = [
        baseClasses,
        variantClasses[variant] || '',
        className,
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <div className={cardClasses}>
            {entries.map(([key, value]) => {
                const formattedKey = keyFormatter(key);
                return (
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-4" key={key}>
                        {formattedKey && (
                            <span className="font-semibold text-primary shrink-0 sm:min-w-24 text-sm">
                                {formattedKey}:
                            </span>
                        )}
                        <span className={`text-secondary flex-1 break-words text-base leading-relaxed ${!formattedKey ? 'sm:ml-0' : ''}`}>
                            {valueFormatter(value)}
                        </span>
                    </div>
                );
            })}
        </div>
    );
};

/**
 * CardRow - Individual row component for manual card construction
 *
 * @param {Object} props - Component props
 * @param {string} props.label - Row label text
 * @param {React.ReactNode} props.children - Row content
 * @param {string} [props.className=""] - Additional CSS classes
 */
export const CardRow = ({ label, children, className = '' }) => {
    const rowClasses = ['flex flex-col gap-1 sm:flex-row sm:items-start', className].filter(Boolean).join(' ');

    return (
        <div className={rowClasses}>
            {label && (
                <span className="font-semibold text-primary shrink-0 sm:min-w-24 text-sm">
                    {label}:
                </span>
            )}
            <span className={`text-secondary flex-1 break-words text-base leading-relaxed ${!label ? 'sm:ml-0' : ''}`}>
                {children}
            </span>
        </div>
    );
};