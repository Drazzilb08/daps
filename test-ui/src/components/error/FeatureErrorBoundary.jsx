import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { useGlobalError } from '../../contexts/GlobalErrorContext.jsx';
import { useToast } from '../../contexts/ToastContext.jsx';

/**
 * Feature-level Error Boundary for component protection - Ported from Main UI
 *
 * Specialized error boundary designed to wrap individual features or sections.
 * Provides inline error handling with graceful degradation and recovery options.
 *
 * @param {Object} props - Component props
 * @param {string} props.featureName - Name of the feature for error context
 * @param {string} [props.featureDescription] - Brief description of feature functionality
 * @param {boolean} [props.critical=false] - Whether this feature is critical to app function
 * @param {Function} [props.onError] - Callback when error occurs (error, errorInfo) => void
 * @param {Function} [props.fallback] - Custom fallback component
 * @param {React.ReactNode} props.children - Child components (feature content) to protect
 *
 * @example
 * // Basic feature protection
 * <FeatureErrorBoundary
 *   featureName="Search Interface"
 *   featureDescription="Media search and filtering"
 * >
 *   <SearchInterface />
 * </FeatureErrorBoundary>
 *
 * @example
 * // Critical feature with overlay mode
 * <FeatureErrorBoundary
 *   featureName="Navigation"
 *   critical={true}
 * >
 *   <MainNavigation />
 * </FeatureErrorBoundary>
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
        const { onError, featureName, reportError } = this.props;

        this.setState({ errorInfo });

        // Enhanced feature error context
        const errorContext = {
            context: `Feature: ${featureName}`,
            errorInfo,
            retryCount: this.state.retryCount,
            component: 'FeatureErrorBoundary',
            feature: featureName,
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
        console.group(`⚠️ FEATURE ERROR: ${featureName}`);
        console.error('Feature:', featureName);
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

        // For non-critical features, clear the error state and show fallback
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

        // Set copying state
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
            context: {
                boundaryType: 'FeatureErrorBoundary',
                errorBoundaryVersion: '1.0',
                recoveryAttempts: retryCount,
                reportTitle: `${featureName} Error Report`,
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

            // Fallback to console output for manual copying
            console.group('🚨 FEATURE ERROR DETAILS (Manual Copy)');
            console.log('Copy the following error details:');
            console.log(JSON.stringify(errorDetails, null, 2));
            console.groupEnd();
        }
    };

    handleReload = () => {
        window.location.reload();
    };

    render() {
        // If feature was skipped, show skipped state
        if (this.state.skipped) {
            const { featureName } = this.props;

            return (
                <div className="bg-surface-alt border border-warning rounded-md my-2 font-sans">
                    <div className="p-3 text-sm text-secondary flex items-center gap-2">
                        <span className="text-base shrink-0">⏭️</span>
                        <span className="flex-1 font-medium">
                            {featureName} skipped due to error
                        </span>
                        <button
                            onClick={this.handleRetry}
                            className="min-h-touch bg-transparent text-primary px-2 py-1 border border-transparent rounded-md cursor-pointer transition-colors hover:bg-surface-hover inline-flex items-center justify-center text-sm"
                            type="button"
                            title="Try to load this feature again"
                        >
                            <span className="inline-block font-normal">🔄</span>
                            Retry
                        </button>
                    </div>
                </div>
            );
        }

        if (this.state.hasError) {
            const {
                featureName,
                featureDescription,
                critical = false,
                fallback: FallbackComponent,
            } = this.props;

            const { error, errorInfo, retryCount, errorTimestamp } = this.state;

            // Use custom fallback if provided
            if (FallbackComponent) {
                return <FallbackComponent error={error} retry={this.handleRetry} />;
            }

            // Critical features get overlay mode
            if (critical) {
                return (
                    <div className="fixed inset-0 z-50 bg-overlay backdrop-blur-sm font-sans">
                        <div className="absolute inset-0 bg-backdrop">
                            <div className="relative bg-surface border-2 border-error rounded-lg p-6 m-4 max-w-lg w-full max-h-screen overflow-y-auto shadow-xl z-50">
                                <h2 className="text-error text-2xl font-bold m-0 mb-4 text-center leading-tight">
                                    Critical Feature Error
                                </h2>
                                <p className="text-primary text-base m-0 mb-5 text-center leading-relaxed">
                                    The {featureName} feature is required for the application to
                                    function properly.
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        onClick={this.handleRetry}
                                        className="min-h-touch bg-primary text-white px-3 py-2 border-none rounded-md cursor-pointer transition-colors inline-flex items-center justify-center"
                                        type="button"
                                    >
                                        <span className="inline-block font-normal">
                                            🔄
                                        </span>
                                        Retry
                                    </button>
                                    <button
                                        onClick={this.handleCopyError}
                                        className={`min-h-touch px-3 py-2 border-none rounded-md cursor-pointer transition-colors inline-flex items-center justify-center ${
                                            this.state.copySuccess
                                                ? 'bg-success text-white'
                                                : this.state.copyError
                                                  ? 'bg-error text-white'
                                                  : 'bg-info text-white'
                                        }`}
                                        type="button"
                                        disabled={this.state.copying}
                                    >
                                        <span className="inline-block font-normal">
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
                                        onClick={this.handleReload}
                                        className="min-h-touch bg-surface text-primary px-3 py-2 border border-border rounded-md cursor-pointer transition-colors hover:bg-surface-hover inline-flex items-center justify-center"
                                        type="button"
                                    >
                                        <span className="inline-block font-normal">
                                            🔄
                                        </span>
                                        Reload App
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            }

            // High retry count - show disabled state
            if (retryCount >= 3) {
                return (
                    <div
                        className="bg-surface-alt border border-text-disabled rounded-md my-2 opacity-70 font-sans"
                        title={`${featureName} is temporarily disabled due to repeated errors`}
                    >
                        <div className="p-3 text-sm text-disabled flex items-center gap-2">
                            <span className="text-base shrink-0">⚠️</span>
                            <span className="flex-1 font-medium">
                                {featureName} temporarily disabled
                            </span>
                        </div>
                    </div>
                );
            }

            // Default inline mode
            return (
                <>
                    <div className="bg-surface-alt border border-warning rounded-md my-2 mb-1 p-2 text-center text-xs text-warning font-medium font-sans">
                        <div className="m-0 p-0">
                            ⚠️ {featureName} temporarily unavailable
                        </div>
                    </div>

                    <div className="bg-surface border border-error rounded-md my-2 font-sans">
                        <div className="p-4">
                            <div className="mb-4 flex items-center gap-3">
                                <span className="text-xl shrink-0 mt-1">⚠️</span>
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

                            <div className="text-primary">
                                <div className="bg-surface-variant border border-error p-3 mb-4 text-sm break-words">
                                    <strong>Error:</strong>{' '}
                                    {error?.message || 'Component failed to render'}
                                    {retryCount > 0 && (
                                        <span className="text-secondary font-normal">
                                            {' '}
                                            (Attempt {retryCount + 1})
                                        </span>
                                    )}
                                </div>

                                <div className="flex flex-wrap gap-2 mb-0">
                                    <button
                                        onClick={this.handleRetry}
                                        className="min-h-touch bg-primary text-white px-2 py-1 border-none rounded-md cursor-pointer transition-colors inline-flex items-center justify-center text-sm"
                                        type="button"
                                    >
                                        <span className="inline-block font-normal">
                                            🔄
                                        </span>
                                        Retry
                                    </button>

                                    {!critical && (
                                        <button
                                            onClick={this.handleSkip}
                                            className="min-h-touch bg-surface text-primary px-2 py-1 border border-border rounded-md cursor-pointer transition-colors hover:bg-surface-hover inline-flex items-center justify-center text-sm"
                                            type="button"
                                        >
                                            <span className="inline-block font-normal">
                                                ⏭️
                                            </span>
                                            Skip
                                        </button>
                                    )}

                                    <button
                                        onClick={this.handleCopyError}
                                        className={`min-h-touch px-2 py-1 border-none rounded-md cursor-pointer transition-colors inline-flex items-center justify-center text-sm ${
                                            this.state.copySuccess
                                                ? 'bg-success text-white'
                                                : this.state.copyError
                                                  ? 'bg-error text-white'
                                                  : 'bg-info text-white'
                                        }`}
                                        type="button"
                                        disabled={this.state.copying}
                                    >
                                        <span className="inline-block font-normal">
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
                                        onClick={this.handleReload}
                                        className="min-h-touch bg-transparent text-primary px-2 py-1 border border-transparent rounded-md cursor-pointer transition-colors hover:bg-surface-hover inline-flex items-center justify-center text-sm"
                                        type="button"
                                    >
                                        <span className="inline-block font-normal">
                                            🔄
                                        </span>
                                        Reload
                                    </button>
                                </div>

                                {retryCount >= 2 && (
                                    <div className="mt-4">
                                        <div className="bg-surface-alt border border-error rounded-md p-3">
                                            <strong>Repeated Errors Detected</strong>
                                            <p>
                                                This feature has failed multiple times. Consider
                                                reloading the application.
                                            </p>
                                            <button
                                                onClick={this.handleReload}
                                                className="min-h-touch bg-primary text-white px-2 py-1 border-none rounded-md cursor-pointer transition-colors inline-flex items-center justify-center text-sm"
                                                type="button"
                                            >
                                                Reload Application
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            );
        }

        return this.props.children;
    }
}

FeatureErrorBoundaryBase.propTypes = {
    children: PropTypes.node.isRequired,
    featureName: PropTypes.string.isRequired,
    featureDescription: PropTypes.string,
    critical: PropTypes.bool,
    onError: PropTypes.func,
    fallback: PropTypes.elementType,
    reportError: PropTypes.func,
    showToast: PropTypes.func,
};

/**
 * Wrapper component that connects FeatureErrorBoundaryBase to GlobalErrorProvider and ToastProvider
 */
function FeatureErrorBoundary(props) {
    const globalErrorContext = useGlobalError();
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
