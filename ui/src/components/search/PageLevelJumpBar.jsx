// ui/src/components/search/PageLevelJumpBar.jsx
// Page-level jump bar that positions relative to search results area

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import JumpBar from './JumpBar';
import { useSearchJumpBar } from './SearchJumpBarProvider';

export default function PageLevelJumpBar() {
    const { results, currentSort, getDisplayTitle, showJumpBar, jumpToLetter } = useSearchJumpBar();
    const [position, setPosition] = useState({ top: '50%', right: '0' });

    // Calculate position relative to search results area
    useEffect(() => {
        if (!showJumpBar) return;

        const updatePosition = () => {
            // Find the search results container
            const searchResults = document.querySelector('.search-results');
            if (searchResults) {
                const rect = searchResults.getBoundingClientRect();
                const centerY = rect.top + rect.height / 2;
                setPosition({
                    top: `${centerY}px`,
                    right: '0',
                });
            }
        };

        // Update on mount and scroll
        updatePosition();
        window.addEventListener('scroll', updatePosition);
        window.addEventListener('resize', updatePosition);

        return () => {
            window.removeEventListener('scroll', updatePosition);
            window.removeEventListener('resize', updatePosition);
        };
    }, [showJumpBar, results.length]);

    // Only show if enabled and we have sufficient results
    if (!showJumpBar || results.length <= 20) {
        return null;
    }

    const jumpBarContent = (
        <div
            className="page-level-jump-bar"
            style={{
                position: 'fixed',
                top: position.top,
                right: position.right,
                transform: 'translateY(-50%)',
                width: '32px',
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
