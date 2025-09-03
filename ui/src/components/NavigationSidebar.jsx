import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { getIcon } from '../utils/tools';
import { useUIState } from '../contexts/UIStateContext';

const NAV = [
    { to: '/schedule', icon: 'event_note', label: 'Schedule' },
    { to: '/instances', icon: 'desktop_windows', label: 'Instances' },
    { to: '/notifications', icon: 'chat_bubble_outline', label: 'Notifications' },
    {
        icon: 'folder_open',
        label: 'Poster Management',
        children: [
            { to: '/poster/search/gdrive', label: 'Gdrive Search' },
            { to: '/poster/search/assets', label: 'Assets Search' },
            { to: '/poster/manage', label: 'Manage' },
            { to: '/poster/statistics', label: 'Statistics' },
        ],
    },
    {
        icon: 'movie_edit',
        label: 'Media Management',
        children: [
            { to: '/media/search', label: 'Search' },
            { to: '/media/manage', label: 'Manage' },
            { to: '/media/statistics', label: 'Statistics' },
        ],
    },
    {
        to: '/settings',
        icon: 'settings',
        label: 'Settings',
        children: [
            { to: '/settings/sync_gdrive', label: 'Sync Gdrive' },
            { to: '/settings/poster_renamerr', label: 'Poster Renamerr' },
            { to: '/settings/poster_cleanarr', label: 'Poster Cleanarr' },
            { to: '/settings/unmatched_assets', label: 'Unmatched Assets' },
            { to: '/settings/border_replacerr', label: 'Border Replacerr' },
            { to: '/settings/renameinatorr', label: 'Renameinatorr' },
            { to: '/settings/upgradinatorr', label: 'Upgradinatorr' },
            { to: '/settings/nohl', label: 'Nohl' },
            { to: '/settings/labelarr', label: 'Labelarr' },
            { to: '/settings/health_checkarr', label: 'Health Checkarr' },
            { to: '/settings/jduparr', label: 'Jduparr' },
            { to: '/settings/ui', label: 'UI' },
            { to: '/settings/general', label: 'General' },
        ],
    },
    { to: '/logs', icon: 'receipt_long', label: 'Logs' },
];

/**
 * Checks if a navigation item or its children are currently active
 * @param {Object} navigationItem - Navigation item to check
 * @param {Object} location - React Router location object
 * @returns {boolean} True if item or child is active
 */
function isParentActive(navigationItem, location) {
    if (navigationItem.to && location.pathname === navigationItem.to) return true;
    if (
        navigationItem.children &&
        navigationItem.children.some(sub => location.pathname.startsWith(sub.to))
    )
        return true;
    return false;
}

/**
 * Main navigation sidebar component with collapsible sections
 * @returns {JSX.Element} Navigation sidebar with menu items and dropdowns
 */
export default function Sidebar() {
    const location = useLocation();
    const navigate = useNavigate();
    const [openDropdowns, setOpenDropdowns] = React.useState(new Set());
    const { closeSidebar } = useUIState();

    // Manage dropdown visibility based on current route and user interaction
    React.useEffect(() => {
        const activeParents = NAV.filter(
            item => item.children && item.children.some(sub => location.pathname.startsWith(sub.to))
        ).map(item => item.label);

        // Keep active route dropdowns open, close others unless explicitly opened
        setOpenDropdowns(prevOpen => {
            const newOpen = new Set(activeParents);
            // Preserve user-opened dropdowns that aren't conflicting with active routes
            prevOpen.forEach(label => {
                const item = NAV.find(navItem => navItem.label === label);
                if (item && !item.children?.some(sub => location.pathname.startsWith(sub.to))) {
                    newOpen.add(label);
                }
            });
            return newOpen;
        });
    }, [location.pathname]);

    return (
        <nav className="sidebar" id="sidebarNav">
            <ul className="menu">
                {NAV.map(item => {
                    const isActiveSection = isParentActive(item, location);

                    if (!item.children) {
                        return (
                            <li
                                key={item.to}
                                className={`relative${isActiveSection ? ' active-section' : ''}`}
                            >
                                <NavLink
                                    to={item.to}
                                    className={({ isActive }) =>
                                        `sidebar-link${isActive ? ' active' : ''}`
                                    }
                                    onClick={closeSidebar}
                                >
                                    <span className="icon">{getIcon(`mi:${item.icon}`)}</span>
                                    {item.label}
                                </NavLink>
                                {isActiveSection && <span className="sidebar-highlight" />}
                            </li>
                        );
                    }

                    if (!item.to && item.children && item.children.length > 0) {
                        const isChildRoute = item.children.some(sub =>
                            location.pathname.startsWith(sub.to)
                        );
                        const isOpen = openDropdowns.has(item.label) || isChildRoute;
                        return (
                            <li
                                key={item.label}
                                className={`relative${isOpen ? ' active-section' : ''}`}
                            >
                                <button
                                    type="button"
                                    className="sidebar-link sidebar-link--toggle"
                                    aria-expanded={isOpen}
                                    onClick={() => {
                                        setOpenDropdowns(prev => {
                                            const newSet = new Set(prev);
                                            if (newSet.has(item.label)) {
                                                newSet.delete(item.label);
                                            } else {
                                                newSet.add(item.label);
                                                // Navigate to first child if not already on child route
                                                if (!isChildRoute && item.children[0]?.to) {
                                                    navigate(item.children[0].to);
                                                }
                                            }
                                            return newSet;
                                        });
                                    }}
                                >
                                    <span className="icon">{getIcon(`mi:${item.icon}`)}</span>
                                    {item.label}
                                </button>
                                <ul
                                    className={`settings-sub-menu${isOpen ? ' settings-sub-menu--open' : ''}`}
                                >
                                    {item.children.map(sub => (
                                        <li key={sub.to}>
                                            <NavLink
                                                to={sub.to}
                                                className={({ isActive }) =>
                                                    `sidebar-link sidebar-link--sub${isActive ? ' active' : ''}`
                                                }
                                                onClick={() => {
                                                    setOpenDropdowns(
                                                        prev => new Set([...prev, item.label])
                                                    );
                                                    closeSidebar();
                                                }}
                                            >
                                                {sub.label}
                                            </NavLink>
                                        </li>
                                    ))}
                                </ul>
                                {isOpen && <span className="sidebar-highlight" />}
                            </li>
                        );
                    }

                    // This handles items that have both a main route AND children (like Settings)
                    const isOpen = openDropdowns.has(item.label) || isActiveSection;
                    return (
                        <li
                            key={item.to}
                            className={`relative${isActiveSection ? ' active-section' : ''}`}
                        >
                            <NavLink
                                to={item.to}
                                className={({ isActive }) =>
                                    `sidebar-link${isActive ? ' active' : ''}`
                                }
                                onClick={() => {
                                    // Always open the dropdown when clicking the main settings link
                                    setOpenDropdowns(prev => new Set([...prev, item.label]));
                                    closeSidebar();
                                }}
                            >
                                <span className="icon">{getIcon(`mi:${item.icon}`)}</span>
                                {item.label}
                            </NavLink>
                            {isActiveSection && <span className="sidebar-highlight" />}
                            <ul
                                className={`settings-sub-menu${isOpen ? ' settings-sub-menu--open' : ''}`}
                            >
                                {item.children.map(sub => (
                                    <li key={sub.to}>
                                        <NavLink
                                            to={sub.to}
                                            className={({ isActive }) =>
                                                `sidebar-link sidebar-link--sub${isActive ? ' active' : ''}`
                                            }
                                            onClick={closeSidebar}
                                        >
                                            {sub.label}
                                        </NavLink>
                                    </li>
                                ))}
                            </ul>
                        </li>
                    );
                })}
            </ul>
            <div className="sidebar-footer"></div>
        </nav>
    );
}
