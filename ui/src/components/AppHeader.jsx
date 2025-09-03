import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getIcon } from '../utils/tools';
import SearchInterface from './SearchInterface';
import { useUIState } from '../contexts/UIStateContext';

/**
 * Application header component with clean mobile-first search interface
 * Implements collapsed/expanded states matching modern mobile UX patterns
 * All DOM manipulation replaced with React state management
 * @returns {JSX.Element} Header with logo, hamburger, and responsive search interface
 */
function Header() {
    const location = useLocation();
    const {
        isSidebarOpen,
        closeSidebar,
        toggleSidebar,
        activateMobileSearch,
        deactivateMobileSearch,
    } = useUIState();

    // Local state for search interface
    const [isMobileSearchExpanded, setIsMobileSearchExpanded] = useState(false);
    const [searchInputFocused, setSearchInputFocused] = useState(false);
    const [isSearchAnimating, setIsSearchAnimating] = useState(false);

    // Refs for direct element access without DOM queries
    const hamburgerRef = useRef(null);
    const searchContainerRef = useRef(null);

    // Check if current page is a search page
    const isSearchPage = useCallback(() => {
        const searchPages = ['/media/search', '/poster/search/assets', '/poster/search/gdrive'];
        return searchPages.some(page => location.pathname.startsWith(page));
    }, [location.pathname]);

    /**
     * Handle mobile search expansion with proper state management
     * Replaces direct DOM manipulation with React state updates
     */
    const handleMobileSearchExpand = useCallback(() => {
        // Close sidebar when expanding search for better UX
        closeSidebar();
        // Activate mobile search state
        activateMobileSearch();
        setIsMobileSearchExpanded(true);
    }, [closeSidebar, activateMobileSearch]);

    /**
     * Handle mobile search collapse with animation state tracking
     * Uses React state instead of direct DOM class manipulation
     */
    const handleMobileSearchCollapse = useCallback(() => {
        if (isSearchAnimating) return; // Prevent multiple simultaneous animations

        setIsSearchAnimating(true);

        // Wait for CSS animation to complete before updating state
        setTimeout(() => {
            deactivateMobileSearch();
            setIsMobileSearchExpanded(false);
            setSearchInputFocused(false);
            setIsSearchAnimating(false);
        }, 320); // Matched to CSS animation duration (0.3s) plus small buffer
    }, [isSearchAnimating, deactivateMobileSearch]);

    /**
     * Handle hamburger menu click with proper state management
     * Uses React state instead of direct DOM element manipulation
     */
    const handleHamburgerClick = useCallback(() => {
        toggleSidebar();
    }, [toggleSidebar]);

    /**
     * Handle clicks outside sidebar to close it
     * Uses event delegation instead of direct DOM queries
     */
    const handleClickOutside = useCallback(
        e => {
            // Only handle clicks when sidebar is open and on mobile
            if (!isSidebarOpen || window.innerWidth >= 769) {
                return;
            }

            // Check if click target is outside sidebar and hamburger using element selectors
            const clickedSidebar = e.target.closest('#sidebarNav');
            const clickedHamburger = e.target.closest('#sidebarToggle');

            if (!clickedSidebar && !clickedHamburger) {
                closeSidebar();
            }
        },
        [isSidebarOpen, closeSidebar]
    );

    /**
     * Handle keyboard navigation (Escape key)
     */
    const handleKeyDown = useCallback(
        e => {
            if (e.key === 'Escape' && isSidebarOpen) {
                closeSidebar();
            }
        },
        [isSidebarOpen, closeSidebar]
    );

    /**
     * Handle viewport resize to reset mobile search on desktop transition
     */
    const handleResize = useCallback(() => {
        // Reset mobile search state when transitioning to desktop
        if (window.innerWidth >= 769 && isMobileSearchExpanded) {
            deactivateMobileSearch();
            setIsMobileSearchExpanded(false);
            setSearchInputFocused(false);
        }
    }, [isMobileSearchExpanded, deactivateMobileSearch]);

    // Close mobile search when route changes
    useEffect(() => {
        setIsMobileSearchExpanded(false);
        setSearchInputFocused(false);
    }, [location.pathname]);

    // Set up window event listeners with proper cleanup
    useEffect(() => {
        window.addEventListener('resize', handleResize);
        window.addEventListener('keydown', handleKeyDown);
        document.addEventListener('click', handleClickOutside);

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('click', handleClickOutside);
        };
    }, [handleResize, handleKeyDown, handleClickOutside]);

    // Hamburger visual state is now handled through CSS based on sidebar state
    // No direct DOM manipulation needed - CSS can use body.sidebar-open class

    return (
        <header className={`header-bar${isMobileSearchExpanded ? ' mobile-search-expanded' : ''}`}>
            {/* Logo - Always visible */}
            <a href="/" className="nav-logo">
                <img src="/img/favicon-32x32.png" alt="DAPS logo" />
            </a>

            {/* Hamburger Menu - Always visible, maintains functionality throughout all states */}
            <button
                ref={hamburgerRef}
                className={`hamburger menu${isSidebarOpen ? ' opened' : ''}`}
                id="sidebarToggle"
                aria-label="Main Menu"
                aria-expanded={isSidebarOpen}
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

            {/* Single Search Interface - Responsive design handles mobile/desktop */}
            {isSearchPage() && (
                <div
                    ref={searchContainerRef}
                    className={`search-container ${isMobileSearchExpanded ? 'mobile-expanded' : ''}${isSearchAnimating ? ' back-button-closing' : ''}`}
                >
                    <SearchInterface
                        onMobileCollapse={handleMobileSearchCollapse}
                        searchInputFocused={searchInputFocused}
                        onSearchInputFocus={() => setSearchInputFocused(true)}
                        onSearchInputBlur={() => setSearchInputFocused(false)}
                    />
                </div>
            )}

            {/* Mobile Search Trigger - Only visible on mobile */}
            {isSearchPage() && (
                <button
                    className="header-search-trigger"
                    type="button"
                    aria-label="Search"
                    onClick={isMobileSearchExpanded ? undefined : handleMobileSearchExpand}
                    style={isMobileSearchExpanded ? { display: 'none' } : {}}
                >
                    {getIcon('mi:search')}
                </button>
            )}
        </header>
    );
}

export default React.memo(Header);
