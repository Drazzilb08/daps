import React from 'react';
import PropTypes from 'prop-types';
import { Card } from '../Card';
import { Button } from '../../button/Button';

/**
 * ActionCard - Preset card pattern for action-oriented cards
 *
 * Common pattern: Title + Description + Primary Action
 *
 * @param {Object} props - Component props
 * @param {string} props.title - Card title
 * @param {string} props.description - Card description
 * @param {string} props.actionLabel - Primary action button label
 * @param {Function} props.onAction - Primary action handler
 * @param {string} props.actionVariant - Action button variant
 * @param {string} props.actionIcon - Action button icon
 * @param {ReactNode} props.secondaryAction - Optional secondary action
 * @returns {JSX.Element}
 */
export const ActionCard = React.memo(
    ({
        title,
        description,
        actionLabel,
        onAction,
        actionVariant = 'primary',
        actionIcon = null,
        secondaryAction = null,
    }) => {
        return (
            <Card>
                <Card.Header title={title} />
                <Card.Body>
                    <p>{description}</p>
                </Card.Body>
                <Card.Footer align={secondaryAction ? 'space-between' : 'right'}>
                    {secondaryAction}
                    <Button variant={actionVariant} icon={actionIcon} onClick={onAction}>
                        {actionLabel}
                    </Button>
                </Card.Footer>
            </Card>
        );
    }
);

ActionCard.displayName = 'ActionCard';

ActionCard.propTypes = {
    title: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    actionLabel: PropTypes.string.isRequired,
    onAction: PropTypes.func.isRequired,
    actionVariant: PropTypes.oneOf(['primary', 'secondary', 'success', 'danger']),
    actionIcon: PropTypes.string,
    secondaryAction: PropTypes.node,
};
