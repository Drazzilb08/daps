import React from 'react';
import PropTypes from 'prop-types';
import { useToolBar } from './ToolBarContext';

/**
 * ToolBar.Separator - Visual separator between sections
 *
 * Features:
 * - Responsive visibility (hidden on mobile)
 * - Theme-aware styling
 * - Context-aware rendering
 *
 * This component uses ToolBar context to hide itself on mobile
 * since sections stack vertically on small screens.
 *
 * @param {Object} props
 * @param {string} [props.className] - Additional CSS classes
 *
 * @example
 * <ToolBar.Separator />
 */
const Separator = ({ className = '' }) => {
    const { isMobile } = useToolBar();

    // Hide separator on mobile (sections stack vertically)
    if (isMobile) {
        return null;
    }

    const baseClasses = 'w-px h-5 bg-text-secondary mx-3 flex-shrink-0 self-center';
    return <div className={`${baseClasses} ${className}`} aria-hidden="true" />;
};

Separator.displayName = 'ToolBar.Separator';

Separator.propTypes = {
    className: PropTypes.string,
};

export default Separator;
