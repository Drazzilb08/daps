import React from 'react';
import { getIcon } from '../../utils/tools';
import TooltipFactory from '../Tooltip';
import PopoverFactory from '../PopoverFactory';

/**
 * ControlButton - Reusable button component for search controls
 * Provides consistent styling and tooltip behavior for all control buttons
 *
 * @param {string} icon - Icon identifier for the button
 * @param {string} label - Text label for the button
 * @param {Object} popover - Popover control object from usePopover hook
 * @param {Object} showTooltips - Tooltip visibility state object
 * @param {Function} onTooltipChange - Callback to change tooltip visibility
 * @param {string} tooltip - Tooltip text identifier
 * @param {boolean} disabled - Whether button is disabled
 * @returns {JSX.Element} Control button with tooltip
 */
function ControlButton({ icon, label, popover, showTooltips, onTooltipChange, tooltip, disabled }) {
    return (
        <>
            <button
                ref={popover.triggerRef}
                type="button"
                className={`search-control-button${popover.show ? ' active' : ''}`}
                onClick={popover.toggle}
                onMouseEnter={() => onTooltipChange(tooltip, true)}
                onMouseLeave={() => onTooltipChange(tooltip, false)}
                onFocus={() => onTooltipChange(tooltip, true)}
                onBlur={() => onTooltipChange(tooltip, false)}
                disabled={disabled}
            >
                {getIcon(icon)}
                <span className="search-control-label">{label}</span>
            </button>
            <TooltipFactory
                anchor={popover.triggerRef.current}
                text={tooltip}
                show={showTooltips[tooltip] && !popover.show}
            />
        </>
    );
}

/**
 * ModuleControl - Source/module selection control
 * Allows switching between different search sources (media types, modules)
 *
 * @param {Object} popover - Popover control object from usePopover hook
 * @param {Object} showTooltips - Tooltip visibility state object
 * @param {Function} onTooltipChange - Callback to change tooltip visibility
 * @param {Object} searchConfig - Search configuration with available sources
 * @param {string} currentSource - Currently selected source identifier
 * @param {Function} onChangeSource - Callback when source is changed
 * @returns {JSX.Element} Module control with popover selector
 */
function ModuleControl({
    popover,
    showTooltips,
    onTooltipChange,
    searchConfig,
    currentSource,
    onChangeSource,
    icon = 'mi:apps',
    label = 'MOD',
    tooltip = 'source',
}) {
    return (
        <div className="search-control">
            <ControlButton
                icon={icon}
                label={label}
                popover={popover}
                showTooltips={showTooltips}
                onTooltipChange={onTooltipChange}
                tooltip={tooltip}
            />
            <PopoverFactory
                variant="selector"
                show={popover.show}
                onClose={popover.close}
                triggerRef={popover.triggerRef}
                position="bottom"
                ariaLabel="Select Module"
                title="Select Module"
            >
                <ul className="popover__list">
                    {searchConfig?.sources?.map(source => (
                        <li key={source.key || source.value}>
                            <button
                                type="button"
                                className={`popover__list-item${
                                    currentSource === (source.key || source.value)
                                        ? ' popover__list-item--selected'
                                        : ''
                                }`}
                                onClick={() => {
                                    onChangeSource(source.key || source.value);
                                    popover.close();
                                }}
                            >
                                {source.icon && (
                                    <span className="popover__list-icon">
                                        {getIcon(source.icon)}
                                    </span>
                                )}
                                <span>{source.label}</span>
                            </button>
                        </li>
                    )) || []}
                </ul>
            </PopoverFactory>
        </div>
    );
}

/**
 * ViewControl - View mode selection control (grid/list)
 * Toggles between grid and list display modes for search results
 *
 * @param {Object} popover - Popover control object from usePopover hook
 * @param {Object} showTooltips - Tooltip visibility state object
 * @param {Function} onTooltipChange - Callback to change tooltip visibility
 * @param {string} currentView - Currently selected view mode (grid|list)
 * @param {Function} onChangeView - Callback when view mode is changed
 * @returns {JSX.Element} View control with popover selector
 */
function ViewControl({
    popover,
    showTooltips,
    onTooltipChange,
    currentView,
    onChangeView,
    tooltip = 'view',
}) {
    return (
        <div className="search-control">
            <ControlButton
                icon={currentView === 'grid' ? 'mi:grid_view' : 'mi:list'}
                label={currentView === 'grid' ? 'GRID' : 'LIST'}
                popover={popover}
                showTooltips={showTooltips}
                onTooltipChange={onTooltipChange}
                tooltip={tooltip}
            />
            <PopoverFactory
                variant="selector"
                show={popover.show}
                onClose={popover.close}
                triggerRef={popover.triggerRef}
                position="bottom"
                ariaLabel="View Mode"
                title="View Mode"
            >
                <ul className="popover__list">
                    <li>
                        <button
                            type="button"
                            className={`popover__list-item${
                                currentView === 'grid' ? ' popover__list-item--selected' : ''
                            }`}
                            onClick={() => {
                                onChangeView('grid');
                                popover.close();
                            }}
                        >
                            <span className="popover__list-icon">{getIcon('mi:grid_view')}</span>
                            <span>Grid View</span>
                        </button>
                    </li>
                    <li>
                        <button
                            type="button"
                            className={`popover__list-item${
                                currentView === 'list' ? ' popover__list-item--selected' : ''
                            }`}
                            onClick={() => {
                                onChangeView('list');
                                popover.close();
                            }}
                        >
                            <span className="popover__list-icon">{getIcon('mi:list')}</span>
                            <span>List View</span>
                        </button>
                    </li>
                </ul>
            </PopoverFactory>
        </div>
    );
}

/**
 * SortControl - Sort option selection control
 * Allows selection of different sorting criteria for search results
 *
 * @param {Object} popover - Popover control object from usePopover hook
 * @param {Object} showTooltips - Tooltip visibility state object
 * @param {Function} onTooltipChange - Callback to change tooltip visibility
 * @param {Object} searchConfig - Search configuration with available sort options
 * @param {string} currentSort - Currently selected sort option
 * @param {Function} onChangeSort - Callback when sort option is changed
 * @returns {JSX.Element} Sort control with popover selector
 */
function SortControl({
    popover,
    showTooltips,
    onTooltipChange,
    searchConfig,
    currentSort,
    onChangeSort,
    tooltip = 'sort',
}) {
    return (
        <div className="search-control">
            <ControlButton
                icon="mi:sort"
                label="SORT"
                popover={popover}
                showTooltips={showTooltips}
                onTooltipChange={onTooltipChange}
                tooltip={tooltip}
            />
            <PopoverFactory
                variant="selector"
                show={popover.show}
                onClose={popover.close}
                triggerRef={popover.triggerRef}
                position="bottom"
                ariaLabel="Sort By"
                title="Sort By"
            >
                <ul className="popover__list">
                    {searchConfig?.sortOptions?.map(option => (
                        <li key={option.key || option.value}>
                            <button
                                type="button"
                                className={`popover__list-item${
                                    currentSort === (option.key || option.value)
                                        ? ' popover__list-item--selected'
                                        : ''
                                }`}
                                onClick={() => {
                                    onChangeSort(option.key || option.value);
                                    popover.close();
                                }}
                            >
                                {option.icon && (
                                    <span className="popover__list-icon">
                                        {getIcon(option.icon)}
                                    </span>
                                )}
                                <span>{option.label}</span>
                            </button>
                        </li>
                    )) || []}
                </ul>
            </PopoverFactory>
        </div>
    );
}

/**
 * FilterControl - Filter options selection control
 * Provides filtering capabilities for search results with multiple criteria
 *
 * @param {Object} popover - Popover control object from usePopover hook
 * @param {Object} showTooltips - Tooltip visibility state object
 * @param {Function} onTooltipChange - Callback to change tooltip visibility
 * @param {Object} searchConfig - Search configuration with available filter options
 * @param {Function} onChangeFilter - Callback when filter is changed
 * @returns {JSX.Element} Filter control with popover options
 */
function FilterControl({
    popover,
    showTooltips,
    onTooltipChange,
    searchConfig,
    onChangeFilter,
    tooltip = 'filter',
}) {
    return (
        <div className="search-control">
            <ControlButton
                icon="mi:tune"
                label="FILTER"
                popover={popover}
                showTooltips={showTooltips}
                onTooltipChange={onTooltipChange}
                tooltip={tooltip}
            />
            <PopoverFactory
                variant="actions"
                show={popover.show}
                onClose={popover.close}
                triggerRef={popover.triggerRef}
                position="bottom"
                ariaLabel="Filters"
                title="Filters"
            >
                <div className="popover__content">
                    {searchConfig?.filters?.map(filter => (
                        <div key={filter.key} className="filter-group">
                            <div className="filter-label">{filter.label}</div>
                            <div className="filter-options">
                                {filter.options?.map(option => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        className="filter-option"
                                        onClick={() => {
                                            onChangeFilter(filter.key, option.value);
                                            popover.close();
                                        }}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )) || []}
                </div>
            </PopoverFactory>
        </div>
    );
}

export { ControlButton, ModuleControl, ViewControl, SortControl, FilterControl };
