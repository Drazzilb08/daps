import React, { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext.jsx';
import { useUIState } from '../contexts/UIStateContext.jsx';
import useSearchPageDetection from '../hooks/useSearchPageDetection.js';
import SearchInterface from './Search/SearchInterface.jsx';
import { HamburgerButton } from './ui';

/**
 * PageHeader component for DAPS application - Phase 4D Context-Aware
 *
 * Context-aware header that adapts interface based on current page type:
 *
 * Search Pages (/media/search, /posters/search/*):
 * - Logo + Hamburger menu
 * - Search Input Field with debounced input (300ms)
 * - Smart Responsive Toolbar placeholder
 * - Search State Indicator
 *
 * Non-Search Pages:
 * - Logo + Hamburger menu only
 * - Clean, minimal header
 * - Theme toggle (temporary for testing)
 *
 * Features:
 * - DAPS logo from favicon-32x32.png
 * - Animated hamburger menu with SVG
 * - Route-based interface switching
 * - Mobile-first responsive design (375px+)
 * - Touch-optimized buttons (44px minimum)
 * - Uses design tokens for styling
 */
const PageHeader = React.memo(() => {
    const { toggleTheme, isDarkTheme, isLightTheme, isSystemTheme, actualTheme } = useTheme();
    const { mobileMenuOpen, toggleMobileMenu } = useUIState();

    // Context-aware header detection
    const { isSearchPage, searchPageType, searchSubtype } = useSearchPageDetection();

    /**
     * Handle theme toggle click
     */
    const handleThemeToggle = useCallback(() => {
        toggleTheme();
    }, [toggleTheme]);

    /**
     * Handle hamburger menu click
     */
    const handleHamburgerClick = useCallback(() => {
        toggleMobileMenu();
    }, [toggleMobileMenu]);

    /**
     * Handle search action from SearchInterface
     */
    const handleSearch = useCallback(
        searchTerm => {
            console.log('Search initiated:', { searchTerm, searchPageType, searchSubtype });
        },
        [searchPageType, searchSubtype]
    );

    /**
     * Get theme display text for button
     */
    const getThemeDisplayText = () => {
        if (isSystemTheme) {
            return `System (${actualTheme})`;
        }
        return actualTheme.charAt(0).toUpperCase() + actualTheme.slice(1);
    };

    /**
     * Get theme icon name for button
     */
    const getThemeIconName = () => {
        if (isDarkTheme) {
            return 'light_mode';
        } else if (isLightTheme) {
            return 'dark_mode';
        } else {
            return 'settings_suggest';
        }
    };

    return (
        <header
            className={`shrink-0 h-header bg-header-bg z-sticky ${isSearchPage ? 'search-page' : 'non-search-page'}`}
            role="banner"
        >
            <div className={`flex items-center justify-between h-full px-4 max-w-full ${isSearchPage ? 'gap-4' : 'gap-3'}`}>
                {/* Brand/Logo Section with Hamburger */}
                <div className="flex items-center gap-3 shrink-0">
                    {/* DAPS Logo and Title - Clickable Link to Home */}
                    <Link to="/" className="page-header-logo-section touch-target flex items-center gap-3 no-underline text-current cursor-pointer p-1 transition-colors hover:bg-surface-alt focus:outline-focus">
                        <img
                            src="/img/favicon-32x32.png"
                            alt="DAPS Logo"
                            className="shrink-0 w-icon-xl h-icon-xl"
                            width="32"
                            height="32"
                        />
                        <h1 className="page-header-title max-md:hidden flex flex-col leading-tight m-0">
                            <span className="text-xl font-bold text-primary">DAPS</span>
                            <span className="text-xs text-secondary font-medium">Media Automation</span>
                        </h1>
                    </Link>

                    {/* Hamburger Menu Button */}
                    <HamburgerButton
                        isOpen={mobileMenuOpen}
                        onClick={handleHamburgerClick}
                        ariaLabel="Main Menu"
                    />
                </div>

                {/* Context-Aware Content Area */}
                {isSearchPage ? (
                    /* Search Page Interface */
                    <div className="flex-1 max-w-500 mx-auto flex items-center justify-center">
                        <SearchInterface
                            searchPageType={searchPageType}
                            searchSubtype={searchSubtype}
                            onSearch={handleSearch}
                        />
                    </div>
                ) : (
                    /* Non-Search Page - Clean Spacer */
                    <div className="flex-1">
                        {/* Clean minimal header for non-search pages */}
                    </div>
                )}

                {/* Actions Section - Always show theme toggle */}
                <div className="flex items-center gap-3 shrink-0">
                    {/* Theme Toggle */}
                    <button
                        className="flex items-center gap-2 px-3 py-2 bg-surface border border-border rounded-md text-primary text-sm font-medium cursor-pointer transition-fast min-h-touch whitespace-nowrap hover:bg-surface-alt focus:outline-focus focus:outline-offset-2 active:bg-surface-alt"
                        onClick={handleThemeToggle}
                        type="button"
                        aria-label={`Switch to ${isDarkTheme ? 'light' : 'dark'} theme`}
                        title={`Current: ${getThemeDisplayText()}. Click to toggle theme.`}
                    >
                        <span
                            className="theme-toggle-icon material-symbols-outlined"
                            aria-hidden="true"
                        >
                            {getThemeIconName()}
                        </span>
                        <span className="theme-toggle-text max-sm:hidden">{getThemeDisplayText()}</span>
                    </button>
                </div>
            </div>
        </header>
    );
});

PageHeader.displayName = 'PageHeader';

export default PageHeader;
