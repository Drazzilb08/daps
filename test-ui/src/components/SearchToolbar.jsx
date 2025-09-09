import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import PageToolbar from './PageToolbar.jsx';
import PageToolbarSection from './PageToolbarSection.jsx';
import PageToolbarButton from './PageToolbarButton.jsx';
import PageToolbarSeparator from './PageToolbarSeparator.jsx';

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
   * Get tools based on search context
   */
  const getContextTools = () => {
    const baseTools = [
      {
        key: 'refresh',
        action: 'refresh',
        iconName: 'refresh',
        label: 'Refresh'
      },
      {
        key: 'filter',
        action: 'filter',
        iconName: 'filter_list',
        label: 'Filter'
      },
      {
        key: 'sort',
        action: 'sort',
        iconName: 'sort',
        label: 'Sort'
      },
      {
        key: 'view',
        action: 'view',
        iconName: 'view_list',
        label: 'View'
      }
    ];

    // Add context-specific tools
    if (searchPageType === 'media') {
      baseTools.push(
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
      baseTools.push(
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
      
      if (searchSubtype === 'gdrive') {
        baseTools.unshift({
          key: 'sync',
          action: 'sync',
          iconName: 'sync',
          label: 'Sync'
        });
      }
    }

    return baseTools;
  };

  const tools = getContextTools();

  return (
    <PageToolbar>
      <PageToolbarSection alignContent="left" collapseButtons={true}>
        {tools.map((tool, index) => (
          <React.Fragment key={tool.key}>
            {index > 0 && index % 3 === 0 && <PageToolbarSeparator />}
            <PageToolbarButton
              iconName={tool.iconName}
              label={tool.label}
              isDisabled={disabled}
              onPress={handleToolClick(tool.action)}
            />
          </React.Fragment>
        ))}
      </PageToolbarSection>
    </PageToolbar>
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