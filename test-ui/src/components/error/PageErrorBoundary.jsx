import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { useGlobalError } from '../../contexts/GlobalErrorContext.jsx';
import { useToast } from '../../contexts/ToastContext.jsx';

/**
 * Page-level Error Boundary for route protection - Ported from Main UI
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
 * <PageErrorBoundary pageName="Dashboard" pageDescription="Dashboard overview">
 *   <DashboardPage />
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
            copying: false,
            copySuccess: false,
            copyError: false,
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
            window.location.href = '/';
        }
    };

    handleNavigateBack = () => {
        const { onNavigateBack } = this.props;
        if (onNavigateBack) {
            onNavigateBack();
        } else {
            window.history.back();
        }
    };

    handleRefresh = () => {
        window.location.reload();
    };

    handleCopyError = async () => {
        const { pageName, pageDescription } = this.props;
        const { error, errorInfo, retryCount, errorTimestamp } = this.state;

        // Set copying state
        this.setState({ copying: true });

        const errorDetails = {
            timestamp: errorTimestamp,
            page: {
                name: pageName,
                description: pageDescription,
                retryCount: retryCount,
            },
            error: {
                message: error?.message || 'Unknown error',
                name: error?.name || 'Error',
                stack: error?.stack || 'No stack trace available',
            },
            errorInfo: {
                componentStack: errorInfo?.componentStack || 'No component stack available',
            },
            environment: {
                userAgent: navigator.userAgent,
                url: window.location.href,
                viewport: `${window.innerWidth}x${window.innerHeight}`,
                timestamp: new Date().toISOString(),
            },
            context: {
                boundaryType: 'PageErrorBoundary',
                errorBoundaryVersion: '1.0',
                recoveryAttempts: retryCount,
                reportTitle: `${pageName} Page Error Report`,
                instructions: 'Share this error report with developers for debugging assistance',
            },
        };

        try {
            await navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2));

            // Show success state
            this.setState({ copying: false, copySuccess: true });

            // Reset after 2 seconds
            setTimeout(() => {
                this.setState({ copySuccess: false });
            }, 2000);

            console.log('Error details copied to clipboard');
        } catch (clipboardError) {
            console.error('Failed to copy error details:', clipboardError);

            // Show error state
            this.setState({ copying: false, copyError: true });

            // Reset after 3 seconds
            setTimeout(() => {
                this.setState({ copyError: false });
            }, 3000);

            console.group('🚨 PAGE ERROR DETAILS (Manual Copy)');
            console.log('Copy the following error details:');
            console.log(JSON.stringify(errorDetails, null, 2));
            console.groupEnd();
        }
    };

    render() {
        if (this.state.hasError) {
            const {
                pageName,
                pageDescription,
                showNavigation = true,
                showRetry = true,
            } = this.props;

            const { error, errorInfo, retryCount, errorTimestamp } = this.state;

            return (
                <div className="page-error-boundary">
                    <div className="page-error-boundary__container">
                        <div className="page-error-boundary__header">
                            <div className="page-error-boundary__icon">🔧</div>
                            <h1 className="page-error-boundary__title">{pageName} Page Error</h1>
                            <p className="page-error-boundary__subtitle">
                                {pageDescription
                                    ? `There was a problem loading the ${pageDescription.toLowerCase()}.`
                                    : `There was a problem loading the ${pageName} page.`}
                            </p>
                        </div>

                        <div className="page-error-boundary__content">
                            {pageDescription && (
                                <div className="page-error-boundary__description">
                                    <p>
                                        The {pageDescription} encountered an error and could not be
                                        displayed properly.
                                    </p>
                                </div>
                            )}

                            <div className="page-error-boundary__error-details">
                                <h3 className="page-error-boundary__error-title">Error Details</h3>
                                <div className="page-error-boundary__error-message">
                                    <strong>Error:</strong> {error?.message || 'Unknown error'}
                                </div>
                                <div className="page-error-boundary__error-message">
                                    <strong>Component Stack:</strong>{' '}
                                    {errorInfo?.componentStack
                                        ?.split('\n')
                                        .slice(0, 3)
                                        .join('\n') || 'Not available'}
                                </div>
                                {retryCount > 0 && (
                                    <div className="page-error-boundary__retry-info">
                                        <strong>Retry Count:</strong> {retryCount}
                                    </div>
                                )}
                                <div className="page-error-boundary__timestamp">
                                    <strong>Time:</strong>{' '}
                                    {errorTimestamp
                                        ? new Date(errorTimestamp).toLocaleString()
                                        : 'Unknown'}
                                </div>
                            </div>

                            <div className="page-error-boundary__actions">
                                {showRetry && (
                                    <button
                                        onClick={this.handleRetry}
                                        className="btn btn--primary inline-flex items-center justify-center py-2 px-3 rounded-md cursor-pointer transition-fast"
                                        type="button"
                                    >
                                        <span className="page-error-boundary__button-icon">🔄</span>
                                        Try Again
                                    </button>
                                )}

                                {showNavigation && (
                                    <>
                                        <button
                                            onClick={this.handleNavigateHome}
                                            className="btn btn--secondary inline-flex items-center justify-center py-2 px-3 rounded-md cursor-pointer transition-fast state-hover-dim"
                                            type="button"
                                        >
                                            <span className="page-error-boundary__button-icon">
                                                🏠
                                            </span>
                                            Go Home
                                        </button>

                                        <button
                                            onClick={this.handleNavigateBack}
                                            className="btn btn--secondary inline-flex items-center justify-center py-2 px-3 rounded-md cursor-pointer transition-fast state-hover-dim"
                                            type="button"
                                        >
                                            <span className="page-error-boundary__button-icon">
                                                ←
                                            </span>
                                            Go Back
                                        </button>
                                    </>
                                )}

                                <button
                                    onClick={this.handleCopyError}
                                    className={`btn inline-flex items-center justify-center py-2 px-3 rounded-md cursor-pointer transition-fast ${
                                        this.state.copySuccess
                                            ? 'btn--success state-hover-dim'
                                            : this.state.copyError
                                              ? 'btn--error state-hover-dim'
                                              : 'btn--info state-hover-dim'
                                    }`}
                                    type="button"
                                    disabled={this.state.copying}
                                >
                                    <span className="page-error-boundary__button-icon">
                                        {this.state.copying
                                            ? '⏳'
                                            : this.state.copySuccess
                                              ? '✅'
                                              : this.state.copyError
                                                ? '❌'
                                                : '📋'}
                                    </span>
                                    {this.state.copying
                                        ? 'Copying...'
                                        : this.state.copySuccess
                                          ? 'Copied!'
                                          : this.state.copyError
                                            ? 'Failed'
                                            : 'Copy Error'}
                                </button>

                                <button
                                    onClick={this.handleRefresh}
                                    className="btn btn--ghost inline-flex items-center justify-center py-2 px-3 rounded-md cursor-pointer transition-fast"
                                    type="button"
                                >
                                    <span className="page-error-boundary__button-icon">🔄</span>
                                    Refresh Page
                                </button>
                            </div>

                            <div className="page-error-boundary__help">
                                <div className="page-error-boundary__help-box">
                                    <h4 className="page-error-boundary__help-title">
                                        What can I do?
                                    </h4>
                                    <ul className="page-error-boundary__help-list">
                                        <li>Click "Try Again" to attempt reloading this page</li>
                                        <li>
                                            Use the navigation buttons to go to a different page
                                        </li>
                                        <li>Refresh your browser if the problem persists</li>
                                        <li>Check the browser console for additional details</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <div className="page-error-boundary__footer">
                            <p className="page-error-boundary__footer-text">
                                If this error continues to occur, please check the application logs
                                or contact support for assistance.
                            </p>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
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
    showToast: PropTypes.func,
};

/**
 * Wrapper component that connects PageErrorBoundaryBase to GlobalErrorProvider and ToastProvider
 */
function PageErrorBoundary(props) {
    const globalErrorContext = useGlobalError();
    const toastContext = useToast();

    return (
        <PageErrorBoundaryBase
            {...props}
            reportError={globalErrorContext?.setError}
            showToast={toastContext?.success}
        />
    );
}

PageErrorBoundary.propTypes = PageErrorBoundaryBase.propTypes;

export default PageErrorBoundary;
