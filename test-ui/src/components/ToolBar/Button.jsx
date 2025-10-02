import React from 'react';
import PropTypes from 'prop-types';
import { ButtonBase, ButtonIcon, ButtonText, ButtonSpinner } from '../ui/button/primitives';

/**
 * ToolBarButton - Toolbar-specific button using primitive composition
 *
 * Composes Button primitives into toolbar-specific layout:
 * - Vertical flex layout (icon above text)
 * - Compact sizing (min-w-14, small text)
 * - Loading state with spinner
 *
 * This demonstrates primitive composition - all interaction logic,
 * disabled state, and styling comes from ButtonBase primitive.
 * Only toolbar-specific layout is defined here.
 *
 * Icon Size: Uses 'medium' (24px) following Material Design guidelines
 * for toolbar icons - ensures good visibility and touch interaction.
 *
 * @param {Object} props - Component props
 * @param {string} props.label - Button label text
 * @param {string} props.iconName - Material icon name
 * @param {string} [props.spinningName] - Icon to show when spinning (deprecated - use isSpinning)
 * @param {boolean} [props.isSpinning=false] - Loading/spinning state
 * @param {boolean} [props.isDisabled=false] - Disabled state
 * @param {Function} [props.onPress] - Click handler
 */
const Button = React.forwardRef(
    (
        {
            label,
            iconName,
            isSpinning = false,
            isDisabled = false,
            onPress,
            ...otherProps
        },
        ref
    ) => {
        return (
            <ButtonBase
                ref={ref}
                onClick={onPress}
                disabled={isDisabled || isSpinning}
                variant="ghost"
                className="flex-col min-w-14 py-1 px-2"
                aria-label={label}
                {...otherProps}
            >
                {isSpinning ? (
                    <ButtonSpinner size="medium" className="mb-1" />
                ) : (
                    <ButtonIcon icon={iconName} size="medium" className="mb-1" />
                )}
                <ButtonText className="text-xs h-5">{label}</ButtonText>
            </ButtonBase>
        );
    }
);

Button.displayName = 'ToolBarButton';

Button.propTypes = {
    label: PropTypes.string.isRequired,
    iconName: PropTypes.string.isRequired,
    isSpinning: PropTypes.bool,
    isDisabled: PropTypes.bool,
    onPress: PropTypes.func,
};

export default Button;
