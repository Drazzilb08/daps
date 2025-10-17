import React from 'react';
import PropTypes from 'prop-types';

/**
 * ButtonText - Text label primitive
 *
 * Responsibilities:
 * - Render button label text
 * - Proper typography and line height
 * - Text truncation for long labels
 * - Screen reader friendly text
 *
 * @param {Object} props - Component props
 * @param {ReactNode} props.children - Button label text
 * @param {boolean} props.truncate - Enable text truncation
 * @param {string} props.className - Additional CSS classes
 * @returns {JSX.Element}
 */
export const ButtonText = React.memo(({ children, truncate = false, className = '' }) => {
    // Build class names using utility classes only
    const textClasses = [
        'inline-block', // Display: inline-block
        'leading-normal', // Line height: normal
        truncate && 'overflow-hidden', // Truncation: hide overflow
        truncate && 'text-ellipsis', // Truncation: add ellipsis
        truncate && 'whitespace-nowrap', // Truncation: prevent wrapping
        className,
    ]
        .filter(Boolean)
        .join(' ');

    return <span className={textClasses}>{children}</span>;
});

ButtonText.displayName = 'ButtonText';

ButtonText.propTypes = {
    children: PropTypes.node.isRequired,
    truncate: PropTypes.bool,
    className: PropTypes.string,
};
