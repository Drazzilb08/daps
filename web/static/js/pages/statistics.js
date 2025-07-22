import { fetchGdriveStats, fetchConfig } from '../api.js';
import { showLoaderModal } from '../common/loaders.js';

// Core function for building stats card
async function buildGdriveStatsCard(parent) {
    // --- Card container ---
    const card = document.createElement('div');
    card.className = 'card stat-card gdrive-stats-card';

    // --- Header ---
    card.innerHTML = `
      <div class="stat-card-header">
        <span class="stat-card-title">GDrive Storage Statistics</span>
      </div>
      <div class="stat-card-content">
        <div class="gdrive-sort-row"></div>
        <div class="gdrive-stats-table"></div>
        <div class="gdrive-stats-footer"></div>
      </div>
    `;
    parent.appendChild(card);

    // --- Fetch config ---
    let config = await fetchConfig();

    const gdriveLocations = (config?.sync_gdrive?.gdrive_list || []).map((g) => ({
        name: g.name,
        location: g.location,
    }));
    const gdriveLocSet = new Set(gdriveLocations.map((g) => g.location));
    const sourceDirs = config?.poster_renamerr?.source_dirs || [];
    const priorityMap = {};
    sourceDirs.forEach((dir, idx) => (priorityMap[dir] = idx));

    // Fetch stats for all drives
    const gdriveStatsArr = await Promise.all(
        gdriveLocations.map(async (l) => {
            let stats = {};
            try {
                stats = await fetchGdriveStats(l.location);
            } catch {}
            return {
                ...stats,
                name: l.name,
                location: l.location,
                file_count: Number(stats.file_count) || 0,
                size_bytes: Number(stats.size_bytes) || 0,
            };
        })
    );

    // --- Sorting helpers ---
    let sortMode = 'priority-desc';
    function sortStats(arr, mode) {
        let compare = () => 0;
        if (mode.startsWith('priority')) {
            const asc = mode.endsWith('asc');
            arr.sort((a, b) => {
                const ap = priorityMap[a.location] ?? 9999;
                const bp = priorityMap[b.location] ?? 9999;
                return asc ? ap - bp : bp - ap;
            });
        } else if (mode.startsWith('files')) {
            const asc = mode.endsWith('asc');
            arr.sort((a, b) => (asc ? a.file_count - b.file_count : b.file_count - a.file_count));
        } else if (mode.startsWith('size')) {
            const asc = mode.endsWith('asc');
            arr.sort((a, b) => (asc ? a.size_bytes - b.size_bytes : b.size_bytes - a.size_bytes));
        } else if (mode.startsWith('name')) {
            const asc = mode.endsWith('asc');
            arr.sort((a, b) =>
                asc ? String(a.name).localeCompare(b.name) : String(b.name).localeCompare(a.name)
            );
        }
    }

    // --- Bytes formatter ---
    function formatBytes(bytes) {
        if (bytes < 1024) return bytes + ' B';
        let kb = bytes / 1024;
        if (kb < 1024) return kb.toFixed(1) + ' KB';
        let mb = kb / 1024;
        if (mb < 1024) return mb.toFixed(1) + ' MB';
        return (mb / 1024).toFixed(2) + ' GB';
    }

    // --- Table renderer ---
    function renderStatsTable(arr) {
        if (!arr.length) return '<div style="margin-top:2em;">No data.</div>';
        let totalFiles = arr.reduce((sum, s) => sum + s.file_count, 0);
        let totalSize = arr.reduce((sum, s) => sum + s.size_bytes, 0);
        let header = `<tr>
            <th>Folder</th><th>Files</th><th>Size</th><th>% of Total</th>
        </tr>`;
        let rows = arr
            .map((s) => {
                const percent = totalFiles ? (s.file_count / totalFiles) * 100 : 0;
                return `<tr>
                    <td>${s.name}</td>
                    <td>${s.file_count}</td>
                    <td>${formatBytes(s.size_bytes)}</td>
                    <td>
                        <div class="stat-bar-bg">
                            <div class="stat-bar-inner" style="width:${percent}%;"></div>
                        </div>
                        <span class="stat-bar-percent">${percent.toFixed(1)}%</span>
                    </td>
                </tr>`;
            })
            .join('');
        return `
            <table class="stats-table">
                <thead>${header}</thead>
                <tbody>${rows}</tbody>
            </table>
        `;
    }

    // --- Sort row ---
    const sortRow = card.querySelector('.gdrive-sort-row');
    sortRow.innerHTML = `
        <label for="gdrive-sort-select" class="gdrive-sort-label">Sort by:</label>
        <select id="gdrive-sort-select" class="select gdrive-sort-select">
            <option value="priority-desc">Source Order (High → Low)</option>
            <option value="priority-asc">Source Order (Low → High)</option>
            <option value="files-desc">Files (High → Low)</option>
            <option value="files-asc">Files (Low → High)</option>
            <option value="size-desc">Size (High → Low)</option>
            <option value="size-asc">Size (Low → High)</option>
            <option value="name-asc">Name (A → Z)</option>
            <option value="name-desc">Name (Z → A)</option>
        </select>
    `;

    // --- Render and hook up sort ---
    let statsCopy = gdriveStatsArr.map((s) => ({ ...s }));
    function updateTable() {
        sortStats(statsCopy, sortMode);
        card.querySelector('.gdrive-stats-table').innerHTML = renderStatsTable(statsCopy);
        // Footer
        const totalFiles = statsCopy.reduce((sum, s) => sum + s.file_count, 0);
        const totalSize = statsCopy.reduce((sum, s) => sum + s.size_bytes, 0);
        card.querySelector(
            '.gdrive-stats-footer'
        ).innerHTML = `<b>Total files:</b> ${totalFiles} &nbsp; <b>Total size:</b> ${formatBytes(
            totalSize
        )}`;
    }
    updateTable();

    const select = sortRow.querySelector('.gdrive-sort-select');
    if (select) {
        select.value = sortMode;
        select.onchange = function () {
            sortMode = this.value;
            updateTable();
        };
    }
}

export function ensureStatisticsDOM() {
    const root = document.getElementById('viewFrame');
    if (!root) return;
    // Remove everything except loader modals, if present
    [...root.children].forEach((child) => {
        if (!child.classList.contains('poster-search-loader-modal')) {
            child.remove();
        }
    });
    // If you want a dedicated stats card container (optional)
    if (!root.querySelector('.gdrive-stats-card')) {
        // buildGdriveStatsCard will append it if not present
    }
}

export async function initStatistics() {
    ensureStatisticsDOM();
    showLoaderModal(true);

    await buildGdriveStatsCard(document.getElementById('viewFrame'));

    showLoaderModal(false);
}
