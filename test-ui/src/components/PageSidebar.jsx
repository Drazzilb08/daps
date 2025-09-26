import React, { useCallback, useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useUIState } from '../contexts/UIStateContext.jsx';

/**
 * Sidebar navigation component with collapsible hierarchy
 */

const NAVIGATION_STRUCTURE = [
    {
        id: 'dashboard',
        label: 'Dashboard',
        path: '/dashboard',
        icon: 'home',
        type: 'single',
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
                path: '/media/search',
            },
            {
                id: 'media-manage',
                label: 'Manage',
                path: '/media/manage',
            },
            {
                id: 'media-statistics',
                label: 'Statistics',
                path: '/media/statistics',
            },
        ],
    },
    {
        id: 'poster',
        label: 'Posters',
        path: '/poster',
        icon: 'image',
        type: 'parent',
        children: [
            {
                id: 'gdrive-search',
                label: 'GDrive Search',
                path: '/poster/search/gdrive',
            },
            {
                id: 'assets-search',
                label: 'Assets Search',
                path: '/poster/search/assets',
            },
            {
                id: 'poster-manage',
                label: 'Manage',
                path: '/poster/manage',
            },
            {
                id: 'poster-statistics',
                label: 'Statistics',
                path: '/poster/statistics',
            },
        ],
    },
    {
        id: 'settings',
        label: 'Settings',
        path: '/settings',
        icon: 'settings',
        type: 'parent',
        children: [
            {
                id: 'settings-schedule',
                label: 'Schedule',
                path: '/settings/schedule',
            },
            {
                id: 'settings-instances',
                label: 'Instances',
                path: '/settings/instances',
            },
            {
                id: 'settings-notifications',
                label: 'Notifications',
                path: '/settings/notifications',
            },
            {
                id: 'settings-modules',
                label: 'Modules',
                path: '/settings/modules',
            
            }
        ],
    },
    {
        id: 'logs',
        label: 'Logs',
        path: '/logs',
        icon: 'description',
        type: 'single',
    },
];

const PageSidebar = React.memo(() => {
    const location = useLocation();
    const { mobileMenuOpen, closeMobileMenu, isMobile } = useUIState();
    const sidebarRef = useRef(null);

    const handleParentNavLinkClick = useCallback(() => {
        // Parent clicks should not close the mobile menu
        // This allows users to see the children items
    }, []);

    const handleChildNavLinkClick = useCallback(() => {
        if (isMobile && mobileMenuOpen) {
            closeMobileMenu();
        }
    }, [isMobile, mobileMenuOpen, closeMobileMenu]);

    useEffect(() => {
        const handleClickOutside = event => {
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


    const isParentActive = useCallback(
        item => {
            if (item.type !== 'parent') return false;

            // Parent is active if current path starts with parent path
            // This controls background highlighting and children visibility
            return location.pathname.startsWith(item.path + '/') || location.pathname === item.path;
        },
        [location.pathname]
    );

    const isChildActive = useCallback(
        childPath => {
            return location.pathname === childPath;
        },
        [location.pathname]
    );

    const isSingleActive = useCallback(
        path => {
            return location.pathname === path;
        },
        [location.pathname]
    );

    return (
        <aside
            ref={sidebarRef}
            className={`bg-sidebar-bg border-r border-sidebar-border overflow-y-auto transition-transform
                ${isMobile
                    ? `fixed inset-y-0 left-0 w-sidebar z-50 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`
                    : 'flex-none w-sidebar translate-x-0'
                } ${isMobile && mobileMenuOpen ? 'page-sidebar--mobile-open' : ''}`}
            role="navigation"
            aria-label="Main navigation"
            aria-hidden={isMobile && !mobileMenuOpen}
        >
            <div className="flex flex-col h-full py-4">
                {/* Hierarchical Navigation */}
                <nav className="flex-1">
                    <ul className="list-none" role="list">
                        {NAVIGATION_STRUCTURE.map(item => (
                            <li key={item.id} className="mb-0">
                                {/* Parent Item or Single Item */}
                                <NavLink
                                    to={item.path}
                                    onClick={handleParentNavLinkClick}
                                    className={`flex items-center gap-3 py-3 px-4 text-secondary no-underline text-sm font-medium transition-all duration-150 touch-target relative hover:text-primary ${
                                        item.type === 'parent' && isParentActive(item)
                                            ? 'nav-link--parent-active'
                                            : ''
                                    } ${
                                        item.type === 'single' && isSingleActive(item.path)
                                            ? 'nav-link--active'
                                            : ''
                                    }`}
                                    aria-current={
                                        (item.type === 'parent' && isParentActive(item)) ||
                                        (item.type === 'single' && isSingleActive(item.path))
                                            ? 'page'
                                            : undefined
                                    }
                                >
                                    <span
                                        className="text-base flex items-center justify-center w-5 shrink-0 material-symbols-outlined"
                                        aria-hidden="true"
                                    >
                                        {item.icon}
                                    </span>
                                    <span className="flex-1 whitespace-nowrap overflow-hidden text-ellipsis">{item.label}</span>
                                </NavLink>

                                {/* Child Items - Only Visible When Parent is Active */}
                                {item.type === 'parent' &&
                                    item.children &&
                                    isParentActive(item) && (
                                        <ul className="list-none" role="list">
                                            {item.children.map(child => (
                                                <li key={child.id} className="mb-0">
                                                    <NavLink
                                                        to={child.path}
                                                        onClick={handleChildNavLinkClick}
                                                        className={`flex items-center py-2 px-4 pl-10 no-underline text-sm font-normal transition-all duration-150 touch-target relative nav-link--child-in-active-section hover:text-primary ${
                                                            isChildActive(child.path)
                                                                ? 'nav-link--child-active text-accent'
                                                                : 'text-sidebar-secondary'
                                                        }`}
                                                        aria-current={
                                                            isChildActive(child.path)
                                                                ? 'page'
                                                                : undefined
                                                        }
                                                    >
                                                        <span className="flex-1 ml-4  whitespace-nowrap overflow-hidden text-ellipsis nav-label--child">
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
                <div className="shrink-0 p-4 border-t border-sidebar-border">
                    {/* Future: version info, user info, etc. */}
                </div>
            </div>
        </aside>
    );
});

PageSidebar.displayName = 'PageSidebar';

export default PageSidebar;
