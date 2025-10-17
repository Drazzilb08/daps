import React from 'react';
import PropTypes from 'prop-types';

/**
 * Reusable menu container component
 *
 * Container for menu items with proper ARIA semantics.
 * Can be used inside dropdowns or as standalone menus.
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - MenuItem components
 * @param {string} [props.className] - Additional CSS classes
 * @param {string} [props.ariaLabel] - ARIA label for the menu
 */
const Menu = ({ children, className = '', ariaLabel = 'Menu' }) => {
    const menuClassName = ['menu', 'flex flex-col gap-0', className].filter(Boolean).join(' ');

    return (
        <div className={menuClassName} role="menu" aria-label={ariaLabel}>
            {children}
        </div>
    );
};

Menu.propTypes = {
    children: PropTypes.node.isRequired,
    className: PropTypes.string,
    ariaLabel: PropTypes.string,
};

export default Menu;
