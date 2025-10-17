import React from 'react';

/**
 * LogNumber - Renders numbers with distinct styling
 * @param {Object} props
 * @param {React.ReactNode} props.children - Numeric text
 * @returns {JSX.Element} Styled number span
 */
export const LogNumber = React.memo(({ children }) => {
    return <span className="text-info">{children}</span>;
});

LogNumber.displayName = 'LogNumber';
