import React from 'react';
import PropTypes from 'prop-types';

/**
 * Animated hamburger menu button component
 *
 * Features:
 * - Smooth SVG path animation between states
 * - WCAG 2.1 AA compliant touch target (44px)
 * - Proper ARIA attributes for accessibility
 * - Customizable through CSS custom properties
 * - Mobile-first responsive design
 *
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Whether the menu is open
 * @param {Function} props.onClick - Click handler
 * @param {string} [props.className] - Additional CSS classes
 * @param {string} [props.ariaLabel='Main Menu'] - ARIA label for accessibility
 * @param {boolean} [props.disabled=false] - Whether the button is disabled
 */
const HamburgerButton = React.memo(
    ({ isOpen, onClick, className = '', ariaLabel = 'Main Menu', disabled = false }) => {
        /**
         * Handle button click
         * @param {Event} event - Click event
         */
        const handleClick = React.useCallback(
            event => {
                if (disabled) return;
                onClick?.(event);
            },
            [onClick, disabled]
        );

        const buttonClasses = [
            // Core hamburger classes (for animation)
            'hamburger',
            'hamburger-menu',
            isOpen ? 'opened' : '',
            disabled ? 'disabled' : '',
            // Utility classes for layout and styling
            'hidden', // Hidden by default, shown on mobile via CSS
            'items-center',
            'justify-center',
            'cursor-pointer',
            'border-none',
            'p-1',
            'rounded-sm',
            'transition-fast',
            'size-touch', // Width and height: 44px
            'bg-transparent', // Background: transparent
            // Custom className override
            className,
        ]
            .filter(Boolean)
            .join(' ');

        return (
            <button
                className={buttonClasses}
                aria-label={ariaLabel}
                aria-expanded={isOpen}
                disabled={disabled}
                onClick={handleClick}
                type="button"
            >
                <svg width="44" height="44" viewBox="0 0 100 100" aria-hidden="true">
                    <path
                        className="line line1"
                        d="M 20,29.000046 H 80.000231 C 80.000231,29.000046 94.498839,28.817352 94.532987,66.711331 94.543142,77.980673 90.966081,81.670246 85.259173,81.668997 79.552261,81.667751 75.000211,74.999942 75.000211,74.999942 L 25.000021,25.000058"
                    />
                    <path className="line line2" d="M 20,50 H 80" />
                    <path
                        className="line line3"
                        d="M 20,70.999954 H 80.000231 C 80.000231,70.999954 94.498839,71.182648 94.532987,33.288669 94.543142,22.019327 90.966081,18.329754 85.259173,18.331003 79.552261,18.332249 75.000211,25.000058 75.000211,25.000058 L 25.000021,74.999942"
                    />
                </svg>
            </button>
        );
    }
);

HamburgerButton.displayName = 'HamburgerButton';

HamburgerButton.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClick: PropTypes.func,
    className: PropTypes.string,
    ariaLabel: PropTypes.string,
    disabled: PropTypes.bool,
};

export default HamburgerButton;
