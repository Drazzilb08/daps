// src/components/ThemeProvider.jsx
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { fetchConfig } from '../../utils/api';
import { useToast } from './ToastProvider';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
    const toast = useToast();
    const [theme, setThemeState] = useState('light');

    // Effect: set theme on mount and listen for system changes if auto
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

    // Manually allow theme change from anywhere
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

export function useTheme() {
    return useContext(ThemeContext);
}
