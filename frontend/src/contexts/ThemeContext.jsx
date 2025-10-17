import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';

/**
 * Theme context for managing dark/light theme state
 */

// Available theme options
export const THEMES = {
    LIGHT: 'light',
    DARK: 'dark',
    SYSTEM: 'system',
};

// Local storage key for theme preference
const THEME_STORAGE_KEY = 'daps-theme-preference';

// Create context
const ThemeContext = createContext();

/**
 * Custom hook to use theme context
 * @returns {Object} Theme context value with methods and state
 */
export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

/**
 * Get system theme preference
 * @returns {string} 'light' or 'dark'
 */
const getSystemTheme = () => {
    if (typeof window === 'undefined') return THEMES.DARK;

    return window.matchMedia('(prefers-color-scheme: dark)').matches ? THEMES.DARK : THEMES.LIGHT;
};

/**
 * Get stored theme preference or default
 * @returns {string} Theme preference
 */
const getStoredTheme = () => {
    if (typeof window === 'undefined') return THEMES.SYSTEM;

    try {
        return localStorage.getItem(THEME_STORAGE_KEY) || THEMES.SYSTEM;
    } catch (error) {
        console.warn('Failed to read theme preference from localStorage:', error);
        return THEMES.SYSTEM;
    }
};

/**
 * Store theme preference
 * @param {string} theme - Theme to store
 */
const storeTheme = theme => {
    if (typeof window === 'undefined') return;

    try {
        localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (error) {
        console.warn('Failed to store theme preference in localStorage:', error);
    }
};

/**
 * Apply theme to document
 * @param {string} theme - Theme to apply ('light' or 'dark')
 */
const applyTheme = theme => {
    if (typeof document === 'undefined') return;

    // Remove existing theme attributes
    document.documentElement.removeAttribute('data-theme');
    document.body.classList.remove('theme-light', 'theme-dark');

    // Apply new theme
    document.documentElement.setAttribute('data-theme', theme);
    document.body.classList.add(`theme-${theme}`);

    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
        const themeColor =
            theme === THEMES.DARK
                ? '#1a1a1a' // Dark theme color
                : '#ffffff'; // Light theme color
        metaThemeColor.setAttribute('content', themeColor);
    }
};

/**
 * Theme Provider component
 */
export const ThemeProvider = ({ children, defaultTheme = THEMES.SYSTEM }) => {
    const [themePreference, setThemePreference] = useState(defaultTheme);
    const [systemTheme, setSystemTheme] = useState(THEMES.DARK);
    const [actualTheme, setActualTheme] = useState(THEMES.DARK);

    /**
     * Initialize theme on mount
     */
    useEffect(() => {
        // Get system theme
        const currentSystemTheme = getSystemTheme();
        setSystemTheme(currentSystemTheme);

        // Get stored preference
        const storedTheme = getStoredTheme();
        setThemePreference(storedTheme);

        // Determine actual theme to apply
        const themeToApply = storedTheme === THEMES.SYSTEM ? currentSystemTheme : storedTheme;

        setActualTheme(themeToApply);
        applyTheme(themeToApply);
    }, []);

    /**
     * Listen for system theme changes
     */
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        const handleSystemThemeChange = e => {
            const newSystemTheme = e.matches ? THEMES.DARK : THEMES.LIGHT;
            setSystemTheme(newSystemTheme);

            // If user prefers system theme, update actual theme
            if (themePreference === THEMES.SYSTEM) {
                setActualTheme(newSystemTheme);
                applyTheme(newSystemTheme);
            }
        };

        // Modern browsers
        if (mediaQuery.addEventListener) {
            mediaQuery.addEventListener('change', handleSystemThemeChange);
            return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
        }
        // Older browsers
        else if (mediaQuery.addListener) {
            mediaQuery.addListener(handleSystemThemeChange);
            return () => mediaQuery.removeListener(handleSystemThemeChange);
        }
    }, [themePreference]);

    /**
     * Set theme preference
     * @param {string} theme - Theme to set
     */
    const setTheme = useCallback(
        theme => {
            if (!Object.values(THEMES).includes(theme)) {
                console.warn(`Invalid theme: ${theme}. Using system theme instead.`);
                theme = THEMES.SYSTEM;
            }

            setThemePreference(theme);
            storeTheme(theme);

            // Determine actual theme to apply
            const themeToApply = theme === THEMES.SYSTEM ? systemTheme : theme;
            setActualTheme(themeToApply);
            applyTheme(themeToApply);
        },
        [systemTheme]
    );

    /**
     * Toggle between light and dark themes
     * If currently on system, goes to opposite of current system theme
     */
    const toggleTheme = useCallback(() => {
        if (themePreference === THEMES.SYSTEM) {
            // If on system, switch to opposite of current system theme
            setTheme(systemTheme === THEMES.DARK ? THEMES.LIGHT : THEMES.DARK);
        } else {
            // If on specific theme, toggle to opposite
            setTheme(themePreference === THEMES.DARK ? THEMES.LIGHT : THEMES.DARK);
        }
    }, [themePreference, systemTheme, setTheme]);

    /**
     * Reset to system preference
     */
    const useSystemTheme = useCallback(() => {
        setTheme(THEMES.SYSTEM);
    }, [setTheme]);

    /**
     * Check if theme is dark
     */
    const isDarkTheme = actualTheme === THEMES.DARK;

    /**
     * Check if theme is light
     */
    const isLightTheme = actualTheme === THEMES.LIGHT;

    /**
     * Check if using system preference
     */
    const isSystemTheme = themePreference === THEMES.SYSTEM;

    const contextValue = {
        // Current state
        themePreference,
        actualTheme,
        systemTheme,

        // Boolean helpers
        isDarkTheme,
        isLightTheme,
        isSystemTheme,

        // Actions
        setTheme,
        toggleTheme,
        useSystemTheme,

        // Theme constants
        themes: THEMES,
    };

    return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
};

ThemeProvider.propTypes = {
    children: PropTypes.node.isRequired,
    defaultTheme: PropTypes.oneOf(Object.values(THEMES)),
};

/**
 * Higher-order component to inject theme props
 * @param {React.Component} Component - Component to wrap
 * @returns {React.Component} Enhanced component with theme props
 */
export const withTheme = Component => {
    const WrappedComponent = props => {
        const theme = useTheme();
        return <Component {...props} theme={theme} />;
    };

    WrappedComponent.displayName = `withTheme(${Component.displayName || Component.name})`;

    return WrappedComponent;
};
