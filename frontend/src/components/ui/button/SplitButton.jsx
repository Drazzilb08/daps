import React, { useState, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Button } from './Button';
import { IconButton } from './IconButton';

/**
 * SplitButton - Compound button with dropdown
 *
 * Composes: Button + IconButton + Dropdown menu
 *
 * @param {Object} props - Component props
 * @param {string} props.children - Primary button label
 * @param {Function} props.onClick - Primary action handler
 * @param {Array} props.options - Dropdown options [{label, icon, onClick}]
 * @param {string} props.variant - Button variant
 * @param {string} props.size - Button size
 * @param {boolean} props.disabled - Disabled state
 * @param {string} props.icon - Primary button icon
 * @returns {JSX.Element}
 */
export const SplitButton = React.memo(
    ({
        children,
        onClick,
        options = [],
        variant = 'primary',
        size = 'medium',
        disabled = false,
        icon = null,
    }) => {
        const [isOpen, setIsOpen] = useState(false);
        const dropdownRef = useRef(null);

        const handleToggle = useCallback(() => {
            setIsOpen(prev => !prev);
        }, []);

        const handleOptionClick = useCallback(optionOnClick => {
            optionOnClick();
            setIsOpen(false);
        }, []);

        return (
            <div className="split-button" ref={dropdownRef}>
                <div className="split-button__group">
                    <Button
                        onClick={onClick}
                        variant={variant}
                        size={size}
                        disabled={disabled}
                        icon={icon}
                        className="split-button__primary"
                    >
                        {children}
                    </Button>
                    <IconButton
                        icon={isOpen ? 'expand_less' : 'expand_more'}
                        variant={variant}
                        size={size}
                        disabled={disabled}
                        onClick={handleToggle}
                        aria-label="Show more options"
                        aria-expanded={isOpen}
                        aria-haspopup="true"
                        className="split-button__toggle"
                    />
                </div>

                {isOpen && options.length > 0 && (
                    <div className="split-button__dropdown" role="menu">
                        {options.map((option, index) => (
                            <button
                                key={index}
                                className="split-button__option"
                                onClick={() => handleOptionClick(option.onClick)}
                                role="menuitem"
                            >
                                {option.icon && (
                                    <span className="material-symbols-outlined">{option.icon}</span>
                                )}
                                <span>{option.label}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        );
    }
);

SplitButton.displayName = 'SplitButton';

SplitButton.propTypes = {
    children: PropTypes.node.isRequired,
    onClick: PropTypes.func.isRequired,
    options: PropTypes.arrayOf(
        PropTypes.shape({
            label: PropTypes.string.isRequired,
            icon: PropTypes.string,
            onClick: PropTypes.func.isRequired,
        })
    ),
    variant: PropTypes.oneOf(['primary', 'secondary', 'success', 'danger', 'ghost']),
    size: PropTypes.oneOf(['small', 'medium', 'large']),
    disabled: PropTypes.bool,
    icon: PropTypes.string,
};
