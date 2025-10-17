import React, { useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { ToolBarProvider } from './ToolBarContext';
import ToolBarSection from './Section';
import ToolBarButton from './Button';
import ToolBarSeparator from './Separator';
import ToolBarOverflow from './Overflow';

/**
 * ToolBar - Compound component parent with responsive overflow handling
 *
 * Features:
 * - Automatic responsive breakpoint detection
 * - Overflow button management via context
 * - Mobile menu generation
 * - Context-based state management
 * - Keyboard navigation (Arrow keys, Home/End, Escape)
 *
 * This component wraps children in ToolBarProvider to enable compound pattern.
 * Subcomponents (Section, Button, Separator) access responsive state via context.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Subcomponents (Section, Button, Separator)
 * @param {boolean} [props.enableOverflow=true] - Enable automatic overflow handling
 * @param {number} [props.mobileBreakpoint=768] - Mobile breakpoint in pixels
 * @param {string} [props.className] - Additional CSS classes
 *
 * @example
 * <ToolBar>
 *   <ToolBar.Section align="left">
 *     <ToolBar.Button label="Refresh" icon="refresh" onClick={refresh} />
 *   </ToolBar.Section>
 *   <ToolBar.Separator />
 *   <ToolBar.Section align="right">
 *     <ToolBar.Button label="Help" icon="help" onClick={help} />
 *   </ToolBar.Section>
 * </ToolBar>
 */
const ToolBar = ({
    children,
    enableOverflow = true,
    mobileBreakpoint = 768,
    className = 'flex justify-between flex-none px-2 md:px-4 h-header bg-surface text-primary border-b border-border',
}) => {
    const toolbarRef = useRef(null);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = event => {
            if (!toolbarRef.current) return;

            const buttons = Array.from(
                toolbarRef.current.querySelectorAll('button:not([disabled])')
            );
            if (buttons.length === 0) return;

            const currentIndex = buttons.indexOf(document.activeElement);

            switch (event.key) {
                case 'ArrowLeft':
                    event.preventDefault();
                    if (currentIndex > 0) {
                        buttons[currentIndex - 1].focus();
                    } else {
                        buttons[buttons.length - 1].focus(); // Wrap to end
                    }
                    break;

                case 'ArrowRight':
                    event.preventDefault();
                    if (currentIndex < buttons.length - 1) {
                        buttons[currentIndex + 1].focus();
                    } else {
                        buttons[0].focus(); // Wrap to start
                    }
                    break;

                case 'Home':
                    event.preventDefault();
                    buttons[0].focus();
                    break;

                case 'End':
                    event.preventDefault();
                    buttons[buttons.length - 1].focus();
                    break;

                case 'Escape':
                    // Escape handled by Overflow component for menu
                    break;

                default:
                    break;
            }
        };

        const toolbar = toolbarRef.current;
        if (toolbar) {
            toolbar.addEventListener('keydown', handleKeyDown);
            return () => toolbar.removeEventListener('keydown', handleKeyDown);
        }
    }, []);

    return (
        <ToolBarProvider enableOverflow={enableOverflow} mobileBreakpoint={mobileBreakpoint}>
            <div ref={toolbarRef} className={className} role="toolbar" aria-label="Toolbar">
                {children}
            </div>
        </ToolBarProvider>
    );
};

ToolBar.displayName = 'ToolBar';

ToolBar.propTypes = {
    children: PropTypes.node.isRequired,
    enableOverflow: PropTypes.bool,
    mobileBreakpoint: PropTypes.number,
    className: PropTypes.string,
};

// Attach subcomponents for compound pattern
ToolBar.Section = ToolBarSection;
ToolBar.Button = ToolBarButton;
ToolBar.Separator = ToolBarSeparator;
ToolBar.Overflow = ToolBarOverflow;

export default ToolBar;
