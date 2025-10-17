import React from 'react';
import PropTypes from 'prop-types';

/**
 * Reusable menu item component
 *
 * Individual menu item with icon, label, and click handling.
 * Can be used in any menu context throughout the app.
 *
 * @param {Object} props - Component props
 * @param {string} props.label - Item label text
 * @param {string} [props.iconName] - Material Symbol icon name
 * @param {Function} [props.onPress] - Click handler for the item
 * @param {boolean} [props.isDisabled] - Whether item is disabled
 * @param {Function} [props.onClose] - Callback to close parent menu/dropdown
 * @param {string} [props.className] - Additional CSS classes
 */
const MenuItem = ({
    label,
    iconName,
    onPress,
    isDisabled = false,
    onClose,
    className = '',
    ...otherProps
}) => {
    const handleClick = event => {
        event.preventDefault();
        if (!isDisabled && onPress) {
            onPress();
            if (onClose) {
                onClose(); // Close parent menu after action
            }
        }
    };

    const handleKeyDown = event => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleClick(event);
        }
    };

    const itemClassName = [
        'flex items-center gap-2 py-2 px-3 touch-target bg-transparent text-secondary border-none rounded-sm cursor-pointer text-sm w-full text-left whitespace-nowrap',
        'transition-colors focus:outline-none active:text-primary md:text-base',
        isDisabled
            ? 'text-tertiary cursor-not-allowed hover:text-tertiary focus:text-tertiary active:text-tertiary'
            : 'hover:bg-surface-hover focus:bg-surface-hover menu-item-focus',
        className,
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <div
            className={itemClassName}
            role="menuitem"
            tabIndex={isDisabled ? -1 : 0}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            aria-disabled={isDisabled}
            {...otherProps}
        >
            {iconName && (
                <span
                    className="material-symbols-outlined flex-shrink-0 icon-md flex items-center justify-center"
                    aria-hidden="true"
                >
                    {iconName}
                </span>
            )}
            <span className="flex-1 min-w-0 text-ellipsis">{label}</span>
        </div>
    );
};

MenuItem.propTypes = {
    label: PropTypes.string.isRequired,
    iconName: PropTypes.string,
    onPress: PropTypes.func,
    isDisabled: PropTypes.bool,
    onClose: PropTypes.func,
    className: PropTypes.string,
};

export default MenuItem;
