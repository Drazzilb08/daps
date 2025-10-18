import React from 'react';

// Pre-compute level color map for performance
const LEVEL_COLORS = {
    CRITICAL: 'text-error',
    ERROR: 'text-error',
    WARNING: 'text-warning',
    INFO: 'text-info',
    DEBUG: 'text-secondary',
};

/**
 * LogLevel - Renders log level with semantic color
 * @param {Object} props
 * @param {'CRITICAL'|'ERROR'|'WARNING'|'INFO'|'DEBUG'} props.level - Log level
 * @param {React.ReactNode} props.children - Level text
 * @returns {JSX.Element} Styled log level span
 */
export const LogLevel = React.memo(({ level, children }) => {
    const colorClass = LEVEL_COLORS[level] || 'text-primary';
    return <span className={colorClass}>{children}</span>;
});

LogLevel.displayName = 'LogLevel';
