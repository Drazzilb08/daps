import React, { useEffect } from 'react';

export default React.memo(function Header() {
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
        function handleEsc(e) {
            if (e.key === 'Escape') {
                document.body.classList.remove('sidebar-open');
                const hamburger = document.getElementById('sidebarToggle');
                hamburger?.classList.remove('opened');
                hamburger?.setAttribute('aria-expanded', 'false');
            }
        }
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, []);

    // Hamburger visible only on mobile (style below)
    return (
        <div className="header-bar">
            <a href="/" className="nav-logo">
                <img src="/img/favicon-32x32.png" alt="DAPS logo" />
            </a>
            <button
                className="hamburger menu"
                id="sidebarToggle"
                aria-label="Main Menu"
                aria-expanded="false"
            >
                <svg width="34" height="34" viewBox="0 0 100 100">
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
});
