import React, { useState } from 'react';
import PropTypes from 'prop-types';

/**
 * Button Primitive Component
 *
 * Universal button component following atomic primitive composition pattern.
 * Manages structure, hover effects, and accessibility while allowing caller control
 * of color, size, and behavior.
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Button content
 * @param {string} [props.color="primary"] - Theme color (primary|success|error|info|warning|accent|surface)
 * @param {string} [props.size="medium"] - Size variant (small|medium|large)
 * @param {Function} [props.onClick] - Click handler
 * @param {boolean} [props.disabled=false] - Disabled state
 * @param {string} [props.type="button"] - Button type
 * @param {string} [props.className=""] - Additional CSS classes
 * @param {...Object} props - Additional button props
 */
export const Button = ({
    children,
    color = 'primary',
    size = 'medium',
    onClick,
    disabled = false,
    type = 'button',
    className = '',
    ...buttonProps
}) => {
    const [isHovered, setIsHovered] = useState(false);

    // Color mapping: theme color → background + text color
    const colorMap = {
        primary: { bg: 'var(--primary)', text: 'var(--on-color-text)' },
        success: { bg: 'var(--success)', text: 'var(--on-color-text)' },
        error: { bg: 'var(--error)', text: 'var(--on-color-text)' },
        info: { bg: 'var(--info)', text: 'var(--on-color-text)' },
        warning: { bg: 'var(--warning)', text: 'var(--on-color-text)' },
        accent: { bg: 'var(--accent)', text: 'var(--on-color-text)' },
        surface: { bg: 'var(--surface)', text: 'var(--text-primary)' },
    };

    // Size mapping: size → utility classes
    const sizeMap = {
        small: 'min-h-9 px-3 py-1.5 text-sm', // 36px height (fallback for non-primary actions)
        medium: 'min-h-11 px-4 py-2 text-base', // 44px height (WCAG compliant - default)
        large: 'min-h-12 px-5 py-2.5 text-lg', // 48px height (prominent actions)
    };

    const colors = colorMap[color] || colorMap.primary;
    const sizeClasses = sizeMap[size] || sizeMap.medium;

    // Inline styles for theme colors with hover opacity
    const buttonStyle = {
        backgroundColor: colors.bg,
        color: colors.text,
        opacity: disabled ? 0.5 : isHovered ? 0.85 : 1,
    };

    // Base utility classes (structure, layout, transitions)
    const baseClasses = `
        ${sizeClasses}
        rounded-md
        border border-transparent
        cursor-pointer
        select-none
        inline-flex items-center justify-center
        transition-opacity duration-200
        focus:outline-none focus:ring-2 focus:ring-offset-2
        disabled:cursor-not-allowed
        leading-none
        whitespace-nowrap
    `
        .trim()
        .replace(/\s+/g, ' ');

    const combinedClassName = `${baseClasses} ${className}`.trim();

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={buttonStyle}
            className={combinedClassName}
            {...buttonProps}
        >
            {children}
        </button>
    );
};

Button.propTypes = {
    children: PropTypes.node.isRequired,
    color: PropTypes.oneOf(['primary', 'success', 'error', 'info', 'warning', 'accent', 'surface']),
    size: PropTypes.oneOf(['small', 'medium', 'large']),
    onClick: PropTypes.func,
    disabled: PropTypes.bool,
    type: PropTypes.oneOf(['button', 'submit', 'reset']),
    className: PropTypes.string,
};

Button.displayName = 'Button';
