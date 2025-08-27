// ui/src/components/search/SearchControls.jsx
// Generic controls component that replicates existing poster_search control patterns

import React, { useRef, useState, useEffect } from 'react';
import { getIcon, humanize } from '../../utils/tools';
import TooltipFactory from '../Tooltip';
import Popover from '../Popover';
import usePopover from '../../hooks/usePopover';
import { useSearchCoordinator } from '../../contexts/SearchCoordinatorProvider';
import { fetchInstances, fetchPlexLibrariesByInstance } from '../../utils/api';

// Internal component that uses the header search context
function SearchControlsInner(props) {
    const headerSearchContext = useSearchCoordinator();
    const isHeaderSearchActive = headerSearchContext?.isSearchPage();

    return <SearchControlsCore {...props} isHeaderSearchActive={isHeaderSearchActive} />;
}

// Wrapper component that handles the error
function SearchControlsWrapper(props) {
    try {
        return <SearchControlsInner {...props} />;
    } catch {
        return <SearchControlsCore {...props} isHeaderSearchActive={false} />;
    }
}

const DEFAULT_VIEW_MODES = [
    { key: 'grid', icon: 'mi:grid_view', label: 'Grid', tooltip: 'Grid view' },
    { key: 'list', icon: 'mi:list', label: 'List', tooltip: 'List view' },
];

const DEFAULT_SORT_OPTIONS = [
    { value: 'alpha', label: 'A-Z' },
    { value: 'alpha-desc', label: 'Z-A' },
    { value: 'date', label: 'Date Added' },
];

// Core component logic
function SearchControlsCore({
    isHeaderSearchActive = false,
    // Source management
    sources = [],
    currentSource,
    onSourceChange,

    // Search functionality
    searchTerm,
    onSearchTermChange,
    onSearch,
    onClear,
    placeholder = 'Search...',
    isSearching = false,
    searchInputRef, // Phase 2 Enhancement: keyboard navigation

    // Autocomplete functionality
    enableAutocomplete = false,
    autocompleteMinLength = 2,
    searchAdapter = null,

    // Filters
    filters = [],
    activeFilters = {},
    onFilterChange,

    // Sort and view options
    sortOptions = DEFAULT_SORT_OPTIONS,
    currentSort,
    onSortChange,
    currentView = 'grid',
    onViewChange,

    // Additional data for dynamic options
    // searchData,

    // Refresh functionality
    showRefreshControls = false,
    onRefresh,
    isRefreshing = false,

    // Help functionality (for MediaSearch only)
    showAdvancedSearchHelp = false,

    // Customization
    viewModes = DEFAULT_VIEW_MODES,
    showSearch = true,
    showSort = true,
    showViewToggle = true,
    selectorLabel = 'Source',
}) {
    // If header search is active, hide the page-level search bar and some controls
    const shouldShowSearch = showSearch && !isHeaderSearchActive;
    const shouldShowSelector = sources.length > 0 && !isHeaderSearchActive;
    const shouldShowRefresh = showRefreshControls && !isHeaderSearchActive;
    // ===== REFS =====
    const viewBtnRefs = useRef({});
    const searchBtnRef = useRef();
    // searchInputRef is now passed as a prop for keyboard navigation
    const filterRefs = useRef({});

    // ===== TOOLTIP STATE =====
    const [hoveredView, setHoveredView] = useState(null);
    const [showSearchTip, setShowSearchTip] = useState(false);
    const [tooltipStates, setTooltipStates] = useState({});

    // ===== DROPDOWN STATES =====
    const [dropdownStates, setDropdownStates] = useState({});

    // ===== AUTOCOMPLETE STATE =====
    const [autocompleteSuggestions, setAutocompleteSuggestions] = useState([]);
    const [showAutocomplete, setShowAutocomplete] = useState(false);
    const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
    const autocompleteRef = useRef();

    // ===== REFRESH POPOVER STATE =====
    const refreshPopover = usePopover(false);
    const [selectedRefreshOptions, setSelectedRefreshOptions] = useState({
        arrInstances: [],
        plexInstances: [],
        libraries: [],
    });

    // ===== HELP POPOVER STATE =====
    const helpPopover = usePopover(false);
    const [showHelpTooltip, setShowHelpTooltip] = useState(false);

    // ===== SELECTOR STATE =====
    const selectorPopover = usePopover(false);
    const [showSelectorTooltip, setShowSelectorTooltip] = useState(false);
    const [showRefreshTooltip, setShowRefreshTooltip] = useState(false);

    // ===== DROPDOWN CLICK OUTSIDE HANDLING =====
    useEffect(() => {
        const activeDropdowns = Object.keys(dropdownStates).filter(key => dropdownStates[key]);
        if (activeDropdowns.length === 0) return;

        function handleClickOutside(e) {
            activeDropdowns.forEach(filterId => {
                const ref = filterRefs.current[filterId];
                if (ref && !ref.contains(e.target)) {
                    setDropdownStates(prev => ({ ...prev, [filterId]: false }));
                }
            });
        }

        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [dropdownStates]);

    // ===== AUTOCOMPLETE EFFECTS =====
    // Handle autocomplete suggestions when search term changes
    useEffect(() => {
        if (!enableAutocomplete || !searchAdapter?.getAutocompleteSuggestions) {
            return;
        }

        if (searchTerm.length >= autocompleteMinLength) {
            try {
                const suggestions = searchAdapter.getAutocompleteSuggestions(searchTerm);
                setAutocompleteSuggestions(suggestions);
                setShowAutocomplete(suggestions.length > 0);
                setSelectedSuggestionIndex(-1);
            } catch (error) {
                console.warn('Autocomplete error:', error);
                setAutocompleteSuggestions([]);
                setShowAutocomplete(false);
            }
        } else {
            setAutocompleteSuggestions([]);
            setShowAutocomplete(false);
        }
    }, [searchTerm, enableAutocomplete, autocompleteMinLength, searchAdapter]);

    // Handle clicking outside autocomplete to close it
    useEffect(() => {
        if (!showAutocomplete) return;

        function handleClickOutside(e) {
            if (
                autocompleteRef.current &&
                !autocompleteRef.current.contains(e.target) &&
                searchInputRef.current &&
                !searchInputRef.current.contains(e.target)
            ) {
                setShowAutocomplete(false);
                setSelectedSuggestionIndex(-1);
            }
        }

        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [showAutocomplete, searchInputRef]);

    // ===== HELPER FUNCTIONS =====
    const setTooltipState = (key, value) => {
        setTooltipStates(prev => ({ ...prev, [key]: value }));
    };

    const toggleDropdown = filterId => {
        setDropdownStates(prev => ({ ...prev, [filterId]: !prev[filterId] }));
    };

    const handleFilterSelect = (filterId, value) => {
        onFilterChange(filterId, value);
        setDropdownStates(prev => ({ ...prev, [filterId]: false }));
    };

    // ===== AUTOCOMPLETE HELPER FUNCTIONS =====
    const selectSuggestion = suggestion => {
        onSearchTermChange(suggestion.title);
        setShowAutocomplete(false);
        setSelectedSuggestionIndex(-1);
        // Optionally trigger search immediately
        setTimeout(() => onSearch(), 100);
    };

    const navigateAutocomplete = direction => {
        if (!showAutocomplete || autocompleteSuggestions.length === 0) return;

        let newIndex = selectedSuggestionIndex;
        if (direction === 'down') {
            newIndex = newIndex < autocompleteSuggestions.length - 1 ? newIndex + 1 : -1;
        } else if (direction === 'up') {
            newIndex = newIndex > -1 ? newIndex - 1 : autocompleteSuggestions.length - 1;
        }
        setSelectedSuggestionIndex(newIndex);
    };

    // ===== KEYBOARD HANDLERS =====
    const handleSearchKeyDown = e => {
        // Handle autocomplete navigation
        if (showAutocomplete && autocompleteSuggestions.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                navigateAutocomplete('down');
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                navigateAutocomplete('up');
                return;
            }
            if (e.key === 'Enter' && selectedSuggestionIndex >= 0) {
                e.preventDefault();
                selectSuggestion(autocompleteSuggestions[selectedSuggestionIndex]);
                return;
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                setShowAutocomplete(false);
                setSelectedSuggestionIndex(-1);
                return;
            }
        }

        // Default search behavior
        if (e.key === 'Enter') {
            e.preventDefault();
            onSearch();
            if (searchInputRef.current) {
                searchInputRef.current.focus();
            }
        }
    };

    const handleFilterKeyDown = (e, filterId, value) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleFilterSelect(filterId, value);
        }
    };

    // ===== REFRESH HANDLERS =====
    const handleRefreshToggle = () => {
        refreshPopover.toggle();
    };

    // ===== SELECTOR HANDLERS =====
    const handleSelectorToggle = () => {
        selectorPopover.toggle();
    };

    const handleSelectorSelect = itemKey => {
        onSourceChange(itemKey);
        selectorPopover.close();
    };

    // ===== HELP HANDLERS =====
    const handleHelpToggle = () => {
        helpPopover.toggle();
    };

    // ===== SELECT ALL / DESELECT ALL HANDLERS =====
    const handleSelectAllRadarr = () => {
        setSelectedRefreshOptions(prev => ({
            ...prev,
            arrInstances: [
                ...new Set([...prev.arrInstances, ...availableInstances.radarrInstances]),
            ],
        }));
    };

    const handleDeselectAllRadarr = () => {
        setSelectedRefreshOptions(prev => ({
            ...prev,
            arrInstances: prev.arrInstances.filter(
                instance => !availableInstances.radarrInstances.includes(instance)
            ),
        }));
    };

    const handleSelectAllSonarr = () => {
        setSelectedRefreshOptions(prev => ({
            ...prev,
            arrInstances: [
                ...new Set([...prev.arrInstances, ...availableInstances.sonarrInstances]),
            ],
        }));
    };

    const handleDeselectAllSonarr = () => {
        setSelectedRefreshOptions(prev => ({
            ...prev,
            arrInstances: prev.arrInstances.filter(
                instance => !availableInstances.sonarrInstances.includes(instance)
            ),
        }));
    };

    const handleSelectAllLibraries = () => {
        const allLibraries = availableLibraries.map(lib => lib.name || lib);
        const allPlexInstances = [...new Set(availableLibraries.map(lib => lib.instance))];
        setSelectedRefreshOptions(prev => ({
            ...prev,
            libraries: allLibraries,
            plexInstances: allPlexInstances,
        }));
    };

    const handleDeselectAllLibraries = () => {
        setSelectedRefreshOptions(prev => ({
            ...prev,
            libraries: [],
            plexInstances: [],
        }));
    };

    const handleSelectAllOverall = () => {
        const allInstances = [
            ...availableInstances.radarrInstances,
            ...availableInstances.sonarrInstances,
        ];
        const allLibraries = availableLibraries.map(lib => lib.name || lib);
        const allPlexInstances = [...new Set(availableLibraries.map(lib => lib.instance))];

        setSelectedRefreshOptions({
            arrInstances: allInstances,
            libraries: allLibraries,
            plexInstances: allPlexInstances,
        });
    };

    const handleDeselectAllOverall = () => {
        setSelectedRefreshOptions({
            arrInstances: [],
            libraries: [],
            plexInstances: [],
        });
    };

    const handleRefreshOptionToggle = (category, item) => {
        setSelectedRefreshOptions(prev => {
            if (category === 'libraries') {
                // When toggling a library, automatically include/exclude the associated Plex instance
                const library = availableLibraries.find(
                    lib => lib.name === item || lib.displayName === item
                );
                const isCurrentlySelected = prev.libraries.includes(item);

                let newLibraries;
                let newPlexInstances = [...prev.plexInstances];

                if (isCurrentlySelected) {
                    // Removing library
                    newLibraries = prev.libraries.filter(x => x !== item);

                    // Check if this was the last library for this Plex instance
                    if (library) {
                        const otherLibrariesForSameInstance = newLibraries.some(libName => {
                            const lib = availableLibraries.find(
                                l => l.name === libName || l.displayName === libName
                            );
                            return lib && lib.instance === library.instance;
                        });

                        // If no other libraries from this instance are selected, remove the Plex instance
                        if (!otherLibrariesForSameInstance) {
                            newPlexInstances = newPlexInstances.filter(x => x !== library.instance);
                        }
                    }
                } else {
                    // Adding library
                    newLibraries = [...prev.libraries, item];

                    // Automatically add the associated Plex instance
                    if (library && !newPlexInstances.includes(library.instance)) {
                        newPlexInstances.push(library.instance);
                    }
                }

                return {
                    ...prev,
                    libraries: newLibraries,
                    plexInstances: newPlexInstances,
                };
            } else {
                // For other categories (ARR instances, Plex instances), use normal toggle
                return {
                    ...prev,
                    [category]: prev[category].includes(item)
                        ? prev[category].filter(x => x !== item)
                        : [...prev[category], item],
                };
            }
        });
    };

    const handleRefreshExecute = () => {
        if (onRefresh) {
            onRefresh(selectedRefreshOptions);
        }
        refreshPopover.close();
    };

    // Libraries state for dynamic loading
    const [availableLibraries, setAvailableLibraries] = useState([]);
    const [loadingLibraries, setLoadingLibraries] = useState(false);

    const handleLoadLibraries = async () => {
        setLoadingLibraries(true);
        try {
            // Fetch instances first to get Plex instances
            const instancesData = await fetchInstances();

            const plexInstances = instancesData?.plex || {};
            const librariesWithInstance = [];

            // Load libraries for each Plex instance and track which instance they belong to
            for (const [instanceName] of Object.entries(plexInstances)) {
                try {
                    const libraries = await fetchPlexLibrariesByInstance(instanceName);

                    if (libraries && libraries.length > 0) {
                        libraries.forEach(lib => {
                            librariesWithInstance.push({
                                name: lib,
                                instance: instanceName,
                                displayName: `${lib} (${instanceName})`,
                            });
                        });
                    }
                } catch (error) {
                    console.warn(`Failed to load libraries for ${instanceName}:`, error);
                }
            }

            setAvailableLibraries(librariesWithInstance);
        } catch (error) {
            console.error('Failed to load libraries:', error);
        } finally {
            setLoadingLibraries(false);
        }
    };

    // State to store available instances from API
    const [availableInstances, setAvailableInstances] = useState({
        radarrInstances: [],
        sonarrInstances: [],
        plexInstances: [],
    });

    // Load available instances from API on component mount
    useEffect(() => {
        const loadInstances = async () => {
            try {
                const data = await fetchInstances();

                if (data) {
                    const radarrInstances = [];
                    const sonarrInstances = [];
                    const plexInstances = [];

                    // Extract Radarr instances
                    if (data.radarr) {
                        radarrInstances.push(...Object.keys(data.radarr));
                    }

                    // Extract Sonarr instances
                    if (data.sonarr) {
                        sonarrInstances.push(...Object.keys(data.sonarr));
                    }

                    // Extract Plex instances
                    if (data.plex) {
                        plexInstances.push(...Object.keys(data.plex));
                    }

                    setAvailableInstances({
                        radarrInstances,
                        sonarrInstances,
                        plexInstances,
                    });
                }
            } catch (error) {
                console.warn('Failed to load instances for refresh options:', error);
                setAvailableInstances({
                    radarrInstances: [],
                    sonarrInstances: [],
                    plexInstances: [],
                });
            }
        };

        loadInstances();
    }, []);

    const getAvailableRefreshOptions = () => {
        // Combine Radarr and Sonarr for backwards compatibility with API
        const allArrInstances = [
            ...availableInstances.radarrInstances,
            ...availableInstances.sonarrInstances,
        ];

        return {
            radarrInstances: availableInstances.radarrInstances,
            sonarrInstances: availableInstances.sonarrInstances,
            arrInstances: allArrInstances, // For API compatibility
            plexInstances: availableInstances.plexInstances,
            libraries: availableLibraries,
        };
    };

    // ===== RENDER FUNCTIONS =====

    const renderSortSelect = () => {
        if (!showSort || !sortOptions.length) return null;

        return (
            <select
                value={currentSort}
                onChange={e => onSortChange(e.target.value)}
                disabled={isSearching}
            >
                {sortOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>
        );
    };

    const renderViewModeToggle = () => {
        if (!showViewToggle || !viewModes.length) return null;

        return (
            <div className="view-mode-group">
                {viewModes.map(mode => (
                    <React.Fragment key={mode.key}>
                        <button
                            type="button"
                            ref={el => (viewBtnRefs.current[mode.key] = el)}
                            className={`view-mode-btn${currentView === mode.key ? ' active' : ''}`}
                            data-view={mode.key}
                            onClick={() => onViewChange(mode.key)}
                            onMouseEnter={() => setHoveredView(mode.key)}
                            onMouseLeave={() => setHoveredView(null)}
                            onFocus={() => setHoveredView(mode.key)}
                            onBlur={() => setHoveredView(null)}
                            disabled={isSearching}
                            aria-pressed={currentView === mode.key}
                            aria-label={`Switch to ${mode.label.toLowerCase()} view`}
                        >
                            <span className="icon">{getIcon(mode.icon)}</span>
                        </button>
                        <TooltipFactory
                            anchor={viewBtnRefs.current[mode.key]}
                            text={mode.tooltip}
                            show={hoveredView === mode.key}
                        />
                    </React.Fragment>
                ))}
            </div>
        );
    };

    const renderFilter = filter => {
        const { key, type, label, options, icon = 'mi:filter_list' } = filter;
        const isActive = dropdownStates[key];
        const currentValue = activeFilters[key];

        if (type === 'dropdown') {
            return (
                <div key={key} className="search-bar-icon search-bar-btn-icon">
                    <button
                        type="button"
                        className="search-bar-btn"
                        aria-label={label}
                        tabIndex={0}
                        title={label}
                        ref={el => (filterRefs.current[key] = el)}
                        onClick={() => toggleDropdown(key)}
                        onMouseEnter={() => setTooltipState(`filter-${key}`, true)}
                        onMouseLeave={() => setTooltipState(`filter-${key}`, false)}
                        onFocus={() => setTooltipState(`filter-${key}`, true)}
                        onBlur={() => setTooltipState(`filter-${key}`, false)}
                        disabled={isSearching}
                    >
                        {getIcon(icon)}
                    </button>
                    <TooltipFactory
                        anchor={filterRefs.current[key]}
                        text={label}
                        show={tooltipStates[`filter-${key}`]}
                    />
                    {isActive && (
                        <div className="search-bar-btn-dropdown">
                            {options.map(opt => (
                                <div
                                    key={opt.value}
                                    className={`search-bar-btn-option${currentValue === opt.value ? ' active' : ''}`}
                                    tabIndex={0}
                                    onClick={() => handleFilterSelect(key, opt.value)}
                                    onKeyDown={e => handleFilterKeyDown(e, key, opt.value)}
                                >
                                    {opt.label}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            );
        }

        // Add support for other filter types in the future
        return null;
    };

    const renderSearchBar = () => {
        if (!shouldShowSearch) return null;

        return (
            <div className={`search-bar-container${searchTerm ? ' has-clear-btn' : ''}`}>
                {/* Render filter controls */}
                {filters.map((filter, index) => (
                    <React.Fragment key={filter.id || `filter-${index}`}>
                        {renderFilter(filter)}
                    </React.Fragment>
                ))}

                {/* Search input */}
                <input
                    ref={searchInputRef}
                    type="text"
                    id="search-input"
                    className="search-bar"
                    placeholder={placeholder}
                    autoComplete="off"
                    spellCheck={false}
                    value={searchTerm}
                    onChange={e => onSearchTermChange(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    autoFocus
                    disabled={isSearching}
                    aria-label={placeholder}
                    aria-describedby="search-instructions"
                />

                {/* Autocomplete dropdown */}
                {showAutocomplete && autocompleteSuggestions.length > 0 && (
                    <div ref={autocompleteRef} className="search-autocomplete">
                        {autocompleteSuggestions.map((suggestion, index) => (
                            <div
                                key={suggestion.id || index}
                                className={`search-autocomplete__item${index === selectedSuggestionIndex ? ' search-autocomplete__item--highlighted' : ''}`}
                                onClick={() => selectSuggestion(suggestion)}
                                onMouseEnter={() => setSelectedSuggestionIndex(index)}
                            >
                                <div className="search-autocomplete__title">{suggestion.title}</div>
                                <div className="search-autocomplete__subtitle">
                                    {suggestion.year} • {suggestion.type}
                                    {suggestion.countType &&
                                        suggestion.instanceCount > 0 &&
                                        ` • ${suggestion.instanceCount} ${suggestion.countType}`}
                                    {/* Debug logging for autocomplete display */}
                                    {suggestion.title &&
                                        suggestion.title.toLowerCase().includes('broke') &&
                                        console.log('AUTOCOMPLETE UI - Rendering:', {
                                            title: suggestion.title,
                                            instanceCount: suggestion.instanceCount,
                                            countType: suggestion.countType,
                                            year: suggestion.year,
                                            type: suggestion.type,
                                        })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Screen reader instructions */}
                <div id="search-instructions" className="sr-only" aria-live="polite">
                    Press Enter to search, Escape to clear, or use arrow keys to navigate results
                </div>

                {/* Clear button */}
                {!!searchTerm && (
                    <button
                        className="clear-btn"
                        type="button"
                        tabIndex={0}
                        aria-label="Clear"
                        title="Clear search"
                        onClick={onClear}
                        disabled={isSearching}
                    >
                        {getIcon('mi:close')}
                    </button>
                )}

                {/* Search button */}
                <button
                    className="search-btn"
                    type="button"
                    aria-label="Search"
                    ref={searchBtnRef}
                    title="Run search"
                    onClick={onSearch}
                    disabled={isSearching}
                    onMouseEnter={() => setShowSearchTip(true)}
                    onMouseLeave={() => setShowSearchTip(false)}
                    onFocus={() => setShowSearchTip(true)}
                    onBlur={() => setShowSearchTip(false)}
                >
                    {getIcon('mi:search')}
                </button>
                <TooltipFactory
                    anchor={searchBtnRef.current}
                    text="Run search"
                    show={showSearchTip}
                />

                {/* Help button - only for MediaSearch */}
                {showAdvancedSearchHelp && (
                    <>
                        <button
                            className="search-btn help-btn"
                            type="button"
                            aria-label="Show search help"
                            ref={helpPopover.triggerRef}
                            title="Search help"
                            onClick={handleHelpToggle}
                            onMouseEnter={() => setShowHelpTooltip(true)}
                            onMouseLeave={() => setShowHelpTooltip(false)}
                            onFocus={() => setShowHelpTooltip(true)}
                            onBlur={() => setShowHelpTooltip(false)}
                        >
                            {getIcon('mi:help')}
                        </button>
                        <TooltipFactory
                            anchor={helpPopover.triggerRef.current}
                            text="Search help"
                            show={showHelpTooltip && !helpPopover.show}
                        />

                        {/* Help popover */}
                        <Popover
                            triggerRef={helpPopover.triggerRef}
                            show={helpPopover.show}
                            onClose={helpPopover.close}
                            variant="help"
                            position="bottom"
                            ariaLabel="Advanced search help"
                        >
                            <div className="popover__title">Advanced Search</div>
                            <div className="popover__content">
                                <p>Use database IDs for precise searches:</p>
                                <div className="help-examples">
                                    <div className="help-example">
                                        <code>tmdb:123</code>
                                        <span>Search by TMDb ID</span>
                                    </div>
                                    <div className="help-example">
                                        <code>imdb:tt123456</code>
                                        <span>Search by IMDb ID</span>
                                    </div>
                                    <div className="help-example">
                                        <code>tvdb:789</code>
                                        <span>Search by TVDb ID</span>
                                    </div>
                                </div>
                            </div>
                        </Popover>
                    </>
                )}
            </div>
        );
    };

    const renderSelector = () => {
        if (!shouldShowSelector) return null;

        return (
            <div className="selector-container">
                <button
                    ref={selectorPopover.triggerRef}
                    type="button"
                    className={`btn btn-secondary selector-btn${selectorPopover.show ? ' active' : ''}`}
                    onClick={handleSelectorToggle}
                    onMouseEnter={() => setShowSelectorTooltip(true)}
                    onMouseLeave={() => setShowSelectorTooltip(false)}
                    onFocus={() => setShowSelectorTooltip(true)}
                    onBlur={() => setShowSelectorTooltip(false)}
                    title={`Select ${selectorLabel.toLowerCase()}`}
                >
                    {getIcon('mi:apps')}
                    {selectorLabel}
                </button>
                <TooltipFactory
                    anchor={selectorPopover.triggerRef.current}
                    text={`Select ${selectorLabel.toLowerCase()}`}
                    show={showSelectorTooltip && !selectorPopover.show}
                />

                <Popover
                    triggerRef={selectorPopover.triggerRef}
                    show={selectorPopover.show}
                    onClose={selectorPopover.close}
                    variant="selector"
                    position="bottom"
                    ariaLabel={`Select ${selectorLabel.toLowerCase()}`}
                >
                    <div className="popover__title">Select {selectorLabel}</div>
                    <ul className="popover__list">
                        {sources.map(source => (
                            <li key={source.key}>
                                <button
                                    type="button"
                                    className={`popover__list-item${currentSource === source.key ? ' popover__list-item--selected' : ''}`}
                                    onClick={() => handleSelectorSelect(source.key)}
                                >
                                    {source.icon && (
                                        <span
                                            className="selector-option-icon"
                                            style={{ marginRight: 'var(--space-2)' }}
                                        >
                                            {getIcon(source.icon)}
                                        </span>
                                    )}
                                    <span className="selector-option-label">{source.label}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </Popover>
            </div>
        );
    };

    const renderRefreshButton = () => {
        if (!shouldShowRefresh) return null;

        const availableOptions = getAvailableRefreshOptions();

        return (
            <div className="refresh-controls">
                <button
                    ref={refreshPopover.triggerRef}
                    type="button"
                    className={`btn btn-secondary refresh-btn${refreshPopover.show ? ' active' : ''}`}
                    onClick={handleRefreshToggle}
                    onMouseEnter={() => setShowRefreshTooltip(true)}
                    onMouseLeave={() => setShowRefreshTooltip(false)}
                    onFocus={() => setShowRefreshTooltip(true)}
                    onBlur={() => setShowRefreshTooltip(false)}
                    disabled={isRefreshing}
                    title={isRefreshing ? 'Refreshing...' : 'Refresh Database'}
                >
                    {getIcon('mi:refresh')}
                    {isRefreshing ? 'Refreshing...' : 'Refresh'}
                </button>
                <TooltipFactory
                    anchor={refreshPopover.triggerRef.current}
                    text={isRefreshing ? 'Refreshing...' : 'Refresh Database'}
                    show={showRefreshTooltip && !refreshPopover.show}
                />

                <Popover
                    triggerRef={refreshPopover.triggerRef}
                    show={refreshPopover.show}
                    onClose={refreshPopover.close}
                    variant="actions"
                    position="bottom"
                    ariaLabel="Refresh database options"
                    className="popover--wide"
                >
                    <div
                        className="refresh-popover-header"
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 'var(--space-4)',
                        }}
                    >
                        <div className="popover__title">Refresh Database</div>
                        <div
                            className="overall-select-buttons"
                            style={{ display: 'flex', gap: 'var(--space-2)' }}
                        >
                            <button
                                type="button"
                                className="select-icon-btn"
                                onClick={handleSelectAllOverall}
                                title="Select all instances and libraries"
                            >
                                {getIcon('mi:select_all')}
                            </button>
                            <button
                                type="button"
                                className="select-icon-btn"
                                onClick={handleDeselectAllOverall}
                                title="Deselect everything"
                            >
                                {getIcon('mi:clear')}
                            </button>
                        </div>
                    </div>
                    <div className="refresh-popover-content">
                        {/* Radarr Instances Section */}
                        {availableOptions.radarrInstances.length > 0 ? (
                            <div
                                className="refresh-section"
                                style={{ marginBottom: 'var(--space-4)' }}
                            >
                                <div
                                    className="refresh-section-header"
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginBottom: 'var(--space-2)',
                                    }}
                                >
                                    <h5
                                        style={{
                                            margin: 0,
                                            fontSize: 'var(--font-size-2)',
                                            fontWeight: 'var(--font-weight-semibold)',
                                        }}
                                    >
                                        Radarr Instances
                                    </h5>
                                    <div
                                        className="select-all-buttons"
                                        style={{ display: 'flex', gap: 'var(--space-1)' }}
                                    >
                                        <button
                                            type="button"
                                            className="select-icon-btn"
                                            onClick={handleSelectAllRadarr}
                                            title="Select all Radarr instances"
                                        >
                                            {getIcon('mi:check_box')}
                                        </button>
                                        <button
                                            type="button"
                                            className="select-icon-btn"
                                            onClick={handleDeselectAllRadarr}
                                            title="Deselect all Radarr instances"
                                        >
                                            {getIcon('mi:check_box_outline_blank')}
                                        </button>
                                    </div>
                                </div>
                                {availableOptions.radarrInstances.map(instance => (
                                    <div
                                        key={instance}
                                        className="checkbox-row popover__list-item"
                                        onClick={() =>
                                            handleRefreshOptionToggle('arrInstances', instance)
                                        }
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 'var(--space-2)',
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            id={`radarr-${instance}`}
                                            checked={selectedRefreshOptions.arrInstances.includes(
                                                instance
                                            )}
                                            onChange={() => {}}
                                            onClick={e => e.stopPropagation()}
                                        />
                                        <label
                                            htmlFor={`radarr-${instance}`}
                                            style={{ flex: 1, cursor: 'pointer' }}
                                        >
                                            {humanize(instance)}
                                        </label>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div
                                className="refresh-section"
                                style={{ marginBottom: 'var(--space-4)' }}
                            >
                                <h5
                                    style={{
                                        margin: '0 0 var(--space-2) 0',
                                        fontSize: 'var(--font-size-2)',
                                        fontWeight: 'var(--font-weight-semibold)',
                                    }}
                                >
                                    Radarr Instances
                                </h5>
                                <div
                                    style={{
                                        color: 'var(--text-secondary)',
                                        fontSize: 'var(--font-size-1)',
                                        fontStyle: 'italic',
                                    }}
                                >
                                    No Radarr instances configured
                                </div>
                            </div>
                        )}

                        {/* Sonarr Instances Section */}
                        {availableOptions.sonarrInstances.length > 0 ? (
                            <div
                                className="refresh-section"
                                style={{ marginBottom: 'var(--space-4)' }}
                            >
                                <div
                                    className="refresh-section-header"
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginBottom: 'var(--space-2)',
                                    }}
                                >
                                    <h5
                                        style={{
                                            margin: 0,
                                            fontSize: 'var(--font-size-2)',
                                            fontWeight: 'var(--font-weight-semibold)',
                                        }}
                                    >
                                        Sonarr Instances
                                    </h5>
                                    <div
                                        className="select-all-buttons"
                                        style={{ display: 'flex', gap: 'var(--space-1)' }}
                                    >
                                        <button
                                            type="button"
                                            className="select-icon-btn"
                                            onClick={handleSelectAllSonarr}
                                            title="Select all Sonarr instances"
                                        >
                                            {getIcon('mi:check_box')}
                                        </button>
                                        <button
                                            type="button"
                                            className="select-icon-btn"
                                            onClick={handleDeselectAllSonarr}
                                            title="Deselect all Sonarr instances"
                                        >
                                            {getIcon('mi:check_box_outline_blank')}
                                        </button>
                                    </div>
                                </div>
                                {availableOptions.sonarrInstances.map(instance => (
                                    <div
                                        key={instance}
                                        className="checkbox-row popover__list-item"
                                        onClick={() =>
                                            handleRefreshOptionToggle('arrInstances', instance)
                                        }
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 'var(--space-2)',
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            id={`sonarr-${instance}`}
                                            checked={selectedRefreshOptions.arrInstances.includes(
                                                instance
                                            )}
                                            onChange={() => {}}
                                            onClick={e => e.stopPropagation()}
                                        />
                                        <label
                                            htmlFor={`sonarr-${instance}`}
                                            style={{ flex: 1, cursor: 'pointer' }}
                                        >
                                            {humanize(instance)}
                                        </label>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div
                                className="refresh-section"
                                style={{ marginBottom: 'var(--space-4)' }}
                            >
                                <h5
                                    style={{
                                        margin: '0 0 var(--space-2) 0',
                                        fontSize: 'var(--font-size-2)',
                                        fontWeight: 'var(--font-weight-semibold)',
                                    }}
                                >
                                    Sonarr Instances
                                </h5>
                                <div
                                    style={{
                                        color: 'var(--text-secondary)',
                                        fontSize: 'var(--font-size-1)',
                                        fontStyle: 'italic',
                                    }}
                                >
                                    No Sonarr instances configured
                                </div>
                            </div>
                        )}

                        <div className="refresh-section" style={{ marginBottom: 'var(--space-4)' }}>
                            <div
                                className="refresh-section-header"
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: 'var(--space-2)',
                                }}
                            >
                                <h5
                                    style={{
                                        margin: 0,
                                        fontSize: 'var(--font-size-2)',
                                        fontWeight: 'var(--font-weight-semibold)',
                                    }}
                                >
                                    Plex Libraries
                                </h5>
                                <div
                                    className="library-controls"
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 'var(--space-2)',
                                    }}
                                >
                                    <button
                                        type="button"
                                        onClick={handleLoadLibraries}
                                        disabled={loadingLibraries}
                                        className="btn btn-secondary btn-sm"
                                    >
                                        {loadingLibraries ? 'Loading...' : 'Load Libraries'}
                                    </button>
                                    {availableOptions.libraries.length > 0 && (
                                        <div
                                            className="select-all-buttons"
                                            style={{ display: 'flex', gap: 'var(--space-1)' }}
                                        >
                                            <button
                                                type="button"
                                                className="select-icon-btn"
                                                onClick={handleSelectAllLibraries}
                                                title="Select all libraries"
                                            >
                                                {getIcon('mi:check_box')}
                                            </button>
                                            <button
                                                type="button"
                                                className="select-icon-btn"
                                                onClick={handleDeselectAllLibraries}
                                                title="Deselect all libraries"
                                            >
                                                {getIcon('mi:check_box_outline_blank')}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                            {availableOptions.libraries.length > 0 ? (
                                availableOptions.libraries.map(library => (
                                    <div
                                        key={library.name || library}
                                        className="checkbox-row popover__list-item"
                                        onClick={() =>
                                            handleRefreshOptionToggle(
                                                'libraries',
                                                library.name || library
                                            )
                                        }
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 'var(--space-2)',
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            id={`lib-${library.name || library}`}
                                            checked={selectedRefreshOptions.libraries.includes(
                                                library.name || library
                                            )}
                                            onChange={() => {}}
                                            onClick={e => e.stopPropagation()}
                                        />
                                        <label
                                            htmlFor={`lib-${library.name || library}`}
                                            style={{ flex: 1, cursor: 'pointer' }}
                                        >
                                            {library.displayName || library}
                                        </label>
                                    </div>
                                ))
                            ) : (
                                <div
                                    style={{
                                        color: 'var(--text-secondary)',
                                        fontSize: 'var(--font-size-1)',
                                        fontStyle: 'italic',
                                    }}
                                >
                                    Click &ldquo;Load Libraries&rdquo; to see available options
                                </div>
                            )}
                        </div>

                        {selectedRefreshOptions.plexInstances.length > 0 && (
                            <div
                                style={{
                                    padding: 'var(--space-3)',
                                    backgroundColor: 'var(--surface-variant)',
                                    border: `var(--border-width-1) solid var(--accent)`,
                                    borderRadius: 'var(--radius-2)',
                                    fontSize: 'var(--font-size-1)',
                                    color: 'var(--text-secondary)',
                                }}
                            >
                                <strong>Auto-selected Plex instances:</strong>{' '}
                                {selectedRefreshOptions.plexInstances.join(', ')}
                            </div>
                        )}
                    </div>
                    <div className="popover__divider" style={{ margin: 'var(--space-4) 0' }}></div>
                    <div
                        className="refresh-popover-actions"
                        style={{
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: 'var(--space-3)',
                        }}
                    >
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={refreshPopover.close}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={handleRefreshExecute}
                            disabled={isRefreshing}
                        >
                            {isRefreshing ? 'Refreshing...' : 'Refresh Selected'}
                        </button>
                    </div>
                </Popover>
            </div>
        );
    };

    // ===== MAIN RENDER =====
    // If header search is active, hide all page-level controls
    if (isHeaderSearchActive) {
        return null;
    }

    // Normal page-level search controls with reorganized layout
    return (
        <div>
            <div className="search-controls">
                <div className="search-controls__left">
                    {renderSelector()}
                    {renderRefreshButton()}
                </div>
                <div className="search-controls__right">
                    {renderSortSelect()}
                    {renderViewModeToggle()}
                </div>
            </div>
            {renderSearchBar()}
        </div>
    );
}

export default SearchControlsWrapper;
