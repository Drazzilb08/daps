import React, { useEffect } from 'react';
import HeaderSearch from './HeaderSearch';

// Helper function to close mobile sidebar
function closeMobileSidebar() {
    const body = document.body;
    const hamburger = document.getElementById('sidebarToggle');
    if (body.classList.contains('sidebar-open')) {
        body.classList.remove('sidebar-open');
        hamburger?.classList.remove('opened');
        hamburger?.setAttribute('aria-expanded', 'false');
    }
}

function Header() {
    useEffect(() => {
        // Hamburger logic for small screens only
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

    useEffect(() => {
        // Close sidebar on Escape key
        function handleEsc(e) {
            if (e.key === 'Escape') {
                closeMobileSidebar();
            }
        }

        // Close sidebar when clicking outside on mobile
        function handleClickOutside(e) {
            const body = document.body;
            const sidebar = document.getElementById('sidebarNav');
            const hamburger = document.getElementById('sidebarToggle');

            // Only handle on mobile when sidebar is open
            if (window.innerWidth >= 1024 || !body.classList.contains('sidebar-open')) {
                return;
            }

            // Don't close if clicking on sidebar or hamburger
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

    // Hamburger visible only on mobile (style below)
    return (
        <div className="header-bar">
            <a href="/" className="nav-logo">
                <img src="/img/favicon-32x32.png" alt="DAPS logo" />
            </a>

            {/* Header Search - only shows on search pages */}
            <HeaderSearch />

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
        </div>
    );
}

export default React.memo(Header);
