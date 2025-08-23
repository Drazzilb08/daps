import React, { createContext, useContext, useState, useEffect } from 'react';
import { useToast } from '../providers/ToastProvider';

const GlobalErrorContext = createContext();

/**
 * Hook to access global error context
 *
 * Provides access to error reporting and debugging utilities for components
 * that need to report errors or access error state.
 *
 * @returns {Object} Global error context value
 * @returns {Function} returns.reportError - Function to report errors manually
 * @returns {Array} returns.errors - Array of reported errors
 * @returns {Function} returns.clearErrors - Function to clear error state
 *
 * @example
 * function MyComponent() {
 *   const { reportError } = useGlobalError();
 *
 *   const handleRiskyOperation = async () => {
 *     try {
 *       await riskyApiCall();
 *     } catch (error) {
 *       reportError(error, { context: 'MyComponent' });
 *     }
 *   };
 * }
 */
export function useGlobalError() {
    return useContext(GlobalErrorContext);
}

/**
 * Generate safe debug information for field renderers without exposing secrets
 *
 * Creates debugging output that shows field renderer availability and types
 * without revealing sensitive configuration data or function implementations.
 *
 * @param {Object} fieldRenderers - Field renderer registry object
 * @returns {string} Safe debug information string
 */
function getSafeFieldRendererDebug(fieldRenderers) {
    if (fieldRenderers) {
        return Object.entries(fieldRenderers)
            .map(
                ([key, val]) =>
                    `${key}: ${typeof val}${val?.name ? ` (${val.name})` : val === undefined ? ' undefined' : ''}`
            )
            .join('\n');
    }
    return '(FIELD_RENDERERS not available)';
}

/**
 * Generate safe debug information for settings schema without exposing sensitive values
 *
 * Creates a sanitized view of the settings schema that shows structure and field
 * types while protecting sensitive configuration values and internal details.
 *
 * @param {Array} settingsSchema - Array of module schema definitions
 * @returns {Array|null} Sanitized schema structure or null if unavailable
 */
function getSafeSchemaDebug(settingsSchema) {
    if (settingsSchema) {
        // Only expose structure, not sensitive values
        return settingsSchema.map(module => ({
            key: module.key,
            fields:
                module.fields?.map(field => ({
                    key: field.key,
                    type: field.type,
                    required: field.required,
                })) || [],
        }));
    }
    return null;
}

/**
 * Collect safe browser environment information for error reporting
 *
 * Gathers non-sensitive browser and environment data that helps with
 * debugging errors without exposing user privacy or sensitive information.
 *
 * @returns {Object} Browser environment information
 * @returns {string} returns.userAgent - Browser user agent string
 * @returns {string} returns.url - Current page URL
 * @returns {string} returns.timestamp - ISO timestamp of error
 * @returns {string} returns.viewport - Browser viewport dimensions
 * @returns {string} returns.platform - Operating system platform
 */
function getBrowserInfo() {
    return {
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        platform: navigator.platform,
    };
}

class GlobalErrorBoundary extends React.Component {
    static contextType = GlobalErrorContext;

    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, info: null, copied: false };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, info) {
        this.setState({ info });

        const { setGlobalError } = this.context || {};
        setGlobalError?.({
            type: 'react',
            message: error?.message || 'React error',
            error,
            info,
            browserInfo: getBrowserInfo(),
            time: new Date().toISOString(),
        });

        if (this.props.toast) {
            this.props.toast('A critical error occurred. Check debug details.', 'error', 15000);
        }
    }

    copyError = () => {
        const { error, info } = this.state;
        const { fieldRenderers, settingsSchema } = this.props;
        const browserInfo = getBrowserInfo();

        let message = '=== DAPS ERROR REPORT ===\n\n';
        message += `Timestamp: ${browserInfo.timestamp}\n`;
        message += `URL: ${browserInfo.url}\n`;
        message += `Browser: ${browserInfo.userAgent}\n`;
        message += `Viewport: ${browserInfo.viewport}\n\n`;

        if (error) {
            message += `Error Type: ${error.name || 'Unknown'}\n`;
            message += `Message: ${error.message || 'No message'}\n\n`;
            message += `Stack Trace:\n${error.stack || 'No stack trace'}\n\n`;
        }

        if (info?.componentStack) {
            message += `React Component Stack:\n${info.componentStack}\n\n`;
        }

        // Safe debug info (no secrets)
        if (fieldRenderers) {
            message += `Field Renderers Available:\n${getSafeFieldRendererDebug(fieldRenderers)}\n\n`;
        }

        const safeSchema = getSafeSchemaDebug(settingsSchema);
        if (safeSchema) {
            message += `Settings Schema Structure:\n${JSON.stringify(safeSchema, null, 2)}\n\n`;
        }

        message += '=== END REPORT ===';

        navigator.clipboard.writeText(message).then(() => {
            this.setState({ copied: true });
            setTimeout(() => this.setState({ copied: false }), 2000);
        });
    };

    render() {
        const { error, info, hasError, copied } = this.state;
        const { globalError } = this.context || {};

        const toShow = hasError
            ? { error, info }
            : globalError
              ? { error: globalError.error }
              : null;

        if (toShow?.error) {
            const err = toShow.error;
            const isElementTypeInvalid = err?.message?.includes('Element type is invalid');

            return (
                <div
                    style={{
                        fontFamily: 'var(--font-family)',
                        background: 'var(--surface)',
                        color: 'var(--text-color)',
                        border: '2px solid var(--error)',
                        borderRadius: '12px',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                        margin: '2rem auto',
                        maxWidth: '800px',
                        padding: '2rem',
                    }}
                >
                    <h2
                        style={{
                            color: 'var(--error)',
                            fontSize: '1.8rem',
                            margin: '0 0 1rem 0',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                        }}
                    >
                        🚨 Critical Application Error
                    </h2>

                    <div
                        style={{
                            background: 'var(--input-bg)',
                            border: '1px solid var(--error)',
                            borderRadius: '8px',
                            padding: '1rem',
                            marginBottom: '1rem',
                            fontFamily: 'monospace',
                            fontSize: '0.9rem',
                            color: 'var(--error)',
                        }}
                    >
                        <strong>{err?.name || 'Error'}:</strong>{' '}
                        {err?.message || 'Unknown error occurred'}
                    </div>

                    {isElementTypeInvalid && (
                        <div
                            style={{
                                background: '#fff3cd',
                                border: '1px solid #ffeaa7',
                                borderRadius: '6px',
                                padding: '1rem',
                                marginBottom: '1rem',
                                color: '#856404',
                            }}
                        >
                            <strong>💡 Component Issue:</strong> This usually means a React
                            component is undefined. Check imports/exports in your field renderers.
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                        <button
                            onClick={this.copyError}
                            style={{
                                background: copied ? '#28a745' : 'var(--accent)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '0.75rem 1.5rem',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'background 0.2s',
                            }}
                        >
                            {copied ? '✓ Copied!' : '📋 Copy Debug Report'}
                        </button>

                        <button
                            onClick={() => window.location.reload()}
                            style={{
                                background: 'var(--toolbar)',
                                color: 'var(--text-color)',
                                border: '1px solid var(--divider)',
                                borderRadius: '6px',
                                padding: '0.75rem 1.5rem',
                                fontWeight: '600',
                                cursor: 'pointer',
                            }}
                        >
                            🔄 Reload App
                        </button>
                    </div>

                    <details
                        style={{
                            background: 'var(--surface-alt)',
                            border: '1px solid var(--divider)',
                            borderRadius: '6px',
                            padding: '1rem',
                        }}
                    >
                        <summary
                            style={{
                                cursor: 'pointer',
                                fontWeight: '600',
                                marginBottom: '0.5rem',
                            }}
                        >
                            Technical Details
                        </summary>
                        <pre
                            style={{
                                fontSize: '0.8rem',
                                overflow: 'auto',
                                maxHeight: '200px',
                                margin: 0,
                                whiteSpace: 'pre-wrap',
                            }}
                        >
                            {err?.stack || 'No stack trace available'}
                        </pre>
                    </details>

                    <p
                        style={{
                            textAlign: 'center',
                            marginTop: '1.5rem',
                            color: 'var(--text-secondary)',
                            fontSize: '0.9rem',
                        }}
                    >
                        Copy the debug report above to share with support for faster resolution.
                    </p>
                </div>
            );
        }

        return this.props.children;
    }
}

export function GlobalErrorProvider({ children, fieldRenderers, settingsSchema }) {
    const [globalError, setGlobalError] = useState(null);
    const toast = useToast();

    useEffect(() => {
        const onError = (message, source, lineno, colno, error) => {
            const errObj = {
                type: 'error',
                message: message?.toString?.() || 'Unknown JS error',
                source,
                lineno,
                colno,
                error,
                browserInfo: getBrowserInfo(),
                time: new Date().toISOString(),
            };
            setGlobalError(errObj);
            toast('A JavaScript error occurred. Check error details.', 'error', 10000);
        };

        const onUnhandledRejection = event => {
            const errObj = {
                type: 'unhandledrejection',
                reason: event.reason?.toString?.() || 'Unknown rejection',
                error: event.reason,
                browserInfo: getBrowserInfo(),
                time: new Date().toISOString(),
            };
            setGlobalError(errObj);
            toast('An unhandled promise rejection occurred.', 'error', 10000);
        };

        window.addEventListener('error', onError);
        window.addEventListener('unhandledrejection', onUnhandledRejection);

        return () => {
            window.removeEventListener('error', onError);
            window.removeEventListener('unhandledrejection', onUnhandledRejection);
        };
    }, [toast]);

    return (
        <GlobalErrorContext.Provider value={{ globalError, setGlobalError }}>
            <GlobalErrorBoundary
                fieldRenderers={fieldRenderers}
                settingsSchema={settingsSchema}
                toast={toast}
            >
                {children}
            </GlobalErrorBoundary>
        </GlobalErrorContext.Provider>
    );
}
