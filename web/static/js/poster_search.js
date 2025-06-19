// --- Constants for DOM Selectors
const IDS = {
    searchInput: 'poster-search-input',
    statsCard: 'poster-stats-card',
    statsSpinner: 'poster-stats-spinner',
    gdriveStats: 'poster-gdrive-stats',
    assetsStats: 'poster-assets-stats',
    searchScopeToggle: 'search-scope-toggle',
    searchScopeLabel: 'search-scope-label',
    toggleStatsBtn: 'toggle-stats-btn',
    gdriveSortSelect: 'gdrive-sort-select',
    searchResults: 'poster-search-results',
};
// --- Globals
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
const statsSortState = {};
// ========== Utility Functions ==========
function getById(id)
{
    return document.getElementById(id);
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
            window.showToast && window.showToast("Could not copy to clipboard.", "error");
        });
}

function sortGdriveStats(statsArr, mode, priorityMap = {})
{
    mode = mode || 'priority-desc';
    if (!Array.isArray(statsArr)) return;
    let compare;

    function notInSourceRank(a, b)
    {
        // Ensure "notInSource" rows sort LAST (bottom)
        if (a.notInSource && !b.notInSource) return 1;
        if (!a.notInSource && b.notInSource) return -1;
        return 0;
    }
    if (mode.startsWith('priority'))
    {
        const asc = mode.endsWith('asc');
        compare = (a, b) =>
        {
            const missing = notInSourceRank(a, b);
            if (missing !== 0) return missing;
            const ap = priorityMap[a.location] ?? 9999;
            const bp = priorityMap[b.location] ?? 9999;
            return asc ? ap - bp : bp - ap;
        };
    }
    else if (mode.startsWith('files'))
    {
        const asc = mode.endsWith('asc');
        compare = (a, b) =>
        {
            const missing = notInSourceRank(a, b);
            if (missing !== 0) return missing;
            return asc ? a.file_count - b.file_count : b.file_count - a.file_count;
        };
    }
    else if (mode.startsWith('size'))
    {
        const asc = mode.endsWith('asc');
        compare = (a, b) =>
        {
            const missing = notInSourceRank(a, b);
            if (missing !== 0) return missing;
            return asc ? a.size_bytes - b.size_bytes : b.size_bytes - a.size_bytes;
        };
    }
    else
    {
        compare = notInSourceRank;
    }
    statsArr.sort(compare);
}
// ========== API Wrappers ==========
async function fetchConfig()
{
    try
    {
        const res = await fetch('/api/config');
        if (!res.ok) throw new Error('Failed to fetch config');
        return await res.json();
    }
    catch (err)
    {
        showError('Could not load configuration.');
        throw err;
    }
}
async function fetchStats(location)
{
    if (!location) return {
        error: true,
        file_count: 0,
        size_bytes: 0,
        files: []
    };
    try
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
            }),
        });
        if (!res.ok)
        {
            return {
                error: true,
                file_count: 0,
                size_bytes: 0,
                files: []
            };
        }
        return await res.json();
    }
    catch (err)
    {
        return {
            error: true,
            file_count: 0,
            size_bytes: 0,
            files: []
        };
    }
}
// ========== UI Feedback Functions ==========
function showError(msg)
{
    const el = document.createElement('div');
    el.className = 'error-banner';
    el.textContent = msg;
    el.style.cssText = 'background:#422;padding:0.7em 1.2em;color:#ffeaa7;font-size:1.05em;border-radius:6px;margin:1em 0;';
    const statsCard = getById(IDS.statsCard);
    if (statsCard && !statsCard.querySelector('.error-banner'))
    {
        statsCard.insertBefore(el, statsCard.firstChild);
    }
}

function clearError()
{
    document.querySelectorAll('.error-banner').forEach(el => el.remove());
}
// ========== Stats Table Rendering ==========
function renderStatsTable(statsArr, totals, title, isAssets)
{
    if (!statsArr.length) return '';
    const columns = [
    {
        key: 'name',
        label: 'Folder',
        isNumeric: false
    },
    {
        key: 'file_count',
        label: 'Files',
        isNumeric: true
    },
    {
        key: 'size_bytes',
        label: 'Size',
        isNumeric: true
    },
    {
        key: 'percent',
        label: '% of Total',
        isNumeric: true
    }];
    let arr = statsArr.map(s => (
    {
        ...s,
        percent: totals.files ? (s.file_count / totals.files * 100) : 0
    }));
    if (title !== "GDrive Locations")
    {
        let sortKey = statsSortState[title]?.key || 'file_count';
        let sortAsc = statsSortState[title]?.asc ?? false;
        arr = arr.slice().sort((a, b) =>
        {
            if (sortKey === 'percent')
            {
                return sortAsc ? a.percent - b.percent : b.percent - a.percent;
            }
            if (columns.find(c => c.key === sortKey)?.isNumeric)
            {
                return sortAsc ? a[sortKey] - b[sortKey] : b[sortKey] - a[sortKey];
            }
            return sortAsc ? String(a[sortKey]).localeCompare(String(b[sortKey])) : String(b[sortKey]).localeCompare(String(a[sortKey]));
        });
    }
    let header = columns.map(col => `<th>${col.label}</th>`).join('');
    let rows = arr.map(s =>
    {
        let badge = s.isCustom ? ' <span style="font-size:0.88em;color:#7cb0fa;">(Custom)</span>' : '';
        let folderCol = '';
        if (s.notInSource)
        {
            folderCol = `
                <span class="gdrive-tooltip-wrapper">
                    <span class="gdrive-name gdrive-tooltip-red" tabindex="0" aria-label="Missing from Source">${s.name}</span>
                    <span class="gdrive-tooltip-content">
                        This GDrive is <b>not present</b> in Poster Renamerr's Source Directories</span>
                    </span>
                </span>${badge}`;
        }
        else
        {
            folderCol = `<span class="gdrive-name">${s.name}</span>${badge}`;
        }
        // Error row highlight
        const rowClass = s.error ? ' style="background:#3a2222;color:#fbb;"' : '';
        return `<tr${rowClass}>
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
/**
 * Renders the GDrive stats sort select dropdown if it doesn't exist yet.
 * Attaches the onchange event handler to sort and rerender.
 */
function renderGdriveSortDropdown()
{
    // Insert above the GDrive stats table
    let statsContainer = document.getElementById(IDS.gdriveStats);
    let parent = statsContainer?.parentNode;
    if (!parent) return;
    // Check if dropdown already exists
    let select = document.getElementById(IDS.gdriveSortSelect);
    if (!select)
    {
        select = document.createElement('select');
        select.id = IDS.gdriveSortSelect;
        select.style.marginBottom = '0.7em';
        select.innerHTML = `
            <option value="priority-desc">Sort: Source Order (desc)</option>
            <option value="priority-asc">Sort: Source Order (asc)</option>
            <option value="files-desc">Sort: Files (desc)</option>
            <option value="files-asc">Sort: Files (asc)</option>
            <option value="size-desc">Sort: Size (desc)</option>
            <option value="size-asc">Sort: Size (asc)</option>
        `;
        parent.insertBefore(select, statsContainer);
    }
    select.value = window._gdriveSortMode || 'priority-desc';
    select.onchange = function()
    {
        window._gdriveSortMode = this.value;
        sortGdriveStats(window._latestGDriveStatsArr, window._gdriveSortMode,
        {});
        document.getElementById(IDS.gdriveStats).innerHTML = renderStatsTable(
            window._latestGDriveStatsArr, window._latestGDriveTotals, "GDrive Locations", false
        );
        renderGdriveSortDropdown();
    };
}
// ========== Stats Fetching ==========
async function fetchAndRenderStats()
{
    clearError();
    getById(IDS.statsSpinner).style.display = '';
    getById(IDS.gdriveStats).innerHTML = '';
    getById(IDS.assetsStats).innerHTML = '';
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
    try
    {
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
        // Fetch stats for custom dirs
        let customStatsArr = [];
        if (customDirs.length)
        {
            let statsArr = await Promise.all(customDirs.map(async dir =>
            {
                let stats = await fetchStats(dir);
                if (stats && !stats.error && typeof stats.file_count === 'number')
                {
                    return {
                        name: dir.split('/').pop(),
                        location: dir,
                        ...stats,
                        isCustom: true
                    };
                }
                if (stats.error)
                {
                    return {
                        name: dir.split('/').pop(),
                        location: dir,
                        file_count: 0,
                        size_bytes: 0,
                        files: [],
                        isCustom: true,
                        error: true
                    };
                }
                return null;
            }));
            customStatsArr = statsArr.filter(Boolean);
        }
        assetsDir = config.poster_renamerr.destination_dir;
        // Fetch gdrive stats (not custom)
        let gdriveStatRaw = await Promise.all(gdriveLocations.map(async l =>
        {
            let stats = await fetchStats(l.location);
            if (stats && !stats.error && typeof stats.file_count === 'number')
            {
                return {
                    ...stats,
                    name: l.name,
                    location: l.location,
                    isCustom: false,
                    notInSource: !sourceDirSet.has(l.location)
                };
            }
            if (stats.error)
            {
                return {
                    name: l.name,
                    location: l.location,
                    file_count: 0,
                    size_bytes: 0,
                    files: [],
                    isCustom: false,
                    notInSource: !sourceDirSet.has(l.location),
                    error: true
                };
            }
            return null;
        }));
        gdriveStats = gdriveStatRaw.filter(Boolean);
        // Merge customStatsArr into gdriveStats
        let mergedGdriveStats = [...gdriveStats, ...customStatsArr];
        // Totals (include customs)
        gdriveTotals.files = mergedGdriveStats.reduce((sum, s) => sum + s.file_count, 0);
        gdriveTotals.size = mergedGdriveStats.reduce((sum, s) => sum + s.size_bytes, 0);
        // Include all files for searching
        gdriveFiles = [];
        mergedGdriveStats.forEach(s =>
        {
            (s.files || []).forEach(f => gdriveFiles.push(
            {
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
        (sourceDirs || []).forEach((dir, idx) =>
        {
            priorityMap[dir] = idx;
        });
        // Initial sort
        window._gdriveSortMode = getById(IDS.gdriveSortSelect)?.value || 'priority-desc';
        sortGdriveStats(mergedGdriveStats, window._gdriveSortMode, priorityMap);
        // Set globals for table sorting (and for re-sorting)
        window._latestGDriveStatsArr = mergedGdriveStats;
        window._latestGDriveTotals = gdriveTotals;
        window._latestAssetsStatsArr = assetsStats && !assetsStats.error && typeof assetsStats.file_count === 'number' ?
            [
            {
                name: "Assets Dir",
                ...assetsStats
            }] : [];
        window._latestAssetsTotals = assetsTotals;
        // Render stats tables (hidden by default)
        getById(IDS.gdriveStats).innerHTML = renderStatsTable(
            window._latestGDriveStatsArr, window._latestGDriveTotals, "GDrive Locations", false
        );
        getById(IDS.assetsStats).innerHTML = renderStatsTable(
            window._latestAssetsStatsArr,
            window._latestAssetsTotals,
            "Assets Directory",
            true
        );
    }
    catch (err)
    {
        showError('An error occurred while loading statistics.');
    }
    getById(IDS.statsSpinner).style.display = 'none';
}
// ====== IMAGE MODAL PREVIEW ======
function showImageModal(imgSrc, caption)
{
    let oldModal = document.getElementById('img-preview-modal');
    if (oldModal) oldModal.remove();
    const modal = document.createElement('div');
    modal.id = 'img-preview-modal';
    modal.className = 'show';
    const bg = document.createElement('div');
    bg.className = 'img-modal-bg';
    bg.onclick = closeImageModal;
    const content = document.createElement('div');
    content.className = 'img-modal-content';
    const closeBtn = document.createElement('button');
    closeBtn.className = 'img-modal-close';
    closeBtn.type = 'button';
    closeBtn.innerHTML = '&times;';
    closeBtn.onclick = closeImageModal;
    const img = document.createElement('img');
    img.id = 'img-modal-img';
    img.className = 'img-modal-img';
    img.src = imgSrc;
    img.alt = 'Preview';
    const cap = document.createElement('div');
    cap.id = 'img-modal-caption';
    cap.className = 'img-modal-caption';
    cap.textContent = caption || '';
    content.appendChild(closeBtn);
    content.appendChild(img);
    content.appendChild(cap);
    modal.appendChild(bg);
    modal.appendChild(content);
    document.body.appendChild(modal);
}

function closeImageModal()
{
    let modal = document.getElementById('img-preview-modal');
    if (modal) modal.remove();
}
// Make previewPoster available globally for inline onclicks
window.previewPoster = function(location, path, caption)
{
    const url = `/api/preview-poster?location=${location}&path=${path}`;
    showImageModal(url, caption);
};
// ====== HOVER IMAGE PREVIEW ======
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
        const li = span.closest('li.img-preview-link');
        let location, path;
        const onclick = span.getAttribute('onclick');
        if (onclick)
        {
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
// ========== Main Initialization ==========
function setupEventListeners()
{
    // Toggle search scope
    const toggle = getById(IDS.searchScopeToggle);
    const label = getById(IDS.searchScopeLabel);
    toggle.checked = false;
    label.textContent = "GDrive Locations";
    toggle.onchange = () =>
    {
        label.textContent = toggle.checked ? "Assets Directory" : "GDrive Locations";
        getById(IDS.searchInput).value = '';
        getById(IDS.searchResults).innerHTML = '';
    };
    // Stats card toggle
    let statsShown = false;
    const card = getById(IDS.statsCard);
    const toggleBtn = getById(IDS.toggleStatsBtn);
    toggleBtn.onclick = function()
    {
        statsShown = !statsShown;
        card.style.display = statsShown ? '' : 'none';
        toggleBtn.textContent = statsShown ? "📊 Hide Statistics" : "📊 Show Statistics";
    };
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
    // Search on Enter key
    const input = getById(IDS.searchInput);
    input.onkeypress = (e) =>
    {
        if (e.key === 'Enter')
        {
            e.preventDefault();
            renderResults(input.value.trim().toLowerCase());
        }
    };
    // Expose copy globally
    window.copyToClipboard = copyToClipboard;
    // Dropdown for GDrive sort
    const sortSelect = getById(IDS.gdriveSortSelect);
    if (sortSelect)
    {
        sortSelect.value = window._gdriveSortMode || 'priority-desc';
        sortSelect.onchange = function()
        {
            window._gdriveSortMode = this.value;
            sortGdriveStats(window._latestGDriveStatsArr, window._gdriveSortMode,
            {});
            getById(IDS.gdriveStats).innerHTML = renderStatsTable(
                window._latestGDriveStatsArr, window._latestGDriveTotals, "GDrive Locations", false
            );
        };
    }
}
// ========== Search Results Rendering ==========
function renderResults(term)
{
    const resultsDiv = getById(IDS.searchResults);
    let html = '';
    let useAssets = getById(IDS.searchScopeToggle).checked;
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
                <div class="result-folder" tabindex="0" aria-label="${name}">${name}</div>
                <ul class="poster-list">${files.map(f =>
                `<li class="img-preview-link">
                    <span class="poster-file-label" onclick="previewPoster('${locate}','${encodeURIComponent(f)}','${f}')" tabindex="0" aria-label="Preview ${f}">${highlight(f, term)}</span>
                    <button class="copy-btn" title="Copy filename" aria-label="Copy filename ${f}" onclick="event.stopPropagation(); copyToClipboard(this, '${f}'); return false;">
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
        let matches = assetsFiles.filter(file =>
        {
            if (file.startsWith('tmp/')) return false;
            if (file === '.DS_Store') return false;
            if (!term) return true;
            const lower = file.toLowerCase();
            const fname = file.split('/').pop().toLowerCase();
            return lower.includes(term) || fname.includes(term);
        });
        if (matches.length)
        {
            const locate = encodeURIComponent(assetsDir);
            html += `<div class="result-group">
                <div class="result-folder">Assets Dir</div>
                <ul class="poster-list">${matches.map(f =>
                `<li class="img-preview-link">
                    <span class="poster-file-label" onclick="previewPoster('${locate}','${encodeURIComponent(f)}','${f}')" tabindex="0" aria-label="Preview ${f}">${highlight(f, term)}</span>
                    <button class="copy-btn" title="Copy filename" aria-label="Copy filename ${f}" onclick="event.stopPropagation(); copyToClipboard(this, '${f}'); return false;">
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
    resultsDiv.innerHTML = html || `<div style="margin-top:2em;">No results found. Try another search or check your filters.</div>`;
}
// ========== Main Entrypoint ==========
window.initPosterSearch = async function()
{
    getById(IDS.statsSpinner).style.display = '';
    getById(IDS.searchResults).innerHTML = '';
    getById(IDS.gdriveStats).innerHTML = '';
    getById(IDS.assetsStats).innerHTML = '';
    getById(IDS.searchInput).value = '';
    getById(IDS.statsCard).style.display = "none";
    await fetchAndRenderStats();
    setupEventListeners();
    getById(IDS.statsSpinner).style.display = 'none';
};