import { useMemo } from 'react';

/**
 * useLogSearch - Filter blocks by search term (case-insensitive)
 * @param {Array<{lines: string[], levelClass: string}>} blocks - Parsed log blocks
 * @param {string} searchTerm - Search term (case-insensitive)
 * @returns {Array<{lines: string[], levelClass: string}>} Filtered blocks
 */
export function useLogSearch(blocks, searchTerm) {
    return useMemo(() => {
        // If no search term, return all blocks
        if (!searchTerm || !searchTerm.trim()) {
            return blocks;
        }

        const lowerSearch = searchTerm.toLowerCase();

        // Filter blocks where at least one line contains search term
        return blocks.filter(({ lines }) =>
            lines.some(line => line.toLowerCase().includes(lowerSearch))
        );
    }, [blocks, searchTerm]);
}
