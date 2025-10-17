// User Interface settings schema - separated from modules
export const UI_SETTINGS_SCHEMA = [
    {
        key: 'user_interface',
        label: 'User Interface',
        fields: [
            {
                key: 'theme',
                label: 'Theme',
                type: 'dropdown',
                options: ['auto', 'dark', 'light'],
                required: true,
                description: 'Choose the UI theme. Auto follows your system preference.',
            },
        ],
    },
];
