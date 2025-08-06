// src/components/poster_management/GDriveAdhocContent.jsx

import React, { useRef, useState, useMemo } from 'react';
import ProgressBar from '../ProgressBar';
import TooltipFactory from '../Tooltip';
import {getIcon} from '../../utils/tools';

export default function GDriveAdhocContent({
    items = [],
    selected = [],
    loading = false,
    pillProgress = {}, // { [name]: { progress, status, error } }
    onToggleSelect,
    onRun,
    // onCancel,
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
        !selected.some(
            n =>
                !pillProgress[n] ||
                (pillProgress[n].status !== 'running' && pillProgress[n].status !== 'success')
        ) || loading;

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
                        return (
                            <div
                                className={
                                    'gdrive-pill' +
                                    (checked ? ' checked' : '') +
                                    (loading || isRunning ? ' disabled' : '') +
                                    (isRunning ? ' running' : '') +
                                    (isSuccess ? ' success' : '') +
                                    (isError ? ' error' : '')
                                }
                                tabIndex={0}
                                role="button"
                                aria-pressed={checked}
                                key={item.name}
                                onClick={e => {
                                    if (!loading && !isRunning && e.target.type !== 'checkbox') {
                                        onToggleSelect(item.name);
                                    }
                                }}
                                onKeyDown={e =>
                                    (e.key === ' ' || e.key === 'Enter') &&
                                    !loading &&
                                    !isRunning &&
                                    onToggleSelect(item.name)
                                }
                                aria-disabled={loading || isRunning}
                            >
                                <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() =>
                                        !loading && !isRunning && onToggleSelect(item.name)
                                    }
                                    aria-label={`Select ${item.name}`}
                                    disabled={loading || isRunning}
                                />
                                <div className="gdrive-pill-content">
                                    <span className="gdrive-pill-name">
                                        {highlightText(item.name, filter)}
                                    </span>
                                    <span className="gdrive-pill-path" title={item.location}>
                                        {highlightText(item.location, filter)}
                                    </span>
                                    {/* Divider before progress */}
                                    <div className="progress-bar-divider" />
                                    {(pill.progress != null || pill.status === 'running' || pill.status === 'success' || pill.status === 'error') && (
                                        <ProgressBar
                                            value={pill.progress}
                                            active={pill.status === 'running' && pill.progress == null}
                                            done={pill.status === 'success'}
                                            error={pill.status === 'error'}
                                            tooltip={
                                                pill.status === 'running' ? 'Syncing...' :
                                                pill.status === 'success' ? 'Completed!' :
                                                pill.status === 'error' ? 'Failed' : ''
                                            }
                                            className="gdrive-pill-progress"
                                        />
                                    )}
                                </div>
                                {/* Example: cancel action button (future use) */}
                                {isRunning && (
                                    <button
                                        className="gdrive-pill-cancel"
                                        title="Cancel"
                                        style={{
                                            marginLeft: 'auto',
                                            background: 'none',
                                            border: 'none',
                                            color: '#f66',
                                            fontSize: '1.3em',
                                            cursor: 'pointer',
                                            opacity: 0.82,
                                        }}
                                        // onClick={e => {
                                        //     e.stopPropagation();
                                        //     if (onCancel) onCancel(item.name);
                                        // }}
                                        aria-label={`Cancel sync for ${item.name}`}
                                    >
                                        {getIcon("mi:cancel")}
                                    </button>
                                )}
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
                    {loading ? 'Running...' : 'Run Sync'}
                </button>
                <TooltipFactory
                    anchor={runBtnRef.current}
                    text="Run sync for selected items"
                    show={runTip}
                    position="top"
                />
            </div>
        </>
    );
}