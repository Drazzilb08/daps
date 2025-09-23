import React from 'react';
import { Outlet } from 'react-router-dom';
import PropTypes from 'prop-types';
import { FeatureErrorBoundary } from './error';
import PageHeader from './PageHeader.jsx';
import PageSidebar from './PageSidebar.jsx';
import SearchToolbar from './Search/SearchToolbar.jsx';
import useSearchPageDetection from '../hooks/useSearchPageDetection.js';

/**
 * Main layout with responsive sidebar and toolbar
 *
 * Shows SearchToolbar on search pages only. Sidebar collapses to overlay on mobile.
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} [props.children] - Optional children (overrides Outlet if provided)
 */
const Layout = ({ children }) => {
    // Detect if we're on a search page to show toolbar
    const { isSearchPage, searchPageType, searchSubtype } = useSearchPageDetection();

    /**
     * Handle toolbar actions (refresh, scan, export, etc.)
     *
     * @param {string} action - The action type
     * @param {Object} tool - Tool data
     * @param {Event} _event - DOM event (unused)
     */
    const handleToolAction = React.useCallback(
        (action, tool, _event) => {
            console.log('Toolbar action:', { action, tool, searchPageType, searchSubtype });
        },
        [searchPageType, searchSubtype]
    );

    return (
        <div className="flex flex-col h-dvh overflow-hidden">
            {/* Skip link for keyboard navigation - WCAG 2.1 AA requirement */}
            <a href="#main-content" className="skip-link">
                Skip to main content
            </a>

            <FeatureErrorBoundary
                featureName="Page Header"
                featureDescription="Main navigation and header"
                critical={true}
            >
                <PageHeader />
            </FeatureErrorBoundary>

            <div className="flex flex-1 overflow-hidden">
                <FeatureErrorBoundary
                    featureName="Sidebar Navigation"
                    featureDescription="Left navigation sidebar"
                    critical={true}
                >
                    <PageSidebar />
                </FeatureErrorBoundary>

                <div className="flex-1-0-1px flex flex-col overflow-hidden">
                    {/* Toolbar only shows on search pages */}
                    {isSearchPage && (
                        <FeatureErrorBoundary
                            featureName="Search Toolbar"
                            featureDescription="Search page toolbar with actions"
                            critical={false}
                        >
                            <SearchToolbar
                                searchPageType={searchPageType}
                                searchSubtype={searchSubtype}
                                onToolAction={handleToolAction}
                            />
                        </FeatureErrorBoundary>
                    )}

                    <main id="main-content" className="flex-1 overflow-y-auto p-4 px-3 md:p-6 md:px-4 bg-bg">
                        <FeatureErrorBoundary
                            featureName="Page Content"
                            featureDescription="Main page content area"
                            critical={false}
                        >
                            {children || <Outlet />}
                        </FeatureErrorBoundary>
                    </main>
                </div>
            </div>
        </div>
    );
};

Layout.propTypes = {
    children: PropTypes.node,
};

export default Layout;
