/**
 * API testing page
 */

import React, { useState, useCallback } from 'react';
import { useApiData } from '../../hooks/useApiData.js';
import { useToast } from '../../contexts/ToastContext.jsx';
import { api } from '../../utils/api/index.js';

/**
 * Test section component for organized testing
 */
const TestSection = React.memo(({ title, description, children }) => (
    <section className="bg-surface border border-border rounded-md p-4">
        <h2 className="text-lg font-semibold text-primary mb-2">{title}</h2>
        <p className="text-sm text-secondary mb-4">{description}</p>
        <div className="flex flex-col gap-4">{children}</div>
    </section>
));

TestSection.displayName = 'TestSection';

/**
 * API response display component
 */
const ApiResponseDisplay = React.memo(({ data, isLoading, error, title }) => (
    <div className="bg-surface-elevated border border-border p-3 rounded-sm">
        <h4 className="text-sm font-medium text-primary mb-2">{title}</h4>
        {isLoading && (
            <div className="p-3 text-secondary flex items-center gap-2">
                <div
                    className="w-4 h-4 border-2 border-border border-t-primary rounded-full animate-spin"
                    aria-label="Loading..."
                />
                <span>Loading...</span>
            </div>
        )}
        {error && (
            <div className="p-3 bg-error-bg text-error border border-error rounded-sm" role="alert">
                <strong>Error:</strong> {error.message}
            </div>
        )}
        {data && !isLoading && (
            <pre className="bg-surface border border-border p-3 text-primary overflow-auto whitespace-pre-wrap break-words max-h-dropdown rounded-sm">
                {JSON.stringify(data, null, 2)}
            </pre>
        )}
    </div>
));

ApiResponseDisplay.displayName = 'ApiResponseDisplay';

/**
 * Version test component - Tests systemAPI.getVersion()
 */
const VersionTestComponent = React.memo(() => {
    const apiFunction = useCallback(() => {
        return api.system.getVersion();
    }, []);

    const { data, isLoading, error, execute } = useApiData({
        apiFunction,
        options: {
            immediate: false,
            showSuccessToast: true,
            successMessage: 'Version retrieved successfully!',
        },
    });

    return (
        <div className="flex flex-col gap-3">
            <div className="mb-3 flex flex-col md:flex-row md:items-center gap-2">
                <button
                    onClick={execute}
                    disabled={isLoading}
                    className="touch-target bg-primary text-white px-3 py-2 border-none rounded-md cursor-pointer transition-colors inline-flex items-center justify-center"
                >
                    {isLoading ? 'Loading...' : 'Get Version'}
                </button>
            </div>
            <ApiResponseDisplay
                data={data}
                isLoading={isLoading}
                error={error}
                title="Version Response (with caching)"
            />
            <div className="rounded-sm">
                <p>
                    <strong>API Layer:</strong> systemAPI.getVersion()
                </p>
                <p>
                    <strong>Caching:</strong> 1 hour TTL
                </p>
                <p>
                    <strong>Endpoint:</strong> GET /api/version
                </p>
            </div>
        </div>
    );
});

VersionTestComponent.displayName = 'VersionTestComponent';

/**
 * Config test component - Tests /api/config endpoint
 */
const ConfigTestComponent = React.memo(() => {
    const [section, setSection] = useState('');

    const configApiFunction = useCallback(() => {
        if (section) {
            return api.config.fetchSection(section);
        } else {
            return api.config.fetchConfig();
        }
    }, [section]);

    const { data, isLoading, error, execute } = useApiData({
        apiFunction: configApiFunction,
        options: {
            immediate: false,
            showSuccessToast: true,
            successMessage: 'Configuration retrieved!',
        },
    });

    return (
        <div className="flex flex-col gap-3">
            <div className="mb-3 flex flex-wrap gap-2 items-center">
                <select
                    value={section}
                    onChange={e => setSection(e.target.value)}
                    className="min-h-input p-2 px-3 border border-border bg-surface text-primary text-sm rounded-sm w-full md:w-auto"
                >
                    <option value="">All Configuration</option>
                    <option value="instances">Instances</option>
                    <option value="modules">Modules</option>
                    <option value="notifications">Notifications</option>
                </select>
                <button
                    onClick={execute}
                    disabled={isLoading}
                    className="touch-target bg-primary text-white px-3 py-2 border-none rounded-md cursor-pointer transition-colors inline-flex items-center justify-center"
                >
                    {isLoading ? 'Loading...' : 'Get Config'}
                </button>
            </div>
            <ApiResponseDisplay
                data={data}
                isLoading={isLoading}
                error={error}
                title="Configuration Response (with caching)"
            />
            <div className="p-3 bg-surface-elevated border border-border rounded-sm">
                <p>
                    <strong>API Layer:</strong> configAPI.fetchConfig() / fetchSection()
                </p>
                <p>
                    <strong>Caching:</strong> 10 minutes TTL
                </p>
                <p>
                    <strong>Endpoint:</strong> GET /api/config{section ? `?section=${section}` : ''}
                </p>
            </div>
        </div>
    );
});

ConfigTestComponent.displayName = 'ConfigTestComponent';

/**
 * Job stats test component - Tests jobsAPI.getStats()
 */
const JobStatsTestComponent = React.memo(() => {
    const apiFunction = useCallback(() => {
        return api.jobs.getStats();
    }, []);

    const { data, isLoading, error, execute } = useApiData({
        apiFunction,
        options: {
            immediate: false,
            showSuccessToast: true,
            successMessage: 'Job statistics retrieved!',
        },
    });

    return (
        <div className="flex flex-col gap-3">
            <div className="mb-3 flex flex-col md:flex-row md:items-center gap-2">
                <button
                    onClick={execute}
                    disabled={isLoading}
                    className="touch-target bg-primary text-white px-3 py-2 border-none rounded-md cursor-pointer transition-colors inline-flex items-center justify-center"
                >
                    {isLoading ? 'Loading...' : 'Get Job Stats'}
                </button>
            </div>
            <ApiResponseDisplay
                data={data}
                isLoading={isLoading}
                error={error}
                title="Job Statistics Response (with caching)"
            />
            <div className="rounded-sm">
                <p>
                    <strong>API Layer:</strong> jobsAPI.getStats()
                </p>
                <p>
                    <strong>Caching:</strong> 30 seconds TTL
                </p>
                <p>
                    <strong>Endpoint:</strong> GET /api/jobs/stats
                </p>
            </div>
        </div>
    );
});

JobStatsTestComponent.displayName = 'JobStatsTestComponent';

/**
 * Error test component - Tests error handling
 */
const ErrorTestComponent = React.memo(() => {
    const [errorType, setErrorType] = useState('404');

    const errorApiFunction = useCallback(() => {
        switch (errorType) {
            case '404':
                // This will trigger a 404 error through the API layer
                return api.core.get('/nonexistent-endpoint');
            case '400':
                // This should trigger a 400 error through config API
                return api.config.fetchSection('invalid-section');
            case '500':
                // This will trigger a 500 error by calling an endpoint that causes server errors
                return api.core.get('/api/trigger-server-error');
            default:
                return api.system.getVersion();
        }
    }, [errorType]);

    const { data, isLoading, error, execute } = useApiData({
        apiFunction: errorApiFunction,
        options: {
            immediate: false,
            showErrorToast: true,
            errorMessage: 'API call failed!',
        },
    });

    return (
        <div className="flex flex-col gap-3">
            <div className="mb-3 flex flex-col md:flex-row md:items-center gap-2">
                <select
                    value={errorType}
                    onChange={e => setErrorType(e.target.value)}
                    className="min-h-input p-2 px-3 border border-border bg-surface text-primary text-sm rounded-sm w-full md:w-auto"
                >
                    <option value="404">404 - Not Found</option>
                    <option value="400">400 - Bad Request</option>
                    <option value="500">500 - Server Error</option>
                </select>
                <button
                    onClick={execute}
                    disabled={isLoading}
                    className="touch-target bg-error text-white px-3 py-2 border-none rounded-md cursor-pointer transition-colors inline-flex items-center justify-center"
                >
                    {isLoading ? 'Testing...' : 'Test Error'}
                </button>
            </div>
            <ApiResponseDisplay
                data={data}
                isLoading={isLoading}
                error={error}
                title="Error Response (through API layer)"
            />
            <div className="rounded-sm">
                <p>
                    <strong>API Layer:</strong>{' '}
                    {errorType === '404'
                        ? 'apiCore.get()'
                        : errorType === '400'
                          ? 'configAPI.fetchSection()'
                          : errorType === '500'
                            ? 'systemAPI.test()'
                            : 'systemAPI.getVersion()'}
                </p>
                <p>
                    <strong>Error Type:</strong> {errorType}
                </p>
                <p>
                    <strong>Purpose:</strong> Test error handling through abstraction layer
                </p>
            </div>
        </div>
    );
});

ErrorTestComponent.displayName = 'ErrorTestComponent';

/**
 * Toast test component - Tests all toast types
 */
const ToastTestComponent = React.memo(() => {
    const toast = useToast();

    const testToasts = useCallback(() => {
        toast.success('Success! Everything is working perfectly.');
        setTimeout(() => toast.error('Error! Something went wrong.'), 500);
        setTimeout(() => toast.warning('Warning! Please check your settings.'), 1000);
        setTimeout(() => toast.info('Info: Here is some useful information.'), 1500);
    }, [toast]);

    return (
        <div className="flex flex-col gap-3">
            <div className="mb-3 flex flex-col md:flex-row md:items-center gap-2">
                <button
                    onClick={testToasts}
                    className="touch-target bg-info text-white px-3 py-2 border-none rounded-md cursor-pointer transition-colors inline-flex items-center justify-center"
                >
                    Test All Toasts
                </button>
                <button
                    onClick={() => toast.success('Success toast!')}
                    className="touch-target bg-primary text-white px-3 py-2 border-none rounded-md cursor-pointer transition-colors inline-flex items-center justify-center"
                >
                    Success
                </button>
                <button
                    onClick={() => toast.error('Error toast!')}
                    className="touch-target bg-error text-white px-3 py-2 border-none rounded-md cursor-pointer transition-colors inline-flex items-center justify-center"
                >
                    Error
                </button>
                <button
                    onClick={() => toast.warning('Warning toast!')}
                    className="touch-target bg-warning text-white px-3 py-2 border-none rounded-md cursor-pointer transition-colors inline-flex items-center justify-center"
                >
                    Warning
                </button>
                <button
                    onClick={() => toast.info('Info toast!')}
                    className="touch-target bg-surface text-primary px-3 py-2 border border-border rounded-md cursor-pointer transition-colors hover:bg-surface-hover inline-flex items-center justify-center"
                >
                    Info
                </button>
            </div>
        </div>
    );
});

ToastTestComponent.displayName = 'ToastTestComponent';

/**
 * Main API Test Page component
 */
const ApiTestPage = () => {
    return (
        <div className="max-w-container mx-auto p-3 md:p-4">
            <div className="text-center mb-8 pb-4 border-b border-border">
                <h1 className="text-2xl font-bold text-primary mb-2">API Integration Testing</h1>
                <p className="text-base text-secondary max-w-prose mx-auto">
                    Real DAPS backend API testing with actual endpoints, error handling, and toast
                    notifications. This tests the live integration with localhost:8000.
                </p>
            </div>

            <div className="grid gap-8">
                <TestSection
                    title="Toast Notifications"
                    description="Test all toast notification types and integration with ToastProvider"
                >
                    <ToastTestComponent />
                </TestSection>

                <TestSection
                    title="System API - Version"
                    description="Test systemAPI.getVersion() with 1-hour caching"
                >
                    <VersionTestComponent />
                </TestSection>

                <TestSection
                    title="Config API - Configuration"
                    description="Test configAPI.fetchConfig() and fetchSection() with 10-minute caching"
                >
                    <ConfigTestComponent />
                </TestSection>

                <TestSection
                    title="Jobs API - Statistics"
                    description="Test jobsAPI.getStats() with 30-second caching"
                >
                    <JobStatsTestComponent />
                </TestSection>

                <TestSection
                    title="API Error Handling"
                    description="Test error handling through the API abstraction layer"
                >
                    <ErrorTestComponent />
                </TestSection>
            </div>
        </div>
    );
};

ApiTestPage.displayName = 'ApiTestPage';

export default ApiTestPage;
