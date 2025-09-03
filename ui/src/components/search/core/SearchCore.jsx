// ui/src/components/search/core/SearchCore.jsx
// Core search functionality as reusable components - NOT plugins

import React, { useCallback } from 'react';
import SearchResults from '../SearchResults';
import LoadingSpinner from '../../common/LoadingSpinner';
import SearchProvider from './SearchProvider';

// Stable default functions to prevent infinite loops
const defaultOnError = () => {};
const defaultOnResultDelete = () => {};
const defaultOnDataLoaded = () => {};
const defaultOnSourceChange = () => {};

/**
 * Core Search Engine - Clean orchestration of search functionality
 * Uses SearchProvider for state management and focuses on rendering logic
 * Only the data adapter changes between different search types
 */
function SearchCore({
    // Data adapter - this is what makes each search type unique
    searchAdapter,

    // Configuration - can be provided directly or via plugin
    sources = [],
    filters = [],
    sortOptions = [],

    // UI Configuration
    className = 'search-engine',
    defaultView = 'grid',
    defaultSort = 'alpha',
    defaultSource = null,

    // Results display configuration
    renderer = 'simple',
    groupBy = null,

    // Modal configuration - plugin can provide custom modal component
    modalComponent = null,

    // Event handlers
    onError = defaultOnError,
    onResultClick = null,
    onResultDelete = defaultOnResultDelete,
    onDataLoaded = defaultOnDataLoaded,
    onSourceChange = defaultOnSourceChange,

    // Refresh functionality
    showRefreshControls = false,
    onRefresh = null,

    // Refresh trigger - extract explicitly to avoid dependency array issues
    refreshTrigger = 0,
}) {
    // ===== EVENT HANDLERS =====
    // Define result click handler that integrates with SearchProvider
    const handleResultClick = useCallback(
        result => {
            if (onResultClick) {
                onResultClick(result);
            }
            // SearchProvider will handle modal opening if onResultClick is null
            return result;
        },
        [onResultClick]
    );

    // ===== RENDER WITH PROVIDER =====
    return (
        <SearchProvider
            searchAdapter={searchAdapter}
            sources={sources}
            filters={filters}
            sortOptions={sortOptions}
            defaultView={defaultView}
            defaultSort={defaultSort}
            defaultSource={defaultSource}
            groupBy={groupBy}
            onError={onError}
            onResultDelete={onResultDelete}
            onDataLoaded={onDataLoaded}
            onSourceChange={onSourceChange}
            onRefresh={onRefresh}
            refreshTrigger={refreshTrigger}
        >
            {searchProviderValue => {
                const {
                    isLoading,
                    searchData,
                    searchTerm,
                    searchResults,
                    modalInfo,
                    focusedResultIndex,
                    currentSort,
                    currentView,

                    openModal,
                    closeModal,

                    refreshData,
                    getAutocompleteSuggestions,
                    keyboardNavigation,

                    resultsContainerRef,
                    onResultDelete: handleResultDelete,
                } = searchProviderValue;

                // Enhanced result click handler that works with provider
                const enhancedResultClick = result => {
                    const clickResult = handleResultClick(result);
                    // If onResultClick didn't handle it, use modal
                    if (!onResultClick && clickResult) {
                        openModal(result);
                    }
                };

                const handleModalClose = closeModal;

                const handleResultDeleted = () => {
                    closeModal();
                    if (handleResultDelete) handleResultDelete();
                };

                return (
                    <div className={className} role="search" aria-label="Search interface">
                        {isLoading ? (
                            <div
                                className="search-loading-container"
                                role="status"
                                aria-live="polite"
                                aria-label="Loading content"
                            >
                                <div className="search-loading-content">
                                    <LoadingSpinner />
                                    <div className="search-loading-text">
                                        Loading search data...
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <SearchResults
                                error={null} // Error handling now in SearchProvider
                                results={searchResults}
                                searchTerm={searchTerm}
                                renderer={renderer}
                                currentSort={currentSort}
                                currentView={currentView}
                                onResultClick={enhancedResultClick}
                                priorityOrder={searchData?.priorityOrder || {}}
                                ownerPriorityOrder={searchData?.ownerPriorityOrder || {}}
                                groupBy={groupBy}
                                focusedResultIndex={focusedResultIndex}
                                resultsContainerRef={resultsContainerRef}
                                showRefreshControls={showRefreshControls}
                                refreshData={refreshData}
                                getAutocompleteSuggestions={getAutocompleteSuggestions}
                                keyboardShortcuts={keyboardNavigation.getKeyboardShortcuts()}
                                hasFocusedResult={keyboardNavigation.hasFocusedResult}
                            />
                        )}

                        {modalInfo &&
                            modalComponent &&
                            React.createElement(modalComponent, {
                                obj: modalInfo,
                                onClose: handleModalClose,
                                onDeleted: handleResultDeleted,
                            })}
                    </div>
                );
            }}
        </SearchProvider>
    );
}

// Export memoized component for performance optimization
export default React.memo(SearchCore);
