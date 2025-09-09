import React from 'react';
import PropTypes from 'prop-types';

/**
 * PageToolbarSeparator component
 * 
 * Visual separator for toolbar sections based on Radarr patterns.
 * Provides spacing and visual division between toolbar button groups.
 * 
 * @param {Object} props - Component props
 * @param {string} [props.className] - Optional CSS class override
 */
const PageToolbarSeparator = ({ className = 'page-toolbar-separator' }) => {
  return <div className={className} />;
};

PageToolbarSeparator.propTypes = {
  className: PropTypes.string
};

export default PageToolbarSeparator;