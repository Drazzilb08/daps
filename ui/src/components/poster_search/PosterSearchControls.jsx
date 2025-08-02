// src/components/poster_search/PosterSearchControls.jsx

import React, { useRef, useState } from 'react';
import { getIcon } from '../../utils/tools';
import TooltipFactory from '../Tooltip';

const SOURCE_OPTIONS = [
    {
        key: 'gdrive',
        label: 'GDrive',
        icon: 'mi:cloud',
        tooltip: 'Search posters in Google Drive sources (from GDrive Sync settings).',
    },
    {
        key: 'custom',
        label: 'Custom',
        icon: 'mi:folder_special',
        tooltip: null,
    },
    {
        key: 'assets',
        label: 'Assets',
        icon: 'mi:folder',
        tooltip: 'Search posters in the Assets directory.',
    },
];

const SORT_OPTIONS = [
    { value: 'priority-asc', label: 'Priority ↑' },
    { value: 'priority-desc', label: 'Priority ↓' },
    { value: 'alpha', label: 'A-Z' },
    { value: 'alpha-desc', label: 'Z-A' },
    { value: 'date', label: 'Date Added' },
];

const VIEW_MODES = [
    { key: 'grid', icon: 'mi:grid_view', label: 'Grid', tooltip: 'Grid view' },
    { key: 'list', icon: 'mi:list', label: 'List', tooltip: 'List view' },
];

const ASSET_TYPE_OPTIONS = [
    { value: 'all', label: 'All' },
    { value: 'collections', label: 'Collections' },
    { value: 'movies', label: 'Movies' },
    { value: 'shows', label: 'Shows' },
];

function getSourceTooltip(src, customLocations) {
    if (src.key === 'custom') {
        if (!customLocations || !customLocations.length) {
            return 'No custom sources defined in Poster Renamerr settings.';
        }
        return 'Search posters in user-defined folders from Poster Renamerr settings.';
    }
    return src.tooltip || '';
}

export default function PosterSearchControls({
    currentSource,
    setCurrentSource,
    currentSort,
    setCurrentSort,
    currentView,
    setCurrentView,
    pendingSearchTerm,
    setPendingSearchTerm,
    onSearch,
    customLocations,
    isSearching,
    assetTypeFilter,
    setAssetTypeFilter,
    showAssetTypeFilter,
    gdriveOwners = [],
    selectedGDriveOwner = '',
    setSelectedGDriveOwner = () => {},
    showGDriveOwnerFilter = false,
}) {
    // Refs for tooltips
    const btnRefs = useRef({});
    const viewBtnRefs = useRef({});
    const searchBtnRef = useRef();
    const assetFilterBtnRef = useRef();
    const ownerFilterBtnRef = useRef();
    const searchInputRef = useRef();

    // Tooltip state for each button
    const [hoveredSource, setHoveredSource] = useState(null);
    const [hoveredView, setHoveredView] = useState(null);
    const [showAssetTip, setShowAssetTip] = useState(false);
    const [showOwnerTip, setShowOwnerTip] = useState(false);
    const [showSearchTip, setShowSearchTip] = useState(false);

    // Asset filter dropdown state
    const [showAssetDropdown, setShowAssetDropdown] = useState(false);

    // GDrive owner dropdown state
    const [showOwnerDropdown, setShowOwnerDropdown] = useState(false);

    // Asset filter dropdown close on outside click
    React.useEffect(() => {
        if (!showAssetDropdown) return;
        function handle(e) {
            if (!assetFilterBtnRef.current) return;
            if (!assetFilterBtnRef.current.contains(e.target)) setShowAssetDropdown(false);
        }
        document.addEventListener('mousedown', handle);
        return () => document.removeEventListener('mousedown', handle);
    }, [showAssetDropdown]);

    // Owner filter dropdown close on outside click
    React.useEffect(() => {
        if (!showOwnerDropdown) return;
        function handle(e) {
            const dropdown = document.querySelector('.search-bar-btn-dropdown.owner-dropdown');
            if (!dropdown) return;
            if (!dropdown.contains(e.target)) setShowOwnerDropdown(false);
        }
        document.addEventListener('mousedown', handle);
        return () => document.removeEventListener('mousedown', handle);
    }, [showOwnerDropdown]);

    function handleAssetTypeChange(value) {
        setAssetTypeFilter(value);
        setShowAssetDropdown(false);
    }

    function handleOwnerChange(owner) {
        setSelectedGDriveOwner(owner);
        setShowOwnerDropdown(false);
    }

    return (
        <div>
            <div className="poster-search-controls">
                <div className="poster-source-picker">
                    {SOURCE_OPTIONS.map(src => {
                        const disabled =
                            src.key === 'custom' && (!customLocations || !customLocations.length);
                        return (
                            <React.Fragment key={src.key}>
                                <button
                                    type="button"
                                    ref={el => (btnRefs.current[src.key] = el)}
                                    className={
                                        'source-picker-btn' +
                                        (currentSource === src.key ? ' active' : '') +
                                        (disabled ? ' disabled' : '')
                                    }
                                    data-source={src.key}
                                    disabled={disabled}
                                    tabIndex={disabled ? -1 : 0}
                                    onClick={() => !disabled && setCurrentSource(src.key)}
                                    onMouseEnter={() => setHoveredSource(src.key)}
                                    onMouseLeave={() => setHoveredSource(null)}
                                    onFocus={() => setHoveredSource(src.key)}
                                    onBlur={() => setHoveredSource(null)}
                                >
                                    <span className="icon">{getIcon(src.icon)}</span>
                                    <span style={{ marginLeft: 8 }}>{src.label}</span>
                                </button>
                                <TooltipFactory
                                    anchor={btnRefs.current[src.key]}
                                    text={getSourceTooltip(src, customLocations)}
                                    show={
                                        hoveredSource === src.key &&
                                        !!getSourceTooltip(src, customLocations)
                                    }
                                />
                            </React.Fragment>
                        );
                    })}
                </div>
                <select value={currentSort} onChange={e => setCurrentSort(e.target.value)}>
                    {SORT_OPTIONS.filter(opt => {
                        // Only show priority sorts if source is gdrive
                        if (
                            (opt.value === 'priority-asc' || opt.value === 'priority-desc') &&
                            currentSource !== 'gdrive'
                        ) {
                            return false;
                        }
                        return true;
                    }).map(opt => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
                <div className="poster-view-mode-group">
                    {VIEW_MODES.map(mode => (
                        <React.Fragment key={mode.key}>
                            <button
                                type="button"
                                ref={el => (viewBtnRefs.current[mode.key] = el)}
                                className={
                                    'view-mode-btn' + (currentView === mode.key ? ' active' : '')
                                }
                                data-view={mode.key}
                                onClick={() => setCurrentView(mode.key)}
                                onMouseEnter={() => setHoveredView(mode.key)}
                                onMouseLeave={() => setHoveredView(null)}
                                onFocus={() => setHoveredView(mode.key)}
                                onBlur={() => setHoveredView(null)}
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
            </div>
            {/* Search Bar Row */}
            <div className="poster-search-bar-container">
                {/* GDrive owner filter */}
                {showGDriveOwnerFilter && (
                    <div className="search-bar-icon search-bar-btn-icon">
                        <button
                            type="button"
                            className="search-bar-btn"
                            aria-label="Owner Filter"
                            tabIndex={0}
                            title="Filter by owner in GDrive tab"
                            ref={ownerFilterBtnRef}
                            onClick={() => setShowOwnerDropdown(v => !v)}
                            onMouseEnter={() => setShowOwnerTip(true)}
                            onMouseLeave={() => setShowOwnerTip(false)}
                            onFocus={() => setShowOwnerTip(true)}
                            onBlur={() => setShowOwnerTip(false)}
                        >
                            {getIcon('mi:person')}
                        </button>
                        <TooltipFactory
                            anchor={ownerFilterBtnRef.current}
                            text="Filter by Owner"
                            show={showOwnerTip}
                        />
                        {showOwnerDropdown && (
                            <div className="search-bar-btn-dropdown owner-dropdown">
                                <div
                                    className={
                                        'search-bar-btn-option' +
                                        (selectedGDriveOwner === '' ? ' active' : '')
                                    }
                                    tabIndex={0}
                                    onClick={() => handleOwnerChange('')}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            handleOwnerChange('');
                                        }
                                    }}
                                >
                                    All Owners
                                </div>
                                {gdriveOwners.map(owner => (
                                    <div
                                        key={owner}
                                        className={
                                            'search-bar-btn-option' +
                                            (selectedGDriveOwner === owner ? ' active' : '')
                                        }
                                        tabIndex={0}
                                        onClick={() => handleOwnerChange(owner)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                handleOwnerChange(owner);
                                            }
                                        }}
                                    >
                                        {owner}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
                {/* Asset type filter */}
                {showAssetTypeFilter && (
                    <div className="search-bar-icon search-bar-btn-icon">
                        <button
                            type="button"
                            className="search-bar-btn"
                            aria-label="Asset Type Filter"
                            tabIndex={0}
                            title="Filter by type of asset in Assets tab"
                            ref={assetFilterBtnRef}
                            onClick={() => setShowAssetDropdown(v => !v)}
                            onMouseEnter={() => setShowAssetTip(true)}
                            onMouseLeave={() => setShowAssetTip(false)}
                            onFocus={() => setShowAssetTip(true)}
                            onBlur={() => setShowAssetTip(false)}
                        >
                            {getIcon('mi:filter_list')}
                        </button>
                        <TooltipFactory
                            anchor={assetFilterBtnRef.current}
                            text="Filter by type of asset in Assets tab"
                            show={showAssetTip}
                        />
                        {showAssetDropdown && (
                            <div className="search-bar-btn-dropdown">
                                {ASSET_TYPE_OPTIONS.map(opt => (
                                    <div
                                        key={opt.value}
                                        className={
                                            'search-bar-btn-option' +
                                            (assetTypeFilter === opt.value ? ' active' : '')
                                        }
                                        tabIndex={0}
                                        onClick={() => handleAssetTypeChange(opt.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                handleAssetTypeChange(opt.value);
                                            }
                                        }}
                                    >
                                        {opt.label}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
                <input
                    ref={searchInputRef}
                    type="text"
                    id="poster-search-input"
                    className="poster-search-bar"
                    placeholder={
                        currentSource === 'gdrive'
                            ? 'Search posters in any configured GDrive...'
                            : currentSource === 'custom'
                              ? 'Search posters in any of your Custom Sources...'
                              : 'Search posters in Assets Directory...'
                    }
                    autoComplete="off"
                    spellCheck={false}
                    value={pendingSearchTerm}
                    onChange={e => setPendingSearchTerm(e.target.value)}
                    onKeyDown={e => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            onSearch();
                            if (searchInputRef.current) {
                                searchInputRef.current.focus();
                            }
                        }
                    }}
                    autoFocus
                    disabled={isSearching}
                />
                {!!pendingSearchTerm && (
                    <button
                        className="clear-btn"
                        type="button"
                        tabIndex={0}
                        aria-label="Clear"
                        title="Clear search"
                        onClick={() => setPendingSearchTerm('')}
                    >
                        {getIcon('mi:close')}
                    </button>
                )}
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
        </div>
    );
}
