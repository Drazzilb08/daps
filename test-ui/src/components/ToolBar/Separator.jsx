import React from 'react';
import PropTypes from 'prop-types';

/**
 * Separator - Generic toolbar separator component
 * 
 * Visual separator for toolbar sections based on Radarr patterns.
 * Provides spacing and visual division between toolbar button groups.
 * 
 * @param {Object} props - Component props
 * @param {string} [props.className] - Optional CSS class override
 */
const Separator = ({ className = 'page-toolbar-separator' }) => {
  return <div className={className} />;
};

Separator.propTypes = {
  className: PropTypes.string
};

export default Separator;