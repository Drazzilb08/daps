import React, { useRef, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useToolBar } from './ToolBarContext.jsx';
import Button from './Button.jsx';
import Dropdown from '../ui/Dropdown.jsx';
import Menu from '../ui/Menu.jsx';
import MenuItem from '../ui/MenuItem.jsx';

/**
 * ToolBar.Overflow - Dedicated overflow menu component
 *
 * Renders overflow menu toggle button and dropdown menu.
 * Automatically integrates with ToolBarContext for overflow state.
 *
 * Mobile: Full-width bottom sheet
 * Desktop: Dropdown positioned menu
 *
 * @param {Object} props - Component props
 * @param {string} [props.position='right'] - Menu position ('left' | 'right')
 * @param {string} [props.menuIcon='more_vert'] - Icon for overflow button
 * @param {Array} [props.overflowButtons=[]] - Override overflow buttons from context
 * @param {Function} [props.onItemClick] - Custom item click handler
 */
const Overflow = ({
    position = 'right',
    menuIcon = 'more_vert',
    overflowButtons = null,
    onItemClick,
}) => {
    const overflowButtonRef = useRef(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const { mobileMenuOpen, toggleMobileMenu, isMobile } = useToolBar();

    // Use provided overflow buttons or default to empty array
    const buttons = overflowButtons || [];

    const handleMenuToggle = () => {
        if (isMobile) {
            toggleMobileMenu();
        } else {
            setIsMenuOpen(!isMenuOpen);
        }
    };

    const handleMenuClose = React.useCallback(() => {
        if (isMobile) {
            toggleMobileMenu();
        } else {
            setIsMenuOpen(false);
        }
    }, [isMobile, toggleMobileMenu]);

    const handleItemClick = (button, event) => {
        if (onItemClick) {
            onItemClick(button, event);
        } else if (button.onPress) {
            button.onPress(event);
        }
        handleMenuClose();
    };

    // Close menu on Escape key
    useEffect(() => {
        const handleEscape = e => {
            if (e.key === 'Escape' && (isMenuOpen || mobileMenuOpen)) {
                handleMenuClose();
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isMenuOpen, mobileMenuOpen, handleMenuClose]);

    // Close menu on outside click
    useEffect(() => {
        if (!isMenuOpen && !mobileMenuOpen) return;

        const handleClickOutside = event => {
            if (overflowButtonRef.current && !overflowButtonRef.current.contains(event.target)) {
                handleMenuClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isMenuOpen, mobileMenuOpen, handleMenuClose]);

    // Don't render if no overflow buttons
    if (buttons.length === 0) {
        return null;
    }

    const dropdownPlacement = position === 'left' ? 'bottom-left' : 'bottom-right';

    return (
        <>
            <Button
                ref={overflowButtonRef}
                label={isMobile ? 'Menu' : `More (${buttons.length})`}
                iconName={menuIcon}
                onPress={handleMenuToggle}
                aria-expanded={isMobile ? mobileMenuOpen : isMenuOpen}
                aria-haspopup="menu"
                aria-label={`Show ${buttons.length} more actions`}
            />
            <Dropdown
                isOpen={isMobile ? mobileMenuOpen : isMenuOpen}
                onClose={handleMenuClose}
                anchorRef={overflowButtonRef}
                placement={dropdownPlacement}
                className={isMobile ? 'w-full' : 'max-w-dropdown'}
            >
                <Menu ariaLabel="Overflow actions">
                    {buttons.map((button, index) => (
                        <MenuItem
                            key={button.key || `overflow-${index}`}
                            label={button.label}
                            iconName={button.iconName}
                            onPress={event => handleItemClick(button, event)}
                            isDisabled={button.isDisabled}
                            onClose={handleMenuClose}
                        />
                    ))}
                </Menu>
            </Dropdown>
        </>
    );
};

Overflow.propTypes = {
    position: PropTypes.oneOf(['left', 'right']),
    menuIcon: PropTypes.string,
    overflowButtons: PropTypes.arrayOf(
        PropTypes.shape({
            key: PropTypes.string,
            label: PropTypes.string.isRequired,
            iconName: PropTypes.string,
            onPress: PropTypes.func,
            isDisabled: PropTypes.bool,
        })
    ),
    onItemClick: PropTypes.func,
};

export default Overflow;
