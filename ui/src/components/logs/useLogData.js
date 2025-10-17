import { useState, useEffect, useRef, useCallback } from 'react';
import {
    fetchLogFiles,
    fetchLogContent,
    fetchLogModules,
    uploadLogToPaste,
    getLogDownloadUrl,
} from '../../utils/api';
import { moduleOrder } from '../../utils/constants/constants';

/**
 * useLogData Hook
 *
 * Custom hook to manage all log-related data operations.
 * Separates data fetching and state management from UI components.
 *
 * @param {Function} toast - Toast notification function
 * @returns {Object} Log data state and actions
 */
export function useLogData(toast) {
    // Module and file state
    const [modules, setModules] = useState([]);
    const [selectedModule, setSelectedModule] = useState('');
    const [logFiles, setLogFiles] = useState([]);
    const [selectedLogFile, setSelectedLogFile] = useState('');
    const [logText, setLogText] = useState('');

    // Upload state
    const [uploadState, setUploadState] = useState({
        lastUrl: null,
        lastData: '',
        lastTime: 0,
        uploading: false,
        linkOpened: false,
    });

    // Refs for cleanup
    const refreshIntervalRef = useRef(null);

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

    // Upload handler with 3-click system
    const handleUpload = useCallback(async () => {
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

        // First click: open uploaded link
        if (uploadState.lastUrl && !uploadState.linkOpened && logText === uploadState.lastData) {
            window.open(uploadState.lastUrl, '_blank');
            setUploadState(s => ({ ...s, linkOpened: true }));
            return;
        }

        // Second click: copy URL to clipboard
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

        // Prevent duplicate uploads
        if (
            uploadState.lastTime &&
            now - uploadState.lastTime < 60000 &&
            logText === uploadState.lastData
        ) {
            toast('You have already uploaded this log recently.', 'warn');
            return;
        }

        // Upload new log
        setUploadState(s => ({ ...s, uploading: true, linkOpened: false }));
        try {
            const result = await uploadLogToPaste(logText);
            setUploadState({
                lastUrl: result.url,
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
    }, [uploadState, selectedModule, selectedLogFile, logText, toast]);

    // Download handler
    const handleDownload = useCallback(() => {
        if (!selectedModule || !selectedLogFile) {
            toast('Select a module and log file first.', 'warn');
            return;
        }
        const link = document.createElement('a');
        link.href = getLogDownloadUrl(selectedModule, selectedLogFile);
        link.download = selectedLogFile;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, [selectedModule, selectedLogFile, toast]);

    return {
        // State
        modules,
        selectedModule,
        logFiles,
        selectedLogFile,
        logText,
        uploadState,

        // Actions
        setSelectedModule,
        setSelectedLogFile,
        handleUpload,
        handleDownload,
    };
}
