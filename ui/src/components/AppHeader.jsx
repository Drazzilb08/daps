import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getIcon } from '../utils/tools';
import SearchInterface from './SearchInterface';

/**
 * Closes the mobile navigation sidebar and updates hamburger menu state
 */
function closeMobileSidebar() {
    const body = document.body;
    const hamburger = document.getElementById('sidebarToggle');
    if (body.classList.contains('sidebar-open')) {
        body.classList.remove('sidebar-open');
        hamburger?.classList.remove('opened');
        hamburger?.setAttribute('aria-expanded', 'false');
    }
}

/**
 * Application header component with clean mobile-first search interface
 * Implements collapsed/expanded states matching modern mobile UX patterns
 * @returns {JSX.Element} Header with logo, hamburger, and responsive search interface
 */
function Header() {
    const location = useLocation();
    const [isMobileSearchExpanded, setIsMobileSearchExpanded] = useState(false);
    const [searchInputFocused, setSearchInputFocused] = useState(false);

    // Check if current page is a search page
    const isSearchPage = () => {
        const searchPages = ['/media/search', '/poster/search/assets', '/poster/search/gdrive'];
        return searchPages.some(page => location.pathname.startsWith(page));
    };

    // Handle mobile search expand/collapse with clean state management
    const handleMobileSearchExpand = () => {
        // Auto-collapse sidebar when expanding search for better UX
        closeMobileSidebar();
        // Add CSS class to body to track mobile search state
        document.body.classList.add('mobile-search-active');
        setIsMobileSearchExpanded(true);
    };

    const handleMobileSearchCollapse = () => {
        const searchContainer = document.querySelector('.search-container.mobile-expanded');

        if (searchContainer) {
            searchContainer.classList.add('back-button-closing');

            // Wait for animation to complete before actually collapsing
            setTimeout(() => {
                document.body.classList.remove('mobile-search-active');
                setIsMobileSearchExpanded(false);
                setSearchInputFocused(false);
                searchContainer.classList.remove('back-button-closing');
            }, 320); // Matched to CSS animation duration (0.3s) plus small buffer
        } else {
            // Fallback if elements not found - immediate collapse
            document.body.classList.remove('mobile-search-active');
            setIsMobileSearchExpanded(false);
            setSearchInputFocused(false);
        }
    };

    // Close mobile search when route changes
    useEffect(() => {
        setIsMobileSearchExpanded(false);
    }, [location.pathname]);

    // Reset mobile search state on viewport resize (desktop → mobile → desktop transitions)
    useEffect(() => {
        function handleResize() {
            // If viewport is desktop size and mobile search is expanded, reset state
            if (window.innerWidth >= 769 && isMobileSearchExpanded) {
                document.body.classList.remove('mobile-search-active');
                setIsMobileSearchExpanded(false);
                setSearchInputFocused(false);
            }
        }

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [isMobileSearchExpanded]);

    // Hamburger menu click handler
    useEffect(() => {
        const hamburger = document.getElementById('sidebarToggle');
        if (!hamburger) return;

        function handleHamburgerClick() {
            const body = document.body;
            const isOpen = !body.classList.contains('sidebar-open');
            body.classList.toggle('sidebar-open', isOpen);
            hamburger.classList.toggle('opened', isOpen);
            hamburger.setAttribute('aria-expanded', String(isOpen));
        }

        hamburger.addEventListener('click', handleHamburgerClick);
        return () => hamburger.removeEventListener('click', handleHamburgerClick);
    }, []);

    // Sidebar close handlers (Escape key and click outside)
    useEffect(() => {
        function handleEsc(e) {
            if (e.key === 'Escape') {
                closeMobileSidebar();
            }
        }

        function handleClickOutside(e) {
            const body = document.body;
            const sidebar = document.getElementById('sidebarNav');
            const hamburger = document.getElementById('sidebarToggle');

            // Only handle clicks outside when mobile sidebar is open
            if (window.innerWidth >= 769 || !body.classList.contains('sidebar-open')) {
                return;
            }

            // Ignore clicks on sidebar itself or hamburger button
            if (sidebar?.contains(e.target) || hamburger?.contains(e.target)) {
                return;
            }

            closeMobileSidebar();
        }

        window.addEventListener('keydown', handleEsc);
        document.addEventListener('click', handleClickOutside);

        return () => {
            window.removeEventListener('keydown', handleEsc);
            document.removeEventListener('click', handleClickOutside);
        };
    }, []);

    return (
        <header className={`header-bar${isMobileSearchExpanded ? ' mobile-search-expanded' : ''}`}>
            {/* Logo - Always visible */}
            <a href="/" className="nav-logo">
                <img src="/img/favicon-32x32.png" alt="DAPS logo" />
            </a>

            {/* Hamburger Menu - Always visible, maintains functionality throughout all states */}
            <button
                className="hamburger menu"
                id="sidebarToggle"
                aria-label="Main Menu"
                aria-expanded="false"
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
                    className={`search-container ${isMobileSearchExpanded ? 'mobile-expanded' : ''}`}
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
