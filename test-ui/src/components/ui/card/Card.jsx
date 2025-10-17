import React from 'react';
import PropTypes from 'prop-types';
import { CardContainer, CardHeader, CardBody, CardFooter, CardImage } from './primitives';

/**
 * Card - Compound card component with subcomponents
 *
 * Composes: CardContainer + CardHeader + CardBody + CardFooter + CardImage
 *
 * Usage pattern (compound component):
 * <Card>
 *   <Card.Image src="..." alt="..." />
 *   <Card.Header title="..." subtitle="..." />
 *   <Card.Body>Content here</Card.Body>
 *   <Card.Footer>Actions here</Card.Footer>
 * </Card>
 *
 * @param {Object} props - Component props
 * @param {ReactNode} props.children - Card content (subcomponents)
 * @param {boolean} props.hoverable - Enable hover state
 * @param {boolean} props.clickable - Enable click interaction
 * @param {Function} props.onClick - Click handler
 * @param {boolean} props.selected - Selected state
 * @param {string} props.className - Additional classes
 * @returns {JSX.Element}
 */
export const Card = React.memo(
    ({
        children,
        hoverable = false,
        clickable = false,
        onClick,
        selected = false,
        className = '',
        ...htmlProps
    }) => {
        return (
            <CardContainer
                hoverable={hoverable}
                clickable={clickable}
                onClick={onClick}
                selected={selected}
                className={className}
                {...htmlProps}
            >
                {children}
            </CardContainer>
        );
    }
);

// Attach subcomponents for compound component pattern
Card.Image = CardImage;
Card.Header = CardHeader;
Card.Body = CardBody;
Card.Footer = CardFooter;

Card.displayName = 'Card';

Card.propTypes = {
    children: PropTypes.node.isRequired,
    hoverable: PropTypes.bool,
    clickable: PropTypes.bool,
    onClick: PropTypes.func,
    selected: PropTypes.bool,
    className: PropTypes.string,
};
