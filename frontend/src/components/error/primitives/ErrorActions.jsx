import React from 'react';
import PropTypes from 'prop-types';
import { Button } from '../../ui/button/Button';

/**
 * ErrorActions - Action button composition
 *
 * Renders a collection of action buttons with icons using the Button component.
 *
 * @param {Object} props
 * @param {Array} props.actions - Action button configurations
 * @param {Function} props.onAction - Action handler
 * @param {'page'|'modal'|'inline'} props.mode - Button layout mode
 */
export const ErrorActions = ({ actions = [], onAction, mode = 'page' }) => {
    if (actions.length === 0) return null;

    const containerClass =
        mode === 'page' ? 'mb-6 flex flex-wrap gap-2' : 'flex flex-wrap gap-2 mb-0';

    return (
        <div className={containerClass}>
            {actions.map(action => (
                <Button
                    key={action.id}
                    variant={action.variant || 'secondary'}
                    onClick={() => onAction(action.id)}
                    disabled={action.disabled}
                    className="gap-1"
                >
                    {action.icon && (
                        <span className="material-symbols-outlined text-base align-middle">
                            {action.icon}
                        </span>
                    )}
                    {action.label}
                </Button>
            ))}
        </div>
    );
};

ErrorActions.propTypes = {
    actions: PropTypes.arrayOf(
        PropTypes.shape({
            id: PropTypes.string.isRequired,
            label: PropTypes.string.isRequired,
            variant: PropTypes.oneOf(['primary', 'secondary', 'success', 'danger']),
            icon: PropTypes.string,
            disabled: PropTypes.bool,
        })
    ),
    onAction: PropTypes.func.isRequired,
    mode: PropTypes.oneOf(['page', 'modal', 'inline']),
};
