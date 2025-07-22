// web/static/js/pages/logs.js

import { humanize, showToast, getIcon } from '../util.js';
import { moduleOrder } from '../constants/constants.js';
import { fetchLogFiles, fetchLogContent, fetchLogModules } from '../api.js';

let term = null;
let fitAddon = null;
let currentFullLogText = '';
let lastRenderedFileKey = null;
let refreshInterval = null;
let _activeLogsDestroy = () => {};

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

/* ============================
   DOM & Modular Build
============================ */
export function initLogs() {
    ensureLogsDOM();
    loadLogs();
}

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
    const isMobile = window.innerWidth <= 1000;
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

    // Buttons row
    const btnRow = document.createElement('div');
    btnRow.className = 'btn-row';

    // Clear
    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = isMobile ? 'btn clear-search' : 'btn--icon clear-search';
    clearBtn.title = 'Clear search';
    clearBtn.setAttribute('aria-label', 'Clear search');
    if (isMobile) {
        clearBtn.innerHTML = `${getIcon('mi:cancel', {
            style: 'vertical-align:middle;',
        })} Clear`;
    } else {
        clearBtn.innerHTML = `${getIcon('mi:cancel', {
            style: 'vertical-align:middle;',
        })}<span class="btn-tooltip">Clear Search</span>`;
    }

    // Download
    const downloadBtn = document.createElement('button');
    downloadBtn.type = 'button';
    downloadBtn.className = isMobile ? 'btn download-log' : 'btn--icon download-log';
    downloadBtn.title = 'Download log';
    downloadBtn.setAttribute('aria-label', 'Download log');
    if (isMobile) {
        downloadBtn.innerHTML = `${getIcon('mi:download', {
            style: 'vertical-align:middle;',
        })} Download`;
    } else {
        downloadBtn.innerHTML = `${getIcon('mi:download', {
            style: 'vertical-align:middle;',
        })}<span class="btn-tooltip">Download Log</span>`;
    }

    // Upload
    const uploadBtn = document.createElement('button');
    uploadBtn.type = 'button';
    uploadBtn.className = isMobile ? 'btn upload-log' : 'btn--icon upload-log';
    uploadBtn.title = 'Upload log to dpaste';
    uploadBtn.setAttribute('aria-label', 'Upload log to dpaste');
    if (isMobile) {
        uploadBtn.innerHTML = `${getIcon('mi:upload', { style: 'vertical-align:middle;' })} Upload`;
    } else {
        uploadBtn.innerHTML = `${getIcon('mi:upload', {
            style: 'vertical-align:middle;',
        })}<span class="btn-tooltip">Upload</span>`;
    }

    btnRow.appendChild(clearBtn);
    btnRow.appendChild(downloadBtn);
    btnRow.appendChild(uploadBtn);

    controlsDiv.appendChild(moduleSelect);
    controlsDiv.appendChild(logfileSelect);
    controlsDiv.appendChild(searchInput);
    controlsDiv.appendChild(btnRow);

    // Collapse btn (for mobile)
    const collapseBtn = document.createElement('button');
    collapseBtn.className = 'toolbar-collapse-btn';
    collapseBtn.type = 'button';
    collapseBtn.innerHTML = '<span class="toolbar-collapse-icon">▾</span> Hide Controls';
    controlsDiv.insertBefore(collapseBtn, controlsDiv.firstChild);

    return controlsDiv;
}

/* ============================
   Loader & Terminal
============================ */
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

    await loadModules(controlsDiv, logOutput);
}

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

/* ============================
   Event Handlers
============================ */
function registerLogControlEvents(controlsDiv, logOutput) {
    const moduleSelect = controlsDiv.querySelector('.module-select');
    const logfileSelect = controlsDiv.querySelector('.logfile-select');
    const searchInput = controlsDiv.querySelector('.search-logs');
    const clearBtn = controlsDiv.querySelector('.clear-search');
    const downloadBtn = controlsDiv.querySelector('.download-log');
    const uploadBtn = controlsDiv.querySelector('.upload-log');
    const collapseBtn = controlsDiv.querySelector('.toolbar-collapse-btn');

    let filterTimeout;

    moduleSelect.addEventListener('change', async (e) => {
        currentFullLogText = '';
        clearRefresh();
        const selectedModule = e.target.value;
        await updateLogFiles(selectedModule, logfileSelect, logOutput, searchInput);
    });

    logfileSelect.addEventListener('change', async (e) => {
        currentFullLogText = '';
        clearRefresh();
        const selectedModule = moduleSelect.value;
        const selectedFile = logfileSelect.value;
        await updateLogContent(selectedModule, selectedFile, logOutput, searchInput);
        setRefreshTask(() =>
            updateLogContent(selectedModule, selectedFile, logOutput, searchInput)
        );
    });

    searchInput.addEventListener('input', () => {
        clearTimeout(filterTimeout);
        filterTimeout = setTimeout(() => {
            filterLogs(searchInput, logOutput);
        }, 150);
    });

    clearBtn.addEventListener('click', (e) => {
        searchInput.value = '';
        filterLogs(searchInput, logOutput);
        e.currentTarget.blur();
    });

    document.addEventListener('keydown', function (e) {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
            e.preventDefault();
            searchInput.focus();
            searchInput.select();
        }
    });

    downloadBtn.addEventListener('click', (e) => {
        const selectedModule = moduleSelect.value;
        const selectedFile = logfileSelect.value;
        if (!selectedModule || !selectedFile) {
            showToast('Select a module and log file first.', 'warn');
            e.currentTarget.blur();
            return;
        }
        const link = document.createElement('a');
        link.href = `/api/logs/${selectedModule}/${selectedFile}`;
        link.download = selectedFile;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        e.currentTarget.blur();
    });

    uploadBtn.addEventListener('click', (e) => {
        handleUploadLog({
            uploadBtn,
            moduleSelect,
            logfileSelect,
            currentFullLogText,
            showToast,
        });
        e.currentTarget.blur();
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

    _activeLogsDestroy = () => {
        clearRefresh();
        window.removeEventListener('resize', fitAddon?.fit);
        if (term) {
            term.dispose();
            term = null;
        }
        if (fitAddon) {
            fitAddon.dispose();
            fitAddon = null;
        }
    };
}

/* ============================
   Data Loaders
============================ */
async function loadModules(controlsDiv, logOutput) {
    const moduleSelect = controlsDiv.querySelector('.module-select');
    const logfileSelect = controlsDiv.querySelector('.logfile-select');
    const searchInput = controlsDiv.querySelector('.search-logs');
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
}

async function updateLogFiles(moduleName, logfileSelect, logOutput, searchInput) {
    logfileSelect.innerHTML = '<option value="">Select Log File</option>';
    logfileSelect.disabled = true;
    if (!moduleName) {
        renderToXTerm('', { forceClear: true, fileKey: null });
        return;
    }
    const files = await fetchLogFiles(moduleName);
    if (!files.length) {
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
        await updateLogContent(moduleName, defaultLog, logOutput, searchInput);
        setRefreshTask(() => updateLogContent(moduleName, defaultLog, logOutput, searchInput));
    }
}

async function updateLogContent(moduleName, fileName, logOutput, searchInput) {
    if (!moduleName || !fileName) {
        currentFullLogText = '';
        renderToXTerm('', { forceClear: true, fileKey: null });
        return;
    }
    try {
        const text = await fetchLogContent(moduleName, fileName);
        currentFullLogText = text;
        const searchValue = searchInput.value.trim();
        if (searchValue) filterLogs(searchInput, logOutput);
        else renderToXTerm(currentFullLogText, { fileKey: `${moduleName}/${fileName}` });
    } catch (e) {
        showToast('Failed to load log content.', 'error');
        renderToXTerm('', { forceClear: true, fileKey: null });
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

/* ============================
   Utility
============================ */
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
    if (opts.fileKey && opts.fileKey === lastRenderedFileKey && !opts.forceClear) {
        return;
    }
    lastRenderedFileKey = opts.fileKey || null;
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

/* ============================
   Upload Logic
============================ */
function handleUploadLog({
    uploadBtn,
    moduleSelect,
    logfileSelect,
    currentFullLogText,
    showToast,
}) {
    // Static variables for last upload
    handleUploadLog.lastUploadUrl = handleUploadLog.lastUploadUrl || null;
    handleUploadLog.lastUploadTime = handleUploadLog.lastUploadTime || 0;
    handleUploadLog.lastUploadData = handleUploadLog.lastUploadData || '';

    const selectedModule = moduleSelect.value;
    const selectedFile = logfileSelect.value;
    const isMobile = window.innerWidth <= 1000;

    if (!selectedModule || !selectedFile) {
        showToast('Select a module and log file first.', 'warn');
        return;
    }
    if (!currentFullLogText || !currentFullLogText.trim()) {
        showToast('No log content to upload.', 'warn');
        return;
    }

    // COPY if already uploaded this content
    if (handleUploadLog.lastUploadUrl && currentFullLogText === handleUploadLog.lastUploadData) {
        navigator.clipboard.writeText(handleUploadLog.lastUploadUrl).then(
            () => {
                showToast('Copied upload URL to clipboard.', 'success', 3000);
            },
            () => {
                showToast('Copy failed.', 'error');
            }
        );
        // Revert to Upload icon after copy
        if (isMobile) {
            uploadBtn.innerHTML = `${getIcon('mi:upload', {
                style: 'vertical-align:middle;',
            })} Upload`;
        } else {
            uploadBtn.innerHTML = `${getIcon('mi:upload', {
                style: 'vertical-align:middle;',
            })}<span class="btn-tooltip">Upload</span>`;
        }
        handleUploadLog.lastUploadUrl = null;
        handleUploadLog.lastUploadData = '';
        return;
    }

    // Prevent double upload of same log or too soon
    const now = Date.now();
    if (handleUploadLog.lastUploadTime && now - handleUploadLog.lastUploadTime < 60000) {
        showToast('You have already uploaded this log recently.', 'warn');
        return;
    }
    if (handleUploadLog.lastUploadData && currentFullLogText === handleUploadLog.lastUploadData) {
        showToast('You already uploaded this content.', 'info');
        return;
    }
    if (uploadBtn.disabled) return;

    uploadBtn.disabled = true;
    uploadBtn.classList.add('busy');

    fetch('https://dpaste.com/api/v2/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            content: currentFullLogText,
            syntax: 'text',
            expiry_days: '1',
        }),
    })
        .then(async (res) => {
            if (!res.ok) throw new Error('Upload failed');
            const dpasteUrl = await res.text();

            // Show Copy icon after upload
            if (isMobile) {
                uploadBtn.innerHTML = `${getIcon('mi:content_copy', {
                    style: 'vertical-align:middle;',
                })} Copy Link`;
            } else {
                uploadBtn.innerHTML = `${getIcon('mi:content_copy', {
                    style: 'vertical-align:middle;',
                })}<span class="btn-tooltip">Copy Link</span>`;
            }
            // Set these ASAP to prevent repeat uploads
            handleUploadLog.lastUploadUrl = dpasteUrl;
            handleUploadLog.lastUploadTime = now;
            handleUploadLog.lastUploadData = currentFullLogText;

            showToast(`Log uploaded`, 'success', 9000);
        })
        .catch(() => {
            showToast('Failed to upload log.', 'error');
        })
        .finally(() => {
            uploadBtn.disabled = false;
            uploadBtn.classList.remove('busy');
        });
}
