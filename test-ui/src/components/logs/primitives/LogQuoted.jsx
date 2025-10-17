import React from 'react';

/**
 * LogQuoted - Renders quoted strings with distinct styling
 * @param {Object} props
 * @param {React.ReactNode} props.children - Quoted text (includes quotes)
 * @returns {JSX.Element} Styled quoted text span
 *
 * Note: Uses .text-warning as fallback since .text-caution doesn't exist in test-ui utilities
 */
export const LogQuoted = React.memo(({ children }) => {
    return <span className="text-warning">{children}</span>;
});

LogQuoted.displayName = 'LogQuoted';
