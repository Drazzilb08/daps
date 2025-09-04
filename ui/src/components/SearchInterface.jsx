import React from 'react';
import { isSearchPage as checkIsSearchPage } from '../hooks/useSearchControls';
// Extracted interface hook
import { useSearchInterface } from '../hooks/search/useSearchInterface';
// Extracted components
import SearchField from './search/SearchField';
import SearchToolbar from './search/SearchToolbar';

/**
 * SearchInterface - Unified search interface with responsive design
 * Coordinates extracted components for clean architecture and better maintainability
 * @param {Function} onMobileCollapse - Function to collapse mobile search
 * @param {boolean} searchInputFocused - Whether search input is currently focused
 * @param {Function} onSearchInputFocus - Function called when search input receives focus
 * @param {Function} onSearchInputBlur - Function called when search input loses focus
 * @returns {JSX.Element} Search interface that adapts to mobile/desktop
 */
function SearchInterface({
    onMobileCollapse,
    searchInputFocused = false,
    onSearchInputFocus,
    onSearchInputBlur,
}) {
    // Use coordination hook to manage all search functionality
    const {
        location,
        placeholder,
        searchConfig,
        schemaControls,
        isRefreshing,
        searchButtonRef,
        clearButtonRef,
        headerSearchRef,
        searchTerm,
        isSearching,
        autocompleteSuggestions,
        showAutocomplete,
        selectedSuggestionIndex,
        searchInputRef,
        autocompleteRef,
        setSearchTerm,
        handleSearch,
        handleClear,
        handleKeyDown,
        selectSuggestion,
        handleAutocompleteItemHover,
        selectedRefreshOptions,
        availableInstances,
        availableLibraries,
        loadingLibraries,
        handleLoadLibraries,
        handleRefreshOptionToggle,
        handleSelectAllRadarr,
        handleDeselectAllRadarr,
        handleSelectAllSonarr,
        handleDeselectAllSonarr,
        handleSelectAllLibraries,
        handleDeselectAllLibraries,
        handleSelectAllOverall,
        handleDeselectAllOverall,
        handleRefreshExecute,
        inputKey,
        showTooltips,
        setTooltip,
        handleInputFocus,
        handleInputBlur,
    } = useSearchInterface({
        onMobileCollapse,
        onSearchInputFocus,
        onSearchInputBlur,
    });

    // Early returns after all hooks are called - only render on search pages
    if (!checkIsSearchPage(location.pathname)) {
        return null;
    }

    // Single search interface with responsive CSS classes
    const headerSearchClasses = [
        'search-interface',
        searchInputFocused ? 'search-interface--focused' : '',
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <div ref={headerSearchRef} className={headerSearchClasses}>
            {/* Three-section flex layout: Left spacer - Search input (centered) - Controls + Right spacer */}
            <div className="search-layout">
                {/* Left spacer for centering */}
                <div className="search-layout__spacer"></div>

                {/* Centered search input section with autocomplete */}
                <SearchField
                    // Input props
                    searchInputRef={searchInputRef}
                    inputKey={inputKey}
                    placeholder={placeholder}
                    searchTerm={searchTerm}
                    onSearchTermChange={setSearchTerm}
                    onKeyDown={handleKeyDown}
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                    isSearching={isSearching}
                    onSearch={handleSearch}
                    onClear={handleClear}
                    searchButtonRef={searchButtonRef}
                    clearButtonRef={clearButtonRef}
                    showTooltips={showTooltips}
                    onTooltipChange={setTooltip}
                    onMobileCollapse={onMobileCollapse}
                    // Autocomplete props
                    autocompleteRef={autocompleteRef}
                    showAutocomplete={showAutocomplete}
                    autocompleteSuggestions={autocompleteSuggestions}
                    selectedSuggestionIndex={selectedSuggestionIndex}
                    onSelectSuggestion={selectSuggestion}
                    onItemHover={handleAutocompleteItemHover}
                />

                {/* Right section: Search controls */}
                <SearchToolbar
                    schemaControls={schemaControls}
                    searchConfig={searchConfig}
                    isRefreshing={isRefreshing}
                    showTooltips={showTooltips}
                    onTooltipChange={setTooltip}
                    selectedRefreshOptions={selectedRefreshOptions}
                    availableInstances={availableInstances}
                    availableLibraries={availableLibraries}
                    loadingLibraries={loadingLibraries}
                    onLoadLibraries={handleLoadLibraries}
                    onRefreshOptionToggle={handleRefreshOptionToggle}
                    onSelectAllRadarr={handleSelectAllRadarr}
                    onDeselectAllRadarr={handleDeselectAllRadarr}
                    onSelectAllSonarr={handleSelectAllSonarr}
                    onDeselectAllSonarr={handleDeselectAllSonarr}
                    onSelectAllLibraries={handleSelectAllLibraries}
                    onDeselectAllLibraries={handleDeselectAllLibraries}
                    onSelectAllOverall={handleSelectAllOverall}
                    onDeselectAllOverall={handleDeselectAllOverall}
                    onRefreshExecute={handleRefreshExecute}
                />
            </div>
        </div>
    );
}

// Wrapper to handle context errors gracefully
export default function HeaderSearch({
    onMobileCollapse,
    searchInputFocused,
    onSearchInputFocus,
    onSearchInputBlur,
    ...props
}) {
    let component = null;

    try {
        component = (
            <SearchInterface
                onMobileCollapse={onMobileCollapse}
                searchInputFocused={searchInputFocused}
                onSearchInputFocus={onSearchInputFocus}
                onSearchInputBlur={onSearchInputBlur}
                {...props}
            />
        );
    } catch {
        component = null;
    }

    return component;
}
