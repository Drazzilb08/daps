import React from 'react';
import { Outlet } from 'react-router-dom';
import PropTypes from 'prop-types';
import PageHeader from './PageHeader.jsx';
import PageSidebar from './PageSidebar.jsx';

/**
 * Main layout component for DAPS application
 * 
 * Implements Sonarr-style flexbox layout structure:
 * - Fixed header at top (doesn't scroll)
 * - Sidebar and main content below header
 * - Main content area is scrollable
 * - Responsive design with mobile-first approach
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Optional children (overrides Outlet if provided)
 */
const Layout = ({ children }) => {
  return (
    <div className="page-layout">
      <PageHeader />
      <div className="page-main">
        <PageSidebar />
        <main className="page-content">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
};

Layout.propTypes = {
  children: PropTypes.node
};

export default Layout;