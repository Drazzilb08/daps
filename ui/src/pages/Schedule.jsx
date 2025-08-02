import { useState, useEffect, useRef, useCallback } from 'react';

import {
    fetchConfig,
    postConfig,
    fetchAllRunStates,
    getModuleStatus,
    runScheduledModule,
    cancelScheduledModule,
} from '../utils/api';
import { humanize, getIcon, getSpinner } from '../utils/tools';
import TooltipFactory from '../components/Tooltip';

import ModalFactory from '../components/modals/ModalFactory';
import { moduleList } from '../utils/constants/constants';

import cronstrue from 'cronstrue/i18n';
import { isValidCron } from 'cron-validator';
import { useToast } from '../components/providers/ToastProvider';
import '../css/schedule.css';

// --- Helper: last run display ---
function formatLastRun(dt) {
    if (!dt) return '';
    const date = new Date(dt);
    if (isNaN(date)) return '';
    const now = new Date();
    const today = now.toDateString();
    const runDay = date.toDateString();
    let dayStr = today === runDay ? 'Today' : runDay;
    let h = date.getHours().toString().padStart(2, '0');
    let m = date.getMinutes().toString().padStart(2, '0');
    return `${dayStr} at ${h}:${m}`;
}

// Convert schedule string to human-readable summary
function scheduleToHuman(schedule) {
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
        const times = matchDaily[1].split('|').join(', ');
        return `Daily at ${times}`;
    }
    if (matchWeekly) {
        const days = matchWeekly[1]
            .split('|')
            .map(d => d.split('@')[0])
            .join(', ');
        return `Weekly on ${days}`;
    }
    if (matchMonthly) {
        const days = matchMonthly[1]
            .split('|')
            .map(d => d.split('@')[0])
            .join(', ');
        return `Monthly on day(s) ${days}`;
    }
    if (matchCron) {
        const expr = matchCron[1];
        if (!expr) return 'Custom cron (empty)';
        if (!isValidCron(expr, { seconds: true, allowBlankDay: true })) {
            return 'Invalid cron expression';
        }
        try {
            return `Cron: ${cronstrue.toString(expr)}`;
        } catch {
            return 'Cron: (unparseable)';
        }
    }
    return schedule; // fallback
}

export default function SchedulePage() {
    const toast = useToast();
    const [loading, setLoading] = useState(true);
    const [schedule, setSchedule] = useState({});
    const [allRunStates, setAllRunStates] = useState({});
    const [modalProps, setModalProps] = useState(null);
    // Local modal state for disabling the Save/Add button
    const [modalState, setModalState] = useState({
        scheduleValid: true,
        currentType: 'daily',
    });

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        setLoading(true);
        const config = await fetchConfig();
        const runStates = await fetchAllRunStates();
        setSchedule(config.schedule || {});
        setAllRunStates(runStates || {});
        setLoading(false);
    }

    function handleSave(module, value) {
        if (
            value &&
            typeof value === 'string' &&
            value.startsWith('cron(') &&
            !/^cron\((\s*([*/\d,-]+\s+){4,5}[*/\d,-]+\s*)\)$/.test(value)
        ) {
            toast('Invalid cron expression. Cannot save.', 'error');
            return;
        }
        const newSchedule = { ...schedule, [module]: value };
        postConfig({ schedule: newSchedule }).then(res => {
            if (res.success) {
                toast('Schedule saved!', 'success');
                setSchedule(newSchedule);
                setModalProps(null);
            } else {
                toast('Failed to save schedule: ' + (res.error || ''), 'error');
            }
        });
    }

    function handleDelete(module) {
        const newSchedule = { ...schedule };
        delete newSchedule[module];
        postConfig({ schedule: newSchedule }).then(res => {
            if (res.success) {
                toast('Schedule deleted!', 'success');
                setSchedule(newSchedule);
                setModalProps(null);
            } else {
                toast('Failed to delete schedule: ' + (res.error || ''), 'error');
            }
        });
    }

    // --- Modal open: wire up onValidityChange to ScheduleField
    function openModalForSchedule({ module, isEdit, scheduleTime }) {
        // Determine initial schedule value and initial type for modalState
        let initialValue = '';
        let initialType = 'hourly'; // default type for new modal

        if (isEdit && scheduleTime) {
            initialValue = scheduleTime;
        } else {
            // New modal (not edit) defaults to hourly(00)
            initialValue = 'hourly(00)';
        }

        // Parse initialType from initialValue (reusing your parseValue function from ScheduleField)
        // You'll want to bring parseValue here or duplicate logic for consistency:
        function parseValue(v) {
            let initialType = 'daily';
            if (typeof v === 'string') {
                if (v.match(/^hourly\((\d{2})\)$/)) {
                    initialType = 'hourly';
                } else if (v.match(/^daily\(([\d:|]+)\)$/)) {
                    initialType = 'daily';
                } else if (v.match(/^weekly\(([\w@|]+)\)$/)) {
                    initialType = 'weekly';
                } else if (v.match(/^monthly\(([\w@|]+)\)$/)) {
                    initialType = 'monthly';
                } else if (v.match(/^cron\(([^)]*)\)$/)) {
                    initialType = 'cron';
                }
            }
            return initialType;
        }

        initialType = parseValue(initialValue);

        // Reset modal state with parsed or default initialType
        setModalState({ scheduleValid: true, currentType: initialType });

        setModalProps({
            title: `${isEdit ? 'Edit' : 'Add'} ${humanize(module)} Schedule`,
            schema: [
                {
                    key: 'schedule',
                    label: 'Frequency',
                    type: 'schedule',
                    required: true,
                    placeholder: 'How often to run this module.',
                    description: 'How often to run this module.',
                    onValidityChange: valid => setModalState(s => ({ ...s, scheduleValid: valid })),
                    onTypeChange: type => setModalState(s => ({ ...s, currentType: type })),
                },
            ],
            entry: { schedule: initialValue },
            footerButtons: [
                ...(isEdit
                    ? [
                          {
                              id: 'delete-modal-btn',
                              label: 'Delete',
                              className: 'btn--remove-item',
                              type: 'button',
                          },
                      ]
                    : []),
                {
                    id: 'cancel-modal-btn',
                    label: 'Cancel',
                    className: 'btn--cancel',
                    type: 'button',
                },
                {
                    id: isEdit ? 'save-modal-btn' : 'add-modal-btn',
                    label: isEdit ? 'Save' : 'Add',
                    className: 'btn--success',
                    type: 'submit',
                    disabled: modalState.currentType === 'cron' && !modalState.scheduleValid,
                },
            ],
            onButtonClick: {
                'delete-modal-btn': async () => handleDelete(module),
                'cancel-modal-btn': () => setModalProps(null),
                'save-modal-btn': async ({ formData }) => {
                    const val = formData.schedule;
                    if (!val || !String(val).trim()) {
                        toast('You must enter a schedule expression.', 'error');
                        return;
                    }
                    if (modalState.currentType === 'cron' && !modalState.scheduleValid) {
                        toast('Cannot save: Schedule is invalid.', 'error');
                        return;
                    }
                    handleSave(module, val);
                },
                'add-modal-btn': async ({ formData }) => {
                    const val = formData.schedule;
                    if (!val || !String(val).trim()) {
                        toast('You must enter a schedule expression.', 'error');
                        return;
                    }
                    if (modalState.currentType === 'cron' && !modalState.scheduleValid) {
                        toast('Cannot save: Schedule is invalid.', 'error');
                        return;
                    }
                    handleSave(module, val);
                },
            },
            onClose: () => setModalProps(null),
        });
    }

    return (
        <div>
            {modalProps && <ModalFactory {...modalProps} />}
            <div className="card-list" id="schedule-list">
                {loading ? (
                    <div className="loader-modal">Loading…</div>
                ) : (
                    moduleList.map(module => (
                        <ScheduleCard
                            key={module}
                            module={module}
                            scheduleTime={schedule[module] || null}
                            runState={allRunStates[module]}
                            reload={loadData}
                            openModal={openModalForSchedule}
                            toast={toast}
                        />
                    ))
                )}
            </div>
        </div>
    );
}

function ScheduleCard({ module, scheduleTime, runState, reload, openModal, toast }) {
    const [running, setRunning] = useState(false);
    const [showStop, setShowStop] = useState(false);
    const [polling, setPolling] = useState(false);
    const btnRef = useRef(null);
    const [showTooltip, setShowTooltip] = useState(false);

    // 1. useCallback for pollStatus
    const pollStatus = useCallback(async () => {
        setPolling(true);
        let destroy = false;
        while (!destroy && running) {
            await new Promise(r => setTimeout(r, 1000));
            const state = await getModuleStatus(module);
            if (state !== running) {
                setRunning(state);
                if (!state) reload();
                break;
            }
        }
        setPolling(false);
        // Add all dependencies here:
    }, [running, module, reload]);

    // 2. useEffect includes all referenced values
    useEffect(() => {
        let destroy = false;
        (async () => {
            const state = await getModuleStatus(module);
            if (!destroy) setRunning(state);
            if (state && !polling) pollStatus();
        })();
        return () => {
            destroy = true;
        };
    }, [module, pollStatus, polling]);

    function handleCardClick() {
        openModal({
            module,
            isEdit: !!scheduleTime,
            scheduleTime,
        });
    }

    const humanSchedule = scheduleToHuman(scheduleTime);

    const tooltipText = running
        ? showStop
            ? `Cancel ${humanize(module)} Run`
            : 'Running…'
        : `Run ${humanize(module)} Now!`;

    return (
        <div className="card" tabIndex={0} onClick={handleCardClick}>
            <div className="card-title">{humanize(module)}</div>
            <div className="card-meta">
                {scheduleTime ? (
                    <>
                        <div>{humanSchedule}</div>
                    </>
                ) : (
                    <span
                        className="card-noschedule"
                        title="This module will not run automatically."
                    >
                        Not scheduled
                    </span>
                )}
            </div>
            <div className="card-bottom-bar">
                <div className="card-last-run">
                    {runState?.last_run ? (
                        <>
                            <span>Last run:</span>
                            <span>{formatLastRun(runState.last_run)}</span>
                        </>
                    ) : (
                        <span style={{ opacity: 0.55 }}>—</span>
                    )}
                </div>
                <div className="schedule-btn-wrap">
                    <button
                        className={`btn--icon card-action-btn${running ? ' btn--danger' : ''}`}
                        type="button"
                        aria-label={tooltipText}
                        disabled={polling}
                        onMouseEnter={() => {
                            setShowTooltip(true);
                            if (running) setShowStop(true);
                        }}
                        onMouseLeave={() => {
                            setShowTooltip(false);
                            if (running) setShowStop(false);
                        }}
                        onFocus={() => setShowTooltip(true)}
                        onBlur={() => setShowTooltip(false)}
                        onClick={async e => {
                            e.stopPropagation();
                            if (!running) {
                                setRunning(true);
                                await runScheduledModule(module);
                                toast('Module started.', 'info');
                                setRunning(true);
                                pollStatus();
                            } else {
                                setRunning(true);
                                await cancelScheduledModule(module);
                                toast('Module run cancelled.', 'info');
                                setRunning(false);
                                reload();
                            }
                        }}
                        ref={btnRef}
                    >
                        {!running
                            ? getIcon('mi:play_arrow')
                            : showStop
                              ? getIcon('mi:stop')
                              : getSpinner()}
                    </button>
                    <TooltipFactory
                        anchor={btnRef.current}
                        text={tooltipText}
                        show={showTooltip}
                        position="top"
                    />
                </div>
            </div>
        </div>
    );
}
