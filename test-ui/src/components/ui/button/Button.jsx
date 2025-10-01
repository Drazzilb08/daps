import React from 'react';
import PropTypes from 'prop-types';
import { ButtonBase, ButtonIcon, ButtonText } from './primitives';

/**
 * Button - Standard button composer
 *
 * Composes: ButtonBase + ButtonIcon (optional) + ButtonText
 *
 * @param {Object} props - Component props
 * @param {string} props.children - Button label text
 * @param {Function} props.onClick - Click handler
 * @param {string} props.variant - Button variant
 * @param {string} props.size - Button size
 * @param {boolean} props.disabled - Disabled state
 * @param {boolean} props.fullWidth - Full width button
 * @param {string} props.icon - Optional Material Symbols icon
 * @param {string} props.iconPosition - Icon position (left or right)
 * @param {string} props.type - Button type
 * @param {string} props.className - Additional classes
 * @returns {JSX.Element}
 */
export const Button = React.memo(
    ({
        children,
        onClick,
        variant = 'primary',
        size = 'medium',
        disabled = false,
        fullWidth = false,
        icon = null,
        iconPosition = 'left',
        type = 'button',
        className = '',
        ...htmlButtonProps
    }) => {
        return (
            <ButtonBase
                onClick={onClick}
                variant={variant}
                size={size}
                disabled={disabled}
                fullWidth={fullWidth}
                type={type}
                className={className}
                {...htmlButtonProps}
            >
                {icon && iconPosition === 'left' && <ButtonIcon icon={icon} size={size} />}
                <ButtonText>{children}</ButtonText>
                {icon && iconPosition === 'right' && <ButtonIcon icon={icon} size={size} />}
            </ButtonBase>
        );
    }
);

Button.displayName = 'Button';

Button.propTypes = {
    children: PropTypes.node.isRequired,
    onClick: PropTypes.func,
    variant: PropTypes.oneOf(['primary', 'secondary', 'success', 'danger', 'ghost']),
    size: PropTypes.oneOf(['small', 'medium', 'large']),
    disabled: PropTypes.bool,
    fullWidth: PropTypes.bool,
    icon: PropTypes.string,
    iconPosition: PropTypes.oneOf(['left', 'right']),
    type: PropTypes.oneOf(['button', 'submit', 'reset']),
    className: PropTypes.string,
};
