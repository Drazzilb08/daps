import React, { useCallback } from 'react';
import { useTheme } from '../contexts/ThemeContext.jsx';

/**
 * PageHeader component for DAPS application
 * 
 * Displays the DAPS brand logo and provides theme toggle functionality.
 * Fixed position header that doesn't scroll with content.
 * 
 * Features:
 * - DAPS logo/brand on the left
 * - Theme toggle button on the right (temporary for testing)
 * - 60px fixed height as specified
 * - Uses design tokens for styling
 * - Mobile-first responsive design
 */
const PageHeader = React.memo(() => {
  const { toggleTheme, isDarkTheme, isLightTheme, isSystemTheme, actualTheme } = useTheme();

  /**
   * Handle theme toggle click
   */
  const handleThemeToggle = useCallback(() => {
    toggleTheme();
  }, [toggleTheme]);

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
        {/* Brand/Logo Section */}
        <div className="page-header-brand">
          <h1 className="page-header-title">
            <span className="page-header-logo">DAPS</span>
            <span className="page-header-subtitle">Media Automation</span>
          </h1>
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