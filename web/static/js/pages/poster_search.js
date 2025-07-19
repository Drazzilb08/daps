import { fetchPosterPreviewUrl, fetchConfig } from '../api.js';
import { showToast, getIcon } from '../util.js';
import { showLoaderModal } from '../common/loaders.js';
import { openModal } from '../common/modals.js';

const IDS = {
    searchInput: 'poster-search-input',
    searchResults: 'poster-search-results',
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
let currentSource = 'gdrive';
let currentSort = 'priority-asc';
let currentView = 'grid';
let priorityOrder = {};

function isImageFile(filename) {
    return /\.(jpe?g|png|webp|gif)$/i.test(filename);
}

function buildPriorityOrderFromConfig() {
    const dirs = config.poster_renamerr?.source_dirs || [];
    priorityOrder = {};
    dirs.forEach((dir, idx) => {
        priorityOrder[dir] = idx;
    });
}

const PosterSearchViews = {
    grid: function renderGridView(fileObjs, term) {
        // Group files by owner
        const groups = groupFilesByOwner(fileObjs);

        // --- Determine group order
        let groupOrder = Object.keys(groups);
        if (currentSort === 'priority-asc') {
            // Use priorityOrder (owner is folder name)
            groupOrder = groupOrder.sort((a, b) => {
                const pa = priorityOrder[a] ?? 9999;
                const pb = priorityOrder[b] ?? 9999;
                return pa - pb;
            });
        } else if (currentSort === 'priority-desc') {
            groupOrder = groupOrder.sort((a, b) => {
                const pa = priorityOrder[a] ?? -1;
                const pb = priorityOrder[b] ?? -1;
                return pb - pa;
            });
        } else if (currentSort === 'alpha') {
            groupOrder = groupOrder.sort((a, b) => a.localeCompare(b));
        } else if (currentSort === 'alpha-desc') {
            groupOrder = groupOrder.sort((a, b) => b.localeCompare(a));
        }
        // date: skip, unless you want to sort groups by most recently added

        // --- Render groups
        return groupOrder
            .map((owner) => {
                const files = groups[owner];
                // files within group, sort A-Z (optional)
                files.sort((a, b) => a.file.localeCompare(b.file));
                return `
            <div class="poster-owner-group">
                <div class="poster-owner-label">${owner}</div>
                <div class="poster-grid">
                    ${files
                        .map((obj) => {
                            const thumbUrl =
                                obj.location && obj.file
                                    ? `/api/preview-poster?location=${encodeURIComponent(
                                          obj.location
                                      )}&path=${encodeURIComponent(obj.file)}&thumb=1`
                                    : '';
                            return `<div class="poster-grid-item"
                                    data-owner="${owner}"
                                    data-location="${encodeURIComponent(obj.location || '')}"
                                    data-file="${encodeURIComponent(obj.file)}"
                                    tabindex="0"
                                    title="${obj.file}">
                                    <img class="poster-thumb-img" src="${thumbUrl}" alt="thumb" loading="lazy">
                                    <span class="poster-file-label">${highlight(
                                        obj.file,
                                        term
                                    )}</span>
                                </div>`;
                        })
                        .join('')}
                </div>
            </div>
            `;
            })
            .join('');
    },
    list: function renderListView(fileObjs, term) {
        // Group files by owner
        const groups = groupFilesByOwner(fileObjs);

        // --- Determine group order
        let groupOrder = Object.keys(groups);
        if (currentSort === 'priority-asc') {
            groupOrder = groupOrder.sort((a, b) => {
                const pa = priorityOrder[a] ?? 9999;
                const pb = priorityOrder[b] ?? 9999;
                return pa - pb;
            });
        } else if (currentSort === 'priority-desc') {
            groupOrder = groupOrder.sort((a, b) => {
                const pa = priorityOrder[a] ?? -1;
                const pb = priorityOrder[b] ?? -1;
                return pb - pa;
            });
        } else if (currentSort === 'alpha') {
            groupOrder = groupOrder.sort((a, b) => a.localeCompare(b));
        } else if (currentSort === 'alpha-desc') {
            groupOrder = groupOrder.sort((a, b) => b.localeCompare(a));
        }

        // --- Render groups
        return groupOrder
            .map((owner) => {
                const files = groups[owner];
                // files within group, sort A-Z (optional)
                files.sort((a, b) => a.file.localeCompare(b.file));
                return `
            <div class="poster-owner-group">
                <div class="poster-owner-label">${owner}</div>
                <ul class="poster-list">
                    ${files
                        .map((obj) => {
                            return `<li class="poster-list-item"
                                    data-location="${encodeURIComponent(obj.location || '')}"
                                    data-file="${encodeURIComponent(obj.file)}"
                                    tabindex="0"
                                    title="${obj.file}">
                                    <span class="poster-file-label">${highlight(
                                        obj.file,
                                        term
                                    )}</span>
                                </li>`;
                        })
                        .join('')}
                </ul>
            </div>
            `;
            })
            .join('');
    },
};

function groupFilesByOwner(files, ownerKey = 'name') {
    const groups = {};
    files.forEach((fileObj) => {
        const owner = fileObj[ownerKey] || 'Unknown';
        if (!groups[owner]) groups[owner] = [];
        groups[owner].push(fileObj);
    });
    return groups;
}

// --- Only builds search input/results/toggle
function buildPosterSearchUI() {
    // Only build inside the .poster-search-content
    const content = document.querySelector('.poster-search-card .poster-search-content');
    if (!content) return;

    content.innerHTML = '';

    // === Controls Row ===
    const controlsRow = document.createElement('div');
    controlsRow.className = 'poster-search-controls';

    // --- Source Picker (Segmented/Tab)
    const sources = [
        {
            key: 'gdrive',
            label: 'GDrive',
            icon: getIcon('gdrive', { style: 'height:1.2em;vertical-align:-0.2em;' }),
        },
        {
            key: 'custom',
            label: 'Custom',
            icon: getIcon('custom', { style: 'height:1.2em;vertical-align:-0.2em;' }),
        },
        {
            key: 'assets',
            label: 'Assets',
            icon: getIcon('assets', { style: 'height:1.2em;vertical-align:-0.2em;' }),
        },
    ];
    const sourcePicker = document.createElement('div');
    sourcePicker.className = 'poster-source-picker';
    sources.forEach((src) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'source-picker-btn';
        btn.dataset.source = src.key;
        btn.innerHTML = `${src.icon}<span>${src.label}</span>`;
        sourcePicker.appendChild(btn);
    });
    controlsRow.appendChild(sourcePicker);

    // --- Sort Selector
    const sortSelector = document.createElement('select');
    sortSelector.className = 'poster-sort-selector';
    [
        { value: 'priority-asc', label: 'Priority ↑' },
        { value: 'priority-desc', label: 'Priority ↓' },
        { value: 'alpha', label: 'A-Z' },
        { value: 'alpha-desc', label: 'Z-A' },
        { value: 'date', label: 'Date Added' }, // still a stub for now
    ].forEach((opt) => {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = opt.label;
        sortSelector.appendChild(option);
    });
    controlsRow.appendChild(sortSelector);

    // --- View Mode Selector
    const viewModes = [
        { key: 'grid', icon: getIcon('mi:grid_view'), label: 'Grid' },
        { key: 'list', icon: getIcon('mi:list'), label: 'List' },
    ];
    const viewModeGroup = document.createElement('div');
    viewModeGroup.className = 'poster-view-mode-group';
    viewModes.forEach((mode) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'view-mode-btn';
        btn.dataset.view = mode.key;
        btn.innerHTML = `${mode.icon}`;
        btn.title = mode.label;
        viewModeGroup.appendChild(btn);
    });
    controlsRow.appendChild(viewModeGroup);

    content.appendChild(controlsRow);

    // === Search Bar ===
    const searchBar = document.createElement('input');
    searchBar.type = 'text';
    searchBar.id = IDS.searchInput;
    searchBar.className = 'input poster-search-bar';
    searchBar.placeholder = 'Search posters in GDrive...'; // Will be updated by source picker
    searchBar.autocomplete = 'off';
    searchBar.spellcheck = false;
    content.appendChild(searchBar);

    // === Results Area ===
    const resultsDiv = document.createElement('div');
    resultsDiv.id = IDS.searchResults;
    resultsDiv.className = 'poster-search-results';
    content.appendChild(resultsDiv);
}

function getById(id) {
    return document.getElementById(id);
}
function highlight(str, term) {
    if (!term) return str;
    const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return str.replace(regex, `<span class="highlight">$1</span>`);
}
function materialIcon(name, style = '') {
    return `<span class="material-icons" style="vertical-align:middle;${style}">${name}</span>`;
}

function setupSearchControls() {
    const sourceButtons = document.querySelectorAll('.source-picker-btn');
    const searchBar = document.getElementById(IDS.searchInput);
    const sortSelector = document.querySelector('.poster-sort-selector');
    const viewBtns = document.querySelectorAll('.view-mode-btn');

    // --- Source Picker click
    sourceButtons.forEach((btn) => {
        btn.onclick = () => {
            sourceButtons.forEach((b) => b.classList.remove('active'));
            btn.classList.add('active');
            currentSource = btn.dataset.source;

            // Change placeholder text contextually
            if (searchBar) {
                if (currentSource === 'gdrive')
                    searchBar.placeholder = 'Search posters in GDrive...';
                else if (currentSource === 'custom')
                    searchBar.placeholder = 'Search posters in Custom Sources...';
                else if (currentSource === 'assets')
                    searchBar.placeholder = 'Search posters in Assets Directory...';
            }
            renderPosterResults(searchBar.value);
        };
    });
    // Set default source active
    if (sourceButtons.length) {
        sourceButtons.forEach((b) => b.classList.remove('active'));
        sourceButtons[0].classList.add('active');
        currentSource = sourceButtons[0].dataset.source;
    }

    // --- Sort Selector change
    if (sortSelector) {
        sortSelector.value = currentSort; // keep in sync
        sortSelector.addEventListener('change', (e) => {
            currentSort = sortSelector.value;
            renderPosterResults(searchBar.value);
        });
    }

    // --- View mode buttons
    viewBtns.forEach((btn) => {
        btn.onclick = () => {
            viewBtns.forEach((b) => b.classList.remove('active'));
            btn.classList.add('active');
            currentView = btn.dataset.view;
            renderPosterResults(searchBar.value);
        };
    });
    // Set default view
    if (viewBtns.length) {
        viewBtns.forEach((b) => b.classList.remove('active'));
        viewBtns[0].classList.add('active');
        currentView = viewBtns[0].dataset.view;
    }

    // --- Search Bar input (live filter)
    if (searchBar) {
        searchBar.value = '';
        searchBar.addEventListener('input', (e) => {
            renderPosterResults(e.target.value);
        });
        // Optional: Submit on Enter for accessibility
        searchBar.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                renderPosterResults(searchBar.value);
            }
        });
        searchBar.focus();
    }
}

function renderPosterResults(term) {
    // Choose files based on source
    let files = [];
    if (currentSource === 'gdrive') files = gdriveFiles;
    else if (currentSource === 'custom') files = customFiles;
    else if (currentSource === 'assets')
        files = assetsFiles.map((f) => ({ file: f, name: 'Assets', location: assetsDir }));

    files = files.filter((obj) => obj.file && isImageFile(obj.file));

    // Filter by search term
    if (!term || !term.trim()) {
        const resultsDiv = getById(IDS.searchResults);
        resultsDiv.innerHTML = `<div class="poster-search-empty">Type to search for posters…</div>`;
        return;
    }

    // Filter by search term
    files = files.filter((obj) => obj.file && obj.file.toLowerCase().includes(term.toLowerCase()));

    // --- Sorting
    if (currentSort === 'alpha') {
        files = files.sort((a, b) => a.file.localeCompare(b.file));
    } else if (currentSort === 'alpha-desc') {
        files = files.sort((a, b) => b.file.localeCompare(a.file));
    } else if (currentSort === 'priority-asc') {
        files = files.sort((a, b) => {
            const pa = priorityOrder[a.location] ?? 9999;
            const pb = priorityOrder[b.location] ?? 9999;
            if (pa !== pb) return pa - pb;
            return a.file.localeCompare(b.file);
        });
    } else if (currentSort === 'priority-desc') {
        files = files.sort((a, b) => {
            const pa = priorityOrder[a.location] ?? -1;
            const pb = priorityOrder[b.location] ?? -1;
            if (pa !== pb) return pb - pa;
            return a.file.localeCompare(b.file);
        });
    }
    // (date: still a stub!)

    // Render using current view
    const resultsDiv = getById(IDS.searchResults);
    resultsDiv.innerHTML = PosterSearchViews[currentView](files, term);

    // Attach event listeners (hover/click)
    setupPosterSearchResultEvents();
}

function setupPosterSearchResultEvents() {
    const resultsDiv = getById(IDS.searchResults);
    if (!resultsDiv) return;

    // Modal on click (both grid and list)
    resultsDiv.onclick = (e) => {
        const item = e.target.closest('.poster-grid-item, .poster-list-item');
        if (item) {
            const location = decodeURIComponent(item.getAttribute('data-location') || '');
            const path = decodeURIComponent(item.getAttribute('data-file') || '');
            const caption = item.getAttribute('title') || '';
            if (location && path) {
                const url = fetchPosterPreviewUrl(location, path);
                showImageModal(url, caption);
            }
            return false;
        }
    };

    // Only enable hover preview in LIST view
    if (currentView === 'list') {
        resultsDiv.onmouseover = (e) => {
            const listItem = e.target.closest('.poster-list-item');
            if (listItem) {
                const location = decodeURIComponent(listItem.getAttribute('data-location') || '');
                const path = decodeURIComponent(listItem.getAttribute('data-file') || '');
                if (location && path) {
                    const url = `/api/preview-poster?location=${encodeURIComponent(
                        location
                    )}&path=${encodeURIComponent(path)}&thumb=1`;
                    hoverPreviewImg.src = url;
                    hoverPreviewImg.style.display = 'block';
                }
            }
        };
        resultsDiv.onmousemove = (e) => {
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
        };
        resultsDiv.onmouseout = (e) => {
            if (e.target.closest('.poster-list-item')) {
                hoverPreviewImg.style.display = 'none';
            }
        };
    } else {
        // Disable hover preview in grid view
        resultsDiv.onmouseover = null;
        resultsDiv.onmousemove = null;
        resultsDiv.onmouseout = null;
        if (hoverPreviewImg) hoverPreviewImg.style.display = 'none';
    }
}


function showImageModal(imgSrc, caption) {
    // Parse title from caption (filename)
    let fileName = caption || '';
    fileName = fileName.replace(/\.(jpg|jpeg|png)$/i, '');
    // Remove all {...} blocks
    let cleanTitle = fileName.replace(/\{(tmdb|tvdb|imdb-tt)[^}]+\}/gi, '').trim();
    // Remove trailing - Season X etc from title
    cleanTitle = cleanTitle.replace(/-+\s*Season.*$/i, '').trim();
    // Extract (Name, Year)
    const titleMatch = cleanTitle.match(/^(.*?)(?:\s*\((\d{4})\))?$/);
    const showTitle = titleMatch && titleMatch[1] ? titleMatch[1].trim() : cleanTitle;
    const showYear = titleMatch && titleMatch[2] ? titleMatch[2] : '';
    const modalTitle = showTitle + (showYear ? ` (${showYear})` : '');

    openModal({
        schema: [
            {
                key: 'poster',
                label: '', // No field label needed
                type: 'poster',
                value: imgSrc,
                caption: caption || '',
            },
        ],
        entry: { poster: imgSrc },
        title: modalTitle,
        footerButtons: [],
        modalClass: 'modal-content-fit',
    });
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

async function fetchAllFileLists() {
    config = await fetchConfig();
    buildPriorityOrderFromConfig();

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
                        <span class="copy-btn-default">${getIcon('mi:content_copy', {
                            style: 'font-size:1.2em;margin-right:3px;vertical-align:middle;',
                        })}Copy</span>
<span class="copy-btn-copied" style="display:none;">${getIcon('mi:check', {
                                style: 'font-size:1.2em;margin-right:3px;vertical-align:middle;',
                            })}Copied</span>
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
    const searchInput = getById(IDS.searchInput);
    const searchResults = getById(IDS.searchResults);

    // Defensive: Only proceed if all key DOM elements exist
    if (!toggle || !label || !searchInput || !searchResults) {
        console.warn('setupEventListeners: Required DOM elements missing.');
        return;
    }

    toggle.checked = false;
    label.textContent = 'GDrive Locations';
    toggle.onchange = () => {
        label.textContent = toggle.checked ? 'Assets Directory' : 'GDrive Locations';
        searchInput.value = '';
        searchResults.innerHTML = '';
    };

    document.addEventListener('keydown', (e) => {
        const modal = document.getElementById('img-preview-modal');
        if ((e.key === '/' && !e.ctrlKey) || (e.key === 'f' && e.ctrlKey)) {
            e.preventDefault();
            searchInput.focus();
        } else if (e.key === 'Escape') {
            if (modal) closeImageModal();
            else searchInput.value = '';
        } else if (e.key === 'Enter' && document.activeElement === searchInput) {
            e.preventDefault();
            renderResults(searchInput.value.trim().toLowerCase());
        }
    });

    searchInput.onkeypress = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            renderResults(e.target.value.trim().toLowerCase());
        }
    };

    searchResults.addEventListener('click', (e) => {
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

        const labelEl = e.target.closest('.poster-file-label');
        if (labelEl) {
            let location = decodeURIComponent(labelEl.getAttribute('data-location') || '');
            let path = decodeURIComponent(labelEl.getAttribute('data-file') || '');
            let caption = labelEl.textContent;
            if (location && path) {
                const url = fetchPosterPreviewUrl(location, path);
                showImageModal(url, caption);
            }
            return false;
        }
    });

    searchResults.addEventListener('mouseover', (e) => {
        const labelEl = e.target.closest('.poster-file-label');
        if (labelEl) {
            let location = decodeURIComponent(labelEl.getAttribute('data-location') || '');
            let path = decodeURIComponent(labelEl.getAttribute('data-file') || '');
            if (location && path) {
                const url = `/api/preview-poster?location=${encodeURIComponent(
                    location
                )}&path=${encodeURIComponent(path)}&thumb=1`;
                hoverPreviewImg.src = url;
                hoverPreviewImg.style.display = 'block';
            }
        }
    });
    searchResults.addEventListener('mousemove', (e) => {
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
    searchResults.addEventListener('mouseout', (e) => {
        if (e.target.closest('.poster-file-label')) {
            hoverPreviewImg.style.display = 'none';
        }
    });
}

function ensurePosterSearchDOM() {
    const container = document.getElementById('viewFrame');
    if (!container) return;

    // Remove all children except loader modal, if any
    [...container.children].forEach((child) => {
        if (!child.classList.contains('loader-modal')) {
            container.removeChild(child);
        }
    });

    // Root wrapper
    let root = container.querySelector('.poster-search-root');
    if (!root) {
        root = document.createElement('div');
        root.className = 'poster-search-root';
        container.appendChild(root);
    } else {
        // Clean up any children in root except card
        [...root.children].forEach((child) => {
            if (!child.classList.contains('poster-search-card')) {
                root.removeChild(child);
            }
        });
    }

    // Main card
    let card = root.querySelector('.poster-search-card');
    if (!card) {
        card = document.createElement('div');
        card.className = 'poster-search-card';
        // Content wrapper
        const content = document.createElement('div');
        content.className = 'poster-search-content';
        card.appendChild(content);
        root.appendChild(card);
    }

    // If card exists but was not in root (rare edge case), move it in
    let orphanCard = container.querySelector(
        '.poster-search-card:not(.poster-search-root .poster-search-card)'
    );
    if (orphanCard && orphanCard !== card) {
        root.appendChild(orphanCard);
    }
}

export async function initPosterSearch() {
    ensurePosterSearchDOM();
    showLoaderModal(true, 1);
    setupHoverPreview();
    buildPosterSearchUI();

    setupSearchControls();

    // Now safe to reference these
    const searchResults = document.getElementById(IDS.searchResults);
    const searchInput = document.getElementById(IDS.searchInput);
    if (searchResults) searchResults.innerHTML = '';
    if (searchInput) searchInput.value = '';

    if (searchInput) searchInput.focus();

    await fetchAllFileLists();
    setupEventListeners();
    showLoaderModal(false);
}
