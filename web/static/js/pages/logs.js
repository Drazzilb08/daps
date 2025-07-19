import { humanize } from '../util.js';
import { moduleOrder } from '../constants/constants.js';
import { fetchLogModules } from '../api.js';

let term = null; // xterm.js instance
let fitAddon = null; // xterm-addon-fit instance
let currentFullLogText = '';
let lastWrittenLineCount = 0;
let lastRenderedFileKey = null;
let _activeLogsDestroy = () => {};
let refreshInterval = null;
let activeLoadSessionId = Symbol();

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

export function initLogs() {
    ensureLogsDOM();
    loadLogs();
}

// ===== DOM/HTML Construction =====

function ensureLogsDOM() {
    const container = document.getElementById('viewFrame');
    if (!container) return;

    [...container.children].forEach((child) => {
        if (
            !child.classList.contains('loader-modal') &&
            !child.classList.contains('poster-search-loader-modal')
        ) {
            container.removeChild(child);
        }
    });

    let card = container.querySelector('.logs-card');
    if (!card) {
        card = document.createElement('div');
        card.className = 'logs-card page-card';

        const cardContent = document.createElement('div');
        cardContent.className = 'logs-card-content';
        card.appendChild(cardContent);

        const scrollContainer = document.createElement('div');
        scrollContainer.id = 'scroll-output-container';
        scrollContainer.className = 'scroll-output-container';
        scrollContainer.style.position = 'relative';

        const logOutput = document.createElement('div');
        logOutput.id = 'log-output';
        logOutput.className = 'log-output';
        scrollContainer.appendChild(logOutput);

        card.appendChild(scrollContainer);
        container.appendChild(card);
    } else {
        card.querySelectorAll(
            ':scope > *:not(.poster-search-loader-modal):not(.loader-modal)'
        ).forEach((child) => child.remove());

        const cardContent = document.createElement('div');
        cardContent.className = 'logs-card-content';
        card.appendChild(cardContent);

        const scrollContainer = document.createElement('div');
        scrollContainer.id = 'scroll-output-container';
        scrollContainer.className = 'scroll-output-container';
        scrollContainer.style.position = 'relative';
        const logOutput = document.createElement('div');
        logOutput.id = 'log-output';
        logOutput.className = 'log-output';
        scrollContainer.appendChild(logOutput);
        card.appendChild(scrollContainer);
    }
}

function buildLogControls() {
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

    // Collapse btn (for mobile)
    const collapseBtn = document.createElement('button');
    collapseBtn.className = 'btn toolbar-collapse-btn';
    collapseBtn.type = 'button';
    collapseBtn.innerHTML = '<span class="toolbar-collapse-icon">▾</span> Hide Controls';
    controlsDiv.insertBefore(collapseBtn, controlsDiv.firstChild);

    if (window.innerWidth <= 1000) {
        controlsDiv.classList.add('collapsed');
        collapseBtn.setAttribute('aria-expanded', 'false');
        collapseBtn.innerHTML = '<span class="toolbar-collapse-icon">▸</span> Show Controls';
    }

    return controlsDiv;
}

// ===== Core Loader =====

async function loadLogs() {
    if (term) {
        term.dispose();
        term = null;
    }
    if (fitAddon) {
        fitAddon.dispose();
        fitAddon = null;
    }
    if (_activeLogsDestroy) _activeLogsDestroy();

    const container = document.getElementById('viewFrame');
    const card = container?.querySelector('.logs-card');
    const cardContent = card?.querySelector('.logs-card-content');
    const scrollContainer = card?.querySelector('.scroll-output-container');
    const logOutput = scrollContainer?.querySelector('.log-output');
    if (cardContent) cardContent.innerHTML = '';
    if (logOutput) logOutput.innerHTML = '';

    const controlsDiv = buildLogControls();
    cardContent?.appendChild(controlsDiv);

    setupTerminal(logOutput);

    document.body.classList.add('logs-open');
    document.documentElement.classList.add('logs-open');

    registerLogControlEvents(controlsDiv, logOutput);

    // Initial load of modules/files
    await loadModules(controlsDiv, logOutput);
}

// ===== Terminal Setup =====

function setupTerminal(logOutput) {
    term = new Terminal({
        cursorBlink: true,
        convertEol: true,
        wordWrap: false,
        scrollback: 100000,
        theme: { background: '#1e1e1e', foreground: '#d4d4d4' },
    });
    fitAddon = new FitAddon.FitAddon();
    term.loadAddon(fitAddon);
    term.open(logOutput);
    try {
        fitAddon.fit();
    } catch (e) {}
    setTimeout(() => {
        const xtermDiv = logOutput.querySelector('.xterm');
        if (xtermDiv) xtermDiv.style.maxWidth = '100%';
    }, 50);
    window.addEventListener('resize', () => fitAddon.fit());
}

// ===== Event Handlers =====

function registerLogControlEvents(controlsDiv, logOutput) {
    const moduleSelect = controlsDiv.querySelector('.module-select');
    const logfileSelect = controlsDiv.querySelector('.logfile-select');
    const searchInput = controlsDiv.querySelector('.search-logs');
    const clearBtn = controlsDiv.querySelector('.clear-search');
    const downloadBtn = controlsDiv.querySelector('.download-log');
    const collapseBtn = controlsDiv.querySelector('.toolbar-collapse-btn');

    let filterTimeout;

    moduleSelect.addEventListener('change', async (e) => {
        lastWrittenLineCount = 0;
        lastRenderedFileKey = null;
        clearRefresh();
        // --- PATCH: Update URL ---
        const params = new URLSearchParams(location.search);
        params.set('module_name', e.target.value);
        params.delete('log_file');
        history.pushState({}, '', location.pathname + '?' + params.toString());
        await loadLogFiles(e.target.value, controlsDiv, logOutput, searchInput);
    });

    logfileSelect.addEventListener('change', async (e) => {
        lastWrittenLineCount = 0;
        lastRenderedFileKey = null;
        clearRefresh();
        const selectedFile = e.target.value;
        const params = new URLSearchParams(location.search);
        params.set('module_name', moduleSelect.value);
        params.set('log_file', selectedFile);
        history.pushState({}, '', location.pathname + '?' + params.toString());
        await loadLogContent(moduleSelect.value, selectedFile, logOutput, searchInput);
        setRefreshTask(() =>
            loadLogContent(moduleSelect.value, selectedFile, logOutput, searchInput)
        );
    });

    searchInput.addEventListener('input', () => {
        clearTimeout(filterTimeout);
        filterTimeout = setTimeout(() => {
            filterLogs(searchInput, logOutput);
        }, 150);
    });

    clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        filterLogs(searchInput, logOutput);
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

    window.addEventListener('popstate', clearRefresh);
    window.addEventListener('beforeunload', clearRefresh);

    // Cleanup
    _activeLogsDestroy = () => {
        clearRefresh();
        activeLoadSessionId = null;
        window.removeEventListener('resize', fitAddon?.fit);
        if (term) {
            term.dispose();
            term = null;
        }
        if (fitAddon) {
            fitAddon.dispose();
            fitAddon = null;
        }
        const scrollContainer = document.getElementById('scroll-output-container');
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
}

// ===== Data Loaders =====

async function loadModules(controlsDiv, logOutput) {
    const moduleSelect = controlsDiv.querySelector('.module-select');
    const logfileSelect = controlsDiv.querySelector('.logfile-select');
    const searchInput = controlsDiv.querySelector('.search-logs');

    const { module_name: preselectedModule, log_file: preselectedFile } = getUrlParams();

    const availableModules = await fetchLogModules();
    moduleSelect.innerHTML = '<option value="">Select Module</option>';

    if (!availableModules.length) {
        hideXTerm(logOutput);
        logfileSelect.innerHTML = '<option value="">Select Log File</option>';
        logfileSelect.disabled = true;
        renderToXTerm('', { forceClear: true, fileKey: null });
        return;
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

    if (preselectedModule && availableModules.includes(preselectedModule)) {
        moduleSelect.value = preselectedModule;
        await loadLogFiles(preselectedModule, controlsDiv, logOutput, searchInput);
        const res2 = await fetch(`/api/logs/${preselectedModule}`);
        const files = await res2.json();
        if (preselectedFile && files.includes(preselectedFile)) {
            logfileSelect.value = preselectedFile;
            await loadLogContent(preselectedModule, preselectedFile, logOutput, searchInput);
            setRefreshTask(() =>
                loadLogContent(preselectedModule, preselectedFile, logOutput, searchInput)
            );
        }
    }
}

async function loadLogFiles(moduleName, controlsDiv, logOutput, searchInput) {
    const logfileSelect = controlsDiv.querySelector('.logfile-select');
    logfileSelect.innerHTML = '<option value="">Select Log File</option>';
    logfileSelect.disabled = true;
    if (!moduleName) {
        renderToXTerm('', { forceClear: true, fileKey: null });
        return;
    }
    const res = await fetch(`/api/logs/${moduleName}`);
    const files = await res.json();
    if (files.length === 0) {
        hideXTerm(logOutput);
        renderToXTerm('', { forceClear: true, fileKey: null });
        return;
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
        await loadLogContent(moduleName, defaultLog, logOutput, searchInput);
        setRefreshTask(() => loadLogContent(moduleName, defaultLog, logOutput, searchInput));
    }
}

async function loadLogContent(moduleName, fileName, logOutput, searchInput) {
    const requestKey = `${moduleName}/${fileName}`;
    let currentModule = moduleName;
    let currentFile = fileName;
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
    }, 250);

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
        if (searchValue) filterLogs(searchInput, logOutput);
        else renderToXTerm(currentFullLogText, { fileKey: fileKeyForRender });
    } catch (e) {
        clearTimeout(spinnerTimeout);
        spinner = document.querySelector('.log-spinner');
        if (spinner) spinner.remove();
        throw e;
    }
}

function filterLogs(searchInput, logOutput) {
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

// ===== Utility =====

function setRefreshTask(callback, delay = 1000) {
    clearRefresh();
    refreshInterval = setInterval(callback, delay);
}
function clearRefresh() {
    if (refreshInterval) clearInterval(refreshInterval);
    refreshInterval = null;
}

function hideXTerm(logOutput) {
    let emptyMsg = document.getElementById('log-empty-msg');
    if (!emptyMsg) {
        emptyMsg = document.createElement('div');
        emptyMsg.id = 'log-empty-msg';
        emptyMsg.textContent = 'No logs available.';
        emptyMsg.style.display = '';
        logOutput?.parentNode?.appendChild(emptyMsg);
    } else {
        emptyMsg.style.display = '';
    }
    if (logOutput) logOutput.classList.add('hide-xterm');
}

function escapeRegex(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function getUrlParams() {
    const params = new URLSearchParams(location.search);
    return {
        module_name: params.get('module_name') || '',
        log_file: params.get('log_file') || '',
    };
}
function applyLogLevelAnsiColors(line) {
    if (line.includes('CRITICAL')) return `${ANSI_COLORS.BRIGHT_RED}${line}${ANSI_COLORS.RESET}`;
    else if (line.includes('ERROR')) return `${ANSI_COLORS.RED}${line}${ANSI_COLORS.RESET}`;
    else if (line.includes('WARNING')) return `${ANSI_COLORS.YELLOW}${line}${ANSI_COLORS.RESET}`;
    else if (line.includes('INFO')) return `${ANSI_COLORS.GREEN}${line}${ANSI_COLORS.RESET}`;
    else if (line.includes('DEBUG')) return `${ANSI_COLORS.CYAN}${line}${ANSI_COLORS.RESET}`;
    return line;
}

function renderToXTerm(text, opts = {}) {
    if (!term) return;

    // Avoid double-rendering same file content
    if (opts.fileKey && opts.fileKey === lastRenderedFileKey && !opts.forceClear) {
        return;
    }
    lastRenderedFileKey = opts.fileKey || null;

    // If filtered, don't colorize log levels (already done)
    let lines = text.split('\n');
    if (!opts.isFiltered) {
        lines = lines.map(applyLogLevelAnsiColors);
    }

    term.clear();
    const MAX_LINES = 20000;
    if (lines.length > MAX_LINES) {
        lines = lines.slice(-MAX_LINES);
        lines.unshift(`... (showing last ${MAX_LINES} lines) ...`);
    }
    term.write(lines.join('\n'));
}
