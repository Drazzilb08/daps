import React from 'react';
import PropTypes from 'prop-types';
import { Card } from './Card';
import { StatIcon, StatLabel, StatValue, StatChange } from '../statistics/primitives';

/**
 * StatCard - Composable statistics card
 *
 * Composes the base Card primitive with statistics-specific primitives
 * to create a reusable, flexible statistics display component.
 *
 * Key Composition Features:
 * - Uses Card primitive for base structure (zero duplication)
 * - Composes StatIcon, StatLabel, StatValue, StatChange primitives
 * - Supports all Card variants (standard, compact, bordered, minimal)
 * - Fully customizable through primitives
 *
 * @param {Object} props
 * @param {string} props.label - Statistic label
 * @param {string|number} props.value - Statistic value
 * @param {string|React.ReactNode} [props.icon] - Optional icon
 * @param {string} [props.subtext] - Optional subtext/description
 * @param {Object} [props.change] - Optional trend indicator
 * @param {number|string} props.change.value - Change value
 * @param {string} [props.change.direction] - Change direction
 * @param {boolean} [props.change.inverse] - Inverse color logic
 * @param {string} [props.variant="standard"] - Card variant
 * @param {string} [props.valueColor=""] - Value color variant
 * @param {Function} [props.valueFormat] - Value formatter
 * @param {string} [props.className=""] - Additional CSS classes
 * @returns {JSX.Element}
 *
 * @example
 * // Basic stat card
 * <StatCard label="Total Users" value={1234} />
 *
 * @example
 * // With icon and change indicator
 * <StatCard
 *   label="Revenue"
 *   value={42000}
 *   icon="💰"
 *   change={{ value: 12.5, direction: "up" }}
 *   valueColor="success"
 *   valueFormat={(v) => `$${v.toLocaleString()}`}
 * />
 *
 * @example
 * // Compact variant with subtext
 * <StatCard
 *   label="Response Time"
 *   value={125}
 *   subtext="milliseconds"
 *   variant="compact"
 * />
 */
export const StatCard = React.memo(
    ({
        label,
        value,
        icon,
        subtext,
        change,
        variant = 'standard',
        valueColor = '',
        valueFormat,
        className = '',
    }) => {
        return (
            <Card variant={variant} className={className}>
                <div className="flex flex-col gap-2">
                    {icon && <StatIcon icon={icon} />}
                    <StatLabel>{label}</StatLabel>
                    <StatValue color={valueColor} format={valueFormat}>
                        {value}
                    </StatValue>
                    {subtext && <StatLabel size="xs">{subtext}</StatLabel>}
                    {change && (
                        <StatChange
                            value={change.value}
                            direction={change.direction}
                            inverse={change.inverse}
                        />
                    )}
                </div>
            </Card>
        );
    }
);

StatCard.displayName = 'StatCard';

StatCard.propTypes = {
    label: PropTypes.string.isRequired,
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    icon: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
    subtext: PropTypes.string,
    change: PropTypes.shape({
        value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
        direction: PropTypes.oneOf(['up', 'down', 'neutral']),
        inverse: PropTypes.bool,
    }),
    variant: PropTypes.oneOf(['standard', 'compact', 'bordered', 'minimal']),
    valueColor: PropTypes.oneOf(['', 'primary', 'success', 'warning', 'error']),
    valueFormat: PropTypes.func,
    className: PropTypes.string,
};
