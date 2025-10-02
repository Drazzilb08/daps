import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { useErrorContext } from './ErrorContext.jsx';
import { useToast } from '../../contexts/ToastContext.jsx';
import { ErrorContainer, ErrorIcon, ErrorActions } from './primitives';

/**
 * PageErrorBoundary - Page-level error boundary with EXACT UI/UX preservation
 *
 * This boundary produces IDENTICAL visual output to current PageErrorBoundary.jsx (lines 180-348)
 * by composing error primitives with page-specific elements (help section, footer).
 *
 * Key features preserved:
 * - Full page error container (lines 181-182)
 * - Icon + Title + Description (lines 183-195)
 * - Error details box (lines 207-232)
 * - Complete button set (lines 234-314): Try Again, Home, Back, Copy, Refresh
 * - Help section (lines 316-337)
 * - Footer (lines 340-345)
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
        const { pageName, reportError } = this.props;

        this.setState({ errorInfo });

        console.group(`🚨 PAGE ERROR: ${pageName}`);
        console.error('Page:', pageName);
        console.error('Error:', error);
        console.error('Error Info:', errorInfo);
        console.groupEnd();

        // Report to GlobalErrorProvider if available
        if (reportError) {
            reportError(error, {
                context: `Page: ${pageName}`,
                errorInfo,
                retryCount: this.state.retryCount,
            });
        }
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
        window.location.href = '/';
    };

    handleNavigateBack = () => {
        window.history.back();
    };

    handleRefresh = () => {
        window.location.reload();
    };

    handleCopyError = async () => {
        const { pageName, pageDescription } = this.props;
        const { error, errorInfo, retryCount, errorTimestamp } = this.state;

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
        };

        try {
            await navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2));
            this.setState({ copying: false, copySuccess: true });
            setTimeout(() => this.setState({ copySuccess: false }), 2000);
        } catch (clipboardError) {
            console.error('Failed to copy error details:', clipboardError);
            this.setState({ copying: false, copyError: true });
            setTimeout(() => this.setState({ copyError: false }), 3000);
        }
    };

    handleAction = actionId => {
        switch (actionId) {
            case 'retry':
                this.handleRetry();
                break;
            case 'home':
                this.handleNavigateHome();
                break;
            case 'back':
                this.handleNavigateBack();
                break;
            case 'copy':
                this.handleCopyError();
                break;
            case 'refresh':
                this.handleRefresh();
                break;
        }
    };

    render() {
        const { hasError, error, errorInfo, retryCount, errorTimestamp } = this.state;
        const { children, pageName, pageDescription } = this.props;

        if (!hasError) return children;

        const actions = [
            { id: 'retry', label: 'Try Again', variant: 'primary', icon: 'refresh' },
            { id: 'home', label: 'Go Home', variant: 'secondary', icon: 'home' },
            { id: 'back', label: 'Go Back', variant: 'secondary', icon: 'arrow_back' },
            {
                id: 'copy',
                label: this.state.copying
                    ? 'Copying...'
                    : this.state.copySuccess
                      ? 'Copied!'
                      : this.state.copyError
                        ? 'Failed'
                        : 'Copy Error',
                variant: this.state.copySuccess
                    ? 'success'
                    : this.state.copyError
                      ? 'danger'
                      : 'secondary',
                icon: this.state.copying
                    ? 'hourglass_empty'
                    : this.state.copySuccess
                      ? 'check_circle'
                      : this.state.copyError
                        ? 'error'
                        : 'content_copy',
                disabled: this.state.copying,
            },
            { id: 'refresh', label: 'Refresh Page', variant: 'secondary', icon: 'refresh' },
        ];

        // Compose primitives to match exact UI from PageErrorBoundary.jsx lines 180-348
        return (
            <ErrorContainer mode="page">
                {/* Icon (lines 184-186) */}
                <ErrorIcon type="error" size="lg" />

                {/* Title + Description (lines 187-195) */}
                <div className="text-center mb-8">
                    <h1 className="text-error text-3xl font-bold m-0 mb-2 leading-tight">
                        {pageName} Page Error
                    </h1>
                    <p className="text-secondary text-lg leading-relaxed">
                        {pageDescription
                            ? `There was a problem loading the ${pageDescription.toLowerCase()}.`
                            : `There was a problem loading the ${pageName} page.`}
                    </p>
                </div>

                {/* Optional description box (lines 198-205) */}
                {pageDescription && (
                    <div className="bg-surface-alt rounded-md p-4 mb-6">
                        <p className="text-base leading-relaxed">
                            The {pageDescription} encountered an error and could not be displayed
                            properly.
                        </p>
                    </div>
                )}

                {/* Error details box (lines 207-232) */}
                <div className="bg-surface-variant border border-border rounded-md p-4 mb-6">
                    <h3 className="text-primary text-xl font-semibold m-0 mb-3">Error Details</h3>
                    <div className="mb-2 text-sm font-mono break-words">
                        <strong>Error:</strong> {error?.message || 'Unknown error'}
                    </div>
                    <div className="mb-2 text-sm font-mono break-words">
                        <strong>Component Stack:</strong>{' '}
                        {errorInfo?.componentStack?.split('\n').slice(0, 3).join('\n') ||
                            'Not available'}
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

                {/* Action buttons (lines 234-314) */}
                <ErrorActions actions={actions} onAction={this.handleAction} mode="page" />

                {/* Help section (lines 316-337) */}
                <div className="mt-6">
                    <div className="bg-surface-alt border border-border rounded-md p-4">
                        <h4 className="text-primary text-lg font-semibold m-0 mb-3">
                            What can I do?
                        </h4>
                        <ul className="m-0 pl-6 text-secondary text-sm leading-relaxed">
                            <li className="mb-2">
                                Click &quot;Try Again&quot; to attempt reloading this page
                            </li>
                            <li className="mb-2">
                                Use the navigation buttons to go to a different page
                            </li>
                            <li className="mb-2">Refresh your browser if the problem persists</li>
                            <li className="mb-2">
                                Check the browser console for additional details
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Footer (lines 340-345) */}
                <div className="mt-6 pt-4 border-t border-border text-center">
                    <p className="m-0 text-sm text-secondary leading-relaxed">
                        If this error continues to occur, please check the application logs or
                        contact support for assistance.
                    </p>
                </div>
            </ErrorContainer>
        );
    }
}

PageErrorBoundaryBase.propTypes = {
    children: PropTypes.node.isRequired,
    pageName: PropTypes.string.isRequired,
    pageDescription: PropTypes.string,
    reportError: PropTypes.func,
    showToast: PropTypes.func,
};

/**
 * Wrapper component that connects PageErrorBoundaryBase to contexts
 */
function PageErrorBoundary(props) {
    const globalErrorContext = useErrorContext();
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
