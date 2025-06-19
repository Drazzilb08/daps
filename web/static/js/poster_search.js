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

function renderStatsTable(statsArr, totals, title, isAssets)
{
    if (!statsArr.length) return '';
    let rows = statsArr.map(s =>
    {
        let percent = totals.files ? (s.file_count / totals.files * 100) : 0;
        let folderCol = `<span class="gdrive-name">${s.name}</span>`;
        return `<tr>
        <td>${folderCol}</td>
        <td>${s.file_count || 0}</td>
        <td>${formatBytes(s.size_bytes || 0)}</td>
        <td>
            <div class="stat-bar-bg">
                <div class="stat-bar-inner" style="width:${percent}%;"></div>
            </div>
            <span class="stat-bar-percent">${percent.toFixed(1)}%</span>
        </td>
    </tr>`;
    }).join('\n');
    return `
    <div class="stats-title">${title}</div>
    <table class="stats-table">
        <thead>
            <tr>
                <th>Folder</th>
                <th>Files</th>
                <th>Size</th>
                <th>% of Total</th>
            </tr>
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
    let gdriveStatRaw = await Promise.all(gdriveLocations.map(async l =>
    {
        let stats = await fetchStats(l.location);
        return stats && !stats.error && typeof stats.file_count === 'number' ?
            {
                ...stats,
                name: l.name
            } :
            null;
    }));
    gdriveStats = gdriveStatRaw.filter(Boolean);
    gdriveTotals.files = gdriveStats.reduce((sum, s) => sum + s.file_count, 0);
    gdriveTotals.size = gdriveStats.reduce((sum, s) => sum + s.size_bytes, 0);
    gdriveFiles = [];
    gdriveStats.forEach(s =>
    {
        (s.files || []).forEach(f => gdriveFiles.push(
        {
            file: f,
            name: s.name
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
    // Render stats tables (hidden by default)
    document.getElementById('poster-gdrive-stats').innerHTML = renderStatsTable(gdriveStats, gdriveTotals, "GDrive Locations", false);
    document.getElementById('poster-assets-stats').innerHTML = renderStatsTable(
        assetsStats && !assetsStats.error && typeof assetsStats.file_count === 'number' ? [
        {
            name: "Assets Dir",
            ...assetsStats
        }] : [],
        assetsTotals,
        "Assets Directory",
        true
    );
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
    if (hoverPreview.style.display === 'block')
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