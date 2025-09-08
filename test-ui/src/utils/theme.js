/**
 * DAPS Theme Management Utility
 * 
 * Comprehensive theme management system with localStorage persistence,
 * system preference detection, and smooth theme transitions.
 * 
 * Features:
 * - Theme persistence across browser sessions
 * - System theme preference detection
 * - Smooth theme transitions
 * - Theme change event listeners
 * - Accessible theme switching
 * 
 * Usage:
 * ```javascript
 * import { themeManager } from './utils/theme.js';
 * 
 * // Initialize theme system
 * themeManager.init();
 * 
 * // Toggle between themes
 * themeManager.toggleTheme();
 * 
 * // Set specific theme
 * themeManager.setTheme('dark');
 * 
 * // Listen for theme changes
 * themeManager.onChange((theme) => {
 *   console.log('Theme changed to:', theme);
 * });
 * ```
 */

/**
 * Theme configuration constants
 */
const THEMES = {
  DARK: 'dark',
  LIGHT: 'light',
  SYSTEM: 'system'
};

const STORAGE_KEY = 'daps-theme';
const THEME_ATTRIBUTE = 'data-theme';
const THEME_CHANGE_EVENT = 'themechange';

/**
 * Theme Management Class
 * 
 * Handles all theme-related functionality including persistence,
 * system detection, and theme switching operations.
 */
class ThemeManager {
  constructor() {
    this.currentTheme = null;
    this.systemTheme = null;
    this.listeners = new Set();
    this.mediaQuery = null;
    this.initialized = false;
    
    // Bind methods to preserve context
    this.handleSystemThemeChange = this.handleSystemThemeChange.bind(this);
    this.handleStorageChange = this.handleStorageChange.bind(this);
  }

  /**
   * Initialize the theme management system
   * 
   * Sets up system theme detection, loads saved preferences,
   * and applies the initial theme.
   */
  init() {
    if (this.initialized) {
      console.warn('ThemeManager already initialized');
      return;
    }

    try {
      // Set up system theme detection
      this.setupSystemThemeDetection();
      
      // Load and apply saved theme or system preference
      this.loadTheme();
      
      // Set up storage change listener for cross-tab synchronization
      this.setupStorageListener();
      
      // Mark as initialized
      this.initialized = true;
      
      console.log('ThemeManager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize ThemeManager:', error);
    }
  }

  /**
   * Set up system theme preference detection
   * 
   * Creates a media query listener to detect system theme changes
   * and respond to them when the theme is set to 'system'.
   */
  setupSystemThemeDetection() {
    // Create media query for dark theme preference
    this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    // Get initial system theme
    this.systemTheme = this.mediaQuery.matches ? THEMES.DARK : THEMES.LIGHT;
    
    // Listen for system theme changes
    this.mediaQuery.addEventListener('change', this.handleSystemThemeChange);
  }

  /**
   * Handle system theme changes
   * 
   * @param {MediaQueryListEvent} event - Media query change event
   */
  handleSystemThemeChange(event) {
    this.systemTheme = event.matches ? THEMES.DARK : THEMES.LIGHT;
    
    // If current theme is 'system', update the applied theme
    if (this.currentTheme === THEMES.SYSTEM) {
      this.applyTheme(this.systemTheme);
      this.notifyListeners(THEMES.SYSTEM, this.systemTheme);
    }
  }

  /**
   * Set up storage change listener for cross-tab synchronization
   * 
   * Listens for theme changes in other tabs and synchronizes
   * the theme across all open tabs.
   */
  setupStorageListener() {
    window.addEventListener('storage', this.handleStorageChange);
  }

  /**
   * Handle storage changes from other tabs
   * 
   * @param {StorageEvent} event - Storage change event
   */
  handleStorageChange(event) {
    if (event.key === STORAGE_KEY) {
      const newTheme = event.newValue || THEMES.SYSTEM;
      if (newTheme !== this.currentTheme) {
        this.setTheme(newTheme, { skipStorage: true });
      }
    }
  }

  /**
   * Load theme from localStorage or use system preference
   * 
   * Attempts to load saved theme preference from localStorage.
   * If no preference is saved, defaults to system preference.
   */
  loadTheme() {
    try {
      const savedTheme = localStorage.getItem(STORAGE_KEY);
      const theme = this.isValidTheme(savedTheme) ? savedTheme : THEMES.SYSTEM;
      this.setTheme(theme, { skipStorage: true });
    } catch (error) {
      console.warn('Failed to load theme from localStorage:', error);
      this.setTheme(THEMES.SYSTEM, { skipStorage: true });
    }
  }

  /**
   * Set the current theme
   * 
   * @param {string} theme - Theme to set ('dark', 'light', or 'system')
   * @param {Object} options - Configuration options
   * @param {boolean} options.skipStorage - Skip saving to localStorage
   * @param {boolean} options.skipTransition - Skip transition animation
   */
  setTheme(theme, options = {}) {
    const { skipStorage = false, skipTransition = false } = options;
    
    if (!this.isValidTheme(theme)) {
      console.warn(`Invalid theme: ${theme}. Using system theme.`);
      theme = THEMES.SYSTEM;
    }

    // Store previous theme for transition
    const previousTheme = this.currentTheme;
    this.currentTheme = theme;

    // Determine actual theme to apply
    const appliedTheme = theme === THEMES.SYSTEM ? this.systemTheme : theme;
    
    // Apply theme with optional transition
    if (!skipTransition) {
      this.applyThemeWithTransition(appliedTheme);
    } else {
      this.applyTheme(appliedTheme);
    }

    // Save to localStorage unless specifically skipped
    if (!skipStorage) {
      this.saveTheme(theme);
    }

    // Notify listeners
    this.notifyListeners(theme, appliedTheme, previousTheme);
  }

  /**
   * Apply theme to the document
   * 
   * @param {string} theme - Theme to apply ('dark' or 'light')
   */
  applyTheme(theme) {
    document.documentElement.setAttribute(THEME_ATTRIBUTE, theme);
    
    // Update meta theme-color for mobile browsers
    this.updateMetaThemeColor(theme);
  }

  /**
   * Apply theme with smooth transition animation
   * 
   * @param {string} theme - Theme to apply ('dark' or 'light')
   */
  applyThemeWithTransition(theme) {
    // Add transition class for smooth animation
    document.documentElement.classList.add('theme-transitioning');
    
    // Apply theme
    this.applyTheme(theme);
    
    // Remove transition class after animation completes
    setTimeout(() => {
      document.documentElement.classList.remove('theme-transitioning');
    }, 200);
  }

  /**
   * Update meta theme-color for mobile browsers
   * 
   * @param {string} theme - Current theme ('dark' or 'light')
   */
  updateMetaThemeColor(theme) {
    try {
      let metaThemeColor = document.querySelector('meta[name="theme-color"]');
      
      if (!metaThemeColor) {
        metaThemeColor = document.createElement('meta');
        metaThemeColor.name = 'theme-color';
        document.head.appendChild(metaThemeColor);
      }
      
      // Set theme color based on current theme
      const colors = {
        dark: '#0f172a', // Slate 900 from dark theme
        light: '#ffffff' // White from light theme
      };
      
      metaThemeColor.content = colors[theme] || colors.dark;
    } catch (error) {
      console.warn('Failed to update meta theme-color:', error);
    }
  }

  /**
   * Save theme preference to localStorage
   * 
   * @param {string} theme - Theme to save
   */
  saveTheme(theme) {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (error) {
      console.warn('Failed to save theme to localStorage:', error);
    }
  }

  /**
   * Toggle between dark and light themes
   * 
   * If current theme is 'system', toggles to the opposite of the current system theme.
   * Otherwise, toggles between 'dark' and 'light'.
   */
  toggleTheme() {
    const currentAppliedTheme = this.getAppliedTheme();
    const newTheme = currentAppliedTheme === THEMES.DARK ? THEMES.LIGHT : THEMES.DARK;
    this.setTheme(newTheme);
  }

  /**
   * Get the current theme setting
   * 
   * @returns {string} Current theme ('dark', 'light', or 'system')
   */
  getCurrentTheme() {
    return this.currentTheme;
  }

  /**
   * Get the currently applied theme
   * 
   * @returns {string} Applied theme ('dark' or 'light')
   */
  getAppliedTheme() {
    return this.currentTheme === THEMES.SYSTEM ? this.systemTheme : this.currentTheme;
  }

  /**
   * Get the current system theme preference
   * 
   * @returns {string} System theme ('dark' or 'light')
   */
  getSystemTheme() {
    return this.systemTheme;
  }

  /**
   * Check if a theme value is valid
   * 
   * @param {string} theme - Theme to validate
   * @returns {boolean} True if theme is valid
   */
  isValidTheme(theme) {
    return Object.values(THEMES).includes(theme);
  }

  /**
   * Add a theme change listener
   * 
   * @param {Function} callback - Callback function to call on theme change
   * @returns {Function} Unsubscribe function
   */
  onChange(callback) {
    if (typeof callback !== 'function') {
      throw new Error('Theme change callback must be a function');
    }
    
    this.listeners.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Notify all listeners of theme change
   * 
   * @param {string} theme - New theme setting
   * @param {string} appliedTheme - Actually applied theme
   * @param {string} previousTheme - Previous theme setting
   */
  notifyListeners(theme, appliedTheme, previousTheme = null) {
    const eventData = {
      theme,
      appliedTheme,
      previousTheme,
      isSystemTheme: theme === THEMES.SYSTEM
    };

    // Call registered listeners
    this.listeners.forEach(callback => {
      try {
        callback(eventData);
      } catch (error) {
        console.error('Theme change listener error:', error);
      }
    });

    // Dispatch custom event
    try {
      window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, {
        detail: eventData
      }));
    } catch (error) {
      console.warn('Failed to dispatch theme change event:', error);
    }
  }

  /**
   * Clean up theme manager
   * 
   * Removes event listeners and cleans up resources.
   * Useful for testing or when reinitializing.
   */
  destroy() {
    // Remove system theme listener
    if (this.mediaQuery) {
      this.mediaQuery.removeEventListener('change', this.handleSystemThemeChange);
    }
    
    // Remove storage listener
    window.removeEventListener('storage', this.handleStorageChange);
    
    // Clear listeners
    this.listeners.clear();
    
    // Reset state
    this.initialized = false;
    this.currentTheme = null;
    
    console.log('ThemeManager destroyed');
  }
}

// Create and export singleton instance
export const themeManager = new ThemeManager();

// Export constants for external use
export { THEMES };

/**
 * React hook for theme management
 * 
 * Provides theme state and controls in React components.
 * Note: This hook requires React to be imported in the consuming component.
 * 
 * @returns {Object} Theme state and controls
 */
export function useTheme() {
  // Import React dynamically to avoid bundle issues
  let React;
  try {
    React = require('react');
  } catch {
    // If React isn't available, return basic functionality
    return {
      currentTheme: themeManager.getCurrentTheme(),
      appliedTheme: themeManager.getAppliedTheme(),
      isSystemTheme: themeManager.getCurrentTheme() === THEMES.SYSTEM,
      setTheme: themeManager.setTheme.bind(themeManager),
      toggleTheme: themeManager.toggleTheme.bind(themeManager),
      themes: THEMES
    };
  }
  
  const [currentTheme, setCurrentTheme] = React.useState(themeManager.getCurrentTheme());
  const [appliedTheme, setAppliedTheme] = React.useState(themeManager.getAppliedTheme());
  const [isSystemTheme, setIsSystemTheme] = React.useState(
    themeManager.getCurrentTheme() === THEMES.SYSTEM
  );

  React.useEffect(() => {
    // Initialize theme manager if not already done
    if (!themeManager.initialized) {
      themeManager.init();
    }

    // Subscribe to theme changes
    const unsubscribe = themeManager.onChange((eventData) => {
      setCurrentTheme(eventData.theme);
      setAppliedTheme(eventData.appliedTheme);
      setIsSystemTheme(eventData.isSystemTheme);
    });

    // Cleanup subscription
    return unsubscribe;
  }, []);

  return {
    currentTheme,
    appliedTheme,
    isSystemTheme,
    setTheme: themeManager.setTheme.bind(themeManager),
    toggleTheme: themeManager.toggleTheme.bind(themeManager),
    themes: THEMES
  };
}

// Add CSS for theme transitions
const themeTransitionStyles = `
  .theme-transitioning *,
  .theme-transitioning *::before,
  .theme-transitioning *::after {
    transition: 
      background-color 200ms ease-in-out,
      border-color 200ms ease-in-out,
      color 200ms ease-in-out,
      fill 200ms ease-in-out,
      stroke 200ms ease-in-out,
      box-shadow 200ms ease-in-out !important;
  }
`;

// Inject transition styles
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = themeTransitionStyles;
  document.head.appendChild(styleElement);
}

// Auto-initialize if in browser environment
if (typeof window !== 'undefined' && document.readyState !== 'loading') {
  themeManager.init();
} else if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    themeManager.init();
  });
}