import { useState, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import usePopover from '../hooks/usePopover';
import { useSearchCoordinator } from '../contexts/SearchCoordinatorProvider';
import {
    getSearchPlaceholder,
    isSearchPage as checkIsSearchPage,
} from '../hooks/useSearchControls';
// Custom hooks for decomposed functionality
import { useSearchState } from '../hooks/search/useSearchState';
import { useInstancesData } from '../hooks/search/useInstancesData';
import { useSearchEffects } from '../hooks/search/useSearchEffects';
// Extracted components
import SearchAutocomplete from './search/SearchAutocomplete';
import SearchInputSection from './search/SearchInputSection';
import RefreshControls from './search/RefreshControls';
import {
    ModuleControl,
    ViewControl,
    SortControl,
    FilterControl,
} from './search/SearchInterfaceControls';

/**
 * HeaderSearch - Unified search interface with responsive design
 * Coordinates extracted components for clean architecture and better maintainability
 * @param {Function} onMobileCollapse - Function to collapse mobile search
 * @param {boolean} searchInputFocused - Whether search input is currently focused
 * @param {Function} onSearchInputFocus - Function called when search input receives focus
 * @param {Function} onSearchInputBlur - Function called when search input loses focus
 * @returns {JSX.Element} Search interface that adapts to mobile/desktop
 */
function HeaderSearchInner({
    onMobileCollapse,
    searchInputFocused = false,
    onSearchInputFocus,
    onSearchInputBlur,
}) {
    const location = useLocation();
    const headerSearchContext = useSearchCoordinator();

    // Extract context values first to pass to useSearchState
    const {
        searchAdapter,
        searchConfig,
        executeHeaderSearch,
        changeSource,
        changeView,
        changeSort,
        changeFilter,
        executeRefresh,
        registerHeaderSearch,
        isRefreshing,
    } = headerSearchContext;

    // Local state for header search - must be initialized before hooks that depend on setters
    const [currentView, setCurrentView] = useState('grid');
    const [currentSource, setCurrentSource] = useState(null);
    const [currentSort, setCurrentSort] = useState('alpha');

    // Refs for DOM elements - must be initialized before hooks that depend on them
    const searchButtonRef = useRef(null);
    const clearButtonRef = useRef(null);
    const headerSearchRef = useRef(null);

    // Use extracted useSearchState hook
    const {
        searchTerm,
        isSearching,
        autocompleteSuggestions,
        showAutocomplete,
        selectedSuggestionIndex,
        searchInputRef,
        autocompleteRef,
        setSearchTerm,
        setIsSearching,
        setShowAutocomplete,
        handleSearch,
        handleClear,
        handleKeyDown,
        selectSuggestion,
        handleAutocompleteItemHover,
        updateAutocompleteSuggestions,
        closeAutocomplete,
    } = useSearchState({
        searchAdapter,
        executeHeaderSearch,
        onMobileCollapse,
    });

    // Use extracted useInstancesData hook
    const {
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
    } = useInstancesData({
        executeRefresh,
    });

    // Use extracted useSearchEffects hook
    const { inputKey, showTooltips, setTooltip } = useSearchEffects({
        registerHeaderSearch,
        searchConfig,
        setSearchTerm,
        setIsSearching,
        setCurrentSource,
        setCurrentView,
        setCurrentSort,
        searchInputRef,
        showAutocomplete,
        autocompleteRef,
        closeAutocomplete,
        onMobileCollapse,
        headerSearchRef,
        updateAutocompleteSuggestions,
    });

    // Refresh popover using new simplified pattern
    const refreshPopover = usePopover();

    // Direct control management without schema (post-factory pattern refactor)
    // Controls are now implemented directly with PopoverFactory instead of schema-driven approach
    // All effects and lifecycle management now handled by useSearchEffects hook

    // All instance and library handlers now provided by useInstancesData hook
    // Wrap handleRefreshExecute to close popover
    const handleRefreshExecuteWithPopover = useCallback(() => {
        handleRefreshExecute();
        refreshPopover.close();
    }, [handleRefreshExecute, refreshPopover]);

    // Control popovers using new simplified pattern
    const modulePopover = usePopover();
    const viewPopover = usePopover();
    const sortPopover = usePopover();
    const filterPopover = usePopover();

    // Old schema-based helper functions removed - using direct PopoverFactory implementation

    // Simplified refresh control callback - replaced with RefreshControls component

    // Old schema-based control rendering functions removed - using direct implementation

    // Get current page placeholder from schema
    const placeholder = getSearchPlaceholder(location.pathname);

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

                {/* Centered search input section */}
                <div className="search-layout__center">
                    <SearchInputSection
                        searchInputRef={searchInputRef}
                        inputKey={inputKey}
                        placeholder={placeholder}
                        searchTerm={searchTerm}
                        onSearchTermChange={setSearchTerm}
                        onKeyDown={handleKeyDown}
                        onFocus={() => {
                            // Show autocomplete if suggestions exist
                            if (searchTerm.length >= 2 && autocompleteSuggestions.length > 0) {
                                setShowAutocomplete(true);
                            }
                            // Trigger progressive disclosure of controls
                            if (onSearchInputFocus) {
                                onSearchInputFocus();
                            }
                        }}
                        onBlur={() => {
                            // Delay blur to allow for interactions with controls
                            setTimeout(() => {
                                if (onSearchInputBlur) {
                                    onSearchInputBlur();
                                }
                            }, 150);
                        }}
                        isSearching={isSearching}
                        onSearch={handleSearch}
                        onClear={handleClear}
                        searchButtonRef={searchButtonRef}
                        clearButtonRef={clearButtonRef}
                        showTooltips={showTooltips}
                        onTooltipChange={setTooltip}
                        onMobileCollapse={onMobileCollapse}
                    />

                    {/* Autocomplete dropdown - Now using compound component */}
                    <SearchAutocomplete
                        show={showAutocomplete}
                        suggestions={autocompleteSuggestions}
                        selectedIndex={selectedSuggestionIndex}
                        autocompleteRef={autocompleteRef}
                        onSelectSuggestion={selectSuggestion}
                        onItemHover={handleAutocompleteItemHover}
                    />
                </div>

                {/* Right section: Controls + Right spacer */}
                <div className="search-layout__right">
                    {/* Header Controls Section - Now using compound components */}
                    <div className="search-controls">
                        <ModuleControl
                            popover={modulePopover}
                            showTooltips={showTooltips}
                            onTooltipChange={setTooltip}
                            searchConfig={searchConfig}
                            currentSource={currentSource}
                            onChangeSource={changeSource}
                        />
                        <ViewControl
                            popover={viewPopover}
                            showTooltips={showTooltips}
                            onTooltipChange={setTooltip}
                            currentView={currentView}
                            onChangeView={changeView}
                        />
                        <SortControl
                            popover={sortPopover}
                            showTooltips={showTooltips}
                            onTooltipChange={setTooltip}
                            searchConfig={searchConfig}
                            currentSort={currentSort}
                            onChangeSort={changeSort}
                        />
                        <FilterControl
                            popover={filterPopover}
                            showTooltips={showTooltips}
                            onTooltipChange={setTooltip}
                            searchConfig={searchConfig}
                            onChangeFilter={changeFilter}
                        />

                        {/* Refresh Control - Now using compound component */}
                        <RefreshControls
                            popover={refreshPopover}
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
                            onRefreshExecute={handleRefreshExecuteWithPopover}
                        />
                    </div>
                    {/* Right spacer for balanced centering */}
                    <div className="search-layout__spacer"></div>
                </div>
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
            <HeaderSearchInner
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
