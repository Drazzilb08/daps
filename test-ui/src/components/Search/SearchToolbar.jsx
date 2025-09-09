import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { ToolBar, Section, Button, Separator } from '../Toolbar';

/**
 * SearchToolbar Component for DAPS Application
 * 
 * Professional context-aware toolbar implementing smart responsive architecture
 * with measurement-based overflow management and dynamic tool configuration.
 * 
 * Features:
 * - Context-aware tool configuration based on search page type and subtype
 * - Automatic overflow management with measurement-based button collapsing
 * - Dynamic left section (context tools) and static right section (constant tools)
 * - Professional architecture following established UI patterns
 * - Touch-optimized interaction targets (44px minimum)
 * - Accessibility compliant with proper ARIA attributes
 * - Visual separator between dynamic and constant tool sections
 * 
 * Toolbar Architecture:
 * - Left Section: Dynamic tools that change based on context (collapsible)
 * - Separator: Visual divider between sections
 * - Right Section: Constant tools always visible (view, sort, filter)
 * 
 * Context Behavior:
 * - Media pages: Refresh, Scan, Export tools
 * - Poster pages: Refresh, Upload, Download tools
 * - Poster + GDrive: Additional Sync tool
 * 
 * @param {Object} props - Component props
 * @param {string} [props.searchPageType='media'] - Type of search page ('media', 'posters')
 * @param {string} [props.searchSubtype] - Search subtype context ('gdrive', 'assets') or null
 * @param {Function} [props.onToolAction] - Tool action handler (action, toolData, event) => void
 * @param {boolean} [props.disabled=false] - Disable all tool interactions
 */
const SearchToolbar = React.memo(({ 
  searchPageType = 'media',
  searchSubtype,
  onToolAction,
  disabled = false
}) => {
  
  /**
   * Handle tool button clicks with context data
   * 
   * Returns a click handler function that includes current search context
   * and prevents action when disabled or no handler provided.
   * 
   * @param {string} action - The action identifier for the tool
   * @returns {Function} Event handler function for button click
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
   * Get constant tools that always appear on the right section
   * 
   * These tools are context-independent and always visible:
   * - View: Toggle display mode (list/grid/card views)
   * - Sort: Access sorting options and controls
   * - Filter: Open filtering panel or quick filters
   * 
   * @returns {Array} Array of tool configuration objects
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
   * Get dynamic tools based on search context (left section)
   * 
   * Tools are dynamically configured based on searchPageType and searchSubtype:
   * 
   * All contexts:
   * - Refresh: Reload/refresh current data
   * 
   * Media context:
   * - Scan: Initiate media library scan
   * - Export: Export search results or data
   * 
   * Poster context:
   * - Upload: Upload poster files
   * - Download: Download selected posters
   * 
   * Poster + GDrive context:
   * - Sync: Synchronize with Google Drive
   * 
   * @returns {Array} Array of tool configuration objects for current context
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