import React from 'react';
import { getIcon } from '../../utils/tools';
import TooltipFactory from '../Tooltip';

/**
 * SearchInputSection - Main search input and control buttons
 * Handles search input, search button, clear button, and mobile back button
 *
 * @param {React.RefObject} searchInputRef - Ref for the search input element
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
 * @returns {JSX.Element} Search input section with buttons
 */
function SearchInputSection({
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
}) {
    return (
        <div className="search-input-container">
            {/* Mobile Back Button - Always present, shown/hidden via CSS media queries */}
            <button
                className="search-back-button"
                type="button"
                aria-label="Close search"
                onClick={onMobileCollapse}
            >
                {getIcon('mi:arrow_back')}
            </button>
            <div className="search-input-wrapper">
                <input
                    ref={searchInputRef}
                    key={inputKey}
                    type="text"
                    name={inputKey}
                    className="search-input"
                    placeholder={placeholder}
                    value={searchTerm}
                    onChange={e => onSearchTermChange(e.target.value)}
                    onKeyDown={onKeyDown}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    disabled={isSearching}
                    autoComplete="new-password"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    data-form="false"
                    data-lpignore="true"
                    data-1p-ignore="true"
                    aria-label={placeholder}
                    aria-describedby="search-instructions"
                    aria-expanded={false}
                    role="combobox"
                />

                {/* Search button */}
                <button
                    ref={searchButtonRef}
                    type="button"
                    className="search-button search-button--search"
                    onClick={onSearch}
                    disabled={isSearching}
                    onMouseEnter={() => onTooltipChange('search', true)}
                    onMouseLeave={() => onTooltipChange('search', false)}
                    onFocus={() => onTooltipChange('search', true)}
                    onBlur={() => onTooltipChange('search', false)}
                >
                    {getIcon(isSearching ? 'mi:hourglass_empty' : 'mi:search')}
                </button>
                <TooltipFactory
                    anchor={searchButtonRef.current}
                    text="Search"
                    show={showTooltips.search}
                />

                {/* Clear button */}
                {searchTerm && (
                    <>
                        <button
                            ref={clearButtonRef}
                            type="button"
                            className="search-button search-button--clear"
                            onClick={onClear}
                            onMouseEnter={() => onTooltipChange('clear', true)}
                            onMouseLeave={() => onTooltipChange('clear', false)}
                            onFocus={() => onTooltipChange('clear', true)}
                            onBlur={() => onTooltipChange('clear', false)}
                        >
                            {getIcon('mi:close')}
                        </button>
                        <TooltipFactory
                            anchor={clearButtonRef.current}
                            text="Clear search"
                            show={showTooltips.clear}
                        />
                    </>
                )}
            </div>

            {/* Screen reader instructions */}
            <div id="search-instructions" className="sr-only" aria-live="polite">
                Type to search, use arrow keys to navigate suggestions, press Enter to select
            </div>
        </div>
    );
}

export default SearchInputSection;
