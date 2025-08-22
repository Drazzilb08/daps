// ui/src/components/search/PageLevelJumpBar.jsx
// Page-level jump bar that positions relative to search results area

import React from 'react';
import { createPortal } from 'react-dom';
import JumpBar from './JumpBar';
import { useSearchJumpBar } from './SearchJumpBarProvider';

export default function PageLevelJumpBar() {
    const { results, currentSort, getDisplayTitle, showJumpBar, jumpToLetter } = useSearchJumpBar();

    // Only show if enabled and we have sufficient results
    if (!showJumpBar || results.length <= 20) {
        return null;
    }

    const jumpBarContent = (
        <div
            className="page-level-jump-bar"
            style={{
                position: 'fixed',
                top: '50%',
                right: 'var(--space-4)',
                transform: 'translateY(-50%)',
                width: 'var(--space-8)',
                maxHeight: 'calc(100vh - 200px)',
                zIndex: 1000,
                pointerEvents: 'auto',
            }}
        >
            <JumpBar
                results={results}
                onJumpToLetter={jumpToLetter}
                getDisplayTitle={getDisplayTitle}
                className="search-jump-bar"
                sortDirection={currentSort && currentSort.includes('desc') ? 'desc' : 'asc'}
            />
        </div>
    );

    // Use portal to render directly to body, outside all content constraints
    return createPortal(jumpBarContent, document.body);
}
