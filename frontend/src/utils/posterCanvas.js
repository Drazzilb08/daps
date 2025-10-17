/**
 * Poster canvas processing utility for image manipulation
 * Extracted from ColorListPosterField for reusability across the application
 */

/**
 * Get border thickness for poster canvas operations
 * @returns {number} Border thickness in pixels
 */
const getBorderThickness = () => {
    return 5; // Hardcoded poster border thickness in pixels
};

/**
 * Get poster dimensions for canvas operations
 * @returns {Object} Object with width and height properties
 */
export const getPosterDimensions = () => {
    return {
        width: 156, // Hardcoded poster width in pixels
        height: 234, // Hardcoded poster height in pixels
    };
};

/**
 * Convert hex color to RGB object
 * @param {string} hex - Hex color string
 * @returns {Object} RGB object with r, g, b properties
 */
export function hexToRgb(hex) {
    hex = hex.replace(/^#/, '');
    if (hex.length === 3) {
        hex = hex
            .split('')
            .map(x => x + x)
            .join('');
    }
    const num = parseInt(hex, 16);
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

/**
 * Get poster by index with cycling
 * @param {Array} posterAssets - Array of poster file names
 * @param {number} idx - Index
 * @returns {string|null} Poster URL or null
 */
export function getPosterByIndex(posterAssets, idx) {
    if (!posterAssets.length) return null;
    return `/posters/${posterAssets[idx % posterAssets.length]}`;
}

/**
 * Generate poster preview with color border using canvas
 * @param {string} imgUrl - Image URL
 * @param {string|null} borderColor - Hex color for border, null to remove border
 * @param {Object} options - Canvas options
 * @returns {Promise<string>} Data URL of processed image
 */
export function getPosterPreviewUrl(imgUrl, borderColor, options = {}) {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        // Important: Set crossOrigin before setting src
        img.crossOrigin = 'anonymous';

        img.onload = function () {
            try {
                const width = options.width || img.width;
                const height = options.height || img.height;
                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);

                if (!borderColor) {
                    const borderThickness = getBorderThickness();
                    const cropW = width - borderThickness * 2;
                    const cropH = height - borderThickness * 2;
                    const cropCanvas = document.createElement('canvas');
                    cropCanvas.width = cropW;
                    cropCanvas.height = cropH;
                    const cropCtx = cropCanvas.getContext('2d');
                    cropCtx.drawImage(
                        canvas,
                        borderThickness,
                        borderThickness,
                        cropW,
                        cropH,
                        0,
                        0,
                        cropW,
                        cropH
                    );
                    resolve(cropCanvas.toDataURL());
                    return;
                }

                const borderThickness = getBorderThickness();
                const imgData = ctx.getImageData(0, 0, width, height);
                const data = imgData.data;
                const rgb = hexToRgb(borderColor);

                for (let y = 0; y < height; ++y) {
                    for (let x = 0; x < width; ++x) {
                        const isBorder =
                            x < borderThickness ||
                            x >= width - borderThickness ||
                            y < borderThickness ||
                            y >= height - borderThickness;
                        if (isBorder) {
                            const i = (y * width + x) * 4;
                            data[i] = rgb.r;
                            data[i + 1] = rgb.g;
                            data[i + 2] = rgb.b;
                        }
                    }
                }
                ctx.putImageData(imgData, 0, 0);
                resolve(canvas.toDataURL());
            } catch (error) {
                console.error('Error processing poster image:', error);
                reject(error);
            }
        };

        img.onerror = function () {
            console.error('Failed to load poster image:', imgUrl);
            reject(new Error(`Failed to load poster image: ${imgUrl}`));
        };

        img.src = imgUrl;
    });
}
