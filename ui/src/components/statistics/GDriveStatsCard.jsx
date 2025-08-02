import React, { useEffect, useState, useRef } from 'react';
import { fetchGDriveStats } from '../../utils/api';
import { useToast } from '../providers/ToastProvider';
import { getIcon, getSpinner } from '../../utils/tools';
import TooltipFactory from '../Tooltip';

const SORT_OPTIONS = [
    { value: 'owner-asc', label: 'Owner (A → Z)' },
    { value: 'owner-desc', label: 'Owner (Z → A)' },
    { value: 'files-desc', label: 'Files (High → Low)' },
    { value: 'files-asc', label: 'Files (Low → High)' },
    { value: 'size-desc', label: 'Size (High → Low)' },
    { value: 'size-asc', label: 'Size (Low → High)' },
    { value: 'updated-desc', label: 'Last Updated (Newest)' },
    { value: 'updated-asc', label: 'Last Updated (Oldest)' },
];

function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    let kb = bytes / 1024;
    if (kb < 1024) return kb.toFixed(1) + ' KB';
    let mb = kb / 1024;
    if (mb < 1024) return mb.toFixed(1) + ' MB';
    return (mb / 1024).toFixed(2) + ' GB';
}

function formatSimpleDate(str) {
    if (!str || str.length !== 8) return '--';
    const year = str.slice(0, 4);
    const month = str.slice(4, 6);
    const day = str.slice(6, 8);
    return `${month}/${day}/${year.slice(2)}`;
}

function sortStats(stats, mode) {
    let arr = [...stats];
    switch (mode) {
        case 'owner-asc':
            arr.sort((a, b) => String(a.owner).localeCompare(b.owner));
            break;
        case 'owner-desc':
            arr.sort((a, b) => String(b.owner).localeCompare(a.owner));
            break;
        case 'files-desc':
            arr.sort((a, b) => (b.file_count ?? 0) - (a.file_count ?? 0));
            break;
        case 'files-asc':
            arr.sort((a, b) => (a.file_count ?? 0) - (b.file_count ?? 0));
            break;
        case 'size-desc':
            arr.sort((a, b) => (b.size_bytes ?? 0) - (a.size_bytes ?? 0));
            break;
        case 'size-asc':
            arr.sort((a, b) => (a.size_bytes ?? 0) - (b.size_bytes ?? 0));
            break;
        case 'updated-desc':
            arr.sort((a, b) =>
                String(b.last_updated || '').localeCompare(String(a.last_updated || ''))
            );
            break;
        case 'updated-asc':
            arr.sort((a, b) =>
                String(a.last_updated || '').localeCompare(String(b.last_updated || ''))
            );
            break;
        default:
            break;
    }
    return arr;
}

export default function GDriveStatsCard() {
    const [stats, setStats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sortMode, setSortMode] = useState('files-desc');
    const [error, setError] = useState(null);
    const toast = useToast();
    const refreshBtnRef = useRef(null);

    // Tooltip state
    const [showRefreshTip, setShowRefreshTip] = useState(false);

    const fetchStats = async (showToast = false) => {
        setLoading(true);
        setError(null);
        try {
            const resp = await fetchGDriveStats();
            const data = resp?.gdrive_stats ?? resp ?? [];
            setStats(Array.isArray(data) ? data : []);
            if (showToast) toast('GDrive stats refreshed!', 'success');
        } catch (e) {
            setError(e.message || 'Failed to fetch GDrive stats.');
            if (showToast) toast('Failed to refresh GDrive stats', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const sortedStats = sortStats(stats, sortMode);

    let totalFiles = sortedStats.reduce((sum, s) => sum + (s.file_count ?? 0), 0);
    let totalSize = sortedStats.reduce((sum, s) => sum + (s.size_bytes ?? 0), 0);

    return (
        <>
            <div className="control-row">
                <span className="control-label">{getIcon('mi:sort')}</span>
                <span className="control-label-secondary">Sort by:</span>
                <select
                    id="sort-select"
                    className="select sort-select"
                    value={sortMode}
                    onChange={e => setSortMode(e.target.value)}
                >
                    {SORT_OPTIONS.map(opt => (
                        <option value={opt.value} key={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
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
                ) : !sortedStats.length ? (
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
                                <th>Files</th>
                                <th>Size</th>
                                <th>Last Updated</th>
                                <th>% of Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedStats.map((s, idx) => {
                                const percent = totalFiles ? (s.file_count / totalFiles) * 100 : 0;
                                const barTextColor =
                                    percent > 30
                                        ? 'stat-bar-label'
                                        : 'stat-bar-label stat-bar-label--muted';
                                return (
                                    <tr key={s.location || idx}>
                                        <td className="stats-owner">
                                            <span>{s.owner}</span>
                                        </td>
                                        <td>{s.file_count}</td>
                                        <td>{formatBytes(s.size_bytes)}</td>
                                        <td>{formatSimpleDate(s.last_updated)}</td>
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
            <div className="stats-footer stats-footer">
                <b>Total files:</b> {totalFiles} &nbsp; <b>Total size:</b> {formatBytes(totalSize)}
            </div>
        </>
    );
}
