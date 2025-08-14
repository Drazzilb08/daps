import React, { useState, useEffect, useRef, useCallback } from 'react';
import { fetchLogFiles, fetchLogContent, fetchLogModules } from '../utils/api';
import { humanize, getIcon } from '../utils/tools';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { moduleOrder } from '../utils/constants/constants';
import { useToast } from '../components/providers/ToastProvider';
import TooltipFactory from '../components/Tooltip';
import '../css/pages/logs.css';

export default function LogViewer() {
    const [modules, setModules] = useState([]);
    const [selectedModule, setSelectedModule] = useState('');
    const [logFiles, setLogFiles] = useState([]);
    const [selectedLogFile, setSelectedLogFile] = useState('');
    const [logText, setLogText] = useState('');
    const [filteredHtml, setFilteredHtml] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [uploadState, setUploadState] = useState({
        lastUrl: null,
        lastData: '',
        lastTime: 0,
        uploading: false,
        linkOpened: false,
    });

    const refreshIntervalRef = useRef(null);
    const searchTimeoutRef = useRef(null);
    const uploadBtnRef = useRef(null);
    const [showUploadTip, setShowUploadTip] = useState(false);

    // --- Use Toast ---
    const toast = useToast();

    // Render filtered or full logs html based on search term
    const renderLogHtml = useCallback(() => {
        function escapeRegex(text) {
            return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        }

        function highlightMatches(text, searchRegex) {
            if (!searchRegex) return text;
            const parts = text.split(searchRegex);
            for (let i = 1; i < parts.length; i += 2) {
                parts[i] = `<span class="log-highlight">${parts[i]}</span>`;
            }
            return parts.join('');
        }

        function highlightLineComponents(line, searchRegex) {
            let escaped = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

            const quotedMatches = [];
            escaped = escaped.replace(/(['"])(.*?)\1/g, match => {
                const highlighted = highlightMatches(
                    `<span class="log-quoted">${match}</span>`,
                    searchRegex
                );
                quotedMatches.push(highlighted);
                return `__QUOTED_PLACEHOLDER_${quotedMatches.length - 1}__`;
            });

            escaped = escaped.replace(
                /\b\d{2}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2} (?:AM|PM)\b/g,
                match => highlightMatches(`<span class="log-datetime">${match}</span>`, searchRegex)
            );

            escaped = escaped.replace(/\b(CRITICAL|ERROR|WARNING|INFO|DEBUG)\b/g, match =>
                highlightMatches(
                    `<span class="log-ansi-${match.toLowerCase()}">${match}</span>`,
                    searchRegex
                )
            );

            escaped = escaped.replace(/\b[\w_]+(\.[\w_]+)+\b/g, match =>
                highlightMatches(`<span class="log-filename">${match}</span>`, searchRegex)
            );

            escaped = escaped.replace(/\b\d+(\.\d+)?\b/g, match =>
                highlightMatches(`<span class="log-number">${match}</span>`, searchRegex)
            );

            quotedMatches.forEach((highlighted, idx) => {
                escaped = escaped.replace(`__QUOTED_PLACEHOLDER_${idx}__`, highlighted);
            });

            return escaped;
        }

        function parseLogBlocks(rawText) {
            const lines = rawText.split('\n');
            const blocks = [];
            let currentBlock = null;

            lines.forEach(line => {
                const levelClass = (() => {
                    if (line.includes('CRITICAL')) return 'log-ansi-critical';
                    if (line.includes('ERROR')) return 'log-ansi-error';
                    if (line.includes('WARNING')) return 'log-ansi-warning';
                    if (line.includes('INFO')) return 'log-ansi-info';
                    if (line.includes('DEBUG')) return 'log-ansi-debug';
                    return '';
                })();

                if (levelClass) {
                    if (currentBlock) blocks.push(currentBlock);
                    currentBlock = { lines: [line], levelClass };
                } else {
                    if (currentBlock) {
                        currentBlock.lines.push(line);
                    } else {
                        currentBlock = { lines: [line], levelClass: '' };
                    }
                }
            });
            if (currentBlock) blocks.push(currentBlock);
            return blocks;
        }

        function renderBlocksToHtml(blocks, search) {
            if (!blocks.length) {
                return `<div class="log-limited-line">No logs available.</div>`;
            }

            const escapedSearch = escapeRegex(search);
            const searchRegex = search ? new RegExp(`(${escapedSearch})`, 'gi') : null;

            return blocks
                .map(({ lines }) => {
                    const renderedLines = lines
                        .map(line => `<div>${highlightLineComponents(line, searchRegex)}</div>`)
                        .join('\n');
                    return `<div>${renderedLines}</div>`;
                })
                .join('\n');
        }

        if (!logText) return '';
        const blocks = parseLogBlocks(logText);
        const filtered = searchTerm.trim().toLowerCase();

        if (!filtered) {
            return renderBlocksToHtml(blocks, '');
        }
        const filteredBlocks = blocks.filter(({ lines }) =>
            lines.some(line => line.toLowerCase().includes(filtered))
        );
        return renderBlocksToHtml(filteredBlocks, filtered);
    }, [logText, searchTerm]);

    // Load modules on mount
    useEffect(() => {
        async function loadModules() {
            try {
                const availableModules = await fetchLogModules();
                const ordered = (moduleOrder || [])
                    .filter(m => availableModules.includes(m))
                    .concat(availableModules.filter(m => !(moduleOrder || []).includes(m)));
                setModules(ordered);
            } catch {
                toast('Failed to fetch log modules.', 'error');
            }
        }
        loadModules();
    }, [toast]);

    // Load files when module changes
    useEffect(() => {
        async function loadFiles() {
            if (!selectedModule) {
                setLogFiles([]);
                setSelectedLogFile('');
                setLogText('');
                return;
            }
            try {
                const files = await fetchLogFiles(selectedModule);
                setLogFiles(files);
                const defaultLog = files.find(f => f === `${selectedModule}.log`) || '';
                setSelectedLogFile(defaultLog);
            } catch {
                toast('Failed to fetch log files.', 'error');
                setLogFiles([]);
                setSelectedLogFile('');
                setLogText('');
            }
        }
        loadFiles();
    }, [selectedModule, toast]);

    // Load content when file changes
    useEffect(() => {
        async function loadContent() {
            if (!selectedModule || !selectedLogFile) {
                setLogText('');
                return;
            }
            try {
                const content = await fetchLogContent(selectedModule, selectedLogFile);
                setLogText(content);
            } catch {
                toast('Failed to load log content.', 'error');
                setLogText('');
            }
        }
        loadContent();
    }, [selectedModule, selectedLogFile, toast]);

    // Auto-refresh log content every 1s when module & file selected
    useEffect(() => {
        if (!selectedModule || !selectedLogFile) return;
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = setInterval(() => {
            fetchLogContent(selectedModule, selectedLogFile)
                .then(setLogText)
                .catch(() => {
                    toast('Failed to refresh log.', 'error');
                });
        }, 1000);
        return () => clearInterval(refreshIntervalRef.current);
    }, [selectedModule, selectedLogFile, toast]);

    // Update filtered HTML when logText or searchTerm changes (debounced)
    useEffect(() => {
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = setTimeout(() => {
            setFilteredHtml(renderLogHtml());
        }, 150);
        return () => clearTimeout(searchTimeoutRef.current);
    }, [searchTerm, renderLogHtml]);

    // Tooltip logic for upload
    const uploadTooltipText = uploadState.uploading
        ? 'Uploading...'
        : uploadState.lastUrl
          ? uploadState.linkOpened
              ? 'Open upload link in new tab'
              : 'Click to open uploaded log link'
          : 'Upload log to dpaste';

    // Upload logic (3-click system)
    async function handleUpload() {
        if (uploadState.uploading) return;
        if (!selectedModule || !selectedLogFile) {
            toast('Select a module and log file first.', 'warn');
            return;
        }
        if (!logText || !logText.trim()) {
            toast('No log content to upload.', 'warn');
            return;
        }
        const now = Date.now();

        if (uploadState.lastUrl && !uploadState.linkOpened && logText === uploadState.lastData) {
            window.open(uploadState.lastUrl, '_blank');
            setUploadState(s => ({ ...s, linkOpened: true }));
            return;
        }
        if (uploadState.lastUrl && uploadState.linkOpened && logText === uploadState.lastData) {
            try {
                await navigator.clipboard.writeText(uploadState.lastUrl);
                toast('Copied upload URL to clipboard.', 'success', 3000);
            } catch {
                toast('Copy failed.', 'error');
            }
            setUploadState({
                lastUrl: null,
                lastData: '',
                lastTime: 0,
                uploading: false,
                linkOpened: false,
            });
            return;
        }
        if (
            uploadState.lastTime &&
            now - uploadState.lastTime < 60000 &&
            logText === uploadState.lastData
        ) {
            toast('You have already uploaded this log recently.', 'warn');
            return;
        }

        setUploadState(s => ({ ...s, uploading: true, linkOpened: false }));
        try {
            const res = await fetch('https://dpaste.com/api/v2/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    content: logText,
                    syntax: 'text',
                    expiry_days: '1',
                }),
            });
            if (!res.ok) throw new Error('Upload failed');
            const dpasteUrl = await res.text();
            setUploadState({
                lastUrl: dpasteUrl,
                lastData: logText,
                lastTime: now,
                uploading: false,
                linkOpened: false,
            });
            toast(`Log uploaded`, 'success', 9000);
        } catch {
            toast('Failed to upload log.', 'error');
            setUploadState(s => ({ ...s, uploading: false }));
        }
    }

    function clearSearch() {
        setSearchTerm('');
    }

    function handleDownload() {
        if (!selectedModule || !selectedLogFile) {
            toast('Select a module and log file first.', 'warn');
            return;
        }
        const link = document.createElement('a');
        link.href = `/api/logs/${selectedModule}/${selectedLogFile}`;
        link.download = selectedLogFile;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    function toggleCollapse() {
        setIsCollapsed(c => !c);
    }

    useEffect(() => {
        function onKeyDown(e) {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
                e.preventDefault();
                const el = document.querySelector('.search-logs');
                if (el) {
                    el.focus();
                    el.select();
                }
            }
        }
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, []);

    return (
        <div
            className="logs-card page-card"
            style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
        >
            <div
                className="logs-card-content"
                style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}
            >
                <div className={`log-controls log-toolbar ${isCollapsed ? 'collapsed' : ''}`}>
                    <button
                        type="button"
                        className="toolbar-collapse-btn"
                        onClick={toggleCollapse}
                        aria-expanded={!isCollapsed}
                        aria-controls="log-controls"
                    >
                        <span className="toolbar-collapse-icon">{isCollapsed ? '▸' : '▾'}</span>
                        {isCollapsed ? ' Show Controls' : ' Hide Controls'}
                    </button>

                    {!isCollapsed && (
                        <>
                            <select
                                className="select module-select"
                                value={selectedModule}
                                onChange={e => setSelectedModule(e.target.value)}
                            >
                                <option value="">Select Module</option>
                                {modules.map(m => (
                                    <option key={m} value={m}>
                                        {humanize?.(m) || m}
                                    </option>
                                ))}
                            </select>

                            <select
                                className="select logfile-select"
                                disabled={!logFiles.length}
                                value={selectedLogFile}
                                onChange={e => setSelectedLogFile(e.target.value)}
                            >
                                <option value="">Select Log File</option>
                                {logFiles.map(f => (
                                    <option key={f} value={f}>
                                        {f}
                                    </option>
                                ))}
                            </select>

                            <input
                                className="input search-logs"
                                type="text"
                                placeholder="Search logs..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />

                            <div className="btn-row" style={{ marginLeft: '1rem' }}>
                                <button
                                    type="button"
                                    className="btn--icon clear-search"
                                    onClick={clearSearch}
                                    title="Clear search"
                                    aria-label="Clear search"
                                >
                                    {getIcon('mi:cancel', { style: { verticalAlign: 'middle' } })}
                                </button>

                                <button
                                    type="button"
                                    className="btn--icon download-log"
                                    onClick={handleDownload}
                                    title="Download log"
                                    aria-label="Download log"
                                >
                                    {getIcon('mi:download', { style: { verticalAlign: 'middle' } })}
                                </button>

                                <button
                                    type="button"
                                    className="btn--icon upload-log"
                                    onClick={handleUpload}
                                    title={uploadTooltipText}
                                    aria-label={uploadTooltipText}
                                    disabled={uploadState.uploading}
                                    ref={uploadBtnRef}
                                    onMouseEnter={() => setShowUploadTip(true)}
                                    onMouseLeave={() => setShowUploadTip(false)}
                                    onFocus={() => setShowUploadTip(true)}
                                    onBlur={() => setShowUploadTip(false)}
                                >
                                    {uploadState.uploading ? (
                                        <LoadingSpinner
                                            size="small"
                                            style={{ verticalAlign: 'middle' }}
                                        />
                                    ) : uploadState.lastUrl ? (
                                        uploadState.linkOpened ? (
                                            getIcon('mi:open_in_new', {
                                                style: { verticalAlign: 'middle' },
                                            })
                                        ) : (
                                            getIcon('mi:link', {
                                                style: { verticalAlign: 'middle' },
                                            })
                                        )
                                    ) : (
                                        getIcon('mi:upload', {
                                            style: { verticalAlign: 'middle' },
                                        })
                                    )}
                                </button>
                                <TooltipFactory
                                    anchor={uploadBtnRef.current}
                                    text={uploadTooltipText}
                                    show={showUploadTip}
                                />
                            </div>
                        </>
                    )}
                </div>

                <div
                    id="log-output"
                    className="log-output"
                    style={{
                        flex: 1,
                        overflowY: 'auto',
                        fontFamily: 'monospace',
                        whiteSpace: 'pre-wrap',
                    }}
                    dangerouslySetInnerHTML={{ __html: filteredHtml || '' }}
                />
            </div>
        </div>
    );
}
