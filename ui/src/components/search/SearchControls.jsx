// ui/src/components/search/SearchControls.jsx
// Generic controls component that replicates existing poster_search control patterns

import React, { useRef, useState, useEffect } from 'react';
import { getIcon, humanize } from '../../utils/tools';
import TooltipFactory from '../Tooltip';

const DEFAULT_VIEW_MODES = [
    { key: 'grid', icon: 'mi:grid_view', label: 'Grid', tooltip: 'Grid view' },
    { key: 'list', icon: 'mi:list', label: 'List', tooltip: 'List view' },
];

const DEFAULT_SORT_OPTIONS = [
    { value: 'alpha', label: 'A-Z' },
    { value: 'alpha-desc', label: 'Z-A' },
    { value: 'date', label: 'Date Added' },
];

export default function SearchControls({
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

    // Customization
    viewModes = DEFAULT_VIEW_MODES,
    showSearch = true,
    showSort = true,
    showViewToggle = true,
}) {
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
    const [showRefreshPopover, setShowRefreshPopover] = useState(false);
    const [selectedRefreshOptions, setSelectedRefreshOptions] = useState({
        arrInstances: [],
        plexInstances: [],
        libraries: [],
    });
    const refreshButtonRef = useRef();
    const refreshPopoverRef = useRef();

    // ===== MODULE SELECTOR STATE =====
    const [showModulePopover, setShowModulePopover] = useState(false);
    const [showModuleTooltip, setShowModuleTooltip] = useState(false);
    const [showRefreshTooltip, setShowRefreshTooltip] = useState(false);
    const moduleButtonRef = useRef();
    const modulePopoverRef = useRef();

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

    // ===== REFRESH POPOVER CLICK OUTSIDE HANDLING =====
    useEffect(() => {
        if (!showRefreshPopover) return;

        function handleClickOutside(e) {
            if (
                refreshButtonRef.current &&
                !refreshButtonRef.current.contains(e.target) &&
                refreshPopoverRef.current &&
                !refreshPopoverRef.current.contains(e.target)
            ) {
                setShowRefreshPopover(false);
            }
        }

        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [showRefreshPopover]);

    // ===== MODULE POPOVER CLICK OUTSIDE HANDLING =====
    useEffect(() => {
        if (!showModulePopover) return;

        function handleClickOutside(e) {
            if (
                moduleButtonRef.current &&
                !moduleButtonRef.current.contains(e.target) &&
                modulePopoverRef.current &&
                !modulePopoverRef.current.contains(e.target)
            ) {
                setShowModulePopover(false);
            }
        }

        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [showModulePopover]);

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
        setShowRefreshPopover(prev => !prev);
    };

    // ===== MODULE SELECTOR HANDLERS =====
    const handleModuleToggle = () => {
        setShowModulePopover(prev => !prev);
    };

    const handleModuleSelect = moduleKey => {
        onSourceChange(moduleKey);
        setShowModulePopover(false);
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
        setShowRefreshPopover(false);
    };

    // Libraries state for dynamic loading
    const [availableLibraries, setAvailableLibraries] = useState([]);
    const [loadingLibraries, setLoadingLibraries] = useState(false);

    const handleLoadLibraries = async () => {
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
        if (!showSearch) return null;

        return (
            <div className="search-bar-container">
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
                    <div ref={autocompleteRef} className="search-autocomplete-dropdown">
                        {autocompleteSuggestions.map((suggestion, index) => (
                            <div
                                key={suggestion.id || index}
                                className={`search-autocomplete-item${index === selectedSuggestionIndex ? ' highlighted' : ''}`}
                                onClick={() => selectSuggestion(suggestion)}
                                onMouseEnter={() => setSelectedSuggestionIndex(index)}
                            >
                                <div className="autocomplete-title">{suggestion.title}</div>
                                <div className="autocomplete-subtitle">
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
            </div>
        );
    };

    const renderModuleSelector = () => {
        if (!sources.length) return null;

        return (
            <div className="module-selector">
                <button
                    ref={moduleButtonRef}
                    type="button"
                    className={`btn btn-secondary module-btn${showModulePopover ? ' active' : ''}`}
                    onClick={handleModuleToggle}
                    onMouseEnter={() => setShowModuleTooltip(true)}
                    onMouseLeave={() => setShowModuleTooltip(false)}
                    onFocus={() => setShowModuleTooltip(true)}
                    onBlur={() => setShowModuleTooltip(false)}
                    title="Select module"
                >
                    {getIcon('mi:apps')}
                    Module
                </button>
                <TooltipFactory
                    anchor={moduleButtonRef.current}
                    text="Select module"
                    show={showModuleTooltip && !showModulePopover}
                />

                {showModulePopover && (
                    <div ref={modulePopoverRef} className="module-popover">
                        <div className="module-popover-header">
                            <h4>Select Module</h4>
                        </div>
                        <div className="module-popover-content">
                            {sources.map(source => (
                                <button
                                    key={source.key}
                                    type="button"
                                    className={`module-option${currentSource === source.key ? ' active' : ''}`}
                                    onClick={() => handleModuleSelect(source.key)}
                                >
                                    {source.icon && (
                                        <span className="module-option-icon">
                                            {getIcon(source.icon)}
                                        </span>
                                    )}
                                    <span className="module-option-label">{source.label}</span>
                                    {source.tooltip && (
                                        <span className="module-option-tooltip">
                                            {source.tooltip}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderRefreshButton = () => {
        if (!showRefreshControls) return null;

        const availableOptions = getAvailableRefreshOptions();

        return (
            <div className="refresh-controls">
                <button
                    ref={refreshButtonRef}
                    type="button"
                    className={`btn btn-secondary refresh-btn${showRefreshPopover ? ' active' : ''}`}
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
                    anchor={refreshButtonRef.current}
                    text={isRefreshing ? 'Refreshing...' : 'Refresh Database'}
                    show={showRefreshTooltip && !showRefreshPopover}
                />

                {showRefreshPopover && (
                    <div ref={refreshPopoverRef} className="refresh-popover">
                        <div className="refresh-popover-header">
                            <h4>Refresh Database</h4>
                        </div>
                        <div className="refresh-popover-content">
                            {/* Radarr Instances Section */}
                            {availableOptions.radarrInstances.length > 0 ? (
                                <div className="refresh-section">
                                    <h5>Radarr Instances</h5>
                                    {availableOptions.radarrInstances.map(instance => (
                                        <div 
                                            key={instance} 
                                            className="checkbox-row"
                                            onClick={() => handleRefreshOptionToggle('arrInstances', instance)}
                                        >
                                            <input
                                                type="checkbox"
                                                id={`radarr-${instance}`}
                                                checked={selectedRefreshOptions.arrInstances.includes(
                                                    instance
                                                )}
                                                onChange={() => {}} // Handle via parent div click
                                                onClick={(e) => e.stopPropagation()} // Prevent double-firing
                                            />
                                            <label htmlFor={`radarr-${instance}`}>{humanize(instance)}</label>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="refresh-section">
                                    <h5>Radarr Instances</h5>
                                    <div
                                        style={{
                                            color: 'var(--text-muted)',
                                            fontSize: '0.85rem',
                                            padding: '0.5rem 0',
                                            fontStyle: 'italic',
                                        }}
                                    >
                                        No Radarr instances configured
                                    </div>
                                </div>
                            )}

                            {/* Sonarr Instances Section */}
                            {availableOptions.sonarrInstances.length > 0 ? (
                                <div className="refresh-section">
                                    <h5>Sonarr Instances</h5>
                                    {availableOptions.sonarrInstances.map(instance => (
                                        <div 
                                            key={instance} 
                                            className="checkbox-row"
                                            onClick={() => handleRefreshOptionToggle('arrInstances', instance)}
                                        >
                                            <input
                                                type="checkbox"
                                                id={`sonarr-${instance}`}
                                                checked={selectedRefreshOptions.arrInstances.includes(
                                                    instance
                                                )}
                                                onChange={() => {}} // Handle via parent div click
                                                onClick={(e) => e.stopPropagation()} // Prevent double-firing
                                            />
                                            <label htmlFor={`sonarr-${instance}`}>{humanize(instance)}</label>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="refresh-section">
                                    <h5>Sonarr Instances</h5>
                                    <div
                                        style={{
                                            color: 'var(--text-muted)',
                                            fontSize: '0.85rem',
                                            padding: '0.5rem 0',
                                            fontStyle: 'italic',
                                        }}
                                    >
                                        No Sonarr instances configured
                                    </div>
                                </div>
                            )}

                            <div className="refresh-section">
                                <div
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginBottom: '0.75rem',
                                    }}
                                >
                                    <h5 style={{ margin: 0 }}>Plex Libraries</h5>
                                    <button
                                        type="button"
                                        onClick={handleLoadLibraries}
                                        disabled={loadingLibraries}
                                        className="btn btn-secondary btn-sm"
                                        style={{
                                            padding: '0.25rem 0.5rem',
                                            fontSize: '0.8rem',
                                            minHeight: '28px',
                                        }}
                                    >
                                        {loadingLibraries ? 'Loading...' : 'Load Libraries'}
                                    </button>
                                </div>
                                {availableOptions.libraries.length > 0 ? (
                                    availableOptions.libraries.map(library => (
                                        <div 
                                            key={library.name || library} 
                                            className="checkbox-row"
                                            onClick={() => handleRefreshOptionToggle('libraries', library.name || library)}
                                        >
                                            <input
                                                type="checkbox"
                                                id={`lib-${library.name || library}`}
                                                checked={selectedRefreshOptions.libraries.includes(
                                                    library.name || library
                                                )}
                                                onChange={() => {}} // Handle via parent div click
                                                onClick={(e) => e.stopPropagation()} // Prevent double-firing
                                            />
                                            <label htmlFor={`lib-${library.name || library}`}>
                                                {library.displayName || library}
                                            </label>
                                        </div>
                                    ))
                                ) : (
                                    <div
                                        style={{
                                            color: 'var(--text-muted)',
                                            fontSize: '0.85rem',
                                            padding: '0.5rem 0',
                                            fontStyle: 'italic',
                                        }}
                                    >
                                        Click &quot;Load Libraries&quot; to see available options
                                    </div>
                                )}
                            </div>

                            {selectedRefreshOptions.plexInstances.length > 0 && (
                                <div
                                    style={{
                                        marginTop: '1rem',
                                        padding: '0.75rem',
                                        backgroundColor: 'var(--bg-info, #f0f9ff)',
                                        border: '1px solid var(--border-info, #bae6fd)',
                                        borderRadius: '6px',
                                        fontSize: '0.85rem',
                                        color: 'var(--text-info, #0369a1)',
                                    }}
                                >
                                    <strong>Auto-selected Plex instances:</strong>{' '}
                                    {selectedRefreshOptions.plexInstances.join(', ')}
                                </div>
                            )}
                        </div>
                        <div className="refresh-popover-actions">
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => setShowRefreshPopover(false)}
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
                    </div>
                )}
            </div>
        );
    };

    // ===== MAIN RENDER =====
    return (
        <div>
            <div className="search-controls">
                {renderModuleSelector()}
                {renderSortSelect()}
                {renderViewModeToggle()}
                {renderRefreshButton()}
            </div>
            {renderSearchBar()}
        </div>
    );
}
