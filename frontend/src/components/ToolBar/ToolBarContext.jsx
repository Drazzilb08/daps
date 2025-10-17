import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';

/**
 * ToolBarContext - Provides responsive state and overflow management
 *
 * Manages:
 * - Responsive breakpoint detection (mobile/tablet/desktop)
 * - Section overflow calculation
 * - Overflow state storage
 * - Mobile menu toggle state
 *
 * This context enables toolbar subcomponents to respond to viewport changes
 * and coordinate overflow behavior without prop drilling.
 */
const ToolBarContext = createContext(null);

/**
 * useToolBar - Hook to consume ToolBar context
 *
 * @throws {Error} If used outside ToolBar provider
 * @returns {Object} Context value with responsive state and methods
 */
export const useToolBar = () => {
    const context = useContext(ToolBarContext);
    if (!context) {
        throw new Error('ToolBar subcomponents must be used within a ToolBar parent');
    }
    return context;
};

/**
 * ToolBarProvider - Context provider implementation
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components
 * @param {number} props.mobileBreakpoint - Mobile breakpoint in pixels
 */
export const ToolBarProvider = ({ children, mobileBreakpoint }) => {
    // Responsive state
    const [viewportWidth, setViewportWidth] = useState(
        typeof window !== 'undefined' ? window.innerWidth : 1024
    );
    const [isMobile, setIsMobile] = useState(viewportWidth < mobileBreakpoint);
    const [isTablet, setIsTablet] = useState(
        viewportWidth >= mobileBreakpoint && viewportWidth < 1024
    );
    const [isDesktop, setIsDesktop] = useState(viewportWidth >= 1024);

    // Section overflow state storage
    const [sectionOverflowState, setSectionOverflowState] = useState(new Map());

    // Mobile menu state
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Constants for overflow calculation
    const MIN_BUTTON_WIDTH = 72; // Estimated minimum button width
    const MORE_BUTTON_WIDTH = 64; // Width reserved for "More" button
    const SEPARATOR_MARGIN = 4; // Separator margin
    const SEPARATOR_WIDTH = 2 * SEPARATOR_MARGIN + 1; // Total separator width

    /**
     * Calculate overflow for a specific section
     * @param {string} sectionId - Section identifier
     * @param {Array} children - Section children
     * @param {number} sectionWidth - Available section width
     * @param {boolean} collapseButtons - Enable overflow
     * @returns {Object} { visibleButtons, overflowItems, buttonCount }
     */
    const calculateSectionOverflow = useCallback(
        (sectionId, children, sectionWidth, collapseButtons) => {
            if (!collapseButtons) {
                const childArray = React.Children.toArray(children);
                const buttonCount = childArray.filter(
                    child =>
                        React.isValidElement(child) &&
                        !(child.type === 'div' && child.props.className?.includes('separator')) &&
                        Object.keys(child.props).length > 0
                ).length;

                return {
                    visibleButtons: childArray,
                    overflowItems: [],
                    buttonCount: buttonCount,
                };
            }

            // If not measured yet, show all children initially
            if (!sectionWidth || sectionWidth === 0) {
                const childArray = React.Children.toArray(children);
                const buttonCount = childArray.filter(
                    child =>
                        React.isValidElement(child) &&
                        !(child.type === 'div' && child.props.className?.includes('separator')) &&
                        Object.keys(child.props).length > 0
                ).length;

                return {
                    visibleButtons: childArray,
                    overflowItems: [],
                    buttonCount: buttonCount,
                };
            }

            let buttonCount = 0;
            let separatorCount = 0;
            const validChildren = [];

            React.Children.forEach(children, child => {
                if (!child) return;

                if (React.isValidElement(child)) {
                    const isSeparator =
                        child.type === 'div' && child.props.className?.includes('separator');
                    if (isSeparator || Object.keys(child.props).length === 0) {
                        separatorCount++;
                    } else {
                        buttonCount++;
                    }
                    validChildren.push(child);
                }
            });

            // Calculate total width needed
            const buttonsWidth = buttonCount * MIN_BUTTON_WIDTH;
            const separatorsWidth = separatorCount * SEPARATOR_WIDTH;
            const totalWidth = buttonsWidth + separatorsWidth;

            // If everything fits, return all children
            if (totalWidth <= sectionWidth) {
                return {
                    visibleButtons: validChildren,
                    overflowItems: [],
                    buttonCount: buttonCount,
                };
            }

            // Calculate max buttons that can fit
            const availableWidth = sectionWidth - separatorsWidth - MORE_BUTTON_WIDTH;
            const maxButtons = Math.max(Math.floor(availableWidth / MIN_BUTTON_WIDTH), 1);

            // Edge case: if only one button would overflow, show all
            if (buttonCount - 1 === maxButtons) {
                const buttonsWithoutSeparators = validChildren.filter(child => {
                    const isSeparator =
                        child.type === 'div' && child.props.className?.includes('separator');
                    return !isSeparator && Object.keys(child.props).length > 0;
                });

                return {
                    visibleButtons: buttonsWithoutSeparators,
                    overflowItems: [],
                    buttonCount: buttonCount,
                };
            }

            // Split buttons between visible and overflow
            const buttons = [];
            const overflowItems = [];
            let actualButtons = 0;

            validChildren.forEach(child => {
                const isSeparator =
                    child.type === 'div' && child.props.className?.includes('separator');
                const isEmpty = Object.keys(child.props).length === 0;

                if (actualButtons < maxButtons) {
                    if (!isSeparator && !isEmpty) {
                        buttons.push(child);
                        actualButtons++;
                    } else {
                        buttons.push(child);
                    }
                } else {
                    if (!isSeparator && !isEmpty) {
                        overflowItems.push(child.props);
                    }
                }
            });

            const result = {
                visibleButtons: buttons,
                overflowItems: overflowItems,
                buttonCount: buttonCount,
            };

            // Store result in state
            setSectionOverflowState(prev => {
                const updated = new Map(prev);
                updated.set(sectionId, result);
                return updated;
            });

            return result;
        },
        [MIN_BUTTON_WIDTH, MORE_BUTTON_WIDTH, SEPARATOR_WIDTH]
    );

    /**
     * Get overflow state for a section
     * @param {string} sectionId - Section identifier
     * @returns {Object|null} Overflow state or null
     */
    const getSectionOverflowState = useCallback(
        sectionId => {
            return sectionOverflowState.get(sectionId) || null;
        },
        [sectionOverflowState]
    );

    /**
     * Toggle mobile menu
     */
    const toggleMobileMenu = useCallback(() => {
        setMobileMenuOpen(prev => !prev);
    }, []);

    /**
     * Handle viewport resize
     */
    useEffect(() => {
        const handleResize = () => {
            const width = window.innerWidth;
            setViewportWidth(width);
            setIsMobile(width < mobileBreakpoint);
            setIsTablet(width >= mobileBreakpoint && width < 1024);
            setIsDesktop(width >= 1024);
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [mobileBreakpoint]);

    const contextValue = {
        // Responsive state
        isMobile,
        isTablet,
        isDesktop,
        viewportWidth,

        // Mobile menu state
        mobileMenuOpen,
        toggleMobileMenu,

        // Section overflow
        calculateSectionOverflow,
        getSectionOverflowState,

        // Constants for overflow calculation
        MIN_BUTTON_WIDTH,
        MORE_BUTTON_WIDTH,
        SEPARATOR_WIDTH,
    };

    return <ToolBarContext.Provider value={contextValue}>{children}</ToolBarContext.Provider>;
};

ToolBarProvider.propTypes = {
    children: PropTypes.node.isRequired,
    mobileBreakpoint: PropTypes.number.isRequired,
};

export default ToolBarContext;
