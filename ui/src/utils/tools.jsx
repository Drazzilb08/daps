import { fetchConfig } from './api.js';

let isDirty = false;

/**
 * Transform snake_case strings into human-readable format
 *
 * Converts programming convention strings (like API field names) into
 * user-friendly display text by replacing underscores with spaces and
 * applying proper capitalization.
 *
 * @param {string} key - Snake_case string to transform
 * @returns {string} Human-readable string with title case
 *
 * @example
 * humanize('user_profile_name'); // => 'User Profile Name'
 * humanize('api_key'); // => 'Api Key'
 * humanize('max_retry_count'); // => 'Max Retry Count'
 */
export function humanize(key) {
    return key
        .replace(/_/g, ' ') // Replace underscores with spaces
        .replace(/\b\w/g, char => char.toUpperCase()); // Capitalize first letter of each word
}

/**
 * Mark form state as dirty and update save button UI
 *
 * Signals that form data has been modified and needs to be saved.
 * Updates both the internal state and visual indicators on the save button.
 *
 * Side effects:
 * - Sets internal isDirty flag to true
 * - Enables save button and adds 'dirty' CSS class
 * - Updates button tooltip to indicate unsaved changes
 *
 * @example
 * // Call when user modifies form fields
 * function handleInputChange(value) {
 *   setFormData(prev => ({ ...prev, field: value }));
 *   markDirty(); // Indicate unsaved changes
 * }
 */
export function markDirty() {
    isDirty = true;

    // Find save button (supports both fixed and regular variants)
    const saveBtn = document.getElementById('saveBtnFixed') || document.getElementById('saveBtn');
    if (saveBtn) {
        saveBtn.classList.add('dirty'); // Visual indicator
        saveBtn.classList.remove('saved'); // Remove saved state
        saveBtn.disabled = false; // Enable saving
        saveBtn.title = 'Save changes'; // User guidance
    }
}

/**
 * Reset dirty state and update save button to saved state
 *
 * Signals that all form changes have been successfully saved.
 * Updates both internal state and visual indicators.
 *
 * Side effects:
 * - Sets internal isDirty flag to false
 * - Disables save button and adds 'saved' CSS class
 * - Updates button tooltip to indicate saved state
 *
 * @example
 * // Call after successful save operation
 * async function handleSave() {
 *   await saveFormData(formData);
 *   resetDirty(); // Indicate changes saved
 * }
 */
export function resetDirty() {
    isDirty = false;

    // Find save button (supports both fixed and regular variants)
    const saveBtn = document.getElementById('saveBtnFixed') || document.getElementById('saveBtn');
    if (saveBtn) {
        saveBtn.classList.remove('dirty'); // Remove dirty indicator
        saveBtn.classList.add('saved'); // Visual confirmation
        saveBtn.disabled = true; // Prevent unnecessary saves
        saveBtn.title = 'All changes saved'; // User confirmation
    }
}

/**
 * Gets the current dirty state
 * @returns {boolean} Whether form has unsaved changes
 */
export function getIsDirty() {
    return isDirty;
}

/**
 * Renders appropriate icon based on type - either brand logo or Material icon
 * @param {string} type - Icon type identifier
 * @param {Object} [opts={}] - Options object
 * @param {Object} [opts.style] - Inline styles to apply
 * @returns {JSX.Element} Icon component (img for brands, span for Material icons)
 */
export function getIcon(type, opts = {}) {
    const brands = {
        radarr: 'radarr',
        imdb: 'imdb',
        tmdb: 'tmdb',
        tvdb: 'tvdb',
        sonarr: 'sonarr',
        plex: 'plex',
        discord: 'discord',
        notifiarr: 'notifiarr',
    };
    const key = (type || '').toLowerCase();

    if (brands[key]) {
        return (
            <img
                src={`/icons/${brands[key]}.svg`}
                alt={brands[key][0].toUpperCase() + brands[key].slice(1) + ' logo'}
                style={opts.style}
            />
        );
    }

    if (/^(mi:|material:)/.test(type)) {
        const iconName = type.replace(/^mi:|^material:/, '');
        return (
            <span className="material-icons" style={opts.style}>
                {iconName}
            </span>
        );
    }

    return (
        <span className="material-icons" style={opts.style}>
            notifications
        </span>
    );
}

let _themeMediaListener = null;

/**
 * Apply application theme based on user preferences or system settings
 *
 * Implements a comprehensive theme system that supports:
 * - Manual theme selection (light/dark)
 * - Automatic system preference detection
 * - Dynamic theme switching with media query listeners
 * - Graceful fallback to light theme on errors
 *
 * Theme persistence:
 * - Applies theme to document.documentElement via data-theme attribute
 * - Stores resolved theme in localStorage for consistency
 * - Handles media query listeners for 'auto' theme mode
 *
 * Supported theme values:
 * - 'light': Force light theme
 * - 'dark': Force dark theme
 * - 'auto': Follow system preference with automatic updates
 *
 * @example
 * // Apply theme on app initialization
 * useEffect(() => {
 *   setTheme();
 * }, []);
 *
 * @example
 * // Re-apply theme after settings change
 * const handleSettingsSave = async () => {
 *   await saveSettings(formData);
 *   setTheme(); // Apply new theme preference
 * };
 */
export function setTheme() {
    fetchConfig()
        .then(config => {
            // Extract theme preference with fallback to 'light'
            let theme =
                config && config.user_interface && typeof config.user_interface.theme === 'string'
                    ? config.user_interface.theme.toLowerCase()
                    : 'light';

            /**
             * Apply system-detected theme and persist choice
             * @inner
             */
            function applySystemTheme() {
                const isDark = matchMedia('(prefers-color-scheme: dark)').matches;
                const resolvedTheme = isDark ? 'dark' : 'light';
                document.documentElement.setAttribute('data-theme', resolvedTheme);
                localStorage.setItem('theme', resolvedTheme);
            }

            // Clean up any existing media query listener to prevent memory leaks
            if (_themeMediaListener) {
                matchMedia('(prefers-color-scheme: dark)').removeEventListener(
                    'change',
                    _themeMediaListener
                );
                _themeMediaListener = null;
            }

            // Apply theme based on user preference
            if (theme === 'auto') {
                // Auto mode: follow system preference with live updates
                applySystemTheme(); // Apply current system preference

                // Set up listener for system preference changes
                _themeMediaListener = applySystemTheme;
                matchMedia('(prefers-color-scheme: dark)').addEventListener(
                    'change',
                    _themeMediaListener
                );
            } else {
                // Manual mode: apply specific theme choice
                const resolvedTheme = theme === 'dark' ? 'dark' : 'light';
                document.documentElement.setAttribute('data-theme', resolvedTheme);
                localStorage.setItem('theme', resolvedTheme);
            }
        })
        .catch(err => {
            // Graceful degradation: apply light theme and log error
            console.error('Failed to fetch theme configuration:', err);
            document.documentElement.setAttribute('data-theme', 'light');
            localStorage.setItem('theme', 'light');
        });
}

/**
 * Distributes dashboard cards into two balanced columns based on content weight
 * @param {Array} cards - Array of card objects
 * @param {Object} renderedOpen - Object tracking which cards are open
 * @returns {Array} Two-element array containing left and right column cards
 */
export function splitIntoColumns(cards, renderedOpen) {
    const left = [],
        right = [];
    let leftHeight = 0,
        rightHeight = 0;
    cards.forEach(card => {
        const weight = renderedOpen[card.key] ? 2 : 1;
        if (leftHeight <= rightHeight) {
            left.push(card);
            leftHeight += weight;
        } else {
            right.push(card);
            rightHeight += weight;
        }
    });
    return [left, right];
}
