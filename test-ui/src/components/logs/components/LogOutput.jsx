import React from 'react';
import { useLogParser } from '../hooks/useLogParser';
import { useLogSearch } from '../hooks/useLogSearch';
import { LogBlock } from './LogBlock';

/**
 * LogOutput - Main log display area with parsing and rendering
 * @param {Object} props
 * @param {string} props.logText - Raw log text
 * @param {string} props.searchTerm - Search term for filtering/highlighting
 * @returns {JSX.Element}
 */
export const LogOutput = React.memo(({ logText, searchTerm }) => {
    // Parse log text into blocks
    const blocks = useLogParser(logText);

    // Filter blocks by search term
    const filteredBlocks = useLogSearch(blocks, searchTerm);

    // Empty state
    if (filteredBlocks.length === 0) {
        return (
            <div className="flex-1 overflow-y-auto font-mono text-sm p-3 border border-default bg-input rounded">
                <div className="text-secondary">No logs available</div>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto font-mono text-sm p-3 border border-defaul bg-input rounded">
            {filteredBlocks.map((block, idx) => (
                <LogBlock
                    key={idx}
                    lines={block.lines}
                    levelClass={block.levelClass}
                    searchTerm={searchTerm}
                />
            ))}
        </div>
    );
});

LogOutput.displayName = 'LogOutput';
