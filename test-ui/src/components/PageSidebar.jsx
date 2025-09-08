import React, { useState, useCallback } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

/**
 * PageSidebar component for DAPS application
 * 
 * Provides hierarchical navigation for the DAPS media automation system.
 * Features collapsible hierarchy with full-width background active states.
 * Fixed width sidebar that doesn't scroll with main content.
 * 
 * Features:
 * - Collapsible hierarchical navigation (children show/hide based on parent active state)
 * - Full-width background active states (no border stripes)
 * - Material Design icons for visual hierarchy
 * - Professional media management interface styling
 * - Mobile-responsive behavior with touch-friendly targets
 * - WCAG 2.1 AA compliant accessibility
 * - Smooth expand/collapse animations
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
        id: 'gdrive-search',
        label: 'Gdrive Search',
        path: '/search/gdrive'
      },
      {
        id: 'assets-search',
        label: 'Assets Search',
        path: '/search/assets'
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
  const [isCollapsed, setIsCollapsed] = useState(false);

  /**
   * Toggle sidebar collapse state (for future mobile implementation)
   */
  const handleToggleCollapse = useCallback(() => {
    setIsCollapsed(prev => !prev);
  }, []);

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
      className={`page-sidebar ${isCollapsed ? 'page-sidebar--collapsed' : ''}`}
      role="navigation"
      aria-label="Main navigation"
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

      {/* Collapse toggle button - hidden for now, will be used for mobile */}
      <button
        className="sidebar-toggle"
        onClick={handleToggleCollapse}
        type="button"
        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        style={{ display: 'none' }} // Hidden until mobile implementation
      >
        {isCollapsed ? '→' : '←'}
      </button>
    </aside>
  );
});

PageSidebar.displayName = 'PageSidebar';

export default PageSidebar;