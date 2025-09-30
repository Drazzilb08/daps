import React from 'react';
import PropTypes from 'prop-types';

/**
 * Individual statistic card component
 * @private
 */
const StatisticCard = React.memo(({ label, value, subtext, icon, colorClass = '' }) => (
    <div className="bg-surface rounded-lg border border-default p-4">
        <div className="flex flex-col gap-2">
            {icon && <span className="text-3xl">{icon}</span>}
            <span className="text-sm text-secondary">{label}</span>
            <span className={`text-2xl font-bold ${colorClass}`}>{value}</span>
            {subtext && <span className="text-xs text-secondary">{subtext}</span>}
        </div>
    </div>
));

StatisticCard.displayName = 'StatisticCard';

StatisticCard.propTypes = {
    label: PropTypes.string.isRequired,
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    subtext: PropTypes.string,
    icon: PropTypes.string,
    colorClass: PropTypes.string,
};

/**
 * StatisticsGrid - Reusable statistics display component
 * Displays a grid of statistic cards with consistent styling
 *
 * @param {Object} props - Component props
 * @param {Array<Object>} props.statistics - Array of statistic objects
 * @param {string} props.statistics[].label - Statistic label
 * @param {string|number} props.statistics[].value - Statistic value
 * @param {string} [props.statistics[].subtext] - Optional subtext
 * @param {string} [props.statistics[].icon] - Optional icon
 * @param {string} [props.statistics[].colorClass] - Optional color class
 * @param {number} [props.columns=3] - Number of columns in grid
 * @param {string} [props.className] - Additional CSS classes
 *
 * @example
 * <StatisticsGrid
 *     statistics={[
 *         { label: 'Total Jobs', value: 42, colorClass: 'text-success' },
 *         { label: 'Avg Duration', value: '2.5s', colorClass: 'text-warning' }
 *     ]}
 *     columns={3}
 *     className="mb-8"
 * />
 */
export const StatisticsGrid = React.memo(({ statistics, columns = 3, className = '' }) => {
    if (!statistics || statistics.length === 0) {
        return null;
    }

    const gridClasses = `grid grid-cols-1 md:grid-cols-${Math.min(columns, 2)} lg:grid-cols-${columns} gap-4 ${className}`;

    return (
        <div className={gridClasses}>
            {statistics.map((stat, index) => (
                <StatisticCard key={stat.label || index} {...stat} />
            ))}
        </div>
    );
});

StatisticsGrid.displayName = 'StatisticsGrid';

StatisticsGrid.propTypes = {
    statistics: PropTypes.arrayOf(
        PropTypes.shape({
            label: PropTypes.string.isRequired,
            value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
            subtext: PropTypes.string,
            icon: PropTypes.string,
            colorClass: PropTypes.string,
        })
    ).isRequired,
    columns: PropTypes.number,
    className: PropTypes.string,
};

export default StatisticsGrid;
