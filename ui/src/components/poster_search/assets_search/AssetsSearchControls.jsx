// src/components/poster_search/assets_search/AssetsSearchControls.jsx

import React, { useRef, useState } from 'react';
import { getIcon } from '../../../utils/tools';
import TooltipFactory from '../../Tooltip';

const SORT_OPTIONS = [
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

export default function AssetsSearchControls({
    currentSort,
    setCurrentSort,
    currentView,
    setCurrentView,
    pendingSearchTerm,
    setPendingSearchTerm,
    onSearch,
    onClearSearch,
    isSearching,
    assetTypeFilter,
    setAssetTypeFilter,
    showAssetTypeFilter = true,
}) {
    const viewBtnRefs = useRef({});
    const searchBtnRef = useRef();
    const assetFilterBtnRef = useRef();
    const searchInputRef = useRef();

    const [hoveredView, setHoveredView] = useState(null);

    // Separate tooltip states!
    const [showAssetsSourceTip, setShowAssetsSourceTip] = useState(false);
    const [showAssetTypeTip, setShowAssetTypeTip] = useState(false);
    const [showSearchTip, setShowSearchTip] = useState(false);

    const [showAssetDropdown, setShowAssetDropdown] = useState(false);

    React.useEffect(() => {
        if (!showAssetDropdown) return;
        function handle(e) {
            if (!assetFilterBtnRef.current) return;
            if (!assetFilterBtnRef.current.contains(e.target)) setShowAssetDropdown(false);
        }
        document.addEventListener('click', handle);
        return () => document.removeEventListener('click', handle);
    }, [showAssetDropdown]);

    function handleAssetTypeChange(value) {
        setAssetTypeFilter(value);
        setShowAssetDropdown(false);
    }

    return (
        <div>
            <div className="poster-search-controls">
                <div className="poster-source-picker">
                    <button
                        type="button"
                        ref={el => (viewBtnRefs.current['assets'] = el)}
                        className="btn source-picker-btn active"
                        onMouseEnter={() => setShowAssetsSourceTip(true)}
                        onMouseLeave={() => setShowAssetsSourceTip(false)}
                        onFocus={() => setShowAssetsSourceTip(true)}
                        onBlur={() => setShowAssetsSourceTip(false)}
                    >
                        <span className="icon">{getIcon('mi:folder')}</span>
                        <span style={{ marginLeft: 8 }}>Assets</span>
                    </button>
                    <TooltipFactory
                        anchor={viewBtnRefs.current['assets']}
                        text="Search Assets"
                        show={showAssetsSourceTip}
                    />
                </div>
                <select value={currentSort} onChange={e => setCurrentSort(e.target.value)}>
                    {SORT_OPTIONS.map(opt => (
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
            <div className="poster-search-bar-container">
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
                            onMouseEnter={() => setShowAssetTypeTip(true)}
                            onMouseLeave={() => setShowAssetTypeTip(false)}
                            onFocus={() => setShowAssetTypeTip(true)}
                            onBlur={() => setShowAssetTypeTip(false)}
                        >
                            {getIcon('mi:filter_list')}
                        </button>
                        <TooltipFactory
                            anchor={assetFilterBtnRef.current}
                            text="Filter by type of asset in Assets tab"
                            show={showAssetTypeTip}
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
                    placeholder="Search posters in Assets Directory..."
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
                        onClick={onClearSearch}
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