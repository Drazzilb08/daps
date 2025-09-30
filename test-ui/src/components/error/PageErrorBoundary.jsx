import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { useGlobalError } from '../../contexts/GlobalErrorContext.jsx';
import { useToast } from '../../contexts/ToastContext.jsx';

/**
 * Page-level Error Boundary for route protection
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

        // Page error context
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

        // Console logging for development
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
                <div className="min-h-content p-4 font-sans">
                    <div className="max-w-2xl w-full bg-surface border-2 border-error rounded-lg p-8 shadow-xl mx-auto">
                        <div className="text-center mb-8">
                            <div className="material-symbols-outlined text-4xl mb-3 block text-error">
                                build
                            </div>
                            <h1 className="text-error text-3xl font-bold m-0 mb-2 leading-tight">
                                {pageName} Page Error
                            </h1>
                            <p className="text-secondary text-lg leading-relaxed">
                                {pageDescription
                                    ? `There was a problem loading the ${pageDescription.toLowerCase()}.`
                                    : `There was a problem loading the ${pageName} page.`}
                            </p>
                        </div>

                        <div className="text-primary">
                            {pageDescription && (
                                <div className="bg-surface-alt rounded-md p-4 mb-6">
                                    <p className="text-base leading-relaxed">
                                        The {pageDescription} encountered an error and could not be
                                        displayed properly.
                                    </p>
                                </div>
                            )}

                            <div className="bg-surface-variant border border-border rounded-md p-4 mb-6">
                                <h3 className="text-primary text-xl font-semibold m-0 mb-3">
                                    Error Details
                                </h3>
                                <div className="mb-2 text-sm font-mono break-words">
                                    <strong>Error:</strong> {error?.message || 'Unknown error'}
                                </div>
                                <div className="mb-2 text-sm font-mono break-words">
                                    <strong>Component Stack:</strong>{' '}
                                    {errorInfo?.componentStack
                                        ?.split('\n')
                                        .slice(0, 3)
                                        .join('\n') || 'Not available'}
                                </div>
                                {retryCount > 0 && (
                                    <div className="mb-2 text-sm font-mono break-words">
                                        <strong>Retry Count:</strong> {retryCount}
                                    </div>
                                )}
                                <div className="mb-0 text-sm font-mono break-words">
                                    <strong>Time:</strong>{' '}
                                    {errorTimestamp
                                        ? new Date(errorTimestamp).toLocaleString()
                                        : 'Unknown'}
                                </div>
                            </div>

                            <div className="mb-6 flex flex-wrap gap-2">
                                {showRetry && (
                                    <button
                                        onClick={this.handleRetry}
                                        className="touch-target leading-none no-underline whitespace-nowrap border border-transparent select-none bg-primary text-white py-2 px-3 rounded-md cursor-pointer btn-interactions inline-flex items-center justify-center"
                                        type="button"
                                    >
                                        <span className="material-symbols-outlined mr-1">
                                            refresh
                                        </span>
                                        Try Again
                                    </button>
                                )}

                                {showNavigation && (
                                    <>
                                        <button
                                            onClick={this.handleNavigateHome}
                                            className="touch-target leading-none no-underline whitespace-nowrap border border-border select-none bg-surface text-primary py-2 px-3 rounded-md cursor-pointer btn-interactions inline-flex items-center justify-center"
                                            type="button"
                                        >
                                            <span className="material-symbols-outlined mr-1">
                                                home
                                            </span>
                                            Go Home
                                        </button>

                                        <button
                                            onClick={this.handleNavigateBack}
                                            className="touch-target leading-none no-underline whitespace-nowrap border border-border select-none bg-surface text-primary py-2 px-3 rounded-md cursor-pointer btn-interactions inline-flex items-center justify-center"
                                            type="button"
                                        >
                                            <span className="material-symbols-outlined mr-1">
                                                arrow_back
                                            </span>
                                            Go Back
                                        </button>
                                    </>
                                )}

                                <button
                                    onClick={this.handleCopyError}
                                    className={`touch-target leading-none no-underline whitespace-nowrap border border-transparent select-none py-2 px-3 rounded-md cursor-pointer btn-interactions inline-flex items-center justify-center ${
                                        this.state.copySuccess
                                            ? 'bg-success text-white'
                                            : this.state.copyError
                                              ? 'bg-error text-white'
                                              : 'bg-surface-elevated text-primary'
                                    }`}
                                    type="button"
                                    disabled={this.state.copying}
                                >
                                    <span className="material-symbols-outlined mr-1">
                                        {this.state.copying
                                            ? 'hourglass_empty'
                                            : this.state.copySuccess
                                              ? 'check_circle'
                                              : this.state.copyError
                                                ? 'error'
                                                : 'content_copy'}
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
                                    className="touch-target leading-none no-underline whitespace-nowrap border border-border select-none bg-transparent text-primary py-2 px-3 rounded-md cursor-pointer btn-interactions inline-flex items-center justify-center"
                                    type="button"
                                >
                                    <span className="material-symbols-outlined mr-1">refresh</span>
                                    Refresh Page
                                </button>
                            </div>

                            <div className="mt-6">
                                <div className="bg-surface-alt border border-border rounded-md p-4">
                                    <h4 className="text-primary text-lg font-semibold m-0 mb-3">
                                        What can I do?
                                    </h4>
                                    <ul className="m-0 pl-6 text-secondary text-sm leading-relaxed">
                                        <li className="mb-2">
                                            Click "Try Again" to attempt reloading this page
                                        </li>
                                        <li className="mb-2">
                                            Use the navigation buttons to go to a different page
                                        </li>
                                        <li className="mb-2">
                                            Refresh your browser if the problem persists
                                        </li>
                                        <li className="mb-2">
                                            Check the browser console for additional details
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-border text-center">
                            <p className="m-0 text-sm text-secondary leading-relaxed">
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
