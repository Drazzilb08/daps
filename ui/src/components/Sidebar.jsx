import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { getIcon } from '../utils/tools';

// Helper function to close mobile sidebar
function closeMobileSidebar() {
    const body = document.body;
    const hamburger = document.getElementById('sidebarToggle');
    if (body.classList.contains('sidebar-open')) {
        body.classList.remove('sidebar-open');
        hamburger?.classList.remove('opened');
        hamburger?.setAttribute('aria-expanded', 'false');
    }
}

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

function isParentActive(item, location) {
    if (item.to && location.pathname === item.to) return true;
    if (item.children && item.children.some(sub => location.pathname.startsWith(sub.to)))
        return true;
    return false;
}

export default function Sidebar() {
    const location = useLocation();
    const navigate = useNavigate();
    const [openDropdown, setOpenDropdown] = React.useState(null);

    // Always close dropdown when route changes to a non-child
    React.useEffect(() => {
        const parentForPath = NAV.find(
            item => item.children && item.children.some(sub => location.pathname.startsWith(sub.to))
        );
        if (!parentForPath || (parentForPath && parentForPath.label !== openDropdown)) {
            setOpenDropdown(null);
        }
    }, [location.pathname, openDropdown]);

    return (
        <nav className="sidebar" id="sidebarNav">
            <ul className="menu">
                {NAV.map(item => {
                    const isActiveSection = isParentActive(item, location);

                    // Simple link, no children
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
                                    onClick={closeMobileSidebar}
                                >
                                    <span className="icon">{getIcon(`mi:${item.icon}`)}</span>
                                    {item.label}
                                </NavLink>
                                {isActiveSection && <span className="sidebar-highlight" />}
                            </li>
                        );
                    }

                    // Dropdown parent with NO 'to:' -- pure dropdown, only one open at a time
                    if (!item.to && item.children && item.children.length > 0) {
                        const isChildRoute = item.children.some(sub =>
                            location.pathname.startsWith(sub.to)
                        );
                        const isOpen = openDropdown === item.label || isChildRoute;
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
                                        if (!isOpen) {
                                            // When opening, always navigate to first child
                                            setOpenDropdown(item.label);
                                            if (!isChildRoute && item.children[0]?.to) {
                                                navigate(item.children[0].to);
                                            }
                                        }
                                        // Do not allow closing by clicking again
                                    }}
                                >
                                    <span className="icon">{getIcon(`mi:${item.icon}`)}</span>
                                    {item.label}
                                </button>
                                <ul
                                    className="settings-sub-menu"
                                    style={{ display: isOpen ? 'block' : 'none' }}
                                >
                                    {item.children.map(sub => (
                                        <li key={sub.to}>
                                            <NavLink
                                                to={sub.to}
                                                className={({ isActive }) =>
                                                    `sidebar-link sidebar-link--sub${isActive ? ' active' : ''}`
                                                }
                                                onClick={() => {
                                                    setOpenDropdown(item.label);
                                                    closeMobileSidebar();
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

                    // Has 'to:' and children (dropdown opens if active as before)
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
                                onClick={closeMobileSidebar}
                            >
                                <span className="icon">{getIcon(`mi:${item.icon}`)}</span>
                                {item.label}
                            </NavLink>
                            {isActiveSection && <span className="sidebar-highlight" />}
                            <ul
                                className="settings-sub-menu"
                                style={{ display: isActiveSection ? 'block' : 'none' }}
                            >
                                {item.children.map(sub => (
                                    <li key={sub.to}>
                                        <NavLink
                                            to={sub.to}
                                            className={({ isActive }) =>
                                                `sidebar-link sidebar-link--sub${isActive ? ' active' : ''}`
                                            }
                                            onClick={closeMobileSidebar}
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
            <div className="sidebar-footer">{/* Footer content */}</div>
        </nav>
    );
}
