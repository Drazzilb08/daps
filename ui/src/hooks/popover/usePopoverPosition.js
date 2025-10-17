import { useState, useCallback, useEffect } from 'react';

/**
 * Custom hook for managing popover positioning calculations
 *
 * Handles complex positioning logic including:
 * - Auto position detection based on available space
 * - Viewport boundary collision detection
 * - Edge constraint calculations
 * - Smart position switching and fallbacks
 * - Responsive width calculations
 *
 * @param {Object} options - Positioning options
 * @param {Object} options.triggerRef - Ref to trigger element
 * @param {boolean} options.show - Whether popover is visible
 * @param {string} options.position - Preferred position ('top'|'bottom'|'left'|'right'|'auto')
 * @param {number} options.offset - Distance from trigger element in pixels
 * @param {string} options.className - CSS classes for responsive calculations
 * @param {Object} options.popoverRef - Ref to popover element for dimensions
 *
 * @returns {Object} Position state and utilities
 * @returns {Object} returns.coords - {top, left} coordinates for positioning
 * @returns {string} returns.actualPosition - Final calculated position
 * @returns {boolean} returns.isEdgeConstrained - Whether popover is constrained by viewport edges
 * @returns {Function} returns.calculatePosition - Force recalculation of position
 */
const usePopoverPosition = ({
    triggerRef,
    show,
    position = 'auto',
    offset = 8,
    className = '',
    popoverRef,
}) => {
    const [coords, setCoords] = useState({ top: 0, left: 0 });
    const [actualPosition, setActualPosition] = useState(position);
    const [isEdgeConstrained, setIsEdgeConstrained] = useState(false);

    /**
     * Calculate optimal position based on trigger element and available space
     */
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
            (finalPopoverTop <= edgeMargin || finalPopoverBottom >= viewportHeight - edgeMargin);

        const edgeConstrained =
            isHorizontallyConstrained ||
            isVerticallyConstrained ||
            popoverWidth > viewportWidth - viewportMargin ||
            popoverHeight > viewportHeight - viewportMargin;

        setCoords({ top, left });
        setActualPosition(finalPosition);
        setIsEdgeConstrained(edgeConstrained);
    }, [triggerRef, show, position, offset, className, popoverRef]);

    // Set up event listeners for position recalculation
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

    return {
        coords,
        actualPosition,
        isEdgeConstrained,
        calculatePosition,
    };
};

export default usePopoverPosition;
