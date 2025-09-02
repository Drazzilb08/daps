import React, { useRef, useState } from 'react';
import { getIcon } from '../../utils/tools';
import LoadingSpinner from '../common/LoadingSpinner';
import TooltipFactory from '../Tooltip';

export default function MatchedPostersContent({ data, loading, error, refresh }) {
    const [refreshTip, setRefreshTip] = useState(false);
    const refreshRef = useRef(null);
    const totalMatched = (data ?? []).reduce((sum, s) => sum + (s.overall_matched ?? 0), 0);
    const total = (data ?? []).reduce((sum, s) => sum + (s.overall_total ?? 0), 0);
    return (
        <>
            <div className="control-row">
                <span className="control-label">{getIcon('mi:equalizer')} Analytics by Owner</span>
                <button
                    ref={refreshRef}
                    className="btn--icon stat-card-refresh"
                    title="Refresh"
                    onClick={refresh}
                    disabled={loading}
                    onMouseEnter={() => setRefreshTip(true)}
                    onMouseLeave={() => setRefreshTip(false)}
                    onFocus={() => setRefreshTip(true)}
                    onBlur={() => setRefreshTip(false)}
                >
                    {loading ? <LoadingSpinner size="small" /> : getIcon('mi:refresh')}
                </button>
                <TooltipFactory
                    anchor={refreshRef.current}
                    text="Refresh Matched Statistics"
                    show={refreshTip}
                    position="top"
                />
            </div>
            {loading ? (
                <div className="stats-loading">
                    <LoadingSpinner />
                </div>
            ) : error ? (
                <div className="stats-error">{error}</div>
            ) : !(data ?? []).length ? (
                <div className="empty-state">
                    <span role="img" aria-label="empty" className="empty-icon">
                        📭
                    </span>
                    No data.
                </div>
            ) : (
                <table className="stats-table">
                    <thead>
                        <tr>
                            <th>Owner</th>
                            <th>Matched (Media)</th>
                            <th>Matched (Collections)</th>
                            <th>% Matched (Overall)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(data ?? []).map((s, idx) => {
                            const percent = s.overall_pct ?? 0;
                            const barTextColor =
                                percent > 30
                                    ? 'stat-bar-label'
                                    : 'stat-bar-label stat-bar-label--muted';
                            return (
                                <tr key={s.owner || idx}>
                                    <td className="stats-owner">{s.owner}</td>
                                    <td>
                                        {s.media_matched} / {s.media_total}
                                    </td>
                                    <td>
                                        {s.collections_matched} / {s.collections_total}
                                    </td>
                                    <td className="stat-bar-cell">
                                        <div className="stat-bar-bg">
                                            <div
                                                className="stat-bar-inner"
                                                style={{
                                                    width:
                                                        percent > 0
                                                            ? `max(${percent}%, var(--space-px-18))`
                                                            : '0px',
                                                }}
                                            />
                                            <span className={barTextColor}>
                                                {percent.toFixed(1)}%
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            )}
            <div className="stats-footer">
                <b>Total matched:</b> {totalMatched} / {total}
            </div>
        </>
    );
}
