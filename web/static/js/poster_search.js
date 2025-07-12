import { fetchConfig } from './api.js';
import { showToast } from './util.js';

const IDS = {
    searchInput: 'poster-search-input',
    searchResults: 'poster-search-results',
    statsSpinner: 'poster-stats-spinner',
    scopeToggle: 'search-scope-toggle',
    scopeLabel: 'search-scope-label',
};

let config = {};
let gdriveLocations = [];
let customLocations = [];
let gdriveFiles = [];
let customFiles = [];
let assetsDir = '';
let assetsFiles = [];
let gdriveStatsData = [];
let assetsStatsData = [];
let gdriveTotals = { files: 0, size: 0 };
let assetsTotals = { files: 0, size: 0 };
let gdriveSortMode = 'priority-desc';
let priorityMap = {};

let loaderStartTime = 0;
function showLoaderModal(show = true) {
    const container = document.querySelector('.container-iframe');
    let loader = container.querySelector('.poster-search-loader-modal');
    if (show) {
        loaderStartTime = Date.now();
        if (!loader) {
            loader = document.createElement('div');
            loader.className = 'poster-search-loader-modal';
            loader.innerHTML = `
              <div class="terminal-loader">
                <div class="terminal-header">
                  <div class="terminal-title">Status</div>
                  <div class="terminal-controls">
                    <div class="control close"></div>
                    <div class="control minimize"></div>
                    <div class="control maximize"></div>
                  </div>
                </div>
                <div class="text">Loading Posters...</div>
              </div>
            `;
            container.insertBefore(loader, container.firstChild);
        }
        loader.style.display = 'flex';
    } else if (loader) {
        const elapsed = Date.now() - loaderStartTime;
        const delay = Math.max(0, 4000 - elapsed); // 4s min for 1 cycle
        setTimeout(() => {
            loader.style.display = 'none';
        }, delay);
    }
}

function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    let kb = bytes / 1024;
    if (kb < 1024) return kb.toFixed(1) + ' KB';
    let mb = kb / 1024;
    if (mb < 1024) return mb.toFixed(1) + ' MB';
    return (mb / 1024).toFixed(2) + ' GB';
}

function renderStatsTable(statsArr, totals, title) {
    if (!statsArr.length) return '';
    const columns = [
        { key: 'name', label: 'Folder', isNumeric: false },
        { key: 'file_count', label: 'Files', isNumeric: true },
        { key: 'size_bytes', label: 'Size', isNumeric: true },
        { key: 'percent', label: '% of Total', isNumeric: true },
    ];

    let arr = statsArr.map((s) => ({
        ...s,
        percent: totals.files ? (s.file_count / totals.files) * 100 : 0,
    }));
    let header = columns.map((col) => `<th>${col.label}</th>`).join('');
    let rows = arr
        .map((s) => {
            let badge = s.isCustom ? ' <span class="gdrive-custom-badge">(Custom)</span>' : '';
            let folderCol = '';
            if (s.notInSource) {
                folderCol = `
                <span class="gdrive-tooltip-wrapper">
                    <span class="gdrive-name gdrive-tooltip-red" tabindex="0">${s.name}</span>
                    <span class="gdrive-tooltip-content">
                        This GDrive is <b>not present</b> in Poster Renamerr's Source Directories</span>
                    </span>
                </span>
            `;
            } else {
                folderCol = `<span class="gdrive-name">${s.name}</span>`;
            }

            const rowClass = s.error ? 'gdrive-row-error' : '';
            return `<tr class="${rowClass}">
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
        })
        .join('\n');
    return `
        <div class="stats-title">${title}</div>
        <table class="stats-table">
            <thead>
                <tr>${header}</tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>
        <div class="stats-footer">
            <b>Total files:</b> ${totals.files} &nbsp; <b>Total size:</b> ${formatBytes(
        totals.size
    )}
        </div>
    `;
}

function sortGdriveStats(statsArr, mode, priorityMap = {}) {
    if (!Array.isArray(statsArr)) return;
    let compare = () => 0;
    statsArr.forEach((s) => {
        s.file_count =
            typeof s.file_count === 'number' && !isNaN(s.file_count)
                ? s.file_count
                : Array.isArray(s.files)
                ? s.files.length
                : 0;
    });
    if (mode.startsWith('priority')) {
        const asc = mode.endsWith('asc');

        const inSource = statsArr.filter((s) => !s.notInSource);
        const notInSource = statsArr.filter((s) => s.notInSource);
        const compare = (a, b) => {
            const ap = priorityMap[a.location] ?? 9999;
            const bp = priorityMap[b.location] ?? 9999;
            return asc ? ap - bp : bp - ap;
        };
        inSource.sort(compare);

        notInSource.sort((a, b) => String(a.name).localeCompare(String(b.name)));

        statsArr.splice(0, statsArr.length, ...inSource, ...notInSource);
        return;
    } else if (mode.startsWith('files')) {
        const asc = mode.endsWith('asc');
        compare = (a, b) => (asc ? a.file_count - b.file_count : b.file_count - a.file_count);
    } else if (mode.startsWith('size')) {
        const asc = mode.endsWith('asc');
        compare = (a, b) => (asc ? a.size_bytes - b.size_bytes : b.size_bytes - a.size_bytes);
    } else if (mode.startsWith('name')) {
        const asc = mode.endsWith('asc');
        compare = (a, b) =>
            asc
                ? String(a.name).localeCompare(String(b.name))
                : String(b.name).localeCompare(String(a.name));
    }
    statsArr.sort(compare);
}

async function fetchAndRenderStats() {
    showSpinner(true);

    if (!config || !Object.keys(config).length) config = await fetchConfig();

    let gdriveLocations = (config.sync_gdrive?.gdrive_list || []).map((g) => ({
        name: g.name,
        location: g.location,
    }));
    let gdriveLocSet = new Set(gdriveLocations.map((g) => g.location));
    let sourceDirs = config.poster_renamerr?.source_dirs || [];
    let customDirs = sourceDirs.filter((dir) => !gdriveLocSet.has(dir));
    let sourceDirSet = new Set(sourceDirs);
    let assetsDir = config.poster_renamerr?.destination_dir || '';

    let customStatsArr = [];
    let gdriveStatsArr = [];

    if (customDirs.length) {
        let statsArr = await Promise.all(
            customDirs.map(async (dir) => {
                let res = await fetch('/api/poster-search-stats', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ location: dir }),
                });
                let stats = await res.json();
                if (stats && !stats.error && typeof stats.file_count === 'number') {
                    return {
                        name: dir.split('/').pop(),
                        location: dir,
                        ...stats,
                        isCustom: true,
                    };
                }
                if (stats.error) {
                    return {
                        name: dir.split('/').pop(),
                        location: dir,
                        file_count: 0,
                        size_bytes: 0,
                        files: [],
                        isCustom: true,
                        error: true,
                    };
                }
                return null;
            })
        );
        customStatsArr = statsArr.filter(Boolean);
    }

    let gdriveStatRaw = await Promise.all(
        gdriveLocations.map(async (l) => {
            let res = await fetch('/api/poster-search-stats', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ location: l.location }),
            });
            let stats = await res.json();
            if (stats && !stats.error && typeof stats.file_count === 'number') {
                return {
                    ...stats,
                    name: l.name,
                    location: l.location,
                    isCustom: false,
                    notInSource: !sourceDirSet.has(l.location),
                };
            }
            if (stats.error) {
                return {
                    name: l.name,
                    location: l.location,
                    file_count: 0,
                    size_bytes: 0,
                    files: [],
                    isCustom: false,
                    notInSource: !sourceDirSet.has(l.location),
                    error: true,
                };
            }
            return null;
        })
    );
    gdriveStatsArr = gdriveStatRaw.filter(Boolean);

    let mergedGdriveStats = [...gdriveStatsArr, ...customStatsArr];
    mergedGdriveStats.forEach((s) => {
        s.file_count = Number(s.file_count) || 0;
        s.size_bytes = Number(s.size_bytes) || 0;
    });

    let gTotals = {
        files: mergedGdriveStats.reduce((sum, s) => sum + s.file_count, 0),
        size: mergedGdriveStats.reduce((sum, s) => sum + s.size_bytes, 0),
    };
    let aStats = null,
        aTotals = { files: 0, size: 0 };
    if (assetsDir) {
        let res = await fetch('/api/poster-search-stats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ location: assetsDir }),
        });
        let stats = await res.json();
        if (!stats.error && typeof stats.file_count === 'number') {
            aStats = [
                {
                    name: 'Assets Dir',
                    ...stats,
                },
            ];
            aTotals = { files: stats.file_count, size: stats.size_bytes };
        }
    }

    gdriveStatsData = mergedGdriveStats.map((s) => ({ ...s }));
    gdriveTotals = gTotals;
    assetsStatsData = aStats || [];
    assetsTotals = aTotals;

    priorityMap = {};
    sourceDirs.forEach((dir, idx) => {
        priorityMap[dir] = idx;
    });

    sortGdriveStats(gdriveStatsData, gdriveSortMode, priorityMap);
    renderStatsSection();
    showSpinner(false);
}

function renderStatsSection() {
    const statsCard = document.getElementById('poster-stats-card');
    if (!statsCard) return;
    statsCard.className = 'card';

    if (!statsCard.dataset.expanded) {
        statsCard.style.display = 'none';
    }
    statsCard.style.marginBottom = '2em';

    statsCard.innerHTML = `
        <div id="gdrive-sort-row" class="gdrive-sort-row">
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
        </div>
        <div id="gdrive-stats-table">
            ${renderStatsTable([...gdriveStatsData], gdriveTotals, 'GDrive Locations')}
        </div>
        <div id="assets-stats-table" style="margin-top:1.3em;">
            ${renderStatsTable(assetsStatsData, assetsTotals, 'Assets Directory')}
        </div>
    `;

    const select = document.getElementById('gdrive-sort-select');
    if (select) {
        select.value = gdriveSortMode;
        select.onchange = function () {
            gdriveSortMode = this.value;
            let arr = gdriveStatsData.map((s) => ({ ...s }));
            sortGdriveStats(arr, gdriveSortMode, priorityMap);
            document.getElementById('gdrive-stats-table').innerHTML = renderStatsTable(
                arr,
                gdriveTotals,
                'GDrive Locations'
            );
        };
    }
}

function setupStatsToggle() {
    const btn = getById('toggle-stats-btn');
    const card = getById('poster-stats-card');
    btn.textContent = '📊 Show Statistics';
    card.style.display = 'none';
    card.dataset.expanded = ''; // Not expanded
    btn.onclick = function () {
        const expanded = card.style.display !== '' && card.style.display !== 'block';
        if (expanded) {
            card.style.display = '';
            card.dataset.expanded = '1';
            btn.textContent = '📊 Hide Statistics';
        } else {
            card.style.display = 'none';
            card.dataset.expanded = '';
            btn.textContent = '📊 Show Statistics';
        }
    };
}

function getById(id) {
    return document.getElementById(id);
}
function highlight(str, term) {
    if (!term) return str;
    const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return str.replace(regex, `<span class="highlight">$1</span>`);
}
function showSpinner(show) {
    const spinner = getById(IDS.statsSpinner);
    if (spinner) spinner.style.display = show ? '' : 'none';
}
function materialIcon(name, style = '') {
    return `<span class="material-icons" style="vertical-align:middle;${style}">${name}</span>`;
}

function showImageModal(imgSrc, caption) {
    closeImageModal();
    const modal = document.createElement('div');
    modal.id = 'img-preview-modal';
    modal.className = 'show';
    modal.innerHTML = `
        <div class="img-modal-bg"></div>
        <div class="img-modal-content">
            <button class="img-modal-close" type="button">&times;</button>
            <img class="img-modal-img" src="${imgSrc}" alt="Preview" />
            <div class="img-modal-caption">${caption || ''}</div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector('.img-modal-bg').onclick = closeImageModal;
    modal.querySelector('.img-modal-close').onclick = closeImageModal;
}
function closeImageModal() {
    const old = document.getElementById('img-preview-modal');
    if (old) old.remove();
}

let hoverPreviewImg = null;
function setupHoverPreview() {
    hoverPreviewImg = document.querySelector('.hover-preview');
    if (!hoverPreviewImg) {
        hoverPreviewImg = document.createElement('img');
        hoverPreviewImg.className = 'hover-preview';
        hoverPreviewImg.style.display = 'none';
        hoverPreviewImg.style.position = 'absolute';
        hoverPreviewImg.style.pointerEvents = 'none';
        hoverPreviewImg.style.maxWidth = '200px';
        hoverPreviewImg.style.maxHeight = '200px';
        hoverPreviewImg.style.zIndex = '10002';
        document.body.appendChild(hoverPreviewImg);
    }
}
setupHoverPreview();

async function fetchAllFileLists() {
    showSpinner(true);
    config = await fetchConfig();

    gdriveLocations = (config.sync_gdrive?.gdrive_list || []).map((g) => ({
        name: g.name,
        location: g.location,
    }));
    const gdriveLocSet = new Set(gdriveLocations.map((g) => g.location));
    const sourceDirs = config.poster_renamerr?.source_dirs || [];
    customLocations = sourceDirs.filter((dir) => !gdriveLocSet.has(dir));
    assetsDir = config.poster_renamerr?.destination_dir || '';

    gdriveFiles = [];
    for (const { name, location } of gdriveLocations) {
        try {
            const res = await fetch('/api/poster-search-stats', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ location }),
            });
            const stats = await res.json();
            if (Array.isArray(stats.files)) {
                stats.files.forEach((f) => gdriveFiles.push({ file: f, name, location }));
            }
        } catch {}
    }

    customFiles = [];
    for (const dir of customLocations) {
        try {
            const res = await fetch('/api/poster-search-stats', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ location: dir }),
            });
            const stats = await res.json();
            if (Array.isArray(stats.files)) {
                stats.files.forEach((f) =>
                    customFiles.push({
                        file: f,
                        name: dir.split('/').pop() + ' (Custom)',
                        location: dir,
                    })
                );
            }
        } catch {}
    }

    assetsFiles = [];
    if (assetsDir) {
        try {
            const res = await fetch('/api/poster-search-stats', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ location: assetsDir }),
            });
            const stats = await res.json();
            if (Array.isArray(stats.files)) {
                assetsFiles = stats.files;
            }
        } catch {
            assetsFiles = [];
        }
    }
    showSpinner(false);
}

function renderResults(term) {
    const resultsDiv = getById(IDS.searchResults);
    let html = '';
    let useAssets = getById(IDS.scopeToggle).checked;

    if (!useAssets) {
        const groups = {};
        [...gdriveFiles, ...customFiles].forEach(({ file, name, location }) => {
            if (!term || file.toLowerCase().includes(term)) {
                const key = name + '||' + location;
                if (!groups[key]) groups[key] = { name, location, files: [] };
                groups[key].files.push(file);
            }
        });
        Object.values(groups).forEach((group) => {
            const locate = encodeURIComponent(group.location);
            html += `<div class="result-group">
                <div class="result-folder" tabindex="0" aria-label="${group.name}">${
                group.name
            }</div>
                <ul class="poster-list">${group.files
                    .map(
                        (f) =>
                            `<li class="img-preview-link">
                    <span class="poster-file-label"
                          data-location="${locate}"
                          data-file="${encodeURIComponent(f)}"
                          tabindex="0"
                          aria-label="Preview ${f}">${highlight(f, term)}</span>
                    <button class="copy-btn" title="Copy filename" aria-label="Copy filename ${f}">
                        <span class="copy-btn-default">${materialIcon(
                            'content_copy',
                            'font-size:1.2em;margin-right:3px;'
                        )}Copy</span>
                        <span class="copy-btn-copied" style="display:none;">${materialIcon(
                            'check',
                            'font-size:1.2em;margin-right:3px;'
                        )}Copied</span>
                    </button>
                </li>`
                    )
                    .join('')}</ul>
            </div>`;
        });
    }
    if (useAssets && assetsFiles.length) {
        const matches = assetsFiles.filter((file) => {
            if (file.startsWith('tmp/')) return false;
            if (file === '.DS_Store') return false;
            if (!term) return true;
            const lower = file.toLowerCase();
            const fname = file.split('/').pop().toLowerCase();
            return lower.includes(term) || fname.includes(term);
        });
        if (matches.length) {
            const locate = encodeURIComponent(assetsDir);
            html += `<div class="result-group">
                <div class="result-folder">Assets Dir</div>
                <ul class="poster-list">${matches
                    .map(
                        (f) =>
                            `<li class="img-preview-link">
                    <span class="poster-file-label"
                          data-location="${locate}"
                          data-file="${encodeURIComponent(f)}"
                          tabindex="0"
                          aria-label="Preview ${f}">${highlight(f, term)}</span>
                    <button class="copy-btn" title="Copy filename" aria-label="Copy filename ${f}">
                        <span class="copy-btn-default">${materialIcon(
                            'content_copy',
                            'font-size:1.2em;margin-right:3px;'
                        )}Copy</span>
                        <span class="copy-btn-copied" style="display:none;">${materialIcon(
                            'check',
                            'font-size:1.2em;margin-right:3px;'
                        )}Copied</span>
                    </button>
                </li>`
                    )
                    .join('')}</ul>
            </div>`;
        }
    }
    resultsDiv.innerHTML =
        html ||
        `<div style="margin-top:2em;">No results found. Try another search or check your filters.</div>`;
}

function copyToClipboard(btn, text) {
    navigator.clipboard
        .writeText(text)
        .then(() => {
            const def = btn.querySelector('.copy-btn-default');
            const copied = btn.querySelector('.copy-btn-copied');
            if (def && copied) {
                def.style.display = 'none';
                copied.style.display = 'inline';
                setTimeout(() => {
                    def.style.display = '';
                    copied.style.display = 'none';
                }, 1400);
            }
        })
        .catch(() => {
            showToast && showToast('Could not copy to clipboard.', 'error');
        });
}

function setupEventListeners() {
    const toggle = getById(IDS.scopeToggle);
    const label = getById(IDS.scopeLabel);
    toggle.checked = false;
    label.textContent = 'GDrive Locations';
    toggle.onchange = () => {
        label.textContent = toggle.checked ? 'Assets Directory' : 'GDrive Locations';
        getById(IDS.searchInput).value = '';
        getById(IDS.searchResults).innerHTML = '';
    };

    document.addEventListener('keydown', (e) => {
        const input = getById(IDS.searchInput);
        const modal = document.getElementById('img-preview-modal');
        if ((e.key === '/' && !e.ctrlKey) || (e.key === 'f' && e.ctrlKey)) {
            e.preventDefault();
            input && input.focus();
        } else if (e.key === 'Escape') {
            if (modal) closeImageModal();
            else input && (input.value = '');
        } else if (e.key === 'Enter' && document.activeElement === input) {
            e.preventDefault();
            renderResults(input.value.trim().toLowerCase());
        }
    });

    getById(IDS.searchInput).onkeypress = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            renderResults(e.target.value.trim().toLowerCase());
        }
    };

    getById(IDS.searchResults).addEventListener('click', (e) => {
        const copyBtn = e.target.closest('.copy-btn');
        if (copyBtn) {
            e.stopPropagation();
            let file = copyBtn.getAttribute('aria-label') || '';
            file = file
                .replace(/^Copy filename\s*/i, '')
                .replace(/^Copied\s*/i, '')
                .trim();
            if (!file) {
                const span = copyBtn.closest('li')?.querySelector('.poster-file-label');
                if (span) file = span.textContent;
            }
            copyToClipboard(copyBtn, file);
            return false;
        }

        const label = e.target.closest('.poster-file-label');
        if (label) {
            let location = decodeURIComponent(label.getAttribute('data-location') || '');
            let path = decodeURIComponent(label.getAttribute('data-file') || '');
            let caption = label.textContent;
            if (location && path) {
                const url = `/api/preview-poster?location=${encodeURIComponent(
                    location
                )}&path=${encodeURIComponent(path)}`;
                showImageModal(url, caption);
            }
            return false;
        }
    });

    getById(IDS.searchResults).addEventListener('mouseover', (e) => {
        const label = e.target.closest('.poster-file-label');
        if (label) {
            let location = decodeURIComponent(label.getAttribute('data-location') || '');
            let path = decodeURIComponent(label.getAttribute('data-file') || '');
            if (location && path) {
                const url = `/api/preview-poster?location=${encodeURIComponent(
                    location
                )}&path=${encodeURIComponent(path)}&thumb=1`;
                hoverPreviewImg.src = url;
                hoverPreviewImg.style.display = 'block';
            }
        }
    });
    getById(IDS.searchResults).addEventListener('mousemove', (e) => {
        if (hoverPreviewImg && hoverPreviewImg.style.display === 'block') {
            const imgWidth = hoverPreviewImg.naturalWidth
                ? Math.min(hoverPreviewImg.naturalWidth, 200)
                : 200;
            const imgHeight = hoverPreviewImg.naturalHeight
                ? Math.min(hoverPreviewImg.naturalHeight, 200)
                : 200;
            const vpWidth = window.innerWidth;
            const vpHeight = window.innerHeight;
            let left = e.pageX + 14;
            let top = e.pageY + 14;
            if (left + imgWidth > vpWidth - 10) left = Math.max(10, vpWidth - imgWidth - 10);
            if (top + imgHeight > vpHeight - 10) top = Math.max(10, vpHeight - imgHeight - 10);
            hoverPreviewImg.style.left = left + 'px';
            hoverPreviewImg.style.top = top + 'px';
        }
    });
    getById(IDS.searchResults).addEventListener('mouseout', (e) => {
        if (e.target.closest('.poster-file-label')) {
            hoverPreviewImg.style.display = 'none';
        }
    });
}

export async function initPosterSearch() {
    showLoaderModal(true);
    getById(IDS.searchResults).innerHTML = '';
    getById(IDS.searchInput).value = '';
    await fetchAllFileLists();
    setupEventListeners();
    showLoaderModal(false);
    setupStatsToggle();
    await fetchAndRenderStats();
}
