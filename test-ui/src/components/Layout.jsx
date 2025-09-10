import React from 'react';
import { Outlet } from 'react-router-dom';
import PropTypes from 'prop-types';
import { FeatureErrorBoundary } from './error';
import PageHeader from './PageHeader.jsx';
import PageSidebar from './PageSidebar.jsx';
import SearchToolbar from './Search/SearchToolbar.jsx';
import useSearchPageDetection from '../hooks/useSearchPageDetection.js';

/**
 * Layout - Main layout component for DAPS application
 * 
 * Professional responsive layout implementing context-aware interface design
 * with dynamic toolbar display and mobile-first architecture.
 * 
 * Features:
 * - Fixed header with context-aware search interface integration
 * - Collapsible sidebar with hierarchical navigation
 * - Context-aware toolbar display (only on search pages)
 * - Responsive design with mobile breakpoints
 * - Scrollable main content area with proper overflow handling
 * - Touch-optimized mobile interface with overlay sidebar
 * - Professional flexbox layout with proper semantic HTML
 * 
 * Layout Structure:
 * - Header: Fixed position with PageHeader and SearchInterface
 * - Main: Flexbox container with sidebar and content area
 * - Sidebar: Collapsible navigation with mobile overlay
 * - Toolbar: Context-aware SearchToolbar (search pages only)
 * - Content: Scrollable main content area using React Router Outlet
 * 
 * Context Behavior:
 * - Search pages (/media/search, /posters/search/*): Show SearchToolbar
 * - Non-search pages: Clean layout without toolbar
 * - Mobile: Overlay sidebar with backdrop and touch gestures
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} [props.children] - Optional children (overrides Outlet if provided)
 */
const Layout = ({ children }) => {
  // Detect if we're on a search page to show toolbar
  const { isSearchPage, searchPageType, searchSubtype } = useSearchPageDetection();
  
  /**
   * Handle toolbar action from SearchToolbar component
   * 
   * Processes toolbar actions and delegates to appropriate handlers
   * based on action type and current search context.
   * 
   * @param {string} action - The action type (refresh, scan, export, etc.)
   * @param {Object} tool - Tool data including action and context information
   * @param {Event} _event - DOM event that triggered the action (currently unused)
   */
  const handleToolAction = React.useCallback((action, tool, _event) => {
    console.log('Toolbar action:', { action, tool, searchPageType, searchSubtype });
    // TODO: Implement specific action handlers based on action type
  }, [searchPageType, searchSubtype]);

  return (
    <div className="page-layout">
      <FeatureErrorBoundary 
        featureName="Page Header" 
        featureDescription="Main navigation and header"
        critical={true}
      >
        <PageHeader />
      </FeatureErrorBoundary>
      
      <div className="page-main">
        <FeatureErrorBoundary 
          featureName="Sidebar Navigation" 
          featureDescription="Left navigation sidebar"
          critical={true}
        >
          <PageSidebar />
        </FeatureErrorBoundary>
        
        <div className="page-main-content">
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
          
          <main className="page-content">
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
  children: PropTypes.node
};

export default Layout;