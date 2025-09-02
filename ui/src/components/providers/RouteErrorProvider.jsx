import React from 'react';
import PropTypes from 'prop-types';

function getComprehensiveDebugInfo(routeName, error, errorInfo) {
    const now = new Date();
    const info = {
        // Basic Info
        timestamp: now.toISOString(),
        route: routeName,
        url: window.location.href,

        // Error Details
        errorName: error?.name || 'Unknown',
        errorMessage: error?.message || 'No message',
        errorStack: error?.stack || 'No stack trace',

        // Browser Environment
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        screen: `${screen.width}x${screen.height}`,

        // Performance & Memory
        memoryUsage: performance.memory
            ? {
                  used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) + ' MB',
                  total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024) + ' MB',
                  limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024) + ' MB',
              }
            : 'Not available',

        // Navigation
        referrer: document.referrer || 'Direct',
        historyLength: window.history.length,

        // Local Storage (safe keys only)
        localStorageKeys: Object.keys(localStorage).filter(
            key => !key.includes('token') && !key.includes('secret') && !key.includes('key')
        ),

        // React Component Info
        componentStack: errorInfo?.componentStack || 'Not available',

        // Network Status
        onlineStatus: navigator.onLine,

        // Timing
        pageLoadTime: performance.timing
            ? performance.timing.loadEventEnd - performance.timing.navigationStart
            : 'Unknown',
    };

    return info;
}

function formatDebugReport(debugInfo) {
    return `=== DAPS ROUTE ERROR REPORT ===

BASIC INFO:
- Timestamp: ${debugInfo.timestamp}
- Route: ${debugInfo.route}
- URL: ${debugInfo.url}
- Referrer: ${debugInfo.referrer}

ERROR DETAILS:
- Type: ${debugInfo.errorName}
- Message: ${debugInfo.errorMessage}

BROWSER ENVIRONMENT:
- User Agent: ${debugInfo.userAgent}
- Platform: ${debugInfo.platform}
- Language: ${debugInfo.language}
- Viewport: ${debugInfo.viewport}
- Screen: ${debugInfo.screen}
- Online: ${debugInfo.onlineStatus}

PERFORMANCE:
- Memory Usage: ${
        typeof debugInfo.memoryUsage === 'object'
            ? `${debugInfo.memoryUsage.used}/${debugInfo.memoryUsage.total} (limit: ${debugInfo.memoryUsage.limit})`
            : debugInfo.memoryUsage
    }
- Page Load Time: ${debugInfo.pageLoadTime}ms
- History Length: ${debugInfo.historyLength}

LOCAL STORAGE KEYS:
${debugInfo.localStorageKeys.length > 0 ? debugInfo.localStorageKeys.join(', ') : 'None'}

REACT COMPONENT STACK:
${debugInfo.componentStack}

ERROR STACK TRACE:
${debugInfo.errorStack}

=== END REPORT ===

Please share this report when seeking support.`;
}

class RouteErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
            debugInfo: null,
            copied: false,
        };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        const debugInfo = getComprehensiveDebugInfo(this.props.routeName, error, errorInfo);

        this.setState({
            errorInfo,
            debugInfo,
        });

        console.group(`🚨 Route Error: ${this.props.routeName}`);
        console.error('Error:', error);
        console.error('Error Info:', errorInfo);
        console.error('Debug Info:', debugInfo);
        console.groupEnd();
    }

    handleRetry = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
            debugInfo: null,
            copied: false,
        });
    };

    copyDebugReport = () => {
        if (this.state.debugInfo) {
            const report = formatDebugReport(this.state.debugInfo);
            navigator.clipboard.writeText(report).then(() => {
                this.setState({ copied: true });
                setTimeout(() => this.setState({ copied: false }), 3000);
            });
        }
    };

    render() {
        if (this.state.hasError) {
            const { routeName } = this.props;
            const { error, debugInfo, copied } = this.state;

            const containerStyle = {
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '400px',
                padding: '2rem',
                fontFamily: 'var(--font-family)',
                background: 'var(--surface)',
                color: 'var(--text-color)',
            };

            const errorBoxStyle = {
                maxWidth: '600px',
                width: '100%',
                background: 'var(--surface-alt)',
                border: '2px solid var(--error)',
                borderRadius: '12px',
                padding: '2rem',
                boxShadow: 'var(--shadow-3)',
            };

            const titleStyle = {
                color: 'var(--error)',
                fontSize: '1.5rem',
                fontWeight: '600',
                margin: '0 0 1rem 0',
                textAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
            };

            const messageStyle = {
                color: 'var(--text-secondary)',
                textAlign: 'center',
                marginBottom: '1.5rem',
                lineHeight: '1.5',
            };

            const errorDetailStyle = {
                background: 'var(--input-bg)',
                border: '1px solid var(--error)',
                borderRadius: '6px',
                padding: '1rem',
                marginBottom: '1.5rem',
                fontFamily: 'monospace',
                fontSize: '0.9rem',
                color: 'var(--error)',
                wordBreak: 'break-word',
            };

            const buttonGroupStyle = {
                display: 'flex',
                gap: '1rem',
                justifyContent: 'center',
                marginBottom: '1rem',
                flexWrap: 'wrap',
            };

            const primaryButtonStyle = {
                background: 'var(--accent)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '0.75rem 1.5rem',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '0.95rem',
                transition: 'opacity 0.2s',
            };

            const secondaryButtonStyle = {
                background: 'var(--toolbar)',
                color: 'var(--text-color)',
                border: '1px solid var(--divider)',
                borderRadius: '6px',
                padding: '0.75rem 1.5rem',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '0.95rem',
            };

            const copyButtonStyle = {
                ...primaryButtonStyle,
                background: copied ? 'var(--success)' : 'var(--surface-variant)',
            };

            const detailsStyle = {
                marginTop: '1rem',
                width: '100%',
            };

            const summaryStyle = {
                cursor: 'pointer',
                fontWeight: '600',
                padding: '0.5rem 0',
                color: 'var(--text-color)',
                borderBottom: '1px solid var(--divider)',
            };

            const debugContentStyle = {
                background: 'var(--input-bg)',
                border: '1px solid var(--divider)',
                borderRadius: '6px',
                padding: '1rem',
                marginTop: '0.5rem',
                fontSize: '0.8rem',
                fontFamily: 'monospace',
                maxHeight: '300px',
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
                color: 'var(--text-secondary)',
            };

            const helpTextStyle = {
                textAlign: 'center',
                fontSize: '0.85rem',
                color: 'var(--text-secondary)',
                marginTop: '1rem',
                fontStyle: 'italic',
            };

            return (
                <div style={containerStyle}>
                    <div style={errorBoxStyle}>
                        <h2 style={titleStyle}>🛠️ {routeName} Error</h2>

                        <p style={messageStyle}>
                            Something went wrong in this section. Other parts of DAPS should still
                            work normally.
                        </p>

                        <div style={errorDetailStyle}>
                            <strong>{error?.name || 'Error'}:</strong>{' '}
                            {error?.message || 'Unknown error occurred'}
                        </div>

                        <div style={buttonGroupStyle}>
                            <button style={primaryButtonStyle} onClick={this.handleRetry}>
                                🔄 Try Again
                            </button>

                            <button
                                style={secondaryButtonStyle}
                                onClick={() => (window.location.href = '/')}
                            >
                                🏠 Go Home
                            </button>

                            <button style={copyButtonStyle} onClick={this.copyDebugReport}>
                                {copied ? '✅ Copied!' : '📋 Copy Debug Report'}
                            </button>
                        </div>

                        <details style={detailsStyle}>
                            <summary style={summaryStyle}>🔍 Debug Information for Support</summary>
                            <div style={debugContentStyle}>
                                {debugInfo
                                    ? formatDebugReport(debugInfo)
                                    : 'Debug info not available'}
                            </div>
                        </details>

                        <p style={helpTextStyle}>
                            💡 Copy the debug report above to share with support for faster problem
                            resolution.
                        </p>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

RouteErrorBoundary.propTypes = {
    children: PropTypes.node.isRequired,
    routeName: PropTypes.string.isRequired,
};

export default RouteErrorBoundary;
