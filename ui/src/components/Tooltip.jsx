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

    useEffect(() => {
        if (anchor && show) {
            const rect = anchor.getBoundingClientRect();
            setCoords({
                top: rect.top + window.scrollY,
                left: rect.left + window.scrollX,
                width: rect.width,
            });
        }
    }, [anchor, show]);

    if (!show || !anchor) return null;

    const VERTICAL_OFFSET = 48;

    const style = {
        position: 'absolute',
        zIndex: 5000,
        left: coords.left + coords.width / 2,
        transform: 'translateX(-50%)',
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
        ...(position === 'top'
            ? { top: coords.top - VERTICAL_OFFSET }
            : { top: coords.top + VERTICAL_OFFSET - 8 }),
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
