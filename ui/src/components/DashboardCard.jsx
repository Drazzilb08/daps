import React from 'react';
import PropTypes from 'prop-types';
import TooltipFactory from './Tooltip';
import { getIcon } from '../utils/tools';

function DashboardContent({
    icon,
    title,
    headerActions = null,
    open,
    onToggle,
    toggleRef,
    cardRef,
    hoveredToggle,
    setHoveredToggle,
    children,
}) {
    return (
        <div className="dashboard-card-wrapper" ref={cardRef}>
            <div className="dashboard-card">
                <div className="dashboard-card-header">
                    <button
                        ref={toggleRef}
                        className={`collapse-toggle${open ? ' open' : ''}`}
                        aria-expanded={open}
                        aria-label={open ? `Collapse ${title}` : `Expand ${title}`}
                        onClick={onToggle}
                        tabIndex={0}
                        type="button"
                        onMouseEnter={setHoveredToggle}
                        onMouseLeave={() => setHoveredToggle(null)}
                        onFocus={setHoveredToggle}
                        onBlur={() => setHoveredToggle(null)}
                    >
                        <span className="collapse-chevron">
                            {getIcon('mi:keyboard_arrow_down')}
                        </span>
                        <TooltipFactory
                            anchor={toggleRef?.current}
                            text={open ? `Collapse ${title}` : `Expand ${title}`}
                            show={hoveredToggle}
                            position="top"
                        />
                    </button>
                    <span className="dashboard-card-title">
                        {icon} {title}
                    </span>
                    {headerActions && <div className="dashboard-card-actions">{headerActions}</div>}
                </div>
                <div
                    className={`dashboard-card-content-outer${open ? ' dashboard-card-content-outer--open' : ''}`}
                >
                    <div className="dashboard-card-content">{open ? children : null}</div>
                </div>
            </div>
        </div>
    );
}

DashboardContent.propTypes = {
    icon: PropTypes.node,
    title: PropTypes.string.isRequired,
    headerActions: PropTypes.node,
    open: PropTypes.bool.isRequired,
    onToggle: PropTypes.func.isRequired,
    toggleRef: PropTypes.object,
    cardRef: PropTypes.object,
    hoveredToggle: PropTypes.bool,
    setHoveredToggle: PropTypes.func.isRequired,
    children: PropTypes.node,
};

export default React.memo(DashboardContent);
