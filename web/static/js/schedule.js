import { fetchConfig, moduleList } from './helper.js';
import { humanize, showToast } from './util.js';
import { modalHeaderHtml, modalFooterHtml } from './settings/modals.js';
import { buildSchedulePayload } from './payload.js';

let allRunStates = {};

function formatLastRun(dt) {
    if (!dt) return '';
    // parse as UTC then local
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

async function fetchAllRunStates() {
    try {
        const res = await fetch('/api/run_state');
        if (!res.ok) return;
        const data = await res.json();
        allRunStates = {};
        (data.run_states || []).forEach((r) => {
            allRunStates[r.module_name] = r;
        });
    } catch {}
}

export async function loadSchedule() {
    await fetchAllRunStates(); // get all run times up front
    const config = await fetchConfig();
    const schedule = config.schedule || {};
    const list = document.getElementById('schedule-list');
    if (!list) return;
    list.innerHTML = '';
    // Only load modules present in moduleList
    for (const module of moduleList) {
        if (schedule.hasOwnProperty(module)) {
            list.appendChild(await makeCard(module, schedule[module], schedule));
        }
    }

    // Only show "+" if there's at least one unscheduled module
    const scheduledModules = Object.keys(schedule);
    const unscheduled = moduleList.filter((m) => !scheduledModules.includes(m));
    if (unscheduled.length > 0) {
        list.appendChild(makeAddCard(schedule));
    }
}

// Check running status for each module
async function getModuleStatus(module) {
    try {
        const res = await fetch(`/api/status?module=${encodeURIComponent(module)}`);
        if (!res.ok) throw new Error('Failed to check status');
        const data = await res.json();
        return !!data.running;
    } catch (err) {
        // If error, assume not running
        return false;
    }
}

async function makeCard(module, time, scheduleConfig) {
    const card = document.createElement('div');
    card.className = 'card';
    card.tabIndex = 0;
    card.onclick = (e) => {
        if (!e.target.classList.contains('card-action-btn')) {
            scheduleModal(module, time, loadSchedule, scheduleConfig);
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

    // --- Bottom bar with last-run (left) and play/cancel (right) ---
    const bottomBar = document.createElement('div');
    bottomBar.className = 'card-bottom-bar';

    // Last run (left) -- TOOLTIP REMOVED
    const runState = allRunStates[module] || {};
    const lastRun = runState.last_run;
    const lastRunDisplay = document.createElement('div');
    lastRunDisplay.className = 'card-last-run';

    if (lastRun) {
        lastRunDisplay.innerHTML = `
            <span class="material-icons" style="font-size:1.09em;vertical-align:middle;opacity:.85;">schedule</span>
            <span>${formatLastRun(lastRun)}</span>
        `;
    } else {
        lastRunDisplay.innerHTML = `<span style="opacity:.55;">—</span>`;
    }

    // Play/Stop button (right)
    const btnWrap = document.createElement('div');
    btnWrap.className = 'schedule-btn-wrap';

    let running = await getModuleStatus(module);
    let destroyed = false;
    let showStop = false;

    // Button and tooltip
    const btn = document.createElement('button');
    btn.className = `btn--icon card-action-btn${running ? ' btn--danger' : ''}`;
    btn.type = 'button';

    // Tooltip for button
    const btnTooltip = document.createElement('div');
    btnTooltip.className = 'btn-tooltip';
    btnWrap.appendChild(btnTooltip);

    // Helpers
    const isMobile = () => matchMedia('(hover: none) and (pointer: coarse)').matches;
    function getSpinner() {
        return `<span class="spinner"></span>`;
    }
    function getStopIcon() {
        return `<i class="material-icons">stop</i>`;
    }
    function getPlayIcon() {
        return `<i class="material-icons">play_arrow</i>`;
    }

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
            if (isMobile() || showStop) {
                btn.innerHTML = getStopIcon();
            } else {
                btn.innerHTML = getSpinner();
            }
        } else {
            btn.innerHTML = getPlayIcon();
        }
    }

    setBtnState(running);

    // Tooltip hover/focus handling for button
    btn.onmouseenter = () => {
        btnTooltip.classList.add('show');
        if (running && !isMobile()) {
            showStop = true;
            setBtnState(running);
        }
    };
    btn.onmouseleave = () => {
        btnTooltip.classList.remove('show');
        if (running && !isMobile()) {
            showStop = false;
            setBtnState(running);
        }
    };
    btn.onfocus = btn.onmouseenter;
    btn.onblur = btn.onmouseleave;

    // Poll for module status every second while running
    async function pollStatus() {
        while (running && !destroyed) {
            await new Promise((r) => setTimeout(r, 1000));
            if (destroyed) return;
            const status = await getModuleStatus(module);
            if (status !== running) {
                running = status;
                setBtnState(running);
                if (!running) {
                    // If module is done, force a schedule reload to update all cards
                    loadSchedule();
                }
                break;
            }
        }
    }
    if (running) pollStatus();

    btn.onclick = async (e) => {
        e.stopPropagation();
        if (!running) {
            setBtnState(true, true); // loading spinner
            await fetch('/api/run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ module }),
            });
            // Begin polling
            running = true;
            setBtnState(true);
            pollStatus();
        } else {
            setBtnState(true, true); // loading spinner for cancel
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

    btnWrap.appendChild(btn);

    card._destroy = () => {
        destroyed = true;
    };

    // -- Add left/right to bottom bar --
    bottomBar.appendChild(lastRunDisplay);
    bottomBar.appendChild(btnWrap);
    card.appendChild(bottomBar);

    return card;
}

function makeAddCard(scheduleConfig) {
    const card = document.createElement('div');
    card.className = 'card card-add';
    card.tabIndex = 0;
    card.onclick = () => scheduleModal('', '', loadSchedule, scheduleConfig);

    const plus = document.createElement('div');
    plus.className = 'card-add-plus';
    plus.innerHTML = '&#43;';
    card.appendChild(plus);

    return card;
}

if (document.getElementById('schedule-list')) {
    loadSchedule();
}

export function scheduleModal(module = '', value = '', onReload = null, scheduleConfig = {}) {
    const modalId = 'schedule-modal-edit';
    let modal = document.getElementById(modalId);
    if (!modal) {
        modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'modal show';
        document.body.appendChild(modal);
    }

    // Build footer buttons for standardized modalFooterHtml
    const footerButtons = [
        ...(module
            ? [
                  {
                      id: 'schedule-modal-delete',
                      label: 'Delete',
                      class: 'btn--remove-item',
                      type: 'button',
                  },
              ]
            : []),
        { id: 'schedule-modal-cancel', label: 'Cancel', class: 'btn--cancel', type: 'button' },
        { id: 'schedule-modal-save', label: 'Save', class: 'btn--success', type: 'submit' },
    ];

    modal.innerHTML = `
        <div class="modal-content">
            ${modalHeaderHtml({ title: module ? 'Edit Schedule' : 'Add Schedule' })}
            <form class="modal-body" id="schedule-modal-form" autocomplete="off">
                <label>Module Name</label>
                <select id="schedule-modal-module" class="input" placeholder="Module name"></select>
                <label>How often?</label>
                <div id="schedule-frequency" class="pill-group" style="margin-bottom:1em;">
                    <button type="button" class="pill" data-type="hourly">Hourly</button>
                    <button type="button" class="pill" data-type="daily">Daily</button>
                    <button type="button" class="pill" data-type="weekly">Weekly</button>
                    <button type="button" class="pill" data-type="monthly">Monthly</button>
                    <button type="button" class="pill" data-type="cron">Cron</button>
                </div>
                <div id="schedule-fields"></div>
                <div class="schedule-summary" style="font-size:1.02em;color:var(--muted);margin:0.9em 0 0.4em 0;"></div>
                ${modalFooterHtml(footerButtons, ['schedule-modal-delete'])}
            </form>
        </div>
    `;

    modal.classList.add('show');
    document.body.classList.add('modal-open');
    document.documentElement.classList.add('modal-open');

    setTimeout(() => {
        const firstInput = modal.querySelector('input, select, textarea, button:not([disabled])');
        if (firstInput) firstInput.focus();
    }, 100);

    function closeModal() {
        modal.classList.remove('show');
        document.body.classList.remove('modal-open');
        document.documentElement.classList.remove('modal-open');
    }

    modal.onclick = (e) => {
        if (e.target === modal) closeModal();
    };
    modal.querySelector('.modal-close-x').onclick = closeModal;
    modal.querySelector('#schedule-modal-cancel').onclick = closeModal;

    // Populate module select
    const select = modal.querySelector('#schedule-modal-module');
    let optionsHTML = '';
    moduleList.forEach((mod) => {
        let isDisabled = scheduleConfig[mod] && mod !== module;
        optionsHTML +=
            `<option value="${mod}"${isDisabled ? ' disabled style="color: var(--muted);"' : ''}${
                mod === module ? ' selected' : ''
            }>` +
            `${typeof humanize === 'function' ? humanize(mod) : mod}${
                isDisabled ? ' (already scheduled)' : ''
            }` +
            `</option>`;
    });
    select.innerHTML = optionsHTML;

    setTimeout(() => {
        if (typeof $ !== 'undefined' && $(select).data('select2')) $(select).select2('destroy');
        if (typeof $ !== 'undefined' && $(select).select2) {
            $(select).select2({ width: '100%', theme: 'default' });
            $(select).on('select2:selecting', function (e) {
                if (e.params.args.data.element.disabled) {
                    e.preventDefault();
                    if (typeof showToast === 'function')
                        showToast(
                            'That module is already scheduled and cannot be selected.',
                            'error'
                        );
                }
            });
        }
    }, 0);

    const pills = Array.from(modal.querySelectorAll('#schedule-frequency .pill'));
    const fieldsDiv = modal.querySelector('#schedule-fields');
    const summaryDiv = modal.querySelector('.schedule-summary');
    let selectedType = 'daily';

    function setActivePill(type) {
        selectedType = type;
        pills.forEach((p) => p.classList.toggle('active', p.dataset.type === type));
        updateFields(type);
        updateSummary();
    }
    pills.forEach((p) => (p.onclick = () => setActivePill(p.dataset.type)));

    function updateFields(type) {
        let html = '';
        if (type === 'hourly') {
            html = `<label>At minute:</label>
                <input type="number" min="0" max="59" id="hourly-minute" class="input" value="0" style="width:90px;"> <span style="color:var(--muted);font-size:0.96em;">(0 = top of hour)</span>`;
        } else if (type === 'daily') {
            html = `<label>Time(s):</label>
                <div class="daily-times"></div>
                <button type="button" id="add-daily-time" class="btn" style="margin-top:0.5em;">+ Add time</button>`;
        } else if (type === 'weekly') {
            html = `<label>Day(s):</label>
                <div class="weekday-pills" style="display:flex;gap:0.4em;margin-bottom:0.6em;">
                    ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
                        .map(
                            (d, i) =>
                                `<button type="button" class="weekday-pill" data-day="${i}">${d}</button>`
                        )
                        .join('')}
                </div>
                <label>At:</label>
                <input type="time" id="weekly-time" class="input" value="12:00">`;
        } else if (type === 'monthly') {
            html = `<label>Day(s) of month:</label>
                <div class="monthday-pills" style="display:flex;flex-wrap:wrap;gap:0.28em 0.4em;margin-bottom:0.6em;">
                    ${Array.from({ length: 31 })
                        .map(
                            (_, i) =>
                                `<button type="button" class="monthday-pill" data-day="${i + 1}">${
                                    i + 1
                                }</button>`
                        )
                        .join('')}
                </div>
                <label>At:</label>
                <input type="time" id="monthly-time" class="input" value="12:00">`;
        } else if (type === 'cron') {
            html = `<label>Cron Expression</label>
                <input type="text" class="input" id="cron-expr" placeholder="e.g. 0 0 * * *">
                <div style="font-size:0.96em;color:var(--muted);margin-top:3px;">
                    <a href="https://crontab.guru/" target="_blank" style="color:var(--accent);">What is cron?</a>
                </div>`;
        }
        fieldsDiv.innerHTML = html;

        if (type === 'daily') {
            const timesDiv = fieldsDiv.querySelector('.daily-times');
            function addTimeRow(val = '') {
                const idx = Date.now() + Math.floor(Math.random() * 10000);
                const html = `<div class="daily-row" data-idx="${idx}" style="display:flex;align-items:center;gap:0.5em;margin-bottom:0.2em;">
                    <input type="time" class="input" value="${val}">
                    <button type="button" class="btn btn--remove-item" title="Remove">&#x2212;</button>
                </div>`;
                timesDiv.insertAdjacentHTML('beforeend', html);
                const row = timesDiv.querySelector(`[data-idx="${idx}"]`);
                row.querySelector('button').onclick = () => {
                    row.remove();
                    updateSummary();
                };
                row.querySelector('input[type="time"]').onchange = updateSummary;
            }
            addTimeRow('12:00');
            fieldsDiv.querySelector('#add-daily-time').onclick = () => {
                addTimeRow('');
                updateSummary();
            };
        }
        if (type === 'weekly') {
            const dayPills = Array.from(fieldsDiv.querySelectorAll('.weekday-pill'));
            dayPills.forEach((btn, i) => {
                btn.onclick = function () {
                    btn.classList.toggle('active');
                    updateSummary();
                };
            });
        }
        if (type === 'monthly') {
            const mdPills = Array.from(fieldsDiv.querySelectorAll('.monthday-pill'));
            mdPills.forEach((btn, i) => {
                btn.onclick = function () {
                    btn.classList.toggle('active');
                    updateSummary();
                };
            });
        }
        if (type === 'cron') {
            fieldsDiv.querySelector('#cron-expr').oninput = updateSummary;
        }
        if (type === 'hourly') {
            fieldsDiv.querySelector('#hourly-minute').oninput = updateSummary;
        }
        if (type === 'weekly') {
            fieldsDiv.querySelector('#weekly-time').oninput = updateSummary;
        }
        if (type === 'monthly') {
            fieldsDiv.querySelector('#monthly-time').oninput = updateSummary;
        }
    }

    function updateSummary() {
        let summary = '';
        if (selectedType === 'hourly') {
            const m = modal.querySelector('#hourly-minute').value || '0';
            summary = `Will run at minute ${m} of every hour.`;
        } else if (selectedType === 'daily') {
            const times = Array.from(fieldsDiv.querySelectorAll('.daily-times input[type="time"]'))
                .map((inp) => inp.value.trim())
                .filter(Boolean);
            summary = `Will run daily at ${times.join(', ') || '[no times set]'}`;
        } else if (selectedType === 'weekly') {
            const days = Array.from(fieldsDiv.querySelectorAll('.weekday-pill.active')).map(
                (btn) => btn.textContent
            );
            const time = modal.querySelector('#weekly-time')?.value || '';
            summary = days.length
                ? `Will run every ${days.join(', ')} at ${time || '[time]'}`
                : 'Pick at least one day of the week.';
        } else if (selectedType === 'monthly') {
            const days = Array.from(fieldsDiv.querySelectorAll('.monthday-pill.active')).map(
                (btn) => btn.textContent
            );
            const time = fieldsDiv.querySelector('#monthly-time')?.value || '';
            summary = days.length
                ? `Will run on day(s) ${days.join(', ')} of the month at ${time || '[time]'}`
                : 'Pick at least one day of the month.';
        } else if (selectedType === 'cron') {
            const expr = fieldsDiv.querySelector('#cron-expr').value.trim();
            summary = expr ? `Custom cron: ${expr}` : 'Enter a cron expression.';
        }
        summaryDiv.textContent = summary;
    }

    function tryParseAndPrefill() {
        if (!value) {
            setActivePill('daily');
            return;
        }
        let match;
        if ((match = value.match(/^hourly\((\d{2})\)$/))) {
            setActivePill('hourly');
            fieldsDiv.querySelector('#hourly-minute').value = match[1];
        } else if ((match = value.match(/^daily\(([\d:|]+)\)$/))) {
            setActivePill('daily');
            const times = match[1].split('|');
            const timesDiv = fieldsDiv.querySelector('.daily-times');
            timesDiv.innerHTML = '';
            times.forEach((t) => {
                const addBtn = fieldsDiv.querySelector('#add-daily-time');
                addBtn.click();
                const inputs = timesDiv.querySelectorAll('input[type="time"]');
                inputs[inputs.length - 1].value = t;
            });
        } else if ((match = value.match(/^weekly\(([\w,]+)@([\d:]+)\)$/))) {
            setActivePill('weekly');
            const days = match[1].split(',').map((d) => d.toLowerCase());
            Array.from(fieldsDiv.querySelectorAll('.weekday-pill')).forEach((btn) => {
                if (days.includes(btn.textContent.toLowerCase())) btn.classList.add('active');
            });
            fieldsDiv.querySelector('#weekly-time').value = match[2];
        } else if ((match = value.match(/^monthly\(([\d,]+)@([\d:]+)\)$/))) {
            setActivePill('monthly');
            const days = match[1].split(',').map(Number);
            Array.from(fieldsDiv.querySelectorAll('.monthday-pill')).forEach((btn) => {
                if (days.includes(Number(btn.textContent))) btn.classList.add('active');
            });
            fieldsDiv.querySelector('#monthly-time').value = match[2];
        } else if ((match = value.match(/^cron\(([^)]+)\)$/))) {
            setActivePill('cron');
            fieldsDiv.querySelector('#cron-expr').value = match[1];
        } else {
            setActivePill('daily');
        }
        updateSummary();
    }

    // Save handler -- use form submit for keyboard support!
    modal.querySelector('#schedule-modal-form').onsubmit = async (e) => {
        e.preventDefault();
        const m = select.value.trim();
        let schedString = '';
        if (!m) {
            showToast('Module name required', 'error');
            return;
        }

        if (selectedType === 'hourly') {
            const min = parseInt(fieldsDiv.querySelector('#hourly-minute').value, 10);
            if (isNaN(min) || min < 0 || min > 59) {
                showToast('Minute must be 0-59', 'error');
                return;
            }
            schedString = `hourly(${String(min).padStart(2, '0')})`;
        } else if (selectedType === 'daily') {
            const times = Array.from(fieldsDiv.querySelectorAll('.daily-times input[type="time"]'))
                .map((inp) => inp.value.trim())
                .filter(Boolean);
            if (!times.length) {
                showToast('At least one time is required', 'error');
                return;
            }
            schedString = `daily(${times.join('|')})`;
        } else if (selectedType === 'weekly') {
            const days = Array.from(fieldsDiv.querySelectorAll('.weekday-pill.active')).map((btn) =>
                btn.textContent.toLowerCase()
            );
            const time = fieldsDiv.querySelector('#weekly-time')?.value || '';
            if (!days.length || !time) {
                showToast('Pick days and time', 'error');
                return;
            }
            schedString = `weekly(${days.join(',')}@${time})`;
        } else if (selectedType === 'monthly') {
            const days = Array.from(fieldsDiv.querySelectorAll('.monthday-pill.active'))
                .map((btn) => btn.textContent)
                .filter(Boolean);
            const time = fieldsDiv.querySelector('#monthly-time')?.value || '';
            if (!days.length || !time) {
                showToast('Pick days and time', 'error');
                return;
            }
            schedString = `monthly(${days.join(',')}@${time})`;
        } else if (selectedType === 'cron') {
            const expr = fieldsDiv.querySelector('#cron-expr').value.trim();
            if (!expr) {
                showToast('Cron expression required', 'error');
                return;
            }
            schedString = `cron(${expr})`;
        }

        try {
            const payload = await buildSchedulePayload(m, schedString, false);
            const res = await fetch('/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (res.ok) {
                showToast('Schedule updated!', 'success');
                closeModal();
                if (onReload) onReload();
            } else {
                showToast('Failed to update schedule', 'error');
            }
        } catch (err) {
            showToast(`Failed: ${err.message}`, 'error');
        }
    };

    const deleteBtn = modal.querySelector('#schedule-modal-delete');
    if (deleteBtn) {
        deleteBtn.onclick = async () => {
            if (!confirm(`Delete schedule for "${module}"?`)) return;
            try {
                const payload = await buildSchedulePayload(module, '', true);
                const res = await fetch('/api/config', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
                if (res.ok) {
                    showToast('Schedule deleted!', 'success');
                    closeModal();
                    if (onReload) onReload();
                } else {
                    showToast('Failed to delete schedule', 'error');
                }
            } catch (err) {
                showToast(`Failed: ${err.message}`, 'error');
            }
        };
    }

    setActivePill('daily');
    tryParseAndPrefill();
    fieldsDiv.addEventListener('input', updateSummary);
    fieldsDiv.addEventListener('change', updateSummary);
}
