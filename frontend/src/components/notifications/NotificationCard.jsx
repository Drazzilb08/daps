import { Button } from '../ui/button/Button';
import { ServiceIcon } from '../ui/ServiceIcon';

/**
 * NotificationCard - Displays configured notification service
 * @param {Object} props
 * @param {string} props.moduleName - Module identifier
 * @param {string} props.serviceType - Service type (discord|notifiarr|email)
 * @param {Object} props.config - Notification configuration
 * @param {Function} props.onEdit - Edit callback
 * @param {Function} props.onDelete - Delete callback
 * @param {Function} props.onTest - Test callback
 * @param {boolean} props.isTesting - Testing in progress
 */
export const NotificationCard = ({
    moduleName,
    serviceType,
    config,
    onEdit,
    onDelete,
    onTest,
    isTesting = false,
}) => {
    // Service labels mapping
    const labels = {
        discord: 'Discord',
        notifiarr: 'Notifiarr',
        email: 'Email',
    };

    return (
        <div className="bg-surface border border-border-subtle rounded-lg p-4">
            {/* Service Header */}
            <div className="flex items-center gap-3 mb-4">
                <div
                    className="flex items-center justify-center"
                    style={{ width: '48px', height: '48px' }}
                >
                    {serviceType === 'email' ? (
                        <span className="material-symbols-rounded" style={{ fontSize: '48px' }}>
                            mail
                        </span>
                    ) : (
                        <ServiceIcon service={serviceType} size="xlarge" />
                    )}
                </div>
                <div className="flex-1">
                    <h3 className="text-lg font-semibold text-primary">{labels[serviceType]}</h3>
                </div>
            </div>

            {/* Config Preview */}
            <div className="mb-4 text-sm space-y-1">
                {serviceType === 'discord' && (
                    <div className="text-tertiary">Bot: {config.bot_name || 'Not set'}</div>
                )}
                {serviceType === 'notifiarr' && (
                    <div className="text-tertiary">Bot: {config.bot_name || 'Not set'}</div>
                )}
                {serviceType === 'email' && (
                    <div className="text-tertiary">Server: {config.smtp_server || 'Not set'}</div>
                )}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
                <Button
                    variant="secondary"
                    onClick={() => onTest(moduleName, serviceType, config)}
                    disabled={isTesting}
                    className="flex-1"
                >
                    {isTesting ? 'Testing...' : 'Test'}
                </Button>
                <Button
                    variant="secondary"
                    onClick={() => onEdit(moduleName, serviceType, config)}
                    className="flex-1"
                >
                    Edit
                </Button>
                <Button
                    variant="danger"
                    onClick={() => onDelete(moduleName, serviceType)}
                    className="flex-1"
                >
                    Delete
                </Button>
            </div>
        </div>
    );
};
