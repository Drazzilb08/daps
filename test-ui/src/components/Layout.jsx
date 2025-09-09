import React from 'react';
import { Outlet } from 'react-router-dom';
import PropTypes from 'prop-types';
import PageHeader from './PageHeader.jsx';
import PageSidebar from './PageSidebar.jsx';
import SearchToolbar from './SearchToolbar.jsx';
import useSearchPageDetection from '../hooks/useSearchPageDetection.js';

/**
 * Main layout component for DAPS application
 * 
 * Implements Radarr-style flexbox layout structure:
 * - Fixed header at top (doesn't scroll)
 * - Smart search toolbar positioned below header
 * - Sidebar and main content below toolbar
 * - Main content area is scrollable
 * - Responsive design with mobile-first approach
 * 
 * Layout Structure:
 * ┌─────────────────────────────────────────┐
 * │ HEADER (PageHeader with SearchInterface) │
 * ├─────────────────────────────────────────┤
 * │ SIDEBAR │ TOOLBAR (SearchToolbar)       │
 * ├─────────────────────────────────────────┤
 * │ SIDEBAR │ MAIN CONTENT                  │
 * └─────────────────────────────────────────┘
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Optional children (overrides Outlet if provided)
 * @param {Function} props.onToolbarAction - Handler for toolbar actions (search, filter, etc.)
 */
const Layout = ({ children }) => {
  // Detect if we're on a search page to show toolbar
  const { isSearchPage, searchPageType, searchSubtype } = useSearchPageDetection();
  
  /**
   * Handle toolbar action
   */
  const handleToolAction = React.useCallback((action, tool, event) => {
    console.log('Toolbar action:', { action, tool, searchPageType, searchSubtype });
  }, [searchPageType, searchSubtype]);

  return (
    <div className="page-layout">
      <PageHeader />
      <div className="page-main">
        <PageSidebar />
        <div className="page-main-content">
          {/* Toolbar only shows on search pages */}
          {isSearchPage && (
            <SearchToolbar
              searchPageType={searchPageType}
              searchSubtype={searchSubtype}
              onToolAction={handleToolAction}
            />
          )}
          <main className="page-content">
            {children || <Outlet />}
          </main>
        </div>
      </div>
    </div>
  );
};

Layout.propTypes = {
  children: PropTypes.node
};

export default Layout;