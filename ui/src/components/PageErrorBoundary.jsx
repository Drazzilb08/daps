import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { useGlobalError } from './providers/GlobalErrorProvider';

/**
 * Page-level Error Boundary for route protection
 *
 * Specialized error boundary designed to wrap entire page routes. Provides
 * page-specific error handling with navigation recovery options and integration
 * with the existing GlobalErrorProvider system.
 *
 * @param {Object} props - Component props
 * @param {string} props.pageName - Name of the page for error context
 * @param {string} [props.pageDescription] - Brief description of page functionality
 * @param {Function} [props.onError] - Callback when error occurs (error, errorInfo) => void
 * @param {Function} [props.onNavigateHome] - Custom navigation handler for home button
 * @param {Function} [props.onNavigateBack] - Custom navigation handler for back button
 * @param {boolean} [props.showNavigation=true] - Whether to show navigation buttons
 * @param {boolean} [props.showRetry=true] - Whether to show retry button
 * @param {React.ReactNode} props.children - Child components (page content) to protect
 *
 * @example
 * // Basic page protection
 * <PageErrorBoundary pageName="Search" pageDescription="Media search and filtering">
 *   <SearchPage />
 * </PageErrorBoundary>
 *
 * @example
 * // With custom navigation
 * <PageErrorBoundary
 *   pageName="Settings"
 *   onNavigateHome={() => navigate('/')}
 *   onNavigateBack={() => navigate(-1)}
 * >
 *   <SettingsPage />
 * </PageErrorBoundary>
 */
class PageErrorBoundaryBase extends Component {
    constructor(props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
            retryCount: 0,
            errorTimestamp: null,
        };
    }

    static getDerivedStateFromError(error) {
        return {
            hasError: true,
            error,
            errorTimestamp: new Date().toISOString(),
        };
    }

    componentDidCatch(error, errorInfo) {
        const { onError, pageName, reportError } = this.props;

        this.setState({ errorInfo });

        // Enhanced page error context
        const errorContext = {
            context: `Page: ${pageName}`,
            errorInfo,
            retryCount: this.state.retryCount,
            component: 'PageErrorBoundary',
            page: pageName,
            url: window.location.href,
            userAgent: navigator.userAgent,
            viewport: `${window.innerWidth}x${window.innerHeight}`,
            timestamp: new Date().toISOString(),
        };

        // Report to GlobalErrorProvider if available
        if (reportError) {
            reportError(error, errorContext);
        }

        // Call custom error handler
        if (onError) {
            onError(error, errorInfo);
        }

        // Enhanced console logging for development
        console.group(`🚨 PAGE ERROR: ${pageName}`);
        console.error('Page:', pageName);
        console.error('Error:', error);
        console.error('Error Info:', errorInfo);
        console.error('Context:', errorContext);
        console.groupEnd();
    }

    handleRetry = () => {
        this.setState(prevState => ({
            hasError: false,
            error: null,
            errorInfo: null,
            retryCount: prevState.retryCount + 1,
            errorTimestamp: null,
        }));
    };

    handleNavigateHome = () => {
        const { onNavigateHome } = this.props;
        if (onNavigateHome) {
            onNavigateHome();
        } else {
            // Default navigation to home
            window.location.href = '/';
        }
    };

    handleNavigateBack = () => {
        const { onNavigateBack } = this.props;
        if (onNavigateBack) {
            onNavigateBack();
        } else {
            // Default browser back navigation
            if (window.history.length > 1) {
                window.history.back();
            } else {
                this.handleNavigateHome();
            }
        }
    };

    handleReload = () => {
        window.location.reload();
    };

    render() {
        const { hasError, error, retryCount, errorTimestamp } = this.state;
        const {
            pageName,
            pageDescription,
            showNavigation = true,
            showRetry = true,
            children,
        } = this.props;

        if (hasError) {
            return (
                <div className="page-error-boundary">
                    <div className="page-error-boundary__container">
                        <div className="page-error-boundary__header">
                            <div className="page-error-boundary__icon">🔧</div>
                            <h1 className="page-error-boundary__title">{pageName} Page Error</h1>
                            <p className="page-error-boundary__subtitle">
                                This page encountered an error, but other parts of DAPS are still
                                working
                            </p>
                        </div>

                        <div className="page-error-boundary__content">
                            {pageDescription && (
                                <div className="page-error-boundary__description">
                                    <p>
                                        <strong>About this page:</strong> {pageDescription}
                                    </p>
                                </div>
                            )}

                            <div className="page-error-boundary__error-details">
                                <h3 className="page-error-boundary__error-title">Error Details</h3>
                                <div className="page-error-boundary__error-message">
                                    <strong>Type:</strong> {error?.name || 'Unknown Error'}
                                </div>
                                <div className="page-error-boundary__error-message">
                                    <strong>Message:</strong>{' '}
                                    {error?.message || 'An unexpected error occurred'}
                                </div>
                                {retryCount > 0 && (
                                    <div className="page-error-boundary__retry-info">
                                        <strong>Attempts:</strong> {retryCount + 1}
                                    </div>
                                )}
                                <div className="page-error-boundary__timestamp">
                                    <strong>Time:</strong>{' '}
                                    {new Date(errorTimestamp).toLocaleString()}
                                </div>
                            </div>

                            <div className="page-error-boundary__actions">
                                {showRetry && (
                                    <button
                                        className="page-error-boundary__button page-error-boundary__button--primary"
                                        onClick={this.handleRetry}
                                        aria-label={`Retry loading ${pageName} page`}
                                    >
                                        <span className="page-error-boundary__button-icon">🔄</span>
                                        Retry Page
                                    </button>
                                )}

                                {showNavigation && (
                                    <>
                                        <button
                                            className="page-error-boundary__button page-error-boundary__button--secondary"
                                            onClick={this.handleNavigateHome}
                                            aria-label="Go to home page"
                                        >
                                            <span className="page-error-boundary__button-icon">
                                                🏠
                                            </span>
                                            Go Home
                                        </button>

                                        <button
                                            className="page-error-boundary__button page-error-boundary__button--secondary"
                                            onClick={this.handleNavigateBack}
                                            aria-label="Go back to previous page"
                                        >
                                            <span className="page-error-boundary__button-icon">
                                                ←
                                            </span>
                                            Go Back
                                        </button>
                                    </>
                                )}

                                <button
                                    className="page-error-boundary__button page-error-boundary__button--neutral"
                                    onClick={this.handleReload}
                                    aria-label="Reload the entire page"
                                >
                                    <span className="page-error-boundary__button-icon">🔄</span>
                                    Reload App
                                </button>
                            </div>

                            {retryCount > 2 && (
                                <div className="page-error-boundary__help">
                                    <div className="page-error-boundary__help-box">
                                        <h4 className="page-error-boundary__help-title">
                                            Still having trouble?
                                        </h4>
                                        <ul className="page-error-boundary__help-list">
                                            <li>Try reloading the entire application</li>
                                            <li>Check your internet connection</li>
                                            <li>Clear your browser cache and try again</li>
                                            <li>Contact support if the problem persists</li>
                                        </ul>
                                    </div>
                                </div>
                            )}

                            <div className="page-error-boundary__footer">
                                <p className="page-error-boundary__footer-text">
                                    This error has been logged for debugging. Other DAPS features
                                    should continue to work normally.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        return children;
    }
}

PageErrorBoundaryBase.propTypes = {
    children: PropTypes.node.isRequired,
    pageName: PropTypes.string.isRequired,
    pageDescription: PropTypes.string,
    onError: PropTypes.func,
    onNavigateHome: PropTypes.func,
    onNavigateBack: PropTypes.func,
    showNavigation: PropTypes.bool,
    showRetry: PropTypes.bool,
    reportError: PropTypes.func,
};

/**
 * Wrapper component that connects PageErrorBoundaryBase to GlobalErrorProvider
 */
function PageErrorBoundary(props) {
    const globalErrorContext = useGlobalError();

    return <PageErrorBoundaryBase {...props} reportError={globalErrorContext?.reportError} />;
}

PageErrorBoundary.propTypes = PageErrorBoundaryBase.propTypes;

export default PageErrorBoundary;
