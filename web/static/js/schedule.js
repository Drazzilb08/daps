/**
 * Loads and renders the schedule form, including help section,
 * schedule inputs, run/cancel buttons, and real-time status polling.
 */
// ===== Fetch Config and Setup Form =====
window.loadSchedule = async function()
{
    const res = await fetch("/api/config");
    const config = await res.json();
    const schedule = config.schedule ||
    {};
    const form = document.getElementById("scheduleForm");
    if (!form) return;
    form.innerHTML = "";
// ===== Global Help Section =====
    const helpWrapper = document.createElement("div");
    helpWrapper.className = "schedule-help";
    const helpToggle = document.createElement("button");
    helpToggle.className = "help-toggle";
    helpToggle.innerHTML = "<span class='help-label'>⏰ How to Schedule Tasks</span>";
    const helpContent = document.createElement("pre");
    helpContent.className = "help-content";
    helpContent.textContent = window.help?.schedule?.join("\n") || "See documentation for valid formats";
    helpToggle.addEventListener("click", () =>
    {
        helpContent.classList.toggle("show");
    });
    helpWrapper.appendChild(helpToggle);
    helpWrapper.appendChild(helpContent);
    form.before(helpWrapper);
// ===== Render Schedule Fields =====
    const orderedModules = (window.moduleOrder || Object.keys(schedule)).filter(m => schedule.hasOwnProperty(m));
    for (const module of orderedModules)
    {
        const time = schedule[module];
        const label = document.createElement("label");
        label.textContent = window.humanize(module);
        const input = document.createElement("input");
        input.type = "text";
        input.name = module;
        input.value = time || "";
        input.className = "input"
        input.placeholder = "e.g. hourly(01), daily(12:00|18:00), weekly(Mon@12:00|Tue@18:00)";
        const field = document.createElement("div");
        field.className = "field";
        field.appendChild(label);
        field.appendChild(input);
        const runBtn = document.createElement("button");
        runBtn.type = "button";
        runBtn.textContent = "Run Now";
        runBtn.className = "run-btn";
        runBtn.addEventListener("mouseenter", () =>
        {
            if (runBtn.classList.contains("running"))
            {
                runBtn.textContent = "Cancel";
                runBtn.classList.add("cancel-hover");
            }
        });
        runBtn.addEventListener("mouseleave", () =>
        {
            if (runBtn.classList.contains("running"))
            {
                runBtn.textContent = "Running";
                runBtn.classList.remove("cancel-hover");
            }
        });
// ===== Run Button Logic =====
        runBtn.addEventListener("click", async () =>
        {
            const statusDiv = document.getElementById("status");
            statusDiv.textContent = "";
            if (runBtn.classList.contains("running"))
            {
                runBtn.textContent = "Canceling";
                await fetch("/api/cancel",
                {
                    method: "POST",
                    headers:
                    {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(
                    {
                        module
                    })
                });
                runBtn.classList.remove("running");
                runBtn.textContent = "Run Now";
                statusDiv.textContent = `🛑 ${window.humanize(module)} cancelled`;
                statusDiv.className = "error";
                window.showToast(`🛑 ${window.humanize(module)} cancelled successfully.`, "info");
                return;
            }
            runBtn.textContent = "Running";
            runBtn.classList.add("running");
            if (!btnContainer.querySelector('.run-btn + .run-btn'))
            {
                const viewLogsBtn = document.createElement("button");
                viewLogsBtn.type = "button";
                viewLogsBtn.textContent = "View Logs";
                viewLogsBtn.className = "run-btn";
                viewLogsBtn.addEventListener("click", () =>
                {
                    window._preselectedLogModule = module;
                    window.skipDirtyCheck = true;
                    const link = document.createElement('a');
                    link.href = '/fragments/logs';
                    window.DAPS.navigateTo(link);
                });
                btnContainer.appendChild(viewLogsBtn);
            }
            const res = await fetch("/api/run",
            {
                method: "POST",
                headers:
                {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(
                {
                    module
                })
            });
            if (!res.ok)
            {
                const err = await res.json();
                statusDiv.textContent = `❌ Failed to start ${window.humanize(module)}: ${err.error || res.statusText}`;
                statusDiv.className = "error";
                runBtn.classList.remove("running");
                runBtn.textContent = "Run Now";
                return;
            }
            window.showToast(`▶️ ${window.humanize(module)} started successfully!`, "success");
            const interval = setInterval(async () =>
            {
                const resStatus = await fetch(`/api/status?module=${module}`);
                const
                {
                    running
                } = await resStatus.json();
                if (!running)
                {
                    runBtn.classList.remove("running");
                    runBtn.textContent = "Run Now";
                    clearInterval(interval);
                }
            }, 2000);
        });
        const btnContainer = document.createElement("div");
        btnContainer.className = "run-btn-container";
        btnContainer.appendChild(runBtn);
        field.appendChild(btnContainer);
// ===== Initialize Run Button Status on Load =====
        (async () =>
        {
            const resStatus = await fetch(`/api/status?module=${module}`);
            const
            {
                running
            } = await resStatus.json();
            if (running)
            {
                runBtn.textContent = "Running";
                runBtn.classList.add("running");
                const viewLogsBtn = document.createElement("button");
                viewLogsBtn.type = "button";
                viewLogsBtn.textContent = "View Logs";
                viewLogsBtn.className = "run-btn";
                viewLogsBtn.addEventListener("click", () =>
                {
                    window._preselectedLogModule = module;
                    window.skipDirtyCheck = true;
                    const link = document.createElement('a');
                    link.href = '/fragments/logs';
                    window.DAPS.navigateTo(link);
                });
                btnContainer.appendChild(viewLogsBtn);
            }
        })();
        const card = document.createElement("div");
        card.className = "schedule-card";
        card.appendChild(field);
        form.appendChild(card);
        document.querySelectorAll('.schedule-card').forEach((el, i) =>
        {
            setTimeout(() => el.classList.add('show-card'), i * 80);
        });
    }
// ===== Periodic Status Update for Run Buttons =====
    if (window._scheduleRunInterval)
    {
        clearInterval(window._scheduleRunInterval);
        window._scheduleRunInterval = null;
    }
    window._scheduleRunInterval = setInterval(() =>
    {
        document.querySelectorAll('.field').forEach(field =>
        {
            const inp = field.querySelector('input');
            const runBtn = field.querySelector('button.run-btn');
            if (!inp || !runBtn) return;
            const module = inp.name;
            fetch(`/api/status?module=${module}`)
                .then(res => res.json())
                .then((
                {
                    running
                }) =>
                {
                    if (running && !runBtn.classList.contains('running'))
                    {
                        runBtn.textContent = 'Running';
                        runBtn.classList.add('running');
                        const btnContainer = runBtn.parentElement;
                        const viewExists = btnContainer.querySelector('.run-btn + .run-btn');
                        if (!viewExists)
                        {
                            const viewLogsBtn = document.createElement("button");
                            viewLogsBtn.type = "button";
                            viewLogsBtn.textContent = "View Logs";
                            viewLogsBtn.className = "run-btn";
                            viewLogsBtn.addEventListener("click", () =>
                            {
                                window._preselectedLogModule = module;
                                const link = document.createElement('a');
                                link.href = '/fragments/logs';
                                window.DAPS.navigateTo(link);
                            });
                            btnContainer.appendChild(viewLogsBtn);
                        }
                    }
                    else if (!running && runBtn.classList.contains('running'))
                    {
                        runBtn.classList.remove('running');
                        runBtn.textContent = 'Run Now';
                        const btnContainer = runBtn.parentElement;
                        const viewLogsBtn = btnContainer.querySelector('.run-btn + .run-btn');
                        if (viewLogsBtn) btnContainer.removeChild(viewLogsBtn);
                    }
                });
        });
    }, 3000);
// ===== Save Schedule Changes =====
    /**
     * Builds the updated schedule payload from the form inputs.
     *
     * @returns {Object|null} The schedule payload object or null if the form is missing.
     */
    async function buildPayload()
    {
        const form = document.getElementById('scheduleForm');
        if (!form) return null;
        const data = new FormData(form);
        const updatedSchedule = {};
        for (const [key, value] of data.entries())
        {
            updatedSchedule[key] = value.trim() || null;
        }
        return {
            schedule: updatedSchedule
        };
    }

    /**
     * Sends the updated schedule payload to the backend API.
     *
     * @param {Object} payload - The schedule payload to save.
     * @returns {Promise<void>}
     */
    async function savePayload(payload)
    {
        const res = await fetch('/api/config',
        {
            method: 'POST',
            headers:
            {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        if (res.ok)
        {
            window.showToast('✅ Schedule updated successfully!', 'success');
        }
        else
        {
            const err = await res.json();
            window.showToast('❌ Failed to update schedule: ' + (err.error || res.statusText), 'error');
        }
    }

    /**
     * Top-level save handler triggered from UI. Builds and saves the schedule.
     *
     * @returns {Promise<void>}
     */
    window.saveChanges = async function()
    {
        const payload = await buildPayload();
        if (payload)
        {
            await savePayload(payload);
        }
    };
// ===== Schedule Search Input Filtering =====
    const searchInput = document.getElementById("schedule-search");
    if (searchInput)
    {
        searchInput.addEventListener("input", (e) =>
        {
            window.skipDirtyCheck = true;
            searchInput.defaultValue = searchInput.value;
            const query = e.target.value.toLowerCase();
            document.querySelectorAll(".schedule-card").forEach((card) =>
            {
                const text = card.textContent.toLowerCase();
                card.style.display = text.includes(query) ? "flex" : "none";
            });
        });
    }
};