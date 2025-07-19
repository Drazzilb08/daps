export function renderColorListField(field, value = [], config) {
    // Should show poster border preview?
    const shouldPreview = String(field.preview) === 'true';

    // Store available posters (cached)
    let posterAssets = [];
    let posterFetchPromise = null;

    // Fetch and cache all poster asset filenames
    function fetchPosterAssets() {
        if (posterFetchPromise) return posterFetchPromise;
        posterFetchPromise = fetch('/api/poster_assets')
            .then((r) => r.json())
            .then((arr) => (Array.isArray(arr) ? arr : []))
            .then((arr) => (posterAssets = arr))
            .catch(() => (posterAssets = []));
        return posterFetchPromise;
    }

    // Utility: Pick random poster asset, never default to poster.jpg
    function getRandomPoster() {
        if (posterAssets.length) {
            return (
                '/web/static/assets/' +
                posterAssets[Math.floor(Math.random() * posterAssets.length)]
            );
        }
        return null;
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

    // Detect artwork bounds inside a white border
    function detectArtworkBounds(img, cb) {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(0, 0, img.width, img.height).data;
        const whiteT = 235,
            pad = 0;
        function isWhite(i) {
            const r = data[i],
                g = data[i + 1],
                b = data[i + 2];
            return (
                r > whiteT &&
                g > whiteT &&
                b > whiteT &&
                Math.abs(r - g) < 14 &&
                Math.abs(r - b) < 14 &&
                Math.abs(g - b) < 14
            );
        }
        let left = 0,
            right = img.width - 1,
            top = 0,
            bottom = img.height - 1;
        outer: for (; left < img.width; ++left) {
            for (let y = 0; y < img.height; ++y)
                if (!isWhite((y * img.width + left) * 4)) break outer;
        }
        outer: for (; right > left; --right) {
            for (let y = 0; y < img.height; ++y)
                if (!isWhite((y * img.width + right) * 4)) break outer;
        }
        outer: for (; top < img.height; ++top) {
            for (let x = left; x <= right; ++x)
                if (!isWhite((top * img.width + x) * 4)) break outer;
        }
        outer: for (; bottom > top; --bottom) {
            for (let x = left; x <= right; ++x)
                if (!isWhite((bottom * img.width + x) * 4)) break outer;
        }
        left = Math.max(0, left - pad);
        right = Math.min(img.width - 1, right + pad);
        top = Math.max(0, top - pad);
        bottom = Math.min(img.height - 1, bottom + pad);
        cb({ left, right, top, bottom, width: right - left + 1, height: bottom - top + 1 });
    }

    // Canvas: Replace white border with color
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

    // Canvas: Crop to detected artwork only (no border)
    function renderNoBorderPreview(imgUrl, callback, options = {}) {
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        img.onload = function () {
            detectArtworkBounds(img, (bounds) => {
                const canvas = document.createElement('canvas');
                canvas.width = bounds.width;
                canvas.height = bounds.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(
                    img,
                    bounds.left,
                    bounds.top,
                    bounds.width,
                    bounds.height,
                    0,
                    0,
                    bounds.width,
                    bounds.height
                );
                callback(canvas);
            });
        };
        img.src = imgUrl;
    }

    // Initialize posters, and color objects
    async function ensureInitialPostersAndRender() {
        await fetchPosterAssets();
        if (!Array.isArray(value)) value = [];
        value = value.map((v) =>
            typeof v === 'string'
                ? { color: v, poster: getRandomPoster() }
                : v && v.color && !v.poster
                ? { color: v.color, poster: getRandomPoster() }
                : v
        );
        if (value.length && value.some((v) => !v.poster)) {
            value = value.map((v) => (v.poster ? v : { ...v, poster: getRandomPoster() }));
        }
        renderColors();
        if (shouldPreview) updateBorderPreview();
    }

    // UI Structure
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
        const poster = getRandomPoster();
        if (!poster) return;
        value.push({ color: '#ffffff', poster });
        renderColors();
        if (config) config[field.key] = value.slice();
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

    function renderColors() {
        colorsDiv.innerHTML = '';
        value.forEach((v, idx) => {
            const swatch = document.createElement('div');
            swatch.className = 'color-picker-swatch';

            const input = document.createElement('input');
            input.type = 'color';
            input.value = v.color || '#ffffff';
            input.addEventListener('change', () => {
                value[idx].color = input.value;
                if (config) config[field.key] = value.slice();
                if (shouldPreview) updateBorderPreview();
            });
            input.addEventListener('input', () => {
                value[idx].color = input.value;
                if (shouldPreview) updateBorderPreview();
            });

            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'remove-btn';
            removeBtn.textContent = '−';
            removeBtn.onclick = () => {
                value.splice(idx, 1);
                renderColors();
                if (config) config[field.key] = value.slice();
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
        // Remove any old notifications before re-adding
        let oldNote = inputWrap.querySelector('.no-border-notification');
        if (oldNote) oldNote.remove();

        if (value.length && posterAssets.length) {
            value.forEach((v) => {
                if (!v.poster) return;
                const previewDiv = document.createElement('div');
                previewDiv.className = 'poster-preview-container';
                renderPosterPreviewCanvas(
                    v.poster,
                    v.color || '#ffffff',
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
            const poster = getRandomPoster();
            if (!poster) return;
            renderNoBorderPreview(
                poster,
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
            // Insert notification before help/description
            inputWrap.insertBefore(note, help);
        }
    }

    row.appendChild(inputWrap);
    // Initial fetch and migration—set up all posters on first load!
    ensureInitialPostersAndRender();
    return row;
}

export function renderColorField(field, value, config) {
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
    input.value = value && typeof value === 'string' ? value : '#ffffff';
    input.addEventListener('change', () => {
        if (config) config[field.key] = input.value;
    });
    input.addEventListener('input', () => {
        if (config) config[field.key] = input.value;
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
