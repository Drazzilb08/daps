/**
 * Poster Preview Utilities
 *
 * Re-exports from the main posterCanvas utility to maintain API compatibility
 * while eliminating code duplication.
 */

export {
    getPosterPreviewUrl,
    hexToRgb,
    getPosterByIndex,
    getPosterDimensions,
} from './posterCanvas';

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
