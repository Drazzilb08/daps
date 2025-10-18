import React from 'react';

/**
 * LogUrl - Renders URLs with link styling and makes them clickable
 * @param {Object} props
 * @param {React.ReactNode} props.children - URL text
 * @returns {JSX.Element} Styled and clickable URL link
 */
export const LogUrl = React.memo(({ children }) => {
    const url = typeof children === 'string' ? children : String(children);
    return (
        <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-link hover:text-link-hover underline cursor-pointer"
        >
            {children}
        </a>
    );
});

LogUrl.displayName = 'LogUrl';
