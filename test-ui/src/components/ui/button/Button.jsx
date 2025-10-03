import React from 'react';
import PropTypes from 'prop-types';
import { ButtonBase, ButtonIcon, ButtonText } from './primitives';

/**
 * Button - Standard button composer
 *
 * Composes: ButtonBase + ButtonIcon (optional) + ButtonText
 *
 * Supports all ButtonBase variants and utility overrides:
 * - Variants: primary, secondary, success, danger, ghost, warning, info, muted, surface
 * - Overrides: bgClass, textClass, sizeClass, hoverClass (for edge cases)
 *
 * @param {Object} props - Component props
 * @param {string} props.children - Button label text
 * @param {Function} props.onClick - Click handler
 * @param {string} props.variant - Button variant (see ButtonBase for full list)
 * @param {string} props.size - Button size (small, medium, large)
 * @param {string} props.bgClass - Background utility override (passed to ButtonBase)
 * @param {string} props.textClass - Text color utility override (passed to ButtonBase)
 * @param {string} props.sizeClass - Size utility override (passed to ButtonBase)
 * @param {string} props.hoverClass - Hover state utility override (passed to ButtonBase)
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
        bgClass = '',
        textClass = '',
        sizeClass = '',
        hoverClass = '',
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
                bgClass={bgClass}
                textClass={textClass}
                sizeClass={sizeClass}
                hoverClass={hoverClass}
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
    variant: PropTypes.oneOf([
        'primary',
        'secondary',
        'success',
        'danger',
        'ghost',
        'warning',
        'info',
        'muted',
        'surface',
    ]),
    size: PropTypes.oneOf(['small', 'medium', 'large']),
    bgClass: PropTypes.string,
    textClass: PropTypes.string,
    sizeClass: PropTypes.string,
    hoverClass: PropTypes.string,
    disabled: PropTypes.bool,
    fullWidth: PropTypes.bool,
    icon: PropTypes.string,
    iconPosition: PropTypes.oneOf(['left', 'right']),
    type: PropTypes.oneOf(['button', 'submit', 'reset']),
    className: PropTypes.string,
};
