// ui/src/components/search/SearchControls.jsx
// Generic controls component that replicates existing poster_search control patterns

import React, { useRef, useState, useEffect } from 'react';
import { getIcon } from '../../utils/tools';
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
    
    // ===== HELPER FUNCTIONS =====
    const setTooltipState = (key, value) => {
        setTooltipStates(prev => ({ ...prev, [key]: value }));
    };
    
    const toggleDropdown = (filterId) => {
        setDropdownStates(prev => ({ ...prev, [filterId]: !prev[filterId] }));
    };
    
    const handleFilterSelect = (filterId, value) => {
        onFilterChange(filterId, value);
        setDropdownStates(prev => ({ ...prev, [filterId]: false }));
    };
    
    // ===== KEYBOARD HANDLERS =====
    const handleSearchKeyDown = (e) => {
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
    
    // ===== RENDER FUNCTIONS =====
    const renderSourcePicker = () => {
        if (!sources.length) return null;
        
        return (
            <div className="poster-source-picker">
                {sources.map(source => (
                    <React.Fragment key={source.key}>
                        <button
                            type="button"
                            ref={el => (viewBtnRefs.current[source.key] = el)}
                            className={`btn source-picker-btn${currentSource === source.key ? ' active' : ''}`}
                            onClick={() => onSourceChange(source.key)}
                            onMouseEnter={() => setTooltipState(`source-${source.key}`, true)}
                            onMouseLeave={() => setTooltipState(`source-${source.key}`, false)}
                            onFocus={() => setTooltipState(`source-${source.key}`, true)}
                            onBlur={() => setTooltipState(`source-${source.key}`, false)}
                            aria-pressed={currentSource === source.key}
                            aria-label={`Select ${source.label} source`}
                        >
                            {source.icon && <span className="icon">{getIcon(source.icon)}</span>}
                            <span style={{ marginLeft: source.icon ? 8 : 0 }}>{source.label}</span>
                        </button>
                        <TooltipFactory
                            anchor={viewBtnRefs.current[source.key]}
                            text={source.tooltip || `Search ${source.label}`}
                            show={tooltipStates[`source-${source.key}`]}
                        />
                    </React.Fragment>
                ))}
            </div>
        );
    };
    
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
            <div className="poster-view-mode-group">
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
    
    const renderFilter = (filter) => {
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
            <div className="poster-search-bar-container">
                {/* Render filter controls */}
                {filters.map(filter => renderFilter(filter))}
                
                {/* Search input */}
                <input
                    ref={searchInputRef}
                    type="text"
                    id="search-input"
                    className="poster-search-bar"
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
                
                {/* Screen reader instructions */}
                <div 
                    id="search-instructions" 
                    className="sr-only"
                    aria-live="polite"
                >
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
    
    // ===== MAIN RENDER =====
    return (
        <div>
            <div className="poster-search-controls">
                {renderSourcePicker()}
                {renderSortSelect()}
                {renderViewModeToggle()}
            </div>
            {renderSearchBar()}
        </div>
    );
}