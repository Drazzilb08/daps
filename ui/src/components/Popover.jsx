import React, { useEffect, useState, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import ReactDOM from 'react-dom';

/**
 * Popover - A flexible, accessible popover component with portal rendering
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
        const [coords, setCoords] = useState({ top: 0, left: 0 });
        const [actualPosition, setActualPosition] = useState(position);
        const [isAnimating, setIsAnimating] = useState(false);
        const popoverRef = useRef(null);

        // Calculate optimal position based on viewport constraints
        const calculatePosition = useCallback(() => {
            if (!triggerRef?.current || !show) return;

            const triggerRect = triggerRef.current.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const scrollX = window.pageXOffset;
            const scrollY = window.pageYOffset;

            let finalPosition = position;
            let top = 0;
            let left = 0;

            // Auto-detect best position if set to 'auto'
            if (position === 'auto') {
                const spaceTop = triggerRect.top;
                const spaceBottom = viewportHeight - triggerRect.bottom;
                const spaceLeft = triggerRect.left;
                const spaceRight = viewportWidth - triggerRect.right;

                if (spaceBottom >= spaceTop) {
                    finalPosition = 'bottom';
                } else if (spaceTop > spaceBottom) {
                    finalPosition = 'top';
                } else if (spaceRight >= spaceLeft) {
                    finalPosition = 'right';
                } else {
                    finalPosition = 'left';
                }
            }

            // Calculate position based on final position
            switch (finalPosition) {
                case 'top':
                    top = triggerRect.top + scrollY - offset;
                    left = triggerRect.left + scrollX + triggerRect.width / 2;
                    break;
                case 'bottom':
                    top = triggerRect.bottom + scrollY + offset;
                    left = triggerRect.left + scrollX + triggerRect.width / 2;
                    break;
                case 'left':
                    top = triggerRect.top + scrollY + triggerRect.height / 2;
                    left = triggerRect.left + scrollX - offset;
                    break;
                case 'right':
                    top = triggerRect.top + scrollY + triggerRect.height / 2;
                    left = triggerRect.right + scrollX + offset;
                    break;
            }

            setCoords({ top, left });
            setActualPosition(finalPosition);
        }, [triggerRef, show, position, offset]);

        // Handle click outside to close
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
        }, [show, closeOnClickOutside, onClose, triggerRef]);

        // Handle escape key to close
        useEffect(() => {
            if (!show || !closeOnEscape) return;

            const handleKeyDown = event => {
                if (event.key === 'Escape') {
                    event.preventDefault();
                    onClose();
                }

                // Focus trap handling
                if (trapFocus && event.key === 'Tab') {
                    const focusableElements = popoverRef.current?.querySelectorAll(
                        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                    );

                    if (focusableElements?.length) {
                        const first = focusableElements[0];
                        const last = focusableElements[focusableElements.length - 1];

                        if (event.shiftKey && document.activeElement === first) {
                            event.preventDefault();
                            last.focus();
                        } else if (!event.shiftKey && document.activeElement === last) {
                            event.preventDefault();
                            first.focus();
                        }
                    }
                }
            };

            document.addEventListener('keydown', handleKeyDown);
            return () => document.removeEventListener('keydown', handleKeyDown);
        }, [show, closeOnEscape, trapFocus, onClose]);

        // Calculate position when shown or dependencies change
        useEffect(() => {
            if (show) {
                calculatePosition();
                // Recalculate on window resize or scroll
                const handleResize = () => calculatePosition();
                const handleScroll = () => calculatePosition();

                window.addEventListener('resize', handleResize);
                window.addEventListener('scroll', handleScroll, true); // Use capture phase for all scroll events
                document.addEventListener('scroll', handleScroll, true);

                return () => {
                    window.removeEventListener('resize', handleResize);
                    window.removeEventListener('scroll', handleScroll, true);
                    document.removeEventListener('scroll', handleScroll, true);
                };
            }
        }, [show, calculatePosition]);

        // Handle animation states
        useEffect(() => {
            if (show) {
                setIsAnimating(true);
                const timer = setTimeout(() => setIsAnimating(false), 200);
                return () => clearTimeout(timer);
            }
        }, [show]);

        // Focus management
        useEffect(() => {
            if (show && trapFocus) {
                const focusableElements = popoverRef.current?.querySelectorAll(
                    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                );

                if (focusableElements?.length) {
                    focusableElements[0].focus();
                }
            }
        }, [show, trapFocus]);

        // Body scroll prevention
        useEffect(() => {
            if (!show || !preventBodyScroll) return;

            const originalStyle = window.getComputedStyle(document.body).overflow;
            document.body.style.overflow = 'hidden';

            return () => {
                document.body.style.overflow = originalStyle;
            };
        }, [show, preventBodyScroll]);

        if (!show || !triggerRef?.current) return null;

        const popoverClasses = [
            'popover',
            `popover--${actualPosition}`,
            `popover--${variant}`,
            show ? 'show' : '',
            isAnimating ? 'animating' : '',
            className,
        ]
            .filter(Boolean)
            .join(' ');

        const style = {
            top: coords.top,
            left: coords.left,
            transform:
                actualPosition === 'top'
                    ? 'translateX(-50%) translateY(-100%)'
                    : actualPosition === 'bottom'
                      ? 'translateX(-50%)'
                      : actualPosition === 'left'
                        ? 'translateX(-100%) translateY(-50%)'
                        : actualPosition === 'right'
                          ? 'translateY(-50%)'
                          : 'none',
        };

        const popoverContent = (
            <div
                ref={popoverRef}
                className={popoverClasses}
                style={style}
                role="dialog"
                aria-modal="false"
                aria-label={ariaLabel}
                aria-describedby={ariaDescribedBy}
            >
                {children}
            </div>
        );

        return ReactDOM.createPortal(popoverContent, document.body);
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
