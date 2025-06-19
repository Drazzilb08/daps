let gdriveLocations = [];
let assetsDir = null;
let gdriveStats = [];
let assetsStats = null;
let gdriveFiles = [];
let assetsFiles = [];
let gdriveTotals = {
    files: 0,
    size: 0
};
let assetsTotals = {
    files: 0,
    size: 0
};

function showImageModal(imgSrc, caption)
{
    // Remove any previous modal
    let oldModal = document.getElementById('img-preview-modal');
    if (oldModal) oldModal.remove();
    // Build modal overlay
    const modal = document.createElement('div');
    modal.id = 'img-preview-modal';
    modal.className = 'show';
    // Dark background
    const bg = document.createElement('div');
    bg.className = 'img-modal-bg';
    bg.onclick = closeImageModal;
    // Modal content
    const content = document.createElement('div');
    content.className = 'img-modal-content';
    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'img-modal-close';
    closeBtn.type = 'button';
    closeBtn.innerHTML = '&times;';
    closeBtn.onclick = closeImageModal;
    // Image
    const img = document.createElement('img');
    img.id = 'img-modal-img';
    img.className = 'img-modal-img';
    img.src = imgSrc;
    img.alt = 'Preview';
    // Caption
    const cap = document.createElement('div');
    cap.id = 'img-modal-caption';
    cap.className = 'img-modal-caption';
    cap.textContent = caption || '';
    // Assemble modal
    content.appendChild(closeBtn);
    content.appendChild(img);
    content.appendChild(cap);
    modal.appendChild(bg);
    modal.appendChild(content);
    // Attach modal to body
    document.body.appendChild(modal);
}

function closeImageModal()
{
    let modal = document.getElementById('img-preview-modal');
    if (modal) modal.remove();
}
window.previewPoster = function(location, path, caption)
{
    // Compose API URL
    const url = `/api/preview-poster?location=${location}&path=${path}`;
    showImageModal(url, caption);
};
async function fetchConfig()
{
    const res = await fetch('/api/config');
    return await res.json();
}
async function fetchStats(location)
{
    const res = await fetch('/api/poster-search-stats',
    {
        method: 'POST',
        headers:
        {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(
        {
            location
        })
    });
    return await res.json();
}

function formatBytes(bytes)
{
    if (bytes < 1024) return bytes + " B";
    let kb = bytes / 1024;
    if (kb < 1024) return kb.toFixed(1) + " KB";
    let mb = kb / 1024;
    if (mb < 1024) return mb.toFixed(1) + " MB";
    return (mb / 1024).toFixed(2) + " GB";
}

function highlight(str, term)
{
    if (!term) return str;
    const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&' )})`, 'gi');
    return str.replace(regex, `<span class="highlight">$1</span>`);
}

function copyToClipboard(btn, text)
{
    navigator.clipboard.writeText(text)
        .then(() =>
        {
            // Show "Copied" state
            const def = btn.querySelector('.copy-btn-default');
            const copied = btn.querySelector('.copy-btn-copied');
            if (def && copied)
            {
                def.style.display = 'none';
                copied.style.display = 'inline-flex';
                // Reset to default after 1.4s
                setTimeout(() =>
                {
                    def.style.display = '';
                    copied.style.display = 'none';
                }, 1400);
            }
        })
        .catch(() =>
        {
            window.showToast("Could not copy to clipboard.", "error");
        });
}

// Sorting state for stats tables
// (No longer used for GDrive, only for assets if needed)
const statsSortState = {};

// Given an array and sort mode, sort in-place
function sortGdriveStats(arr, sortMode, priorityMap) {
    switch (sortMode) {
        case 'priority-desc': // highest priority last
            arr.sort((a, b) => (priorityMap[b.location] ?? -1) - (priorityMap[a.location] ?? -1));
            break;
        case 'name-asc':
            arr.sort((a, b) => String(a.name).localeCompare(b.name));
            break;
        case 'name-desc':
            arr.sort((a, b) => String(b.name).localeCompare(a.name));
            break;
        case 'file_count-asc':
            arr.sort((a, b) => (a.file_count || 0) - (b.file_count || 0));
            break;
        case 'file_count-desc':
            arr.sort((a, b) => (b.file_count || 0) - (a.file_count || 0));
            break;
        case 'size_bytes-asc':
            arr.sort((a, b) => (a.size_bytes || 0) - (b.size_bytes || 0));
            break;
        case 'size_bytes-desc':
            arr.sort((a, b) => (b.size_bytes || 0) - (a.size_bytes || 0));
            break;
        default:
            break;
    }
}

function renderStatsTable(statsArr, totals, title, isAssets)
{
    if (!statsArr.length) return '';
    // Define columns and accessors
    const columns = [
        { key: 'name', label: 'Folder', isNumeric: false },
        { key: 'file_count', label: 'Files', isNumeric: true },
        { key: 'size_bytes', label: 'Size', isNumeric: true },
        { key: 'percent', label: '% of Total', isNumeric: true }
    ];
    // Compute % for all rows
    let arr = statsArr.map(s => ({
        ...s,
        percent: totals.files ? (s.file_count / totals.files * 100) : 0
    }));

    // For GDrive Locations, sorting is handled externally
    // For other tables, keep previous sort logic if needed
    if (title !== "GDrive Locations") {
        // Get current sort state or default
        let sortKey = statsSortState[title]?.key || 'file_count';
        let sortAsc = statsSortState[title]?.asc ?? false;
        arr = arr.slice().sort((a, b) => {
            if (sortKey === 'percent') {
                return sortAsc ? a.percent - b.percent : b.percent - a.percent;
            }
            if (columns.find(c => c.key === sortKey)?.isNumeric) {
                return sortAsc ? a[sortKey] - b[sortKey] : b[sortKey] - a[sortKey];
            }
            // string compare
            return sortAsc ? String(a[sortKey]).localeCompare(String(b[sortKey])) : String(b[sortKey]).localeCompare(String(a[sortKey]));
        });
    }

    // Remove clickable headers for GDrive Locations
    let header = columns.map(col => `<th>${col.label}</th>`).join('');

    let rows = arr.map(s => {
    let badge = '';
    if (s.isCustom) {
        badge = ' <span style="font-size:0.88em;color:#7cb0fa;">(Custom)</span>';
    }
    let folderCol = '';
    if (s.notInSource) {
        folderCol = `
            <span class="gdrive-tooltip-wrapper">
                <span class="gdrive-name gdrive-tooltip-red" tabindex="0" style="border-bottom:none;">${s.name}</span>
                <span class="gdrive-tooltip-content">
                    This GDrive is <b>not present</b> in Poster Renamerr's Source Directories</span>
                </span>
            </span>${badge}`;
    } else {
        folderCol = `<span class="gdrive-name">${s.name}</span>${badge}`;
    }
    return `<tr>
    <td>${folderCol}</td>
    <td>${s.file_count || 0}</td>
    <td>${formatBytes(s.size_bytes || 0)}</td>
    <td>
        <div class="stat-bar-bg">
            <div class="stat-bar-inner" style="width:${s.percent}%;"></div>
        </div>
        <span class="stat-bar-percent">${s.percent.toFixed(1)}%</span>
    </td>
</tr>`;
}).join('\n');
    return `
    <div class="stats-title">${title}</div>
    <table class="stats-table">
        <thead>
            <tr>${header}</tr>
        </thead>
        <tbody>${rows}</tbody>
    </table>
    <div class="stats-footer">
        <b>Total files:</b> ${totals.files} &nbsp; <b>Total size:</b> ${formatBytes(totals.size)}
    </div>
    `;
}

function renderResults(term)
{
    const resultsDiv = document.getElementById('poster-search-results');
    let html = '';
    let useAssets = document.getElementById('search-scope-toggle').checked;
    if (!useAssets && gdriveFiles.length)
    {
        // GDrive Locations search
        let groups = {};
        gdriveFiles.forEach((
        {
            file,
            name
        }) =>
        {
            if (!term || file.toLowerCase().includes(term))
            {
                if (!groups[name]) groups[name] = [];
                groups[name].push(file);
            }
        });
        let nameToLoc = {};
        gdriveLocations.forEach(g =>
        {
            nameToLoc[g.name] = g.location;
        });
        Object.entries(groups).forEach(([name, files]) =>
        {
            const locate = encodeURIComponent(nameToLoc[name] || "");
            html += `<div class="result-group">
        <div class="result-folder">${name}</div>
        <ul class="poster-list">${files.map(f =>
            `<li class="img-preview-link">
                <span class="poster-file-label" onclick="previewPoster('${locate}','${encodeURIComponent(f)}','${f}')">${highlight(f, term)}</span>
                <button class="copy-btn" title="Copy filename" onclick="event.stopPropagation(); copyToClipboard(this, '${f}'); return false;">
                    <span class="copy-btn-default">
                        <span class="material-icons" style="font-size:1.2em;vertical-align:middle;margin-right:2px;">content_copy</span>
                        <span style="font-size: 1em; vertical-align: middle;">Copy</span>
                    </span>
                    <span class="copy-btn-copied" style="display:none;">
                        <span class="material-icons" style="font-size:1.2em;vertical-align:middle;margin-right:2px;">check</span>
                        <span style="font-size: 1em; vertical-align: middle;">Copied</span>
                    </span>
                </button>
            </li>`
            ).join('')}</ul>
    </div>`;
        });
    }
    if (useAssets && assetsFiles.length)
    {
        // Assets Directory search
        let matches = assetsFiles.filter(file =>
        {
            if (file.startsWith('tmp/')) return false;
            if (file === '.DS_Store') return false;
            if (!term) return true;
            const lower = file.toLowerCase();
            const fname = file.split('/').pop().toLowerCase();
            const match = lower.includes(term) || fname.includes(term);
            return match;
        });
        if (matches.length)
        {
            const locate = encodeURIComponent(assetsDir);
            html += `<div class="result-group">
        <div class="result-folder">Assets Dir</div>
        <ul class="poster-list">${matches.map(f =>
            `<li class="img-preview-link">
                <span class="poster-file-label" onclick="previewPoster('${locate}','${encodeURIComponent(f)}','${f}')">${highlight(f, term)}</span>
                <button class="copy-btn" title="Copy filename" onclick="event.stopPropagation(); copyToClipboard(this, '${f}'); return false;">
                    <span class="copy-btn-default">
                        <span class="material-icons" style="font-size:1.2em;vertical-align:middle;margin-right:2px;">content_copy</span>
                        <span style="font-size: 1em; vertical-align: middle;"> Copy</span>
                    </span>
                    <span class="copy-btn-copied" style="display:none;">
                        <span class="material-icons" style="font-size:1.2em;vertical-align:middle;margin-right:2px;">check</span>
                        <span style="font-size: 1em; vertical-align: middle;"> Copied</span>
                    </span>
                </button>
            </li>`
            ).join('')}</ul>
    </div>`;
        }
    }
    resultsDiv.innerHTML = html || `<div style="margin-top:2em;">No results found.</div>`;
}
window.initPosterSearch = async function()
{
    document.getElementById('poster-stats-spinner').style.display = '';
    document.getElementById('poster-search-results').innerHTML = '';
    document.getElementById('poster-gdrive-stats').innerHTML = '';
    document.getElementById('poster-assets-stats').innerHTML = '';
    document.getElementById('poster-search-input').value = '';
    document.getElementById('poster-stats-card').style.display = "none";
    gdriveLocations = [];
    assetsDir = null;
    gdriveStats = [];
    assetsStats = null;
    gdriveFiles = [];
    assetsFiles = [];
    gdriveTotals = {
        files: 0,
        size: 0
    };
    assetsTotals = {
        files: 0,
        size: 0
    };
    const config = await fetchConfig();
    gdriveLocations = (config.sync_gdrive && config.sync_gdrive.gdrive_list || []).map(g => (
    {
        name: g.name,
        location: g.location
    }));
    const gdriveLocationSet = new Set(gdriveLocations.map(g => g.location));
    const sourceDirs = config.poster_renamerr.source_dirs || [];
    const customDirs = sourceDirs.filter(dir => !gdriveLocationSet.has(dir));
    const sourceDirSet = new Set(sourceDirs);

    // --- Fetch stats for custom dirs
    let customStatsArr = [];
    if (customDirs.length) {
        let statsArr = await Promise.all(customDirs.map(async dir => {
            let stats = await fetchStats(dir);
            if (stats && !stats.error && typeof stats.file_count === 'number') {
                return {
                    name: dir.split('/').pop(),
                    location: dir,
                    ...stats,
                    isCustom: true
                };
            }
            return null;
        }));
        customStatsArr = statsArr.filter(Boolean);
    }
    assetsDir = config.poster_renamerr.destination_dir;
    // Toggle switch UI
    const toggle = document.getElementById('search-scope-toggle');
    const label = document.getElementById('search-scope-label');
    toggle.checked = false; // Default: GDrive
    label.textContent = "GDrive Locations";
    toggle.onchange = () =>
    {
        label.textContent = toggle.checked ? "Assets Directory" : "GDrive Locations";
        document.getElementById('poster-search-input').value = '';
        document.getElementById('poster-search-results').innerHTML = '';
    };
    // Debug view (optional, you can remove if not needed)
    if (toggle.checked)
    {
        document.getElementById('poster-search-results').innerHTML =
            '<div style="margin-bottom:1em;color:#888;">Debug: Assets files loaded:<br>' +
            assetsFiles.map(f => `<div>${f}</div>`).join('') + '</div>';
    }
    // Fetch gdrive stats
    // --- Fetch gdrive stats (not custom)
    let gdriveStatRaw = await Promise.all(gdriveLocations.map(async l => {
        let stats = await fetchStats(l.location);
        return stats && !stats.error && typeof stats.file_count === 'number'
            ? { 
            ...stats, 
            name: l.name, 
            location: l.location, 
            isCustom: false,
            notInSource: !sourceDirSet.has(l.location) // <--- PATCH
        }
        : null;
    }));
    gdriveStats = gdriveStatRaw.filter(Boolean);

    // --- Merge customStatsArr into gdriveStats
    let mergedGdriveStats = [...gdriveStats, ...customStatsArr];

    // --- Totals (include customs)
    gdriveTotals.files = mergedGdriveStats.reduce((sum, s) => sum + s.file_count, 0);
    gdriveTotals.size = mergedGdriveStats.reduce((sum, s) => sum + s.size_bytes, 0);

    // --- Include all files for searching
    gdriveFiles = [];
    mergedGdriveStats.forEach(s => {
        (s.files || []).forEach(f => gdriveFiles.push({
            file: f,
            name: s.name + (s.isCustom ? ' (Custom)' : '')
        }));
    });
    // Fetch assets stats
    assetsStats = await fetchStats(assetsDir);
    if (!assetsStats.error && typeof assetsStats.file_count === 'number')
    {
        assetsFiles = assetsStats.files || [];
        assetsTotals.files = assetsStats.file_count;
        assetsTotals.size = assetsStats.size_bytes;
    }
    else
    {
        assetsFiles = [];
        assetsTotals = {
            files: 0,
            size: 0
        };
    }

    // Build a priority map for all locations (highest = largest index)
    let priorityMap = {};
    (sourceDirs || []).forEach((dir, idx) => { priorityMap[dir] = idx; });

    // Initial sort
    window._gdriveSortMode = document.getElementById('gdrive-sort-select')?.value || 'priority-desc';
    sortGdriveStats(mergedGdriveStats, window._gdriveSortMode, priorityMap);

    // Set globals for table sorting (and for re-sorting)
    window._latestGDriveStatsArr = mergedGdriveStats;
    window._latestGDriveTotals = gdriveTotals;
    window._latestAssetsStatsArr = assetsStats && !assetsStats.error && typeof assetsStats.file_count === 'number'
        ? [{ name: "Assets Dir", ...assetsStats }] : [];
    window._latestAssetsTotals = assetsTotals;

    // Render stats tables (hidden by default)
    document.getElementById('poster-gdrive-stats').innerHTML = renderStatsTable(
        window._latestGDriveStatsArr, window._latestGDriveTotals, "GDrive Locations", false
    );
    document.getElementById('poster-assets-stats').innerHTML = renderStatsTable(
        window._latestAssetsStatsArr,
        window._latestAssetsTotals,
        "Assets Directory",
        true
    );

    // Wire up the dropdown for GDrive sort
    const sortSelect = document.getElementById('gdrive-sort-select');
    if (sortSelect) {
        sortSelect.value = window._gdriveSortMode;
        sortSelect.onchange = function() {
            window._gdriveSortMode = this.value;
            sortGdriveStats(window._latestGDriveStatsArr, window._gdriveSortMode, priorityMap);
            document.getElementById('poster-gdrive-stats').innerHTML = renderStatsTable(
                window._latestGDriveStatsArr, window._latestGDriveTotals, "GDrive Locations", false
            );
        };
    }

    // Toggle stats card
    let statsShown = false;
    const card = document.getElementById('poster-stats-card');
    const toggleBtn = document.getElementById('toggle-stats-btn');
    toggleBtn.onclick = function()
    {
        statsShown = !statsShown;
        card.style.display = statsShown ? '' : 'none';
        toggleBtn.textContent = statsShown ? "📊 Hide Statistics" : "📊 Show Statistics";
    };
    // SEARCH logic
    const input = document.getElementById('poster-search-input');
    input.onkeypress = (e) =>
    {
        if (e.key === 'Enter')
        {
            e.preventDefault();
            renderResults(input.value.trim().toLowerCase());
        }
    };
    // Expose copyToClipboard globally for onclick
    window.copyToClipboard = copyToClipboard;
    document.getElementById('poster-stats-spinner').style.display = 'none';
};

// Table sorting handler (only for assets table now, not GDrive)
window.sortStatsTable = function(title, key)
{
    // Only allow sorting for non-GDrive tables
    if (title === "GDrive Locations") return;
    const isNumeric = ['file_count','size_bytes','percent'].includes(key);
    let prev = statsSortState[title];
    let asc = prev && prev.key === key ? !prev.asc : !isNumeric;
    statsSortState[title] = { key, asc };
    // Re-render the table
    if (title === "Assets Directory" && window._latestAssetsStatsArr && window._latestAssetsTotals) {
        document.getElementById('poster-assets-stats').innerHTML =
            renderStatsTable(window._latestAssetsStatsArr, window._latestAssetsTotals, "Assets Directory", true);
    }
};
// === Hover Preview Logic ===
let hoverPreview;

function setupHoverPreview()
{
    hoverPreview = document.querySelector('.hover-preview');
    if (!hoverPreview)
    {
        const el = document.createElement('img');
        el.className = 'hover-preview';
        document.body.appendChild(el);
        hoverPreview = el;
    }
}
if (document.readyState === 'loading')
{
    document.addEventListener('DOMContentLoaded', setupHoverPreview);
}
else
{
    setupHoverPreview();
}

function showHoverPreview(e, location, path)
{
    // Use thumbnail endpoint if available, else regular image
    const url = `/api/preview-poster?location=${location}&path=${path}&thumb=1`;
    hoverPreview.src = url;
    hoverPreview.style.left = (e.pageX + 12) + 'px';
    hoverPreview.style.top = (e.pageY + 12) + 'px';
    hoverPreview.style.display = 'block';
}

function hideHoverPreview()
{
    hoverPreview.style.display = 'none';
}
// Add event listeners for hover preview
document.addEventListener('mouseover', (e) =>
{
    const span = e.target.closest('.poster-file-label');
    if (span)
    {
        // Locate li parent and extract location/path from onclick attribute (hacky, but fits your code)
        const li = span.closest('li.img-preview-link');
        // Use dataset if possible
        let location, path;
        const onclick = span.getAttribute('onclick');
        if (onclick)
        {
            // Parse: previewPoster('location','path','caption')
            const match = onclick.match(/previewPoster\('([^']+)','([^']+)'/);
            if (match)
            {
                location = match[1];
                path = match[2];
            }
        }
        if (location && path)
        {
            showHoverPreview(e, location, path);
        }
    }
});
document.addEventListener('mousemove', (e) =>
{
    if (hoverPreview && hoverPreview.style.display === 'block')
{
    hoverPreview.style.left = (e.pageX + 12) + 'px';
    hoverPreview.style.top = (e.pageY + 12) + 'px';
}
});
document.addEventListener('mouseout', (e) =>
{
    if (e.target.closest('.poster-file-label'))
    {
        hideHoverPreview();
    }
});
// === Keyboard Shortcuts ===
document.addEventListener('keydown', (e) =>
{
    const input = document.getElementById('poster-search-input');
    const modal = document.getElementById('img-preview-modal');
    if ((e.key === '/' && !e.ctrlKey) || (e.key === 'f' && e.ctrlKey))
    {
        e.preventDefault();
        if (input) input.focus();
    }
    else if (e.key === 'Escape')
    {
        if (modal) closeImageModal();
        else if (input) input.value = '';
    }
    else if (e.key === 'Enter' && document.activeElement === input)
    {
        e.preventDefault();
        renderResults(input.value.trim().toLowerCase());
    }
});