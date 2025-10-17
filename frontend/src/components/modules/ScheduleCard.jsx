import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { scheduleToHuman } from '../../utils/schedule';
import { Card } from '../ui/card/Card';
import { Button } from '../ui/button/Button';

/**
 * ScheduleCard - Displays module schedule information with execution controls
 * Composes Card primitive for consistent styling and structure
 *
 * @param {Object} props - Component props
 * @param {string} props.moduleKey - Module identifier
 * @param {string} props.moduleLabel - Display label for module
 * @param {string} [props.schedule] - Schedule string (e.g., "hourly(30)")
 * @param {boolean} [props.isRunning=false] - Module execution state
 * @param {Function} props.onRun - Execute module callback: (moduleKey) => void
 * @param {Function} props.onEdit - Edit schedule callback: (moduleKey, hasSchedule) => void
 *
 * @example
 * <ScheduleCard
 *     moduleKey="sync_gdrive"
 *     moduleLabel="Sync GDrive"
 *     schedule="hourly(30)"
 *     isRunning={false}
 *     onRun={(key) => executeModule(key)}
 *     onEdit={(key, isEdit) => openModal(key, isEdit)}
 * />
 */
export const ScheduleCard = React.memo(
    ({ moduleKey, moduleLabel, schedule, isRunning = false, onRun, onEdit }) => {
        const hasSchedule = !!schedule;
        const humanReadableSchedule = hasSchedule ? scheduleToHuman(schedule) : 'Not scheduled';

        const handleCardClick = useCallback(() => {
            onEdit(moduleKey, hasSchedule);
        }, [moduleKey, hasSchedule, onEdit]);

        const handleRunClick = useCallback(
            e => {
                e.stopPropagation();
                if (!isRunning) {
                    onRun(moduleKey);
                }
            },
            [moduleKey, isRunning, onRun]
        );

        return (
            <Card clickable hoverable onClick={handleCardClick}>
                <Card.Header
                    title={moduleLabel}
                    action={
                        <Button
                            variant={isRunning ? 'secondary' : 'primary'}
                            size="small"
                            onClick={handleRunClick}
                            disabled={isRunning}
                        >
                            {isRunning ? 'Running...' : 'Run'}
                        </Button>
                    }
                />
                <Card.Body>
                    <div
                        className={`text-sm font-medium ${hasSchedule ? 'text-success' : 'text-secondary'}`}
                    >
                        {humanReadableSchedule}
                    </div>

                    {/* Running indicator */}
                    {isRunning && (
                        <div className="flex items-center gap-2 text-xs text-info bg-info/5 px-2 py-1 rounded-md border border-info/20 mt-2">
                            <span className="w-1.5 h-1.5 bg-info rounded-full animate-pulse" />
                            Currently running
                        </div>
                    )}
                </Card.Body>
            </Card>
        );
    }
);

ScheduleCard.displayName = 'ScheduleCard';

ScheduleCard.propTypes = {
    moduleKey: PropTypes.string.isRequired,
    moduleLabel: PropTypes.string.isRequired,
    schedule: PropTypes.string,
    isRunning: PropTypes.bool,
    onRun: PropTypes.func.isRequired,
    onEdit: PropTypes.func.isRequired,
};

export default ScheduleCard;
