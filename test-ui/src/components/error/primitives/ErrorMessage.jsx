import React from 'react';
import PropTypes from 'prop-types';

/**
 * ErrorMessage - Formatted error content display
 *
 * Displays error information with two layout modes:
 * - Page: Full error details with title, description, component stack, retry count, timestamp
 * - Inline: Compact error message with retry attempt count
 *
 * @param {Object} props
 * @param {string} props.title - Error title
 * @param {string} props.description - Error description (optional)
 * @param {string} props.message - Error message
 * @param {string} props.componentStack - Component stack trace (optional)
 * @param {number} props.retryCount - Number of retry attempts (optional)
 * @param {string} props.errorTimestamp - ISO timestamp (optional)
 * @param {'page'|'inline'} props.mode - Display mode
 */
export const ErrorMessage = ({
    title,
    description,
    message,
    componentStack,
    retryCount = 0,
    errorTimestamp,
    mode = 'page',
}) => {
    if (mode === 'page') {
        return (
            <>
                <div className="text-center mb-8">
                    <h1 className="text-error text-3xl font-bold m-0 mb-2 leading-tight">
                        {title}
                    </h1>
                    <p className="text-secondary text-lg leading-relaxed">{description}</p>
                </div>

                <div className="text-primary">
                    {description && (
                        <div className="bg-surface-alt rounded-md p-4 mb-6">
                            <p className="text-base leading-relaxed">{description}</p>
                        </div>
                    )}

                    <div className="bg-surface-variant border border-border rounded-md p-4 mb-6">
                        <h3 className="text-primary text-xl font-semibold m-0 mb-3">
                            Error Details
                        </h3>
                        <div className="mb-2 text-sm font-mono break-words">
                            <strong>Error:</strong> {message || 'Unknown error'}
                        </div>
                        <div className="mb-2 text-sm font-mono break-words">
                            <strong>Component Stack:</strong>{' '}
                            {componentStack?.split('\n').slice(0, 3).join('\n') || 'Not available'}
                        </div>
                        {retryCount > 0 && (
                            <div className="mb-2 text-sm font-mono break-words">
                                <strong>Retry Count:</strong> {retryCount}
                            </div>
                        )}
                        <div className="mb-0 text-sm font-mono break-words">
                            <strong>Time:</strong>{' '}
                            {errorTimestamp ? new Date(errorTimestamp).toLocaleString() : 'Unknown'}
                        </div>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <div className="mb-4 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                    <h3 className="text-error text-lg font-semibold m-0 mb-1 leading-tight">
                        {title}
                    </h3>
                    {description && (
                        <p className="text-secondary text-sm leading-relaxed">{description}</p>
                    )}
                </div>
            </div>

            <div className="text-primary">
                <div className="bg-surface-variant border border-error p-3 mb-4 text-sm break-words">
                    <strong>Error:</strong> {message || 'Component failed to render'}
                    {retryCount > 0 && (
                        <span className="text-secondary font-normal">
                            {' '}
                            (Attempt {retryCount + 1})
                        </span>
                    )}
                </div>
            </div>
        </>
    );
};

ErrorMessage.propTypes = {
    title: PropTypes.string.isRequired,
    description: PropTypes.string,
    message: PropTypes.string,
    componentStack: PropTypes.string,
    retryCount: PropTypes.number,
    errorTimestamp: PropTypes.string,
    mode: PropTypes.oneOf(['page', 'inline']),
};
