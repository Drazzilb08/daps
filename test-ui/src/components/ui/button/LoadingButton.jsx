import React from 'react';
import PropTypes from 'prop-types';
import { ButtonBase, ButtonIcon, ButtonText, ButtonSpinner } from './primitives';

/**
 * LoadingButton - Button with loading state composer
 *
 * Composes: ButtonBase + ButtonIcon (optional) + ButtonText + ButtonSpinner (when loading)
 *
 * @param {Object} props - Component props
 * @param {string} props.children - Button label text
 * @param {Function} props.onClick - Click handler
 * @param {boolean} props.loading - Loading state
 * @param {string} props.loadingText - Text to show when loading
 * @param {string} props.variant - Button variant
 * @param {string} props.size - Button size
 * @param {boolean} props.disabled - Disabled state
 * @param {boolean} props.fullWidth - Full width button
 * @param {string} props.icon - Optional icon (hidden during loading)
 * @param {string} props.className - Additional classes
 * @returns {JSX.Element}
 */
export const LoadingButton = React.memo(
    ({
        children,
        onClick,
        loading = false,
        loadingText = 'Loading...',
        variant = 'primary',
        size = 'medium',
        disabled = false,
        fullWidth = false,
        icon = null,
        className = '',
        ...htmlButtonProps
    }) => {
        return (
            <ButtonBase
                onClick={onClick}
                variant={variant}
                size={size}
                disabled={disabled || loading}
                fullWidth={fullWidth}
                className={className}
                {...htmlButtonProps}
            >
                {loading ? (
                    <>
                        <ButtonSpinner size={size} />
                        <ButtonText>{loadingText}</ButtonText>
                    </>
                ) : (
                    <>
                        {icon && <ButtonIcon icon={icon} size={size} />}
                        <ButtonText>{children}</ButtonText>
                    </>
                )}
            </ButtonBase>
        );
    }
);

LoadingButton.displayName = 'LoadingButton';

LoadingButton.propTypes = {
    children: PropTypes.node.isRequired,
    onClick: PropTypes.func,
    loading: PropTypes.bool,
    loadingText: PropTypes.string,
    variant: PropTypes.oneOf(['primary', 'secondary', 'success', 'danger', 'ghost']),
    size: PropTypes.oneOf(['small', 'medium', 'large']),
    disabled: PropTypes.bool,
    fullWidth: PropTypes.bool,
    icon: PropTypes.string,
    className: PropTypes.string,
};
