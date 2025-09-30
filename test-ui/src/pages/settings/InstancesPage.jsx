import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatisticsGrid } from '../../components/statistics/StatisticsGrid';
import { InstanceCard } from '../../components/instances/InstanceCard';
import { Button } from '../../components/ui/Button';
import { useApiData } from '../../hooks/useApiData';
import { useToast } from '../../contexts/ToastContext';
import { instancesAPI } from '../../utils/api/instances';

/**
 * Instances Management page
 */
export const InstancesPage = () => {
    // Data loading
    const {
        data: instances,
        isLoading,
        error,
        execute: refreshInstances,
    } = useApiData({
        apiFunction: instancesAPI.fetchInstances,
    });

    // Toast notifications
    const { toast } = useToast();

    // Connection testing state
    const [testingInstances, setTestingInstances] = useState(new Set());
    const [connectionStatus, setConnectionStatus] = useState({});

    // Track if bulk testing has been performed for this page load
    const bulkTestingCompletedRef = useRef(false);

    // Calculate statistics
    const statistics = useMemo(() => {
        if (!instances) return [];

        const allInstanceNames = [
            ...Object.keys(instances?.radarr || {}),
            ...Object.keys(instances?.sonarr || {}),
            ...Object.keys(instances?.plex || {}),
        ];

        const connectedCount = allInstanceNames.filter(
            name => connectionStatus[name]?.success
        ).length;

        const failedCount = allInstanceNames.filter(
            name => connectionStatus[name]?.success === false
        ).length;

        return [
            {
                label: 'Total Instances',
                value: allInstanceNames.length,
                colorClass: 'text-primary',
            },
            { label: 'Connected', value: connectedCount, colorClass: 'text-success' },
            { label: 'Failed', value: failedCount, colorClass: 'text-error' },
        ];
    }, [instances, connectionStatus]);

    // Service configuration with custom SVG icons
    const services = useMemo(() => [
        {
            type: 'radarr',
            label: 'Radarr',
            icon: (
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                >
                    <path
                        fill="currentColor"
                        d="M5.274 0C3.189.039 1.19 1.547 1.19 4.705l.184 14.518c0 1.47 1.103 2.205 2.573 2.021L3.764 3.786c0-1.654.919-1.838 2.022-1.103l14.7 8.27c1.103.734 1.655 1.47 1.838 2.756c.92-1.654.552-4.043-1.286-5.33L7.991.846A4.56 4.56 0 0 0 5.274.001zm1.982 6.91l-.184 10.107l9.004-5.146Zm13.598 6.064l-15.068 8.82c-.92.552-2.022.736-3.124.368c.918 1.47 3.307 2.389 5.145 1.47l12.68-7.35c1.102-.736 1.286-2.022.367-3.308"
                    />
                </svg>
            ),
        },
        {
            type: 'sonarr',
            label: 'Sonarr',
            icon: (
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                >
                    <path
                        fill="currentColor"
                        d="m7.338 16.322l.165.159l-2.491 2.495l.13.129l2.493-2.498l.164.159l1.531-1.59l-.461-.444zm.106-8.651l-.161.161L8.855 9.4l.452-.453l-1.572-1.568l-.162.162L5 4.976c-.044.043-.084.088-.127.132ZM5 4.976l-.128.131c.043-.043.083-.088.128-.131m0-.001l-.129.13l.128-.131ZM16.631 16.24l-1.648-1.64l-.451.453l1.647 1.64l.161-.162l2.533 2.621l.007-.006l.053-.052c.023-.023.046-.048.067-.073L16.469 16.4ZM19 19.025c-.021.025-.044.05-.067.073zm-.127.127l.007-.006zm-2.397-11.69l.062.065zl-.163-.162l-1.549 1.575l.455.449l1.549-1.572l-.163-.16l2.544-2.476c-.042-.044-.083-.089-.126-.132Zm2.672-2.346l-.127-.132c.044.043.085.088.127.132m.024-.023l-.128-.131l-.022.021l.127.132zm-7.156 4.139a2.662 2.662 0 0 0-1.941.8a2.618 2.618 0 0 0-.795 1.745a.049.049 0 0 0 0 .019v.365a3.167 3.167 0 0 0 .037.325a2.61 2.61 0 0 0 .763 1.434a2.4 2.4 0 0 0 .342.292a2.761 2.761 0 0 0 3.2 0a2.443 2.443 0 0 0 .279-.233a.548.548 0 0 0 .059-.059a2.762 2.762 0 0 0 0-3.888a2.653 2.653 0 0 0-1.944-.8m6.917 9.862l-.053.052c.02-.017.036-.034.053-.052M5.823 4.238l-.008.007Zm-.822.736l-.002.002zm.307 14.333l-.02-.018ZM7.505 12.1a5.636 5.636 0 0 0-1.426-4.257c-.806-.806-1.92-1.916-1.923-1.919a9.314 9.314 0 0 0-2.024 5.35a.127.127 0 0 0-.018.064Q2.1 11.653 2.1 12c0 .219 0 .439.014.658a9.789 9.789 0 0 0 .132 1.169a9.281 9.281 0 0 0 2.038 4.4c.007-.007.9-.9 1.75-1.754A5.629 5.629 0 0 0 7.505 12.1m4.527 4.587c-1.806 0-3.036.167-4.358 1.49a432.34 432.34 0 0 0-1.694 1.7c.084.065.168.128.255.189a9.428 9.428 0 0 0 5.774 1.846a9.485 9.485 0 0 0 5.784-1.846c.1-.068.189-.139.282-.211l-1.6-1.6c-1.428-1.431-2.56-1.568-4.443-1.568m-6.113 3.142L5.9 19.81Zm-.31-.252l-.023-.021Zm6.423-11.986a5.862 5.862 0 0 0 4.441-1.562c.753-.753 1.744-1.74 1.762-1.758a9.523 9.523 0 0 0-6.226-2.18a9.557 9.557 0 0 0-6.186 2.147L7.683 6.1a5.788 5.788 0 0 0 4.349 1.491m6.99-2.607v-.001l-.009-.009l-.002-.002l.002.002Zm-1.183 3.037c-1.2 1.2-1.3 2.238-1.3 4.075a5.714 5.714 0 0 0 1.48 4.358c.879.879 1.712 1.708 1.734 1.73A9.547 9.547 0 0 0 21.9 12a9.614 9.614 0 0 0-2.429-6.531c.144.166.283.334.414.5zm1.525 10.616l-.022.023zM19.233 5.2l-.084-.089z"
                    />
                </svg>
            ),
        },
        {
            type: 'plex',
            label: 'Plex',
            icon: (
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                >
                    <path
                        fill="currentColor"
                        d="M4 2c-1.11 0-2 .89-2 2v16c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V4c0-1.11-.89-2-2-2H4m4.56 4h3.5l3.44 6l-3.44 6h-3.5L12 12L8.56 6Z"
                    />
                </svg>
            ),
        },
    ], []);

    // Placeholder handlers (Phase 4)
    /**
     * Handle add instance action (placeholder)
     * @param {string} serviceType - Service type (radarr|sonarr|plex)
     */
    const handleAdd = useCallback(serviceType => {
        const serviceLabel = serviceType.charAt(0).toUpperCase() + serviceType.slice(1);

        alert(
            `🚧 Add ${serviceLabel} Instance\n\n` +
                `Service: ${serviceType}\n` +
                `Action: Add new instance configuration\n\n` +
                `This will open a modal to configure the instance when the modal system is implemented.`
        );
    }, []);

    /**
     * Handle edit instance action (placeholder)
     * @param {string} serviceType - Service type (radarr|sonarr|plex)
     * @param {string} instanceName - Instance name
     * @param {string} instanceUrl - Instance URL
     */
    const handleEdit = useCallback((serviceType, instanceName, instanceUrl) => {
        const serviceLabel = serviceType.charAt(0).toUpperCase() + serviceType.slice(1);

        alert(
            `🚧 Edit Instance Configuration\n\n` +
                `Service: ${serviceLabel}\n` +
                `Instance: ${instanceName}\n` +
                `Current URL: ${instanceUrl}\n` +
                `Action: Edit instance configuration\n\n` +
                `This will open a modal to configure the instance when the modal system is implemented.`
        );
    }, []);

    /**
     * Handle delete instance action (placeholder)
     * @param {string} serviceType - Service type (radarr|sonarr|plex)
     * @param {string} instanceName - Instance name
     * @param {string} instanceUrl - Instance URL
     */
    const handleDelete = useCallback((serviceType, instanceName, instanceUrl) => {
        const serviceLabel = serviceType.charAt(0).toUpperCase() + serviceType.slice(1);

        alert(
            `🚧 Delete Instance Confirmation\n\n` +
                `⚠️ Warning: This will delete the instance\n\n` +
                `Service: ${serviceLabel}\n` +
                `Instance: ${instanceName}\n` +
                `URL: ${instanceUrl}\n\n` +
                `This will open a confirmation modal when the modal system is implemented.`
        );
    }, []);

    /**
     * Handle connection test for an instance
     * @param {string} serviceType - Service type (radarr|sonarr|plex)
     * @param {string} instanceName - Instance name
     * @param {Object} instanceData - Instance configuration data
     * @param {boolean} isBulkTest - Whether this is part of bulk testing (suppresses toasts)
     */
    const handleTest = useCallback(
        async (serviceType, instanceName, instanceData, isBulkTest = false) => {
            // Add to testing set
            setTestingInstances(prev => new Set([...prev, instanceName]));

            try {
                const result = await instancesAPI.testInstanceConfig({
                    service: serviceType,
                    name: instanceName,
                    url: instanceData.url,
                    api: instanceData.api,
                });

                // Success
                const successMessage =
                    result?.message || result?.data?.message || 'Connection successful';

                setConnectionStatus(prev => ({
                    ...prev,
                    [instanceName]: {
                        success: true,
                        message: successMessage,
                        timestamp: Date.now(),
                    },
                }));

                // Only show toast for manual tests (not bulk tests)
                if (!isBulkTest) {
                    try {
                        toast.success(`${instanceName}: ${successMessage}`);
                    } catch (toastError) {
                        console.warn('Toast notification failed:', toastError);
                        // Don't rethrow - connection test was successful
                    }
                }
            } catch (error) {
                // Failure - Handle case where error might be undefined or have unexpected structure
                console.error('Connection test error for', instanceName, ':', error);

                let errorMessage = 'Connection failed';
                if (error && typeof error === 'object') {
                    errorMessage =
                        error.message || error.error || String(error) || 'Connection failed';
                } else if (error) {
                    errorMessage = String(error);
                }

                setConnectionStatus(prev => ({
                    ...prev,
                    [instanceName]: {
                        success: false,
                        message: errorMessage,
                        timestamp: Date.now(),
                    },
                }));

                // Only show toast for manual tests (not bulk tests)
                if (!isBulkTest) {
                    toast.error(`${instanceName}: ${errorMessage}`);
                }
            } finally {
                // Remove from testing set
                setTestingInstances(prev => {
                    const next = new Set(prev);
                    next.delete(instanceName);
                    return next;
                });
            }
        },
        [toast]
    );

    /**
     * Perform bulk testing of all instances ONCE when page loads and instances data is available
     */
    useEffect(() => {
        if (!instances || bulkTestingCompletedRef.current) return;

        // Mark bulk testing as completed to prevent repeated execution
        bulkTestingCompletedRef.current = true;

        // Collect all instances to test
        const instancesToTest = [];

        services.forEach(service => {
            const serviceInstances = instances[service.type] || {};
            Object.entries(serviceInstances).forEach(([name, data]) => {
                instancesToTest.push({
                    serviceType: service.type,
                    instanceName: name,
                    instanceData: data,
                });
            });
        });

        // Test all instances with isBulkTest=true to suppress toasts
        instancesToTest.forEach(({ serviceType, instanceName, instanceData }) => {
            handleTest(serviceType, instanceName, instanceData, true);
        });
    }, [instances, handleTest, services]);

    // Loading state
    if (isLoading) {
        return (
            <div className="p-6 max-w-screen-xl mx-auto">
                <PageHeader
                    title="Instance Management"
                    description="Configure and test connections to Radarr, Sonarr, and Plex instances"
                />
                <div className="text-center py-12">
                    <p className="text-secondary">Loading instances...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="p-6 max-w-screen-xl mx-auto">
                <PageHeader
                    title="Instance Management"
                    description="Configure and test connections to Radarr, Sonarr, and Plex instances"
                />
                <div className="text-center py-12">
                    <p className="text-error">Error loading instances: {error.message}</p>
                    <Button color="primary" onClick={refreshInstances} className="mt-4">
                        Retry
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-screen-xl mx-auto">
            {/* Page Header */}
            <PageHeader
                title="Instance Management"
                description="Configure and test connections to Radarr, Sonarr, and Plex instances"
            />

            {/* Statistics */}
            <StatisticsGrid statistics={statistics} columns={3} className="mb-8" />

            {/* Service Sections */}
            {services.map(service => (
                <div key={service.type} className="mb-8">
                    {/* Service Header */}
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-2xl font-semibold text-primary flex items-center gap-2">
                            {service.icon}
                            {service.label} Instances
                        </h2>
                        <Button color="primary" onClick={() => handleAdd(service.type)}>
                            + Add {service.label}
                        </Button>
                    </div>

                    {/* Instance Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {Object.entries(instances?.[service.type] || {}).map(([name, data]) => (
                            <InstanceCard
                                key={name}
                                instance={{ name, ...data }}
                                serviceType={service.type}
                                connectionStatus={connectionStatus[name]}
                                isTesting={testingInstances.has(name)}
                                onTest={() => handleTest(service.type, name, data)}
                                onEdit={() => handleEdit(service.type, name, data.url)}
                                onDelete={() => handleDelete(service.type, name, data.url)}
                            />
                        ))}
                    </div>

                    {/* Empty State */}
                    {Object.keys(instances?.[service.type] || {}).length === 0 && (
                        <div className="text-center py-12 text-secondary">
                            <p>No {service.label} instances configured</p>
                            <Button
                                color="primary"
                                onClick={() => handleAdd(service.type)}
                                className="mt-4"
                            >
                                + Add {service.label} Instance
                            </Button>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};
