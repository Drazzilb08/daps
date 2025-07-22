import { fetchPosterAssetList } from '../../api.js';

export function renderColorListField(field, immediateData, config) {
    // 'immediateData' is always the config object for the module
    // 'config' is also the module config (redundant but matches dispatcher)

    // If the field doesn't exist, initialize it as an empty array
    if (!Array.isArray(immediateData[field.key])) {
        immediateData[field.key] = [];
    }
    let colorArray = immediateData[field.key].slice();

    // Should show poster border preview?
    const shouldPreview = String(field.preview) === 'true';

    // Poster asset state
    let posterAssets = [];
    let posterFetchPromise = null;

    function fetchPosterAssets() {
        if (posterFetchPromise) return posterFetchPromise;
        posterFetchPromise = fetchPosterAssetList()
            .then((arr) => (Array.isArray(arr) ? arr : []))
            .then((arr) => (posterAssets = arr))
            .catch(() => (posterAssets = []));
        return posterFetchPromise;
    }

    function getPosterByIndex(idx) {
        if (!posterAssets.length) return null;
        return '/web/static/assets/' + posterAssets[idx % posterAssets.length];
    }

    // Utility: Convert hex to RGB
    function hexToRgb(hex) {
        hex = hex.replace(/^#/, '');
        if (hex.length === 3)
            hex = hex
                .split('')
                .map((x) => x + x)
                .join('');
        const num = parseInt(hex, 16);
        return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
    }

    // --- Canvas border coloring ---
    function renderPosterPreviewCanvas(imgUrl, borderColor, callback, options = {}) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        img.onload = function () {
            const width = options.width || img.width;
            const height = options.height || img.height;
            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);
            const imgData = ctx.getImageData(0, 0, width, height);
            const d = imgData.data;
            const rgb = hexToRgb(borderColor);
            const tolerance = 235;
            const border = 26;
            for (let y = 0; y < height; ++y) {
                for (let x = 0; x < width; ++x) {
                    if (x < border || x >= width - border || y < border || y >= height - border) {
                        const i = (y * width + x) * 4;
                        if (
                            d[i] > tolerance &&
                            d[i + 1] > tolerance &&
                            d[i + 2] > tolerance &&
                            Math.abs(d[i] - d[i + 1]) < 18 &&
                            Math.abs(d[i] - d[i + 2]) < 18 &&
                            Math.abs(d[i + 1] - d[i + 2]) < 18
                        ) {
                            d[i] = rgb.r;
                            d[i + 1] = rgb.g;
                            d[i + 2] = rgb.b;
                        }
                    }
                }
            }
            ctx.putImageData(imgData, 0, 0);
            callback(canvas);
        };
        img.src = imgUrl;
    }

    // --- UI Structure ---
    const row = document.createElement('div');
    row.className = 'settings-field-row field-dir-list field-color-list';

    const labelCol = document.createElement('div');
    labelCol.className = 'settings-field-labelcol dirlist-label-col';
    const label = document.createElement('label');
    label.textContent = field.label || 'Colors';
    labelCol.appendChild(label);
    const filler = document.createElement('div');
    filler.style.flex = '1';
    labelCol.appendChild(filler);

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'btn add-btn';
    addBtn.textContent = 'Add Color';
    addBtn.onclick = async () => {
        await fetchPosterAssets();
        colorArray.push('#ffffff');
        saveConfig();
        renderColors();
        if (shouldPreview) updateBorderPreview();
    };
    labelCol.appendChild(addBtn);
    row.appendChild(labelCol);

    const inputWrap = document.createElement('div');
    inputWrap.className = 'settings-field-inputwrap dirlist-input-col';
    const colorsDiv = document.createElement('div');
    colorsDiv.className = 'color-list-container';
    inputWrap.appendChild(colorsDiv);

    let previewWrap = null;
    if (shouldPreview) {
        previewWrap = document.createElement('div');
        previewWrap.className = 'poster-border-preview-wrap';
        inputWrap.appendChild(previewWrap);
    }

    // --- Help/Description block (always present, always at the bottom) ---
    const help = document.createElement('div');
    help.className = 'field-help-text';
    help.textContent = field.description || '';
    inputWrap.appendChild(help);

    function saveConfig() {
        // Save only flat array
        immediateData[field.key] = colorArray.slice();
        if (config) config[field.key] = colorArray.slice();
    }

    function renderColors() {
        colorsDiv.innerHTML = '';
        colorArray.forEach((color, idx) => {
            const swatch = document.createElement('div');
            swatch.className = 'color-picker-swatch';

            const input = document.createElement('input');
            input.type = 'color';
            input.value = color || '#ffffff';
            input.addEventListener('change', () => {
                colorArray[idx] = input.value;
                saveConfig();
                renderColors();
                if (shouldPreview) updateBorderPreview();
            });
            input.addEventListener('input', () => {
                colorArray[idx] = input.value;
                saveConfig();
                if (shouldPreview) updateBorderPreview();
            });

            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'remove-btn';
            removeBtn.textContent = '−';
            removeBtn.onclick = () => {
                colorArray.splice(idx, 1);
                saveConfig();
                renderColors();
                if (shouldPreview) updateBorderPreview();
            };

            swatch.appendChild(input);
            swatch.appendChild(removeBtn);
            colorsDiv.appendChild(swatch);
        });
        if (shouldPreview) updateBorderPreview();
    }

    function updateBorderPreview() {
        if (!previewWrap) return;
        previewWrap.innerHTML = '';
        let oldNote = inputWrap.querySelector('.no-border-notification');
        if (oldNote) oldNote.remove();

        if (colorArray.length && posterAssets.length) {
            colorArray.forEach((color, idx) => {
                const poster = getPosterByIndex(idx);
                if (!poster) return;
                const previewDiv = document.createElement('div');
                previewDiv.className = 'poster-preview-container';
                renderPosterPreviewCanvas(
                    poster,
                    color || '#ffffff',
                    (canvas) => {
                        canvas.className = 'poster-preview-img';
                        previewDiv.appendChild(canvas);
                    },
                    { width: 156, height: 234 }
                );
                previewWrap.appendChild(previewDiv);
            });
        } else if (posterAssets.length) {
            // No colors: show blank artwork, random poster
            const previewDiv = document.createElement('div');
            previewDiv.className = 'poster-preview-container';
            const poster = getPosterByIndex(0);
            if (!poster) return;
            renderPosterPreviewCanvas(
                poster,
                '#ffffff',
                (canvas) => {
                    canvas.className = 'poster-preview-img';
                    previewDiv.appendChild(canvas);
                },
                { width: 156, height: 234 }
            );
            previewWrap.appendChild(previewDiv);

            // --- Add notification above help text ---
            const note = document.createElement('div');
            note.className = 'no-border-notification';
            note.textContent = 'No colors selected. The white border will be removed.';
            inputWrap.insertBefore(note, help);
        }
    }

    row.appendChild(inputWrap);

    // On load, fetch assets and render
    (async () => {
        await fetchPosterAssets();
        renderColors();
        if (shouldPreview) updateBorderPreview();
    })();

    return row;
}

export function renderColorField(field, immediateData, moduleConfig) {
    // Row structure
    const row = document.createElement('div');
    row.className = 'settings-field-row field-color';

    // Label column
    const labelCol = document.createElement('div');
    labelCol.className = 'settings-field-labelcol';

    const label = document.createElement('label');
    label.textContent = field.label || 'Color';
    labelCol.appendChild(label);

    row.appendChild(labelCol);

    // Input column
    const inputWrap = document.createElement('div');
    inputWrap.className = 'settings-field-inputwrap';

    // Color input swatch
    const swatch = document.createElement('div');
    swatch.className = 'color-picker-swatch';

    const input = document.createElement('input');
    input.type = 'color';
    input.value =
        immediateData[field.key] && typeof immediateData[field.key] === 'string'
            ? immediateData[field.key]
            : '#ffffff';
    input.addEventListener('change', () => {
        immediateData[field.key] = input.value;
    });
    input.addEventListener('input', () => {
        immediateData[field.key] = input.value;
    });
    swatch.appendChild(input);

    inputWrap.appendChild(swatch);

    // Field description/help text
    if (field.description) {
        const help = document.createElement('div');
        help.className = 'field-help-text';
        help.textContent = field.description;
        inputWrap.appendChild(help);
    }

    row.appendChild(inputWrap);
    return row;
}
