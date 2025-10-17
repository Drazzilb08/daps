import React from 'react';
import PropTypes from 'prop-types';

/**
 * ServiceIcon - Displays service icon from homarr-labs dashboard-icons CDN
 *
 * Renders professional SVG icons from homarr-labs dashboard-icons CDN for
 * popular services (Discord, Notifiarr, Radarr, Sonarr, Plex). Does NOT handle
 * Material Symbols - use those directly in consuming components (e.g., email).
 * Provides consistent sizing and graceful fallback on error.
 *
 * @param {Object} props - Component props
 * @param {string} props.service - Service identifier (discord|notifiarr|radarr|sonarr|plex)
 * @param {string} props.size - Icon size (small: 20px, medium: 24px, large: 32px, xlarge: 48px)
 * @param {string} props.className - Additional CSS classes
 * @returns {JSX.Element|null}
 */
export const ServiceIcon = React.memo(({ service, size = 'medium', className = '' }) => {
    // Only homarr-labs CDN services (NO Material Symbols like email)
    const iconMap = {
        discord: 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/discord.svg',
        notifiarr: 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/notifiarr.svg',
        radarr: 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/radarr.svg',
        sonarr: 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/sonarr.svg',
        plex: 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/plex.svg',
    };

    // Size mapping (pixel values for consistent sizing)
    const sizeMap = {
        small: '20px',
        medium: '24px',
        large: '32px',
        xlarge: '48px',
    };

    const normalizedService = service?.toLowerCase();
    const iconUrl = iconMap[normalizedService];
    const iconSize = sizeMap[size] || sizeMap.medium;

    // Return null for unknown services
    if (!iconUrl) {
        console.warn(`ServiceIcon: Unknown service "${service}"`);
        return null;
    }

    // Render SVG from CDN
    return (
        <img
            src={iconUrl}
            alt={`${service} icon`}
            style={{ width: iconSize, height: iconSize }}
            className={`inline-block ${className}`}
            onError={e => {
                console.warn(`Failed to load icon for ${service}`);
                e.target.style.display = 'none';
            }}
        />
    );
});

ServiceIcon.displayName = 'ServiceIcon';

ServiceIcon.propTypes = {
    service: PropTypes.oneOf(['discord', 'notifiarr', 'radarr', 'sonarr', 'plex']).isRequired,
    size: PropTypes.oneOf(['small', 'medium', 'large', 'xlarge']),
    className: PropTypes.string,
};
