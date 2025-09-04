import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import ReactDOM from 'react-dom';
import PopoverPositioning from './PopoverPositioning';

/**
 * PopoverContent - Component responsible for popover content management and interactions
 *
 * Handles:
 * - Portal rendering to document.body
 * - Event listeners for outside clicks and keyboard navigation
 * - Focus management and trapping
 * - Body scroll prevention
 * - Content rendering through PopoverPositioning component
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Popover content
 * @param {boolean} props.show - Whether popover is visible
 * @param {Function} props.onClose - Close callback function
 * @param {React.RefObject} props.triggerRef - Ref to trigger element
 * @param {React.RefObject} props.popoverRef - Ref to popover element
 * @param {boolean} props.closeOnClickOutside - Close when clicking outside
 * @param {boolean} props.closeOnEscape - Close when pressing Escape key
 * @param {boolean} props.trapFocus - Trap focus within popover
 * @param {boolean} props.preventBodyScroll - Prevent body scroll when open
 * @param {Object} props.coords - Position coordinates
 * @param {string} props.actualPosition - Current position
 * @param {boolean} props.isAnimating - Whether currently animating
 * @param {boolean} props.isEdgeConstrained - Whether constrained by viewport
 * @param {string} props.variant - Popover variant
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.ariaLabel - ARIA label
 * @param {string} props.ariaDescribedBy - ARIA described by attribute
 */
const PopoverContent = React.memo(
    ({
        children,
        show,
        onClose,
        triggerRef,
        popoverRef,
        closeOnClickOutside,
        closeOnEscape,
        trapFocus,
        preventBodyScroll,
        coords,
        actualPosition,
        isAnimating,
        isEdgeConstrained,
        variant,
        className,
        ariaLabel,
        ariaDescribedBy,
    }) => {
        /**
         * Handle clicks outside the popover to close it
         */
        useEffect(() => {
            if (!show || !closeOnClickOutside) return;

            const handleClickOutside = event => {
                if (
                    popoverRef.current &&
                    !popoverRef.current.contains(event.target) &&
                    triggerRef?.current &&
                    !triggerRef.current.contains(event.target)
                ) {
                    onClose();
                }
            };

            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }, [show, closeOnClickOutside, onClose, triggerRef, popoverRef]);

        /**
         * Handle escape key and focus trapping
         */
        useEffect(() => {
            if (!show || (!closeOnEscape && !trapFocus)) return;

            const handleKeyDown = event => {
                // Handle escape key to close
                if (closeOnEscape && event.key === 'Escape') {
                    event.preventDefault();
                    onClose();
                    return;
                }

                // Handle focus trapping
                if (trapFocus && event.key === 'Tab') {
                    const focusableElements = popoverRef.current?.querySelectorAll(
                        'button:not([disabled]), [href]:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])'
                    );

                    if (focusableElements?.length) {
                        // Convert NodeList to Array for easier manipulation
                        const elements = Array.from(focusableElements);
                        const first = elements[0];
                        const last = elements[elements.length - 1];

                        // Only trap focus if the active element is within the popover
                        const activeElement = document.activeElement;
                        const isActiveInPopover = popoverRef.current?.contains(activeElement);

                        if (isActiveInPopover) {
                            if (event.shiftKey && activeElement === first) {
                                event.preventDefault();
                                last.focus();
                            } else if (!event.shiftKey && activeElement === last) {
                                event.preventDefault();
                                first.focus();
                            }
                        } else if (!isActiveInPopover) {
                            // If focus is outside popover, bring it back to the first element
                            event.preventDefault();
                            first.focus();
                        }
                    }
                }
            };

            document.addEventListener('keydown', handleKeyDown);
            return () => document.removeEventListener('keydown', handleKeyDown);
        }, [show, closeOnEscape, trapFocus, onClose, popoverRef]);

        /**
         * Handle initial focus when popover opens and trap focus is enabled
         */
        useEffect(() => {
            if (show && trapFocus && popoverRef.current) {
                // Small delay to ensure popover is rendered and visible
                const timer = setTimeout(() => {
                    const focusableElements = popoverRef.current?.querySelectorAll(
                        'button:not([disabled]), [href]:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])'
                    );

                    if (focusableElements?.length) {
                        const firstElement = focusableElements[0];
                        if (firstElement && typeof firstElement.focus === 'function') {
                            firstElement.focus();
                        }
                    }
                }, 100);

                return () => clearTimeout(timer);
            }
        }, [show, trapFocus, popoverRef]);

        /**
         * Handle body scroll prevention when popover is open
         */
        useEffect(() => {
            if (!show || !preventBodyScroll) return;

            const originalStyle = window.getComputedStyle(document.body).overflow;
            document.body.style.overflow = 'hidden';

            return () => {
                document.body.style.overflow = originalStyle;
            };
        }, [show, preventBodyScroll]);

        // Don't render if popover should not be shown
        if (!show || !triggerRef?.current) return null;

        // Create the popover content using PopoverPositioning component
        const popoverContent = (
            <PopoverPositioning
                coords={coords}
                actualPosition={actualPosition}
                isAnimating={isAnimating}
                isEdgeConstrained={isEdgeConstrained}
                variant={variant}
                className={className}
                show={show}
                popoverRef={popoverRef}
                ariaLabel={ariaLabel}
                ariaDescribedBy={ariaDescribedBy}
            >
                {children}
            </PopoverPositioning>
        );

        // Render popover content through portal to document.body
        return ReactDOM.createPortal(popoverContent, document.body);
    }
);

PopoverContent.propTypes = {
    children: PropTypes.node.isRequired,
    show: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    triggerRef: PropTypes.object.isRequired,
    popoverRef: PropTypes.object.isRequired,
    closeOnClickOutside: PropTypes.bool,
    closeOnEscape: PropTypes.bool,
    trapFocus: PropTypes.bool,
    preventBodyScroll: PropTypes.bool,
    coords: PropTypes.shape({
        top: PropTypes.number.isRequired,
        left: PropTypes.number.isRequired,
    }).isRequired,
    actualPosition: PropTypes.oneOf(['top', 'bottom', 'left', 'right']).isRequired,
    isAnimating: PropTypes.bool,
    isEdgeConstrained: PropTypes.bool,
    variant: PropTypes.string,
    className: PropTypes.string,
    ariaLabel: PropTypes.string,
    ariaDescribedBy: PropTypes.string,
};

PopoverContent.defaultProps = {
    closeOnClickOutside: true,
    closeOnEscape: true,
    trapFocus: false,
    preventBodyScroll: false,
    isAnimating: false,
    isEdgeConstrained: false,
    variant: 'default',
    className: '',
    ariaLabel: undefined,
    ariaDescribedBy: undefined,
};

PopoverContent.displayName = 'PopoverContent';

export default PopoverContent;
