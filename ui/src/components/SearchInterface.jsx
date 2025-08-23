import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { getIcon, humanize } from '../utils/tools';
import TooltipFactory from './Tooltip';
import Popover from './Popover';
import usePopover from '../hooks/usePopover';
import { useSearchCoordinator } from '../contexts/SearchCoordinatorProvider';

/**
 * HeaderSearch - The main header search component that provides an immersive search experience
 * This component integrates seamlessly with the header design while maintaining full feature parity
 */
function HeaderSearchInner() {
    const location = useLocation();
    const headerSearchContext = useSearchCoordinator();

    // Local state for header search - always initialize all hooks
    const [searchTerm, setSearchTerm] = useState('');
    const [currentView, setCurrentView] = useState('grid');
    const [currentSource, setCurrentSource] = useState(null);
    const [currentSort, setCurrentSort] = useState('alpha');
    const [activeFilters, setActiveFilters] = useState({});
    const [isSearching, setIsSearching] = useState(false);

    // Autocomplete state
    const [autocompleteSuggestions, setAutocompleteSuggestions] = useState([]);
    const [showAutocomplete, setShowAutocomplete] = useState(false);
    const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);

    // Refs
    const searchInputRef = useRef(null);
    const autocompleteRef = useRef();

    // Popover states for header controls
    const modulePopover = usePopover(false);
    const viewPopover = usePopover(false);
    const sortPopover = usePopover(false);
    const filterPopover = usePopover(false);
    const refreshPopover = usePopover(false);

    // Tooltip states
    const [showTooltips, setShowTooltips] = useState({});

    // Refresh functionality state
    const [selectedRefreshOptions, setSelectedRefreshOptions] = useState({
        arrInstances: [],
        plexInstances: [],
        libraries: [],
    });
    const [availableInstances, setAvailableInstances] = useState({
        radarrInstances: [],
        sonarrInstances: [],
        plexInstances: [],
    });
    const [availableLibraries, setAvailableLibraries] = useState([]);
    const [loadingLibraries, setLoadingLibraries] = useState(false);

    // Extract context values
    const {
        isSearchPage,
        searchAdapter,
        searchConfig,
        executeHeaderSearch,
        changeSource,
        changeView,
        changeSort,
        changeFilter,
        executeRefresh,
        registerHeaderSearch,
    } = headerSearchContext;

    // Register with HeaderSearchProvider
    useEffect(() => {
        if (!registerHeaderSearch) return;

        const headerSearchAPI = {
            updateSearchTerm: term => setSearchTerm(term),
            updateView: view => setCurrentView(view),
            updateSource: source => setCurrentSource(source),
            updateSearching: searching => setIsSearching(searching),
        };

        registerHeaderSearch(headerSearchAPI);
    }, [registerHeaderSearch]);

    // Initialize with current search config when it becomes available
    useEffect(() => {
        if (searchConfig) {
            setCurrentSource(searchConfig.defaultSource);
            setCurrentView(searchConfig.defaultView || 'grid');
            setCurrentSort(searchConfig.defaultSort || 'alpha');
        }
    }, [searchConfig]);

    // Load available instances from API on component mount
    useEffect(() => {
        const loadInstances = async () => {
            try {
                const response = await fetch('/api/instances/');
                const data = await response.json();

                if (data.success && data.data) {
                    const radarrInstances = [];
                    const sonarrInstances = [];
                    const plexInstances = [];

                    // Extract Radarr instances
                    if (data.data.radarr) {
                        radarrInstances.push(...Object.keys(data.data.radarr));
                    }

                    // Extract Sonarr instances
                    if (data.data.sonarr) {
                        sonarrInstances.push(...Object.keys(data.data.sonarr));
                    }

                    // Extract Plex instances
                    if (data.data.plex) {
                        plexInstances.push(...Object.keys(data.data.plex));
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

    // Handle autocomplete
    useEffect(() => {
        if (!searchAdapter?.getAutocompleteSuggestions || !searchTerm || searchTerm.length < 2) {
            setAutocompleteSuggestions([]);
            setShowAutocomplete(false);
            return;
        }

        try {
            const suggestions = searchAdapter.getAutocompleteSuggestions(searchTerm);
            setAutocompleteSuggestions(suggestions);
            setShowAutocomplete(suggestions.length > 0);
            setSelectedSuggestionIndex(-1);
        } catch (error) {
            console.warn('Header autocomplete error:', error);
            setAutocompleteSuggestions([]);
            setShowAutocomplete(false);
        }
    }, [searchTerm, searchAdapter]);

    // Handle click outside autocomplete to close it
    useEffect(() => {
        if (!showAutocomplete) return;

        const handleClickOutside = e => {
            if (
                autocompleteRef.current &&
                !autocompleteRef.current.contains(e.target) &&
                searchInputRef.current &&
                !searchInputRef.current.contains(e.target)
            ) {
                setShowAutocomplete(false);
                setSelectedSuggestionIndex(-1);
            }
        };

        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [showAutocomplete]);

    // Handle search execution
    const handleSearch = useCallback(() => {
        // Always execute search, even for empty/blank terms to return all results
        executeHeaderSearch(searchTerm.trim());
        setShowAutocomplete(false);
    }, [searchTerm, executeHeaderSearch]);

    // Handle clear
    const handleClear = useCallback(() => {
        setSearchTerm('');
        setShowAutocomplete(false);
        executeHeaderSearch('');
    }, [executeHeaderSearch]);

    // Handle autocomplete selection - must be defined before handleKeyDown
    const selectSuggestion = useCallback(
        suggestion => {
            setSearchTerm(suggestion.title);
            setShowAutocomplete(false);
            setSelectedSuggestionIndex(-1);
            // Pass exact match options to filter to this specific item
            setTimeout(
                () =>
                    executeHeaderSearch(suggestion.title, {
                        exactMatch: true,
                        suggestionId: suggestion.id,
                        suggestionData: suggestion,
                    }),
                100
            );
        },
        [executeHeaderSearch]
    );

    // Handle key navigation for autocomplete
    const handleKeyDown = useCallback(
        e => {
            if (showAutocomplete && autocompleteSuggestions.length > 0) {
                switch (e.key) {
                    case 'ArrowDown':
                        e.preventDefault();
                        setSelectedSuggestionIndex(prev =>
                            prev < autocompleteSuggestions.length - 1 ? prev + 1 : -1
                        );
                        break;
                    case 'ArrowUp':
                        e.preventDefault();
                        setSelectedSuggestionIndex(prev =>
                            prev > -1 ? prev - 1 : autocompleteSuggestions.length - 1
                        );
                        break;
                    case 'Enter':
                        if (selectedSuggestionIndex >= 0) {
                            e.preventDefault();
                            const suggestion = autocompleteSuggestions[selectedSuggestionIndex];
                            selectSuggestion(suggestion);
                            return;
                        }
                        break;
                    case 'Escape':
                        e.preventDefault();
                        setShowAutocomplete(false);
                        setSelectedSuggestionIndex(-1);
                        return;
                }
            }

            if (e.key === 'Enter') {
                e.preventDefault();
                handleSearch();
            }
        },
        [
            showAutocomplete,
            autocompleteSuggestions,
            selectedSuggestionIndex,
            handleSearch,
            selectSuggestion,
        ]
    );

    // Handle source change
    const handleSourceChange = useCallback(
        source => {
            setCurrentSource(source);
            changeSource(source);
            modulePopover.close();
        },
        [changeSource, modulePopover]
    );

    // Handle view change
    const handleViewChange = useCallback(
        view => {
            setCurrentView(view);
            changeView(view);
            viewPopover.close();
        },
        [changeView, viewPopover]
    );

    // Handle sort change
    const handleSortChange = useCallback(
        sort => {
            setCurrentSort(sort);
            changeSort(sort);
            sortPopover.close();
        },
        [changeSort, sortPopover]
    );

    // Handle filter change
    const handleFilterChange = useCallback(
        (filterKey, value) => {
            setActiveFilters(prev => ({ ...prev, [filterKey]: value }));
            changeFilter(filterKey, value);
            filterPopover.close();
        },
        [changeFilter, filterPopover]
    );

    // Tooltip helper
    const setTooltip = useCallback((key, show) => {
        setShowTooltips(prev => ({ ...prev, [key]: show }));
    }, []);

    // Load available instances from API on component mount
    useEffect(() => {
        const loadInstances = async () => {
            try {
                const response = await fetch('/api/instances/');
                const data = await response.json();

                if (data.success && data.data) {
                    const radarrInstances = [];
                    const sonarrInstances = [];
                    const plexInstances = [];

                    // Extract Radarr instances
                    if (data.data.radarr) {
                        radarrInstances.push(...Object.keys(data.data.radarr));
                    }

                    // Extract Sonarr instances
                    if (data.data.sonarr) {
                        sonarrInstances.push(...Object.keys(data.data.sonarr));
                    }

                    // Extract Plex instances
                    if (data.data.plex) {
                        plexInstances.push(...Object.keys(data.data.plex));
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

    // Handle library loading
    const handleLoadLibraries = useCallback(async () => {
        setLoadingLibraries(true);
        try {
            // Fetch instances first to get Plex instances
            const instancesResponse = await fetch('/api/instances/');
            const instancesData = await instancesResponse.json();

            const plexInstances = instancesData.data?.plex || {};
            const librariesWithInstance = [];

            // Load libraries for each Plex instance and track which instance they belong to
            for (const [instanceName] of Object.entries(plexInstances)) {
                try {
                    const librariesResponse = await fetch(
                        `/api/plex/libraries?instance=${encodeURIComponent(instanceName)}`
                    );
                    const librariesData = await librariesResponse.json();

                    if (librariesData.success && librariesData.data?.libraries) {
                        librariesData.data.libraries.forEach(lib => {
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
    }, []);

    // Refresh option handlers
    const handleRefreshOptionToggle = useCallback(
        (category, item) => {
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
                                newPlexInstances = newPlexInstances.filter(
                                    x => x !== library.instance
                                );
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
        },
        [availableLibraries]
    );

    // Select/deselect handlers
    const handleSelectAllRadarr = useCallback(() => {
        setSelectedRefreshOptions(prev => ({
            ...prev,
            arrInstances: [
                ...new Set([...prev.arrInstances, ...availableInstances.radarrInstances]),
            ],
        }));
    }, [availableInstances.radarrInstances]);

    const handleDeselectAllRadarr = useCallback(() => {
        setSelectedRefreshOptions(prev => ({
            ...prev,
            arrInstances: prev.arrInstances.filter(
                instance => !availableInstances.radarrInstances.includes(instance)
            ),
        }));
    }, [availableInstances.radarrInstances]);

    const handleSelectAllSonarr = useCallback(() => {
        setSelectedRefreshOptions(prev => ({
            ...prev,
            arrInstances: [
                ...new Set([...prev.arrInstances, ...availableInstances.sonarrInstances]),
            ],
        }));
    }, [availableInstances.sonarrInstances]);

    const handleDeselectAllSonarr = useCallback(() => {
        setSelectedRefreshOptions(prev => ({
            ...prev,
            arrInstances: prev.arrInstances.filter(
                instance => !availableInstances.sonarrInstances.includes(instance)
            ),
        }));
    }, [availableInstances.sonarrInstances]);

    const handleSelectAllLibraries = useCallback(() => {
        const allLibraries = availableLibraries.map(lib => lib.name || lib);
        const allPlexInstances = [...new Set(availableLibraries.map(lib => lib.instance))];
        setSelectedRefreshOptions(prev => ({
            ...prev,
            libraries: allLibraries,
            plexInstances: allPlexInstances,
        }));
    }, [availableLibraries]);

    const handleDeselectAllLibraries = useCallback(() => {
        setSelectedRefreshOptions(prev => ({
            ...prev,
            libraries: [],
            plexInstances: [],
        }));
    }, []);

    const handleSelectAllOverall = useCallback(() => {
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
    }, [availableInstances, availableLibraries]);

    const handleDeselectAllOverall = useCallback(() => {
        setSelectedRefreshOptions({
            arrInstances: [],
            libraries: [],
            plexInstances: [],
        });
    }, []);

    const handleRefreshExecute = useCallback(() => {
        if (executeRefresh) {
            executeRefresh(selectedRefreshOptions);
        }
        refreshPopover.close();
    }, [executeRefresh, selectedRefreshOptions, refreshPopover]);

    // Get current page type for placeholder
    const getPlaceholder = () => {
        if (location.pathname.startsWith('/media/search')) return 'Search media...';
        if (location.pathname.startsWith('/poster/search/assets')) return 'Search assets...';
        if (location.pathname.startsWith('/poster/search/gdrive')) return 'Search Google Drive...';
        return 'Search...';
    };

    // Get contextual label for module selector based on current page
    const getModuleLabel = () => {
        if (location.pathname.startsWith('/media/search')) return 'Modules';
        if (location.pathname.startsWith('/poster/search/gdrive')) return 'Source';
        if (location.pathname.startsWith('/poster/search/assets')) return 'Asset Type';
        return 'Module';
    };

    // Check if we should hide the module selector completely
    const shouldHideModuleSelector = () => {
        return location.pathname.startsWith('/poster/search/assets');
    };

    // Get available sources from config
    const sources = searchConfig?.sources || [];
    const sortOptions = searchConfig?.sortOptions || [];
    const filters = searchConfig?.filters || [];

    // Early returns after all hooks are called
    if (!isSearchPage || !isSearchPage()) {
        return null;
    }

    return (
        <div className="header-search">
            {/* Search Input Section - Centered */}
            <div className="header-search__input-container">
                <div className="header-search__input-wrapper">
                    <input
                        ref={searchInputRef}
                        type="text"
                        className="header-search__input"
                        placeholder={getPlaceholder()}
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onFocus={() =>
                            searchTerm.length >= 2 &&
                            setShowAutocomplete(autocompleteSuggestions.length > 0)
                        }
                        disabled={isSearching}
                        autoComplete="off"
                        spellCheck={false}
                        aria-label={getPlaceholder()}
                        aria-describedby="header-search-instructions"
                        aria-expanded={showAutocomplete}
                        aria-owns={showAutocomplete ? 'header-search-autocomplete' : undefined}
                        role="combobox"
                    />

                    {/* Search button */}
                    <button
                        type="button"
                        className="header-search__button header-search__button--search"
                        onClick={handleSearch}
                        disabled={isSearching}
                        onMouseEnter={() => setTooltip('search', true)}
                        onMouseLeave={() => setTooltip('search', false)}
                        onFocus={() => setTooltip('search', true)}
                        onBlur={() => setTooltip('search', false)}
                    >
                        {getIcon(isSearching ? 'mi:hourglass_empty' : 'mi:search')}
                    </button>
                    <TooltipFactory
                        anchor={searchInputRef.current}
                        text="Search"
                        show={showTooltips.search}
                    />

                    {/* Clear button */}
                    {searchTerm && (
                        <button
                            type="button"
                            className="header-search__button header-search__button--clear"
                            onClick={handleClear}
                            onMouseEnter={() => setTooltip('clear', true)}
                            onMouseLeave={() => setTooltip('clear', false)}
                            onFocus={() => setTooltip('clear', true)}
                            onBlur={() => setTooltip('clear', false)}
                        >
                            {getIcon('mi:close')}
                        </button>
                    )}
                </div>

                {/* Autocomplete dropdown */}
                {showAutocomplete && autocompleteSuggestions.length > 0 && (
                    <div
                        ref={autocompleteRef}
                        className="header-search__autocomplete"
                        id="header-search-autocomplete"
                        role="listbox"
                        aria-label="Search suggestions"
                    >
                        {autocompleteSuggestions.map((suggestion, index) => (
                            <div
                                key={suggestion.id || index}
                                className={`header-search__autocomplete-item${
                                    index === selectedSuggestionIndex
                                        ? ' header-search__autocomplete-item--highlighted'
                                        : ''
                                }`}
                                onClick={() => selectSuggestion(suggestion)}
                                onMouseEnter={() => setSelectedSuggestionIndex(index)}
                                role="option"
                                aria-selected={index === selectedSuggestionIndex}
                                id={`header-search-option-${index}`}
                            >
                                <div className="header-search__autocomplete-title">
                                    {suggestion.title}
                                </div>
                                <div className="header-search__autocomplete-subtitle">
                                    {suggestion.year} • {suggestion.type}
                                    {suggestion.countType &&
                                        suggestion.instanceCount > 0 &&
                                        ` • ${suggestion.instanceCount} ${suggestion.countType}`}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Screen reader instructions */}
                <div id="header-search-instructions" className="sr-only" aria-live="polite">
                    Type to search, use arrow keys to navigate suggestions, press Enter to select
                </div>
            </div>

            {/* Controls Section */}
            <div className="header-search__controls">
                {/* Module Selector */}
                {sources.length > 0 && !shouldHideModuleSelector() && (
                    <div className="header-search__control">
                        <button
                            ref={modulePopover.triggerRef}
                            type="button"
                            className={`header-search__control-button${modulePopover.show ? ' active' : ''}`}
                            onClick={modulePopover.toggle}
                            onMouseEnter={() => setTooltip('module', true)}
                            onMouseLeave={() => setTooltip('module', false)}
                            onFocus={() => setTooltip('module', true)}
                            onBlur={() => setTooltip('module', false)}
                        >
                            {getIcon('mi:apps')}
                            <span className="header-search__control-label">{getModuleLabel()}</span>
                        </button>
                        <TooltipFactory
                            anchor={modulePopover.triggerRef.current}
                            text="Select source"
                            show={showTooltips.module && !modulePopover.show}
                        />

                        <Popover
                            triggerRef={modulePopover.triggerRef}
                            show={modulePopover.show}
                            onClose={modulePopover.close}
                            variant="selector"
                            position="bottom"
                            ariaLabel="Select source"
                        >
                            <div className="popover__title">Select {getModuleLabel()}</div>
                            <ul className="popover__list">
                                {sources.map(source => (
                                    <li key={source.key}>
                                        <button
                                            type="button"
                                            className={`popover__list-item${
                                                currentSource === source.key
                                                    ? ' popover__list-item--selected'
                                                    : ''
                                            }`}
                                            onClick={() => handleSourceChange(source.key)}
                                        >
                                            {source.icon && (
                                                <span className="popover__list-icon">
                                                    {getIcon(source.icon)}
                                                </span>
                                            )}
                                            <span>{source.label}</span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </Popover>
                    </div>
                )}

                {/* View Toggle */}
                <div className="header-search__control">
                    <button
                        ref={viewPopover.triggerRef}
                        type="button"
                        className={`header-search__control-button${viewPopover.show ? ' active' : ''}`}
                        onClick={viewPopover.toggle}
                        onMouseEnter={() => setTooltip('view', true)}
                        onMouseLeave={() => setTooltip('view', false)}
                        onFocus={() => setTooltip('view', true)}
                        onBlur={() => setTooltip('view', false)}
                    >
                        {getIcon(currentView === 'grid' ? 'mi:grid_view' : 'mi:list')}
                    </button>
                    <TooltipFactory
                        anchor={viewPopover.triggerRef.current}
                        text={`Switch to ${currentView === 'grid' ? 'list' : 'grid'} view`}
                        show={showTooltips.view && !viewPopover.show}
                    />

                    <Popover
                        triggerRef={viewPopover.triggerRef}
                        show={viewPopover.show}
                        onClose={viewPopover.close}
                        variant="actions"
                        position="bottom"
                        ariaLabel="Select view mode"
                    >
                        <div className="popover__title">View Mode</div>
                        <ul className="popover__list">
                            <li>
                                <button
                                    type="button"
                                    className={`popover__list-item${
                                        currentView === 'grid'
                                            ? ' popover__list-item--selected'
                                            : ''
                                    }`}
                                    onClick={() => handleViewChange('grid')}
                                >
                                    <span className="popover__list-icon">
                                        {getIcon('mi:grid_view')}
                                    </span>
                                    <span>Grid View</span>
                                </button>
                            </li>
                            <li>
                                <button
                                    type="button"
                                    className={`popover__list-item${
                                        currentView === 'list'
                                            ? ' popover__list-item--selected'
                                            : ''
                                    }`}
                                    onClick={() => handleViewChange('list')}
                                >
                                    <span className="popover__list-icon">{getIcon('mi:list')}</span>
                                    <span>List View</span>
                                </button>
                            </li>
                        </ul>
                    </Popover>
                </div>

                {/* Sort Options */}
                {sortOptions.length > 0 && (
                    <div className="header-search__control">
                        <button
                            ref={sortPopover.triggerRef}
                            type="button"
                            className={`header-search__control-button${sortPopover.show ? ' active' : ''}`}
                            onClick={sortPopover.toggle}
                            onMouseEnter={() => setTooltip('sort', true)}
                            onMouseLeave={() => setTooltip('sort', false)}
                            onFocus={() => setTooltip('sort', true)}
                            onBlur={() => setTooltip('sort', false)}
                        >
                            {getIcon('mi:sort')}
                        </button>
                        <TooltipFactory
                            anchor={sortPopover.triggerRef.current}
                            text="Sort options"
                            show={showTooltips.sort && !sortPopover.show}
                        />

                        <Popover
                            triggerRef={sortPopover.triggerRef}
                            show={sortPopover.show}
                            onClose={sortPopover.close}
                            variant="actions"
                            position="bottom"
                            ariaLabel="Select sort order"
                        >
                            <div className="popover__title">Sort By</div>
                            <ul className="popover__list">
                                {sortOptions.map(option => (
                                    <li key={option.value}>
                                        <button
                                            type="button"
                                            className={`popover__list-item${
                                                currentSort === option.value
                                                    ? ' popover__list-item--selected'
                                                    : ''
                                            }`}
                                            onClick={() => handleSortChange(option.value)}
                                        >
                                            <span>{option.label}</span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </Popover>
                    </div>
                )}

                {/* Filter Options */}
                {filters.length > 0 && (
                    <div className="header-search__control">
                        <button
                            ref={filterPopover.triggerRef}
                            type="button"
                            className={`header-search__control-button${filterPopover.show ? ' active' : ''}`}
                            onClick={filterPopover.toggle}
                            onMouseEnter={() => setTooltip('filter', true)}
                            onMouseLeave={() => setTooltip('filter', false)}
                            onFocus={() => setTooltip('filter', true)}
                            onBlur={() => setTooltip('filter', false)}
                        >
                            {getIcon('mi:filter_list')}
                        </button>
                        <TooltipFactory
                            anchor={filterPopover.triggerRef.current}
                            text="Filter options"
                            show={showTooltips.filter && !filterPopover.show}
                        />

                        <Popover
                            triggerRef={filterPopover.triggerRef}
                            show={filterPopover.show}
                            onClose={filterPopover.close}
                            variant="actions"
                            position="bottom"
                            ariaLabel="Filter options"
                        >
                            <div className="popover__title">Filters</div>
                            <div className="popover__content">
                                {filters.map(filter => (
                                    <div key={filter.key} className="filter-group">
                                        <div className="filter-label">{filter.label}</div>
                                        <div className="filter-options">
                                            {filter.options?.map(option => (
                                                <button
                                                    key={option.value}
                                                    type="button"
                                                    className={`filter-option${
                                                        activeFilters[filter.key] === option.value
                                                            ? ' active'
                                                            : ''
                                                    }`}
                                                    onClick={() =>
                                                        handleFilterChange(filter.key, option.value)
                                                    }
                                                >
                                                    {option.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Popover>
                    </div>
                )}

                {/* Refresh Button - only for MediaSearch */}
                {location.pathname.startsWith('/media/search') && (
                    <div className="header-search__control">
                        <button
                            ref={refreshPopover.triggerRef}
                            type="button"
                            className={`header-search__control-button${refreshPopover.show ? ' active' : ''}`}
                            onClick={refreshPopover.toggle}
                            onMouseEnter={() => setTooltip('refresh', true)}
                            onMouseLeave={() => setTooltip('refresh', false)}
                            onFocus={() => setTooltip('refresh', true)}
                            onBlur={() => setTooltip('refresh', false)}
                            disabled={false}
                        >
                            {getIcon('mi:refresh')}
                        </button>
                        <TooltipFactory
                            anchor={refreshPopover.triggerRef.current}
                            text="Refresh database"
                            show={showTooltips.refresh && !refreshPopover.show}
                        />

                        <Popover
                            triggerRef={refreshPopover.triggerRef}
                            show={refreshPopover.show}
                            onClose={refreshPopover.close}
                            variant="actions"
                            position="bottom"
                            ariaLabel="Refresh database options"
                            className="popover--wide"
                            preventBodyScroll={true}
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
                                {availableInstances.radarrInstances.length > 0 ? (
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
                                        {availableInstances.radarrInstances.map(instance => (
                                            <div
                                                key={instance}
                                                className="checkbox-row popover__list-item"
                                                onClick={() =>
                                                    handleRefreshOptionToggle(
                                                        'arrInstances',
                                                        instance
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
                                                    id={`header-radarr-${instance}`}
                                                    checked={selectedRefreshOptions.arrInstances.includes(
                                                        instance
                                                    )}
                                                    onChange={() => {}}
                                                    onClick={e => e.stopPropagation()}
                                                />
                                                <label
                                                    htmlFor={`header-radarr-${instance}`}
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
                                {availableInstances.sonarrInstances.length > 0 ? (
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
                                        {availableInstances.sonarrInstances.map(instance => (
                                            <div
                                                key={instance}
                                                className="checkbox-row popover__list-item"
                                                onClick={() =>
                                                    handleRefreshOptionToggle(
                                                        'arrInstances',
                                                        instance
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
                                                    id={`header-sonarr-${instance}`}
                                                    checked={selectedRefreshOptions.arrInstances.includes(
                                                        instance
                                                    )}
                                                    onChange={() => {}}
                                                    onClick={e => e.stopPropagation()}
                                                />
                                                <label
                                                    htmlFor={`header-sonarr-${instance}`}
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
                                            {availableLibraries.length > 0 && (
                                                <div
                                                    className="select-all-buttons"
                                                    style={{
                                                        display: 'flex',
                                                        gap: 'var(--space-1)',
                                                    }}
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
                                    {availableLibraries.length > 0 ? (
                                        availableLibraries.map(library => (
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
                                                    id={`header-lib-${library.name || library}`}
                                                    checked={selectedRefreshOptions.libraries.includes(
                                                        library.name || library
                                                    )}
                                                    onChange={() => {}}
                                                    onClick={e => e.stopPropagation()}
                                                />
                                                <label
                                                    htmlFor={`header-lib-${library.name || library}`}
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
                                            Click &ldquo;Load Libraries&rdquo; to see available
                                            options
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
                            <div
                                className="popover__divider"
                                style={{ margin: 'var(--space-4) 0' }}
                            ></div>
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
                                    disabled={false}
                                >
                                    Refresh Selected
                                </button>
                            </div>
                        </Popover>
                    </div>
                )}
            </div>
        </div>
    );
}

// Wrapper to handle context errors gracefully
export default function HeaderSearch() {
    let component = null;

    try {
        component = <HeaderSearchInner />;
    } catch {
        component = null;
    }

    return component;
}
