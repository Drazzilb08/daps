import React, { useState, useCallback, useRef } from 'react';
import { useDebounce } from '../../hooks/useDebounce.js';

/**
 * Search Interface Component for DAPS application
 * 
 * Provides search functionality for search pages with:
 * - Debounced search input (300ms delay)
 * - Responsive design with mobile-first approach
 * - Touch-optimized interaction targets (44px minimum)
 * - Real-time search state feedback
 * - Placeholder space for future toolbar components
 * 
 * @param {Object} props - Component props
 * @param {string} props.searchPageType - Type of search page ('media', 'posters')
 * @param {string} props.searchSubtype - Search subtype ('assets', 'gdrive') or null
 * @param {Function} props.onSearch - Callback function for search events
 * @param {string} props.placeholder - Placeholder text for search input
 */
const SearchInterface = React.memo(({ 
  searchPageType, 
  searchSubtype, 
  onSearch, 
  placeholder = "Search media..." 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isActive, setIsActive] = useState(false);
  const inputRef = useRef(null);
  
  // Debounced search with 300ms delay
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  
  /**
   * Handle search input change
   */
  const handleSearchChange = useCallback((event) => {
    const value = event.target.value;
    setSearchTerm(value);
  }, []);
  
  /**
   * Handle search input focus
   */
  const handleFocus = useCallback(() => {
    setIsActive(true);
  }, []);
  
  /**
   * Handle search input blur
   */
  const handleBlur = useCallback(() => {
    setIsActive(false);
  }, []);
  
  /**
   * Handle clear search
   */
  const handleClear = useCallback(() => {
    setSearchTerm('');
    inputRef.current?.focus();
  }, []);
  
  /**
   * Handle form submission
   */
  const handleSubmit = useCallback((event) => {
    event.preventDefault();
    if (onSearch && searchTerm.trim()) {
      onSearch(searchTerm.trim());
    }
  }, [onSearch, searchTerm]);
  
  // Execute search when debounced term changes
  React.useEffect(() => {
    if (onSearch && debouncedSearchTerm !== null) {
      onSearch(debouncedSearchTerm);
    }
  }, [debouncedSearchTerm, onSearch]);
  
  /**
   * Get appropriate placeholder text based on search context
   */
  const getContextualPlaceholder = () => {
    if (searchPageType === 'media') {
      return 'Search media...';
    }
    if (searchPageType === 'posters') {
      if (searchSubtype === 'assets') {
        return 'Search poster assets...';
      }
      if (searchSubtype === 'gdrive') {
        return 'Search Google Drive...';
      }
    }
    return placeholder;
  };
  
  return (
    <div className="search-interface" role="search">
      {/* Tier 1: Search Field */}
      <form className="search-form" onSubmit={handleSubmit}>
        <div className={`search-input-container ${isActive ? 'active' : ''} ${searchTerm ? 'has-value' : ''}`}>
          <div className="search-input-wrapper">
            <span className="search-icon material-symbols-outlined" aria-hidden="true">
              search
            </span>
            <input
              ref={inputRef}
              type="text"
              className="search-input"
              placeholder={getContextualPlaceholder()}
              value={searchTerm}
              onChange={handleSearchChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              aria-label={`Search ${searchPageType === 'media' ? 'media' : 'posters'}`}
            />
            {searchTerm && (
              <button
                type="button"
                className="search-clear"
                onClick={handleClear}
                aria-label="Clear search"
                tabIndex={0}
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  close
                </span>
              </button>
            )}
          </div>
        </div>
      </form>
      
      {/* Tier 2: Placeholder for Future Smart Responsive Toolbar */}
      <div className="search-toolbar-placeholder" aria-hidden="true">
        {/* Reserved space for Phase 4D1+ toolbar components */}
      </div>
    </div>
  );
});

SearchInterface.displayName = 'SearchInterface';

export default SearchInterface;