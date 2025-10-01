import React from 'react';
import { Card } from '../ui/card/Card';
import { Button } from '../ui/button/Button';

/**
 * Instance card component that composes Card primitive for instance display
 * @param {Object} props
 * @param {Object} props.instance - Instance data
 * @param {string} props.instance.name - Instance name
 * @param {string} props.instance.url - Instance URL
 * @param {string} props.instance.api - Instance API key
 * @param {string} props.serviceType - Service type (radarr|sonarr|plex)
 * @param {Object} [props.connectionStatus] - Connection test status
 * @param {boolean} props.connectionStatus.success - Test success status
 * @param {string} props.connectionStatus.message - Status message
 * @param {number} props.connectionStatus.timestamp - Test timestamp
 * @param {boolean} props.isTesting - Whether test is in progress
 * @param {Function} props.onTest - Test button handler
 * @param {Function} props.onEdit - Edit button handler
 * @param {Function} props.onDelete - Delete button handler
 */
export const InstanceCard = ({
    instance,
    connectionStatus,
    isTesting,
    onTest,
    onEdit,
    onDelete,
}) => {
    // Build display data for Card primitive
    const cardData = {
        name: instance.name,
        url: instance.url,
        status: getStatusDisplay(connectionStatus, isTesting),
        lastTested: connectionStatus?.timestamp
            ? formatTimestamp(connectionStatus.timestamp)
            : 'Never',
    };

    return (
        <Card>
            <Card.Body>
                {/* Instance data display */}
                <div className="space-y-3">
                    {Object.entries(cardData)
                        .filter(([, value]) => value !== undefined && value !== null)
                        .map(([key, value]) => (
                            <div
                                key={key}
                                className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-4"
                            >
                                <span className="font-semibold text-brand-primary shrink-0 sm:min-w-24 text-sm">
                                    {key.charAt(0).toUpperCase() + key.slice(1)}:
                                </span>
                                <span className="text-secondary flex-1 break-words text-base leading-relaxed">
                                    {React.isValidElement(value) ? value : String(value)}
                                </span>
                            </div>
                        ))}
                </div>
            </Card.Body>
            <Card.Footer align="right">
                {/* Action buttons */}
                <div className="flex gap-2">
                    {/* Test button - Primary variant (main action) */}
                    <Button variant="primary" onClick={onTest} disabled={isTesting}>
                        {isTesting ? 'Testing...' : 'Test'}
                    </Button>
                    {/* Edit button - Secondary variant (neutral action) */}
                    <Button variant="secondary" onClick={onEdit}>
                        Edit
                    </Button>
                    {/* Delete button - Danger variant (destructive action) */}
                    <Button variant="danger" onClick={onDelete}>
                        Delete
                    </Button>
                </div>
            </Card.Footer>
        </Card>
    );
};

/**
 * Get status display based on connection status and testing state
 * @param {Object} connectionStatus - Connection status object
 * @param {boolean} isTesting - Whether test is in progress
 * @returns {JSX.Element} Status display element with colored circle
 */
const getStatusDisplay = (connectionStatus, isTesting) => {
    if (isTesting) {
        return (
            <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-primary"></span>
                Testing...
            </span>
        );
    }
    if (!connectionStatus) {
        return (
            <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-warning"></span>
                Not Tested
            </span>
        );
    }
    if (connectionStatus.success) {
        return (
            <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-success"></span>
                Connected
            </span>
        );
    }
    return (
        <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-error"></span>
            Failed
        </span>
    );
};

/**
 * Format timestamp to human-readable relative time
 * @param {number} timestamp - Unix timestamp
 * @returns {string} Formatted timestamp
 */
const formatTimestamp = timestamp => {
    if (!timestamp) return 'Never';

    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (seconds < 60) return 'Just now';
    if (minutes < 60) return `${minutes} min${minutes > 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    return new Date(timestamp).toLocaleString();
};
