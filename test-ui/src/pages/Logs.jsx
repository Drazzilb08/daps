import React, { useState, useEffect, useRef } from 'react';
import { useLogModules } from '../hooks/useLogModules.js';
import { useLogFiles } from '../hooks/useLogFiles.js';
import { useLogContent } from '../hooks/useLogContent.js';
import { useLogPolling } from '../hooks/useLogPolling.js';
import { LogControls } from '../components/logs/controls/LogControls.jsx';
import { LogOutput } from '../components/logs/components/LogOutput.jsx';
import { logsAPI } from '../utils/api/logs.js';

/**
 * Logs Page - Log viewer with real-time updates
 *
 * Provides comprehensive log viewing interface with:
 * - Module and file selection
 * - Real-time content updates (1s polling)
 * - Search and highlighting
 * - Download and upload capabilities
 * - Keyboard shortcuts (Ctrl/Cmd+F for search)
 */
export default function Logs() {
    // Data hooks
    const { modules } = useLogModules();
    const [selectedModule, setSelectedModule] = useState('');
    const { logFiles, selectedLogFile, setSelectedLogFile } = useLogFiles(selectedModule);
    const { logText, refresh } = useLogContent(selectedModule, selectedLogFile);
    useLogPolling(selectedModule, selectedLogFile, refresh);

    // Search state
    const [searchTerm, setSearchTerm] = useState('');

    // Refs for keyboard shortcuts
    const searchInputRef = useRef(null);

    // Download handler
    const handleDownload = () => {
        if (!selectedModule || !selectedLogFile) {
            console.warn('Select a module and log file first');
            return;
        }

        const link = document.createElement('a');
        link.href = logsAPI.getLogDownloadUrl(selectedModule, selectedLogFile);
        link.download = selectedLogFile;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Upload handler (delegated to ActionButtons via useUploadState)
    const handleUpload = async () => {
        if (!selectedModule || !selectedLogFile) {
            throw new Error('Select a module and log file first');
        }
        if (!logText || !logText.trim()) {
            throw new Error('No log content to upload');
        }

        return await logsAPI.uploadLogToPaste(logText);
    };

    // Keyboard shortcuts (Ctrl/Cmd+F)
    useEffect(() => {
        function handleKeyDown(e) {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
                e.preventDefault();
                if (searchInputRef.current) {
                    searchInputRef.current.focus();
                    searchInputRef.current.select();
                }
            }
        }

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <div className="flex flex-col h-full">
            <LogControls
                modules={modules}
                logFiles={logFiles}
                selectedModule={selectedModule}
                selectedLogFile={selectedLogFile}
                searchTerm={searchTerm}
                logText={logText}
                searchInputRef={searchInputRef}
                onModuleChange={setSelectedModule}
                onLogFileChange={setSelectedLogFile}
                onSearchChange={setSearchTerm}
                onDownload={handleDownload}
                onUpload={handleUpload}
            />
            <LogOutput logText={logText} searchTerm={searchTerm} />
        </div>
    );
}
