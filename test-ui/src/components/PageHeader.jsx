import React, { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext.jsx';
import { useUIState } from '../contexts/UIStateContext.jsx';

/**
 * PageHeader component for DAPS application
 * 
 * Displays the DAPS brand logo with hamburger menu and theme toggle functionality.
 * Fixed position header that doesn't scroll with content.
 * 
 * Features:
 * - DAPS logo from favicon-32x32.png
 * - Hamburger menu button for mobile sidebar
 * - Theme toggle button on the right (temporary for testing)
 * - 60px fixed height as specified
 * - Uses design tokens for styling
 * - Mobile-first responsive design with touch-optimized buttons
 */
const PageHeader = React.memo(() => {
  const { toggleTheme, isDarkTheme, isLightTheme, isSystemTheme, actualTheme } = useTheme();
  const { mobileMenuOpen, toggleMobileMenu } = useUIState();

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
    <header className="page-header" role="banner">
      <div className="page-header-content">
        {/* Brand/Logo Section with Hamburger */}
        <div className="page-header-brand">
          {/* DAPS Logo and Title - Clickable Link to Home */}
          <Link to="/" className="page-header-logo-section">
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
            className={`hamburger menu${mobileMenuOpen ? ' opened' : ''}`}
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

        {/* Header Spacer for Future Search Interface */}
        <div className="page-header-spacer">
          {/* Reserved space for future search interface */}
        </div>

        {/* Actions Section */}
        <div className="page-header-actions">
          {/* Theme Toggle - Temporary for testing */}
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