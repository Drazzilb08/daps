import {
    renderLabelarrCustomField,
    renderUpgradinatorrCustomField,
    renderReplacerrCustomField,
    renderGDriveCustomField,
} from './renders/custom_renders.js';
import {
    renderNumberField,
    renderJsonField,
    renderTextField,
    renderPasswordField,
    renderTextareaField,
} from './renders/input_renders.js';
import {
    renderDirListOptionsField,
    renderDirListDragDropField,
    renderDirListField,
    renderDirField,
    renderDirPickerField,
} from './renders/dir_renders.js';
import {
    renderGdrivePresetsField,
    renderScheduleField,
    renderInstanceDropdownField,
    renderCheckBoxField,
    renderDropdownField,
    renderHolidayPresetsField,
    renderHolidayScheduleField,
} from './renders/select_renders.js';
import { renderColorField, renderColorListField } from './renders/color_renders.js';
import { renderInstancesField } from './renders/instance_renders.js';


import { getIcon } from '../util.js';

function renderPosterField(field) {
    const wrap = document.createElement('div');
    wrap.className = 'modal-poster-preview';

    // Remove extension
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
    const showTitle = titleYearMatch && titleYearMatch[1] ? titleYearMatch[1].trim() : titleYear;
    const showYear = titleYearMatch && titleYearMatch[2] ? titleYearMatch[2] : '';

    // Set modal title if possible
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

    // Season
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

    if (idsRow.children.length) wrap.appendChild(idsRow);

    return wrap;
}

// -------- FIELD DISPATCHER ----------

export function renderField(field, value, config, rootConfig) {
    switch (field.type) {
        case 'dropdown':
            return renderDropdownField(field, value, config);
        case 'textarea':
            return renderTextareaField(field, value, config);
        case 'json':
            return renderJsonField(field, value, config);
        case 'number':
            return renderNumberField(field, value, config);
        case 'dir':
            return renderDirField(field, value, config);
        case 'dir_list':
            return renderDirListField(field, value, config);
        case 'dir_list_drag_drop':
            return renderDirListDragDropField(field, value, config);
        case 'dir_list_options':
            return renderDirListOptionsField(field, value, config);
        case 'password':
            return renderPasswordField(field, value, config);
        case 'color_list':
            return renderColorListField(field, value, config);
        case 'instances':
            return renderInstancesField(field, value, config, rootConfig);
        case 'check_box':
            return renderCheckBoxField(field, value, config);
        case 'instance_dropdown':
            return renderInstanceDropdownField(field, value, config, rootConfig);
        case 'gdrive_custom':
            return renderGDriveCustomField(field, value, config);
        case 'replacerr_custom':
            return renderReplacerrCustomField(field, value, config);
        case 'upgradinatorr_custom':
            return renderUpgradinatorrCustomField(field, value, config, rootConfig);
        case 'labelarr_custom':
            return renderLabelarrCustomField(field, value, config, rootConfig);
        case 'dir_picker':
            return renderDirPickerField(field, value, config);
        case 'schedule':
            return renderScheduleField(field, value, config);
        case 'holiday_schedule':
            return renderHolidayScheduleField(field, value);
        case 'color':
            return renderColorField(field, value, config);
        case 'gdrive_presets':
            return renderGdrivePresetsField(field, value, config);
        case 'holiday_presets':
            return renderHolidayPresetsField(field, value, config);
        case 'poster':
            return renderPosterField(field);
        default:
            return renderTextField(field, value, config);
    }
}
