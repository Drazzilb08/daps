let preMode = false;
// ===== Globals and Helpers =====
/**
 * Escapes HTML special characters in a string to prevent HTML injection.
 *
 * @param {string} unsafe - The string to escape.
 * @returns {string} The escaped string safe for HTML rendering.
 */
function escapeHtml(unsafe)
{
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
/**
 * Escapes special characters in a string to safely use it in a regular expression.
 *
 * @param {string} text - The string to escape for regex usage.
 * @returns {string} The escaped string safe for regex patterns.
 */
function escapeRegex(text)
{
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
/**
 * Filters the preformatted log output based on the search input, highlighting matches.
 *
 * @returns {void}
 */
function filterPre()
{
    const logOutputEl = document.getElementById('log-output');
    const pre = logOutputEl.querySelector('pre');
    if (!pre) return;
    const originalText = pre.textContent;
    const search = document.getElementById('search-logs').value;
    if (!search)
    {
        pre.textContent = originalText;
        logOutputEl.scrollTop = logOutputEl.scrollHeight;
        if (typeof updateScrollBadge === 'function') updateScrollBadge();
        return;
    }
    const regex = new RegExp(`(${escapeRegex(search)})`, 'gi');
    const filteredLines = originalText
        .split('\n')
        .filter(line => regex.test(line))
        .map(line => escapeHtml(line).replace(regex, '<mark>$1</mark>'));
    pre.innerHTML = filteredLines.join('\n');
    logOutputEl.scrollTop = logOutputEl.scrollHeight;
    if (typeof updateScrollBadge === 'function') updateScrollBadge();
}
// ===== Preformatted Log Rendering =====
/**
 * Renders the log text inside a preformatted block with syntax highlighting for log levels.
 *
 * @param {string} text - The log text to render.
 * @returns {void}
 */
function renderPre(text)
{
    const logOutput = document.getElementById('log-output');
    const prevScrollTop = logOutput.scrollTop;
    const prevScrollHeight = logOutput.scrollHeight;
    const wasAtBottom = (prevScrollTop + logOutput.clientHeight >= prevScrollHeight - 50);
    // Remove existing content but preserve scroll buttons
    Array.from(logOutput.children).forEach(child =>
    {
        if (child.id !== 'scroll-to-top' && child.id !== 'scroll-to-bottom')
        {
            child.remove();
        }
    });
    const newPre = document.createElement('pre');
    newPre.style.whiteSpace = 'pre';
    newPre.style.fontFamily = 'monospace';
    newPre.style.margin = '0';
    const lines = text.split('\n');
    const html = lines.map(line =>
    {
        const escaped = escapeHtml(line);
        if (line.includes('ERROR'))
        {
            return `<span class="log-error">${escaped}</span>`;
        }
        else if (line.includes('WARNING'))
        {
            return `<span class="log-warning">${escaped}</span>`;
        }
        else if (line.includes('CRITICAL'))
        {
            return `<span class="log-critical">${escaped}</span>`;
        }
        else if (line.includes('INFO'))
        {
            return `<span class="log-info">${escaped}</span>`;
        }
        else if (line.includes('DEBUG'))
        {
            return `<span class="log-debug">${escaped}</span>`;
        }
        return escaped;
    }).join('\n');
    newPre.innerHTML = html;
    logOutput.appendChild(newPre);
    if (wasAtBottom)
    {
        logOutput.scrollTop = logOutput.scrollHeight;
    }
    else
    {
        const newScrollHeight = logOutput.scrollHeight;
        const distanceFromBottom = prevScrollHeight - prevScrollTop;
        logOutput.scrollTop = newScrollHeight - distanceFromBottom;
    }
    if (typeof updateScrollBadge === 'function') updateScrollBadge();
    updateScrollButtons();
}
// ===== Main Log Loader (window.loadLogs) =====
/**
 * Initializes and manages the log viewer interface, including loading modules, files,
 * rendering logs, filtering, and UI event bindings.
 *
 * @returns {Promise<void>} A promise that resolves when initialization is complete.
 */
window.loadLogs = async function()
{
    let currentModule = null;
    let currentFile = null;
    let currentLogKey = null;
    let currentRefreshKey = null;
    let activeLoadSessionId = null;
    // Flush out previous intervals/sessions if any
    if (window._activeLogsDestroy) window._activeLogsDestroy();
    // ===== a. DOM References and Setup =====
    document.body.classList.add('logs-open');
    document.documentElement.classList.add('logs-open');
    const moduleSelect = document.getElementById('module-select');
    if (!moduleSelect) return;
    const logfileSelect = document.getElementById('logfile-select');
    const searchInput = document.getElementById('search-logs');
    searchInput.placeholder = 'Filter logs (Ctrl/CMD+F)';
    const clearBtn = document.getElementById('clear-search');
    const downloadBtn = document.getElementById('download-log');
    let refreshInterval = null;
    // Helper to manage the refresh polling interval
    function setRefreshTask(callback, delay = 1000)
    {
        if (refreshInterval) clearInterval(refreshInterval);
        refreshInterval = setInterval(callback, delay);
    }
    const logOutput = document.getElementById('log-output');
    let filterTimeout;
    // ===== b. Module and File Loading =====
    async function loadModules()
    {
        const res = await fetch('/api/logs');
        const data = await res.json();
        const availableModules = Object.keys(data);
        const orderedModules = (window.moduleOrder || []).filter(m => availableModules.includes(m));
        for (const module of orderedModules)
        {
            const opt = document.createElement('option');
            opt.value = module;
            opt.textContent = window.humanize?.(module) || module;
            moduleSelect.appendChild(opt);
        }
        const preselectedModule = window._preselectedLogModule || new URLSearchParams(window.location.search).get('module');
        window._preselectedLogModule = null;
        if (preselectedModule)
        {
            moduleSelect.value = preselectedModule;
            loadLogFiles(preselectedModule);
        }
    }
    async function loadLogFiles(moduleName)
    {
        logfileSelect.innerHTML = '<option value="">Select Log File</option>';
        logfileSelect.disabled = true;
        if (!moduleName) return;
        const res = await fetch('/api/logs');
        const data = await res.json();
        const files = data[moduleName] || [];
        let defaultLog = null;
        for (const file of files)
        {
            const opt = document.createElement('option');
            opt.value = file;
            opt.textContent = file;
            logfileSelect.appendChild(opt);
            if (file === `${moduleName}.log`)
            {
                defaultLog = file;
            }
        }
        logfileSelect.disabled = false;
        if (defaultLog)
        {
            logfileSelect.value = defaultLog;
            loadLogContent(moduleName, defaultLog);
        }
        if (defaultLog)
        {
            setRefreshTask(() => {
                loadLogContent(moduleName, defaultLog);
            });
        }
    }
    // ===== c. Log Content Loading =====
    async function loadLogContent(moduleName, fileName)
    {
        const requestKey = `${moduleName}/${fileName}`;
        currentRefreshKey = requestKey;
        currentLogKey = requestKey;
        currentModule = moduleName;
        currentFile = fileName;
        // session-based fetch protection
        const sessionId = Symbol();
        activeLoadSessionId = sessionId;
        if (!moduleName || !fileName) return;
        const searchValue = document.getElementById('search-logs')?.value.trim();
        if (searchValue)
        {
            return;
        }
        let spinner = document.getElementById('log-spinner');
        if (!spinner)
        {
            spinner = document.createElement('div');
            spinner.id = 'log-spinner';
            logOutput.appendChild(spinner);
        }
        try
        {
            const res = await fetch(`/api/logs/${moduleName}/${fileName}`);
            const text = await res.text();
            if (activeLoadSessionId !== sessionId) return;
            if (
                currentLogKey !== requestKey ||
                moduleName !== currentModule ||
                fileName !== currentFile ||
                currentRefreshKey !== requestKey
            ) return;
            const lineCount = (text.match(/\n/g) || []).length;
            if (lineCount > 5000)
            {
                preMode = true;
                renderPre(text);
            }
            else
            {
                preMode = false;
                renderLog(text);
            }
        }
        finally
        {
            const spinnerEl = document.getElementById('log-spinner');
            if (spinnerEl) spinnerEl.remove();
        }
    }
    // ===== d. Log Rendering =====
    /**
     * Renders the log text as individual div elements with log level styling.
     *
     * @param {string} text - The log text to render.
     * @returns {void}
     */
    function renderLog(text)
    {
        const logOutput = document.getElementById('log-output');
        if (!logOutput) return;
        const lines = text.split('\n');
        const existingCount = logOutput.children.length;
        const wasAtBottom = existingCount > 0 &&
            (logOutput.scrollTop + logOutput.clientHeight >= logOutput.scrollHeight - 50);
        // Remove existing content but preserve scroll buttons
        Array.from(logOutput.children).forEach(child =>
        {
            if (child.id !== 'scroll-to-top' && child.id !== 'scroll-to-bottom')
            {
                child.remove();
            }
        });
        for (const line of lines)
        {
            const div = document.createElement('div');
            div.textContent = line;
            if (line.includes('ERROR')) div.classList.add('log-error');
            else if (line.includes('WARNING')) div.classList.add('log-warning');
            else if (line.includes('CRITICAL')) div.classList.add('log-critical');
            else if (line.includes('INFO')) div.classList.add('log-info');
            else if (line.includes('DEBUG')) div.classList.add('log-debug');
            logOutput.appendChild(div);
        }
        if (wasAtBottom)
        {
            logOutput.scrollTop = logOutput.scrollHeight;
        }
        if (typeof updateScrollBadge === 'function') updateScrollBadge();
        updateScrollButtons();
    }
    // ===== e. Log Filtering =====
    /**
     * Filters the visible log lines in batches for performance and highlights matches.
     *
     * @returns {void}
     */
    function filterLogsInBatches()
    {
        const search = searchInput.value.toLowerCase();
        const nodes = Array.from(logOutput.children);
        let index = 0;
        const batchSize = 200;
        const regex = search ? new RegExp(`(${search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi') : null;

        function processBatch()
        {
            const end = Math.min(index + batchSize, nodes.length);
            for (; index < end; index++)
            {
                const lineEl = nodes[index];
                const text = lineEl.textContent.toLowerCase();
                if (search && text.includes(search))
                {
                    lineEl.style.display = '';
                    const original = lineEl.textContent;
                    lineEl.innerHTML = original.replace(regex, '<mark>$1</mark>');
                }
                else if (!search)
                {
                    lineEl.style.display = '';
                    lineEl.innerHTML = lineEl.textContent;
                }
                else
                {
                    lineEl.style.display = 'none';
                }
            }
            if (index < nodes.length)
            {
                requestAnimationFrame(processBatch);
            }
        }
        processBatch();
        updateScrollBadge();
    }
    // ===== f. UI Event Bindings =====
    moduleSelect.addEventListener('change', e =>
    {
        if (refreshInterval) clearInterval(refreshInterval);
        refreshInterval = null;
        currentRefreshKey = null;
        loadLogFiles(e.target.value);
        // Clear existing log lines but keep scroll buttons
        Array.from(logOutput.children).forEach(child =>
        {
            if (child.id !== 'scroll-to-top' && child.id !== 'scroll-to-bottom')
            {
                child.remove();
            }
        });
    });
    logfileSelect.addEventListener('change', e =>
    {
        if (refreshInterval) clearInterval(refreshInterval);
        refreshInterval = null;
        currentRefreshKey = null;
        const selectedFile = e.target.value;
        loadLogContent(moduleSelect.value, selectedFile);
        setRefreshTask(() => {
            loadLogContent(moduleSelect.value, selectedFile);
        });
    });
    searchInput.addEventListener('input', () =>
    {
        clearTimeout(filterTimeout);
        filterTimeout = setTimeout(() =>
        {
            if (preMode) filterPre();
            else filterLogsInBatches();
        }, 150);
    });
    clearBtn.addEventListener('click', () =>
    {
        searchInput.value = '';
        if (preMode) filterPre();
        else filterLogsInBatches();
    });
    document.addEventListener('keydown', function(e)
    {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f')
        {
            e.preventDefault();
            searchInput.focus();
            searchInput.select();
        }
    });
    downloadBtn.addEventListener('click', () =>
    {
        if (!moduleSelect.value || !logfileSelect.value) return;
        const link = document.createElement('a');
        link.href = `/api/logs/${moduleSelect.value}/${logfileSelect.value}`;
        link.download = logfileSelect.value;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
    loadModules();
    // ===== g. Auto-Scroll Badge =====
    const scrollBadge = document.createElement('div');
    scrollBadge.id = 'scroll-badge';
    scrollBadge.textContent = 'Auto-Scrolling';
    scrollBadge.style.position = 'absolute';
    scrollBadge.style.bottom = '20px';
    scrollBadge.style.right = '20px';
    scrollBadge.style.background = 'rgba(0,0,0,0.7)';
    scrollBadge.style.color = 'white';
    scrollBadge.style.padding = '5px 10px';
    scrollBadge.style.borderRadius = '5px';
    scrollBadge.style.fontSize = '0.8rem';
    scrollBadge.style.display = 'none';
    scrollBadge.style.zIndex = '9999';
    scrollBadge.style.transition = 'opacity 0.5s';
    scrollBadge.style.opacity = '0';
    document.body.appendChild(scrollBadge);
    // --- create scroll buttons once ---
    if (!document.getElementById('scroll-to-top'))
    {
        const btnTop = document.createElement('button');
        btnTop.id = 'scroll-to-top';
        btnTop.textContent = '↑ Top';
        btnTop.addEventListener('click', () => logOutput.scrollTop = 0);
        document.getElementById('scroll-output-container').appendChild(btnTop);
    }
    if (!document.getElementById('scroll-to-bottom'))
    {
        const btnBottom = document.createElement('button');
        btnBottom.id = 'scroll-to-bottom';
        btnBottom.textContent = '↓ Bottom';
        btnBottom.addEventListener('click', () => logOutput.scrollTop = logOutput.scrollHeight);
        document.getElementById('scroll-output-container').appendChild(btnBottom);
    }
    /**
     * Updates the visibility and opacity of the auto-scroll badge based on scroll position.
     *
     * @returns {void}
     */
    function updateScrollBadge()
    {
        const nearBottom = logOutput.scrollTop + logOutput.clientHeight >= logOutput.scrollHeight - 50;
        if (nearBottom)
        {
            scrollBadge.style.display = 'block';
            requestAnimationFrame(() =>
            {
                scrollBadge.style.opacity = '1';
            });
        }
        else
        {
            scrollBadge.style.opacity = '0';
            setTimeout(() =>
            {
                if (scrollBadge.style.opacity === '0')
                {
                    scrollBadge.style.display = 'none';
                }
            }, 500);
        }
    }
    /**
     * Updates the visibility of the scroll-to-top and scroll-to-bottom buttons.
     * The bottom button always remains visible.
     */
    function updateScrollButtons()
    {
        const topBtn = document.getElementById('scroll-to-top');
        const bottomBtn = document.getElementById('scroll-to-bottom');
        if (!topBtn || !bottomBtn) return;
        const atTop = logOutput.scrollTop <= 10;
        const atBottom = (logOutput.scrollTop + logOutput.clientHeight) >= (logOutput.scrollHeight - 10);
        topBtn.style.display = atTop ? 'none' : 'block';
        bottomBtn.style.display = atBottom ? 'none' : 'block';
    }
    scrollBadge.addEventListener('click', () =>
    {
        logOutput.scrollTop = logOutput.scrollHeight;
        scrollBadge.style.display = 'none';
    });
    logOutput.addEventListener('scroll', updateScrollBadge);
    logOutput.addEventListener('scroll', updateScrollButtons);
    window.addEventListener('popstate', () =>
    {
        if (refreshInterval) clearInterval(refreshInterval);
        refreshInterval = null;
    });
    window.addEventListener('beforeunload', () =>
    {
        if (refreshInterval) clearInterval(refreshInterval);
        refreshInterval = null;
    });

    // ===== h. Cleanup function to flush intervals/sessions =====
    window._activeLogsDestroy = () =>
    {
        if (refreshInterval) clearInterval(refreshInterval);
        refreshInterval = null;
        currentRefreshKey = null;
        currentLogKey = null;
        activeLoadSessionId = null;
    };
};