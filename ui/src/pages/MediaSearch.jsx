// ui/src/pages/MediaSearch.jsx
// Media search page using consistent plugin architecture

import React, { useCallback, useState, useEffect } from 'react';
import { MediaSearchComponent } from '../components/search/plugins';
import { useToast } from '../components/providers/ToastProvider';

export default function MediaSearch() {
    const toast = useToast();
    const [isMobile, setIsMobile] = useState(false);
    const [isMobileSearchActive, setIsMobileSearchActive] = useState(false);

    // Track mobile viewport
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth <= 768);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Track mobile search active state
    useEffect(() => {
        const checkMobileSearchState = () => {
            setIsMobileSearchActive(document.body.classList.contains('mobile-search-active'));
        };

        // Initial check
        checkMobileSearchState();

        // Set up mutation observer to watch for class changes on body
        const observer = new MutationObserver(checkMobileSearchState);
        observer.observe(document.body, {
            attributes: true,
            attributeFilter: ['class'],
        });

        return () => observer.disconnect();
    }, []);

    const handleError = useCallback(
        error => {
            console.error('Media search error:', error);
            toast('Search error occurred', 'error');
        },
        [toast]
    );

    // Calculate whether to hide the main search interface (but always render SearchCore for coordination)
    const hideMainSearchInterface = isMobile && isMobileSearchActive;

    return (
        <div className="search-page-layout">
            <div className="search-content-column">
                <MediaSearchComponent
                    onError={handleError}
                    hideMainSearchInterface={hideMainSearchInterface}
                />
            </div>
        </div>
    );
}
