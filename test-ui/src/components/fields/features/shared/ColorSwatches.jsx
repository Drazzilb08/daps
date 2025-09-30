/**
 * ColorSwatches - Visual display of color array with individual swatches
 * @param {Object} props - Component props
 * @param {Array} props.colors - Array of color strings (hex, rgb, named)
 * @param {number} props.maxDisplay - Maximum number of swatches to display
 * @param {string} props.size - Size variant: 'sm', 'md', 'lg'
 */
export const ColorSwatches = ({ colors = [], maxDisplay = 4, size = 'sm' }) => {
    if (!colors || colors.length === 0) {
        return <span className="text-xs text-tertiary italic">No colors</span>;
    }

    const displayColors = colors.slice(0, maxDisplay);
    const remainingCount = colors.length - maxDisplay;

    const sizeClasses = {
        sm: 'w-4 h-4',
        md: 'w-6 h-6',
        lg: 'w-8 h-8',
    };

    const sizeClass = sizeClasses[size] || sizeClasses.sm;

    return (
        <div className="flex items-center gap-1">
            {displayColors.map((color, index) => (
                <div
                    key={index}
                    className={`${sizeClass} rounded border border-border flex-shrink-0`}
                    style={{ backgroundColor: color }}
                    title={`Color ${index + 1}: ${color}`}
                />
            ))}

            {remainingCount > 0 && (
                <span className="text-xs text-secondary ml-1">+{remainingCount}</span>
            )}
        </div>
    );
};

ColorSwatches.displayName = 'ColorSwatches';
