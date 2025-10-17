import React, { useCallback, useMemo, useState } from 'react';
import { moduleList } from '../../utils/constants/constants.js';
import { humanize } from '../../utils/tools.js';
import { useModuleExecution } from '../../hooks/useModuleExecution.js';
import { useApiData } from '../../hooks/useApiData';
import { scheduleAPI } from '../../utils/api/schedule';
import { useToast } from '../../contexts/ToastContext';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatGrid } from '../../components/statistics';
import { StatCard, Button, Modal } from '../../components/ui';
import { ScheduleCard } from '../../components/modules/ScheduleCard';
import { ScheduleField } from '../../components/fields/custom/ScheduleField';

export const SchedulePage = () => {
    // Toast for notifications
    const toast = useToast();

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingModule, setEditingModule] = useState(null);
    const [scheduleValue, setScheduleValue] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // API Data - Schedule
    const {
        data: scheduleData,
        isLoading: isLoadingSchedule,
        error: scheduleError,
        execute: refetchSchedules,
    } = useApiData({
        apiFunction: scheduleAPI.fetchSchedules,
    });

    // Module Execution Hook
    const { executeModule, isRunning } = useModuleExecution();

    // Derive data
    const schedules = useMemo(
        () => scheduleData?.data?.schedule || {},
        [scheduleData?.data?.schedule]
    );
    const availableModules = useMemo(
        () =>
            moduleList.map(moduleKey => ({
                key: moduleKey,
                label: humanize(moduleKey),
            })),
        []
    );

    // Statistics
    const statistics = useMemo(() => {
        // Only count schedules for modules that are in the available modules list
        const scheduledCount = availableModules.filter(
            module => schedules[module.key] && schedules[module.key] !== null
        ).length;
        const unscheduledCount = availableModules.length - scheduledCount;

        return [
            {
                label: 'Scheduled Modules',
                value: scheduledCount,
                colorClass: 'text-success',
            },
            {
                label: 'Unscheduled Modules',
                value: unscheduledCount,
                colorClass: 'text-warning',
            },
            {
                label: 'Total Modules',
                value: availableModules.length,
                colorClass: 'text-brand-primary',
            },
        ];
    }, [schedules, availableModules]);

    // Handlers
    const handleModuleRun = useCallback(
        async moduleKey => {
            try {
                await executeModule(moduleKey);
            } catch (error) {
                console.error(`Failed to execute ${moduleKey}:`, error);
            }
        },
        [executeModule]
    );

    const handleScheduleEdit = useCallback(
        moduleKey => {
            const module = availableModules.find(m => m.key === moduleKey);
            if (!module) return;

            const currentSchedule = schedules[moduleKey] || '';

            // Set modal state and open
            setEditingModule(module);
            setScheduleValue(currentSchedule);
            setIsModalOpen(true);
        },
        [availableModules, schedules]
    );

    const handleModalClose = useCallback(() => {
        if (isSaving) return; // Prevent closing while saving

        setIsModalOpen(false);
        setEditingModule(null);
        setScheduleValue('');
        setIsSaving(false);
    }, [isSaving]);

    const handleScheduleChange = useCallback(newValue => {
        setScheduleValue(newValue);
    }, []);

    const handleSave = useCallback(async () => {
        if (!editingModule || isSaving) return;

        setIsSaving(true);

        try {
            // Call dedicated schedule API
            await scheduleAPI.updateSchedule({
                module: editingModule.key,
                schedule: scheduleValue,
            });

            // Refresh schedule data (bypass cache to show updated data)
            await refetchSchedules({ useCache: false });

            // Show success toast
            toast.success(
                `Schedule ${scheduleValue ? 'updated' : 'removed'} for ${editingModule.label}`
            );

            // Close modal
            handleModalClose();
        } catch (error) {
            console.error('Failed to save schedule:', error);
            toast.error(`Failed to save schedule: ${error.message || 'Unknown error'}`);
            setIsSaving(false);
        }
    }, [editingModule, scheduleValue, toast, refetchSchedules, handleModalClose, isSaving]);

    const handleRemove = useCallback(async () => {
        if (!editingModule || isSaving) return;

        setIsSaving(true);

        try {
            // Call dedicated delete endpoint
            await scheduleAPI.deleteSchedule(editingModule.key);

            // Refresh schedule data (bypass cache to show updated data)
            await refetchSchedules({ useCache: false });

            // Show success toast
            toast.success(`Schedule removed for ${editingModule.label}`);

            // Close modal
            handleModalClose();
        } catch (error) {
            console.error('Failed to remove schedule:', error);
            toast.error(`Failed to remove schedule: ${error.message || 'Unknown error'}`);
            setIsSaving(false);
        }
    }, [editingModule, toast, refetchSchedules, handleModalClose, isSaving]);

    // Loading state
    if (isLoadingSchedule) {
        return (
            <div className="flex justify-center items-center min-h-64">
                <div className="text-primary text-lg">Loading module schedules...</div>
            </div>
        );
    }

    // Error state
    if (scheduleError) {
        return (
            <div className="flex justify-center items-center min-h-64">
                <div className="text-error text-lg">
                    Error loading schedules: {scheduleError.message}
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-screen-xl mx-auto">
            {/* Page Header */}
            <PageHeader
                title="Module Scheduling"
                description="Configure when DAPS modules should run automatically"
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

            {/* Module Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {availableModules.map(module => (
                    <ScheduleCard
                        key={module.key}
                        moduleKey={module.key}
                        moduleLabel={module.label}
                        schedule={schedules[module.key]}
                        isRunning={isRunning(module.key)}
                        onRun={handleModuleRun}
                        onEdit={handleScheduleEdit}
                    />
                ))}
            </div>

            {/* Empty State */}
            {availableModules.length === 0 && (
                <div className="text-center py-12 text-secondary">
                    <span className="material-symbols-outlined text-4xl mb-2 block opacity-50">
                        schedule
                    </span>
                    <p className="text-lg">No modules available for scheduling</p>
                </div>
            )}

            {/* Schedule Configuration Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={handleModalClose}
                size="medium"
                closable={!isSaving}
            >
                <Modal.Header>Configure Schedule - {editingModule?.label || 'Module'}</Modal.Header>
                <Modal.Body>
                    {editingModule && (
                        <ScheduleField
                            field={{
                                key: 'schedule',
                                label: 'Schedule Configuration',
                                description: 'Configure when this module should run automatically',
                                required: false,
                            }}
                            value={scheduleValue}
                            onChange={handleScheduleChange}
                            disabled={isSaving}
                        />
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <div className="flex justify-between items-center w-full">
                        <Button onClick={handleRemove} variant="danger" disabled={isSaving}>
                            Remove Schedule
                        </Button>
                        <div className="flex gap-3">
                            <Button
                                onClick={handleModalClose}
                                variant="secondary"
                                disabled={isSaving}
                            >
                                Cancel
                            </Button>
                            <Button onClick={handleSave} variant="primary" disabled={isSaving}>
                                {isSaving ? 'Saving...' : 'Save Schedule'}
                            </Button>
                        </div>
                    </div>
                </Modal.Footer>
            </Modal>
        </div>
    );
};
