import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { useGlobalError } from './providers/GlobalErrorProvider';

/**
 * Generic Error Boundary for graceful degradation
 *
 * Provides reusable error boundary functionality that integrates with the existing
 * GlobalErrorProvider system. Can be used to protect any component tree with
 * customizable fallback UI and recovery options.
 *
 * @param {Object} props - Component props
 * @param {React.Component} [props.fallback] - Custom fallback component to render on error
 * @param {Function} [props.onError] - Callback when error occurs (error, errorInfo) => void
 * @param {boolean} [props.showRetry=true] - Whether to show retry button
 * @param {boolean} [props.showReload=true] - Whether to show reload button
 * @param {boolean} [props.isolate=false] - If true, prevents error from reaching parent boundaries
 * @param {string} [props.context] - Context name for error reporting (helps identify error source)
 * @param {React.ReactNode} props.children - Child components to protect
 *
 * @example
 * // Basic usage
 * <ErrorBoundary>
 *   <SomeComponent />
 * </ErrorBoundary>
 *
 * @example
 * // With custom fallback
 * <ErrorBoundary
 *   fallback={CustomErrorComponent}
 *   context="SearchInterface"
 *   onError={(error) => console.log('Search failed:', error)}
 * >
 *   <SearchInterface />
 * </ErrorBoundary>
 */
class ErrorBoundaryBase extends Component {
    constructor(props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
            retryCount: 0,
            errorId: null,
        };
    }

    static getDerivedStateFromError(error) {
        return {
            hasError: true,
            error,
            errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        };
    }

    componentDidCatch(error, errorInfo) {
        const { onError, context, reportError } = this.props;

        this.setState({ errorInfo });

        // Report to GlobalErrorProvider if available
        if (reportError) {
            reportError(error, {
                context: context || 'ErrorBoundary',
                errorInfo,
                retryCount: this.state.retryCount,
                component: 'ErrorBoundary',
                timestamp: new Date().toISOString(),
            });
        }

        // Call custom error handler
        if (onError) {
            onError(error, errorInfo);
        }

        // Log to console for development
        console.group(`🔴 ErrorBoundary: ${context || 'Unknown Context'}`);
        console.error('Error:', error);
        console.error('Error Info:', errorInfo);
        console.error('Props Context:', context);
        console.groupEnd();
    }

    handleRetry = () => {
        this.setState(prevState => ({
            hasError: false,
            error: null,
            errorInfo: null,
            retryCount: prevState.retryCount + 1,
            errorId: null,
        }));
    };

    handleReload = () => {
        window.location.reload();
    };

    render() {
        const { hasError, error, retryCount, errorId } = this.state;
        const {
            fallback: CustomFallback,
            showRetry = true,
            showReload = true,
            context,
            children,
        } = this.props;

        if (hasError) {
            // Use custom fallback if provided
            if (CustomFallback) {
                return (
                    <CustomFallback
                        error={error}
                        retry={this.handleRetry}
                        reload={this.handleReload}
                        context={context}
                        retryCount={retryCount}
                        errorId={errorId}
                    />
                );
            }

            // Default fallback UI
            return (
                <div className="error-boundary">
                    <div className="error-boundary__container">
                        <div className="error-boundary__header">
                            <span className="error-boundary__icon">⚠️</span>
                            <h3 className="error-boundary__title">Something went wrong</h3>
                        </div>

                        <div className="error-boundary__content">
                            <p className="error-boundary__message">
                                {context
                                    ? `An error occurred in ${context}.`
                                    : 'An unexpected error occurred.'}
                                {retryCount > 0 && ` (Attempt ${retryCount + 1})`}
                            </p>

                            <div className="error-boundary__error-details">
                                <strong>Error:</strong> {error?.message || 'Unknown error'}
                            </div>

                            <div className="error-boundary__actions">
                                {showRetry && (
                                    <button
                                        className="error-boundary__button error-boundary__button--primary"
                                        onClick={this.handleRetry}
                                        aria-label={`Retry ${context || 'operation'}`}
                                    >
                                        <span className="error-boundary__button-icon">🔄</span>
                                        Try Again
                                    </button>
                                )}

                                {showReload && (
                                    <button
                                        className="error-boundary__button error-boundary__button--secondary"
                                        onClick={this.handleReload}
                                        aria-label="Reload the page"
                                    >
                                        <span className="error-boundary__button-icon">🔄</span>
                                        Reload Page
                                    </button>
                                )}
                            </div>

                            {retryCount > 2 && (
                                <div className="error-boundary__help">
                                    <p className="error-boundary__help-text">
                                        💡 Still having issues? Try refreshing the page or check
                                        your internet connection.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            );
        }

        return children;
    }
}

ErrorBoundaryBase.propTypes = {
    children: PropTypes.node.isRequired,
    fallback: PropTypes.elementType,
    onError: PropTypes.func,
    showRetry: PropTypes.bool,
    showReload: PropTypes.bool,
    isolate: PropTypes.bool,
    context: PropTypes.string,
    reportError: PropTypes.func,
};

/**
 * Wrapper component that connects ErrorBoundaryBase to GlobalErrorProvider
 */
function ErrorBoundary(props) {
    const globalErrorContext = useGlobalError();

    return <ErrorBoundaryBase {...props} reportError={globalErrorContext?.reportError} />;
}

ErrorBoundary.propTypes = ErrorBoundaryBase.propTypes;

export default ErrorBoundary;
