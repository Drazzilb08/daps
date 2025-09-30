import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { scheduleToHuman } from '../../utils/schedule';

/**
 * ModuleCard - Reusable module display component
 * Shows module information, schedule, and execution controls
 *
 * @param {Object} props - Component props
 * @param {string} props.moduleKey - Module key/identifier
 * @param {string} props.moduleLabel - Display label
 * @param {string} [props.schedule] - Schedule string
 * @param {boolean} [props.isRunning=false] - Module execution state
 * @param {Function} props.onRun - Execute module callback (moduleKey) => void
 * @param {Function} props.onEdit - Edit schedule callback (moduleKey, isEdit) => void
 *
 * @example
 * <ModuleCard
 *     moduleKey="sync_gdrive"
 *     moduleLabel="Sync GDrive"
 *     schedule="hourly(30)"
 *     isRunning={false}
 *     onRun={(key) => executeModule(key)}
 *     onEdit={(key, isEdit) => openModal(key, isEdit)}
 * />
 */
export const ModuleCard = React.memo(({
    moduleKey,
    moduleLabel,
    schedule,
    isRunning = false,
    onRun,
    onEdit
}) => {
    const hasSchedule = !!schedule;
    const humanReadableSchedule = hasSchedule ? scheduleToHuman(schedule) : 'Not scheduled';

    const handleCardClick = useCallback(() => {
        onEdit(moduleKey, hasSchedule);
    }, [moduleKey, hasSchedule, onEdit]);

    const handleRunClick = useCallback((e) => {
        e.stopPropagation();
        if (!isRunning) {
            onRun(moduleKey);
        }
    }, [moduleKey, isRunning, onRun]);

    return (
        <div
            className="group bg-surface hover:bg-surface border border-transparent hover:border-default rounded-lg transition-all duration-150 cursor-pointer"
            onClick={handleCardClick}
        >
            {/* Compact Content */}
            <div className="p-4">
                {/* Header with module name and action */}
                <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-semibold text-primary group-hover:text-brand-primary transition-colors">
                        {moduleLabel}
                    </h3>

                    {/* Run button */}
                    <button
                        onClick={handleRunClick}
                        disabled={isRunning}
                        className={`text-sm font-medium px-3 py-1.5 rounded-md transition-all duration-150 min-h-8 select-none ${
                            isRunning
                                ? 'bg-info/10 text-info border border-info/20 cursor-not-allowed opacity-75'
                                : 'bg-primary/10 text-primary hover:bg-primary/20 active:bg-primary/30 active:scale-98 border border-primary/20 cursor-pointer'
                        }`}
                        title={isRunning ? 'Module is running...' : 'Run now'}
                    >
                        {isRunning ? 'Running...' : 'Run'}
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
                {isRunning && (
                    <div className="flex items-center gap-2 text-xs text-info bg-info/5 px-2 py-1 rounded-md border border-info/20">
                        <span className="w-1.5 h-1.5 bg-info rounded-full animate-pulse"></span>
                        Currently running
                    </div>
                )}
            </div>
        </div>
    );
});

ModuleCard.displayName = 'ModuleCard';

ModuleCard.propTypes = {
    moduleKey: PropTypes.string.isRequired,
    moduleLabel: PropTypes.string.isRequired,
    schedule: PropTypes.string,
    isRunning: PropTypes.bool,
    onRun: PropTypes.func.isRequired,
    onEdit: PropTypes.func.isRequired,
};

export default ModuleCard;