import React, { useState, useEffect, useCallback } from 'react';
import { moduleList } from '../../utils/constants/constants.js';
import { humanize } from '../../utils/tools.js';
import { Card } from '../../components/ui/Card.jsx';
import { useToast } from '../../contexts/ToastContext.jsx';
import { useModuleExecution } from '../../hooks/useModuleExecution.js';

export const SchedulePage = () => {
    const [availableModules, setAvailableModules] = useState([]);
    const [schedules, setSchedules] = useState({});
    const [loading, setLoading] = useState(true);
    const toast = useToast();

    // Add execution hook
    const {
        runningModules,
        runStates,
        polling,
        executeModule,
        refreshData,
        isRunning,
        getRunState
    } = useModuleExecution();

    // Module discovery from constants.js
    useEffect(() => {
        const modules = moduleList.map(moduleKey => ({
            key: moduleKey,
            label: humanize(moduleKey),
            description: `Configure ${humanize(moduleKey)} module scheduling`
        }));
        setAvailableModules(modules);
    }, []);

    // Load schedule configuration and run states from API
    useEffect(() => {
        const loadData = async () => {
            try {
                const [configResponse] = await Promise.all([
                    fetch('/api/config'),
                    refreshData() // Load run states
                ]);

                const configData = await configResponse.json();
                const config = configData.data || configData;
                setSchedules(config.schedule || {});
            } catch (error) {
                console.error('Failed to load schedule page data:', error);
                toast.error('Failed to load schedule configuration');
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [toast, refreshData]);

    /**
     * Convert schedule string to human-readable summary
     * Imported from main UI Schedule.jsx implementation
     */
    const scheduleToHuman = useCallback((schedule) => {
        if (!schedule || typeof schedule !== 'string') return 'Not scheduled';

        const matchHourly = schedule.match(/^hourly\((\d{2})\)$/);
        const matchDaily = schedule.match(/^daily\(([\d:|]+)\)$/);
        const matchWeekly = schedule.match(/^weekly\(([\w@|]+)\)$/);
        const matchMonthly = schedule.match(/^monthly\(([\w@|]+)\)$/);
        const matchCron = schedule.match(/^cron\(([^)]*)\)$/);

        if (matchHourly) {
            return `Hourly at minute ${parseInt(matchHourly[1], 10)}`;
        }
        if (matchDaily) {
            const times = matchDaily[1].split('|');
            if (times.length === 1) {
                return `Daily at ${times[0]}`;
            }
            return `Daily at ${times.join(', ')}`;
        }
        if (matchWeekly) {
            const parts = matchWeekly[1].split('|');
            const dayTimes = parts.map(part => {
                const [day, time] = part.split('@');
                return `${day} at ${time}`;
            });
            return `Weekly: ${dayTimes.join(', ')}`;
        }
        if (matchMonthly) {
            const parts = matchMonthly[1].split('|');
            const dayTimes = parts.map(part => {
                const [day, time] = part.split('@');
                return `${day} at ${time}`;
            });
            return `Monthly: ${dayTimes.join(', ')}`;
        }
        if (matchCron) {
            try {
                // Basic cron parsing for common patterns
                const cronParts = matchCron[1].split(' ');
                if (cronParts.length >= 5) {
                    return `Custom: ${matchCron[1]}`;
                }
            } catch {
                // Fallback for invalid cron
            }
            return `Custom: ${matchCron[1]}`;
        }

        return `Unknown: ${schedule}`;
    }, []);

    /**
     * Handle schedule edit click - Placeholder following DirField pattern
     * @param {string} moduleKey - Module key to edit
     * @param {boolean} isEdit - Whether this is an edit (true) or add (false) operation
     */
    const handleScheduleEdit = useCallback((moduleKey, isEdit = false) => {
        const module = availableModules.find(m => m.key === moduleKey);
        if (!module) return;

        const currentSchedule = schedules[moduleKey] || '';
        const action = isEdit ? 'Edit' : 'Add';
        const humanReadable = currentSchedule ? scheduleToHuman(currentSchedule) : 'None';

        // PLACEHOLDER ALERT: Following DirField pattern exactly
        alert(
            `🚧 Schedule Configuration Modal\n\n` +
            `Module: ${module.label}\n` +
            `Action: ${action} schedule configuration\n` +
            `Current Schedule: ${currentSchedule || 'None'}\n` +
            `Human Readable: ${humanReadable}\n\n` +
            `This will open a modal to configure the module schedule when the modal system is implemented.`
        );
    }, [availableModules, schedules, scheduleToHuman]);

    /**
     * Handle schedule delete - Placeholder with confirmation
     * @param {string} moduleKey - Module key to delete schedule for
     */
    const handleScheduleDelete = useCallback((moduleKey) => {
        const module = availableModules.find(m => m.key === moduleKey);
        const currentSchedule = schedules[moduleKey];

        if (!module || !currentSchedule) return;

        const humanReadable = scheduleToHuman(currentSchedule);

        // PLACEHOLDER CONFIRMATION: Enhanced delete with full schedule details
        const confirmed = confirm(
            `🚧 Delete Schedule Confirmation\n\n` +
            `Module: ${module.label}\n` +
            `Current Schedule: ${currentSchedule}\n` +
            `Human Readable: ${humanReadable}\n\n` +
            `This will remove the schedule when the modal system is implemented.\n\n` +
            `Are you sure you want to delete this schedule?`
        );

        if (confirmed) {
            toast.info('🚧 Schedule deletion will be implemented with the modal system');
        }
    }, [availableModules, schedules, scheduleToHuman, toast]);

    /**
     * Handle module execution
     * @param {string} moduleKey - Module key to execute
     */
    const handleModuleRun = useCallback(async (moduleKey) => {
        try {
            await executeModule(moduleKey);
        } catch (error) {
            console.error(`Failed to execute ${moduleKey}:`, error);
        }
    }, [executeModule]);



    // Loading state
    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-64">
                <div className="text-primary text-lg">Loading module schedules...</div>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-surface rounded-lg border border-default p-4">
                    <div className="text-2xl font-bold text-success">
                        {Object.keys(schedules).length}
                    </div>
                    <div className="text-sm text-secondary">Scheduled Modules</div>
                </div>
                <div className="bg-surface rounded-lg border border-default p-4">
                    <div className="text-2xl font-bold text-warning">
                        {availableModules.length - Object.keys(schedules).length}
                    </div>
                    <div className="text-sm text-secondary">Unscheduled Modules</div>
                </div>
                <div className="bg-surface rounded-lg border border-default p-4">
                    <div className="text-2xl font-bold text-brand-primary">
                        {availableModules.length}
                    </div>
                    <div className="text-sm text-secondary">Total Modules</div>
                </div>
            </div>

            {/* Module Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {availableModules.map(module => {
                    const hasSchedule = !!schedules[module.key];
                    const isModuleRunning = isRunning(module.key);
                    const humanReadableSchedule = hasSchedule ? scheduleToHuman(schedules[module.key]) : 'Not scheduled';

                    return (
                        <div
                            key={module.key}
                            className="group bg-surface hover:bg-surface border border-transparent hover:border-default rounded-lg transition-all duration-150 cursor-pointer"
                            onClick={() => handleScheduleEdit(module.key, hasSchedule)}
                        >
                            {/* Compact Content */}
                            <div className="p-4">
                                {/* Header with module name and action */}
                                <div className="flex items-start justify-between mb-3">
                                    <h3 className="text-lg font-semibold text-primary group-hover:text-brand-primary transition-colors">
                                        {module.label}
                                    </h3>

                                    {/* Subtle text-based action button */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (!isModuleRunning) {
                                                handleModuleRun(module.key);
                                            }
                                        }}
                                        disabled={isModuleRunning}
                                        className={`text-sm font-medium px-3 py-1.5 rounded-md transition-all duration-150 min-h-8 select-none ${
                                            isModuleRunning
                                                ? 'bg-info/10 text-info border border-info/20 cursor-not-allowed opacity-75'
                                                : 'bg-primary/10 text-primary hover:bg-primary/20 active:bg-primary/30 active:scale-98 border border-primary/20 cursor-pointer'
                                        }`}
                                        title={isModuleRunning ? 'Module is running...' : 'Run now'}
                                    >
                                        {isModuleRunning ? 'Running...' : 'Run'}
                                    </button>
                                </div>

                                {/* Schedule Status - Compact */}
                                <div className="mb-3">
                                    <div className={`text-sm font-medium mb-1 ${
                                        hasSchedule ? 'text-success' : 'text-secondary'
                                    }`}>
                                        {humanReadableSchedule}
                                    </div>
                                </div>

                                {/* Running Indicator - Inline */}
                                {isModuleRunning && (
                                    <div className="flex items-center gap-2 text-xs text-info bg-info/5 px-2 py-1 rounded-md border border-info/20">
                                        <span className="w-1.5 h-1.5 bg-info rounded-full animate-pulse"></span>
                                        Currently running
                                    </div>
                                )}

                                {/* Last run info for first module only (to show functionality) */}
                                {module.key === 'sync_gdrive' && !isModuleRunning && (
                                    <div className="flex items-center gap-2 text-xs text-secondary mt-2">
                                        <span>Last run:</span>
                                        <span>Today at 06:57</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Empty State */}
            {availableModules.length === 0 && (
                <div className="text-center py-12 text-secondary">
                    <span className="material-symbols-outlined text-4xl mb-2 block opacity-50">schedule</span>
                    <p className="text-lg">No modules available for scheduling</p>
                </div>
            )}
        </div>
    );
};