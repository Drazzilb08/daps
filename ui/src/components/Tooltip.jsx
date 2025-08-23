import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import ReactDOM from 'react-dom';

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
    const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
    const [tooltipDimensions, setTooltipDimensions] = useState({ width: 0, height: 0 });

    useEffect(() => {
        if (anchor && show) {
            const rect = anchor.getBoundingClientRect();
            setCoords({
                top: rect.top + window.scrollY,
                left: rect.left + window.scrollX,
                width: rect.width,
            });

            // Create temporary tooltip to measure dimensions
            const tempTooltip = document.createElement('div');
            tempTooltip.className = 'btn-tooltip show';
            tempTooltip.style.position = 'absolute';
            tempTooltip.style.visibility = 'hidden';
            tempTooltip.style.whiteSpace = 'nowrap';
            tempTooltip.textContent = text;
            document.body.appendChild(tempTooltip);

            const tooltipRect = tempTooltip.getBoundingClientRect();
            setTooltipDimensions({
                width: tooltipRect.width,
                height: tooltipRect.height,
            });

            document.body.removeChild(tempTooltip);
        }
    }, [anchor, show, text]);

    if (!show || !anchor) return null;

    const VERTICAL_OFFSET = 48;
    const HORIZONTAL_PADDING = 8; // Minimum distance from screen edge

    // Calculate initial position
    let tooltipLeft = coords.left + coords.width / 2;
    let tooltipTop =
        position === 'top' ? coords.top - VERTICAL_OFFSET : coords.top + VERTICAL_OFFSET - 8;

    // Boundary detection and adjustment
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Horizontal boundary detection
    const tooltipHalfWidth = tooltipDimensions.width / 2;

    if (tooltipLeft - tooltipHalfWidth < HORIZONTAL_PADDING) {
        // Too far left - align to left edge with padding
        tooltipLeft = tooltipHalfWidth + HORIZONTAL_PADDING;
    } else if (tooltipLeft + tooltipHalfWidth > viewportWidth - HORIZONTAL_PADDING) {
        // Too far right - align to right edge with padding
        tooltipLeft = viewportWidth - tooltipHalfWidth - HORIZONTAL_PADDING;
    }

    // Vertical boundary detection
    if (position === 'top' && tooltipTop < HORIZONTAL_PADDING) {
        // Tooltip would go off top - flip to bottom
        tooltipTop = coords.top + coords.width + HORIZONTAL_PADDING;
    } else if (
        position === 'bottom' &&
        tooltipTop + tooltipDimensions.height > viewportHeight - HORIZONTAL_PADDING
    ) {
        // Tooltip would go off bottom - flip to top
        tooltipTop = coords.top - tooltipDimensions.height - HORIZONTAL_PADDING;
    }

    const style = {
        position: 'absolute',
        zIndex: 5000,
        left: tooltipLeft,
        top: tooltipTop,
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
