import React from 'react';
import PropTypes from 'prop-types';

/**
 * Generic toolbar container component
 * 
 * @param {Object} props - Component props
 * @param {string} [props.className] - CSS class override
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