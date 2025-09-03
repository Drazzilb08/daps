import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { useGlobalError } from './providers/GlobalErrorProvider';

/**
 * Feature-specific Error Boundary for critical component protection
 *
 * Designed to isolate errors in critical features (search, forms, navigation)
 * while allowing the rest of the application to continue functioning. Provides
 * feature-specific recovery options and graceful degradation.
 *
 * @param {Object} props - Component props
 * @param {string} props.featureName - Name of the feature for error context
 * @param {string} [props.featureDescription] - Brief description of feature functionality
 * @param {boolean} [props.critical=false] - Whether this feature is critical to app function
 * @param {Function} [props.onError] - Callback when error occurs (error, errorInfo) => void
 * @param {Function} [props.onFeatureDisabled] - Callback when feature is disabled due to errors
 * @param {React.Component} [props.fallback] - Custom fallback component
 * @param {React.Component} [props.degradedMode] - Component to show in degraded mode
 * @param {boolean} [props.allowDegradation=true] - Allow graceful degradation instead of full error
 * @param {number} [props.maxRetries=3] - Maximum retry attempts before degradation
 * @param {boolean} [props.showInlineError=true] - Show error inline or as overlay
 * @param {React.ReactNode} props.children - Feature components to protect
 *
 * @example
 * // Critical search feature
 * <FeatureErrorBoundary
 *   featureName="Search"
 *   critical={true}
 *   degradedMode={<SearchPlaceholder />}
 * >
 *   <SearchInterface />
 * </FeatureErrorBoundary>
 *
 * @example
 * // Form with custom error handling
 * <FeatureErrorBoundary
 *   featureName="Settings Form"
 *   onError={(error) => trackError('form', error)}
 *   onFeatureDisabled={() => showNotification('Form temporarily unavailable')}
 * >
 *   <SettingsForm />
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
            isDegraded: false,
            isDisabled: false,
            lastErrorTime: null,
        };
    }

    static getDerivedStateFromError(error) {
        return {
            hasError: true,
            error,
            lastErrorTime: Date.now(),
        };
    }

    componentDidCatch(error, errorInfo) {
        const { onError, featureName, critical, maxRetries = 3, reportError } = this.props;

        this.setState(prevState => {
            const newRetryCount = prevState.retryCount + 1;
            const shouldDegrade = !critical && newRetryCount >= maxRetries;
            const shouldDisable = critical && newRetryCount >= maxRetries;

            return {
                errorInfo,
                retryCount: newRetryCount,
                isDegraded: shouldDegrade,
                isDisabled: shouldDisable,
            };
        });

        // Enhanced feature error context
        const errorContext = {
            context: `Feature: ${featureName}`,
            errorInfo,
            retryCount: this.state.retryCount + 1,
            component: 'FeatureErrorBoundary',
            feature: featureName,
            critical,
            maxRetries,
            timestamp: new Date().toISOString(),
            userInteraction: this.state.lastErrorTime
                ? Date.now() - this.state.lastErrorTime
                : null,
        };

        // Report to GlobalErrorProvider if available
        if (reportError) {
            reportError(error, errorContext);
        }

        // Call custom error handler
        if (onError) {
            onError(error, errorInfo);
        }

        // Notify if feature is being disabled
        if (
            (critical && this.state.retryCount + 1 >= maxRetries) ||
            (!critical && this.state.retryCount + 1 >= maxRetries)
        ) {
            if (this.props.onFeatureDisabled) {
                this.props.onFeatureDisabled(featureName, error);
            }
        }

        // Feature-specific console logging
        console.group(`⚡ FEATURE ERROR: ${featureName}`);
        console.error('Feature:', featureName);
        console.error('Critical:', critical);
        console.error('Retry Count:', this.state.retryCount + 1);
        console.error('Error:', error);
        console.error('Error Info:', errorInfo);
        console.groupEnd();
    }

    handleRetry = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
            isDegraded: false,
            isDisabled: false,
            lastErrorTime: null,
        });
    };

    handleDisableFeature = () => {
        this.setState({
            isDisabled: true,
            hasError: false,
        });
    };

    handleEnableDegradedMode = () => {
        this.setState({
            isDegraded: true,
            hasError: false,
        });
    };

    renderError() {
        const { error, retryCount } = this.state;
        const {
            featureName,
            featureDescription,
            critical,
            maxRetries = 3,
            showInlineError = true,
            allowDegradation = true,
        } = this.props;

        const canRetry = retryCount < maxRetries;
        const canDegrade = allowDegradation && !critical && !this.state.isDegraded;

        if (showInlineError) {
            return (
                <div className="feature-error-boundary feature-error-boundary--inline">
                    <div className="feature-error-boundary__container">
                        <div className="feature-error-boundary__header">
                            <span className="feature-error-boundary__icon">
                                {critical ? '🚨' : '⚠️'}
                            </span>
                            <div className="feature-error-boundary__title-group">
                                <h3 className="feature-error-boundary__title">
                                    {featureName} {critical ? 'Critical Error' : 'Error'}
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
                                <strong>Issue:</strong>{' '}
                                {error?.message || 'Feature is temporarily unavailable'}
                                {retryCount > 0 && (
                                    <span className="feature-error-boundary__attempt-count">
                                        {' '}
                                        (Attempt {retryCount + 1}/{maxRetries + 1})
                                    </span>
                                )}
                            </div>

                            <div className="feature-error-boundary__actions">
                                {canRetry && (
                                    <button
                                        className="feature-error-boundary__button feature-error-boundary__button--primary"
                                        onClick={this.handleRetry}
                                        aria-label={`Retry ${featureName} feature`}
                                    >
                                        <span className="feature-error-boundary__button-icon">
                                            🔄
                                        </span>
                                        Try Again
                                    </button>
                                )}

                                {canDegrade && (
                                    <button
                                        className="feature-error-boundary__button feature-error-boundary__button--secondary"
                                        onClick={this.handleEnableDegradedMode}
                                        aria-label={`Use ${featureName} in limited mode`}
                                    >
                                        <span className="feature-error-boundary__button-icon">
                                            ⚡
                                        </span>
                                        Use Limited Mode
                                    </button>
                                )}

                                {!critical && (
                                    <button
                                        className="feature-error-boundary__button feature-error-boundary__button--neutral"
                                        onClick={this.handleDisableFeature}
                                        aria-label={`Disable ${featureName} feature`}
                                    >
                                        <span className="feature-error-boundary__button-icon">
                                            ✕
                                        </span>
                                        Disable Feature
                                    </button>
                                )}
                            </div>

                            {critical && retryCount >= maxRetries && (
                                <div className="feature-error-boundary__critical-notice">
                                    <div className="feature-error-boundary__critical-box">
                                        <strong>⚠️ Critical Feature Failure</strong>
                                        <p>
                                            This feature is essential for DAPS functionality. Please
                                            reload the page or contact support.
                                        </p>
                                        <button
                                            className="feature-error-boundary__button feature-error-boundary__button--primary"
                                            onClick={() => window.location.reload()}
                                        >
                                            Reload Application
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            );
        } else {
            // Overlay mode for critical features
            return (
                <div className="feature-error-boundary feature-error-boundary--overlay">
                    <div className="feature-error-boundary__overlay-backdrop">
                        <div className="feature-error-boundary__overlay-content">
                            <h2 className="feature-error-boundary__overlay-title">
                                {critical ? '🚨 Critical Feature Error' : '⚠️ Feature Error'}
                            </h2>
                            <p className="feature-error-boundary__overlay-message">
                                {featureName} has encountered an error and needs to be restarted.
                            </p>
                            <div className="feature-error-boundary__overlay-actions">
                                {canRetry && (
                                    <button
                                        className="feature-error-boundary__button feature-error-boundary__button--primary"
                                        onClick={this.handleRetry}
                                    >
                                        Restart Feature
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            );
        }
    }

    render() {
        const { hasError, isDegraded, isDisabled } = this.state;
        const {
            fallback: CustomFallback,
            degradedMode: DegradedMode,
            featureName,
            children,
        } = this.props;

        // Feature is disabled - show nothing or minimal placeholder
        if (isDisabled) {
            return (
                <div
                    className="feature-error-boundary feature-error-boundary--disabled"
                    aria-hidden="true"
                >
                    <div className="feature-error-boundary__disabled-notice">
                        <span className="feature-error-boundary__disabled-icon">⚠️</span>
                        <span className="feature-error-boundary__disabled-text">
                            {featureName} temporarily unavailable
                        </span>
                    </div>
                </div>
            );
        }

        // Feature is in degraded mode - show alternative component
        if (isDegraded && DegradedMode) {
            return (
                <div className="feature-error-boundary feature-error-boundary--degraded">
                    <div className="feature-error-boundary__degraded-notice">
                        ⚡ {featureName} running in limited mode
                    </div>
                    <DegradedMode />
                </div>
            );
        }

        // Has error - show error UI
        if (hasError) {
            if (CustomFallback) {
                return (
                    <CustomFallback
                        error={this.state.error}
                        retry={this.handleRetry}
                        featureName={featureName}
                        retryCount={this.state.retryCount}
                    />
                );
            }

            return this.renderError();
        }

        // Normal operation
        return children;
    }
}

FeatureErrorBoundaryBase.propTypes = {
    children: PropTypes.node.isRequired,
    featureName: PropTypes.string.isRequired,
    featureDescription: PropTypes.string,
    critical: PropTypes.bool,
    onError: PropTypes.func,
    onFeatureDisabled: PropTypes.func,
    fallback: PropTypes.elementType,
    degradedMode: PropTypes.elementType,
    allowDegradation: PropTypes.bool,
    maxRetries: PropTypes.number,
    showInlineError: PropTypes.bool,
    reportError: PropTypes.func,
};

/**
 * Wrapper component that connects FeatureErrorBoundaryBase to GlobalErrorProvider
 */
function FeatureErrorBoundary(props) {
    const globalErrorContext = useGlobalError();

    return <FeatureErrorBoundaryBase {...props} reportError={globalErrorContext?.reportError} />;
}

FeatureErrorBoundary.propTypes = FeatureErrorBoundaryBase.propTypes;

export default FeatureErrorBoundary;
