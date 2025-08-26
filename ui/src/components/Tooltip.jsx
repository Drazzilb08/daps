import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import ReactDOM from 'react-dom';

/**
 * Calculate robust tooltip position that handles complex responsive layouts
 * @param {HTMLElement} anchor - DOM element to anchor tooltip to
 * @param {Object} tooltipDimensions - Width and height of tooltip
 * @param {string} preferredPosition - Preferred position ('top' or 'bottom')
 * @param {number} offset - Offset distance from anchor
 * @returns {Object} Calculated position with top, left, and actualPosition
 */
function calculateTooltipPosition(
    anchor,
    tooltipDimensions,
    preferredPosition = 'top',
    offset = 8
) {
    const anchorRect = anchor.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const scrollX = window.pageXOffset;
    const scrollY = window.pageYOffset;

    const { width: tooltipWidth, height: tooltipHeight } = tooltipDimensions;
    const edgeMargin = 12; // Minimum distance from viewport edges

    let actualPosition = preferredPosition;
    let top = 0;
    let left = 0;

    // Auto-detect best position based on available space
    const spaceTop = anchorRect.top;
    const spaceBottom = viewportHeight - anchorRect.bottom;

    // Choose position with more available space, considering offset needs
    if (preferredPosition === 'top') {
        if (spaceTop < tooltipHeight + offset + edgeMargin && spaceBottom > spaceTop) {
            actualPosition = 'bottom';
        }
    } else if (preferredPosition === 'bottom') {
        if (spaceBottom < tooltipHeight + offset + edgeMargin && spaceTop > spaceBottom) {
            actualPosition = 'top';
        }
    }

    // Calculate base position
    if (actualPosition === 'top') {
        top = anchorRect.top + scrollY - offset - tooltipHeight;
        left = anchorRect.left + scrollX + anchorRect.width / 2;
    } else {
        top = anchorRect.bottom + scrollY + offset;
        left = anchorRect.left + scrollX + anchorRect.width / 2;
    }

    // Handle horizontal boundary constraints
    // The tooltip uses translateX(-50%) so we center it at the calculated left position
    const tooltipLeftEdge = left - tooltipWidth / 2;
    const tooltipRightEdge = left + tooltipWidth / 2;

    if (tooltipLeftEdge < edgeMargin) {
        // Too far left - adjust left position to account for centering
        left = edgeMargin + tooltipWidth / 2;
    } else if (tooltipRightEdge > viewportWidth - edgeMargin) {
        // Too far right - adjust left position to account for centering
        left = viewportWidth - edgeMargin - tooltipWidth / 2;
    }

    // Handle vertical boundary constraints as final safety check
    if (actualPosition === 'top') {
        if (top < edgeMargin) {
            // Force to bottom if we can't fit on top
            if (spaceBottom > tooltipHeight + offset) {
                actualPosition = 'bottom';
                top = anchorRect.bottom + scrollY + offset;
            } else {
                // Keep on top but constrain to visible area
                top = edgeMargin;
            }
        }
    } else {
        if (top + tooltipHeight > scrollY + viewportHeight - edgeMargin) {
            // Force to top if we can't fit on bottom
            if (spaceTop > tooltipHeight + offset) {
                actualPosition = 'top';
                top = anchorRect.top + scrollY - offset - tooltipHeight;
            } else {
                // Keep on bottom but constrain to visible area
                top = scrollY + viewportHeight - tooltipHeight - edgeMargin;
            }
        }
    }

    return { top, left, actualPosition };
}

/**
 * Tooltip component that creates a portal-rendered tooltip positioned relative to an anchor element
 * @param {Object} props - Component props
 * @param {HTMLElement} props.anchor - DOM element to anchor tooltip to
 * @param {string} props.text - Text content to display in tooltip
 * @param {string} [props.position='top'] - Tooltip position relative to anchor
 * @param {boolean} props.show - Whether tooltip is visible
 * @returns {JSX.Element|null} Portal-rendered tooltip or null
 */
function TooltipFactory({ anchor, text, position = 'top', show }) {
    // Detect mobile/touch devices and disable tooltips
    const isMobileDevice = () => {
        return window.innerWidth <= 768 || 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    };

    // Don't render tooltips on mobile/touch devices
    const [tooltipDimensions, setTooltipDimensions] = useState({ width: 0, height: 0 });
    const [calculatedPosition, setCalculatedPosition] = useState({
        top: 0,
        left: 0,
        actualPosition: position,
    });

    // Measure tooltip dimensions when text changes
    useEffect(() => {
        if (!text || isMobileDevice()) return;

        // Create temporary tooltip to measure dimensions
        const tempTooltip = document.createElement('div');
        tempTooltip.className = 'btn-tooltip show';
        tempTooltip.style.position = 'absolute';
        tempTooltip.style.visibility = 'hidden';
        tempTooltip.style.whiteSpace = 'nowrap';
        tempTooltip.style.top = '-9999px';
        tempTooltip.style.left = '-9999px';
        tempTooltip.textContent = text;
        document.body.appendChild(tempTooltip);

        const tooltipRect = tempTooltip.getBoundingClientRect();
        setTooltipDimensions({
            width: tooltipRect.width,
            height: tooltipRect.height,
        });

        document.body.removeChild(tempTooltip);
    }, [text]);

    // Calculate position when shown, anchor changes, or dimensions are available
    useEffect(() => {
        if (!anchor || !show || tooltipDimensions.width === 0 || isMobileDevice()) return;

        const newPosition = calculateTooltipPosition(anchor, tooltipDimensions, position, 8);
        setCalculatedPosition(newPosition);

        // Recalculate on window resize or scroll to handle responsive layout changes
        const handleResize = () => {
            const updatedPosition = calculateTooltipPosition(
                anchor,
                tooltipDimensions,
                position,
                8
            );
            setCalculatedPosition(updatedPosition);
        };

        window.addEventListener('resize', handleResize);
        window.addEventListener('scroll', handleResize, true);

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('scroll', handleResize, true);
        };
    }, [anchor, show, position, tooltipDimensions]);

    // Early return after hooks for mobile devices or when not ready to show
    if (isMobileDevice() || !show || !anchor || tooltipDimensions.width === 0) return null;

    const style = {
        position: 'absolute',
        zIndex: 5000,
        left: calculatedPosition.left,
        top: calculatedPosition.top,
        transform: 'translateX(-50%)',
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
    };

    return ReactDOM.createPortal(
        <div className="btn-tooltip show" style={style}>
            {text}
        </div>,
        document.body
    );
}

TooltipFactory.propTypes = {
    anchor: PropTypes.object,
    text: PropTypes.string.isRequired,
    position: PropTypes.oneOf(['top', 'bottom']),
    show: PropTypes.bool,
};

export default React.memo(TooltipFactory);
