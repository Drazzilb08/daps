import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { ErrorContainer, ErrorIcon, ErrorMessage, ErrorActions } from './primitives';

/**
 * ErrorBoundary - Base error boundary class composing all primitives
 *
 * This base class provides:
 * - Error state management with retry counting
 * - Standard recovery actions (retry, home, back, copy, refresh)
 * - Primitive composition for consistent error display
 * - Extension points for specialized boundaries
 *
 * Specialized boundaries (PageErrorBoundary, FeatureErrorBoundary) extend this base.
 */
export class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
            errorCount: 0,
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
        this.setState(prevState => ({
            errorInfo,
            errorCount: prevState.errorCount + 1,
        }));

        console.error('ErrorBoundary caught:', error, errorInfo);
        this.props.onError?.(error, errorInfo);
    }

    handleAction = actionId => {
        const { onAction } = this.props;

        switch (actionId) {
            case 'retry':
                this.setState({
                    hasError: false,
                    error: null,
                    errorInfo: null,
                    errorTimestamp: null,
                });
                break;
            case 'home':
                window.location.href = '/';
                break;
            case 'back':
                window.history.back();
                break;
            case 'copy':
                this.copyErrorToClipboard();
                break;
            case 'refresh':
                window.location.reload();
                break;
            default:
                onAction?.(actionId);
        }
    };

    copyErrorToClipboard = async () => {
        const { error, errorInfo, errorCount, errorTimestamp } = this.state;

        this.setState({ copying: true });

        const errorDetails = {
            timestamp: errorTimestamp,
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
                boundaryType: this.constructor.name,
                retryCount: errorCount,
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
            console.group('🚨 ERROR DETAILS (Manual Copy)');
            console.log(JSON.stringify(errorDetails, null, 2));
            console.groupEnd();
        }
    };

    render() {
        const { hasError, error, errorInfo, errorCount, errorTimestamp } = this.state;
        const { children, title, message, mode, variant, actions, fallback } = this.props;

        if (!hasError) return children;

        if (fallback) {
            return fallback({ error, errorInfo, reset: () => this.handleAction('retry') });
        }

        const errorActions = actions || this.getDefaultActions();

        return (
            <ErrorContainer mode={mode || 'page'}>
                <ErrorIcon type={variant || 'error'} size={mode === 'inline' ? 'sm' : 'lg'} />
                <ErrorMessage
                    title={title || 'Something went wrong'}
                    message={message || error?.message || 'An unexpected error occurred'}
                    componentStack={errorInfo?.componentStack}
                    retryCount={errorCount}
                    errorTimestamp={errorTimestamp}
                    mode={mode === 'inline' ? 'inline' : 'page'}
                />
                <ErrorActions
                    actions={errorActions}
                    onAction={this.handleAction}
                    mode={mode || 'page'}
                />
            </ErrorContainer>
        );
    }

    getDefaultActions() {
        return [
            { id: 'retry', label: 'Try Again', variant: 'primary', icon: 'refresh' },
            { id: 'home', label: 'Go Home', variant: 'secondary', icon: 'home' },
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
        ];
    }
}

ErrorBoundary.propTypes = {
    children: PropTypes.node.isRequired,
    title: PropTypes.string,
    message: PropTypes.string,
    mode: PropTypes.oneOf(['modal', 'page', 'inline']),
    variant: PropTypes.oneOf(['error', 'warning', 'info']),
    actions: PropTypes.array,
    fallback: PropTypes.func,
    onError: PropTypes.func,
    onAction: PropTypes.func,
};
