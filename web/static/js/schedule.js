import { fetchConfig, renderHelp, moduleOrder } from './helper.js';
import { buildSchedulePayload } from './payload.js';
import { navigateTo } from './navigation.js';
import { DAPS } from './common.js';
const { bindSaveButton, showToast, humanize } = DAPS;

export async function loadSchedule() {
    const config = await fetchConfig();
    const schedule = config.schedule || {};
    const form = document.getElementById('scheduleForm');
    if (!form) return;
    form.innerHTML = '';
    const help = renderHelp('schedule');
    if (help) form.before(help);

    const orderedModules = (moduleOrder || Object.keys(schedule)).filter((m) =>
        schedule.hasOwnProperty(m)
    );
    for (const [i, module] of orderedModules.entries()) {
        const time = schedule[module];
        const label = document.createElement('label');
        label.textContent = humanize(module);
        const input = document.createElement('input');
        input.type = 'text';
        input.name = module;
        input.value = time || '';
        input.className = 'input';
        input.placeholder = 'e.g. hourly(01), daily(12:00|18:00), weekly(Mon@12:00|Tue@18:00)';
        const field = document.createElement('div');
        field.className = 'field';
        field.appendChild(label);
        field.appendChild(input);

        input.addEventListener('input', () => {
            if (!input.value.trim() || isValidSchedule(input.value.trim())) {
                input.classList.remove('input-invalid');
            } else {
                input.classList.add('input-invalid');
            }
        });

        const runBtn = document.createElement('button');
        runBtn.type = 'button';
        runBtn.textContent = 'Run Now';
        runBtn.className = 'run-btn btn';
        runBtn.addEventListener('mouseenter', () => {
            if (runBtn.classList.contains('running')) {
                runBtn.textContent = 'Cancel';
                runBtn.classList.add('cancel-hover');
            }
        });
        runBtn.addEventListener('mouseleave', () => {
            if (runBtn.classList.contains('running')) {
                runBtn.textContent = 'Running';
                runBtn.classList.remove('cancel-hover');
            }
        });

        runBtn.addEventListener('click', async () => {
            if (runBtn.classList.contains('running')) {
                runBtn.textContent = 'Canceling';
                await fetch('/api/cancel', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ module }),
                });
                runBtn.classList.remove('running');
                runBtn.textContent = 'Run Now';
                showToast(`🛑 ${humanize(module)} cancelled successfully.`, 'info');
                return;
            }
            runBtn.textContent = 'Running';
            runBtn.classList.add('running');
            if (!btnContainer.querySelector('.run-btn + .run-btn')) {
                const viewLogsBtn = document.createElement('button');
                viewLogsBtn.type = 'button';
                viewLogsBtn.textContent = 'View Logs';
                viewLogsBtn.className = 'run-btn btn';
                viewLogsBtn.addEventListener('click', () => {
                    window._preselectedLogModule = module;
                    window.skipDirtyCheck = true;
                    const link = document.createElement('a');
                    link.href = '/pages/logs';
                    navigateTo(link);
                });
                btnContainer.appendChild(viewLogsBtn);
            }
            const res = await fetch('/api/run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ module }),
            });
            if (!res.ok) {
                const err = await res.json();
                runBtn.classList.remove('running');
                runBtn.textContent = 'Run Now';
                showToast(
                    `❌ Failed to start ${humanize(module)}: ${err.error || res.statusText}`,
                    'error'
                );
                return;
            }
            showToast(`▶️ ${humanize(module)} started successfully!`, 'success');
            const interval = setInterval(async () => {
                const resStatus = await fetch(`/api/status?module=${module}`);
                const { running } = await resStatus.json();
                if (!running) {
                    runBtn.classList.remove('running');
                    runBtn.textContent = 'Run Now';
                    clearInterval(interval);
                }
            }, 2000);
        });

        const btnContainer = document.createElement('div');
        btnContainer.className = 'btn-container';
        btnContainer.appendChild(runBtn);
        field.appendChild(btnContainer);

        (async () => {
            const resStatus = await fetch(`/api/status?module=${module}`);
            const { running } = await resStatus.json();
            if (running) {
                runBtn.textContent = 'Running';
                runBtn.classList.add('running');
                const viewLogsBtn = document.createElement('button');
                viewLogsBtn.type = 'button';
                viewLogsBtn.textContent = 'View Logs';
                viewLogsBtn.className = 'run-btn btn ';
                viewLogsBtn.addEventListener('click', () => {
                    window._preselectedLogModule = module;
                    window.skipDirtyCheck = true;
                    const link = document.createElement('a');
                    link.href = '/fragments/logs';
                    window.DAPS.navigateTo(link);
                });
                btnContainer.appendChild(viewLogsBtn);
            }
        })();

        const card = document.createElement('div');
        card.className = 'card';
        card.appendChild(field);
        form.appendChild(card);
        setTimeout(() => card.classList.add('show-card'), 40 * i);
    }

    if (window._scheduleRunInterval) {
        clearInterval(window._scheduleRunInterval);
        window._scheduleRunInterval = null;
    }
    window._scheduleRunInterval = setInterval(() => {
        document.querySelectorAll('.field').forEach((field) => {
            const inp = field.querySelector('input');
            const runBtn = field.querySelector('button.run-btn');
            if (!inp || !runBtn) return;
            const module = inp.name;
            fetch(`/api/status?module=${module}`)
                .then((res) => res.json())
                .then(({ running }) => {
                    if (running && !runBtn.classList.contains('running')) {
                        runBtn.textContent = 'Running';
                        runBtn.classList.add('running');
                        const btnContainer = runBtn.parentElement;
                        const viewExists = btnContainer.querySelector('.run-btn + .run-btn');
                        if (!viewExists) {
                            const viewLogsBtn = document.createElement('button');
                            viewLogsBtn.type = 'button';
                            viewLogsBtn.textContent = 'View Logs';
                            viewLogsBtn.className = 'run-btn';
                            viewLogsBtn.addEventListener('click', () => {
                                window._preselectedLogModule = module;
                                const link = document.createElement('a');
                                link.href = '/fragments/logs';
                                window.DAPS.navigateTo(link);
                            });
                            btnContainer.appendChild(viewLogsBtn);
                        }
                    } else if (!running && runBtn.classList.contains('running')) {
                        runBtn.classList.remove('running');
                        runBtn.textContent = 'Run Now';
                        const btnContainer = runBtn.parentElement;
                        const viewLogsBtn = btnContainer.querySelector('.run-btn + .run-btn');
                        if (viewLogsBtn) btnContainer.removeChild(viewLogsBtn);
                    }
                });
        });
    }, 3000);

    const saveBtn = document.getElementById('saveBtn');
    bindSaveButton(saveBtn, buildSchedulePayload, 'schedule');

    const searchInput = document.getElementById('schedule-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            DAPS.skipDirtyCheck = true;
            searchInput.defaultValue = searchInput.value;
            const query = e.target.value.toLowerCase();
            document.querySelectorAll('.card').forEach((card) => {
                const text = card.textContent.toLowerCase();
                card.style.display = text.includes(query) ? 'flex' : 'none';
            });
        });
    }
}

function isValidSchedule(val) {
    if (!val) return true;
    if (/^hourly\(\d{2}\)$/i.test(val)) return true;
    if (/^daily\(\d{2}:\d{2}(?:\|\d{2}:\d{2})*\)$/i.test(val)) return true;
    if (/^weekly\([a-z]+@\d{2}:\d{2}(?:\|[a-z]+@\d{2}:\d{2})*\)$/i.test(val)) return true;
    if (/^monthly\(\d{1,2}@\d{2}:\d{2}(?:\|\d{1,2}@\d{2}:\d{2})*\)$/i.test(val)) return true;
    if (/^cron\([^\)]+\)$/i.test(val)) return true;
    return false;
}
