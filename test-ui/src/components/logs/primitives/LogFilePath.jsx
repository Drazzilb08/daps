import React from 'react';

/**
 * LogFilePath - Renders file paths with distinct styling
 * @param {Object} props
 * @param {React.ReactNode} props.children - File path text
 * @returns {JSX.Element} Styled file path span
 */
export const LogFilePath = React.memo(({ children }) => {
    return <span className="text-info">{children}</span>;
});

LogFilePath.displayName = 'LogFilePath';
