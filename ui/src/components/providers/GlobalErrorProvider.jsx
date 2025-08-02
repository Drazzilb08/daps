import React, { createContext, useContext, useState, useEffect } from 'react';
import { useToast } from '../providers/ToastProvider';

// ----- GLOBAL ERROR CONTEXT -----
const GlobalErrorContext = createContext();

export function useGlobalError() {
    return useContext(GlobalErrorContext);
}

// ----- UTILITY DEBUG FUNCTIONS -----
function getFieldRendererDebug(fieldRenderers) {
    if (fieldRenderers) {
        return Object.entries(fieldRenderers)
            .map(
                ([key, val]) =>
                    `${key}: ${typeof val} ${
                        val && val.name ? `(${val.name})` : val === undefined ? 'undefined' : ''
                    }`
            )
            .join('\n');
    }
    return '(FIELD_RENDERERS not available)';
}

function getRecentFieldRegistryState(fieldRenderers, settingsSchema) {
    let out = '';
    if (fieldRenderers) {
        out += 'FIELD_RENDERERS keys:\n';
        out += Object.keys(fieldRenderers).join(', ') + '\n\n';
    }
    if (settingsSchema) {
        out += 'SETTINGS_SCHEMA keys:\n';
        out += settingsSchema.map(m => m.key).join(', ') + '\n\n';
    }
    return out || '(No FIELD_RENDERERS/SETTINGS_SCHEMA in scope)';
}

// ----- ERROR BOUNDARY CLASS -----
class GlobalErrorBoundary extends React.Component {
    static contextType = GlobalErrorContext;

    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, info: null, copied: false };
        this.copyError = this.copyError.bind(this);
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, info) {
        this.setState({ info });
        // Push error to global context
        const { setGlobalError } = this.context || {};
        setGlobalError?.({
            type: 'react',
            message: error?.message || 'React error',
            error,
            info,
            time: new Date().toISOString(),
        });
        // Show toast for react render errors
        if (this.props.toast) {
            this.props.toast('A React error occurred. Check debug details.', 'error', 12000);
        }
    }

    copyError() {
        const { error, info } = this.state;
        const { fieldRenderers, settingsSchema } = this.props;
        let message = '';
        message += `URL: ${window.location.href}\n\n`;
        if (error && error.name) message += `Error Name: ${error.name}\n`;
        if (error && error.message) message += `Message: ${error.message}\n`;
        if (error && error.stack) message += `Stack:\n${error.stack}\n\n`;
        if (info && info.componentStack)
            message += `React Component Stack:\n${info.componentStack}\n\n`;

        if (fieldRenderers) {
            message += '\nFIELD_RENDERERS:\n';
            message += getFieldRendererDebug(fieldRenderers);
        }
        if (settingsSchema) {
            message += '\n\nSETTINGS_SCHEMA:\n';
            message += JSON.stringify(settingsSchema, null, 2);
        }

        navigator.clipboard.writeText(message).then(() => {
            this.setState({ copied: true });
            setTimeout(() => this.setState({ copied: false }), 1500);
        });
    }

    render() {
        const { error, info, hasError, copied } = this.state;
        const { globalError } = this.context || {};
        const { fieldRenderers, settingsSchema } = this.props;

        // Prefer React error boundary, fallback to globalError if present
        const toShow = hasError
            ? { error, info }
            : globalError
              ? { error: globalError.error }
              : null;

        if (toShow?.error) {
            // Error UI is unchanged from your ErrorBoundary
            const err = toShow.error;
            const isElementTypeInvalid =
                err &&
                typeof err.message === 'string' &&
                err.message.includes('Element type is invalid');
            const registryDebug = getFieldRendererDebug(fieldRenderers);
            const extraDebug = getRecentFieldRegistryState(fieldRenderers, settingsSchema);

            return (
                <div
                    className="error-boundary"
                    style={{
                        fontFamily: 'var(--font-family)',
                        background: 'var(--surface)',
                        color: 'var(--text-color)',
                        border: '2px solid var(--error)',
                        borderRadius: '12px',
                        boxShadow: '0 2px 16px 0 rgba(24, 25, 31, 0.12)',
                        margin: '3rem auto',
                        maxWidth: 700,
                        padding: '2.5rem 2rem 2rem 2rem',
                        position: 'relative',
                    }}
                >
                    <h2
                        style={{
                            color: 'var(--error-highlight)',
                            fontWeight: 700,
                            margin: 0,
                            fontSize: '2rem',
                            letterSpacing: '0.01em',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.6em',
                        }}
                    >
                        <span role="img" aria-label="error">
                            🐞
                        </span>
                        Error in this Section (Debug Mode)
                    </h2>
                    <div
                        style={{
                            color: 'var(--muted)',
                            fontSize: '0.96em',
                            margin: '0.5em 0 1.2em 0',
                        }}
                    >
                        <span style={{ color: 'var(--text-color)', fontWeight: 600 }}>URL:</span>{' '}
                        <code style={{ color: 'var(--accent)', background: 'transparent' }}>
                            {window.location.href}
                        </code>
                    </div>
                    <pre
                        style={{
                            background: 'var(--input-bg)',
                            color: 'var(--error)',
                            border: '1px solid var(--error-highlight)',
                            borderRadius: '8px',
                            padding: '1.25em',
                            fontSize: '1em',
                            overflowX: 'auto',
                            marginBottom: '1em',
                            maxHeight: 340,
                        }}
                    >
                        {(err && err.name ? err.name + ': ' : '') +
                            (err && err.message
                                ? err.message
                                : String(err || '(no error message)'))}
                        {'\n'}
                        {err && err.stack ? '\n' + err.stack : ''}
                    </pre>
                    {info && info.componentStack && (
                        <details
                            open
                            style={{
                                background: 'var(--surface-alt)',
                                color: 'var(--muted)',
                                border: '1px solid var(--divider)',
                                borderRadius: '8px',
                                padding: '0.8em 1em',
                                marginBottom: '1.2em',
                                fontSize: '0.97em',
                                whiteSpace: 'pre-wrap',
                                maxHeight: 260,
                                overflow: 'auto',
                            }}
                        >
                            <summary
                                style={{
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                    color: 'var(--text-color)',
                                    outline: 'none',
                                }}
                            >
                                Component Stack Trace
                            </summary>
                            {info.componentStack}
                        </details>
                    )}
                    {/* Debug dump for registry & schema */}
                    <details open style={{ margin: '1em 0' }}>
                        <summary
                            style={{ color: 'var(--error)', fontWeight: 600, cursor: 'pointer' }}
                        >
                            FIELD_RENDERERS & Schema Debug
                        </summary>
                        <pre
                            style={{
                                fontSize: '0.95em',
                                color: '#a50',
                                maxHeight: 120,
                                overflow: 'auto',
                            }}
                        >
                            {registryDebug}
                        </pre>
                        <pre
                            style={{
                                fontSize: '0.9em',
                                color: '#789',
                                marginTop: 8,
                                maxHeight: 100,
                                overflow: 'auto',
                            }}
                        >
                            {extraDebug}
                        </pre>
                    </details>
                    {/* Extra context for "Element type is invalid" */}
                    {isElementTypeInvalid && (
                        <div
                            style={{
                                color: 'var(--error)',
                                fontSize: '1em',
                                marginBottom: '1.4em',
                            }}
                        >
                            <strong>🛑 Element type is invalid:</strong>
                            <br />
                            This usually means a component is <code>undefined</code> in
                            FIELD_RENDERERS.
                            <br />
                            <ul>
                                <li>
                                    <strong>Check imports/exports</strong> for the field type listed
                                    in your settings schema.
                                </li>
                                <li>
                                    <strong>
                                        Did you forget <code>export</code> or use{' '}
                                        <code>default</code> incorrectly?
                                    </strong>
                                </li>
                                <li>See FIELD_RENDERERS debug info above.</li>
                            </ul>
                        </div>
                    )}
                    {/* All settings module/field info */}
                    <details>
                        <summary>All Settings Modules / Fields</summary>
                        <pre
                            style={{
                                fontSize: '0.91em',
                                color: 'var(--text-color',
                                maxHeight: 210,
                                overflow: 'auto',
                            }}
                        >
                            {settingsSchema
                                ? JSON.stringify(settingsSchema, null, 2)
                                : '(no SETTINGS_SCHEMA)'}
                        </pre>
                    </details>
                    <div style={{ display: 'flex', gap: 12, marginBottom: '0.5em' }}>
                        <button
                            onClick={this.copyError}
                            style={{
                                background: copied ? 'var(--accent)' : 'var(--toolbar)',
                                color: copied ? '#fff' : 'var(--text-color)',
                                border: '1px solid var(--accent-dark)',
                                borderRadius: '6px',
                                padding: '0.6em 1.7em',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'background .12s',
                                fontFamily: 'var(--font-family)',
                            }}
                        >
                            {copied ? 'Copied!' : 'Copy Error + Debug'}
                        </button>
                        <button
                            onClick={() => window.location.reload()}
                            style={{
                                background: 'var(--toolbar)',
                                color: 'var(--text-color)',
                                border: '1px solid var(--divider)',
                                borderRadius: '6px',
                                padding: '0.6em 1.7em',
                                fontWeight: 600,
                                cursor: 'pointer',
                                fontFamily: 'var(--font-family)',
                            }}
                        >
                            Reload Page
                        </button>
                    </div>
                    <div
                        style={{
                            color: 'var(--muted)',
                            fontSize: '0.92em',
                            marginTop: 8,
                            textAlign: 'center',
                        }}
                    >
                        If you keep seeing this,{' '}
                        <span style={{ color: 'var(--accent)' }}>copy</span> and share this error
                        (including debug) with support/devs.
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

// ----- PROVIDER COMPONENT -----
export function GlobalErrorProvider({ children, fieldRenderers, settingsSchema }) {
    const [globalError, setGlobalError] = useState(null);
    const toast = useToast();

    useEffect(() => {
        // Global JS errors
        const onError = (message, source, lineno, colno, error) => {
            const errObj = {
                type: 'error',
                message: message?.toString?.() || 'Unknown JS error',
                source,
                lineno,
                colno,
                error,
                time: new Date().toISOString(),
            };
            setGlobalError(errObj);

            // Show toast
            toast(
                `A JavaScript error occurred. Check logs for details.`,
                'error',
                12000 // show longer
            );
        };

        // Unhandled promise rejections
        const onUnhandledRejection = event => {
            const errObj = {
                type: 'unhandledrejection',
                reason: event.reason?.toString?.() || 'Unknown rejection',
                error: event.reason,
                time: new Date().toISOString(),
            };
            setGlobalError(errObj);

            // Show toast
            toast(
                `An unhandled promise rejection occurred. Check logs for details.`,
                'error',
                12000 // show longer
            );
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
