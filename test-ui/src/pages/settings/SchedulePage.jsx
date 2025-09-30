import React, { useCallback, useMemo } from 'react';
import { moduleList } from '../../utils/constants/constants.js';
import { humanize } from '../../utils/tools.js';
import { useModuleExecution } from '../../hooks/useModuleExecution.js';
import { useApiData } from '../../hooks/useApiData';
import { configAPI } from '../../utils/api/config';
import { StatisticsGrid } from '../../components/statistics/StatisticsGrid';
import { ScheduleCard } from '../../components/modules/ScheduleCard';

export const SchedulePage = () => {
    // API Data - Configuration
    const {
        data: configData,
        isLoading: isLoadingConfig,
        error: configError,
    } = useApiData({
        apiFunction: configAPI.fetchConfig,
    });

    // Module Execution Hook
    const { executeModule, isRunning } = useModuleExecution();

    // Derive data
    const schedules = useMemo(() => configData?.schedule || {}, [configData?.schedule]);
    const availableModules = useMemo(
        () =>
            moduleList.map(moduleKey => ({
                key: moduleKey,
                label: humanize(moduleKey),
            })),
        []
    );

    // Statistics
    const statistics = useMemo(
        () => [
            {
                label: 'Scheduled Modules',
                value: Object.keys(schedules).length,
                colorClass: 'text-success',
            },
            {
                label: 'Unscheduled Modules',
                value: availableModules.length - Object.keys(schedules).length,
                colorClass: 'text-warning',
            },
            {
                label: 'Total Modules',
                value: availableModules.length,
                colorClass: 'text-brand-primary',
            },
        ],
        [schedules, availableModules]
    );

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
        (moduleKey, isEdit = false) => {
            const module = availableModules.find(m => m.key === moduleKey);
            if (!module) return;

            const currentSchedule = schedules[moduleKey] || '';
            const action = isEdit ? 'Edit' : 'Add';

            // PLACEHOLDER ALERT: Following DirField pattern exactly
            alert(
                `🚧 Schedule Configuration Modal\n\n` +
                    `Module: ${module.label}\n` +
                    `Action: ${action} schedule configuration\n` +
                    `Current Schedule: ${currentSchedule || 'None'}\n\n` +
                    `This will open a modal to configure the module schedule when the modal system is implemented.`
            );
        },
        [availableModules, schedules]
    );

    // Loading state
    if (isLoadingConfig) {
        return (
            <div className="flex justify-center items-center min-h-64">
                <div className="text-primary text-lg">Loading module schedules...</div>
            </div>
        );
    }

    // Error state
    if (configError) {
        return (
            <div className="flex justify-center items-center min-h-64">
                <div className="text-error text-lg">
                    Error loading schedules: {configError.message}
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-screen-xl mx-auto">
            {/* Page Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-semibold mb-2 text-primary">Module Scheduling</h1>
                <p className="text-secondary text-lg">
                    Configure when DAPS modules should run automatically
                </p>
            </div>

            {/* Statistics */}
            <StatisticsGrid statistics={statistics} columns={3} className="mb-8" />

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
        </div>
    );
};
