import React from 'react';
import PropTypes from 'prop-types';

/**
 * Separator - Generic toolbar separator component
 *
 * Visual separator for toolbar sections with professional styling.
 * Provides spacing and visual division between toolbar button groups.
 *
 * @param {Object} props - Component props
 * @param {string} [props.className] - Optional CSS class override
 */
const Separator = ({ className = 'w-px h-5 bg-text-secondary mx-3 flex-shrink-0 self-center' }) => {
    return <div className={className} />;
};

Separator.propTypes = {
    className: PropTypes.string,
};

export default Separator;
