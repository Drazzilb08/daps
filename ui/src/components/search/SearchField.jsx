import React from 'react';
import SearchInputSection from './SearchInputSection';
import SearchAutocomplete from './SearchAutocomplete';

/**
 * SearchField - Search input field with autocomplete functionality
 * Combines input field, buttons, and autocomplete dropdown in a single component
 * Follows DAPS compound component pattern for clean separation of concerns
 *
 * @param {React.RefObject} searchInputRef - Ref for the search input element
 * @param {React.RefObject} autocompleteRef - Ref for the autocomplete dropdown
 * @param {string} inputKey - Unique key for input re-rendering
 * @param {string} placeholder - Input placeholder text
 * @param {string} searchTerm - Current search term value
 * @param {Function} onSearchTermChange - Callback when search term changes
 * @param {Function} onKeyDown - Callback for keyboard events
 * @param {Function} onFocus - Callback when input receives focus
 * @param {Function} onBlur - Callback when input loses focus
 * @param {boolean} isSearching - Whether search operation is in progress
 * @param {Function} onSearch - Callback to trigger search
 * @param {Function} onClear - Callback to clear search term
 * @param {React.RefObject} searchButtonRef - Ref for the search button
 * @param {React.RefObject} clearButtonRef - Ref for the clear button
 * @param {Object} showTooltips - Tooltip visibility state object
 * @param {Function} onTooltipChange - Callback to change tooltip visibility
 * @param {Function} onMobileCollapse - Callback to collapse mobile search
 * @param {boolean} showAutocomplete - Whether autocomplete dropdown is visible
 * @param {Array} autocompleteSuggestions - Array of autocomplete suggestions
 * @param {number} selectedSuggestionIndex - Currently selected suggestion index
 * @param {Function} onSelectSuggestion - Callback to select autocomplete suggestion
 * @param {Function} onItemHover - Callback for autocomplete item hover
 * @returns {JSX.Element} Combined search input and autocomplete container
 */
const SearchField = React.memo(({
    // Input props
    searchInputRef,
    inputKey,
    placeholder,
    searchTerm,
    onSearchTermChange,
    onKeyDown,
    onFocus,
    onBlur,
    isSearching,
    onSearch,
    onClear,
    searchButtonRef,
    clearButtonRef,
    showTooltips,
    onTooltipChange,
    onMobileCollapse,
    
    // Autocomplete props
    autocompleteRef,
    showAutocomplete,
    autocompleteSuggestions,
    selectedSuggestionIndex,
    onSelectSuggestion,
    onItemHover,
}) => {
    return (
        <div className="search-layout__center">
            <SearchInputSection
                searchInputRef={searchInputRef}
                inputKey={inputKey}
                placeholder={placeholder}
                searchTerm={searchTerm}
                onSearchTermChange={onSearchTermChange}
                onKeyDown={onKeyDown}
                onFocus={onFocus}
                onBlur={onBlur}
                isSearching={isSearching}
                onSearch={onSearch}
                onClear={onClear}
                searchButtonRef={searchButtonRef}
                clearButtonRef={clearButtonRef}
                showTooltips={showTooltips}
                onTooltipChange={onTooltipChange}
                onMobileCollapse={onMobileCollapse}
            />

            {/* Autocomplete dropdown - Now using compound component pattern */}
            <SearchAutocomplete
                show={showAutocomplete}
                suggestions={autocompleteSuggestions}
                selectedIndex={selectedSuggestionIndex}
                autocompleteRef={autocompleteRef}
                onSelectSuggestion={onSelectSuggestion}
                onItemHover={onItemHover}
            />
        </div>
    );
});

SearchField.displayName = 'SearchField';

export default SearchField;