import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Hook to detect if the current page is a search page
 * 
 * Identifies search pages based on URL patterns:
 * - /media/search
 * - /posters/search/assets  
 * - /posters/search/gdrive
 * 
 * @returns {Object} Search page detection data
 * @returns {boolean} isSearchPage - Whether current page is a search page
 * @returns {string|null} searchPageType - Type of search page ('media', 'posters') or null
 * @returns {string|null} searchSubtype - Search subtype ('assets', 'gdrive') or null for media
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
        searchSubtype: null
      };
    }
    
    // Check for poster search pages
    if (path === '/posters/search/assets') {
      return {
        isSearchPage: true,
        searchPageType: 'posters',
        searchSubtype: 'assets'
      };
    }
    
    if (path === '/posters/search/gdrive') {
      return {
        isSearchPage: true,
        searchPageType: 'posters',
        searchSubtype: 'gdrive'
      };
    }
    
    // Not a search page
    return {
      isSearchPage: false,
      searchPageType: null,
      searchSubtype: null
    };
  }, [location.pathname]);
  
  return searchPageData;
};

export default useSearchPageDetection;