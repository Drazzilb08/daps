import React from 'react';
import PropTypes from 'prop-types';

/**
 * CardFooter - Card footer primitive
 *
 * Responsibilities:
 * - Card footer container
 * - Action buttons layout
 * - Metadata display
 * - Proper padding and spacing
 * - Theme-aware colors
 *
 * @param {Object} props - Component props
 * @param {ReactNode} props.children - Footer content (buttons, metadata)
 * @param {string} props.align - Content alignment (left, center, right, space-between)
 * @param {string} props.className - Additional CSS classes
 * @returns {JSX.Element}
 */
export const CardFooter = React.memo(({ children, align = 'right', className = '' }) => {
    // Map alignment prop to utility classes (layout.css)
    const alignClasses = {
        left: 'justify-start',
        center: 'justify-center',
        right: 'justify-end',
        'space-between': 'justify-between',
    };

    return (
        <div
            className={`flex items-center gap-3 p-4 px-5 border-t border-default ${alignClasses[align]} ${className}`}
        >
            {children}
        </div>
    );
});

CardFooter.displayName = 'CardFooter';

CardFooter.propTypes = {
    children: PropTypes.node.isRequired,
    align: PropTypes.oneOf(['left', 'center', 'right', 'space-between']),
    className: PropTypes.string,
};
