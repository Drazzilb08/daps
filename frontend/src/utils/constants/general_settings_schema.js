// General settings schema - separated from modules
export const GENERAL_SETTINGS_SCHEMA = [
    {
        key: 'general',
        label: 'General',
        fields: [
            {
                key: 'log_level',
                label: 'Log Level',
                type: 'dropdown',
                options: ['debug', 'info'],
                required: true,
                description: 'Set the logging verbosity for general settings.',
            },
            {
                key: 'max_logs',
                label: 'Maximum Logs',
                type: 'number',
                placeholder: '9',
                required: true,
                description: 'Set the maximum number of logs to keep.',
            },
            {
                key: 'update_notifications',
                label: 'Update Notifications',
                type: 'check_box',
                description: 'Enable notifications for available updates.',
            },
        ],
    },
];
