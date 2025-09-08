import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';

/**
 * UI State context for managing global UI state
 * Handles sidebar, mobile menu, loading states, and modal states
 */

// Modal types
export const MODAL_TYPES = {
  CONFIRMATION: 'confirmation',
  ALERT: 'alert',
  FORM: 'form',
  MEDIA_PREVIEW: 'media_preview',
  SETTINGS: 'settings',
  HELP: 'help',
  CUSTOM: 'custom'
};

// Loading states
export const LOADING_STATES = {
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error'
};

// Breakpoint constants
const BREAKPOINTS = {
  MOBILE: 768,
  TABLET: 1024
};

// Create context
const UIStateContext = createContext();

/**
 * Custom hook to use UI state context
 * @returns {Object} UI state context value with methods and state
 */
export const useUIState = () => {
  const context = useContext(UIStateContext);
  if (!context) {
    throw new Error('useUIState must be used within a UIStateProvider');
  }
  return context;
};

/**
 * Get current viewport size
 * @returns {Object} Viewport dimensions and breakpoint info
 */
const getViewportInfo = () => {
  if (typeof window === 'undefined') {
    return {
      width: 1024,
      height: 768,
      isMobile: false,
      isTablet: false,
      isDesktop: true
    };
  }

  const width = window.innerWidth;
  const height = window.innerHeight;

  return {
    width,
    height,
    isMobile: width < BREAKPOINTS.MOBILE,
    isTablet: width >= BREAKPOINTS.MOBILE && width < BREAKPOINTS.TABLET,
    isDesktop: width >= BREAKPOINTS.TABLET
  };
};

/**
 * UI State Provider component
 * Manages global UI state including sidebars, modals, loading states
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @param {boolean} props.defaultSidebarCollapsed - Default sidebar state
 * @param {boolean} props.persistUIState - Whether to persist UI state to localStorage
 */
export const UIStateProvider = ({ 
  children, 
  defaultSidebarCollapsed = false,
  persistUIState = true
}) => {
  const [viewport, setViewport] = useState(() => getViewportInfo());
  const [sidebarCollapsed, setSidebarCollapsed] = useState(defaultSidebarCollapsed);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loadingStates, setLoadingStates] = useState({});
  const [modals, setModals] = useState([]);

  /**
   * Initialize UI state from localStorage
   */
  useEffect(() => {
    if (!persistUIState || typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem('daps-ui-state');
      if (stored) {
        const parsedState = JSON.parse(stored);
        if (typeof parsedState.sidebarCollapsed === 'boolean') {
          setSidebarCollapsed(parsedState.sidebarCollapsed);
        }
      }
    } catch (error) {
      console.warn('Failed to load UI state from localStorage:', error);
    }
  }, [persistUIState]);

  /**
   * Persist UI state to localStorage
   */
  const persistState = useCallback((state) => {
    if (!persistUIState || typeof window === 'undefined') return;

    try {
      const currentStored = localStorage.getItem('daps-ui-state');
      const currentState = currentStored ? JSON.parse(currentStored) : {};
      const newState = { ...currentState, ...state };
      localStorage.setItem('daps-ui-state', JSON.stringify(newState));
    } catch (error) {
      console.warn('Failed to persist UI state to localStorage:', error);
    }
  }, [persistUIState]);

  /**
   * Handle viewport changes
   */
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      const newViewport = getViewportInfo();
      setViewport(newViewport);

      // Auto-close mobile menu on desktop
      if (newViewport.isDesktop && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [mobileMenuOpen]);

  /**
   * Toggle sidebar collapsed state
   */
  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed(prev => {
      const newState = !prev;
      persistState({ sidebarCollapsed: newState });
      return newState;
    });
  }, [persistState]);

  /**
   * Set sidebar collapsed state
   * @param {boolean} collapsed - Whether sidebar should be collapsed
   */
  const setSidebarCollapsedState = useCallback((collapsed) => {
    setSidebarCollapsed(collapsed);
    persistState({ sidebarCollapsed: collapsed });
  }, [persistState]);

  /**
   * Toggle mobile menu
   */
  const toggleMobileMenu = useCallback(() => {
    setMobileMenuOpen(prev => !prev);
  }, []);

  /**
   * Close mobile menu
   */
  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false);
  }, []);

  /**
   * Set loading state for a specific component or operation
   * @param {string} key - Loading state key
   * @param {string} state - Loading state
   * @param {Object} data - Additional data for the loading state
   */
  const setLoadingState = useCallback((key, state, data = {}) => {
    setLoadingStates(prev => ({
      ...prev,
      [key]: {
        state,
        timestamp: Date.now(),
        ...data
      }
    }));
  }, []);

  /**
   * Clear loading state for a specific key
   * @param {string} key - Loading state key to clear
   */
  const clearLoadingState = useCallback((key) => {
    setLoadingStates(prev => {
      const newState = { ...prev };
      delete newState[key];
      return newState;
    });
  }, []);

  /**
   * Check if a specific loading state is active
   * @param {string} key - Loading state key
   * @param {string} state - State to check for (optional)
   * @returns {boolean} Whether the loading state matches
   */
  const isLoading = useCallback((key, state = LOADING_STATES.LOADING) => {
    return loadingStates[key]?.state === state;
  }, [loadingStates]);

  /**
   * Get loading state for a specific key
   * @param {string} key - Loading state key
   * @returns {Object|null} Loading state object or null
   */
  const getLoadingState = useCallback((key) => {
    return loadingStates[key] || null;
  }, [loadingStates]);

  /**
   * Show modal
   * @param {Object} modalConfig - Modal configuration
   * @returns {string} Modal ID
   */
  const showModal = useCallback((modalConfig) => {
    const modal = {
      id: `modal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: modalConfig.type || MODAL_TYPES.CUSTOM,
      title: modalConfig.title || '',
      content: modalConfig.content,
      component: modalConfig.component,
      props: modalConfig.props || {},
      closable: modalConfig.closable !== false,
      backdrop: modalConfig.backdrop !== false,
      size: modalConfig.size || 'medium',
      onClose: modalConfig.onClose,
      onConfirm: modalConfig.onConfirm,
      onCancel: modalConfig.onCancel,
      timestamp: Date.now()
    };

    setModals(prev => [...prev, modal]);
    return modal.id;
  }, []);

  /**
   * Close modal by ID
   * @param {string} modalId - Modal ID to close
   */
  const closeModal = useCallback((modalId) => {
    setModals(prev => {
      const modal = prev.find(m => m.id === modalId);
      if (modal && modal.onClose) {
        try {
          modal.onClose();
        } catch (error) {
          console.warn('Error in modal onClose callback:', error);
        }
      }
      return prev.filter(m => m.id !== modalId);
    });
  }, []);

  /**
   * Close all modals
   */
  const closeAllModals = useCallback(() => {
    modals.forEach(modal => {
      if (modal.onClose) {
        try {
          modal.onClose();
        } catch (error) {
          console.warn('Error in modal onClose callback:', error);
        }
      }
    });
    setModals([]);
  }, [modals]);

  /**
   * Get current modal (top-most)
   */
  const currentModal = modals.length > 0 ? modals[modals.length - 1] : null;

  /**
   * Check if any modals are open
   */
  const hasOpenModals = modals.length > 0;

  /**
   * Convenience methods for common modals
   */
  const showConfirmation = useCallback((title, message, onConfirm, onCancel) => {
    return showModal({
      type: MODAL_TYPES.CONFIRMATION,
      title,
      content: message,
      onConfirm,
      onCancel
    });
  }, [showModal]);

  const showAlert = useCallback((title, message, onClose) => {
    return showModal({
      type: MODAL_TYPES.ALERT,
      title,
      content: message,
      onClose
    });
  }, [showModal]);

  /**
   * Handle escape key to close modals or mobile menu
   */
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        if (hasOpenModals) {
          const topModal = modals[modals.length - 1];
          if (topModal.closable) {
            closeModal(topModal.id);
          }
        } else if (mobileMenuOpen) {
          closeMobileMenu();
        }
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [hasOpenModals, modals, mobileMenuOpen, closeModal, closeMobileMenu]);

  const contextValue = {
    // Viewport info
    viewport,
    
    // Sidebar state
    sidebarCollapsed,
    toggleSidebar,
    setSidebarCollapsed: setSidebarCollapsedState,
    
    // Mobile menu state
    mobileMenuOpen,
    toggleMobileMenu,
    closeMobileMenu,
    
    // Loading states
    loadingStates,
    setLoadingState,
    clearLoadingState,
    isLoading,
    getLoadingState,
    
    // Modal state
    modals,
    currentModal,
    hasOpenModals,
    showModal,
    closeModal,
    closeAllModals,
    showConfirmation,
    showAlert,
    
    // Convenience boolean flags
    isMobile: viewport.isMobile,
    isTablet: viewport.isTablet,
    isDesktop: viewport.isDesktop,
    
    // Constants
    modalTypes: MODAL_TYPES,
    loadingStateConstants: LOADING_STATES
  };

  return (
    <UIStateContext.Provider value={contextValue}>
      {children}
    </UIStateContext.Provider>
  );
};

UIStateProvider.propTypes = {
  children: PropTypes.node.isRequired,
  defaultSidebarCollapsed: PropTypes.bool,
  persistUIState: PropTypes.bool
};

/**
 * Hook for managing loading states with automatic cleanup
 * @param {string} key - Loading state key
 * @returns {Object} Loading state management object
 */
export const useLoadingState = (key) => {
  const { setLoadingState, clearLoadingState, getLoadingState, isLoading } = useUIState();

  const startLoading = useCallback((data = {}) => {
    setLoadingState(key, LOADING_STATES.LOADING, data);
  }, [key, setLoadingState]);

  const setSuccess = useCallback((data = {}) => {
    setLoadingState(key, LOADING_STATES.SUCCESS, data);
  }, [key, setLoadingState]);

  const setError = useCallback((error, data = {}) => {
    setLoadingState(key, LOADING_STATES.ERROR, { error, ...data });
  }, [key, setLoadingState]);

  const clear = useCallback(() => {
    clearLoadingState(key);
  }, [key, clearLoadingState]);

  return {
    startLoading,
    setSuccess,
    setError,
    clear,
    isLoading: isLoading(key),
    isSuccess: isLoading(key, LOADING_STATES.SUCCESS),
    isError: isLoading(key, LOADING_STATES.ERROR),
    state: getLoadingState(key)
  };
};