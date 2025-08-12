import React, { useRef, useState } from 'react';
import { getIcon } from '../../utils/tools';
import LoadingSpinner from '../common/LoadingSpinner';
import TooltipFactory from '../Tooltip';

export default function UnmatchedAssetsContent({ data, loading, error, refresh }) {
    const [refreshTip, setRefreshTip] = useState(false);
    const refreshRef = useRef(null);

    const STAT_TYPES = [
        { key: 'movies', label: 'Movies' },
        { key: 'series', label: 'Series' },
        { key: 'seasons', label: 'Seasons' },
        { key: 'collections', label: 'Collections' },
        { key: 'grand_total', label: 'Grand Total' },
    ];
    const total = STAT_TYPES.slice(0, 4).reduce(
        (sum, { key }) => sum + ((data ?? {})[key]?.total || 0),
        0
    );
    const unmatched = STAT_TYPES.slice(0, 4).reduce(
        (sum, { key }) => sum + ((data ?? {})[key]?.unmatched || 0),
        0
    );
    return (
        <>
            <div className="control-row">
                <span className="control-label">
                    {getIcon('mi:image')} Unmatched Posters Statistics
                </span>
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
                    text="Refresh Unmatched Statistics"
                    show={refreshTip}
                    position="top"
                />
            </div>
            {loading ? (
                <div className="stats-loading"><LoadingSpinner /></div>
            ) : error ? (
                <div className="stats-error">{error}</div>
            ) : !STAT_TYPES.some(({ key }) => (data ?? {})[key] && (data ?? {})[key].total > 0) ? (
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
                            const s = (data ?? {})[key] || {};
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
            <div className="stats-footer">
                <b>Total unmatched:</b> {unmatched} / {total}
            </div>
        </>
    );
}
