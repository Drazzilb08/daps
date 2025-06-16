let term = null; // xterm.js instance
let fitAddon = null; // xterm-addon-fit instance
let currentFullLogText = ''; // Stores the complete log text for filtering and re-rendering
let lastWrittenLineCount = 0; // Tracks number of lines written to xterm for current view
let lastRenderedFileKey = null; // Tracks the key of the last rendered file to detect file changes
// ===== Scroll Buttons and "No logs" message helpers =====
function ensureLogControls()
{
    const scrollContainer = document.getElementById('scroll-output-container');
    if (!scrollContainer) return;
    // Add empty message
    if (!document.getElementById('log-empty-msg'))
    {
        const msg = document.createElement('div');
        msg.id = 'log-empty-msg';
        msg.textContent = 'No logs available.';
        msg.style.display = 'none';
        scrollContainer.appendChild(msg);
    }
    // Add scroll-to-top button
    if (!document.getElementById('scroll-to-top'))
    {
        const btn = document.createElement('button');
        btn.id = 'scroll-to-top';
        btn.innerHTML = '↑ Top';
        btn.style.display = 'none';
        btn.onclick = () => term && term.scrollToTop && term.scrollToTop();
        scrollContainer.appendChild(btn);
    }
    // Add scroll-to-bottom button
    if (!document.getElementById('scroll-to-bottom'))
    {
        const btn = document.createElement('button');
        btn.id = 'scroll-to-bottom';
        btn.innerHTML = '↓ Bottom';
        btn.style.display = 'none';
        btn.onclick = () => term && term.scrollToBottom && term.scrollToBottom();
        scrollContainer.appendChild(btn);
    }
}
// ===== Globals and Helpers =====
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
const ANSI_COLORS = {
    RESET: '\x1b[0m',
    RED: '\x1b[31m',
    GREEN: '\x1b[32m',
    YELLOW: '\x1b[33m',
    BLUE: '\x1b[34m',
    MAGENTA: '\x1b[35m',
    CYAN: '\x1b[36m',
    WHITE: '\x1b[37m',
    BRIGHT_RED: '\x1b[91m',
    // For search highlighting
    HIGHLIGHT: '\x1b[7m', // Reverse video
    // You can add more colors as needed
};
/**
 * Applies ANSI color codes to a log line based on keywords.
 * @param {string} line - The log line.
 * @returns {string} The line with ANSI color codes.
 */
function applyLogLevelAnsiColors(line)
{
    if (line.includes('CRITICAL'))
    {
        return `${ANSI_COLORS.BRIGHT_RED}${line}${ANSI_COLORS.RESET}`;
    }
    else if (line.includes('ERROR'))
    {
        return `${ANSI_COLORS.RED}${line}${ANSI_COLORS.RESET}`;
    }
    else if (line.includes('WARNING'))
    {
        return `${ANSI_COLORS.YELLOW}${line}${ANSI_COLORS.RESET}`;
    }
    else if (line.includes('INFO'))
    {
        return `${ANSI_COLORS.GREEN}${line}${ANSI_COLORS.RESET}`;
    }
    else if (line.includes('DEBUG'))
    {
        return `${ANSI_COLORS.CYAN}${line}${ANSI_COLORS.RESET}`;
    }
    return line;
}
/**
 * Renders log text to the xterm.js terminal.
 * Preserves and restores scroll position unless user was at bottom.
 * @param {string} text - The log text to render.
 * @param {object} [options={}] - Rendering options.
 * @param {boolean} [options.isFiltered=false] - True if 'text' is already filtered and highlighted.
 * @param {boolean} [options.forceClear=false] - True to force clear even if fileKey matches.
 * @param {string|null} [options.fileKey=null] - Key representing the current log file.
 */
function renderToXTerm(text, options = {})
{
    ensureLogControls();
    if (!term) return;
    if (!text || !text.trim())
    {
        term.clear();
        return;
    }
    const
    {
        isFiltered = false,
            forceClear = false,
            fileKey = null
    } = options;
    const lines = text.split('\n');
    if (isFiltered || forceClear || fileKey !== lastRenderedFileKey)
    {
        term.clear();
        lines.forEach(line =>
        {
            let processedLine = line;
            // If not filtered, apply log level colors. If filtered, text already has highlights.
            if (!isFiltered)
            {
                processedLine = applyLogLevelAnsiColors(line);
            }
            term.writeln(processedLine);
        });
        lastWrittenLineCount = lines.length;
        if (fileKey)
        { // Only update if a valid fileKey is provided
            lastRenderedFileKey = fileKey;
        }
    }
    else
    { // Appending to the same, non-filtered log
        // Only write new lines
        for (let i = lastWrittenLineCount; i < lines.length; i++)
        {
            let processedLine = lines[i];
            // Always apply log level colors when appending raw lines
            processedLine = applyLogLevelAnsiColors(processedLine);
            term.writeln(processedLine);
        }
        lastWrittenLineCount = lines.length;
        // lastRenderedFileKey remains the same
    }
    setTimeout(handleXTermScroll, 25);
}
// ===== Scroll Buttons & Jump Logic =====
function handleXTermScroll()
{
    if (!term) return;
    const topBtn = document.getElementById('scroll-to-top');
    const botBtn = document.getElementById('scroll-to-bottom');
    const jumpBtn = document.getElementById('jump-to-bottom');
    const viewportY = term.buffer.active.viewportY;
    const maxScroll = term.buffer.active.length - term.rows;
    if (topBtn) topBtn.style.display = viewportY > 0 ? 'block' : 'none';
    if (botBtn) botBtn.style.display = viewportY < maxScroll ? 'block' : 'none';
    if (jumpBtn) jumpBtn.style.display = (viewportY < maxScroll - 2) ? 'block' : 'none';
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
    // ... [rest of the loadLogs function remains, but scroll-related parts have been removed]
    let currentModule = null;
    let currentFile = null;
    let currentLogKey = null;
    let currentRefreshKey = null;
    let activeLoadSessionId = Symbol(); // Initialize for the first load
    // Clear previous term if exists
    if (term)
    {
        term.dispose();
        term = null;
    }
    if (fitAddon)
    {
        fitAddon.dispose();
        fitAddon = null;
    }
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
    if (!logOutput) return;
    logOutput.innerHTML = ''; // Clear any previous content
    term = new Terminal(
    {
        cursorBlink: true,
        convertEol: true, // Convert \n to \r\n for proper line endings in terminal
        wordWrap: false, // Explicitly disable line wrapping
        scrollback: 10000, // Number of lines to keep in scrollback buffer
        theme:
        { // Basic theme, can be customized
            background: '#1e1e1e',
            foreground: '#d4d4d4',
        }
    });
    fitAddon = new FitAddon.FitAddon();
    term.loadAddon(fitAddon);
    term.open(logOutput);
    try
    { // Add try-catch for fitAddon as it can sometimes error on rapid reloads
        fitAddon.fit();
    }
    catch (e)
    {
        console.error("Error fitting terminal on initial load:", e);
    }
    const handleResize = () =>
    {
        if (fitAddon) try
        {
            fitAddon.fit();
        }
        catch (e)
        {
            console.error("Error fitting terminal on resize:", e);
        }
    };
    window.addEventListener('resize', handleResize);
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
            setRefreshTask(() =>
            {
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
        if (!moduleName || !fileName)
        {
            currentFullLogText = ''; // Clear log text if no file
            renderToXTerm('',
            {
                forceClear: true,
                fileKey: null
            });
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
            // Check session ID and if the context (module/file) has changed during fetch
            if (activeLoadSessionId !== sessionId || moduleName !== currentModule || fileName !== currentFile)
            {
                return; // Stale request or context changed
            }
            currentFullLogText = text; // Store the full raw log text
            const fileKeyForRender = `${moduleName}/${fileName}`;
            const searchValue = searchInput.value.trim();
            if (searchValue)
            {
                filterLogs(); // filterLogs will use currentFullLogText and render
            }
            else
            {
                renderToXTerm(currentFullLogText,
                {
                    fileKey: fileKeyForRender
                });
            }
        }
        finally
        {
            const spinnerEl = document.getElementById('log-spinner');
            if (spinnerEl) spinnerEl.remove();
        }
        const fileKey = `${moduleName}/${fileName}`;
    }
    // ===== e. Log Filtering =====
    /**
     * Filters logs based on search input and re-renders to xterm.
     * @returns {void}
     */
    function filterLogs()
    {
        if (!term) return;
        const search = searchInput.value.toLowerCase();
        if (!search)
        {
            // Render the full log, force clear because we are transitioning from filtered to non-filtered
            renderToXTerm(currentFullLogText,
            {
                forceClear: true,
                fileKey: lastRenderedFileKey
            });
            return;
        }
        const searchRegex = new RegExp(`(${escapeRegex(search)})`, 'gi');
        const filteredLines = currentFullLogText
            .split('\n')
            .filter(line => line.toLowerCase().includes(search));
        const highlightedAndColoredLines = filteredLines.map(line =>
        {
            let processedLine = applyLogLevelAnsiColors(line); // Color first
            return processedLine.replace(
                searchRegex,
                match => `${ANSI_COLORS.HIGHLIGHT}${match}${ANSI_COLORS.RESET}`
            );
        });
        // Render the filtered and highlighted text. isFiltered = true means text is pre-processed.
        renderToXTerm(highlightedAndColoredLines.join('\n'),
        {
            isFiltered: true,
            fileKey: lastRenderedFileKey
        });
    }
    // ===== f. UI Event Bindings =====
    moduleSelect.addEventListener('change', e =>
    {
        lastWrittenLineCount = 0;
        lastRenderedFileKey = null;
        if (refreshInterval) clearInterval(refreshInterval);
        refreshInterval = null;
        currentRefreshKey = null;
        loadLogFiles(e.target.value);
    });
    logfileSelect.addEventListener('change', e =>
    {
        lastWrittenLineCount = 0;
        lastRenderedFileKey = null;
        if (refreshInterval) clearInterval(refreshInterval);
        refreshInterval = null;
        currentRefreshKey = null;
        const selectedFile = e.target.value;
        loadLogContent(moduleSelect.value, selectedFile);
        setRefreshTask(() =>
        {
            loadLogContent(moduleSelect.value, selectedFile);
        });
    });
    searchInput.addEventListener('input', () =>
    {
        clearTimeout(filterTimeout);
        filterTimeout = setTimeout(() =>
        {
            filterLogs();
        }, 150);
    });
    clearBtn.addEventListener('click', () =>
    {
        searchInput.value = '';
        filterLogs();
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
        currentLogKey = null; // Reset current log key
        activeLoadSessionId = null;
        window.removeEventListener('resize', handleResize); // Ensure listener is removed
        if (term)
        {
            term.dispose();
            term = null;
        }
        if (fitAddon)
        {
            fitAddon.dispose();
            fitAddon = null;
        }
        // Remove scroll controls and empty message from scroll-output-container
        const scrollContainer = document.getElementById('scroll-output-container');
        if (scrollContainer)
        {
            const idsToRemove = ['scroll-to-top', 'scroll-to-bottom', 'log-empty-msg'];
            for (const id of idsToRemove)
            {
                const el = document.getElementById(id);
                if (el && el.parentNode === scrollContainer)
                {
                    scrollContainer.removeChild(el);
                }
            }
        }
    };
    // Attach scroll event and set initial button state
    if (term && term.element)
    {
        term.element.addEventListener('scroll', handleXTermScroll);
    }
    // Call after render to ensure initial button state is correct
    setTimeout(handleXTermScroll, 250);
    loadModules();
};