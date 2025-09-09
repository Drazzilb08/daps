import React from 'react';
import PropTypes from 'prop-types';

/**
 * PageToolbar component based on Radarr architecture
 * 
 * Main container for toolbar sections and buttons.
 * Provides consistent styling and layout for toolbar content.
 * 
 * @param {Object} props - Component props
 * @param {string} [props.className] - Optional CSS class override
 * @param {React.ReactNode} props.children - Toolbar sections and content
 */
const PageToolbar = ({ 
  className = 'page-toolbar',
  children 
}) => {
  return (
    <div className={className}>
      {children}
    </div>
  );
};

PageToolbar.propTypes = {
  className: PropTypes.string,
  children: PropTypes.node.isRequired
};

export default PageToolbar;