/**
 * Poster Preview Utilities
 *
 * Utilities for manipulating poster images with colored borders or border removal.
 * Based on the canvas manipulation approach from the original DAPS UI.
 */

const BORDER_THICKNESS = 5;

/**
 * Convert hex color to RGB object
 * @param {string} hex - Hex color string (with or without #)
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
 * Get poster by index with wraparound
 * @param {Array} posterAssets - Array of poster filenames
 * @param {number} idx - Index to get
 * @returns {string|null} Poster URL or null
 */
export function getPosterByIndex(posterAssets, idx) {
    if (!posterAssets.length) return null;
    return `/posters/${posterAssets[idx % posterAssets.length]}`;
}

/**
 * Generate poster preview with border coloring or removal
 * @param {string} imgUrl - Source image URL
 * @param {string|null} borderColor - Hex color for border or null to remove
 * @param {Object} options - Canvas options (width, height)
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

                // === REMOVE BORDER ===
                if (!borderColor) {
                    // Hardcrop BORDER_THICKNESS px from all sides
                    const cropW = width - BORDER_THICKNESS * 2;
                    const cropH = height - BORDER_THICKNESS * 2;
                    const cropCanvas = document.createElement('canvas');
                    cropCanvas.width = cropW;
                    cropCanvas.height = cropH;
                    const cropCtx = cropCanvas.getContext('2d');
                    cropCtx.drawImage(
                        canvas,
                        BORDER_THICKNESS,
                        BORDER_THICKNESS,
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

                // === COLORIZE BORDER ===
                // Color the outer BORDER_THICKNESS px on each side
                const imgData = ctx.getImageData(0, 0, width, height);
                const data = imgData.data;
                const rgb = hexToRgb(borderColor);

                for (let y = 0; y < height; ++y) {
                    for (let x = 0; x < width; ++x) {
                        const isBorder =
                            x < BORDER_THICKNESS ||
                            x >= width - BORDER_THICKNESS ||
                            y < BORDER_THICKNESS ||
                            y >= height - BORDER_THICKNESS;
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

/**
 * Fetch available poster files from the server
 * For test-ui, we'll use a mock list of available posters
 * In the real app, this would be an API call
 * @returns {Promise<Array>} Array of poster filenames
 */
export async function fetchPosterFileList() {
    try {
        // Mock poster list - these files exist in /test-ui/public/posters/
        const mockPosters = [
            'Comedy.jpg',
            'Documentaries.jpg',
            'Martial Arts.jpg',
            'Samurai.jpg',
            'Space Exploration.jpg',
            'Time Travel.jpg',
            'Video Game.jpg',
            'War.jpg',
        ];

        // Simulate API delay for realistic behavior
        await new Promise(resolve => setTimeout(resolve, 100));

        return mockPosters;
    } catch (error) {
        console.error('Failed to fetch poster files:', error);
        return [];
    }
}
