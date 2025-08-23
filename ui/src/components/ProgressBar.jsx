import React, { useRef, useState } from 'react';
import PropTypes from 'prop-types';
import TooltipFactory from './Tooltip';
import '../css/components/progress.css';

/**
 * Progress bar component with optional tooltip and state variants
 * @param {Object} props - Component props
 * @param {number|null} [props.value=null] - Progress value (0-100)
 * @param {boolean} [props.active=false] - Whether bar is in active state
 * @param {string} [props.className=''] - Additional CSS classes
 * @param {Object} [props.style={}] - Inline styles
 * @param {boolean} [props.done=false] - Whether operation is complete
 * @param {boolean} [props.error=false] - Whether operation has error
 * @param {string} [props.tooltip=''] - Tooltip text on hover
 * @param {Object} props - Additional props passed to container
 * @returns {JSX.Element} Styled progress bar with optional states
 */
function ProgressBar({
    value = null,
    active = false,
    className = '',
    style = {},
    done = false,
    error = false,
    tooltip = '',
    ...props
}) {
    const [tip, setTip] = useState(false);
    const barRef = useRef(null);

    const hasValue = value !== null && value !== undefined;
    let percent = hasValue ? Math.max(0, Math.min(100, value)) : 0;
    let labelClass = percent >= 50 ? 'progress-bar__label--invert' : '';

    let displayTooltip = tip && tooltip;
    let doneClass = done ? ' progress-bar--done' : '';
    let errorClass = error ? ' progress-bar--error' : '';

    return (
        <div
            ref={barRef}
            className={`progress-bar${active || hasValue ? ' progress-bar--active' : ''}${doneClass}${errorClass}${className ? ' ' + className : ''}`}
            style={style}
            {...props}
            onMouseEnter={() => setTip(true)}
            onMouseLeave={() => setTip(false)}
        >
            <div
                className="progress-bar__inner"
                style={hasValue ? { width: `${percent}%` } : undefined}
            />
            <span className={`progress-bar__label${labelClass ? ' ' + labelClass : ''}`}>
                {hasValue ? `${Math.round(percent)}%` : ''}
            </span>
            {displayTooltip && (
                <TooltipFactory
                    anchor={barRef.current}
                    text={tooltip}
                    show={displayTooltip}
                    position="top"
                />
            )}
        </div>
    );
}

ProgressBar.propTypes = {
    value: PropTypes.number,
    active: PropTypes.bool,
    className: PropTypes.string,
    style: PropTypes.object,
    done: PropTypes.bool,
    error: PropTypes.bool,
    tooltip: PropTypes.string,
};

export default React.memo(ProgressBar);
