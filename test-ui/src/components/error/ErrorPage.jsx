import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';

/**
 * Dedicated Error Page Component - Ported from Main UI
 * 
 * Professional error page for 404s, route errors, and other application-level errors.
 * Provides clear messaging, navigation options, and helpful recovery actions.
 * 
 * @param {Object} props - Component props
 * @param {number} [props.statusCode=404] - HTTP status code
 * @param {string} [props.title] - Custom error title
 * @param {string} [props.message] - Custom error message
 * @param {string} [props.description] - Additional error description
 * @param {boolean} [props.showHome=true] - Show home navigation button
 * @param {boolean} [props.showBack=true] - Show back navigation button
 * @param {boolean} [props.showRefresh=false] - Show refresh button
 * @param {Array} [props.suggestions] - Array of suggestion strings
 */
const ErrorPage = ({
    statusCode = 404,
    title,
    message,
    description,
    showHome = true,
    showBack = true,
    showRefresh = false,
    suggestions = []
}) => {
    // Default content based on status code
    const getDefaultContent = (code) => {
        switch (code) {
            case 404:
                return {
                    title: 'Page Not Found',
                    message: 'The page you are looking for does not exist.',
                    description: 'The URL you entered may be incorrect, or the page may have been moved or removed.',
                    suggestions: [
                        'Check the URL for typos',
                        'Use the navigation to find what you need',
                        'Go back to the previous page',
                        'Start over from the homepage'
                    ]
                };
            case 500:
                return {
                    title: 'Server Error',
                    message: 'Something went wrong on our end.',
                    description: 'We are experiencing technical difficulties. Please try again in a few moments.',
                    suggestions: [
                        'Try refreshing the page',
                        'Wait a few minutes and try again',
                        'Go back to the previous page',
                        'Contact support if the problem persists'
                    ]
                };
            case 403:
                return {
                    title: 'Access Denied',
                    message: 'You do not have permission to view this page.',
                    description: 'This content is restricted or requires different access permissions.',
                    suggestions: [
                        'Check if you are logged in correctly',
                        'Contact an administrator for access',
                        'Go back to a page you have access to',
                        'Return to the homepage'
                    ]
                };
            default:
                return {
                    title: 'Error',
                    message: 'An unexpected error occurred.',
                    description: 'We apologize for the inconvenience.',
                    suggestions: [
                        'Try refreshing the page',
                        'Go back to the previous page',
                        'Return to the homepage'
                    ]
                };
        }
    };

    const defaults = getDefaultContent(statusCode);
    const finalTitle = title || defaults.title;
    const finalMessage = message || defaults.message;
    const finalDescription = description || defaults.description;
    const finalSuggestions = suggestions.length > 0 ? suggestions : defaults.suggestions;

    const getStatusIcon = (code) => {
        switch (code) {
            case 404:
                return '🔍';
            case 500:
                return '🔧';
            case 403:
                return '🔒';
            default:
                return '⚠️';
        }
    };

    const handleBack = () => {
        if (window.history.length > 1) {
            window.history.back();
        } else {
            window.location.href = '/';
        }
    };

    const handleRefresh = () => {
        window.location.reload();
    };

    return (
        <div className="page-error-boundary">
            <div className="page-error-boundary__container">
                <div className="page-error-boundary__header">
                    <div className="page-error-boundary__icon">
                        {getStatusIcon(statusCode)}
                    </div>
                    <h1 className="page-error-boundary__title">
                        {statusCode} - {finalTitle}
                    </h1>
                    <p className="page-error-boundary__subtitle">
                        {finalMessage}
                    </p>
                </div>

                <div className="page-error-boundary__content">
                    {finalDescription && (
                        <div className="page-error-boundary__description">
                            <p>{finalDescription}</p>
                        </div>
                    )}

                    <div className="page-error-boundary__actions">
                        {showHome && (
                            <Link
                                to="/"
                                className="btn btn--primary"
                            >
                                <span className="page-error-boundary__button-icon">🏠</span>
                                Go Home
                            </Link>
                        )}

                        {showBack && (
                            <button
                                onClick={handleBack}
                                className="btn btn--secondary"
                                type="button"
                            >
                                <span className="page-error-boundary__button-icon">←</span>
                                Go Back
                            </button>
                        )}

                        {showRefresh && (
                            <button
                                onClick={handleRefresh}
                                className="btn btn--ghost"
                                type="button"
                            >
                                <span className="page-error-boundary__button-icon">🔄</span>
                                Refresh
                            </button>
                        )}
                    </div>

                    {finalSuggestions.length > 0 && (
                        <div className="page-error-boundary__help">
                            <div className="page-error-boundary__help-box">
                                <h4 className="page-error-boundary__help-title">
                                    What can I do?
                                </h4>
                                <ul className="page-error-boundary__help-list">
                                    {finalSuggestions.map((suggestion, index) => (
                                        <li key={index}>{suggestion}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}
                </div>

                <div className="page-error-boundary__footer">
                    <p className="page-error-boundary__footer-text">
                        {statusCode === 404 
                            ? 'If you believe this page should exist, please check the URL or contact support.'
                            : 'If this error persists, please contact support for assistance.'
                        }
                    </p>
                </div>
            </div>
        </div>
    );
};

ErrorPage.propTypes = {
    statusCode: PropTypes.number,
    title: PropTypes.string,
    message: PropTypes.string,
    description: PropTypes.string,
    showHome: PropTypes.bool,
    showBack: PropTypes.bool,
    showRefresh: PropTypes.bool,
    suggestions: PropTypes.arrayOf(PropTypes.string)
};

export default ErrorPage;

// Export convenience components for common error types
export const NotFoundPage = (props) => (
    <ErrorPage statusCode={404} {...props} />
);

export const ServerErrorPage = (props) => (
    <ErrorPage statusCode={500} showRefresh={true} {...props} />
);

export const ForbiddenPage = (props) => (
    <ErrorPage statusCode={403} {...props} />
);