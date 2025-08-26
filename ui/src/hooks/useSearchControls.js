/**
 * Search Controls Hook and Utilities
 * Provides schema-driven control state management for search pages
 * Each page defines its own control schema for explicit ownership
 */

import { useState, useCallback, useEffect } from 'react';

/**
 * Process control definition based on current state and config
 * @param {Object} control - Control definition from schema
 * @param {Object} currentState - Current control states
 * @param {Object} searchConfig - Search configuration
 * @returns {Object} Processed control definition
 */
function processControlDefinition(control, currentState, searchConfig) {
    const processed = { ...control };

    // Handle dynamic icon
    if (control.getIcon) {
        processed.icon = control.getIcon(currentState[control.key]);
    }

    // Handle dynamic label
    if (control.getLabel) {
        processed.label = control.getLabel(currentState[control.key]);
    }

    // Handle dynamic options
    if (control.getOptions) {
        processed.options = control.getOptions(searchConfig);
    }

    // Apply visibility logic
    if (control.type === 'selector' && processed.options && processed.options.length === 0) {
        processed.hidden = true;
    }

    return processed;
}

/**
 * Search control state and schema management hook
 * Uses schema provided by the page for explicit control configuration
 * @param {Object} schema - Control schema defined by the page
 * @param {Object} searchConfig - Search configuration from context
 * @param {Object} handlers - Handler functions from context
 * @returns {Object} Control definitions and state management
 */
export function useSearchControls(schema, searchConfig, handlers) {
    // Control state
    const [controlState, setControlState] = useState({
        source: null,
        view: 'grid',
        sort: 'alpha',
        filters: {},
    });

    // Initialize state from search config
    useEffect(() => {
        if (searchConfig) {
            setControlState(prev => ({
                ...prev,
                source: searchConfig.defaultSource || prev.source,
                view: searchConfig.defaultView || prev.view,
                sort: searchConfig.defaultSort || prev.sort,
            }));
        }
    }, [searchConfig]);

    // Update handlers
    const updateControl = useCallback(
        (key, value) => {
            setControlState(prev => ({
                ...prev,
                [key]:
                    key === 'filter' ? { ...prev.filters, [value.filterKey]: value.value } : value,
            }));

            // Call appropriate handler
            switch (key) {
                case 'source':
                    handlers?.changeSource?.(value);
                    break;
                case 'view':
                    handlers?.changeView?.(value);
                    break;
                case 'sort':
                    handlers?.changeSort?.(value);
                    break;
                case 'filter':
                    handlers?.changeFilter?.(value.filterKey, value.value);
                    break;
            }
        },
        [handlers]
    );

    // Process controls based on current state
    const processedControls = schema?.controls
        ? schema.controls
              .map(control => processControlDefinition(control, controlState, searchConfig))
              .filter(control => !control.hidden)
        : [];

    return {
        schema,
        controls: processedControls,
        controlState,
        updateControl,
        // Utility functions for common operations
        getCurrentValue: key => controlState[key],
        isControlActive: (key, value) => {
            if (key === 'filter') {
                return controlState.filters[value.filterKey] === value.value;
            }
            return controlState[key] === value;
        },
    };
}

/**
 * Get contextual placeholder text for search input
 * @param {string} pathname - Current route pathname
 * @returns {string} Placeholder text
 */
export function getSearchPlaceholder(pathname) {
    if (pathname.startsWith('/media/search')) return 'Search media...';
    if (pathname.startsWith('/poster/search/assets')) return 'Search assets...';
    if (pathname.startsWith('/poster/search/gdrive')) return 'Search Google Drive...';
    return 'Search...';
}

/**
 * Check if current page is a search page
 * @param {string} pathname - Current route pathname
 * @returns {boolean} True if search page
 */
export function isSearchPage(pathname) {
    return (
        pathname.startsWith('/media/search') ||
        pathname.startsWith('/poster/search/assets') ||
        pathname.startsWith('/poster/search/gdrive')
    );
}
