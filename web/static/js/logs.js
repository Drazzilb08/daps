import { humanize } from './common.js';
import { moduleOrder } from './helper.js';

let term = null; // xterm.js instance
let fitAddon = null; // xterm-addon-fit instance
let currentFullLogText = '';
let lastWrittenLineCount = 0;
let lastRenderedFileKey = null;

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

    if (!document.getElementById('scroll-to-top')) {
        const btn = document.createElement('button');
        btn.id = 'scroll-to-top';
        btn.className = 'scroll-to-top';
        btn.innerHTML = '↑ Top';
        btn.style.display = 'none';
        btn.onclick = () => term && term.scrollToTop && term.scrollToTop();
        scrollContainer.appendChild(btn);
    }

    if (!document.getElementById('scroll-to-bottom')) {
        const btn = document.createElement('button');
        btn.id = 'scroll-to-bottom';
        btn.className = 'scroll-to-bottom';
        btn.innerHTML = '↓ Bottom';
        btn.style.display = 'none';
        btn.onclick = () => term && term.scrollToBottom && term.scrollToBottom();
        scrollContainer.appendChild(btn);
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
    setTimeout(handleXTermScroll, 25);
}

function handleXTermScroll() {
    if (!term) return;
    const topBtn = document.getElementById('scroll-to-top');
    const botBtn = document.getElementById('scroll-to-bottom');

    const viewportY = term.buffer.active.viewportY;
    const maxScroll = term.buffer.active.length - term.rows;
    if (topBtn) topBtn.style.display = viewportY > 0 ? 'block' : 'none';
    if (botBtn) botBtn.style.display = viewportY < maxScroll ? 'block' : 'none';
}

export async function loadLogs() {
    let currentModule = null;
    let currentFile = null;
    let activeLoadSessionId = Symbol();

    if (term) {
        term.dispose();
        term = null;
    }
    if (fitAddon) {
        fitAddon.dispose();
        fitAddon = null;
    }
    if (window._activeLogsDestroy) window._activeLogsDestroy();

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
    window.addEventListener('resize', handleResize);

    let refreshInterval = null;
    function setRefreshTask(callback, delay = 1000) {
        if (refreshInterval) clearInterval(refreshInterval);
        refreshInterval = setInterval(callback, delay);
    }

    let filterTimeout;

    async function loadModules() {
        const res = await fetch('/api/logs');
        const data = await res.json();
        const availableModules = Object.keys(data);
        const orderedModules = (moduleOrder || []).filter((m) => availableModules.includes(m));
        for (const module of orderedModules) {
            const opt = document.createElement('option');
            opt.value = module;
            opt.textContent = humanize?.(module) || module;
            moduleSelect.appendChild(opt);
        }
        const preselectedModule =
            window._preselectedLogModule ||
            new URLSearchParams(window.location.search).get('module');
        window._preselectedLogModule = null;
        if (preselectedModule) {
            moduleSelect.value = preselectedModule;
            loadLogFiles(preselectedModule);
        }
    }

    async function loadLogFiles(moduleName) {
        logfileSelect.innerHTML = '<option value="">Select Log File</option>';
        logfileSelect.disabled = true;
        if (!moduleName) return;
        const res = await fetch('/api/logs');
        const data = await res.json();
        const files = data[moduleName] || [];
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
        loadLogFiles(e.target.value);
    });

    logfileSelect.addEventListener('change', (e) => {
        lastWrittenLineCount = 0;
        lastRenderedFileKey = null;
        if (refreshInterval) clearInterval(refreshInterval);
        refreshInterval = null;
        const selectedFile = e.target.value;
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

    window.addEventListener('popstate', () => {
        if (refreshInterval) clearInterval(refreshInterval);
        refreshInterval = null;
    });
    window.addEventListener('beforeunload', () => {
        if (refreshInterval) clearInterval(refreshInterval);
        refreshInterval = null;
    });

    window._activeLogsDestroy = () => {
        if (refreshInterval) clearInterval(refreshInterval);
        refreshInterval = null;
        activeLoadSessionId = null;
        window.removeEventListener('resize', handleResize);
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

    if (term && typeof term.onScroll === 'function') {
        term.onScroll(handleXTermScroll);
    }
    setTimeout(handleXTermScroll, 250);
    loadModules();
}
