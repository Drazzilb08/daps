import React, { useEffect, useState, useRef } from 'react';
import { fetchMatchedPosterStats } from '../../utils/api';
import { useToast } from '../providers/ToastProvider';
import { getIcon, getSpinner } from '../../utils/tools';
import TooltipFactory from '../Tooltip';

export default function MatchedPostersCard() {
    const [stats, setStats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const toast = useToast();
    const refreshBtnRef = useRef(null);

    // Tooltip state
    const [showRefreshTip, setShowRefreshTip] = useState(false);

    const fetchStats = async (showToast = false) => {
        setLoading(true);
        setError(null);
        try {
            const resp = await fetchMatchedPosterStats();
            const data = resp?.matched_posters_stats ?? resp ?? [];
            setStats(Array.isArray(data) ? data : []);
            if (showToast) toast('Matched posters stats refreshed!', 'success');
        } catch (e) {
            setError(e.message || 'Failed to fetch matched posters stats.');
            if (showToast) toast('Failed to refresh matched posters stats', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Totals for footer
    const totalMatched = stats.reduce((sum, s) => sum + (s.overall_matched ?? 0), 0);
    const total = stats.reduce((sum, s) => sum + (s.overall_total ?? 0), 0);

    return (
        <>
            <div className="control-row">
                <span className="control-label">{getIcon('mi:equalizer')} Analytics by Owner</span>
                <button
                    ref={refreshBtnRef}
                    className="btn--icon stat-card-refresh"
                    title="Refresh"
                    onClick={() => fetchStats(true)}
                    disabled={loading}
                    onMouseEnter={() => setShowRefreshTip(true)}
                    onMouseLeave={() => setShowRefreshTip(false)}
                    onFocus={() => setShowRefreshTip(true)}
                    onBlur={() => setShowRefreshTip(false)}
                >
                    {loading ? getSpinner({}) : getIcon('mi:refresh')}
                </button>
                <TooltipFactory
                    anchor={refreshBtnRef.current}
                    text="Refresh stats"
                    show={showRefreshTip}
                />
            </div>
            <div className="stats-table">
                {loading ? (
                    <div className="stats-loading">{getSpinner({})}</div>
                ) : error ? (
                    <div className="stats-error">{error}</div>
                ) : !stats.length ? (
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
                            {stats.map((s, idx) => {
                                const percent = s.overall_pct ?? 0;
                                const barTextColor =
                                    percent > 30
                                        ? 'stat-bar-label'
                                        : 'stat-bar-label stat-bar-label--muted';
                                return (
                                    <tr key={s.owner || idx}>
                                        <td className="stats-owner">
                                            <span>{s.owner}</span>
                                        </td>
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
                                                                ? `max(${percent}%, 18px)`
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
            </div>
            <div className="stats-footer">
                <b>Total matched:</b> {totalMatched} / {total}
            </div>
        </>
    );
}
