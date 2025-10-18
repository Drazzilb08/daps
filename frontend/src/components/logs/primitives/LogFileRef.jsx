import React from 'react';

/**
 * LogFileRef - Renders file references in brackets with distinct styling
 * @param {Object} props
 * @param {React.ReactNode} props.children - File reference text (e.g., "[main.py]")
 * @returns {JSX.Element} Styled file reference span
 */
export const LogFileRef = React.memo(({ children }) => {
    return <span className="text-accent">{children}</span>;
});

LogFileRef.displayName = 'LogFileRef';
