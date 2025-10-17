import React from 'react';
import PropTypes from 'prop-types';

/**
 * ButtonGroup - Multiple buttons with shared styling
 *
 * Composes: Multiple Button/IconButton components
 *
 * @param {Object} props - Component props
 * @param {ReactNode} props.children - Button components
 * @param {string} props.orientation - Horizontal or vertical layout
 * @param {string} props.spacing - Gap between buttons
 * @param {string} props.className - Additional classes
 * @returns {JSX.Element}
 */
export const ButtonGroup = React.memo(
    ({ children, orientation = 'horizontal', spacing = 'medium', className = '' }) => {
        // Build class names
        const groupClasses = [
            'btn-group',
            `btn-group-${orientation}`,
            `btn-group-spacing-${spacing}`,
            className,
        ]
            .filter(Boolean)
            .join(' ');

        return (
            <div className={groupClasses} role="group">
                {children}
            </div>
        );
    }
);

ButtonGroup.displayName = 'ButtonGroup';

ButtonGroup.propTypes = {
    children: PropTypes.node.isRequired,
    orientation: PropTypes.oneOf(['horizontal', 'vertical']),
    spacing: PropTypes.oneOf(['small', 'medium', 'large']),
    className: PropTypes.string,
};
