import React from 'react';
import PropTypes from 'prop-types';
import { StatCard } from '../ui/StatCard';
import { StatGrid } from './layouts/StatGrid';

/**
 * StatisticsGrid - DEPRECATED: Use StatGrid + StatCard instead
 *
 * @deprecated This component is deprecated and maintained for backward compatibility only.
 *
 * Migration Guide:
 *
 * OLD:
 * ```jsx
 * <StatisticsGrid
 *   statistics={[
 *     { label: 'Users', value: 1234, icon: '👥' }
 *   ]}
 *   columns={3}
 * />
 * ```
 *
 * NEW (Recommended):
 * ```jsx
 * <StatGrid columns={3}>
 *   <StatCard label="Users" value={1234} icon="👥" />
 * </StatGrid>
 * ```
 *
 * Benefits of new approach:
 * - More flexible layouts (StatGrid, StatList, StatInline)
 * - Direct StatCard usage for custom layouts
 * - Access to all Card variants
 * - Better composition and customization
 *
 * @param {Object} props
 * @param {Array<Object>} props.statistics - Array of statistic objects
 * @param {number} [props.columns=3] - Number of columns
 * @param {string} [props.className] - Additional CSS classes
 * @returns {JSX.Element}
 */
export const StatisticsGrid = React.memo(({ statistics, columns = 3, className = '' }) => {
    // Emit deprecation warning in development
    // eslint-disable-next-line no-undef
    if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
        console.warn(
            'StatisticsGrid is deprecated. Please migrate to StatGrid + StatCard composition. ' +
                'See component documentation for migration guide.'
        );
    }

    if (!statistics || statistics.length === 0) {
        return null;
    }

    return (
        <StatGrid columns={columns} className={className}>
            {statistics.map((stat, index) => (
                <StatCard
                    key={stat.label || index}
                    label={stat.label}
                    value={stat.value}
                    icon={stat.icon}
                    subtext={stat.subtext}
                    valueColor={stat.colorClass?.replace('text-', '')} // Convert "text-success" to "success"
                />
            ))}
        </StatGrid>
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
