// src/components/poster_management/GDriveAdhocContent.jsx
import React, { useRef, useState, useMemo } from 'react';
import ProgressBar from '../ProgressBar';
import TooltipFactory from '../Tooltip';
import { getIcon } from '../../utils/tools';

export default function GDriveAdhocContent({
    items = [],
    selected = [],
    pillProgress = {},
    onToggleSelect,
    onRun,
    onRetry,
}) {
    // Search/filter state
    const [filter, setFilter] = useState('');

    // Tooltip for the Run button
    const [runTip, setRunTip] = useState(false);
    const runBtnRef = useRef(null);

    // Tooltip refs for retry buttons
    const retryRefs = useRef({});

    // Filtered & grouped items for rendering
    const filteredItems = useMemo(() => {
        if (!filter.trim()) return items;
        const lower = filter.trim().toLowerCase();
        return items.filter(
            item =>
                item.name.toLowerCase().includes(lower) ||
                (item.location && item.location.toLowerCase().includes(lower))
        );
    }, [items, filter]);

    // For highlighting matching text in the name/path
    const highlightText = (text, query) => {
        if (!query) return text;
        const idx = text.toLowerCase().indexOf(query.toLowerCase());
        if (idx === -1) return text;
        return (
            <>
                {text.slice(0, idx)}
                <span className="gdrive-pill-highlight">{text.slice(idx, idx + query.length)}</span>
                {text.slice(idx + query.length)}
            </>
        );
    };

    // Check if any selected drives are currently running
    const hasRunningSelectedDrives = selected.some(n => pillProgress[n]?.status === 'running');

    // Only allow run if we have selected drives and none are currently running
    const runDisabled = selected.length === 0 || hasRunningSelectedDrives;

    // Get status display text
    const getStatusText = pill => {
        switch (pill.status) {
            case 'running':
                if (pill.progress != null) {
                    return `Running... ${pill.progress}%`;
                }
                return 'Running...';
            case 'success':
                return 'Completed!';
            case 'error':
                return pill.error || 'Failed';
            default:
                return '';
        }
    };

    // Get pill CSS classes
    const getPillClasses = (checked, pill) => {
        let classes = 'gdrive-pill';

        if (checked) classes += ' checked';
        if (pill.status === 'running') classes += ' running disabled';
        else if (pill.status === 'success') classes += ' success';
        else if (pill.status === 'error') classes += ' error';

        return classes;
    };

    return (
        <>
            <div className="gdrive-pill-header">
                <input
                    type="search"
                    className="gdrive-pill-search"
                    placeholder="Filter by name or path…"
                    value={filter}
                    onChange={e => setFilter(e.target.value)}
                    autoComplete="off"
                    aria-label="Filter drives"
                />
                <div className="gdrive-pill-summary">
                    {selected.length > 0 && (
                        <span className="selected-count">{selected.length} selected</span>
                    )}
                    {hasRunningSelectedDrives && (
                        <span className="running-count">
                            {selected.filter(n => pillProgress[n]?.status === 'running').length}{' '}
                            running
                        </span>
                    )}
                </div>
            </div>
            <div className="gdrive-pill-list">
                {filteredItems.length === 0 ? (
                    <div className="gdrive-pill-empty">No matching drives.</div>
                ) : (
                    filteredItems.map(item => {
                        const checked = selected.includes(item.name);
                        const pill = pillProgress[item.name] || {};

                        const isRunning = pill.status === 'running';
                        const isSuccess = pill.status === 'success';
                        const isError = pill.status === 'error';

                        // Only disable the pill itself if it's running
                        const pillDisabled = isRunning;

                        const statusText = getStatusText(pill);

                        return (
                            <div
                                className={getPillClasses(checked, pill)}
                                tabIndex={pillDisabled ? -1 : 0}
                                role="button"
                                aria-pressed={checked}
                                key={item.name}
                                onClick={e => {
                                    if (!pillDisabled && e.target.type !== 'checkbox') {
                                        onToggleSelect(item.name);
                                    }
                                }}
                                onKeyDown={e =>
                                    (e.key === ' ' || e.key === 'Enter') &&
                                    !pillDisabled &&
                                    onToggleSelect(item.name)
                                }
                                aria-disabled={pillDisabled}
                            >
                                <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => !pillDisabled && onToggleSelect(item.name)}
                                    aria-label={`Select ${item.name}`}
                                    disabled={pillDisabled}
                                />
                                <div className="gdrive-pill-content">
                                    <div className="gdrive-pill-info">
                                        <span className="gdrive-pill-name">
                                            {highlightText(item.name, filter)}
                                        </span>
                                        <span className="gdrive-pill-path" title={item.location}>
                                            {highlightText(item.location, filter)}
                                        </span>
                                    </div>

                                    {/* Status and Progress Section */}
                                    {(pill.status || pill.progress != null) && (
                                        <div className="gdrive-pill-status">
                                            {statusText && (
                                                <span className="gdrive-pill-status-text">
                                                    {statusText}
                                                </span>
                                            )}
                                            <div className="progress-bar-divider" />
                                            <ProgressBar
                                                value={pill.progress}
                                                active={isRunning && pill.progress == null}
                                                done={isSuccess}
                                                error={isError}
                                                tooltip={statusText}
                                                className="gdrive-pill-progress"
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Action buttons */}
                                <div className="gdrive-pill-actions">
                                    {/* Retry button for failed jobs */}
                                    {isError && onRetry && (
                                        <>
                                            <button
                                                ref={el => (retryRefs.current[item.name] = el)}
                                                className="gdrive-pill-retry"
                                                onClick={e => {
                                                    e.stopPropagation();
                                                    onRetry(item.name);
                                                }}
                                                aria-label={`Retry sync for ${item.name}`}
                                                title={`Retry sync for ${item.name}`}
                                            >
                                                {getIcon('mi:refresh')}
                                            </button>
                                            <TooltipFactory
                                                anchor={retryRefs.current[item.name]}
                                                text={`Retry failed sync for ${item.name}`}
                                                show={false} // Will show on hover via CSS
                                                position="top"
                                            />
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            <div className="gdrive-card-actions">
                <button
                    ref={runBtnRef}
                    className="btn btn--success gdrive-card-run-btn"
                    disabled={runDisabled}
                    onClick={onRun}
                    onMouseEnter={() => setRunTip(true)}
                    onMouseLeave={() => setRunTip(false)}
                    onFocus={() => setRunTip(true)}
                    onBlur={() => setRunTip(false)}
                >
                    {selected.length === 0
                        ? 'Select drives to sync'
                        : hasRunningSelectedDrives
                          ? `Running sync (${selected.filter(n => pillProgress[n]?.status === 'running').length})`
                          : `Run Sync (${selected.length})`}
                </button>
                <TooltipFactory
                    anchor={runBtnRef.current}
                    text={
                        selected.length === 0
                            ? 'Select one or more drives to sync'
                            : hasRunningSelectedDrives
                              ? 'Wait for current syncs to complete'
                              : `Run sync for ${selected.length} selected drive${selected.length > 1 ? 's' : ''}`
                    }
                    show={runTip}
                    position="top"
                />
            </div>
        </>
    );
}
