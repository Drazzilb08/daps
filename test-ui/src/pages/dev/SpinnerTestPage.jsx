/**
 * Spinner component testing page
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Spinner } from '../../components/ui';
import { useToast } from '../../contexts/ToastContext.jsx';

const SpinnerSizeDemo = React.memo(() => {
    const sizes = ['small', 'medium', 'large'];

    return (
        <div className="bg-surface-elevated rounded p-6 border">
            <h3 className="text-lg font-semibold text-primary mb-4">Spinner Sizes</h3>

            <div className="grid grid-cols-3 gap-6">
                {sizes.map(size => (
                    <div key={size} className="text-center">
                        <div className="flex justify-center items-center mb-3 h-16">
                            <Spinner size={size} />
                        </div>
                        <div className="text-sm text-secondary font-medium capitalize">{size}</div>
                        <div className="text-xs text-tertiary mt-1">
                            {size === 'small' && '16px (w-4 h-4)'}
                            {size === 'medium' && '24px (w-6 h-6)'}
                            {size === 'large' && '32px (w-8 h-8)'}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
});

SpinnerSizeDemo.displayName = 'SpinnerSizeDemo';

const SpinnerTextDemo = React.memo(() => {
    const configurations = [
        { size: 'small', text: 'Loading...' },
        { size: 'medium', text: 'Processing data...' },
        { size: 'large', text: 'Synchronizing files...' },
    ];

    return (
        <div className="bg-surface-elevated rounded p-6 border">
            <h3 className="text-lg font-semibold text-primary mb-4">Spinners with Text</h3>

            <div className="space-y-4">
                {configurations.map(({ size, text }) => (
                    <div
                        key={`${size}-${text}`}
                        className="flex items-center gap-3 p-3 bg-surface rounded border"
                    >
                        <Spinner size={size} text={text} />
                    </div>
                ))}
            </div>
        </div>
    );
});

SpinnerTextDemo.displayName = 'SpinnerTextDemo';

const CenteredSpinnerDemo = React.memo(() => {
    return (
        <div className="bg-surface-elevated rounded border">
            <h3 className="text-lg font-semibold text-primary p-6 pb-0 mb-4">
                Centered Spinners (Suspense Fallbacks)
            </h3>

            <div className="space-y-1">
                <div className="h-32 bg-surface border-y">
                    <Spinner center text="Loading component..." />
                </div>
                <div className="h-48 bg-surface-elevated border-y">
                    <Spinner size="large" center text="Loading large content..." />
                </div>
                <div className="h-24 bg-surface border-y">
                    <Spinner size="small" center text="Loading small widget..." />
                </div>
            </div>
        </div>
    );
});

CenteredSpinnerDemo.displayName = 'CenteredSpinnerDemo';

const LoadingStateSimulation = React.memo(() => {
    const [loadingStates, setLoadingStates] = useState({
        button: false,
        form: false,
        data: false,
        save: false,
    });

    const { toast } = useToast();

    const simulateLoading = useCallback(
        (key, duration = 2000) => {
            setLoadingStates(prev => ({ ...prev, [key]: true }));

            setTimeout(() => {
                setLoadingStates(prev => ({ ...prev, [key]: false }));
                toast.success(`${key} operation completed!`);
            }, duration);
        },
        [toast]
    );

    return (
        <div className="bg-surface-elevated rounded p-6 border">
            <h3 className="text-lg font-semibold text-primary mb-4">Interactive Loading States</h3>

            <div className="grid grid-cols-2 gap-4">
                {/* Button Loading */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-secondary">Button Loading:</label>
                    <button
                        onClick={() => simulateLoading('button')}
                        disabled={loadingStates.button}
                        className="w-full px-4 py-2 bg-primary text-white rounded hover:bg-primary-hover disabled:opacity-50 flex items-center justify-center gap-2 min-h-11"
                    >
                        {loadingStates.button && <Spinner size="small" />}
                        {loadingStates.button ? 'Loading...' : 'Start Loading'}
                    </button>
                </div>

                {/* Form Submission */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-secondary">Form Submission:</label>
                    <button
                        onClick={() => simulateLoading('form', 3000)}
                        disabled={loadingStates.form}
                        className="w-full px-4 py-2 bg-success text-white rounded hover:bg-success-hover disabled:opacity-50 flex items-center justify-center gap-2 min-h-11"
                    >
                        {loadingStates.form && <Spinner size="small" />}
                        {loadingStates.form ? 'Submitting...' : 'Submit Form'}
                    </button>
                </div>

                {/* Data Loading */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-secondary">Data Loading:</label>
                    <button
                        onClick={() => simulateLoading('data', 1500)}
                        disabled={loadingStates.data}
                        className="w-full px-4 py-2 bg-info text-white rounded hover:bg-info-hover disabled:opacity-50 flex items-center justify-center gap-2 min-h-11"
                    >
                        {loadingStates.data && <Spinner size="small" />}
                        {loadingStates.data ? 'Loading Data...' : 'Fetch Data'}
                    </button>
                </div>

                {/* Save Operation */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-secondary">Save Operation:</label>
                    <button
                        onClick={() => simulateLoading('save', 2500)}
                        disabled={loadingStates.save}
                        className="w-full px-4 py-2 bg-warning text-white rounded hover:bg-warning-hover disabled:opacity-50 flex items-center justify-center gap-2 min-h-11"
                    >
                        {loadingStates.save && <Spinner size="small" />}
                        {loadingStates.save ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
});

LoadingStateSimulation.displayName = 'LoadingStateSimulation';

const AnimationPerformanceTest = React.memo(() => {
    const [spinnerCount, setSpinnerCount] = useState(1);
    const [isStressed, setIsStressed] = useState(false);

    const stressTest = useCallback(() => {
        setIsStressed(true);
        setSpinnerCount(50);

        setTimeout(() => {
            setIsStressed(false);
            setSpinnerCount(1);
        }, 5000);
    }, []);

    return (
        <div className="bg-surface-elevated rounded p-6 border">
            <h3 className="text-lg font-semibold text-primary mb-4">Animation Performance Test</h3>

            <div className="space-y-4">
                <div className="flex items-center gap-4">
                    <label className="text-sm font-medium text-secondary">
                        Spinner Count: {spinnerCount}
                    </label>
                    <input
                        type="range"
                        min="1"
                        max="20"
                        value={spinnerCount}
                        onChange={e => setSpinnerCount(parseInt(e.target.value))}
                        disabled={isStressed}
                        className="flex-1"
                    />
                    <button
                        onClick={stressTest}
                        disabled={isStressed}
                        className="px-3 py-1 text-sm bg-error text-white rounded hover:bg-error-hover disabled:opacity-50"
                    >
                        {isStressed ? 'Testing...' : 'Stress Test (50 spinners)'}
                    </button>
                </div>

                <div className="grid grid-cols-auto gap-3 p-4 bg-surface rounded border min-h-30">
                    {Array.from({ length: spinnerCount }, (_, i) => (
                        <Spinner
                            key={i}
                            size={['small', 'medium', 'large'][i % 3]}
                            className="mx-auto"
                        />
                    ))}
                </div>

                {isStressed && (
                    <div className="text-sm text-warning bg-surface border border-warning rounded p-2">
                        <strong>Stress Test Active:</strong> Rendering {spinnerCount} spinners to
                        test performance. Watch for frame drops or animation stuttering.
                    </div>
                )}
            </div>
        </div>
    );
});

AnimationPerformanceTest.displayName = 'AnimationPerformanceTest';

const AccessibilityTest = React.memo(() => {
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        setPrefersReducedMotion(mediaQuery.matches);

        const handleChange = e => setPrefersReducedMotion(e.matches);
        mediaQuery.addEventListener('change', handleChange);

        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);

    return (
        <div className="bg-surface-elevated rounded p-6 border">
            <h3 className="text-lg font-semibold text-primary mb-4">Accessibility Compliance</h3>

            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-secondary">
                            Reduced Motion Preference:
                        </label>
                        <div
                            className={`p-2 rounded text-sm ${
                                prefersReducedMotion
                                    ? 'bg-surface text-success border border-success'
                                    : 'bg-info-subtle text-info border border-info'
                            }`}
                        >
                            {prefersReducedMotion
                                ? 'Detected (animations disabled)'
                                : 'Not detected (animations enabled)'}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-secondary">
                            Spinner with Motion:
                        </label>
                        <div className="flex justify-center p-4 bg-surface rounded border">
                            <Spinner size="medium" text="Testing accessibility..." />
                        </div>
                    </div>
                </div>

                <div className="bg-info-subtle border border-info rounded p-3">
                    <h4 className="text-sm font-semibold text-info mb-2">
                        Accessibility Features:
                    </h4>
                    <ul className="text-sm text-secondary space-y-1">
                        <li>
                            • Respects <code>prefers-reduced-motion</code> media query
                        </li>
                        <li>• Uses semantic markup with proper ARIA attributes</li>
                        <li>• Provides alternative text for screen readers</li>
                        <li>• Maintains sufficient color contrast</li>
                        <li>
                            • Touch-friendly minimum size (44px) when used in interactive elements
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
});

AccessibilityTest.displayName = 'AccessibilityTest';

const SpinnerTestPage = () => {
    const [activeTest, setActiveTest] = useState('overview');

    const tests = [
        { id: 'overview', label: 'Overview', component: null },
        { id: 'sizes', label: 'Sizes', component: SpinnerSizeDemo },
        { id: 'text', label: 'With Text', component: SpinnerTextDemo },
        { id: 'centered', label: 'Centered', component: CenteredSpinnerDemo },
        { id: 'interactive', label: 'Interactive', component: LoadingStateSimulation },
        { id: 'performance', label: 'Performance', component: AnimationPerformanceTest },
        { id: 'accessibility', label: 'Accessibility', component: AccessibilityTest },
    ];

    const ActiveComponent = tests.find(test => test.id === activeTest)?.component;

    return (
        <div>
            <div className="space-y-6">
                {/* Header */}
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-primary mb-2">
                        Spinner Component Testing
                    </h1>
                    <p className="text-secondary">
                        Comprehensive testing interface for spinner components, animations, and
                        loading states
                    </p>
                </div>

                {/* Navigation */}
                <div className="bg-surface-elevated rounded p-4 border">
                    <div className="flex flex-wrap gap-2">
                        {tests.map(test => (
                            <button
                                key={test.id}
                                onClick={() => setActiveTest(test.id)}
                                className={`px-3 py-2 text-sm rounded transition-colors ${
                                    activeTest === test.id
                                        ? 'bg-primary text-brand-primary'
                                        : 'bg-surface hover:bg-surface-hover text-secondary hover:text-primary'
                                }`}
                            >
                                {test.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                {activeTest === 'overview' ? (
                    <div className="space-y-6">
                        <SpinnerSizeDemo />
                        <SpinnerTextDemo />
                        <LoadingStateSimulation />
                    </div>
                ) : ActiveComponent ? (
                    <ActiveComponent />
                ) : (
                    <div className="text-center py-8 text-secondary">
                        Select a test category to begin
                    </div>
                )}
            </div>
        </div>
    );
};

SpinnerTestPage.displayName = 'SpinnerTestPage';

export default SpinnerTestPage;
