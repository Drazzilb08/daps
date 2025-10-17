import React, { useState } from 'react';
import { useToast } from '../../contexts/ToastContext.jsx';
import { useErrorContext } from '../../components/error/ErrorContext.jsx';
import { PageErrorBoundary, FeatureErrorBoundary } from '../../components/error';

/**
 * ErrorTestPage - Comprehensive error system validation
 *
 * Demonstrates all three error boundary types:
 * 1. Critical Feature Error - Modal overlay for essential features
 * 2. Page Error - Full page error display
 * 3. Feature Error - Inline feature-level errors
 */

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
    const globalError = useErrorContext();
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
        // Report to error context for tracking
        globalError.reportError({
            message: 'Network connection failed. Please try again.',
            type: 'network',
            severity: 'high',
        });

        // Show toast for visual feedback
        toast.error('Network connection failed. Please try again.');
    };

    return (
        <div className="p-3 md:p-4 max-w-4xl mx-auto">
            <div className="text-center mb-4">
                <h1 className="text-2xl font-bold text-primary mb-2">
                    🔬 Error Handling Demonstrations - Primitive Composition
                </h1>
                <p className="text-base text-secondary max-w-prose mx-auto">
                    This page validates that the new primitive composition architecture produces
                </p>
            </div>

            {/* Toast Notifications */}
            <section className="mb-6 md:mb-8 p-3 md:p-4 border border-default rounded-md bg-surface">
                <h2 className="text-lg font-semibold text-primary mb-2">🍞 Toast Notifications</h2>
                <p className="text-secondary mb-2">
                    <strong className="text-primary font-medium">What it is:</strong> Small popup
                    notifications that appear briefly
                </p>
                <p className="text-secondary mb-2">
                    <strong className="text-primary font-medium">When to use:</strong> Success
                    confirmations, alerts, quick feedback
                </p>
                <div className="flex gap-2 flex-wrap mt-3 md:flex-row flex-col md:items-center">
                    <button
                        onClick={() => showToast('success')}
                        className="touch-target bg-success text-white px-3 py-2 border-none rounded-md cursor-pointer transition-colors inline-flex items-center justify-center"
                    >
                        Success Toast
                    </button>
                    <button
                        onClick={() => showToast('error')}
                        className="touch-target bg-error text-white px-3 py-2 border-none rounded-md cursor-pointer transition-colors inline-flex items-center justify-center"
                    >
                        Error Toast
                    </button>
                    <button
                        onClick={() => showToast('warning')}
                        className="touch-target bg-warning text-white px-3 py-2 border-none rounded-md cursor-pointer transition-colors inline-flex items-center justify-center"
                    >
                        Warning Toast
                    </button>
                    <button
                        onClick={() => showToast('info')}
                        className="touch-target bg-info text-white px-3 py-2 border-none rounded-md cursor-pointer transition-colors inline-flex items-center justify-center"
                    >
                        Info Toast
                    </button>
                </div>
            </section>

            {/* Global Error Handling */}
            <section className="mb-6 md:mb-8 p-3 md:p-4 border border-default rounded-md bg-surface">
                <h2 className="text-lg font-semibold text-primary mb-2">
                    🌐 Global Error Handling
                </h2>
                <p className="text-secondary mb-2">
                    <strong className="text-primary font-medium">What it is:</strong> Centralized
                    error handling for the entire app
                </p>
                <p className="text-secondary mb-2">
                    <strong className="text-primary font-medium">When to use:</strong> Network
                    failures, authentication issues, server errors
                </p>
                <button
                    onClick={showGlobalError}
                    className="touch-target bg-primary text-white px-3 py-2 border-none rounded-md cursor-pointer transition-colors inline-flex items-center justify-center"
                >
                    Trigger Global Error
                </button>
            </section>

            {/* Critical Feature Error (Full Screen Overlay) */}
            <section className="mb-6 md:mb-8 p-3 md:p-4 border rounded-md bg-surface">
                <h2 className="text-lg font-semibold text-error mb-2">⚠️ Critical Feature Error</h2>
                <p className="text-secondary mb-2">
                    <strong className="text-primary font-medium">Expected output:</strong> Modal
                    overlay with critical feature error
                </p>
                <p className="text-secondary mb-2">
                    <strong className="text-primary font-medium">Visual behavior:</strong>
                </p>
                <ul className="text-sm text-secondary mb-2 pl-6">
                    <li>Dark overlay with backdrop blur</li>
                    <li>Centered modal with red border (border-2 border-error)</li>
                    <li>Title: &quot;Critical Feature Error&quot;</li>
                    <li>
                        Buttons: Retry (primary), Copy Error (info/success/error states), Reload App
                    </li>
                </ul>

                <button
                    onClick={() => triggerCrash('critical')}
                    className="touch-target bg-error text-white px-3 py-2 border-none rounded-md cursor-pointer transition-colors inline-flex items-center justify-center"
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
                        className="touch-target bg-surface text-primary px-3 py-2 border border-border rounded-md cursor-pointer transition-colors hover:bg-surface-hover inline-flex items-center justify-center mt-2"
                    >
                        Reset
                    </button>
                )}
            </section>

            {/* Page Error (Full Page Replacement) */}
            <section className="mb-6 md:mb-8 p-3 md:p-4 border rounded-md bg-surface">
                <h2 className="text-lg font-semibold text-warning mb-2">📄 Page Error</h2>
                <p className="text-secondary mb-2">
                    <strong className="text-primary font-medium">Expected output:</strong> Full page
                    error display
                </p>
                <p className="text-secondary mb-2">
                    <strong className="text-primary font-medium">Visual behavior:</strong>
                </p>
                <ul className="text-sm text-secondary mb-2 pl-6">
                    <li>Full page container (max-w-2xl centered)</li>
                    <li>Large build icon (text-4xl)</li>
                    <li>Error details box with retry count and timestamp</li>
                    <li>Complete button set: Try Again, Home, Back, Copy Error, Refresh Page</li>
                    <li>Help section with bullet list</li>
                    <li>Footer with support message</li>
                </ul>

                <button
                    onClick={() => triggerCrash('page')}
                    className="touch-target bg-error text-white px-3 py-2 border-none rounded-md cursor-pointer transition-colors inline-flex items-center justify-center"
                >
                    Trigger Page Error
                </button>

                <PageErrorBoundary pageName="Demo Page" pageDescription="Page error demonstration">
                    <CrashComponent shouldCrash={crashes.page} type="Page content" />
                </PageErrorBoundary>

                {crashes.page && (
                    <button
                        onClick={() => resetCrash('page')}
                        className="touch-target bg-surface text-primary px-3 py-2 border border-border rounded-md cursor-pointer transition-colors hover:bg-surface-hover inline-flex items-center justify-center mt-2"
                    >
                        Reset
                    </button>
                )}
            </section>

            {/* Feature Error (Inline Replacement) */}
            <section className="mb-6 md:mb-8 p-3 md:p-4 border rounded-md bg-surface">
                <h2 className="text-lg font-semibold text-info mb-2">🛡️ Feature Error</h2>
                <p className="text-secondary mb-2">
                    <strong className="text-primary font-medium">Expected output:</strong> Inline
                    feature error display
                </p>
                <p className="text-secondary mb-2">
                    <strong className="text-primary font-medium">Visual behavior:</strong>
                </p>
                <ul className="text-sm text-secondary mb-2 pl-6">
                    <li>Warning banner above error container</li>
                    <li>Inline container (border border-error rounded-md)</li>
                    <li>Warning icon (text-xl) with title</li>
                    <li>Error message box (bg-surface-variant border border-error)</li>
                    <li>
                        Buttons: Retry (primary), Skip, Copy Error (info/success/error states),
                        Reload
                    </li>
                </ul>

                <button
                    onClick={() => triggerCrash('feature')}
                    className="touch-target bg-error text-white px-3 py-2 border-none rounded-md cursor-pointer transition-colors inline-flex items-center justify-center"
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
                        className="touch-target bg-surface text-primary px-3 py-2 border border-border rounded-md cursor-pointer transition-colors hover:bg-surface-hover inline-flex items-center justify-center mt-2"
                    >
                        Reset
                    </button>
                )}
            </section>

            {/* Visual Validation Checklist */}
            <section className="mb-6 md:mb-8 p-3 md:p-4 border rounded-md bg-surface">
                <h2 className="text-lg font-semibold text-success mb-2">
                    ✅ Visual Validation Checklist
                </h2>
                <p className="text-secondary mb-2">
                    <strong className="text-primary font-medium">Verification steps:</strong>
                </p>
                <ol className="text-sm text-secondary pl-6 space-y-1">
                    <li>Trigger each error type above</li>
                    <li>Compare visual output against referenced line numbers</li>
                    <li>Verify all CSS classes match exactly</li>
                    <li>Test all action buttons (Retry, Home, Back, Copy, etc.)</li>
                    <li>
                        Confirm button variant colors match (primary=orange, secondary=gray, etc.)
                    </li>
                    <li>Check Material Icons render correctly</li>
                    <li>Validate spacing, borders, backgrounds match screenshots</li>
                </ol>
            </section>
        </div>
    );
};

export default ErrorTestPage;
