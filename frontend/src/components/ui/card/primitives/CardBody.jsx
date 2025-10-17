import React from 'react';
import PropTypes from 'prop-types';

/**
 * CardBody - Card body content primitive
 *
 * Responsibilities:
 * - Card body container
 * - Flexible content layout
 * - Proper padding and spacing
 * - Theme-aware colors
 *
 * @param {Object} props - Component props
 * @param {ReactNode} props.children - Card body content
 * @param {string} props.className - Additional CSS classes
 * @returns {JSX.Element}
 */
export const CardBody = React.memo(({ children, className = '' }) => {
    return <div className={`flex-1 p-5 text-primary leading-relaxed ${className}`}>{children}</div>;
});

CardBody.displayName = 'CardBody';

CardBody.propTypes = {
    children: PropTypes.node.isRequired,
    className: PropTypes.string,
};
