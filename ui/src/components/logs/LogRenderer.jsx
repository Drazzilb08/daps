import React, { useMemo } from 'react';

/**
 * LogRenderer Component
 *
 * Focused component for log content rendering with syntax highlighting and search.
 * Separates complex HTML generation logic from UI controls.
 *
 * @param {Object} props
 * @param {string} props.logText - Raw log text content
 * @param {string} props.searchTerm - Search term for highlighting
 */
export default function LogRenderer({ logText = '', searchTerm = '' }) {
    // Memoize the complex HTML rendering to prevent unnecessary recalculations
    const renderedHtml = useMemo(() => {
        function escapeRegex(text) {
            return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        }

        function highlightMatches(text, searchRegex) {
            if (!searchRegex) return text;
            const parts = text.split(searchRegex);
            for (let i = 1; i < parts.length; i += 2) {
                parts[i] = `<span class="log-highlight">${parts[i]}</span>`;
            }
            return parts.join('');
        }

        function highlightLineComponents(line, searchRegex) {
            let escaped = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

            // Handle quoted strings with special placeholder system
            const quotedMatches = [];
            escaped = escaped.replace(/(['"])(.*?)\1/g, match => {
                const highlighted = highlightMatches(
                    `<span class="log-quoted">${match}</span>`,
                    searchRegex
                );
                quotedMatches.push(highlighted);
                return `__QUOTED_PLACEHOLDER_${quotedMatches.length - 1}__`;
            });

            // Highlight datetime patterns
            escaped = escaped.replace(
                /\b\d{2}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2} (?:AM|PM)\b/g,
                match => highlightMatches(`<span class="log-datetime">${match}</span>`, searchRegex)
            );

            // Highlight log levels
            escaped = escaped.replace(/\b(CRITICAL|ERROR|WARNING|INFO|DEBUG)\b/g, match =>
                highlightMatches(
                    `<span class="log-ansi-${match.toLowerCase()}">${match}</span>`,
                    searchRegex
                )
            );

            // Highlight file paths
            escaped = escaped.replace(/\b[\w_]+(\.[\w_]+)+\b/g, match =>
                highlightMatches(`<span class="log-filename">${match}</span>`, searchRegex)
            );

            // Highlight numbers
            escaped = escaped.replace(/\b\d+(\.\d+)?\b/g, match =>
                highlightMatches(`<span class="log-number">${match}</span>`, searchRegex)
            );

            // Restore quoted strings
            quotedMatches.forEach((highlighted, idx) => {
                escaped = escaped.replace(`__QUOTED_PLACEHOLDER_${idx}__`, highlighted);
            });

            return escaped;
        }

        function parseLogBlocks(rawText) {
            const lines = rawText.split('\n');
            const blocks = [];
            let currentBlock = null;

            lines.forEach(line => {
                const levelClass = (() => {
                    if (line.includes('CRITICAL')) return 'log-ansi-critical';
                    if (line.includes('ERROR')) return 'log-ansi-error';
                    if (line.includes('WARNING')) return 'log-ansi-warning';
                    if (line.includes('INFO')) return 'log-ansi-info';
                    if (line.includes('DEBUG')) return 'log-ansi-debug';
                    return '';
                })();

                if (levelClass) {
                    if (currentBlock) blocks.push(currentBlock);
                    currentBlock = { lines: [line], levelClass };
                } else {
                    if (currentBlock) {
                        currentBlock.lines.push(line);
                    } else {
                        currentBlock = { lines: [line], levelClass: '' };
                    }
                }
            });
            if (currentBlock) blocks.push(currentBlock);
            return blocks;
        }

        function renderBlocksToHtml(blocks, search) {
            if (!blocks.length) {
                return `<div class="log-limited-line">No logs available.</div>`;
            }

            const escapedSearch = escapeRegex(search);
            const searchRegex = search ? new RegExp(`(${escapedSearch})`, 'gi') : null;

            return blocks
                .map(({ lines }) => {
                    const renderedLines = lines
                        .map(line => `<div>${highlightLineComponents(line, searchRegex)}</div>`)
                        .join('\n');
                    return `<div>${renderedLines}</div>`;
                })
                .join('\n');
        }

        if (!logText) return '';

        const blocks = parseLogBlocks(logText);
        const filtered = searchTerm.trim().toLowerCase();

        if (!filtered) {
            return renderBlocksToHtml(blocks, '');
        }

        const filteredBlocks = blocks.filter(({ lines }) =>
            lines.some(line => line.toLowerCase().includes(filtered))
        );

        return renderBlocksToHtml(filteredBlocks, filtered);
    }, [logText, searchTerm]);

    return (
        <div
            id="log-output"
            className="log-output"
            style={{
                flex: 1,
                overflowY: 'auto',
                fontFamily: 'monospace',
                whiteSpace: 'pre-wrap',
            }}
            dangerouslySetInnerHTML={{ __html: renderedHtml || '' }}
        />
    );
}
