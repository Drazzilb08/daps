import React from 'react';
import PropTypes from 'prop-types';

/**
 * StatChange - Trend indicator primitive with arrows and colors
 *
 * Displays change indicators with:
 * - Auto-detection of positive/negative from number values
 * - Manual direction override with "up"/"down"/"neutral"
 * - Inverse logic for metrics where down is good (response time, errors)
 * - Color-coded indicators (success=good, error=bad)
 *
 * @param {Object} props
 * @param {number|string} props.value - Change value (number or percentage string)
 * @param {string} [props.direction] - "up" | "down" | "neutral" (auto-detected if number)
 * @param {boolean} [props.inverse=false] - Invert color logic (down = good)
 * @param {string} [props.className=""] - Additional CSS classes
 * @returns {JSX.Element|null}
 *
 * @example
 * // Positive change (green arrow up)
 * <StatChange value={12} />
 *
 * @example
 * // Negative change (red arrow down)
 * <StatChange value={-5} />
 *
 * @example
 * // Inverse logic: down is good (response time decreased)
 * <StatChange value={-10} inverse />
 *
 * @example
 * // Manual direction with percentage string
 * <StatChange value="+12.5%" direction="up" />
 */
export const StatChange = React.memo(({ value, direction, inverse = false, className = '' }) => {
    if (value === undefined || value === null) return null;

    // Auto-detect direction from numeric value
    let detectedDirection = direction;
    if (!direction && typeof value === 'number') {
        if (value > 0) detectedDirection = 'up';
        else if (value < 0) detectedDirection = 'down';
        else detectedDirection = 'neutral';
    }

    // Determine if this is a good or bad change
    const isGoodChange = inverse ? detectedDirection === 'down' : detectedDirection === 'up';

    const isBadChange = inverse ? detectedDirection === 'up' : detectedDirection === 'down';

    // Color classes based on change interpretation
    const colorClass = isGoodChange
        ? 'text-success'
        : isBadChange
          ? 'text-error'
          : 'text-secondary';

    // Arrow icons based on direction
    const arrow = detectedDirection === 'up' ? '↑' : detectedDirection === 'down' ? '↓' : '';

    const changeClasses = `text-xs ${colorClass} ${className}`;

    return (
        <span className={changeClasses}>
            {arrow} {value}
        </span>
    );
});

StatChange.displayName = 'StatChange';

StatChange.propTypes = {
    value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    direction: PropTypes.oneOf(['up', 'down', 'neutral']),
    inverse: PropTypes.bool,
    className: PropTypes.string,
};
