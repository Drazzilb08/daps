export const INSTANCE_SCHEMA = [
    {
        key: 'name',
        label: 'Instance Name',
        type: 'text',
        required: true,
        placeholder: 'e.g. radarr_hd',
        description: 'Unique instance name (e.g. radarr_hd)',
    },
    {
        key: 'url',
        label: 'URL',
        type: 'text',
        required: true,
        placeholder: 'http://host:port',
        description: 'Base URL for the instance (e.g. http://host:port)',
    },
    {
        key: 'api',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: 'Paste API Key',
        description: 'API Key for this instance.',
    },
];
