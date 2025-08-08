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
}) {
    // Search/filter state
    const [filter, setFilter] = useState('');

    // Tooltip for the Run button
    const [runTip, setRunTip] = useState(false);
    const runBtnRef = useRef(null);

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

    // Only allow run if any selected pills are NOT running/success
    const runDisabled =
        selected.length === 0 ||
        !selected.some(
            n =>
                !pillProgress[n] ||
                (pillProgress[n].status !== 'running' && pillProgress[n].status !== 'success')
        );

    // Get status display text
    const getStatusText = pill => {
        switch (pill.status) {
            case 'running':
                return 'Running...';
            case 'success':
                return 'Completed!';
            case 'error':
                return pill.error || 'Failed';
            default:
                return '';
        }
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
                        const pillDisabled = isRunning;

                        const statusText = getStatusText(pill);

                        return (
                            <div
                                className={
                                    'gdrive-pill' +
                                    (checked ? ' checked' : '') +
                                    (pillDisabled ? ' disabled' : '') +
                                    (isRunning ? ' running' : '') +
                                    (isSuccess ? ' success' : '') +
                                    (isError ? ' error' : '')
                                }
                                tabIndex={0}
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
                                    {(pill.progress != null || pillDisabled) && (
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
                                    {isError && (
                                        <button
                                            className="gdrive-pill-retry"
                                            title="Retry this sync"
                                            onClick={e => {
                                                e.stopPropagation();
                                                // Add to selected and trigger run
                                                if (!checked) onToggleSelect(item.name);
                                            }}
                                            aria-label={`Retry sync for ${item.name}`}
                                        >
                                            {getIcon('mi:refresh')}
                                        </button>
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
                        : `Run Sync (${selected.length})`}
                </button>
                <TooltipFactory
                    anchor={runBtnRef.current}
                    text={
                        selected.length === 0
                            ? 'Select one or more drives to sync'
                            : `Run sync for ${selected.length} selected drive${selected.length > 1 ? 's' : ''}`
                    }
                    show={runTip}
                    position="top"
                />
            </div>
        </>
    );
}
