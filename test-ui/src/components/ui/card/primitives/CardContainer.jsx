import React, { useCallback } from 'react';
import PropTypes from 'prop-types';

/**
 * CardContainer - Base card wrapper primitive
 *
 * Responsibilities:
 * - Outer card container with base styling
 * - Hover state styling (shadow elevation)
 * - Click interaction (cursor, active state)
 * - Selected state styling
 * - Keyboard navigation (Enter on clickable cards)
 * - ARIA attributes for interactive cards
 * - Theme-aware colors
 *
 * @param {Object} props - Component props
 * @param {ReactNode} props.children - Card content (Header, Body, Footer, Image)
 * @param {boolean} props.hoverable - Enable hover state elevation
 * @param {boolean} props.clickable - Enable click interaction
 * @param {Function} props.onClick - Click handler
 * @param {boolean} props.selected - Selected state styling
 * @param {string} props.className - Additional CSS classes
 * @param {string} props['aria-label'] - Accessibility label for clickable cards
 * @returns {JSX.Element}
 */
export const CardContainer = React.memo(
    ({
        children,
        hoverable = false,
        clickable = false,
        onClick,
        selected = false,
        className = '',
        'aria-label': ariaLabel,
        ...htmlProps
    }) => {
        // Handle click
        const handleClick = useCallback(
            event => {
                if (clickable && onClick) {
                    onClick(event);
                }
            },
            [clickable, onClick]
        );

        // Handle keyboard interaction
        const handleKeyDown = useCallback(
            event => {
                if (!clickable || !onClick) return;

                // Enter and Space should trigger click
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handleClick(event);
                }
            },
            [clickable, onClick, handleClick]
        );

        // Build utility classes from test-ui utility system
        const cardClasses = [
            // Base structure (layout.css)
            'flex flex-col',

            // Surface styling (colors.css, borders.css)
            'bg-surface border border-default rounded-lg',

            // Overflow (layout.css)
            'overflow-hidden',

            // Transitions (animations.css)
            'transition-shadow-transform', // Optimized transition for hover effect

            // Hoverable state (effects.css, interactions.css)
            hoverable && 'hover:shadow-lg',

            // Clickable state (interactions.css)
            clickable && 'cursor-pointer',

            // Selected state (borders.css, effects.css)
            selected && 'border-primary',

            // Additional classes
            className,
        ]
            .filter(Boolean)
            .join(' ');

        // Use article for semantic HTML
        const Component = clickable ? 'article' : 'div';

        return (
            <Component
                className={cardClasses}
                onClick={handleClick}
                onKeyDown={handleKeyDown}
                tabIndex={clickable ? 0 : undefined}
                role={clickable ? 'button' : undefined}
                aria-label={clickable ? ariaLabel : undefined}
                aria-pressed={selected ? 'true' : undefined}
                {...htmlProps}
            >
                {children}
            </Component>
        );
    }
);

CardContainer.displayName = 'CardContainer';

CardContainer.propTypes = {
    children: PropTypes.node.isRequired,
    hoverable: PropTypes.bool,
    clickable: PropTypes.bool,
    onClick: PropTypes.func,
    selected: PropTypes.bool,
    className: PropTypes.string,
    'aria-label': PropTypes.string,
};
