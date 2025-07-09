export const BOOL_FIELDS = [
    'dry_run',
    'skip',
    'sync_posters',
    'run_border_replacerr',
    'print_files',
    'rename_folders',
    'unattended',
    'enable_batching',
    'asset_folders',
    'print_only_renames',
    'incremental_border_replacerr',
    'silent',
    'disable_batching',
    'replace_border',
    'update_notifications',
];

export const TEXT_FIELDS = [
    'tag_name',
    'ignore_tag',
    'custom_format',
    'title',
    'alt_title',
    'poster_path',
];

export const TEXTAREA_FIELDS = [
    'exclude_profiles',
    'exclude_movies',
    'exclude_series',
    'exclusion_list',
    'exclude',
    'token',
    'ignore_collections',
    'ignore_root_folders',
    'ignore_media',
];

export const INT_FIELDS = [
    'count',
    'radarr_count',
    'sonarr_count',
    'season_monitored_threshold',
    'border_width',
    'searches',
];

export const JSON_FIELDS = ['token'];

export const DROP_DOWN_FIELDS = ['log_level', 'action_type', 'app_type', 'app_instance', 'theme'];

// Add to constants.js

export const DROP_DOWN_OPTIONS = {
    mode: ['resolve', 'symlink', 'hardlink'],
    log_level: ['info', 'debug'],
    action_type: ['copy', 'move', 'hardlink', 'symlink'],
    theme: ['light', 'dark', 'auto'],
    month: [
        { value: '01', label: 'Jan', days: 31 },
        { value: '02', label: 'Feb', days: 28 },
        { value: '03', label: 'Mar', days: 31 },
        { value: '04', label: 'Apr', days: 30 },
        { value: '05', label: 'May', days: 31 },
        { value: '06', label: 'Jun', days: 30 },
        { value: '07', label: 'Jul', days: 31 },
        { value: '08', label: 'Aug', days: 31 },
        { value: '09', label: 'Sep', days: 30 },
        { value: '10', label: 'Oct', days: 31 },
        { value: '11', label: 'Nov', days: 30 },
        { value: '12', label: 'Dec', days: 31 },
    ],
};

export const DIR_PICKER = ['source_dirs', 'destination_dir', 'data_dir'];

export const ARR_AND_PLEX_INSTANCES = [
    'poster_renamerr',
    'labelarr',
    'border_replacerr',
    'sync_gdrive',
    'nohl',
    'unmatched_assets',
    'poster_cleanarr',
    'health_checkarr',
    'renameinatorr',
];
export const SHOW_PLEX_IN_INSTANCE_FIELD = [
    'poster_renamerr',
    'unmatched_assets',
    'poster_cleanarr'
];

export const DRAG_AND_DROP = {
    poster_renamerr: ['source_dirs'],
};

export const LIST_FIELD = {
    unmatched_assets: ['source_dirs'],
    poster_cleanarr: ['source_dirs'],
    nohl: ['source_dirs'],
};

export const PLACEHOLDER_TEXT = {
    sync_gdrive: {
        name: 'Unique name for your Gdrive',
        token: '{\n  "access_token": "ya29.a0AfH6SMBEXAMPLEEXAMPLETOKEN",\n  "refresh_token": "1",\n  "scope": "https://www.googleapis.com/auth/drive",\n  "token_type": "Bearer",\n  "expiry_date": 1712345678901\n}',
        gdrive_sa_location: 'Click to pick your service account file…',
        location: 'Click to pick the destination directory',
        id: 'Paste the Gdrive ID to pull posters from',
        client_id: 'asdasds.apps.googleusercontent.com',
        client_secret: 'GOCSPX-asda123',
    },
    poster_renamerr: {
        source_dirs: 'Click to pick a source directory...',
        destination_dir: '/path/to/Kometa/assets_directory',
    },
    upgradinatorr: {
        data_dir: '/path/to/media_folder',
        instance: 'Select an instance',
        count: '0',
        tag_name: 'Enter the tag you wish to use',
        ignore_tag: 'The tag you wish to use to ignore an entry',
    },
    renameinatorr: {
        tag_name: 'Enter the tag you wish to use',
    },
    nohl: {
        source_dirs: 'Click to pick a source directory...',
    },
    border_replacerr: {
        holiday_name: 'Holiday name',
    },
    labelarr: {
        labels: 'Comma-separated list of labels',
    },
};
