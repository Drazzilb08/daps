import React from 'react';

/**
 * LogDateTime - Renders datetime with distinct styling
 * @param {Object} props
 * @param {React.ReactNode} props.children - Datetime text
 * @returns {JSX.Element} Styled datetime span
 */
export const LogDateTime = React.memo(({ children }) => {
    return <span className="text-success">{children}</span>;
});

LogDateTime.displayName = 'LogDateTime';
