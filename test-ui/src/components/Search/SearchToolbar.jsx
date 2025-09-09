import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { ToolBar, Section, Button, Separator } from '../Toolbar';

/**
 * SearchToolbar Component for DAPS Application
 * 
 * Intelligent responsive toolbar based on Radarr architecture patterns.
 * Provides context-aware tools for search pages with automatic overflow management.
 * 
 * @param {Object} props - Component props
 * @param {string} [props.searchPageType='media'] - Type of search page ('media', 'posters')
 * @param {string} [props.searchSubtype] - Search subtype context
 * @param {Function} [props.onToolAction] - Tool action handler
 * @param {boolean} [props.disabled=false] - Disable all tools
 */
const SearchToolbar = React.memo(({ 
  searchPageType = 'media',
  searchSubtype,
  onToolAction,
  disabled = false
}) => {
  
  /**
   * Handle tool button clicks
   */
  const handleToolClick = useCallback((action) => {
    return (event) => {
      if (disabled || !onToolAction) return;
      
      const toolData = {
        action,
        searchPageType,
        searchSubtype
      };
      
      onToolAction(action, toolData, event);
    };
  }, [disabled, onToolAction, searchPageType, searchSubtype]);

  /**
   * Get constant tools that always appear on the right
   */
  const getConstantTools = () => [
    {
      key: 'view',
      action: 'view',
      iconName: 'visibility',
      label: 'View'
    },
    {
      key: 'sort',
      action: 'sort',
      iconName: 'sort',
      label: 'Sort'
    },
    {
      key: 'filter',
      action: 'filter',
      iconName: 'filter_alt',
      label: 'Filter'
    }
  ];

  /**
   * Get dynamic tools based on search context (left side)
   */
  const getDynamicTools = () => {
    const dynamicTools = [
      {
        key: 'refresh',
        action: 'refresh',
        iconName: 'refresh',
        label: 'Refresh'
      }
    ];

    // Add context-specific tools
    if (searchPageType === 'media') {
      dynamicTools.push(
        {
          key: 'scan',
          action: 'scan',
          iconName: 'folder_open',
          label: 'Scan'
        },
        {
          key: 'export',
          action: 'export',
          iconName: 'download',
          label: 'Export'
        }
      );
    }

    if (searchPageType === 'posters') {
      if (searchSubtype === 'gdrive') {
        dynamicTools.unshift({
          key: 'sync',
          action: 'sync',
          iconName: 'sync',
          label: 'Sync'
        });
      }
      
      dynamicTools.push(
        {
          key: 'upload',
          action: 'upload',
          iconName: 'upload',
          label: 'Upload'
        },
        {
          key: 'download',
          action: 'download',
          iconName: 'download',
          label: 'Download'
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
        {dynamicTools.map((tool) => (
          <Button
            key={tool.key}
            iconName={tool.iconName}
            label={tool.label}
            isDisabled={disabled}
            onPress={handleToolClick(tool.action)}
          />
        ))}
      </Section>

      {/* Visual separator between sections */}
      <Separator />

      {/* Right section: Constant tools always visible */}
      <Section alignContent="right" collapseButtons={false}>
        {constantTools.map((tool) => (
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
});

SearchToolbar.displayName = 'SearchToolbar';

SearchToolbar.propTypes = {
  searchPageType: PropTypes.string,
  searchSubtype: PropTypes.string,
  onToolAction: PropTypes.func,
  disabled: PropTypes.bool
};

export default SearchToolbar;