import React from 'react';
import PropTypes from 'prop-types';

/**
 * Button - Generic toolbar button component
 *
 * Individual toolbar button with icon, label, and state management.
 * Supports disabled, loading states and click handling.
 * This is a reusable component that can be used in any toolbar context.
 *
 * @param {Object} props - Component props
 * @param {string} props.label - Button label text
 * @param {string} props.iconName - Material icon name
 * @param {string} [props.spinningName] - Icon to show when spinning
 * @param {boolean} [props.isSpinning=false] - Loading/spinning state
 * @param {boolean} [props.isDisabled=false] - Disabled state
 * @param {Function} [props.onPress] - Click handler
 * @param {React.ComponentType} [props.overflowComponent] - Overflow menu component
 */
const Button = React.forwardRef(
    (
        {
            label,
            iconName,
            spinningName,
            isSpinning = false,
            isDisabled = false,
            onPress,
            overflowComponent: OverflowComponent,
            ...otherProps
        },
        ref
    ) => {
        const handleClick = event => {
            if (isDisabled || isSpinning) {
                event.preventDefault();
                return;
            }
            if (onPress) {
                onPress(event);
            }
        };

        const buttonClassName = [
            // Replaced page-toolbar-button with utilities:
            'flex',
            'flex-col',
            'items-center',
            'justify-center',
            'min-w-14',
            'w-auto',
            'flex-shrink-0',
            'py-1',
            'px-2',
            'bg-transparent',
            'border-none',
            'text-primary',
            'text-center',
            'cursor-pointer',
            'rounded-sm',
            'transition-fast',
            'touch-target',
            'transition-colors',
            'hover:text-primary',
            'hover:bg-surface-alt',
            'focus:outline-none',
            'focus:border-primary',
            'focus:shadow-focus',
            // btn class removed - now using atomic utilities
            isDisabled && 'opacity-60',
            isDisabled && 'cursor-not-allowed',
            isDisabled && 'pointer-events-none',
            isSpinning && 'pointer-events-none',
        ]
            .filter(Boolean)
            .join(' ');

        const displayIcon = isSpinning && spinningName ? spinningName : iconName;

        return (
            <button
                ref={ref}
                className={buttonClassName}
                onClick={handleClick}
                disabled={isDisabled || isSpinning}
                aria-label={label}
                {...otherProps}
            >
                <span
                    className={`material-symbols-outlined text-base leading-none mb-1 ${isSpinning ? 'spinning' : ''}`}
                >
                    {displayIcon}
                </span>
                <div className="flex items-center justify-center overflow-hidden h-5 w-full">
                    <div className="px-1 py-0 text-inherit text-xs leading-none whitespace-nowrap">
                        {label}
                    </div>
                </div>
                {OverflowComponent && <OverflowComponent />}
            </button>
        );
    }
);

Button.displayName = 'Button';

Button.propTypes = {
    label: PropTypes.string.isRequired,
    iconName: PropTypes.string.isRequired,
    spinningName: PropTypes.string,
    isSpinning: PropTypes.bool,
    isDisabled: PropTypes.bool,
    onPress: PropTypes.func,
    overflowComponent: PropTypes.elementType,
};

export default Button;
