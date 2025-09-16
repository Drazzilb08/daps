import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { ToolBar, Section, Button, Separator } from '../ToolBar';

/**
 * Context-aware search toolbar with overflow management
 *
 * Shows different tools based on search page type:
 * - Media pages: Refresh, Scan, Export
 * - Poster pages: Refresh, Upload, Download
 * - Poster + GDrive: Additional Sync tool
 *
 * @param {Object} props - Component props
 * @param {string} [props.searchPageType='media'] - Search page type ('media', 'posters')
 * @param {string} [props.searchSubtype] - Search subtype ('gdrive', 'assets')
 * @param {Function} [props.onToolAction] - Tool action handler
 * @param {boolean} [props.disabled=false] - Disable all interactions
 */
const SearchToolbar = React.memo(
    ({ searchPageType = 'media', searchSubtype, onToolAction, disabled = false }) => {
        /**
         * Handle tool button clicks
         *
         * @param {string} action - Tool action identifier
         * @returns {Function} Click handler with context data
         */
        const handleToolClick = useCallback(
            action => {
                return event => {
                    if (disabled || !onToolAction) return;

                    const toolData = {
                        action,
                        searchPageType,
                        searchSubtype,
                    };

                    onToolAction(action, toolData, event);
                };
            },
            [disabled, onToolAction, searchPageType, searchSubtype]
        );

        /**
         * Get constant tools (view, sort, filter)
         *
         * @returns {Array} Tool configuration objects
         */
        const getConstantTools = () => [
            {
                key: 'view',
                action: 'view',
                iconName: 'visibility',
                label: 'View',
            },
            {
                key: 'sort',
                action: 'sort',
                iconName: 'sort',
                label: 'Sort',
            },
            {
                key: 'filter',
                action: 'filter',
                iconName: 'filter_alt',
                label: 'Filter',
            },
        ];

        /**
         * Get dynamic tools based on search context
         *
         * @returns {Array} Tool configuration objects for current context
         */
        const getDynamicTools = () => {
            const dynamicTools = [
                {
                    key: 'refresh',
                    action: 'refresh',
                    iconName: 'refresh',
                    label: 'Refresh',
                },
            ];

            // Add context-specific tools
            if (searchPageType === 'media') {
                dynamicTools.push(
                    {
                        key: 'scan',
                        action: 'scan',
                        iconName: 'folder_open',
                        label: 'Scan',
                    },
                    {
                        key: 'export',
                        action: 'export',
                        iconName: 'download',
                        label: 'Export',
                    }
                );
            }

            if (searchPageType === 'posters') {
                if (searchSubtype === 'gdrive') {
                    dynamicTools.unshift({
                        key: 'sync',
                        action: 'sync',
                        iconName: 'sync',
                        label: 'Sync',
                    });
                }

                dynamicTools.push(
                    {
                        key: 'upload',
                        action: 'upload',
                        iconName: 'upload',
                        label: 'Upload',
                    },
                    {
                        key: 'download',
                        action: 'download',
                        iconName: 'download',
                        label: 'Download',
                    }
                );
            }

            return dynamicTools;
        };

        const constantTools = getConstantTools();
        const dynamicTools = getDynamicTools();

        return (
            <ToolBar>
                {/* Left section: Dynamic context-aware tools with overflow */}
                <Section alignContent="left" collapseButtons={true}>
                    {dynamicTools.map(tool => (
                        <Button
                            key={tool.key}
                            iconName={tool.iconName}
                            label={tool.label}
                            isDisabled={disabled}
                            onPress={handleToolClick(tool.action)}
                        />
                    ))}
                </Section>

                {/* Right section: Constant tools always visible with separator */}
                <Section alignContent="right" collapseButtons={false}>
                    <Separator />
                    {constantTools.map(tool => (
                        <Button
                            key={tool.key}
                            iconName={tool.iconName}
                            label={tool.label}
                            isDisabled={disabled}
                            onPress={handleToolClick(tool.action)}
                        />
                    ))}
                </Section>
            </ToolBar>
        );
    }
);

SearchToolbar.displayName = 'SearchToolbar';

SearchToolbar.propTypes = {
    searchPageType: PropTypes.string,
    searchSubtype: PropTypes.string,
    onToolAction: PropTypes.func,
    disabled: PropTypes.bool,
};

export default SearchToolbar;
