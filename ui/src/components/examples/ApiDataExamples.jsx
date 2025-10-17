import React from 'react';
import { useApiData, useApiMutation, useApiQueries } from '../../hooks/useApiData';
import { fetchConfig, fetchInstances, fetchJobStats, postConfig } from '../../utils/api';

/**
 * Example components demonstrating useApiData hook patterns
 *
 * These examples show different ways to use the hooks for
 * common DAPS data fetching and mutation scenarios.
 */

/**
 * Basic data fetching example
 * Shows automatic loading, error handling, and data display
 */
export function BasicDataExample() {
    const {
        data: config,
        isLoading,
        error,
    } = useApiData({
        apiFunction: fetchConfig,
        options: {
            errorMessage: 'Failed to load application configuration',
        },
    });

    if (isLoading) return <div>Loading configuration...</div>;
    if (error) return <div>Error: {error.message}</div>;

    return (
        <div>
            <h3>Application Configuration</h3>
            <pre>{JSON.stringify(config, null, 2)}</pre>
        </div>
    );
}

/**
 * Manual execution example
 * Shows on-demand data fetching with execute function
 */
export function ManualExecutionExample() {
    const {
        data: stats,
        isLoading,
        execute,
        hasExecuted,
    } = useApiData({
        apiFunction: fetchJobStats,
        options: {
            immediate: false, // Don't fetch on mount
            successMessage: 'Job statistics refreshed!',
        },
    });

    return (
        <div>
            <h3>Job Statistics</h3>
            <button onClick={() => execute()} disabled={isLoading}>
                {isLoading ? 'Loading...' : 'Load Stats'}
            </button>

            {hasExecuted && stats && (
                <div>
                    <p>Total Jobs: {stats.total || 0}</p>
                    <p>Completed: {stats.completed || 0}</p>
                    <p>Failed: {stats.failed || 0}</p>
                </div>
            )}
        </div>
    );
}

/**
 * Data mutation example
 * Shows form-like operations with loading states
 */
export function MutationExample() {
    const [formData, setFormData] = React.useState({
        user_interface: { theme: 'dark' },
    });

    const { mutate: saveSettings, isLoading: isSaving } = useApiMutation(postConfig, {
        successMessage: 'Settings saved successfully!',
        onSuccess: () => {
            console.log('Settings saved, could refresh data here');
        },
    });

    const handleSave = async () => {
        await saveSettings(formData);
    };

    return (
        <div>
            <h3>Settings Form</h3>
            <select
                value={formData.user_interface.theme}
                onChange={e =>
                    setFormData(prev => ({
                        ...prev,
                        user_interface: { ...prev.user_interface, theme: e.target.value },
                    }))
                }
            >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
            </select>

            <button onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Settings'}
            </button>
        </div>
    );
}

/**
 * Multiple queries example
 * Shows loading multiple data sources simultaneously
 */
export function MultipleQueriesExample() {
    const { data, errors, isAnyLoading } = useApiQueries({
        config: {
            apiFunction: fetchConfig,
            options: { errorMessage: 'Failed to load config' },
        },
        instances: {
            apiFunction: fetchInstances,
            options: { errorMessage: 'Failed to load instances' },
        },
        stats: {
            apiFunction: fetchJobStats,
            options: { errorMessage: 'Failed to load job stats' },
        },
    });

    return (
        <div>
            <h3>Dashboard Overview</h3>

            {isAnyLoading && <div>Loading dashboard data...</div>}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
                <div>
                    <h4>Configuration</h4>
                    {errors.config && <div>Error loading config</div>}
                    {data.config && <div>✅ Config loaded</div>}
                </div>

                <div>
                    <h4>Service Instances</h4>
                    {errors.instances && <div>Error loading instances</div>}
                    {data.instances && (
                        <div>✅ {Object.keys(data.instances).length} services configured</div>
                    )}
                </div>

                <div>
                    <h4>Job Statistics</h4>
                    {errors.stats && <div>Error loading stats</div>}
                    {data.stats && <div>✅ {data.stats.total || 0} total jobs</div>}
                </div>
            </div>
        </div>
    );
}

/**
 * Transform and retry example
 * Shows data transformation and retry functionality
 */
export function TransformRetryExample() {
    const {
        data: instanceCount,
        isLoading,
        retry,
        error,
    } = useApiData({
        apiFunction: fetchInstances,
        options: {
            transform: data => Object.keys(data || {}).length,
            retryAttempts: 3,
            retryDelay: 2000,
            errorMessage: 'Failed to count service instances',
        },
    });

    return (
        <div>
            <h3>Service Instance Counter</h3>
            {isLoading && <div>Counting instances...</div>}
            {error && (
                <div>
                    <div>Error: {error.message}</div>
                    <button onClick={() => retry()}>Retry</button>
                </div>
            )}
            {instanceCount !== null && (
                <div>
                    <strong>{instanceCount}</strong> service instances configured
                </div>
            )}
        </div>
    );
}

/**
 * Main examples container
 */
export default function ApiDataExamples() {
    return (
        <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
            <h1>useApiData Hook Examples</h1>
            <p>
                These examples demonstrate different patterns for using the useApiData hook in DAPS
                components. Each example shows a different aspect of the hook&apos;s capabilities.
            </p>

            <div style={{ display: 'grid', gap: '40px' }}>
                <BasicDataExample />
                <ManualExecutionExample />
                <MutationExample />
                <MultipleQueriesExample />
                <TransformRetryExample />
            </div>

            <div
                style={{
                    marginTop: '40px',
                    padding: '20px',
                    backgroundColor: 'var(--surface-alt)',
                    borderRadius: '8px',
                }}
            >
                <h3>Key Benefits</h3>
                <ul>
                    <li>
                        <strong>Consistent Error Handling:</strong> Automatic toast notifications
                        for errors
                    </li>
                    <li>
                        <strong>Loading States:</strong> Built-in loading state management
                    </li>
                    <li>
                        <strong>Caching:</strong> Leverages existing API cache layer
                    </li>
                    <li>
                        <strong>Retry Logic:</strong> Configurable retry attempts with delays
                    </li>
                    <li>
                        <strong>Data Transformation:</strong> Transform API responses on-the-fly
                    </li>
                    <li>
                        <strong>Multiple Queries:</strong> Coordinate multiple API calls easily
                    </li>
                    <li>
                        <strong>Request Cancellation:</strong> Automatic cleanup prevents memory
                        leaks
                    </li>
                </ul>
            </div>
        </div>
    );
}
