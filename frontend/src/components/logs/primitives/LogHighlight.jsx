import React from 'react';

/**
 * LogHighlight - Highlights search matches
 * @param {Object} props
 * @param {React.ReactNode} props.children - Matched text
 * @returns {JSX.Element} Highlighted search match
 *
 * Utility composition:
 * - .bg-warning/30 - Semi-transparent yellow background (30% opacity)
 * - .rounded-sm - 4px border radius
 * - .px-1 - Horizontal padding (0.25rem = 4px)
 */
export const LogHighlight = React.memo(({ children }) => {
    return <mark className="bg-warning/30 rounded-sm px-1">{children}</mark>;
});

LogHighlight.displayName = 'LogHighlight';
