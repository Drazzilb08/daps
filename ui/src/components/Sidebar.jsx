import { NavLink, useLocation } from 'react-router-dom';
import { getIcon } from '../utils/tools';

const NAV = [
    { to: '/schedule', icon: 'event_note', label: 'Schedule' },
    { to: '/instances', icon: 'desktop_windows', label: 'Instances' },
    { to: '/notifications', icon: 'chat_bubble_outline', label: 'Notifications' },
    {
        to: '/poster_management',
        icon: 'collections',
        label: 'Poster Management',
        children: [
            { to: '/poster/search/gdrive', label: 'Gdrive Search' },
            { to: '/poster/search/assets', label: 'Assets Search' },
            { to: '/poster/manage', label: 'Manage' },
            { to: '/poster/statistics', label: 'Statistics' },
        ],
    },
    {
        to: '/media_management',
        icon: 'folder',
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
    if (location.pathname === item.to) return true;
    if (item.children && item.children.some(sub => location.pathname.startsWith(sub.to)))
        return true;
    return false;
}

export default function Sidebar() {
    const location = useLocation();

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
                                >
                                    <span className="icon">{getIcon(`mi:${item.icon}`)}</span>
                                    {item.label}
                                </NavLink>
                                {isActiveSection && <span className="sidebar-highlight" />}
                            </li>
                        );
                    } else {
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
                                            >
                                                {sub.label}
                                            </NavLink>
                                        </li>
                                    ))}
                                </ul>
                            </li>
                        );
                    }
                })}
            </ul>
            <div className="sidebar-footer">{/* Footer content */}</div>
        </nav>
    );
}
