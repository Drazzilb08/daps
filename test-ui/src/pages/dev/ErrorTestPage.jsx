import React, { useState } from 'react';
import { useToast } from '../../contexts/ToastContext.jsx';
import { useGlobalError, ERROR_TYPES, ERROR_SEVERITY } from '../../contexts/GlobalErrorContext.jsx';
import { PageErrorBoundary, FeatureErrorBoundary } from '../../components/error';

// Simple component that crashes when told to
const CrashComponent = ({ shouldCrash, type = 'demonstration' }) => {
    if (shouldCrash) {
        throw new Error(`${type} error for testing`);
    }

    return (
        <div className="p-4 bg-surface-elevated rounded-md border border-border">
            <p className="m-0 text-success font-medium">✅ Component working normally</p>
        </div>
    );
};

const ErrorTestPage = () => {
    const toast = useToast();
    const globalError = useGlobalError();
    const [crashes, setCrashes] = useState({
        critical: false,
        page: false,
        feature: false,
    });

    const triggerCrash = type => {
        setCrashes(prev => ({ ...prev, [type]: true }));
    };

    const resetCrash = type => {
        setCrashes(prev => ({ ...prev, [type]: false }));
    };

    const showToast = type => {
        const messages = {
            success: 'Operation completed successfully!',
            error: 'Something went wrong!',
            warning: 'Please review your settings',
            info: 'New features available',
        };
        toast[type](messages[type]);
    };

    const showGlobalError = () => {
        globalError.setError('Network connection failed. Please try again.', {
            type: ERROR_TYPES.NETWORK,
            severity: ERROR_SEVERITY.HIGH,
        });
    };

    return (
        <div className="p-3 md:p-4 max-w-4xl mx-auto">
            <div className="text-center mb-4">
                <h1 className="text-2xl font-bold text-primary mb-2">🔬 Error Handling Demonstrations</h1>
                <p className="text-base text-secondary max-w-prose mx-auto">
                    Click the buttons below to see different error handling approaches:
                </p>
            </div>

            {/* Toast Notifications */}
            <section className="mb-6 md:mb-8 p-3 md:p-4 border border-default rounded-md bg-surface">
                <h2 className="text-lg font-semibold text-primary mb-2">🍞 Toast Notifications</h2>
                <p className="text-secondary mb-2">
                    <strong className="text-primary font-medium">What it is:</strong> Small popup notifications that appear briefly
                </p>
                <p className="text-secondary mb-2">
                    <strong className="text-primary font-medium">When to use:</strong> Success confirmations, alerts, quick feedback
                </p>
                <div className="flex gap-2 flex-wrap mt-3 md:flex-row flex-col md:items-center">
                    <button
                        onClick={() => showToast('success')}
                        className="min-h-touch bg-success text-white px-3 py-2 border-none rounded-md cursor-pointer transition-colors inline-flex-center-both"
                    >
                        Success Toast
                    </button>
                    <button
                        onClick={() => showToast('error')}
                        className="min-h-touch bg-error text-white px-3 py-2 border-none rounded-md cursor-pointer transition-colors inline-flex-center-both"
                    >
                        Error Toast
                    </button>
                    <button
                        onClick={() => showToast('warning')}
                        className="min-h-touch bg-warning text-white px-3 py-2 border-none rounded-md cursor-pointer transition-colors inline-flex-center-both"
                    >
                        Warning Toast
                    </button>
                    <button
                        onClick={() => showToast('info')}
                        className="min-h-touch bg-info text-white px-3 py-2 border-none rounded-md cursor-pointer transition-colors inline-flex-center-both"
                    >
                        Info Toast
                    </button>
                </div>
            </section>

            {/* Global Error Handling */}
            <section className="mb-6 md:mb-8 p-3 md:p-4 border border-default rounded-md bg-surface">
                <h2 className="text-lg font-semibold text-primary mb-2">🌐 Global Error Handling</h2>
                <p className="text-secondary mb-2">
                    <strong className="text-primary font-medium">What it is:</strong> Centralized error handling for the entire app
                </p>
                <p className="text-secondary mb-2">
                    <strong className="text-primary font-medium">When to use:</strong> Network failures, authentication issues, server
                    errors
                </p>
                <button
                    onClick={showGlobalError}
                    className="min-h-touch bg-primary text-white px-3 py-2 border-none rounded-md cursor-pointer transition-colors inline-flex-center-both"
                >
                    Trigger Global Error
                </button>
            </section>

            {/* Critical Feature Error (Full Screen Overlay) */}
            <section className="mb-6 md:mb-8 p-3 md:p-4 border border-default rounded-md bg-surface">
                <h2 className="text-lg font-semibold text-primary mb-2">⚠️ Critical Feature Error</h2>
                <p className="text-secondary mb-2">
                    <strong className="text-primary font-medium">What it is:</strong> Full-screen overlay that blocks everything
                </p>
                <p className="text-secondary mb-2">
                    <strong className="text-primary font-medium">When to use:</strong> Essential features like navigation or
                    authentication
                </p>
                <p className="text-secondary mb-2">
                    <strong className="text-primary font-medium">Visual behavior:</strong> Covers entire screen, forces user to resolve
                </p>

                <button
                    onClick={() => triggerCrash('critical')}
                    className="min-h-touch bg-error text-white px-3 py-2 border-none rounded-md cursor-pointer transition-colors inline-flex-center-both"
                >
                    Trigger Critical Error
                </button>

                <FeatureErrorBoundary
                    featureName="Critical Navigation"
                    featureDescription="Essential navigation system"
                    critical={true}
                >
                    <CrashComponent shouldCrash={crashes.critical} type="Critical navigation" />
                </FeatureErrorBoundary>

                {crashes.critical && (
                    <button
                        onClick={() => resetCrash('critical')}
                        className="min-h-touch bg-surface text-primary px-3 py-2 border border-border rounded-md cursor-pointer transition-colors hover:bg-surface-hover inline-flex-center-both mt-2"
                    >
                        Reset
                    </button>
                )}
            </section>

            {/* Page Error (Full Page Replacement) */}
            <section className="mb-6 md:mb-8 p-3 md:p-4 border border-default rounded-md bg-surface">
                <h2 className="text-lg font-semibold text-primary mb-2">📄 Page Error</h2>
                <p className="text-secondary mb-2">
                    <strong className="text-primary font-medium">What it is:</strong> Replaces entire page content with error page
                </p>
                <p className="text-secondary mb-2">
                    <strong className="text-primary font-medium">When to use:</strong> When entire pages/routes fail to load
                </p>
                <p className="text-secondary mb-2">
                    <strong className="text-primary font-medium">Visual behavior:</strong> Shows error page with navigation options
                </p>

                <button
                    onClick={() => triggerCrash('page')}
                    className="min-h-touch bg-error text-white px-3 py-2 border-none rounded-md cursor-pointer transition-colors inline-flex-center-both"
                >
                    Trigger Page Error
                </button>

                <PageErrorBoundary pageName="Demo Page" pageDescription="Page error demonstration">
                    <CrashComponent shouldCrash={crashes.page} type="Page content" />
                </PageErrorBoundary>

                {crashes.page && (
                    <button
                        onClick={() => resetCrash('page')}
                        className="min-h-touch bg-surface text-primary px-3 py-2 border border-border rounded-md cursor-pointer transition-colors hover:bg-surface-hover inline-flex-center-both mt-2"
                    >
                        Reset
                    </button>
                )}
            </section>

            {/* Feature Error (Inline Replacement) */}
            <section className="mb-6 md:mb-8 p-3 md:p-4 border border-default rounded-md bg-surface">
                <h2 className="text-lg font-semibold text-primary mb-2">🛡️ Feature Error</h2>
                <p className="text-secondary mb-2">
                    <strong className="text-primary font-medium">What it is:</strong> Replaces just the broken component inline
                </p>
                <p className="text-secondary mb-2">
                    <strong className="text-primary font-medium">When to use:</strong> Individual features that might fail independently
                </p>
                <p className="text-secondary mb-2">
                    <strong className="text-primary font-medium">Visual behavior:</strong> Shows error UI in place of component, allows
                    retry/skip
                </p>

                <button
                    onClick={() => triggerCrash('feature')}
                    className="min-h-touch bg-error text-white px-3 py-2 border-none rounded-md cursor-pointer transition-colors inline-flex-center-both"
                >
                    Trigger Feature Error
                </button>

                <FeatureErrorBoundary
                    featureName="Search Component"
                    featureDescription="Media search functionality"
                >
                    <CrashComponent shouldCrash={crashes.feature} type="Search feature" />
                </FeatureErrorBoundary>

                {crashes.feature && (
                    <button
                        onClick={() => resetCrash('feature')}
                        className="min-h-touch bg-surface text-primary px-3 py-2 border border-border rounded-md cursor-pointer transition-colors hover:bg-surface-hover inline-flex-center-both mt-2"
                    >
                        Reset
                    </button>
                )}
            </section>
        </div>
    );
};

export default ErrorTestPage;
