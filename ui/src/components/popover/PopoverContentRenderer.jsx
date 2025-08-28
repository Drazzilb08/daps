import React from 'react';
import PropTypes from 'prop-types';
import { CONTENT_TYPES } from '../../utils/popoverSchema';
import FilterBuilderContent from './FilterBuilderContent';
import MultiSelectContent from './MultiSelectContent';
import FilterHubContent from './FilterHubContent';
import FormContent from './FormContent';
import ListContent from './ListContent';

/**
 * PopoverContentRenderer - Dynamic content renderer for schema-driven popovers
 *
 * Routes popover content to appropriate specialized components based on content type.
 * Handles all patterns from PopoverTest.jsx including complex filter builders,
 * multi-select interfaces, and form content.
 *
 * @param {Object} props - Component props
 * @param {Object} props.content - Content configuration from popover schema
 * @param {string} props.content.type - Content type identifier
 * @param {Function} props.onClose - Callback to close the popover
 * @param {Object} [props.additionalProps] - Additional props to pass to content components
 */
const PopoverContentRenderer = React.memo(({ content, onClose, additionalProps = {} }) => {
    // Handle missing or invalid content
    if (!content || typeof content !== 'object') {
        return (
            <div className="popover__content">
                <div style={{ color: 'var(--error)', padding: 'var(--space-3)' }}>
                    Invalid popover content configuration
                </div>
            </div>
        );
    }

    const { type, ...contentConfig } = content;

    // Handle missing content type
    if (!type) {
        return (
            <div className="popover__content">
                <div style={{ color: 'var(--error)', padding: 'var(--space-3)' }}>
                    Content type not specified
                </div>
            </div>
        );
    }

    // Common props passed to all content components
    const commonProps = {
        ...contentConfig,
        ...additionalProps,
        onClose,
    };

    // Route content based on type
    switch (type) {
        case CONTENT_TYPES.FILTER_BUILDER:
            return <FilterBuilderContent {...commonProps} />;

        case CONTENT_TYPES.MULTI_SELECT:
            return <MultiSelectContent {...commonProps} />;

        case CONTENT_TYPES.FILTER_HUB:
            return <FilterHubContent {...commonProps} />;

        case CONTENT_TYPES.FORM:
            return <FormContent {...commonProps} />;

        case CONTENT_TYPES.LIST:
            return <ListContent {...commonProps} />;

        case CONTENT_TYPES.CUSTOM:
            // Custom content requires component prop
            if (contentConfig.component) {
                const CustomComponent = contentConfig.component;
                return <CustomComponent {...commonProps} />;
            }

            return (
                <div className="popover__content">
                    <div style={{ color: 'var(--error)', padding: 'var(--space-3)' }}>
                        Custom content requires component prop
                    </div>
                </div>
            );

        default:
            return (
                <div className="popover__content">
                    <div style={{ color: 'var(--error)', padding: 'var(--space-3)' }}>
                        Unknown content type: {type}
                    </div>
                </div>
            );
    }
});

PopoverContentRenderer.propTypes = {
    content: PropTypes.shape({
        type: PropTypes.oneOf(Object.values(CONTENT_TYPES)).isRequired,
        component: PropTypes.elementType, // For CUSTOM type
    }).isRequired,
    onClose: PropTypes.func.isRequired,
    additionalProps: PropTypes.object,
};

PopoverContentRenderer.displayName = 'PopoverContentRenderer';

export default PopoverContentRenderer;
