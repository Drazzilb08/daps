import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { fetchConfig } from '../../utils/api';
import { useToast } from './ToastProvider';

const ThemeContext = createContext();

/**
 * Comprehensive theme management provider with system preference synchronization
 *
 * Manages application theme state with support for manual theme selection and
 * automatic system preference detection. Provides smooth theme transitions and
 * persistent storage of theme preferences.
 *
 * Supported theme modes:
 * - 'light': Force light theme regardless of system preference
 * - 'dark': Force dark theme regardless of system preference
 * - 'auto': Dynamically follow system color scheme preference
 *
 * Features:
 * - Automatic system preference detection with media query listeners
 * - Persistent theme storage in localStorage with error handling
 * - Smooth theme transitions via CSS data attributes
 * - Context API for theme state access throughout the app
 * - Error handling with toast notifications for storage failures
 * - Cleanup of media query listeners to prevent memory leaks
 *
 * Implementation details:
 * - Uses document.documentElement data-theme attribute for CSS theming
 * - Maintains internal theme state for React components
 * - Handles localStorage access errors gracefully
 * - Provides stable API through context for consuming components
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components to wrap with theme context
 * @returns {JSX.Element} Theme provider component
 *
 * @example
 * // App root setup
 * function App() {
 *   return (
 *     <ThemeProvider>
 *       <Router>
 *         <Routes>...</Routes>
 *       </Router>
 *     </ThemeProvider>
 *   );
 * }
 *
 * @example
 * // Consuming theme context
 * function MyComponent() {
 *   const { theme, setTheme } = useTheme();
 *
 *   return (
 *     <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
 *       Switch to {theme === 'light' ? 'Dark' : 'Light'} Mode
 *     </button>
 *   );
 * }
 */
export function ThemeProvider({ children }) {
    const toast = useToast();
    const [theme, setThemeState] = useState('light');

    useEffect(() => {
        let listener = null;
        let _mounted = true;

        fetchConfig()
            .then(config => {
                let appTheme = config?.user_interface?.theme?.toLowerCase?.() || 'light';

                function apply(themeToApply) {
                    document.documentElement.setAttribute('data-theme', themeToApply);
                    try {
                        localStorage.setItem('theme', themeToApply);
                    } catch {
                        if (typeof toast === 'function') {
                            toast('Failed to save theme preference', 'error');
                        }
                    }
                }

                if (appTheme === 'auto') {
                    const setBySystem = () => {
                        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                        const sysTheme = isDark ? 'dark' : 'light';
                        if (_mounted) setThemeState(sysTheme);
                        apply(sysTheme);
                    };
                    setBySystem();
                    listener = setBySystem;
                    window
                        .matchMedia('(prefers-color-scheme: dark)')
                        .addEventListener('change', listener);
                } else {
                    setThemeState(appTheme);
                    apply(appTheme);
                }
            })
            .catch(() => {
                if (_mounted) setThemeState('light');
                document.documentElement.setAttribute('data-theme', 'light');
            });

        return () => {
            _mounted = false;
            if (listener) {
                window
                    .matchMedia('(prefers-color-scheme: dark)')
                    .removeEventListener('change', listener);
            }
        };
    }, [toast]);

    /**
     * Manually sets theme and persists to localStorage
     * @param {string} themeToSet - Theme to apply ('light', 'dark')
     */
    const setTheme = useCallback(
        themeToSet => {
            setThemeState(themeToSet);
            document.documentElement.setAttribute('data-theme', themeToSet);
            try {
                localStorage.setItem('theme', themeToSet);
            } catch {
                if (typeof toast === 'function') {
                    toast('Could not save theme preference (localStorage error)', 'error');
                }
            }
        },
        [toast]
    );

    return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

/**
 * Hook to access theme context
 * @returns {Object} Theme context with current theme and setTheme function
 * @throws {Error} When used outside ThemeProvider
 */
export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
