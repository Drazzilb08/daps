// --- Imports ---
import {
    fetchConfig,
    postConfig,
    fetchAllRunStates,
    getModuleStatus,
    runScheduledModule,
    cancelScheduledModule,
} from '../api.js';
import { buildSchedulePayload } from '../payload.js';
import { showToast, humanize, getIcon, attachTooltip } from '../util.js';
import { openModal } from '../common/modals.js';
import { moduleList } from '../constants/constants.js';

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

async function loadSchedule() {
    const allRunStates = await fetchAllRunStates();
    const config = await fetchConfig();
    const schedule = config.schedule || {};
    const list = document.getElementById('schedule-list');
    if (!list) return;
    list.innerHTML = '';
    const scheduledModules = Object.keys(schedule);
    // Show ALL modules
    for (const module of moduleList) {
        const isScheduled = scheduledModules.includes(module);
        const scheduleTime = isScheduled ? schedule[module] : null;
        list.appendChild(await makeCard(module, scheduleTime, allRunStates, schedule));
    }
}

async function makeCard(module, time, allRunStates, scheduleConfig) {
    const card = document.createElement('div');
    card.className = 'card';
    card.tabIndex = 0;
    card.onclick = (e) => {
        if (e.target.classList.contains('card-action-btn')) return;
        if (time) {
            // Scheduled: Edit modal
            showEditScheduleModal(module, time);
        } else {
            // Not scheduled: Add modal (for just this module)
            showAddScheduleModal(module);
        }
    };

    const title = document.createElement('div');
    title.className = 'card-title';
    title.textContent = humanize(module);
    card.appendChild(title);

    const meta = document.createElement('div');
    meta.className = 'card-meta';
    if (time) {
        meta.textContent = time;
    } else {
        meta.innerHTML = `<span class="card-noschedule" title="This module will not run automatically.">Not scheduled</span>`;
    }
    card.appendChild(meta);

    const bottomBar = document.createElement('div');
    bottomBar.className = 'card-bottom-bar';

    const runState = allRunStates[module] || {};
    const lastRunDisplay = document.createElement('div');
    lastRunDisplay.className = 'card-last-run';
    lastRunDisplay.innerHTML = runState.last_run
        ? getIcon('mi:schedule', { style: 'font-size:1.09em;vertical-align:middle;opacity:.85;' }) +
          `<span>${formatLastRun(runState.last_run)}</span>`
        : `<span style="opacity:.55;">—</span>`;
    bottomBar.appendChild(lastRunDisplay);

    const btnWrap = document.createElement('div');
    btnWrap.className = 'schedule-btn-wrap';
    const btn = document.createElement('button');
    btn.className = 'btn--icon card-action-btn';
    btn.type = 'button';
    btnWrap.appendChild(btn);

    // Attach generic tooltip (dynamically updates)
    function updateTooltip(running, showStop) {
        attachTooltip(
            btn,
            running
                ? showStop
                    ? `Cancel ${humanize(module)} Run`
                    : `Running…`
                : `Run ${humanize(module)} Now!`,
            'top'
        );
    }

    let running = await getModuleStatus(module);
    let destroyed = false;
    let showStop = false;

    function setBtnState(isRunning, isCanceling = false) {
        running = isRunning;
        btn.className = `btn--icon card-action-btn${isRunning ? ' btn--danger' : ''}`;
        btn.disabled = isCanceling;
        btn.setAttribute(
            'aria-label',
            isRunning ? `Cancel ${humanize(module)} Run` : `Run ${humanize(module)} Now!`
        );
        if (isRunning) {
            btn.innerHTML = showStop ? getIcon('mi:stop') : `<span class="spinner"></span>`;
        } else {
            btn.innerHTML = getIcon('mi:play_arrow');
        }
        updateTooltip(isRunning, showStop);
    }

    setBtnState(running);

    btn.onmouseenter = () => {
        if (running) {
            showStop = true;
            setBtnState(running);
        }
    };
    btn.onmouseleave = () => {
        if (running) {
            showStop = false;
            setBtnState(running);
        }
    };

    btn.onclick = async (e) => {
        e.stopPropagation();
        if (!running) {
            setBtnState(true, true);
            await runScheduledModule(module); // Works for ad-hoc too
            running = true;
            setBtnState(true);
            pollStatus();
        } else {
            setBtnState(true, true);
            await cancelScheduledModule(module);
            running = false;
            setBtnState(false);
            loadSchedule();
        }
    };

    async function pollStatus() {
        while (running && !destroyed) {
            await new Promise((r) => setTimeout(r, 1000));
            if (destroyed) return;
            const status = await getModuleStatus(module);
            if (status !== running) {
                running = status;
                setBtnState(running);
                if (!running) loadSchedule();
                break;
            }
        }
    }
    if (running) pollStatus();

    card._destroy = () => {
        destroyed = true;
    };

    bottomBar.appendChild(btnWrap);
    card.appendChild(bottomBar);
    return card;
}

function showAddScheduleModal(module) {
    openScheduleModal({
        module,
        value: '',
        isEdit: false,
        onSave: scheduleSaveHandler('add', module),
        onCancel: () => {},
        onDelete: null,
    });
}

function showEditScheduleModal(module, value) {
    openScheduleModal({
        module,
        value,
        isEdit: true,
        onSave: scheduleSaveHandler('edit', module),
        onCancel: () => {},
        onDelete: scheduleSaveHandler('delete', module),
    });
}

function openScheduleModal({
    module = '',
    value = '',
    isEdit = false,
    onSave,
    onDelete,
    onCancel,
} = {}) {
    // Only the schedule field is shown
    const schema = [
        {
            key: 'schedule',
            label: 'Frequency',
            type: 'schedule',
            required: false,
            description: 'How often to run this module.',
        },
    ];
    const entry = {};
    entry.schedule = value || '';

    const footerButtons = [
        ...(isEdit
            ? [
                  {
                      id: 'delete-modal-btn',
                      label: 'Delete',
                      class: 'btn--remove-item',
                      type: 'button',
                  },
              ]
            : []),
        { id: 'cancel-modal-btn', label: 'Cancel', class: 'btn--cancel', type: 'button' },
        {
            id: isEdit ? 'save-modal-btn' : 'add-modal-btn',
            label: isEdit ? 'Save' : 'Add',
            class: 'btn--success',
            type: 'submit',
        },
    ];

    const buttonHandler = {
        'delete-modal-btn': async ({ closeModal }) => {
            if (typeof onDelete === 'function') await onDelete(module);
            closeModal();
        },
        'cancel-modal-btn': ({ closeModal }) => {
            if (typeof onCancel === 'function') onCancel();
            closeModal();
        },
        'save-modal-btn': scheduleModalBtnHandler(onSave, entry, module),
        'add-modal-btn': scheduleModalBtnHandler(onSave, entry, module),
    };

    openModal({
        schema,
        entry,
        title: `${isEdit ? 'Edit' : 'Add'} ${humanize(module)} Schedule`,
        isEdit,
        footerButtons,
        buttonHandler,
    });
}

function scheduleSaveHandler(action, module) {
    return async (entryOrModule) => {
        // When deleting, entryOrModule might be just the module name
        const modName = typeof entryOrModule === 'string' ? entryOrModule : module;
        const scheduleVal = typeof entryOrModule === 'object' ? entryOrModule.schedule : '';

        let payload, res;
        if (action === 'add' || action === 'edit') {
            payload = await buildSchedulePayload(modName, scheduleVal, false);

            res = await postConfig(payload);
            if (res.success) {
                showToast('Schedule saved!', 'success');
                loadSchedule();
            } else {
                showToast('Failed to save schedule: ' + (res.error || ''), 'error');
            }
        } else if (action === 'delete') {
            payload = await buildSchedulePayload(modName, '', true);
            res = await postConfig(payload);
            if (res.success) {
                showToast('Schedule deleted!', 'success');
                loadSchedule();
            } else {
                showToast('Failed to delete schedule: ' + (res.error || ''), 'error');
            }
        }
    };
}

function scheduleModalBtnHandler(onSave, entry, module) {
    return ({ bodyDiv, closeModal, event }) => {
        const scheduleVal = entry.schedule;
        if (!scheduleVal || !String(scheduleVal).trim()) {
            showToast('You must enter a schedule expression.', 'error');

            return;
        }
        entry.module = module;

        if (typeof onSave === 'function') onSave(entry);

        closeModal();
    };
}

function ensureScheduleDOM() {
    const container = document.getElementById('viewFrame');
    if (!container) return;

    // Remove all children except loader modal, if any
    [...container.children].forEach((child) => {
        if (
            !child.classList.contains('loader-modal') &&
            !child.classList.contains('poster-search-loader-modal')
        ) {
            container.removeChild(child);
        }
    });

    // Card list (if missing)
    let cardList = container.querySelector('#schedule-list');
    if (!cardList) {
        cardList = document.createElement('div');
        cardList.className = 'card-list';
        cardList.id = 'schedule-list';
        container.appendChild(cardList);
    } else {
        cardList.innerHTML = '';
    }
}

export function initSchedule() {
    ensureScheduleDOM();
    loadSchedule();
}
