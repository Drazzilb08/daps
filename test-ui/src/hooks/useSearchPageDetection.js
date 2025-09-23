import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Hook to detect if the current page is a search page
 */
const useSearchPageDetection = () => {
    const location = useLocation();

    const searchPageData = useMemo(() => {
        const path = location.pathname;

        // Check for media search page
        if (path === '/media/search') {
            return {
                isSearchPage: true,
                searchPageType: 'media',
                searchSubtype: null,
            };
        }

        // Check for poster search pages
        if (path === '/poster/search/assets') {
            return {
                isSearchPage: true,
                searchPageType: 'posters',
                searchSubtype: 'assets',
            };
        }

        if (path === '/poster/search/gdrive') {
            return {
                isSearchPage: true,
                searchPageType: 'posters',
                searchSubtype: 'gdrive',
            };
        }

        // Not a search page
        return {
            isSearchPage: false,
            searchPageType: null,
            searchSubtype: null,
        };
    }, [location.pathname]);

    return searchPageData;
};

export default useSearchPageDetection;
