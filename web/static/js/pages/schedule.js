// --- Imports ---
import { fetchConfig, postConfig, fetchAllRunStates, getModuleStatus } from '../api.js';
import { buildSchedulePayload } from '../payload.js';
import { showToast, humanize, getIcon } from '../util.js';
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
    for (const module of moduleList) {
        if (schedule.hasOwnProperty(module)) {
            list.appendChild(await makeCard(module, schedule[module], allRunStates, schedule));
        }
    }
    const scheduledModules = Object.keys(schedule);
    const unscheduled = moduleList.filter((m) => !scheduledModules.includes(m));
    if (unscheduled.length > 0) {
        list.appendChild(makeAddCard(schedule));
    }
}

async function makeCard(module, time, allRunStates, scheduleConfig) {
    const card = document.createElement('div');
    card.className = 'card';
    card.tabIndex = 0;
    card.onclick = (e) => {
        if (!e.target.classList.contains('card-action-btn')) {
            showEditScheduleModal(module, time, scheduleConfig);
        }
    };

    const title = document.createElement('div');
    title.className = 'card-title';
    title.textContent = humanize(module);
    card.appendChild(title);

    const meta = document.createElement('div');
    meta.className = 'card-meta';
    meta.textContent = time || '';
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

    const btnTooltip = document.createElement('div');
    btnTooltip.className = 'btn-tooltip';
    btnWrap.appendChild(btnTooltip);

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
        btnTooltip.textContent = isRunning
            ? `Cancel ${humanize(module)} Run`
            : `Run ${humanize(module)} Now!`;

        if (isRunning) {
            btn.innerHTML = showStop
                ? getIcon('mi:stop')
                : `<span class="spinner"></span>`;
        } else {
            btn.innerHTML = getIcon('mi:play_arrow');
        }
    }

    setBtnState(running);

    btn.onmouseenter = () => {
        btnTooltip.classList.add('show');
        if (running) {
            showStop = true;
            setBtnState(running);
        }
    };
    btn.onmouseleave = () => {
        btnTooltip.classList.remove('show');
        if (running) {
            showStop = false;
            setBtnState(running);
        }
    };

    btn.onclick = async (e) => {
        e.stopPropagation();
        if (!running) {
            setBtnState(true, true);
            await fetch('/api/run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ module }),
            });
            running = true;
            setBtnState(true);
            pollStatus();
        } else {
            setBtnState(true, true);
            await fetch('/api/cancel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ module }),
            });
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

function makeAddCard(scheduleConfig) {
    const card = document.createElement('div');
    card.className = 'card card-add';
    card.tabIndex = 0;
    card.onclick = () => showAddScheduleModal(scheduleConfig);

    const plus = document.createElement('div');
    plus.className = 'card-add-plus';
    plus.innerHTML = '&#43;';
    card.appendChild(plus);
    return card;
}

function showAddScheduleModal(scheduleConfig) {
    const scheduledModules = Object.keys(scheduleConfig);
    const availableModules = moduleList.filter((m) => !scheduledModules.includes(m));
    openScheduleModal({
        modules: availableModules,
        isEdit: false,
        onSave: scheduleSaveHandler('add'),
        onCancel: () => {},
        onDelete: null,
    });
}

function showEditScheduleModal(module, value, scheduleConfig) {
    openScheduleModal({
        module,
        value,
        modules: [module],
        isEdit: true,
        onSave: scheduleSaveHandler('edit'),
        onCancel: () => {},
        onDelete: scheduleSaveHandler('delete'),
    });
}

function openScheduleModal({
    module = '',
    value = '',
    isEdit = false,
    modules = [],
    onSave,
    onDelete,
    onCancel,
} = {}) {
    const schema = [
        {
            key: 'module',
            label: 'Module Name',
            type: 'dropdown',
            options: modules,
            required: true,
            disabled: isEdit,
            description: 'Which DAPS module to schedule.',
        },
        {
            key: 'schedule',
            label: 'Frequency',
            type: 'schedule',
            required: false,
            description: 'How often to run this module.',
        },
    ];
    const entry = { module: module || '', schedule: value || '' };

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
            if (typeof onDelete === 'function') await onDelete(entry.module);
            closeModal();
        },
        'cancel-modal-btn': ({ closeModal }) => {
            if (typeof onCancel === 'function') onCancel();
            closeModal();
        },
        'save-modal-btn': scheduleModalBtnHandler(onSave, entry),
        'add-modal-btn': scheduleModalBtnHandler(onSave, entry),
    };

    openModal({
        schema,
        entry,
        config: entry,
        title: `${isEdit ? 'Edit' : 'Add'} Schedule`,
        isEdit,
        footerButtons,
        buttonHandler,
    });
}

function scheduleSaveHandler(action) {
    return async (entry) => {
        let payload, res;
        if (action === 'add' || action === 'edit') {
            payload = await buildSchedulePayload(entry.module, entry.schedule, false);
            res = await postConfig(payload);
            if (res.success) {
                showToast('Schedule saved!', 'success');
                loadSchedule();
            } else {
                showToast('Failed to save schedule: ' + (res.error || ''), 'error');
            }
        } else if (action === 'delete') {
            payload = await buildSchedulePayload(entry, '', true);
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

function scheduleModalBtnHandler(onSave, entry) {
    return ({ bodyDiv, closeModal, event }) => {
        const inputs = bodyDiv.querySelectorAll('input, textarea, select');
        inputs.forEach((input) => {
            if (!input.name) return;
            if (input.type === 'checkbox') {
                entry[input.name] = input.checked;
            } else {
                entry[input.name] = input.value;
            }
        });
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
