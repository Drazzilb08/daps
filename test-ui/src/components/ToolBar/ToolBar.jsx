import React from 'react';
import PropTypes from 'prop-types';

/**
 * ToolBar - Generic reusable toolbar component
 * 
 * Main container for toolbar sections and buttons following Radarr architecture.
 * This is a generic component that can be used anywhere in the application.
 * 
 * @param {Object} props - Component props
 * @param {string} [props.className] - Optional CSS class override
 * @param {React.ReactNode} props.children - Toolbar sections and content
 */
const ToolBar = ({ 
  className = 'page-toolbar',
  children 
}) => {
  return (
    <div className={className}>
      {children}
    </div>
  );
};

ToolBar.propTypes = {
  className: PropTypes.string,
  children: PropTypes.node.isRequired
};

export default ToolBar;