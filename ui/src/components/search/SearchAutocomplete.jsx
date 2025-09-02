import React from 'react';

/**
 * SearchAutocomplete - Autocomplete suggestions dropdown for search interface
 * Shows contextual search suggestions with proper ARIA accessibility
 *
 * @param {boolean} show - Whether to show the autocomplete dropdown
 * @param {Array} suggestions - Array of search suggestions to display
 * @param {number} selectedIndex - Currently selected suggestion index
 * @param {React.RefObject} autocompleteRef - Ref for the autocomplete container
 * @param {Function} onSelectSuggestion - Callback when suggestion is selected
 * @param {Function} onItemHover - Callback when hovering over suggestion item
 * @returns {JSX.Element|null} Autocomplete dropdown or null if hidden
 */
function SearchAutocomplete({
    show,
    suggestions,
    selectedIndex,
    autocompleteRef,
    onSelectSuggestion,
    onItemHover,
}) {
    if (!show || suggestions.length === 0) {
        return null;
    }

    return (
        <div
            ref={autocompleteRef}
            className="search-autocomplete"
            id="search-autocomplete"
            role="listbox"
            aria-label="Search suggestions"
        >
            {suggestions.map((suggestion, index) => (
                <div
                    key={suggestion.id || index}
                    className={`search-autocomplete-item${
                        index === selectedIndex ? ' search-autocomplete-item--highlighted' : ''
                    }`}
                    onClick={() => onSelectSuggestion(suggestion)}
                    onMouseEnter={() => onItemHover(index)}
                    role="option"
                    aria-selected={index === selectedIndex}
                    id={`search-option-${index}`}
                >
                    <div className="search-autocomplete-title">{suggestion.title}</div>
                    <div className="search-autocomplete-subtitle">
                        {suggestion.year} • {suggestion.type}
                        {suggestion.countType &&
                            suggestion.instanceCount > 0 &&
                            ` • ${suggestion.instanceCount} ${suggestion.countType}`}
                    </div>
                </div>
            ))}
        </div>
    );
}

export default SearchAutocomplete;
