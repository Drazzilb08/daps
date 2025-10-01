import React from 'react';
import PropTypes from 'prop-types';
import { ButtonBase, ButtonIcon } from './primitives';

/**
 * IconButton - Icon-only button composer
 *
 * Composes: ButtonBase + ButtonIcon
 *
 * @param {Object} props - Component props
 * @param {string} props.icon - Material Symbols icon name
 * @param {Function} props.onClick - Click handler
 * @param {string} props.variant - Button variant
 * @param {string} props.size - Button size
 * @param {boolean} props.disabled - Disabled state
 * @param {string} props['aria-label'] - Accessibility label (required for icon-only)
 * @param {string} props.className - Additional classes
 * @returns {JSX.Element}
 */
export const IconButton = React.memo(
    ({
        icon,
        onClick,
        variant = 'ghost',
        size = 'medium',
        disabled = false,
        'aria-label': ariaLabel,
        className = '',
        ...htmlButtonProps
    }) => {
        return (
            <ButtonBase
                onClick={onClick}
                variant={variant}
                size={size}
                disabled={disabled}
                aria-label={ariaLabel}
                className={`aspect-square ${className}`}
                {...htmlButtonProps}
            >
                <ButtonIcon icon={icon} size={size} aria-hidden="false" />
            </ButtonBase>
        );
    }
);

IconButton.displayName = 'IconButton';

IconButton.propTypes = {
    icon: PropTypes.string.isRequired,
    onClick: PropTypes.func,
    variant: PropTypes.oneOf(['primary', 'secondary', 'success', 'danger', 'ghost']),
    size: PropTypes.oneOf(['small', 'medium', 'large']),
    disabled: PropTypes.bool,
    'aria-label': PropTypes.string.isRequired,
    className: PropTypes.string,
};
