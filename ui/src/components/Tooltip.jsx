import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import ReactDOM from 'react-dom';

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

    const VERTICAL_OFFSET = 48; // px, adjust as needed

    const style = {
        position: 'absolute',
        zIndex: 5000,
        left: coords.left + coords.width / 2,
        transform: 'translateX(-50%)',
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
        ...(position === 'top'
            ? { top: coords.top - VERTICAL_OFFSET }
            : { top: coords.top + VERTICAL_OFFSET - 8 }), // -8 so arrow is closer, tweak as you like
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
