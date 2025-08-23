import React from 'react';
import PropTypes from 'prop-types';
import TooltipFactory from './Tooltip';
import { getIcon } from '../utils/tools';

/**
 * Dashboard card component with collapsible content and optional header actions
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.icon - Icon to display in header
 * @param {string} props.title - Card title text
 * @param {React.ReactNode} [props.headerActions=null] - Optional header action buttons
 * @param {boolean} props.open - Whether card is expanded
 * @param {Function} props.onToggle - Handler for expand/collapse toggle
 * @param {React.RefObject} props.toggleRef - Ref for toggle button
 * @param {React.RefObject} props.cardRef - Ref for card container
 * @param {boolean} props.hoveredToggle - Whether toggle button is hovered
 * @param {Function} props.setHoveredToggle - Handler for hover state
 * @param {React.ReactNode} props.children - Card content
 * @returns {JSX.Element} Collapsible dashboard card
 */
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
