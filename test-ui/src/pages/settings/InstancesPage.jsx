import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatGrid } from '../../components/statistics';
import { StatCard } from '../../components/ui';
import { InstanceCard } from '../../components/instances/InstanceCard';
import { Button } from '../../components/ui/button/Button';
import { Modal } from '../../components/ui';
import { FieldRegistry } from '../../components/fields/FieldRegistry';
import { ServiceIcon } from '../../components/ui/ServiceIcon';
import { useApiData } from '../../hooks/useApiData';
import { useToast } from '../../contexts/ToastContext';
import { instancesAPI } from '../../utils/api/instances';
import { INSTANCE_SCHEMA } from '../../utils/constants/instance_schema';
import { humanize } from '../../utils/tools';

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
    const toast = useToast();

    // Connection testing state
    const [testingInstances, setTestingInstances] = useState(new Set());
    const [connectionStatus, setConnectionStatus] = useState({});

    // Track if bulk testing has been performed for this page load
    const bulkTestingCompletedRef = useRef(false);

    // Modal state
    const [addModalOpen, setAddModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [modalServiceType, setModalServiceType] = useState(null);
    const [modalInstanceData, setModalInstanceData] = useState(null);
    const [formData, setFormData] = useState({});
    const [formErrors, setFormErrors] = useState({});
    const [isTesting, setIsTesting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

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

    const services = useMemo(
        () => [
            { type: 'radarr', label: 'Radarr' },
            { type: 'sonarr', label: 'Sonarr' },
            { type: 'plex', label: 'Plex' },
        ],
        []
    );

    /**
     * Handle add instance action
     * @param {string} serviceType - Service type (radarr|sonarr|plex)
     */
    const handleAdd = useCallback(serviceType => {
        setModalServiceType(serviceType);
        setFormData({});
        setFormErrors({});
        setAddModalOpen(true);
    }, []);

    /**
     * Handle edit instance action
     * @param {string} serviceType - Service type (radarr|sonarr|plex)
     * @param {string} instanceName - Instance name
     * @param {string} instanceUrl - Instance URL
     */
    const handleEdit = useCallback(
        (serviceType, instanceName, instanceUrl) => {
            const instanceConfig = instances?.[serviceType]?.[instanceName];
            setModalServiceType(serviceType);
            setModalInstanceData({ name: instanceName, url: instanceUrl });
            setFormData({
                name: instanceName,
                url: instanceUrl,
                api: instanceConfig?.api || '',
            });
            setFormErrors({});
            setEditModalOpen(true);
        },
        [instances]
    );

    /**
     * Handle delete instance action
     * @param {string} serviceType - Service type (radarr|sonarr|plex)
     * @param {string} instanceName - Instance name
     * @param {string} instanceUrl - Instance URL
     */
    const handleDelete = useCallback((serviceType, instanceName, instanceUrl) => {
        setModalServiceType(serviceType);
        setModalInstanceData({ name: instanceName, url: instanceUrl });
        setDeleteModalOpen(true);
    }, []);

    /**
     * Validate form data
     * @returns {boolean} True if valid
     */
    const validateForm = useCallback(() => {
        const errors = {};
        INSTANCE_SCHEMA.forEach(field => {
            if (field.required && !formData[field.key]) {
                errors[field.key] = `${field.label} is required`;
            }
        });
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    }, [formData]);

    /**
     * Handle form submission for Add/Edit
     */
    const handleFormSubmit = useCallback(
        async isEdit => {
            if (!validateForm()) {
                toast.error('Please fill in all required fields');
                return;
            }

            setIsTesting(true);

            try {
                // Test connection first
                const testResult = await instancesAPI.testInstanceConfig({
                    service: modalServiceType,
                    name: formData.name,
                    url: formData.url,
                    api: formData.api,
                });

                setIsTesting(false);

                // If test passed, save the configuration
                if (testResult) {
                    setIsSaving(true);

                    try {
                        const instanceData = {
                            service: modalServiceType,
                            name: formData.name,
                            url: formData.url,
                            api: formData.api,
                        };

                        if (isEdit) {
                            // Update existing instance
                            await instancesAPI.updateInstance(modalInstanceData.name, instanceData);
                        } else {
                            // Create new instance
                            await instancesAPI.createInstance(instanceData);
                        }

                        toast.success(
                            `Instance ${isEdit ? 'updated' : 'added'} successfully: ${formData.name}`
                        );
                        setIsSaving(false);

                        // Close modal and refresh (bypass cache to show updated data)
                        setAddModalOpen(false);
                        setEditModalOpen(false);
                        refreshInstances({ useCache: false });
                    } catch (saveError) {
                        setIsSaving(false);
                        console.error('Instance save error:', saveError);
                        toast.error(
                            saveError.message || `Failed to ${isEdit ? 'update' : 'add'} instance`
                        );
                    }
                }
            } catch (error) {
                setIsTesting(false);
                setIsSaving(false);
                console.error('Instance save error:', error);
                toast.error(error.message || `Failed to ${isEdit ? 'update' : 'add'} instance`);
            }
        },
        [validateForm, modalServiceType, formData, modalInstanceData, toast, refreshInstances]
    );

    /**
     * Handle delete confirmation
     */
    const handleConfirmDelete = useCallback(async () => {
        setIsSaving(true);

        try {
            // Call actual delete endpoint
            await instancesAPI.deleteInstance(modalInstanceData.name, modalServiceType);

            toast.success(`Instance deleted successfully: ${modalInstanceData.name}`);
            setIsSaving(false);
            setDeleteModalOpen(false);
            refreshInstances({ useCache: false });
        } catch (error) {
            setIsSaving(false);
            console.error('Instance delete error:', error);
            toast.error(error.message || 'Failed to delete instance');
        }
    }, [modalInstanceData, modalServiceType, toast, refreshInstances]);

    /**
     * Handle field change
     */
    const handleFieldChange = useCallback((fieldKey, value) => {
        setFormData(prev => ({ ...prev, [fieldKey]: value }));
        // Clear error for this field
        setFormErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[fieldKey];
            return newErrors;
        });
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
                    <Button variant="primary" onClick={refreshInstances} className="mt-4">
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
            <StatGrid columns={3} className="mb-8">
                {statistics.map(stat => (
                    <StatCard
                        key={stat.label}
                        label={stat.label}
                        value={stat.value}
                        colorClass={stat.colorClass}
                    />
                ))}
            </StatGrid>

            {/* Service Sections */}
            {services.map(service => (
                <div key={service.type} className="mb-8">
                    {/* Service Header */}
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-2xl font-semibold text-primary flex items-center gap-2">
                            <ServiceIcon service={service.type} size="large" />
                            {service.label} Instances
                        </h2>
                        <Button variant="primary" onClick={() => handleAdd(service.type)}>
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
                                variant="primary"
                                onClick={() => handleAdd(service.type)}
                                className="mt-4"
                            >
                                + Add {service.label} Instance
                            </Button>
                        </div>
                    )}
                </div>
            ))}

            {/* Add Instance Modal */}
            <Modal isOpen={addModalOpen} onClose={() => setAddModalOpen(false)} size="medium">
                <Modal.Header>
                    Add {modalServiceType?.charAt(0).toUpperCase() + modalServiceType?.slice(1)}{' '}
                    Instance
                </Modal.Header>
                <Modal.Body>
                    <div className="flex flex-col gap-4">
                        {INSTANCE_SCHEMA.map(field => {
                            const FieldComponent = FieldRegistry.getField(field.type);
                            return (
                                <FieldComponent
                                    key={field.key}
                                    field={field}
                                    value={formData[field.key] || ''}
                                    onChange={value => handleFieldChange(field.key, value)}
                                    errorMessage={formErrors[field.key]}
                                    highlightInvalid={!!formErrors[field.key]}
                                />
                            );
                        })}
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <Button
                        variant="secondary"
                        onClick={() => setAddModalOpen(false)}
                        disabled={isTesting || isSaving}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        onClick={() => handleFormSubmit(false)}
                        disabled={isTesting || isSaving}
                    >
                        {isTesting ? 'Testing...' : isSaving ? 'Saving...' : 'Add Instance'}
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Edit Instance Modal */}
            <Modal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} size="medium">
                <Modal.Header>
                    Edit {modalServiceType?.charAt(0).toUpperCase() + modalServiceType?.slice(1)}{' '}
                    Instance
                </Modal.Header>
                <Modal.Body>
                    <div className="flex flex-col gap-4">
                        {INSTANCE_SCHEMA.map(field => {
                            const FieldComponent = FieldRegistry.getField(field.type);
                            return (
                                <FieldComponent
                                    key={field.key}
                                    field={field}
                                    value={formData[field.key] || ''}
                                    onChange={value => handleFieldChange(field.key, value)}
                                    errorMessage={formErrors[field.key]}
                                    highlightInvalid={!!formErrors[field.key]}
                                    disabled={field.key === 'name'} // Disable name field in edit mode
                                />
                            );
                        })}
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <Button
                        variant="secondary"
                        onClick={() => setEditModalOpen(false)}
                        disabled={isTesting || isSaving}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        onClick={() => handleFormSubmit(true)}
                        disabled={isTesting || isSaving}
                    >
                        {isTesting ? 'Testing...' : isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Delete Instance Modal */}
            <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} size="small">
                <Modal.Header>Confirm Delete</Modal.Header>
                <Modal.Body>
                    <div className="flex flex-col gap-4">
                        <p className="text-base">Are you sure you want to delete this instance?</p>
                        <div className="p-4 bg-surface-alt rounded-md border border-border">
                            <div className="flex flex-col gap-2 text-sm">
                                <div>
                                    <span className="text-secondary">Service:</span>{' '}
                                    <span className="font-medium">
                                        {modalServiceType?.charAt(0).toUpperCase() +
                                            modalServiceType?.slice(1)}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-secondary">Instance:</span>{' '}
                                    <span className="font-medium">{humanize(modalInstanceData?.name)}</span>
                                </div>
                                <div>
                                    <span className="text-secondary">URL:</span>{' '}
                                    <span className="font-medium">{modalInstanceData?.url}</span>
                                </div>
                            </div>
                        </div>
                        <p className="text-sm text-warning">⚠️ This action cannot be undone.</p>
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <Button
                        variant="secondary"
                        onClick={() => setDeleteModalOpen(false)}
                        disabled={isSaving}
                    >
                        Cancel
                    </Button>
                    <Button variant="danger" onClick={handleConfirmDelete} disabled={isSaving}>
                        {isSaving ? 'Deleting...' : 'Delete Instance'}
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};
