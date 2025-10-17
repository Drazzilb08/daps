import React, { useState } from 'react';
import { useApiData, useApiMutation, useApiQueries } from '../../hooks/useApiData';
import { fetchConfig, fetchInstances, fetchJobStats, postConfig } from '../../utils/api';

/**
 * Test page for useApiData hook functionality
 * This demonstrates the hook working in a real DAPS environment
 */
export default function ApiDataTest() {
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    return (
        <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
            <h1>useApiData Hook - Live Test</h1>
            <p>This page demonstrates the useApiData hook working with real DAPS API endpoints.</p>

            <div style={{ display: 'grid', gap: '30px' }}>
                <BasicConfigTest />
                <ManualStatsTest />
                <InstanceCountTest refreshTrigger={refreshTrigger} />
                <MultipleQueriesTest />
                <MutationTest onRefresh={() => setRefreshTrigger(prev => prev + 1)} />
            </div>
        </div>
    );
}

/**
 * Test basic automatic data fetching
 */
function BasicConfigTest() {
    const {
        data: config,
        isLoading,
        error,
        execute,
    } = useApiData({
        apiFunction: fetchConfig,
        options: {
            errorMessage: 'Failed to load DAPS configuration',
        },
    });

    return (
        <div className="test-section">
            <h3>🔄 Basic Auto-Loading Test</h3>
            <p>Tests automatic data fetching on component mount</p>

            <div style={{ marginBottom: '10px' }}>
                <button
                    onClick={() => execute()}
                    disabled={isLoading}
                    style={{ marginRight: '10px' }}
                >
                    {isLoading ? 'Loading...' : 'Refresh Config'}
                </button>
                <span>Status: {isLoading ? '🔄 Loading' : error ? '❌ Error' : '✅ Loaded'}</span>
            </div>

            {error && (
                <div className="error-message" style={{ marginBottom: '10px' }}>
                    Error: {error.message}
                </div>
            )}

            {config && (
                <div>
                    <strong>Config Sections Found:</strong>
                    <div style={{ fontSize: '14px', fontFamily: 'monospace', marginTop: '5px' }}>
                        {Object.keys(config).join(', ')}
                    </div>
                </div>
            )}
        </div>
    );
}

/**
 * Test manual execution
 */
function ManualStatsTest() {
    const {
        data: stats,
        isLoading,
        execute,
        hasExecuted,
        error,
    } = useApiData({
        apiFunction: fetchJobStats,
        options: {
            immediate: false,
            successMessage: 'Job statistics loaded!',
        },
    });

    return (
        <div className="test-section">
            <h3>🎯 Manual Execution Test</h3>
            <p>Tests on-demand data fetching with success notifications</p>

            <div style={{ marginBottom: '10px' }}>
                <button onClick={() => execute()} disabled={isLoading}>
                    {isLoading ? 'Loading Stats...' : 'Load Job Statistics'}
                </button>
                <span style={{ marginLeft: '10px' }}>
                    {!hasExecuted
                        ? '⏳ Not loaded yet'
                        : isLoading
                          ? '🔄 Loading'
                          : error
                            ? '❌ Error'
                            : '✅ Loaded'}
                </span>
            </div>

            {error && (
                <div className="error-message" style={{ marginBottom: '10px' }}>
                    Error: {error.message}
                </div>
            )}

            {hasExecuted && stats && (
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                        gap: '10px',
                    }}
                >
                    <div>
                        <strong>Total:</strong> {stats.total || 0}
                    </div>
                    <div>
                        <strong>Completed:</strong> {stats.completed || 0}
                    </div>
                    <div>
                        <strong>Failed:</strong> {stats.failed || 0}
                    </div>
                    <div>
                        <strong>Running:</strong> {stats.running || 0}
                    </div>
                </div>
            )}
        </div>
    );
}

/**
 * Test data transformation and dependencies
 */
function InstanceCountTest({ refreshTrigger }) {
    const {
        data: instanceCount,
        isLoading,
        error,
    } = useApiData({
        apiFunction: fetchInstances,
        dependencies: [refreshTrigger],
        options: {
            transform: data => {
                const services = Object.keys(data || {});
                const total = services.reduce((count, service) => {
                    return count + Object.keys(data[service] || {}).length;
                }, 0);
                return { services: services.length, instances: total, serviceNames: services };
            },
            errorMessage: 'Failed to count service instances',
        },
    });

    return (
        <div className="test-section">
            <h3>🔄 Transform & Dependencies Test</h3>
            <p>Tests data transformation and dependency-based re-execution</p>

            <div style={{ marginBottom: '10px' }}>
                Status: {isLoading ? '🔄 Counting' : error ? '❌ Error' : '✅ Complete'}
                <span style={{ marginLeft: '10px', fontSize: '12px' }}>
                    (Refresh trigger: {refreshTrigger})
                </span>
            </div>

            {error && (
                <div className="error-message" style={{ marginBottom: '10px' }}>
                    Error: {error.message}
                </div>
            )}

            {instanceCount && (
                <div>
                    <div>
                        <strong>Service Types:</strong> {instanceCount.services}
                    </div>
                    <div>
                        <strong>Total Instances:</strong> {instanceCount.instances}
                    </div>
                    <div>
                        <strong>Services:</strong> {instanceCount.serviceNames.join(', ')}
                    </div>
                </div>
            )}
        </div>
    );
}

/**
 * Test multiple simultaneous queries
 */
function MultipleQueriesTest() {
    const { data, isLoading, errors, isAnyLoading } = useApiQueries({
        config: {
            apiFunction: fetchConfig,
            options: { errorMessage: 'Config load failed' },
        },
        instances: {
            apiFunction: fetchInstances,
            options: { errorMessage: 'Instances load failed' },
        },
        stats: {
            apiFunction: fetchJobStats,
            options: { errorMessage: 'Stats load failed' },
        },
    });

    return (
        <div className="test-section">
            <h3>🔀 Multiple Queries Test</h3>
            <p>Tests loading multiple data sources simultaneously</p>

            <div style={{ marginBottom: '10px' }}>
                Overall Status: {isAnyLoading ? '🔄 Loading data...' : '✅ All queries complete'}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
                <div>
                    <h4>Configuration</h4>
                    <div>
                        {isLoading.config && '🔄 Loading...'}
                        {errors.config && <span className="error-text">❌ Error</span>}
                        {data.config && !isLoading.config && (
                            <span className="success-text">
                                ✅ {Object.keys(data.config).length} sections
                            </span>
                        )}
                    </div>
                </div>

                <div>
                    <h4>Service Instances</h4>
                    <div>
                        {isLoading.instances && '🔄 Loading...'}
                        {errors.instances && <span className="error-text">❌ Error</span>}
                        {data.instances && !isLoading.instances && (
                            <span className="success-text">
                                ✅ {Object.keys(data.instances).length} services
                            </span>
                        )}
                    </div>
                </div>

                <div>
                    <h4>Job Statistics</h4>
                    <div>
                        {isLoading.stats && '🔄 Loading...'}
                        {errors.stats && <span className="error-text">❌ Error</span>}
                        {data.stats && !isLoading.stats && (
                            <span className="success-text">
                                ✅ {data.stats.total || 0} total jobs
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * Test mutation functionality
 */
function MutationTest({ onRefresh }) {
    const [testData, setTestData] = useState({ test: 'api-data-hook-test', timestamp: Date.now() });

    const { mutate: saveTestData, isLoading: isSaving } = useApiMutation(postConfig, {
        successMessage: 'Test data saved successfully!',
        errorMessage: 'Failed to save test data',
        onSuccess: data => {
            console.log('Save successful:', data);
            onRefresh(); // Trigger refresh in other components
        },
    });

    const handleSave = async () => {
        const updatedData = { ...testData, timestamp: Date.now() };
        setTestData(updatedData);
        await saveTestData({ test_data: updatedData });
    };

    return (
        <div className="test-section">
            <h3>💾 Mutation Test</h3>
            <p>Tests data mutation with success notifications</p>

            <div style={{ marginBottom: '10px' }}>
                <textarea
                    value={JSON.stringify(testData, null, 2)}
                    onChange={e => {
                        try {
                            const parsed = JSON.parse(e.target.value);
                            setTestData(parsed);
                        } catch {
                            // Invalid JSON, ignore
                        }
                    }}
                    rows={4}
                    cols={50}
                    style={{ fontFamily: 'monospace', fontSize: '12px' }}
                />
            </div>

            <button
                onClick={handleSave}
                disabled={isSaving}
                style={{
                    padding: '8px 16px',
                    backgroundColor: isSaving ? 'var(--surface-variant)' : 'var(--primary)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: isSaving ? 'not-allowed' : 'pointer',
                }}
            >
                {isSaving ? '💾 Saving...' : '💾 Save Test Data'}
            </button>

            <div className="muted-text" style={{ marginTop: '10px', fontSize: '12px' }}>
                This will save test data to the configuration and trigger a refresh in other
                components
            </div>
        </div>
    );
}
