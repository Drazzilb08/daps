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
                <ul className="card-value-list">
                    {value.map((item, index) => (
                        <li key={index} className="card-value-list-item">
                            {String(item)}
                        </li>
                    ))}
                </ul>
            );
        }

        if (typeof value === 'object' && value !== null) {
            return (
                <pre className="card-value-object">
                    {JSON.stringify(value, null, 2)}
                </pre>
            );
        }

        return <span className="card-value-text">{String(value)}</span>;
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

    // Build CSS classes
    const cardClasses = [
        'card',
        `card--${variant}`,
        className,
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <div className={cardClasses}>
            {entries.map(([key, value]) => (
                <div className="card-row" key={key}>
                    <span className="card-label">
                        {keyFormatter(key)}:
                    </span>
                    <span className="card-value">
                        {valueFormatter(value)}
                    </span>
                </div>
            ))}
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
    const rowClasses = ['card-row', className].filter(Boolean).join(' ');

    return (
        <div className={rowClasses}>
            <span className="card-label">
                {label}:
            </span>
            <span className="card-value">
                {children}
            </span>
        </div>
    );
};