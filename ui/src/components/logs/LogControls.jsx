import React, { useState, useRef } from 'react';
import { getIcon } from '../../utils/tools';
import { humanize } from '../../utils/tools';
import LoadingSpinner from '../common/LoadingSpinner';
import TooltipFactory from '../Tooltip';

/**
 * LogControls Component
 *
 * Focused component for log filtering and control interface.
 * Separates control logic from display logic for better maintainability.
 *
 * @param {Object} props
 * @param {Array} props.modules - Available log modules
 * @param {Array} props.logFiles - Available log files for selected module
 * @param {string} props.selectedModule - Currently selected module
 * @param {string} props.selectedLogFile - Currently selected log file
 * @param {string} props.searchTerm - Current search term
 * @param {boolean} props.isCollapsed - Whether controls are collapsed
 * @param {Function} props.onModuleChange - Module selection handler
 * @param {Function} props.onLogFileChange - Log file selection handler
 * @param {Function} props.onSearchChange - Search term change handler
 * @param {Function} props.onClearSearch - Clear search handler
 * @param {Function} props.onDownload - Download log handler
 * @param {Function} props.onUpload - Upload log handler
 * @param {Function} props.onToggleCollapse - Collapse toggle handler
 * @param {Object} props.uploadState - Upload state for button display
 */
export default function LogControls({
    modules = [],
    logFiles = [],
    selectedModule = '',
    selectedLogFile = '',
    searchTerm = '',
    isCollapsed = false,
    onModuleChange,
    onLogFileChange,
    onSearchChange,
    onClearSearch,
    onDownload,
    onUpload,
    onToggleCollapse,
    uploadState = {},
}) {
    const uploadBtnRef = useRef(null);
    const [showUploadTip, setShowUploadTip] = useState(false);

    // Upload tooltip text based on state
    const uploadTooltipText = uploadState.uploading
        ? 'Uploading...'
        : uploadState.lastUrl
          ? uploadState.linkOpened
              ? 'Open upload link in new tab'
              : 'Click to open uploaded log link'
          : 'Upload log to dpaste';

    return (
        <div className={`log-controls log-toolbar ${isCollapsed ? 'collapsed' : ''}`}>
            <button
                type="button"
                className="toolbar-collapse-btn"
                onClick={onToggleCollapse}
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
                        onChange={e => onModuleChange(e.target.value)}
                    >
                        <option value="">Select Module</option>
                        {modules.map(module => (
                            <option key={module} value={module}>
                                {humanize?.(module) || module}
                            </option>
                        ))}
                    </select>

                    <select
                        className="select logfile-select"
                        disabled={!logFiles.length}
                        value={selectedLogFile}
                        onChange={e => onLogFileChange(e.target.value)}
                    >
                        <option value="">Select Log File</option>
                        {logFiles.map(file => (
                            <option key={file} value={file}>
                                {file}
                            </option>
                        ))}
                    </select>

                    <input
                        className="input search-logs"
                        type="text"
                        placeholder="Search logs..."
                        value={searchTerm}
                        onChange={e => onSearchChange(e.target.value)}
                    />

                    <div className="btn-row" style={{ marginLeft: '1rem' }}>
                        <button
                            type="button"
                            className="btn--icon clear-search"
                            onClick={onClearSearch}
                            title="Clear search"
                            aria-label="Clear search"
                        >
                            {getIcon('mi:cancel', { style: { verticalAlign: 'middle' } })}
                        </button>

                        <button
                            type="button"
                            className="btn--icon download-log"
                            onClick={onDownload}
                            title="Download log"
                            aria-label="Download log"
                        >
                            {getIcon('mi:download', { style: { verticalAlign: 'middle' } })}
                        </button>

                        <button
                            type="button"
                            className="btn--icon upload-log"
                            onClick={onUpload}
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
                                <LoadingSpinner size="small" style={{ verticalAlign: 'middle' }} />
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
    );
}
