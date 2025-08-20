import React, { useMemo, useState } from 'react';

/**
 * Jump bar component for quick navigation through search results
 * Dynamically generates navigation based on actual content
 */
export default function JumpBar({
    results = [],
    onJumpToLetter,
    className = '',
    getDisplayTitle,
    disabled = false,
    sortDirection = 'asc', // 'asc' or 'desc' for A-Z or Z-A
}) {
    const [activeLetter, setActiveLetter] = useState(null);

    // Calculate available letters and create dynamic alphabet based on content
    const { availableLetters, dynamicAlphabet } = useMemo(() => {
        if (!results.length) return { availableLetters: new Set(), dynamicAlphabet: [] };

        const available = new Set();

        results.forEach(item => {
            const title = getDisplayTitle
                ? getDisplayTitle(item)
                : item.title ||
                  item.original?.title ||
                  item.name ||
                  item.original?.name ||
                  'Unknown';

            const firstChar = title.trim().charAt(0).toUpperCase();

            // Handle numbers and special characters as '#'
            if (/[0-9]/.test(firstChar)) {
                available.add('#');
            } else if (/[A-Z]/.test(firstChar)) {
                available.add(firstChar);
            } else {
                // Handle other special characters and international characters
                if (firstChar && firstChar.match(/[\u00C0-\u017F\u0180-\u024F]/)) {
                    // International characters (accented, etc.)
                    available.add(firstChar);
                } else {
                    // Other special characters go to '#'
                    available.add('#');
                }
            }
        });

        // Create dynamic alphabet with proper sorting based on direction:
        // ASC: # at top, A-Z letters, special chars at bottom
        // DESC: special chars at top, Z-A letters, # at bottom
        const alphabet = Array.from(available).sort((a, b) => {
            const isAscending = sortDirection === 'asc';

            // Regular A-Z letters
            const aIsRegular = /^[A-Z]$/.test(a);
            const bIsRegular = /^[A-Z]$/.test(b);
            const aIsNumeric = a === '#';
            const bIsNumeric = b === '#';

            if (isAscending) {
                // ASC: # first, then A-Z, then special chars
                if (aIsNumeric) return -1;
                if (bIsNumeric) return 1;

                if (aIsRegular && bIsRegular) {
                    return a.localeCompare(b);
                }

                if (aIsRegular && !bIsRegular) return -1;
                if (!aIsRegular && bIsRegular) return 1;

                return a.localeCompare(b);
            } else {
                // DESC: special chars first, then Z-A, then #
                if (aIsNumeric) return 1;
                if (bIsNumeric) return -1;

                if (aIsRegular && bIsRegular) {
                    return b.localeCompare(a); // Reverse for Z-A
                }

                if (aIsRegular && !bIsRegular) return 1;
                if (!aIsRegular && bIsRegular) return -1;

                return b.localeCompare(a);
            }
        });

        return { availableLetters: available, dynamicAlphabet: alphabet };
    }, [results, getDisplayTitle, sortDirection]);

    // Handle letter click
    const handleLetterClick = letter => {
        if (disabled || !availableLetters.has(letter)) return;

        setActiveLetter(letter);
        onJumpToLetter(letter);

        // Clear active state after animation
        setTimeout(() => setActiveLetter(null), 200);
    };

    // Handle keyboard navigation
    const handleKeyDown = (e, letter) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleLetterClick(letter);
        }
    };

    const jumpBarClasses = ['alphabetical-jump-bar', className, disabled && 'disabled']
        .filter(Boolean)
        .join(' ');

    return (
        <nav className={jumpBarClasses} role="navigation" aria-label="Content navigation">
            <div className="jump-bar-letters">
                {dynamicAlphabet.map(letter => {
                    const isActive = activeLetter === letter;

                    const letterClasses = [
                        'jump-bar-letter',
                        isActive && 'active',
                        disabled && 'disabled',
                    ]
                        .filter(Boolean)
                        .join(' ');

                    return (
                        <button
                            key={letter}
                            className={letterClasses}
                            onClick={() => handleLetterClick(letter)}
                            onKeyDown={e => handleKeyDown(e, letter)}
                            disabled={disabled}
                            aria-label={`Jump to ${letter === '#' ? 'numbers and symbols' : `letter ${letter}`}`}
                            tabIndex={disabled ? -1 : 0}
                            title={`Jump to ${letter}`}
                        >
                            {letter}
                        </button>
                    );
                })}
            </div>
        </nav>
    );
}
