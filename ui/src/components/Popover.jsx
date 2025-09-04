import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import usePopoverPosition from '../hooks/popover/usePopoverPosition';
import PopoverContent from './popover/PopoverContent';

/**
 * Popover - A flexible, accessible popover component with portal rendering
 *
 * Now composed of smaller, focused components:
 * - usePopoverPosition: Handles complex positioning calculations
 * - PopoverContent: Manages interactions and portal rendering
 * - PopoverPositioning: Handles visual positioning and styling
 *
 * @param {Object} props - Component props
 * @param {Object} props.triggerRef - Ref object for the trigger element
 * @param {boolean} props.show - Whether the popover is visible
 * @param {Function} props.onClose - Callback when popover should close
 * @param {React.ReactNode} props.children - Content to display in the popover
 * @param {string} props.position - Preferred position ('top'|'bottom'|'left'|'right'|'auto')
 * @param {number} props.offset - Distance from trigger element in pixels
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.variant - Styling variant ('default'|'help'|'selector'|'actions')
 * @param {boolean} props.closeOnClickOutside - Close when clicking outside
 * @param {boolean} props.closeOnEscape - Close when pressing Escape key
 * @param {boolean} props.trapFocus - Trap focus within popover
 * @param {boolean} props.preventBodyScroll - Prevent body scroll when popover is open
 * @param {string} props.ariaLabel - ARIA label for accessibility
 * @param {string} props.ariaDescribedBy - ARIA described by attribute
 */
const Popover = React.memo(
    ({
        triggerRef,
        show,
        onClose,
        children,
        position = 'auto',
        offset = 8,
        className = '',
        variant = 'default',
        closeOnClickOutside = true,
        closeOnEscape = true,
        trapFocus = false,
        preventBodyScroll = false,
        ariaLabel,
        ariaDescribedBy,
    }) => {
        const [isAnimating, setIsAnimating] = useState(false);
        const popoverRef = useRef(null);

        // Use the positioning hook for all complex calculations
        const { coords, actualPosition, isEdgeConstrained } = usePopoverPosition({
            triggerRef,
            show,
            position,
            offset,
            className,
            popoverRef,
        });

        // Handle animation states
        useEffect(() => {
            if (show) {
                setIsAnimating(true);
                const timer = setTimeout(() => setIsAnimating(false), 200);
                return () => clearTimeout(timer);
            }
        }, [show]);

        // Render popover using PopoverContent component
        return (
            <PopoverContent
                show={show}
                onClose={onClose}
                triggerRef={triggerRef}
                popoverRef={popoverRef}
                closeOnClickOutside={closeOnClickOutside}
                closeOnEscape={closeOnEscape}
                trapFocus={trapFocus}
                preventBodyScroll={preventBodyScroll}
                coords={coords}
                actualPosition={actualPosition}
                isAnimating={isAnimating}
                isEdgeConstrained={isEdgeConstrained}
                variant={variant}
                className={className}
                ariaLabel={ariaLabel}
                ariaDescribedBy={ariaDescribedBy}
            >
                {children}
            </PopoverContent>
        );
    }
);

Popover.propTypes = {
    triggerRef: PropTypes.object.isRequired,
    show: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    children: PropTypes.node.isRequired,
    position: PropTypes.oneOf(['top', 'bottom', 'left', 'right', 'auto']),
    offset: PropTypes.number,
    className: PropTypes.string,
    variant: PropTypes.oneOf(['default', 'help', 'selector', 'actions']),
    closeOnClickOutside: PropTypes.bool,
    closeOnEscape: PropTypes.bool,
    trapFocus: PropTypes.bool,
    preventBodyScroll: PropTypes.bool,
    ariaLabel: PropTypes.string,
    ariaDescribedBy: PropTypes.string,
};

Popover.displayName = 'Popover';

export default Popover;
