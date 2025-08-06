// src/components/poster_management/GDriveAdhocContent.jsx

import React, { useRef, useState } from 'react';
import ProgressBar from '../ProgressBar';
import TooltipFactory from '../Tooltip';

export default function GDriveAdhocContent({
    items = [],
    selected = [],
    loading = false,
    pillProgress = {}, // <-- { [name]: { progress, status, error } }
    onToggleSelect,
    onRun,
}) {
    // Tooltip for the Run button
    const [runTip, setRunTip] = useState(false);
    const runBtnRef = useRef(null);

    // Compute if any selected pill is running
    // const anyRunning = selected.some(n => pillProgress[n]?.status === 'running');

    // Only allow run if any selected pills are NOT running/success
    const runDisabled =
        !selected.some(
            n =>
                !pillProgress[n] ||
                (pillProgress[n].status !== 'running' && pillProgress[n].status !== 'success')
        ) || loading;

    return (
        <>
            <div className="gdrive-pill-list">
                {items.map(item => {
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
                                onChange={() => !loading && !isRunning && onToggleSelect(item.name)}
                                aria-label={`Select ${item.name}`}
                                disabled={loading || isRunning}
                            />
                            <div className="gdrive-pill-content">
                                <span className="gdrive-pill-name">{item.name}</span>
                                <span className="gdrive-pill-path" title={item.location}>
                                    {item.location}
                                </span>
                                {/* Per-pill Progress Bar */}
                                {(pill.progress != null || pill.status === 'running') && (
                                    <ProgressBar
                                        value={pill.progress}
                                        active={pill.status === 'running' && pill.progress == null}
                                        className="gdrive-pill-progress"
                                    />
                                )}
                                {pill.status === 'success' && (
                                    <span className="gdrive-pill-complete">✅ Complete</span>
                                )}
                                {pill.status === 'error' && (
                                    <span className="gdrive-pill-error">
                                        ❌ {pill.error || 'Failed'}
                                        <button
                                            className="btn btn--icon btn--retry"
                                            title="Retry"
                                            aria-label="Retry failed sync"
                                            onClick={e => {
                                                e.stopPropagation();
                                                onRun([item.name]);
                                            }}
                                            disabled={loading}
                                        >
                                            <span className="material-icons">refresh</span>
                                        </button>
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
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
