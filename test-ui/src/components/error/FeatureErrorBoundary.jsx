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
                retryCount: retryCount
            },
            error: {
                message: error?.message || 'Unknown error',
                name: error?.name || 'Error',
                stack: error?.stack || 'No stack trace available'
            },
            errorInfo: {
                componentStack: errorInfo?.componentStack || 'No component stack available'
            },
            environment: {
                userAgent: navigator.userAgent,
                url: window.location.href,
                viewport: `${window.innerWidth}x${window.innerHeight}`,
                timestamp: new Date().toISOString()
            },
            context: {
                boundaryType: 'FeatureErrorBoundary',
                errorBoundaryVersion: '1.0',
                recoveryAttempts: retryCount,
                reportTitle: `${featureName} Error Report`,
                instructions: 'Share this error report with developers for debugging assistance'
            }
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
                <div className="feature-error-boundary feature-error-boundary--skipped">
                    <div className="feature-error-boundary__skipped-notice">
                        <span className="feature-error-boundary__skipped-icon">⏭️</span>
                        <span className="feature-error-boundary__skipped-text">
                            {featureName} skipped due to error
                        </span>
                        <button
                            onClick={this.handleRetry}
                            className="btn btn--ghost btn--small inline-flex-center-both py-1 px-2 text-sm rounded-md cursor-pointer transition-fast"
                            type="button"
                            title="Try to load this feature again"
                        >
                            <span className="feature-error-boundary__button-icon">🔄</span>
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
                fallback: FallbackComponent
            } = this.props;

            const { error, errorInfo, retryCount, errorTimestamp } = this.state;

            // Use custom fallback if provided
            if (FallbackComponent) {
                return <FallbackComponent error={error} retry={this.handleRetry} />;
            }

            // Critical features get overlay mode
            if (critical) {
                return (
                    <div className="feature-error-boundary feature-error-boundary--overlay">
                        <div className="feature-error-boundary__overlay-backdrop">
                            <div className="feature-error-boundary__overlay-content">
                                <h2 className="feature-error-boundary__overlay-title">
                                    Critical Feature Error
                                </h2>
                                <p className="feature-error-boundary__overlay-message">
                                    The {featureName} feature is required for the application to function properly.
                                </p>
                                <div className="feature-error-boundary__overlay-actions">
                                    <button
                                        onClick={this.handleRetry}
                                        className="btn btn--primary inline-flex-center-both py-2 px-3 rounded-md cursor-pointer transition-fast"
                                        type="button"
                                    >
                                        <span className="feature-error-boundary__button-icon">🔄</span>
                                        Retry
                                    </button>
                                    <button
                                        onClick={this.handleCopyError}
                                        className={`btn ${
                                            this.state.copySuccess ? 'btn--success' : 
                                            this.state.copyError ? 'btn--error state-hover-dim' : 'btn--info state-hover-dim'
                                        }`}
                                        type="button"
                                        disabled={this.state.copying}
                                    >
                                        <span className="feature-error-boundary__button-icon">
                                            {this.state.copying ? '⏳' : 
                                             this.state.copySuccess ? '✅' : 
                                             this.state.copyError ? '❌' : '📋'}
                                        </span>
                                        {this.state.copying ? 'Copying...' :
                                         this.state.copySuccess ? 'Copied!' :
                                         this.state.copyError ? 'Failed' : 'Copy Error'}
                                    </button>
                                    <button
                                        onClick={this.handleReload}
                                        className="btn btn--secondary inline-flex-center-both py-2 px-3 rounded-md cursor-pointer transition-fast state-hover-dim"
                                        type="button"
                                    >
                                        <span className="feature-error-boundary__button-icon">🔄</span>
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
                        className="feature-error-boundary feature-error-boundary--disabled"
                        title={`${featureName} is temporarily disabled due to repeated errors`}
                    >
                        <div className="feature-error-boundary__disabled-notice">
                            <span className="feature-error-boundary__disabled-icon">⚠️</span>
                            <span className="feature-error-boundary__disabled-text">
                                {featureName} temporarily disabled
                            </span>
                        </div>
                    </div>
                );
            }

            // Default inline mode
            return (
                <>
                    <div className="feature-error-boundary feature-error-boundary--degraded">
                        <div className="feature-error-boundary__degraded-notice">
                            ⚠️ {featureName} temporarily unavailable
                        </div>
                    </div>
                    
                    <div className="feature-error-boundary feature-error-boundary--inline">
                        <div className="feature-error-boundary__container">
                            <div className="feature-error-boundary__header">
                                <span className="feature-error-boundary__icon">
                                    ⚠️
                                </span>
                                <div className="feature-error-boundary__title-group">
                                    <h3 className="feature-error-boundary__title">
                                        {featureName} Error
                                    </h3>
                                    {featureDescription && (
                                        <p className="feature-error-boundary__description">
                                            {featureDescription}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="feature-error-boundary__content">
                                <div className="feature-error-boundary__error-summary">
                                    <strong>Error:</strong> {error?.message || 'Component failed to render'}
                                    {retryCount > 0 && (
                                        <span className="feature-error-boundary__attempt-count">
                                            {' '}(Attempt {retryCount + 1})
                                        </span>
                                    )}
                                </div>

                                <div className="feature-error-boundary__actions">
                                    <button
                                        onClick={this.handleRetry}
                                        className="btn btn--primary btn--small inline-flex-center-both py-1 px-2 text-sm rounded-md cursor-pointer transition-fast"
                                        type="button"
                                    >
                                        <span className="feature-error-boundary__button-icon">
                                            🔄
                                        </span>
                                        Retry
                                    </button>

                                    {!critical && (
                                        <button
                                            onClick={this.handleSkip}
                                            className="btn btn--secondary btn--small inline-flex-center-both py-1 px-2 text-sm rounded-md cursor-pointer transition-fast state-hover-dim"
                                            type="button"
                                        >
                                            <span className="feature-error-boundary__button-icon">
                                                ⏭️
                                            </span>
                                            Skip
                                        </button>
                                    )}

                                    <button
                                        onClick={this.handleCopyError}
                                        className={`btn btn--small inline-flex-center-both py-1 px-2 text-sm rounded-md cursor-pointer transition-fast ${
                                            this.state.copySuccess ? 'btn--success state-hover-dim' : 
                                            this.state.copyError ? 'btn--error state-hover-dim' : 'btn--info state-hover-dim'
                                        }`}
                                        type="button"
                                        disabled={this.state.copying}
                                    >
                                        <span className="feature-error-boundary__button-icon">
                                            {this.state.copying ? '⏳' : 
                                             this.state.copySuccess ? '✅' : 
                                             this.state.copyError ? '❌' : '📋'}
                                        </span>
                                        {this.state.copying ? 'Copying...' :
                                         this.state.copySuccess ? 'Copied!' :
                                         this.state.copyError ? 'Failed' : 'Copy Error'}
                                    </button>

                                    <button
                                        onClick={this.handleReload}
                                        className="btn btn--ghost btn--small inline-flex-center-both py-1 px-2 text-sm rounded-md cursor-pointer transition-fast"
                                        type="button"
                                    >
                                        <span className="feature-error-boundary__button-icon">
                                            🔄
                                        </span>
                                        Reload
                                    </button>
                                </div>

                                {retryCount >= 2 && (
                                    <div className="feature-error-boundary__critical-notice">
                                        <div className="feature-error-boundary__critical-box">
                                            <strong>Repeated Errors Detected</strong>
                                            <p>This feature has failed multiple times. Consider reloading the application.</p>
                                            <button
                                                onClick={this.handleReload}
                                                className="btn btn--primary btn--small inline-flex-center-both py-1 px-2 text-sm rounded-md cursor-pointer transition-fast"
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
    showToast: PropTypes.func
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