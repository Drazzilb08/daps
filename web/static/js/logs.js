import { humanize } from './util.js';

let term = null; // xterm.js instance
let fitAddon = null; // xterm-addon-fit instance
let currentFullLogText = '';
let lastWrittenLineCount = 0;
let lastRenderedFileKey = null;

export const moduleOrder = [
    'sync_gdrive',
    'poster_renamerr',
    'border_replacerr',
    'renameinatorr',
    'upgradinatorr',
    'nohl',
    'labelarr',
    'health_checkarr',
    'jduparr',
    'main',
];

function getUrlParams() {
    const params = new URLSearchParams(location.search);
    return {
        module_name: params.get('module_name') || '',
        log_file: params.get('log_file') || '',
    };
}

export function buildLogControls() {
    const controlsDiv = document.createElement('div');
    controlsDiv.className = 'log-controls log-toolbar';

    const moduleSelect = document.createElement('select');
    moduleSelect.className = 'select module-select';
    moduleSelect.innerHTML = `<option value="">Select Module</option>`;

    const logfileSelect = document.createElement('select');
    logfileSelect.className = 'select logfile-select';
    logfileSelect.disabled = true;
    logfileSelect.innerHTML = `<option value="">Select Log File</option>`;

    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.className = 'input search-logs';
    searchInput.placeholder = 'Search logs...';

    const clearBtn = document.createElement('button');
    clearBtn.className = 'clear-search btn';
    clearBtn.textContent = 'Clear';

    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'download-log btn';
    downloadBtn.textContent = 'Download';

    controlsDiv.appendChild(moduleSelect);
    controlsDiv.appendChild(logfileSelect);
    controlsDiv.appendChild(searchInput);
    controlsDiv.appendChild(clearBtn);
    controlsDiv.appendChild(downloadBtn);

    return controlsDiv;
}

function ensureLogControls() {
    const scrollContainer = document.getElementById('scroll-output-container');
    if (!scrollContainer) return;

    if (!document.getElementById('log-empty-msg')) {
        const msg = document.createElement('div');
        msg.id = 'log-empty-msg';
        msg.textContent = 'No logs available.';
        msg.style.display = 'none';
        scrollContainer.appendChild(msg);
    }
}

function escapeRegex(text) {
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
    HIGHLIGHT: '\x1b[7m',
};

function applyLogLevelAnsiColors(line) {
    if (line.includes('CRITICAL')) return `${ANSI_COLORS.BRIGHT_RED}${line}${ANSI_COLORS.RESET}`;
    else if (line.includes('ERROR')) return `${ANSI_COLORS.RED}${line}${ANSI_COLORS.RESET}`;
    else if (line.includes('WARNING')) return `${ANSI_COLORS.YELLOW}${line}${ANSI_COLORS.RESET}`;
    else if (line.includes('INFO')) return `${ANSI_COLORS.GREEN}${line}${ANSI_COLORS.RESET}`;
    else if (line.includes('DEBUG')) return `${ANSI_COLORS.CYAN}${line}${ANSI_COLORS.RESET}`;
    return line;
}

function renderToXTerm(text, options = {}) {
    ensureLogControls();
    if (!term) return;
    if (!text || !text.trim()) {
        term.clear();
        return;
    }
    const { isFiltered = false, forceClear = false, fileKey = null } = options;
    const lines = text.split('\n');
    if (isFiltered || forceClear || fileKey !== lastRenderedFileKey) {
        term.clear();
        lines.forEach((line) => {
            let processedLine = line;
            if (!isFiltered) {
                processedLine = applyLogLevelAnsiColors(line);
            }
            term.writeln(processedLine);
        });
        lastWrittenLineCount = lines.length;
        if (fileKey) lastRenderedFileKey = fileKey;
    } else {
        for (let i = lastWrittenLineCount; i < lines.length; i++) {
            let processedLine = lines[i];
            processedLine = applyLogLevelAnsiColors(processedLine);
            term.writeln(processedLine);
        }
        lastWrittenLineCount = lines.length;
    }
}

let _activeLogsDestroy = null;

export async function loadLogs() {
    let currentModule = null;
    let currentFile = null;
    let activeLoadSessionId = Symbol();

    // Get preselected values from URL params
    const { module_name: preselectedModule, log_file: preselectedFile } = getUrlParams();

    if (term) {
        term.dispose();
        term = null;
    }
    if (fitAddon) {
        fitAddon.dispose();
        fitAddon = null;
    }
    if (_activeLogsDestroy) _activeLogsDestroy();

    const containerIframe = document.querySelector('.container-iframe');
    if (!containerIframe) return;

    const oldControls = containerIframe.querySelector('.log-controls');
    if (oldControls) oldControls.remove();

    const controlsDiv = buildLogControls();
    containerIframe.insertBefore(controlsDiv, containerIframe.firstChild);

    document.body.classList.add('logs-open');
    document.documentElement.classList.add('logs-open');

    const moduleSelect = document.querySelector('.module-select');
    const logfileSelect = document.querySelector('.logfile-select');
    const searchInput = document.querySelector('.search-logs');
    searchInput.placeholder = 'Filter logs (Ctrl/CMD+F)';
    const clearBtn = document.querySelector('.clear-search');
    const downloadBtn = document.querySelector('.download-log');
    const logOutput = document.querySelector('.log-output');
    const collapseBtn = document.createElement('button');
    collapseBtn.className = 'btn toolbar-collapse-btn';
    collapseBtn.type = 'button';
    collapseBtn.innerHTML = '<span class="toolbar-collapse-icon">▾</span> Hide Controls';
    controlsDiv.insertBefore(collapseBtn, controlsDiv.firstChild);

    if (innerWidth <= 1000) {
        controlsDiv.classList.add('collapsed');
        collapseBtn.setAttribute('aria-expanded', 'false');
        collapseBtn.innerHTML = '<span class="toolbar-collapse-icon">▸</span> Show Controls';
    }

    if (!logOutput) return;
    logOutput.innerHTML = '';

    term = new Terminal({
        cursorBlink: true,
        convertEol: true,
        wordWrap: false,
        scrollback: 100000, // Show much more history
        theme: { background: '#1e1e1e', foreground: '#d4d4d4' },
    });
    fitAddon = new FitAddon.FitAddon();
    term.loadAddon(fitAddon);
    term.open(logOutput);
    try {
        fitAddon.fit();
    } catch (e) {
        console.error('Error fitting terminal:', e);
    }
    const handleResize = () => {
        if (fitAddon)
            try {
                fitAddon.fit();
            } catch (e) {}
    };
    setTimeout(() => {
        const xtermDiv = logOutput.querySelector('.xterm');
        if (xtermDiv) xtermDiv.style.maxWidth = '100%';
    }, 50);
    addEventListener('resize', handleResize);

    let refreshInterval = null;
    function setRefreshTask(callback, delay = 1000) {
        if (refreshInterval) clearInterval(refreshInterval);
        refreshInterval = setInterval(callback, delay);
    }

    let filterTimeout;

    async function loadModules() {
        const res = await fetch('/api/logs');
        const availableModules = await res.json();

        moduleSelect.innerHTML = '<option value="">Select Module</option>'; // Reset options

        // Show splash if nothing to show
        if (!availableModules.length) {
            if (emptyMsg) emptyMsg.style.display = '';
            if (logOutput) logOutput.classList.add('hide-xterm');
            logfileSelect.innerHTML = '<option value="">Select Log File</option>';
            logfileSelect.disabled = true;
            renderToXTerm('', { forceClear: true, fileKey: null });
            return;
        } else {
        }

        const orderedModules = (moduleOrder || [])
            .filter((m) => availableModules.includes(m))
            .concat(availableModules.filter((m) => !(moduleOrder || []).includes(m)));
        for (const module of orderedModules) {
            const opt = document.createElement('option');
            opt.value = module;
            opt.textContent = humanize?.(module) || module;
            moduleSelect.appendChild(opt);
        }
        // Preselect if requested via query param
        if (preselectedModule && availableModules.includes(preselectedModule)) {
            moduleSelect.value = preselectedModule;
            await loadLogFiles(preselectedModule);
            // Only fetch files for the selected module
            const res2 = await fetch(`/api/logs/${preselectedModule}`);
            const files = await res2.json();
            if (preselectedFile && files.includes(preselectedFile)) {
                logfileSelect.value = preselectedFile;
                loadLogContent(preselectedModule, preselectedFile);
                setRefreshTask(() => loadLogContent(preselectedModule, preselectedFile));
            }
        }
    }

    async function loadLogFiles(moduleName) {
        logfileSelect.innerHTML = '<option value="">Select Log File</option>';
        logfileSelect.disabled = true;
        if (!moduleName) {
            renderToXTerm('', { forceClear: true, fileKey: null });
            return;
        }
        const res = await fetch(`/api/logs/${moduleName}`);
        const files = await res.json();
        if (files.length === 0) {
            if (emptyMsg) emptyMsg.style.display = '';
            if (logOutput) logOutput.classList.add('hide-xterm');
            renderToXTerm('', { forceClear: true, fileKey: null });
            return;
        } else {
        }
        let defaultLog = null;
        for (const file of files) {
            const opt = document.createElement('option');
            opt.value = file;
            opt.textContent = file;
            logfileSelect.appendChild(opt);
            if (file === `${moduleName}.log`) defaultLog = file;
        }
        logfileSelect.disabled = false;
        if (defaultLog) {
            logfileSelect.value = defaultLog;
            loadLogContent(moduleName, defaultLog);
            setRefreshTask(() => loadLogContent(moduleName, defaultLog));
        }
    }

    async function loadLogContent(moduleName, fileName) {
        const requestKey = `${moduleName}/${fileName}`;
        currentModule = moduleName;
        currentFile = fileName;
        const sessionId = Symbol();
        activeLoadSessionId = sessionId;
        if (!moduleName || !fileName) {
            currentFullLogText = '';
            renderToXTerm('', { forceClear: true, fileKey: null });
            return;
        }

        let spinner = null;
        let spinnerTimeout = setTimeout(() => {
            spinner = document.querySelector('.log-spinner');
            if (!spinner) {
                spinner = document.createElement('div');
                spinner.className = 'log-spinner';
                logOutput.appendChild(spinner);
            }
        }, 250); // Only show spinner if >250ms

        try {
            const res = await fetch(`/api/logs/${moduleName}/${fileName}`);
            const text = await res.text();
            clearTimeout(spinnerTimeout);
            spinner = document.querySelector('.log-spinner');
            if (spinner) spinner.remove();

            if (
                activeLoadSessionId !== sessionId ||
                moduleName !== currentModule ||
                fileName !== currentFile
            ) {
                return;
            }
            currentFullLogText = text;
            const fileKeyForRender = `${moduleName}/${fileName}`;
            const searchValue = searchInput.value.trim();
            if (searchValue) filterLogs();
            else renderToXTerm(currentFullLogText, { fileKey: fileKeyForRender });
        } catch (e) {
            clearTimeout(spinnerTimeout);
            spinner = document.querySelector('.log-spinner');
            if (spinner) spinner.remove();
            throw e;
        }
    }

    function filterLogs() {
        if (!term) return;
        const search = searchInput.value.toLowerCase();
        if (!search) {
            renderToXTerm(currentFullLogText, { forceClear: true, fileKey: lastRenderedFileKey });
            return;
        }
        const searchRegex = new RegExp(`(${escapeRegex(search)})`, 'gi');
        const filteredLines = currentFullLogText
            .split('\n')
            .filter((line) => line.toLowerCase().includes(search));
        const highlightedAndColoredLines = filteredLines.map((line) => {
            let processedLine = applyLogLevelAnsiColors(line);
            return processedLine.replace(
                searchRegex,
                (match) => `${ANSI_COLORS.HIGHLIGHT}${match}${ANSI_COLORS.RESET}`
            );
        });
        renderToXTerm(highlightedAndColoredLines.join('\n'), {
            isFiltered: true,
            fileKey: lastRenderedFileKey,
        });
    }

    moduleSelect.addEventListener('change', (e) => {
        lastWrittenLineCount = 0;
        lastRenderedFileKey = null;
        if (refreshInterval) clearInterval(refreshInterval);
        refreshInterval = null;
        // --- PATCH: Update URL ---
        const params = new URLSearchParams(location.search);
        params.set('module_name', e.target.value);
        params.delete('log_file'); // Remove log_file if changing module
        history.pushState({}, '', location.pathname + '?' + params.toString());
        loadLogFiles(e.target.value);
    });

    logfileSelect.addEventListener('change', (e) => {
        lastWrittenLineCount = 0;
        lastRenderedFileKey = null;
        if (refreshInterval) clearInterval(refreshInterval);
        refreshInterval = null;
        const selectedFile = e.target.value;
        // --- PATCH: Update URL ---
        const params = new URLSearchParams(location.search);
        params.set('module_name', moduleSelect.value);
        params.set('log_file', selectedFile);
        history.pushState({}, '', location.pathname + '?' + params.toString());
        loadLogContent(moduleSelect.value, selectedFile);
        setRefreshTask(() => loadLogContent(moduleSelect.value, selectedFile));
    });

    searchInput.addEventListener('input', () => {
        clearTimeout(filterTimeout);
        filterTimeout = setTimeout(() => {
            filterLogs();
        }, 150);
    });

    clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        filterLogs();
    });

    document.addEventListener('keydown', function (e) {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
            e.preventDefault();
            searchInput.focus();
            searchInput.select();
        }
    });

    downloadBtn.addEventListener('click', () => {
        if (!moduleSelect.value || !logfileSelect.value) return;
        const link = document.createElement('a');
        link.href = `/api/logs/${moduleSelect.value}/${logfileSelect.value}`;
        link.download = logfileSelect.value;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    collapseBtn.addEventListener('click', () => {
        controlsDiv.classList.toggle('collapsed');
        const isCollapsed = controlsDiv.classList.contains('collapsed');
        collapseBtn.innerHTML = isCollapsed
            ? '<span class="toolbar-collapse-icon">▸</span> Show Controls'
            : '<span class="toolbar-collapse-icon">▾</span> Hide Controls';
    });

    addEventListener('popstate', () => {
        if (refreshInterval) clearInterval(refreshInterval);
        refreshInterval = null;
    });
    addEventListener('beforeunload', () => {
        if (refreshInterval) clearInterval(refreshInterval);
        refreshInterval = null;
    });

    _activeLogsDestroy = () => {
        if (refreshInterval) clearInterval(refreshInterval);
        refreshInterval = null;
        activeLoadSessionId = null;
        removeEventListener('resize', handleResize);
        if (term) {
            term.dispose();
            term = null;
        }
        if (fitAddon) {
            fitAddon.dispose();
            fitAddon = null;
        }
        const scrollContainer = document.querySelector('.scroll-output-container');
        if (scrollContainer) {
            const classListToRemove = ['scroll-to-top', 'scroll-to-bottom', 'log-empty-msg'];
            for (const className of classListToRemove) {
                const el = scrollContainer.querySelector(`.${className}`);
                if (el && el.parentNode === scrollContainer) {
                    scrollContainer.removeChild(el);
                }
            }
        }
    };

    loadModules();
}
