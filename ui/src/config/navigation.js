/**
 * Navigation configuration for the DAPS application
 * Centralized navigation structure with support for nested routes
 */

/**
 * Main navigation configuration
 * Each item can have:
 * - to: Direct navigation route
 * - icon: Material icon name (without 'mi:' prefix)
 * - label: Display text
 * - children: Array of sub-navigation items
 */
export const NAVIGATION_CONFIG = [
    {
        to: '/schedule',
        icon: 'event_note',
        label: 'Schedule',
    },
    {
        to: '/instances',
        icon: 'desktop_windows',
        label: 'Instances',
    },
    {
        to: '/notifications',
        icon: 'chat_bubble_outline',
        label: 'Notifications',
    },
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
    {
        to: '/logs',
        icon: 'receipt_long',
        label: 'Logs',
    },
];

/**
 * Search page routes where search interface should be displayed
 */
export const SEARCH_PAGES = ['/media/search', '/poster/search/assets', '/poster/search/gdrive'];

/**
 * Utility function to check if a navigation item or its children are currently active
 * @param {Object} navigationItem - Navigation item to check
 * @param {string} currentPath - Current route pathname
 * @returns {boolean} True if item or child is active
 */
export function isNavigationItemActive(navigationItem, currentPath) {
    // Direct route match
    if (navigationItem.to && currentPath === navigationItem.to) {
        return true;
    }

    // Check if any child route is active
    if (navigationItem.children && navigationItem.children.length > 0) {
        return navigationItem.children.some(child => currentPath.startsWith(child.to));
    }

    return false;
}

/**
 * Utility function to find the parent navigation item for a given path
 * @param {string} currentPath - Current route pathname
 * @returns {Object|null} Parent navigation item or null if not found
 */
export function findParentNavigationItem(currentPath) {
    return NAVIGATION_CONFIG.find(item => {
        if (item.children) {
            return item.children.some(child => currentPath.startsWith(child.to));
        }
        return false;
    });
}

/**
 * Utility function to check if current page is a search page
 * @param {string} currentPath - Current route pathname
 * @returns {boolean} True if current page is a search page
 */
export function isSearchPage(currentPath) {
    return SEARCH_PAGES.some(page => currentPath.startsWith(page));
}
