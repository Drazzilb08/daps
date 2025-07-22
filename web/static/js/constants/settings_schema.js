// web/static/js/settings/settings_schema.js
export const SETTINGS_SCHEMA = [
    {
        key: 'sync_gdrive',
        label: 'Sync Gdrive',
        fields: [
            {
                key: 'log_level',
                label: 'Log Level',
                type: 'dropdown',
                options: ['debug', 'info'],
                required: true,
                description: 'Set the logging verbosity for Google Drive sync.',
            },
            {
                key: 'client_id',
                label: 'Client ID',
                type: 'text',
                required: false,
                description: 'Google API client ID for authentication.',
            },
            {
                key: 'client_secret',
                label: 'Client Secret',
                type: 'password',
                required: false,
                description: 'Google API client secret for authentication.',
            },
            {
                key: 'token',
                label: 'Token (JSON)',
                type: 'json',
                required: false,
                placeholder: `{\n  "access_token": "ya29...",\n  "refresh_token": "1", ...}`,
                description: 'OAuth2 token JSON for authenticating with Google Drive.',
            },
            {
                key: 'gdrive_sa_location',
                label: 'Service Account Location',
                type: 'text',
                required: false,
                description: 'Path to the Google Drive service account credentials file.',
            },
            {
                key: 'gdrive_list',
                label: 'Google Drive List',
                type: 'gdrive_custom',
                required: false,
                description: 'Each entry contains id, location, and name.',

                fields: [
                    {
                        key: 'preset',
                        label: 'Gdrive Presets',
                        type: 'gdrive_presets',
                        required: false,
                        exclude_on_save: true,
                        description: 'Select a preset configuration for Google Drive.',
                    },
                    {
                        key: 'name',
                        label: 'Name',
                        type: 'text',
                        required: true,
                        description: 'Friendly name for this Google Drive entry.',
                    },
                    {
                        key: 'id',
                        label: 'GDrive ID',
                        type: 'text',
                        required: true,
                        description: 'Unique ID of the Google Drive folder or file.',
                    },
                    {
                        key: 'location',
                        label: 'Location',
                        type: 'dir',
                        required: true,

                        description: 'Local directory to sync with the specified Google Drive ID.',
                    },
                ],
            },
        ],
    },

    {
        key: 'poster_renamerr',
        label: 'Poster Renamerr',
        fields: [
            {
                key: 'log_level',
                label: 'Log Level',
                type: 'dropdown',
                options: ['debug', 'info'],
                required: true,
                description: 'Set the logging verbosity for poster renaming.',
            },
            {
                key: 'dry_run',
                label: 'Dry Run',
                type: 'check_box',
                description: 'Simulate actions without making changes.',
            },
            {
                key: 'sync_posters',
                label: 'Sync Posters',
                type: 'check_box',
                description: 'Enable to synchronize posters between source and destination.',
            },
            {
                key: 'action_type',
                label: 'Action Type',
                type: 'dropdown',
                options: ['copy', 'move', 'hardlink', 'symlink'],
                required: true,
                description: 'Select the file operation to use for renaming posters.',
            },
            {
                key: 'asset_folders',
                label: 'Asset Folders',
                type: 'check_box',
                description: 'Enable to use asset folders for organizing posters.',
            },
            {
                key: 'print_only_renames',
                label: 'Print Only Renames',
                type: 'check_box',
                description: 'Only print renaming actions without performing them.',
            },
            {
                key: 'run_border_replacerr',
                label: 'Run Border Replacerr',
                type: 'check_box',
                description: 'Enable automatic border replacement during renaming.',
            },
            {
                key: 'incremental_border_replacerr',
                label: 'Incremental Border Replacerr',
                type: 'check_box',
                description: 'Run border replacerr incrementally with each operation.',
            },
            {
                key: 'run_cleanarr',
                label: 'Run Cleanarr',
                type: 'check_box',
                description: 'Enable to run Cleanarr after renaming.',
            },
            {
                key: 'report_unmatched_assets',
                label: 'Report Unmatched Assets',
                type: 'check_box',
                description: 'Report assets that could not be matched during renaming.',
            },
            {
                key: 'source_dirs',
                label: 'Source Directories',
                type: 'dir_list_drag_drop',
                required: true,

                description: 'Directories to scan for posters to rename.',
            },
            {
                key: 'destination_dir',
                label: 'Destination Directory',
                type: 'dir',
                required: true,

                description: 'Directory where renamed posters are placed.',
            },
            {
                key: 'instances',
                label: 'Instances',
                type: 'instances',
                required: true,
                add_posters_option: true,
                instance_types: ['plex', 'radarr', 'sonarr'],
                description: 'List of Plex/Radarr/Sonarr instances to pull renaming data from.',
            },
        ],
    },

    { key: 'poster_cleanarr', label: 'Poster Cleanarr', fields: [] },
    { key: 'unmatched_assets', label: 'Unmatched Assets', fields: [] },

    {
        key: 'border_replacerr',
        label: 'Border Replacerr',
        fields: [
            {
                key: 'log_level',
                label: 'Log Level',
                type: 'dropdown',
                options: ['debug', 'info'],
                required: true,
                description: 'Set the logging verbosity for border replacerr.',
            },
            {
                key: 'dry_run',
                label: 'Dry Run',
                type: 'check_box',
                description: 'Simulate border replacement without making changes.',
            },
            {
                key: 'border_width',
                label: 'Border Width (px)',
                type: 'number',
                required: true,
                placeholder: '26px',
                description: 'Width of the border to apply to posters, in pixels.',
            },
            {
                key: 'skip',
                label: 'Skip',
                type: 'check_box',
                description: 'Skip replacing/updating borders for posters until holidays.',
            },
            {
                key: 'exclusion_list',
                label: 'Exclusion List',
                type: 'textarea',
                description: 'List of items to exclude from border replacement.',
            },
            {
                key: 'border_colors',
                label: 'Border Colors',
                type: 'color_list',
                preview: 'true',
                description: 'List of colors to use for poster borders.',
            },
            {
                key: 'holidays',
                label: 'Holidays',
                type: 'replacerr_custom',

                description: 'Add holiday color overrides.',
                fields: [
                    {
                        key: 'preset',
                        label: 'Holiday Presets',
                        type: 'holiday_presets',
                        description: 'Select a preset for holiday color overrides.',
                    },
                    {
                        key: 'name',
                        label: 'Holiday Name',
                        type: 'text',
                        required: true,
                        description: 'Name of the holiday for color override.',
                    },
                    {
                        key: 'schedule',
                        label: 'Schedule',
                        type: 'holiday_schedule',
                        required: false,
                        description: 'Schedule for when the holiday override is active.',
                    },
                    {
                        key: 'color',
                        label: 'Colors',
                        type: 'color_list',
                        preview: 'false',
                        required: false,
                        description: 'Colors to use for the holiday border override.',
                    },
                ],
            },
        ],
    },

    {
        key: 'upgradinatorr',
        label: 'Upgradinatorr',
        fields: [
            {
                key: 'log_level',
                label: 'Log Level',
                type: 'dropdown',
                options: ['debug', 'info'],
                required: true,
                description: 'Set the logging verbosity for upgradinatorr.',
            },
            {
                key: 'dry_run',
                label: 'Dry Run',
                type: 'check_box',
                description: 'Simulate upgrade actions without making changes.',
            },
            {
                key: 'instances_list',
                label: 'Instances List',
                type: 'upgradinatorr_custom',

                description: 'List of instance configs.',
                fields: [
                    {
                        key: 'instance',
                        label: 'Instance',
                        type: 'instance_dropdown',
                        from: ['radarr', 'sonarr'],
                        required: true,
                        description: 'Select the instance to upgrade (Radarr or Sonarr).',
                    },
                    {
                        key: 'count',
                        label: 'Count',
                        type: 'number',
                        required: true,
                        description: 'Number of items to upgrade per run.',
                    },
                    {
                        key: 'tag_name',
                        label: 'Tag Name',
                        type: 'text',
                        required: true,
                        description: 'Tag name to filter items for upgrade.',
                    },
                    {
                        key: 'ignore_tag',
                        label: 'Ignore Tag',
                        type: 'text',
                        description: 'Tag name to exclude from upgrade.',
                    },
                    {
                        key: 'unattended',
                        label: 'Unattended',
                        type: 'check_box',
                        description: 'Run upgrades without user intervention.',
                    },
                    {
                        key: 'season_monitored_threshold',
                        label: 'Season Monitored Threshold',
                        type: 'float',
                        required: true,
                        show_if_instance_type: 'sonarr',
                        description:
                            'Minimum percentage of monitored seasons required (Sonarr only).',
                    },
                ],
            },
        ],
    },

    {
        key: 'renameinatorr',
        label: 'Renameinatorr',
        fields: [
            {
                key: 'log_level',
                label: 'Log Level',
                type: 'dropdown',
                options: ['info', 'debug'],
                required: true,
                description: 'Set the logging verbosity for renameinatorr.',
            },
            {
                key: 'dry_run',
                label: 'Dry Run',
                type: 'check_box',
                description: 'Simulate renaming without making changes.',
            },
            {
                key: 'rename_folders',
                label: 'Rename Folders',
                type: 'check_box',
                description: 'Enable to rename folders as well as files.',
            },
            {
                key: 'count',
                label: 'Count',
                type: 'number',
                description: 'Number of items to rename per operation.',
            },
            {
                key: 'radarr_count',
                label: 'Radarr Count',
                type: 'number',
                description: 'Number of Radarr items to process per run.',
            },
            {
                key: 'sonarr_count',
                label: 'Sonarr Count',
                type: 'number',
                description: 'Number of Sonarr items to process per run.',
            },
            {
                key: 'tag_name',
                label: 'Tag Name',
                type: 'text',
                description: 'Tag name to filter items for renaming.',
            },
            {
                key: 'enable_batching',
                label: 'Enable Batching',
                type: 'check_box',
                description: 'Enable batch processing for renaming.',
            },
            {
                key: 'instances',
                label: 'Instances',
                type: 'instances',
                required: true,
                instance_types: ['radarr', 'sonarr'],
                description: 'List of Radarr and Sonarr instances to rename.',
            },
        ],
    },

    {
        key: 'nohl',
        label: 'Nohl',
        fields: [
            {
                key: 'log_level',
                label: 'Log Level',
                type: 'dropdown',
                options: ['debug', 'info'],
                required: true,
                description: 'Set the logging verbosity for Nohl module.',
            },
            {
                key: 'dry_run',
                label: 'Dry Run',
                type: 'check_box',
                description: 'Simulate actions without making changes.',
            },
            {
                key: 'searches',
                label: 'Searches',
                type: 'number',
                required: true,
                description: 'Number of search operations to perform.',
            },
            {
                key: 'print_files',
                label: 'Print Files',
                type: 'check_box',
                description: 'Print file paths during operation.',
            },
            {
                key: 'source_dirs',
                label: 'Source Directories',
                type: 'dir_list_options',
                options: ['scan', 'resolve'],
                required: true,

                description: 'Directories to scan or resolve for files.',
            },
            {
                key: 'exclude_profiles',
                label: 'Exclude Profiles',
                type: 'textarea',
                description: 'Profiles to exclude from processing.',
            },
            {
                key: 'exclude_movies',
                label: 'Exclude Movies',
                type: 'textarea',
                description: 'Movies to exclude from processing.',
            },
            {
                key: 'exclude_series',
                label: 'Exclude Series',
                type: 'textarea',
                description: 'Series to exclude from processing.',
            },
            {
                key: 'instances',
                label: 'Instances',
                type: 'instances',
                required: true,
                add_posters_option: false,
                instance_types: ['radarr', 'sonarr'],
                description: 'Instances to apply Nohl logic to.',
            },
        ],
    },

    {
        key: 'labelarr',
        label: 'Labelarr',
        fields: [
            {
                key: 'log_level',
                label: 'Log Level',
                type: 'dropdown',
                options: ['debug', 'info'],
                required: true,
                description: 'Set the logging verbosity for labelarr.',
            },
            {
                key: 'dry_run',
                label: 'Dry Run',
                type: 'check_box',
                description: 'Simulate label management actions without making changes.',
            },
            {
                key: 'mappings',
                label: 'Mappings',
                type: 'labelarr_custom',

                description: 'Mappings of app_type, app_instance, labels, plex_instances.',
                fields: [
                    {
                        key: 'app_instance',
                        label: 'App Instance',
                        type: 'instance_dropdown',
                        from: ['radarr', 'sonarr'],
                        required: true,
                        description: 'Select the specific app instance for this mapping.',
                    },
                    {
                        key: 'labels',
                        label: 'Labels',
                        type: 'text',
                        required: true,
                        description: 'Labels to assign in this mapping.',
                    },
                    {
                        key: 'plex_instances',
                        label: 'Plex Instances',
                        type: 'instances',
                        required: true,
                        instance_types: ['plex'],
                        add_posters_option: false,
                        description: 'List of Plex instances to apply the labels to.',
                    },
                ],
            },
        ],
    },

    {
        key: 'health_checkarr',
        label: 'Health Checkarr',
        fields: [
            {
                key: 'log_level',
                label: 'Log Level',
                type: 'dropdown',
                options: ['info', 'debug'],
                required: true,
                description: 'Set the logging verbosity for health checks.',
            },
            {
                key: 'dry_run',
                label: 'Dry Run',
                type: 'check_box',
                description: 'Simulate health checks without making changes.',
            },
            {
                key: 'instances',
                label: 'Instances',
                type: 'instances',
                required: true,
                instance_types: ['radarr', 'sonarr'],
                description: 'Instances to run health checks on.',
            },
        ],
    },

    {
        key: 'jduparr',
        label: 'Jduparr',
        fields: [
            {
                key: 'log_level',
                label: 'Log Level',
                type: 'dropdown',
                options: ['debug', 'info'],
                required: true,
                description: 'Set the logging verbosity for jduparr.',
            },
            {
                key: 'dry_run',
                label: 'Dry Run',
                type: 'check_box',
                description: 'Simulate duplicate detection without making changes.',
            },
            {
                key: 'source_dirs',
                label: 'Source Directories',
                type: 'dir_list',
                required: true,

                description: 'Directories to scan for duplicate files.',
            },
        ],
    },

    {
        key: 'main',
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
                key: 'update_notifications',
                label: 'Update Notifications',
                type: 'check_box',
                description: 'Enable notifications for available updates.',
            },
        ],
    },
    {
        key: 'user_interface',
        label: 'User Interface',
        fields: [
            {
                key: 'theme',
                label: 'Theme',
                type: 'dropdown',
                options: ['dark', 'light'],
                required: true,
                description: 'Choose the UI theme (dark or light).',
            },
        ],
    },
];

export const SETTINGS_MODULES = [
    {
        name: 'Sync Gdrive',
        key: 'sync_gdrive',
        description: 'Synchronize your Google Drive with DAPS.',
    },
    {
        name: 'Poster Renamerr',
        key: 'poster_renamerr',
        description: 'Automate and configure your poster renaming workflow.',
    },
    {
        name: 'Poster Cleanarr',
        key: 'poster_cleanarr',
        description: 'Clean up unused posters and maintain your collection.',
    },
    {
        name: 'Unmatched Assets',
        key: 'unmatched_assets',
        description: 'Handle and review assets that couldn’t be matched.',
    },
    {
        name: 'Border Replacerr',
        key: 'border_replacerr',
        description: 'Replace and manage borders for your posters.',
    },
    {
        name: 'Renameinatorr',
        key: 'renameinatorr',
        description: 'Send rename requests to Sonarr/Radarr instances.',
    },
    {
        name: 'Upgradinatorr',
        key: 'upgradinatorr',
        description: 'Send automatic search requests to Radarr/Sonarr instances.',
    },
    {
        name: 'Nohl',
        key: 'nohl',
        description:
            'Find items in your media collection that do not have hardlinks and send requests to Radarr/Sonarr to handle them',
    },
    {
        name: 'Labelarr',
        key: 'labelarr',
        description: 'Sync labels between Radarr/Sonarr -> Plex instances.',
    },
    {
        name: 'Health Checkarr',
        key: 'health_checkarr',
        description: 'Remove Radarr/Sonarr entries that are no longer in sync with TMDb/TVDb',
    },
    { name: 'Jduparr', key: 'jduparr', description: 'Find and handle duplicates in your files.' },
    { name: 'UI', key: 'user_interface', description: 'User Interface Settings.' },
    { name: 'General', key: 'main', description: 'General DAPS settings.' },
];
