import React, { useState, useCallback, useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useUIState } from '../contexts/UIStateContext.jsx';

/**
 * PageSidebar component for DAPS application
 * 
 * Provides hierarchical navigation for the DAPS media automation system.
 * Features collapsible hierarchy with full-width background active states.
 * Mobile overlay at 768px breakpoint with touch-optimized interface.
 * 
 * Features:
 * - Collapsible hierarchical navigation (children show/hide based on parent active state)
 * - Full-width background active states (no border stripes)
 * - Mobile overlay with backdrop at 768px breakpoint
 * - Touch-optimized navigation targets (44px minimum)
 * - Material Design icons for visual hierarchy
 * - Professional media management interface styling
 * - WCAG 2.1 AA compliant accessibility
 * - Smooth expand/collapse animations
 * - Outside click and navigation link click closes mobile menu
 */

/**
 * Hierarchical navigation structure for DAPS
 * Structure matches media automation workflow and professional interfaces like Sonarr/Radarr
 */
const NAVIGATION_STRUCTURE = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/dashboard',
    icon: 'home',
    type: 'single'
  },
  {
    id: 'media',
    label: 'Media',
    path: '/media',
    icon: 'movie',
    type: 'parent',
    children: [
      {
        id: 'media-search',
        label: 'Search',
        path: '/media/search'
      },
      {
        id: 'media-library',
        label: 'Library',
        path: '/media/library'
      },
      {
        id: 'media-statistics',
        label: 'Statistics',
        path: '/media/statistics'
      }
    ]
  },
  {
    id: 'posters',
    label: 'Posters',
    path: '/posters',
    icon: 'image',
    type: 'parent',
    children: [
      {
        id: 'posters-search',
        label: 'Search',
        path: '/posters/search'
      },
      {
        id: 'posters-manage',
        label: 'Manage',
        path: '/posters/manage'
      },
      {
        id: 'posters-statistics',
        label: 'Statistics',
        path: '/posters/statistics'
      }
    ]
  },
  {
    id: 'activity',
    label: 'Activity',
    path: '/activity',
    icon: 'vital_signs',
    type: 'single'
  },
  {
    id: 'settings',
    label: 'Settings',
    path: '/settings',
    icon: 'settings',
    type: 'single'
  },
  {
    id: 'logs',
    label: 'Logs',
    path: '/logs',
    icon: 'description',
    type: 'single'
  }
];

const PageSidebar = React.memo(() => {
  const location = useLocation();
  const { mobileMenuOpen, closeMobileMenu, isMobile } = useUIState();
  const sidebarRef = useRef(null);

  /**
   * Handle parent navigation link click - do NOT close mobile menu (shows children)
   */
  const handleParentNavLinkClick = useCallback(() => {
    // Parent clicks should not close the mobile menu
    // This allows users to see the children items
  }, []);

  /**
   * Handle child navigation link click - close mobile menu on mobile
   */
  const handleChildNavLinkClick = useCallback(() => {
    if (isMobile && mobileMenuOpen) {
      closeMobileMenu();
    }
  }, [isMobile, mobileMenuOpen, closeMobileMenu]);

  /**
   * Handle outside click to close mobile menu
   */
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        isMobile && 
        mobileMenuOpen && 
        sidebarRef.current && 
        !sidebarRef.current.contains(event.target)
      ) {
        // Check if click is on hamburger button (don't close if so)
        const hamburgerButton = event.target.closest('.hamburger');
        if (!hamburgerButton) {
          closeMobileMenu();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobile, mobileMenuOpen, closeMobileMenu]);

  /**
   * Collapsible Hierarchy Logic - Full-Width Background Active States
   * 
   * PARENT ACTIVE: Gets full-width background when any child path is active
   * CHILD ACTIVE: Gets full-width background when specific path matches  
   * COLLAPSIBLE: Children only visible when parent section is active
   * 
   * Examples:
   * - /media/search: "Media" parent shows children AND "Search" child gets full background
   * - /media: "Media" parent shows children (direct parent navigation)
   * - /dashboard: Single item active with full background, no children
   * - /posters: Children hidden when not in posters section
   */
  
  /**
   * Check if a parent section is active (any child path matches)
   * Used for parent background highlighting and children visibility
   */
  const isParentActive = useCallback((item) => {
    if (item.type !== 'parent') return false;
    
    // Parent is active if current path starts with parent path
    // This controls background highlighting and children visibility
    return location.pathname.startsWith(item.path + '/') || 
           location.pathname === item.path;
  }, [location.pathname]);

  /**
   * Check if a specific child item is active
   * Used for child background highlighting
   */
  const isChildActive = useCallback((childPath) => {
    return location.pathname === childPath;
  }, [location.pathname]);

  /**
   * Check if a single navigation item is active
   * Used for single items without children
   */
  const isSingleActive = useCallback((path) => {
    return location.pathname === path;
  }, [location.pathname]);

  return (
    <aside 
        ref={sidebarRef}
        className={`page-sidebar ${isMobile && mobileMenuOpen ? 'page-sidebar--mobile-open' : ''}`}
        role="navigation"
        aria-label="Main navigation"
        aria-hidden={isMobile && !mobileMenuOpen}
      >
        <div className="page-sidebar-content">
          {/* Hierarchical Navigation */}
          <nav className="page-sidebar-nav">
            <ul className="nav-list" role="list">
              {NAVIGATION_STRUCTURE.map((item) => (
                <li key={item.id} className="nav-item">
                  {/* Parent Item or Single Item */}
                  <NavLink
                    to={item.path}
                    onClick={handleParentNavLinkClick}
                    className={`nav-link nav-link--parent ${
                      item.type === 'parent' && isParentActive(item) ? 'nav-link--parent-active' : ''
                    } ${
                      item.type === 'single' && isSingleActive(item.path) ? 'nav-link--active' : ''
                    }`}
                    aria-current={
                      (item.type === 'parent' && isParentActive(item)) ||
                      (item.type === 'single' && isSingleActive(item.path))
                        ? 'page' : undefined
                    }
                  >
                    <span className="nav-icon material-symbols-outlined" aria-hidden="true">
                      {item.icon}
                    </span>
                    <span className="nav-label">
                      {item.label}
                    </span>
                  </NavLink>

                  {/* Child Items - Only Visible When Parent is Active */}
                  {item.type === 'parent' && item.children && isParentActive(item) && (
                    <ul className="nav-children" role="list">
                      {item.children.map((child) => (
                        <li key={child.id} className="nav-child-item">
                          <NavLink
                            to={child.path}
                            onClick={handleChildNavLinkClick}
                            className={`nav-link nav-link--child nav-link--child-in-active-section ${
                              isChildActive(child.path) ? 'nav-link--child-active' : ''
                            }`}
                            aria-current={isChildActive(child.path) ? 'page' : undefined}
                          >
                            <span className="nav-label nav-label--child">
                              {child.label}
                            </span>
                          </NavLink>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </nav>

          {/* Footer section for future use */}
          <div className="page-sidebar-footer">
            {/* Future: version info, user info, etc. */}
          </div>
        </div>
      </aside>
  );
});

PageSidebar.displayName = 'PageSidebar';

export default PageSidebar;