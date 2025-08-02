import React, { useEffect, useState, useRef } from 'react';
import { fetchUnmatchedStats } from '../../utils/api';
import { useToast } from '../providers/ToastProvider';
import { getIcon, getSpinner } from '../../utils/tools';
import TooltipFactory from '../Tooltip';

const STAT_TYPES = [
    { key: 'movies', label: 'Movies' },
    { key: 'series', label: 'Series' },
    { key: 'seasons', label: 'Seasons' },
    { key: 'collections', label: 'Collections' },
    { key: 'grand_total', label: 'Grand Total' },
];

export default function UnmatchedAssetsCard() {
    const [stats, setStats] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const toast = useToast();
    const refreshBtnRef = useRef(null);
    const [showRefreshTip, setShowRefreshTip] = useState(false);

    const fetchStats = async (showToast = false) => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchUnmatchedStats();
            setStats(data?.summary ?? data ?? {});
            if (showToast) toast('Unmatched stats refreshed!', 'success');
        } catch (e) {
            setError(e.message || 'Failed to fetch unmatched stats.');
            if (showToast) toast('Failed to refresh unmatched stats', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Calculate overall totals for the footer (sum all totals and unmatched except grand_total)
    const total = STAT_TYPES.slice(0, 4).reduce(
        (sum, { key }) => sum + (stats[key]?.total || 0),
        0
    );
    const unmatched = STAT_TYPES.slice(0, 4).reduce(
        (sum, { key }) => sum + (stats[key]?.unmatched || 0),
        0
    );

    return (
        <>
            <div className="control-row">
                <span className="control-label">
                    {getIcon('mi:image')} Unmatched Posters Statistics
                </span>
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
                ) : !STAT_TYPES.some(({ key }) => stats[key] && stats[key].total > 0) ? (
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
                                <th>Type</th>
                                <th>Total</th>
                                <th>Unmatched</th>
                                <th>Percent Complete</th>
                            </tr>
                        </thead>
                        <tbody>
                            {STAT_TYPES.map(({ key, label }) => {
                                const s = stats[key] || {};
                                const percent =
                                    typeof s.percent_complete === 'number' ? s.percent_complete : 0;
                                const barTextColor =
                                    percent > 8
                                        ? 'stat-bar-label'
                                        : 'stat-bar-label stat-bar-label--muted';
                                return (
                                    <tr key={key}>
                                        <td>{label}</td>
                                        <td>{s.total ?? '--'}</td>
                                        <td>{s.unmatched ?? '--'}</td>
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
                                                    {percent.toFixed(2)}%
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
                <b>Total unmatched:</b> {unmatched} / {total}
            </div>
        </>
    );
}
