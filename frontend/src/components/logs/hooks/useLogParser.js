import { useMemo } from 'react';

/**
 * useLogParser - Parse log text into structured blocks grouped by log level
 * @param {string} logText - Raw log text
 * @returns {Array<{lines: string[], levelClass: string}>} Parsed blocks
 */
export function useLogParser(logText) {
    return useMemo(() => {
        if (!logText || !logText.trim()) {
            return [];
        }

        const lines = logText.split('\n');
        const blocks = [];
        let currentBlock = null;

        lines.forEach(line => {
            // Detect log level from line content
            const levelClass = (() => {
                if (line.includes('CRITICAL')) return 'critical';
                if (line.includes('ERROR')) return 'error';
                if (line.includes('WARNING')) return 'warning';
                if (line.includes('INFO')) return 'info';
                if (line.includes('DEBUG')) return 'debug';
                return '';
            })();

            // If we found a log level, start a new block
            if (levelClass) {
                if (currentBlock) {
                    blocks.push(currentBlock);
                }
                currentBlock = { lines: [line], levelClass };
            } else {
                // Append to current block (multi-line entries like stack traces)
                if (currentBlock) {
                    currentBlock.lines.push(line);
                } else {
                    // No level found and no current block - create block without level
                    currentBlock = { lines: [line], levelClass: '' };
                }
            }
        });

        // Push final block
        if (currentBlock) {
            blocks.push(currentBlock);
        }

        return blocks;
    }, [logText]);
}
