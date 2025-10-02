import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { useErrorContext } from './ErrorContext.jsx';
import { useToast } from '../../contexts/ToastContext.jsx';
import { ErrorContainer, ErrorActions } from './primitives';

/**
 * FeatureErrorBoundary - Feature-level error boundary with EXACT UI/UX preservation
 *
 * This boundary produces IDENTICAL visual output to current FeatureErrorBoundary.jsx:
 * - Critical mode (modal): lines 218-278
 * - Inline mode: lines 300-431
 * - Skipped mode: lines 176-199
 *
 * Key features preserved:
 * - Critical feature modal overlay with blur backdrop
 * - Inline feature error with warning banner
 * - Skip functionality for non-critical features
 * - Copy error with state indicators (copying/success/error)
 */
class FeatureErrorBoundaryBase extends Component {
    constructor(props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
            retryCount: 0,
            errorTimestamp: null,
            isRetrying: false,
            skipped: false,
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
        const { featureName, reportError } = this.props;

        this.setState({ errorInfo });

        console.group(`⚠️ FEATURE ERROR: ${featureName}`);
        console.error('Feature:', featureName);
        console.error('Error:', error);
        console.error('Error Info:', errorInfo);
        console.groupEnd();

        // Report to GlobalErrorProvider if available
        if (reportError) {
            reportError(error, {
                context: `Feature: ${featureName}`,
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
            isRetrying: false,
            skipped: false,
        }));
    };

    handleSkip = () => {
        const { critical = false } = this.props;

        // Critical features cannot be skipped
        if (critical) {
            return;
        }

        // For non-critical features, clear error state and show skipped state
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
            skipped: true,
            errorTimestamp: null,
            isRetrying: false,
        });
    };

    handleCopyError = async () => {
        const { featureName, featureDescription } = this.props;
        const { error, errorInfo, retryCount, errorTimestamp } = this.state;

        this.setState({ copying: true });

        const errorDetails = {
            timestamp: errorTimestamp,
            feature: {
                name: featureName,
                description: featureDescription,
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

    handleReload = () => {
        window.location.reload();
    };

    handleAction = actionId => {
        switch (actionId) {
            case 'retry':
                this.handleRetry();
                break;
            case 'skip':
                this.handleSkip();
                break;
            case 'copy':
                this.handleCopyError();
                break;
            case 'reload':
                this.handleReload();
                break;
        }
    };

    render() {
        const { hasError, skipped, error, retryCount } = this.state;
        const {
            children,
            featureName,
            featureDescription,
            critical = false,
            fallback,
        } = this.props;

        // Skipped state (exact from FeatureErrorBoundary.jsx lines 176-199)
        if (skipped) {
            return (
                <div className="bg-surface-alt border border-warning rounded-md my-2 font-sans">
                    <div className="p-3 text-sm text-secondary flex items-center gap-2">
                        <span className="material-symbols-outlined text-base shrink-0">
                            skip_next
                        </span>
                        <span className="flex-1 font-medium">
                            {featureName} skipped due to error
                        </span>
                        <button
                            onClick={this.handleRetry}
                            className="touch-target bg-transparent text-primary px-2 py-1 border border-transparent rounded-md cursor-pointer transition-colors hover:bg-surface-hover inline-flex items-center justify-center text-sm"
                            type="button"
                            title="Try to load this feature again"
                        >
                            <span className="material-symbols-outlined mr-1 align-middle">refresh</span>
                            Retry
                        </button>
                    </div>
                </div>
            );
        }

        if (!hasError) return children;

        // Use custom fallback if provided
        if (fallback) {
            return fallback({ error, retry: this.handleRetry });
        }

        // Critical mode: Modal overlay (exact from FeatureErrorBoundary.jsx lines 218-278)
        if (critical) {
            const modalActions = [
                { id: 'retry', label: 'Retry', variant: 'primary', icon: 'refresh' },
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
                { id: 'reload', label: 'Reload App', variant: 'secondary', icon: 'refresh' },
            ];

            return (
                <ErrorContainer mode="modal">
                    <h2 className="text-error text-2xl font-bold m-0 mb-4 text-center leading-tight">
                        Critical Feature Error
                    </h2>
                    <p className="text-primary text-base m-0 mb-5 text-center leading-relaxed">
                        The {featureName} feature is required for the application to function
                        properly.
                    </p>
                    <ErrorActions
                        actions={modalActions}
                        onAction={this.handleAction}
                        mode="modal"
                    />
                </ErrorContainer>
            );
        }

        // High retry count: Disabled state (exact from FeatureErrorBoundary.jsx lines 281-298)
        if (retryCount >= 3) {
            return (
                <div
                    className="bg-surface-alt border border-text-disabled rounded-md my-2 opacity-70 font-sans"
                    title={`${featureName} is temporarily disabled due to repeated errors`}
                >
                    <div className="p-3 text-sm text-tertiary flex items-center gap-2">
                        <span className="material-symbols-outlined text-base shrink-0">
                            warning
                        </span>
                        <span className="flex-1 font-medium">
                            {featureName} temporarily disabled
                        </span>
                    </div>
                </div>
            );
        }

        // Inline mode: Feature error (exact from FeatureErrorBoundary.jsx lines 300-431)
        const inlineActions = [
            { id: 'retry', label: 'Retry', variant: 'primary', icon: 'refresh' },
            { id: 'skip', label: 'Skip', variant: 'secondary', icon: 'skip_next' },
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
            { id: 'reload', label: 'Reload', variant: 'secondary', icon: 'refresh' },
        ];

        return (
            <>
                {/* Warning banner (lines 303-310) */}
                <div className="bg-surface-alt border border-warning rounded-md my-2 mb-1 p-2 text-center text-xs text-warning font-medium font-sans">
                    <div className="m-0 p-0">
                        <span className="material-symbols-outlined text-warning mr-1 align-middle">warning</span>
                        {featureName} temporarily unavailable
                    </div>
                </div>

                {/* Error container (lines 312-429) */}
                <ErrorContainer mode="inline">
                    {/* Icon + Title (lines 314-328) */}
                    <div className="mb-4 flex items-center gap-3">
                        <span className="material-symbols-outlined text-xl shrink-0 mt-1 text-warning">
                            warning
                        </span>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-error text-lg font-semibold m-0 mb-1 leading-tight">
                                {featureName} Error
                            </h3>
                            {featureDescription && (
                                <p className="text-secondary text-sm leading-relaxed">
                                    {featureDescription}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Error message box (lines 330-340) */}
                    <div className="text-primary">
                        <div className="bg-surface-variant border border-error p-3 mb-4 text-sm break-words">
                            <strong>Error:</strong> {error?.message || 'Component failed to render'}
                            {retryCount > 0 && (
                                <span className="text-secondary font-normal">
                                    {' '}
                                    (Attempt {retryCount + 1})
                                </span>
                            )}
                        </div>

                        {/* Action buttons (lines 342-407) */}
                        <ErrorActions
                            actions={inlineActions}
                            onAction={this.handleAction}
                            mode="inline"
                        />

                        {/* Repeated errors warning (lines 409-426) */}
                        {retryCount >= 2 && (
                            <div className="mt-4">
                                <div className="bg-surface-alt border border-error rounded-md p-3">
                                    <strong>Repeated Errors Detected</strong>
                                    <p>
                                        This feature has failed multiple times. Consider reloading
                                        the application.
                                    </p>
                                    <button
                                        onClick={this.handleReload}
                                        className="touch-target bg-primary text-white px-2 py-1 border-none rounded-md cursor-pointer transition-colors inline-flex items-center justify-center text-sm"
                                        type="button"
                                    >
                                        Reload Application
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </ErrorContainer>
            </>
        );
    }
}

FeatureErrorBoundaryBase.propTypes = {
    children: PropTypes.node.isRequired,
    featureName: PropTypes.string.isRequired,
    featureDescription: PropTypes.string,
    critical: PropTypes.bool,
    fallback: PropTypes.func,
    reportError: PropTypes.func,
    showToast: PropTypes.func,
};

/**
 * Wrapper component that connects FeatureErrorBoundaryBase to contexts
 */
function FeatureErrorBoundary(props) {
    const globalErrorContext = useErrorContext();
    const toastContext = useToast();

    return (
        <FeatureErrorBoundaryBase
            {...props}
            reportError={globalErrorContext?.setError}
            showToast={toastContext?.success}
        />
    );
}

FeatureErrorBoundary.propTypes = FeatureErrorBoundaryBase.propTypes;

export default FeatureErrorBoundary;
