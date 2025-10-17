import React from 'react';
import PropTypes from 'prop-types';

/**
 * PopoverPositioning - Component responsible for popover positioning and transform calculations
 *
 * Handles:
 * - CSS transform calculations based on position
 * - Position-based CSS class application
 * - Style object creation for absolute positioning
 * - Animation state management
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Popover content to position
 * @param {Object} props.coords - Position coordinates {top, left}
 * @param {string} props.actualPosition - Current position ('top'|'bottom'|'left'|'right')
 * @param {boolean} props.isAnimating - Whether popover is currently animating
 * @param {boolean} props.isEdgeConstrained - Whether popover is constrained by viewport edges
 * @param {string} props.variant - Popover variant for styling
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.show - Whether popover is visible
 * @param {React.RefObject} props.popoverRef - Ref to the popover element
 * @param {string} props.ariaLabel - ARIA label for accessibility
 * @param {string} props.ariaDescribedBy - ARIA described by attribute
 */
const PopoverPositioning = React.memo(
    ({
        children,
        coords,
        actualPosition,
        isAnimating,
        isEdgeConstrained,
        variant,
        className,
        show,
        popoverRef,
        ariaLabel,
        ariaDescribedBy,
    }) => {
        /**
         * Calculate the CSS transform based on the actual position
         * Each position requires different transform origin for proper alignment
         */
        const getTransform = () => {
            switch (actualPosition) {
                case 'top':
                    return 'translateX(-50%) translateY(-100%)';
                case 'bottom':
                    return 'translateX(-50%)';
                case 'left':
                    return 'translateX(-100%) translateY(-50%)';
                case 'right':
                    return 'translateY(-50%)';
                default:
                    return 'none';
            }
        };

        /**
         * Build CSS classes for the popover element
         * Includes position, variant, state, and constraint classes
         */
        const buildPopoverClasses = () => {
            return [
                'popover',
                `popover--${actualPosition}`,
                `popover--${variant}`,
                show ? 'show' : '',
                isAnimating ? 'animating' : '',
                isEdgeConstrained ? 'popover--edge-constrained' : '',
                className,
            ]
                .filter(Boolean)
                .join(' ');
        };

        /**
         * Create style object for absolute positioning
         * Combines coordinates with transform for precise placement
         */
        const getPositionStyle = () => {
            return {
                top: coords.top,
                left: coords.left,
                transform: getTransform(),
            };
        };

        return (
            <div
                ref={popoverRef}
                className={buildPopoverClasses()}
                style={getPositionStyle()}
                role="dialog"
                aria-modal="false"
                aria-label={ariaLabel}
                aria-describedby={ariaDescribedBy}
            >
                {children}
            </div>
        );
    }
);

PopoverPositioning.propTypes = {
    children: PropTypes.node.isRequired,
    coords: PropTypes.shape({
        top: PropTypes.number.isRequired,
        left: PropTypes.number.isRequired,
    }).isRequired,
    actualPosition: PropTypes.oneOf(['top', 'bottom', 'left', 'right']).isRequired,
    isAnimating: PropTypes.bool,
    isEdgeConstrained: PropTypes.bool,
    variant: PropTypes.string,
    className: PropTypes.string,
    show: PropTypes.bool,
    popoverRef: PropTypes.object,
    ariaLabel: PropTypes.string,
    ariaDescribedBy: PropTypes.string,
};

PopoverPositioning.defaultProps = {
    isAnimating: false,
    isEdgeConstrained: false,
    variant: 'default',
    className: '',
    show: false,
    popoverRef: null,
    ariaLabel: undefined,
    ariaDescribedBy: undefined,
};

PopoverPositioning.displayName = 'PopoverPositioning';

export default PopoverPositioning;
