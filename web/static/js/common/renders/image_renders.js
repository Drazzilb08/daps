import { getIcon, attachTooltip, showToast } from '../../util.js';

export function renderPosterField(field) {
    const wrap = document.createElement('div');
    wrap.className = 'modal-poster-preview';

    // Remove extension for name parsing
    let fileName = field.caption || '';
    fileName = fileName.replace(/\.(jpg|jpeg|png)$/i, '');

    // Extract IDs
    const tmdbMatch = fileName.match(/\{tmdb-(\d+)\}/i);
    const tvdbMatch = fileName.match(/\{tvdb-(\d+)\}/i);
    const imdbMatch = fileName.match(/\{imdb-tt(\d+)\}/i);
    const seasonMatch = fileName.match(/season[\s_]?(\d{1,2})/i) || fileName.match(/S(\d{1,2})/i);

    // Get display title and year (for modal title only)
    let titleYear = fileName.replace(/\{(tmdb|tvdb|imdb-tt)[^}]+\}/gi, '').trim();
    titleYear = titleYear.replace(/-+\s*Season.*$/i, '').trim();
    const titleYearMatch = titleYear.match(/^(.*?)(?:\s*\((\d{4})\))?$/);

    // Set modal title if possible (for robustness)
    const showTitle =
        (titleYearMatch && titleYearMatch[1] ? titleYearMatch[1].trim() : titleYear) || '';
    const showYear = titleYearMatch && titleYearMatch[2] ? titleYearMatch[2] : '';
    const modalTitle = document.querySelector('.modal-content-fit .modal-title');
    if (modalTitle) {
        modalTitle.textContent = showTitle + (showYear ? ` (${showYear})` : '');
    }

    // Poster image
    const img = document.createElement('img');
    img.className = 'modal-poster-img';
    img.src = field.value || '';
    img.alt = showTitle || 'Poster Preview';
    wrap.appendChild(img);

    // Season (if present)
    if (seasonMatch) {
        const seasonDiv = document.createElement('div');
        seasonDiv.className = 'modal-poster-season';
        seasonDiv.textContent = `Season ${seasonMatch[1]}`;
        wrap.appendChild(seasonDiv);
    }

    // --- ID Links and icons (in a row, icons ARE links)
    const idsRow = document.createElement('div');
    idsRow.className = 'modal-poster-ids';

    // IMDb
    if (imdbMatch) {
        const imdbNum = imdbMatch[1];
        const imdbSpan = document.createElement('span');
        imdbSpan.innerHTML = `<a href="https://www.imdb.com/title/tt${imdbNum}" target="_blank" rel="noopener" class="id-link">
                ${getIcon('imdb')}
                <span class="id-label">tt${imdbNum}</span>
            </a>`;
        idsRow.appendChild(imdbSpan);
    }
    // TMDB
    if (tmdbMatch) {
        const tmdbNum = tmdbMatch[1];
        const tmdbSpan = document.createElement('span');
        tmdbSpan.innerHTML = `<a href="https://www.themoviedb.org/movie/${tmdbNum}" target="_blank" rel="noopener" class="id-link">
                ${getIcon('tmdb')}
                <span class="id-label">${tmdbNum}</span>
            </a>`;
        idsRow.appendChild(tmdbSpan);
    }
    // TVDB
    if (tvdbMatch) {
        const tvdbNum = tvdbMatch[1];
        const tvdbSpan = document.createElement('span');
        tvdbSpan.innerHTML = `<a href="https://thetvdb.com/?tab=series&id=${tvdbNum}" target="_blank" rel="noopener" class="id-link">
                ${getIcon('tvdb')}
                <span class="id-label">${tvdbNum}</span>
            </a>`;
        idsRow.appendChild(tvdbSpan);
    }

    // ---- COPY CONTROLS (NOW IN idsRow, right after links) ----
    const controls = document.createElement('div');
    controls.className = 'modal-copy-controls';
    controls.style.display = 'flex';
    controls.style.gap = '0.5em';
    controls.style.alignItems = 'center';

    // Utility for copy button effect and toast
    function setupCopyBtn(btn, text, tooltipLabel, successMsg, failureMsg) {
        let timer = null;
        attachTooltip(btn, tooltipLabel);
        btn.onclick = (e) => {
            e.stopPropagation();
            navigator.clipboard.writeText(text).then(
                () => {
                    btn.innerHTML = getIcon('mi:check');
                    attachTooltip(btn, 'Copied!');
                    showToast(successMsg, 'success');
                    clearTimeout(timer);
                    timer = setTimeout(() => {
                        btn.innerHTML = getIcon('mi:content_copy');
                        attachTooltip(btn, tooltipLabel);
                    }, 1200);
                },
                () => {
                    btn.innerHTML = getIcon('mi:close');
                    attachTooltip(btn, 'Failed!');
                    showToast(failureMsg, 'error');
                    clearTimeout(timer);
                    timer = setTimeout(() => {
                        btn.innerHTML = getIcon('mi:content_copy');
                        attachTooltip(btn, tooltipLabel);
                    }, 1200);
                }
            );
        };
    }

    // Copy file name button
    const btnName = document.createElement('button');
    btnName.type = 'button';
    btnName.className = 'btn--icon';
    btnName.innerHTML = getIcon('mi:content_copy');
    setupCopyBtn(
        btnName,
        field.caption || '',
        'Copy file name',
        'File name copied to clipboard.',
        'Failed to copy file name.'
    );
    controls.appendChild(btnName);

    // Copy file path button
    const btnPath = document.createElement('button');
    btnPath.type = 'button';
    btnPath.className = 'btn--icon';
    btnPath.innerHTML = getIcon('mi:folder_open');
    setupCopyBtn(
        btnPath,
        field.value || '',
        'Copy full file path',
        'File path copied to clipboard.',
        'Failed to copy file path.'
    );
    controls.appendChild(btnPath);

    // --- Add controls at the end of the ID row ---
    idsRow.appendChild(controls);

    if (idsRow.children.length) wrap.appendChild(idsRow);

    return wrap;
}
