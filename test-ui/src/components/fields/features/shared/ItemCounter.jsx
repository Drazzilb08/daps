/**
 * ItemCounter Primitive Component
 *
 * Truly atomic component for displaying item count information.
 * Designed for maximum reusability across different contexts.
 *
 * Use cases:
 * - "3 of 10 colors"
 * - "5 of 20 tags"
 * - "2 of 5 items selected"
 * - "12 results found"
 * - Any count/limit/status display
 * - Progress indicators
 * - Collection size displays
 *
 * Features:
 * - Accessible with aria-live updates
 * - Flexible formatting options
 * - Supports limits, totals, and simple counts
 * - Status-aware styling (normal/warning/full)
 * - Mobile-first responsive design
 */

import React from 'react';

/**
 * Generic counter for displaying item counts and limits
 *
 * @param {Object} props - Component props
 * @param {number} props.current - Current count
 * @param {number} props.total - Total/maximum count (optional)
 * @param {string} props.itemType - Type of item being counted (singular)
 * @param {string} props.itemTypePlural - Type of item being counted (plural)
 * @param {string} props.format - Display format ('count', 'fraction', 'percentage', 'custom')
 * @param {Function} props.customFormatter - Custom formatting function (current, total, itemType) => string
 * @param {boolean} props.showWarning - Show warning state when approaching limit
 * @param {number} props.warningThreshold - Threshold for warning state (0.0-1.0)
 * @param {boolean} props.announceChanges - Use aria-live for screen readers
 * @param {string} props.className - Additional CSS classes
 * @param {Object} props.ariaProps - Additional ARIA properties
 */
export const ItemCounter = React.memo(
    ({
        current = 0,
        total = null,
        itemType = 'item',
        itemTypePlural = null,
        format = 'fraction',
        customFormatter = null,
        showWarning = true,
        warningThreshold = 0.8,
        announceChanges = true,
        className = '',
        ariaProps = {},
        ...props
    }) => {
        // Auto-generate plural if not provided
        const pluralType = itemTypePlural || `${itemType}s`;
        const displayType = current === 1 ? itemType : pluralType;

        // Determine status
        const hasLimit = total !== null && total > 0;
        const ratio = hasLimit ? current / total : 0;
        const isWarning = hasLimit && showWarning && ratio >= warningThreshold && ratio < 1;
        const isFull = hasLimit && current >= total;

        // Format display text
        let displayText = '';

        if (customFormatter) {
            displayText = customFormatter(current, total, itemType);
        } else {
            switch (format) {
                case 'count':
                    displayText = `${current} ${displayType}`;
                    break;
                case 'fraction':
                    displayText = hasLimit
                        ? `${current} of ${total} ${pluralType}`
                        : `${current} ${displayType}`;
                    break;
                case 'percentage':
                    if (hasLimit) {
                        const percentage = Math.round(ratio * 100);
                        displayText = `${percentage}% (${current}/${total} ${pluralType})`;
                    } else {
                        displayText = `${current} ${displayType}`;
                    }
                    break;
                default:
                    displayText = hasLimit
                        ? `${current} of ${total} ${pluralType}`
                        : `${current} ${displayType}`;
            }
        }

        // CSS classes
        const counterClasses = [
            'item-counter',
            hasLimit && `item-counter--with-limit`,
            isWarning && 'item-counter--warning',
            isFull && 'item-counter--full',
            className,
        ]
            .filter(Boolean)
            .join(' ');

        // ARIA properties
        const ariaLiveValue = announceChanges ? 'polite' : undefined;
        const statusDescription = isFull
            ? 'Limit reached'
            : isWarning
              ? 'Approaching limit'
              : 'Normal';

        return (
            <span
                className={counterClasses}
                aria-live={ariaLiveValue}
                aria-label={`${displayText}${isWarning || isFull ? `, ${statusDescription}` : ''}`}
                {...ariaProps}
                {...props}
            >
                {displayText}
                {(isWarning || isFull) && <span className="sr-only">, {statusDescription}</span>}
            </span>
        );
    }
);

ItemCounter.displayName = 'ItemCounter';

export default ItemCounter;
