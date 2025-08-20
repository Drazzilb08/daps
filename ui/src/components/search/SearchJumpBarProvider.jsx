// ui/src/components/search/SearchJumpBarProvider.jsx
// Context provider for page-level jump bar communication

import React, { createContext, useContext, useState, useCallback } from 'react';

const SearchJumpBarContext = createContext(null);

export const useSearchJumpBar = () => {
    const context = useContext(SearchJumpBarContext);
    if (!context) {
        throw new Error('useSearchJumpBar must be used within a SearchJumpBarProvider');
    }
    return context;
};

export default function SearchJumpBarProvider({ children }) {
    const [jumpBarData, setJumpBarData] = useState({
        results: [],
        currentSort: 'alpha',
        getDisplayTitle: null,
        showJumpBar: false,
        scrollToLetter: null,
    });

    // Called by SearchCore to provide data to jump bar
    const updateJumpBarData = useCallback(data => {
        setJumpBarData(prev => ({ ...prev, ...data }));
    }, []);

    // Called by page-level JumpBar to scroll to a letter
    const jumpToLetter = useCallback(
        letter => {
            if (jumpBarData.scrollToLetter) {
                jumpBarData.scrollToLetter(letter);
            }
        },
        [jumpBarData]
    );

    const contextValue = {
        ...jumpBarData,
        updateJumpBarData,
        jumpToLetter,
    };

    return (
        <SearchJumpBarContext.Provider value={contextValue}>
            {children}
        </SearchJumpBarContext.Provider>
    );
}
