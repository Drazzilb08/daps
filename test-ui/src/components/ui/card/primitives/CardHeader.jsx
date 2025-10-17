import React from 'react';
import PropTypes from 'prop-types';

/**
 * CardHeader - Card header primitive
 *
 * Responsibilities:
 * - Card header container
 * - Title and subtitle layout
 * - Action slot for buttons/icons
 * - Proper semantic HTML (h3 for title)
 * - Theme-aware colors
 *
 * @param {Object} props - Component props
 * @param {string} props.title - Card title
 * @param {string} props.subtitle - Optional subtitle
 * @param {ReactNode} props.action - Optional action element (button/icon)
 * @param {string} props.className - Additional CSS classes
 * @returns {JSX.Element}
 */
export const CardHeader = React.memo(
    ({ title, subtitle = null, action = null, className = '' }) => {
        return (
            <div
                className={`flex items-start justify-between gap-4 p-4 px-5 border-b border-default ${className}`}
            >
                <div className="flex-1 min-w-0">
                    {title && (
                        <h3 className="m-0 text-lg font-semibold text-primary leading-snug">
                            {title}
                        </h3>
                    )}
                    {subtitle && (
                        <p className="mt-1 m-0 text-sm text-secondary leading-normal">{subtitle}</p>
                    )}
                </div>
                {action && <div className="flex-none">{action}</div>}
            </div>
        );
    }
);

CardHeader.displayName = 'CardHeader';

CardHeader.propTypes = {
    title: PropTypes.string.isRequired,
    subtitle: PropTypes.string,
    action: PropTypes.node,
    className: PropTypes.string,
};
