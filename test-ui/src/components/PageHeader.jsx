import React, { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext.jsx';
import { useUIState } from '../contexts/UIStateContext.jsx';
import useSearchPageDetection from '../hooks/useSearchPageDetection.js';
import SearchInterface from './Search/SearchInterface.jsx';

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
  const handleSearch = useCallback((searchTerm) => {
    // TODO: Implement search logic based on searchPageType and searchSubtype
    console.log('Search initiated:', { searchTerm, searchPageType, searchSubtype });
  }, [searchPageType, searchSubtype]);

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
      return 'light_mode'; // Sun for dark theme (will toggle to light)
    } else if (isLightTheme) {
      return 'dark_mode'; // Moon for light theme (will toggle to dark)
    } else {
      return 'settings_suggest'; // Settings for system theme
    }
  };

  return (
    <header className={`page-header ${isSearchPage ? 'search-page' : 'non-search-page'}`} role="banner">
      <div className="page-header-content">
        {/* Brand/Logo Section with Hamburger */}
        <div className="page-header-brand">
          {/* DAPS Logo and Title - Clickable Link to Home */}
          <Link to="/" className="page-header-logo-section touch-target">
            <img 
              src="/img/favicon-32x32.png" 
              alt="DAPS Logo" 
              className="page-header-logo-image"
              width="32"
              height="32"
            />
            <h1 className="page-header-title">
              <span className="page-header-logo-text">DAPS</span>
              <span className="page-header-subtitle">Media Automation</span>
            </h1>
          </Link>

          {/* Hamburger Menu Button */}
          <button
            className={`hamburger hamburger-menu${mobileMenuOpen ? ' opened' : ''}`}
            aria-label="Main Menu"
            aria-expanded={mobileMenuOpen}
            onClick={handleHamburgerClick}
          >
            <svg width="44" height="44" viewBox="0 0 100 100">
              <path
                className="line line1"
                d="M 20,29.000046 H 80.000231 C 80.000231,29.000046 94.498839,28.817352 94.532987,66.711331 94.543142,77.980673 90.966081,81.670246 85.259173,81.668997 79.552261,81.667751 75.000211,74.999942 75.000211,74.999942 L 25.000021,25.000058"
              />
              <path className="line line2" d="M 20,50 H 80" />
              <path
                className="line line3"
                d="M 20,70.999954 H 80.000231 C 80.000231,70.999954 94.498839,71.182648 94.532987,33.288669 94.543142,22.019327 90.966081,18.329754 85.259173,18.331003 79.552261,18.332249 75.000211,25.000058 75.000211,25.000058 L 25.000021,74.999942"
              />
            </svg>
          </button>
        </div>

        {/* Context-Aware Content Area */}
        {isSearchPage ? (
          /* Search Page Interface */
          <div className="page-header-search-area">
            <SearchInterface 
              searchPageType={searchPageType}
              searchSubtype={searchSubtype}
              onSearch={handleSearch}
            />
          </div>
        ) : (
          /* Non-Search Page - Clean Spacer */
          <div className="page-header-spacer">
            {/* Clean minimal header for non-search pages */}
          </div>
        )}

        {/* Actions Section - Always show theme toggle */}
        <div className="page-header-actions">
          {/* Theme Toggle */}
          <button
            className="theme-toggle-button"
            onClick={handleThemeToggle}
            type="button"
            aria-label={`Switch to ${isDarkTheme ? 'light' : 'dark'} theme`}
            title={`Current: ${getThemeDisplayText()}. Click to toggle theme.`}
          >
            <span className="theme-toggle-icon material-symbols-outlined" aria-hidden="true">
              {getThemeIconName()}
            </span>
            <span className="theme-toggle-text">
              {getThemeDisplayText()}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
});

PageHeader.displayName = 'PageHeader';

export default PageHeader;