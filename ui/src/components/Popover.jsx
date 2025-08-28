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
        const [isEdgeConstrained, setIsEdgeConstrained] = useState(false);
        const popoverRef = useRef(null);

        // Combined position calculation that handles both initial and refined positioning
        const calculatePosition = useCallback(() => {
            if (!triggerRef?.current || !show) return;

            const triggerRect = triggerRef.current.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const scrollX = window.pageXOffset;
            const scrollY = window.pageYOffset;

            // Get popover dimensions - use actual if available, otherwise estimate
            let popoverWidth = 320; // Default max width from CSS
            let popoverHeight = 240; // Reasonable estimate

            // Use actual dimensions if popover is rendered
            const popoverRect = popoverRef?.current?.getBoundingClientRect();
            if (popoverRect && popoverRect.width > 0 && popoverRect.height > 0) {
                popoverWidth = popoverRect.width;
                popoverHeight = popoverRect.height;
            } else {
                // Fall back to estimated dimensions based on className
                const isWidePopover = className?.includes('popover--wide');
                if (isWidePopover) {
                    // Account for responsive behavior from CSS
                    if (viewportWidth <= 480) {
                        // Mobile: max-width: calc(100vw - 24px), min-width: calc(100vw - 48px)
                        popoverWidth = viewportWidth - 24;
                    } else {
                        // Desktop: max-width: min(480px, calc(100vw - 24px))
                        popoverWidth = Math.min(480, viewportWidth - 24);
                    }
                    // Wide popovers tend to be taller due to more content
                    popoverHeight = 300;
                }
            }

            // Safety margin from viewport edges
            const edgeMargin = 12;

            let finalPosition = position;
            let top = 0;
            let left = 0;

            // Enhanced auto-detection with edge case handling
            if (position === 'auto') {
                const spaceTop = triggerRect.top;
                const spaceBottom = viewportHeight - triggerRect.bottom;
                const spaceLeft = triggerRect.left;
                const spaceRight = viewportWidth - triggerRect.right;

                // Primary position preference based on available space
                if (spaceBottom >= popoverHeight + edgeMargin && spaceBottom >= spaceTop) {
                    finalPosition = 'bottom';
                } else if (spaceTop >= popoverHeight + edgeMargin && spaceTop > spaceBottom) {
                    finalPosition = 'top';
                } else if (spaceRight >= popoverWidth + edgeMargin && spaceRight >= spaceLeft) {
                    finalPosition = 'right';
                } else if (spaceLeft >= popoverWidth + edgeMargin) {
                    finalPosition = 'left';
                } else {
                    // Fallback: use position with most space, even if tight
                    const maxSpace = Math.max(spaceTop, spaceBottom, spaceLeft, spaceRight);
                    if (maxSpace === spaceBottom) finalPosition = 'bottom';
                    else if (maxSpace === spaceTop) finalPosition = 'top';
                    else if (maxSpace === spaceRight) finalPosition = 'right';
                    else finalPosition = 'left';
                }
            }

            // Calculate base position
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

            // Smart edge detection and correction for horizontal positioning
            if (finalPosition === 'top' || finalPosition === 'bottom') {
                // For top/bottom positioning, the CSS applies translateX(-50%) which centers the popover
                // So we need to check if the centered popover would exceed viewport bounds
                const popoverLeft = left - popoverWidth / 2;
                const popoverRight = left + popoverWidth / 2;

                if (popoverLeft < edgeMargin) {
                    // Too far left: position so left edge is at margin
                    left = edgeMargin + popoverWidth / 2;
                } else if (popoverRight > viewportWidth - edgeMargin) {
                    // Too far right: position so right edge is at margin from right viewport edge
                    left = viewportWidth - edgeMargin - popoverWidth / 2;
                }
            }

            // Smart edge detection and correction for vertical positioning
            if (finalPosition === 'left' || finalPosition === 'right') {
                // Center-aligned: adjust if popover would extend beyond viewport
                const popoverTop = top - popoverHeight / 2;
                const popoverBottom = top + popoverHeight / 2;

                if (popoverTop < edgeMargin) {
                    // Too far up: align to top edge with margin
                    top = popoverHeight / 2 + edgeMargin;
                } else if (popoverBottom > viewportHeight - edgeMargin) {
                    // Too far down: align to bottom edge with margin
                    top = viewportHeight - popoverHeight / 2 - edgeMargin;
                }
            }

            // Final boundary enforcement for all positions
            if (finalPosition === 'top') {
                // Ensure popover doesn't go above viewport
                if (top - popoverHeight < edgeMargin) {
                    // Switch to bottom if there's more space
                    const spaceBottom = viewportHeight - triggerRect.bottom;
                    if (spaceBottom > triggerRect.top) {
                        finalPosition = 'bottom';
                        top = triggerRect.bottom + scrollY + offset;
                    } else {
                        // Keep top but constrain position
                        top = Math.max(popoverHeight + edgeMargin, top);
                    }
                }
            } else if (finalPosition === 'bottom') {
                // Ensure popover doesn't go below viewport
                if (top + popoverHeight > viewportHeight - edgeMargin) {
                    // Switch to top if there's more space
                    const spaceTop = triggerRect.top;
                    if (spaceTop > viewportHeight - triggerRect.bottom) {
                        finalPosition = 'top';
                        top = triggerRect.top + scrollY - offset;
                    } else {
                        // Keep bottom but constrain position
                        top = Math.min(viewportHeight - popoverHeight - edgeMargin, top);
                    }
                }
            }

            if (finalPosition === 'left') {
                // Ensure popover doesn't go beyond left edge
                if (left - popoverWidth < edgeMargin) {
                    // Switch to right if there's more space
                    const spaceRight = viewportWidth - triggerRect.right;
                    if (spaceRight > triggerRect.left) {
                        finalPosition = 'right';
                        left = triggerRect.right + scrollX + offset;
                    } else {
                        // Keep left but constrain position
                        left = Math.max(popoverWidth + edgeMargin, left);
                    }
                }
            } else if (finalPosition === 'right') {
                // Ensure popover doesn't go beyond right edge
                if (left + popoverWidth > viewportWidth - edgeMargin) {
                    // Switch to left if there's more space
                    const spaceLeft = triggerRect.left;
                    if (spaceLeft > viewportWidth - triggerRect.right) {
                        finalPosition = 'left';
                        left = triggerRect.left + scrollX - offset;
                    } else {
                        // Keep right but constrain position
                        left = Math.min(viewportWidth - popoverWidth - edgeMargin, left);
                    }
                }
            }

            // Determine if popover is edge-constrained - check final position after adjustments
            const viewportMargin = 24; // Total margin (12px on each side)
            const finalPopoverLeft = left - popoverWidth / 2;
            const finalPopoverRight = left + popoverWidth / 2;
            const finalPopoverTop = top - popoverHeight / 2;
            const finalPopoverBottom = top + popoverHeight / 2;

            const isHorizontallyConstrained =
                (finalPosition === 'top' || finalPosition === 'bottom') &&
                (finalPopoverLeft <= edgeMargin || finalPopoverRight >= viewportWidth - edgeMargin);

            const isVerticallyConstrained =
                (finalPosition === 'left' || finalPosition === 'right') &&
                (finalPopoverTop <= edgeMargin ||
                    finalPopoverBottom >= viewportHeight - edgeMargin);

            const edgeConstrained =
                isHorizontallyConstrained ||
                isVerticallyConstrained ||
                popoverWidth > viewportWidth - viewportMargin ||
                popoverHeight > viewportHeight - viewportMargin;

            setCoords({ top, left });
            setActualPosition(finalPosition);
            setIsEdgeConstrained(edgeConstrained);
        }, [triggerRef, show, position, offset, className]);

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
        }, [show, closeOnEscape, trapFocus, onClose]);

        // Calculate position when shown or dependencies change
        useEffect(() => {
            if (show) {
                calculatePosition();

                // Recalculate on window resize or scroll
                const handleResize = () => {
                    calculatePosition();
                };
                const handleScroll = () => {
                    calculatePosition();
                };

                window.addEventListener('resize', handleResize);
                window.addEventListener('scroll', handleScroll, true);
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
            isEdgeConstrained ? 'popover--edge-constrained' : '',
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
