// ===== Help Text Definitions =====
window.help = {
    schedule: [
        "Options:",
        "hourly(XX)",
        "Examples: hourly(00) or hourly(18) – Will perform the action every hour at the specified time",
        "",
        "daily(XX:XX)",
        "Examples: daily(12:23) or daily(18:15) – Will perform the action every day at the specified time",
        "Examples: daily(10:18|12:23) – Will perform the action every day at the specified times",
        "",
        "weekly(day_of_week@XX:XX)",
        "Examples: weekly(monday@12:00) or weekly(monday@18:15) – Will perform the action on the specified day of the week at the specified time",
        "Examples: weekly(monday@12:23)",
        "",
        "monthly(day_of_month@XX:XX)",
        "Examples: monthly(15@12:00) or monthly(15@18:15) – Will perform the action on the specified day of the month at the specified time",
        "",
        "cron(<cron_expression>)",
        "Examples: cron(0 0 * * *) – Will perform the action every day at midnight",
        "Examples: cron(*/5 * * * *) – Will perform the action every 5 minutes",
        "Examples: cron(0 */3 * * *) – Will perform the action every 3rd hour",
        "Please visit https://crontab.guru/ for more information on cron expressions",
        "",
        "Note: You cannot use both cron and human-readable expressions in the same schedule.",
        "",
        "Schedule only supports the following options: hourly, daily, weekly, monthly, cron"
    ],
    settings: [
  {
    gdrive_sync: [
      "Sync GDrive posters/assets to your local collection. Each entry represents a GDrive connection.",
      "name: Friendly name for this GDrive (e.g., 'Main Posters').",
      "id: The unique GDrive folder or shared drive ID.",
      "location: Local directory to sync assets to (destination folder).",
      "token: Paste the service account token or OAuth JSON here.",
      {
        type: "link",
        text: "rclone configuration wiki",
        url: "https://github.com/Drazzilb08/daps/wiki/rclone-configuration"
      }
    ],

    poster_renamerr: [
      "Organizes and renames poster files for Kometa/Plex.",
      "source_dirs: One or more folders to scan for posters, priority is:",
      "  • Top = Lowest priority",
      "  • Bottom = Highest priority",
      "destination_dir: Where renamed/organized posters are moved.",
      "Asset Folders: This setting MUST be the same to what you have set in Kometa",
      "Print Only Renames: Print each file as it's processed.",
      "Run Border Replacerr: Run border_replacer after renaming posters.",
      "Incremental Border Replacerr: Border replacerr will only run on posters that have been renamed.",
      "Instances: List the Radarr/Sonarr instances you wish to use as source for renaming of posters,",
      "Plex is used for collections only and not as a source for Movies/TV Shows."

    ],

    poster_cleanarr: [
      "Ignore Media: List of media to ignore during cleaning of posters from your assets directory.",
      "Source Dirs: Folders to scan for posters to clean, typically your Kometa assets directory.",
    ],

    unmatched_assets: [
      "Finds assets/posters not matched to any item in your media library.",
      "source_dirs: Folders to search for unmatched assets. Typically your assets directory.",
    ],

    border_replacerr: [
      "Adds or replaces borders on posters. Supports holiday presets and custom colors.",
      "Source/Destination Dirs: These fields is not required if you're planning on running border_replacerr in line with poster_renaemrr.",
      "border_colors: Array of colors (HEX codes) for the border.",
      "skip: Skips running border replacerr until a Holiday",
      "exclusion_list: List of items to exclude from border replacement.",
      "holiday_name: Label for this border/holiday.",
      "schedule: When this border should be active (see 'schedule' help).",
      "destination_dir: Output directory for processed posters."
    ],

    health_checkarr: [
      "Scans for media deleted from TMDB/TVDB and removes them from Sonarr/Radarr.",
      "data_dir: Root folder for media scan.",
      "print_files: Print each item as it's processed."
    ],

    labelarr: [
      "Syncs Radarr/Sonarr tags/labels to Plex.",
      "app_type: Radarr or Sonarr.",
      "app_instance: Name of the Radarr/Sonarr config instance.",
      "labels: Comma-separated list of tags to sync.",
      "plex_instances: List of Plex servers/libraries to sync with."
    ],

    upgradinatorr: [
      "Automatically triggers upgrades/searches to maximize quality in Radarr/Sonarr.",
      "instance: Name of the Radarr/Sonarr server.",
      "count: Max number of searches per run.",
      "tag_name: The tag used to mark an item as having been searched for upgrades.",
      "ignore_tag: Do not upgrade media with this tag.",
      "unattended: If true, skip confirmation.",
      "season_monitored_threshold: Minimum monitored percentage per season (Sonarr only)."
    ],

    renameinatorr: [
      "Triggers Radarr/Sonarr rename jobs.",
      "tag_name: The tag that will be used to mark as been renamed.",
      "Count: The maximum global number of renames to perform.",
      "Radarr Count: The maximum number of renames to perform in Radarr.",
        "Sonarr Count: The maximum number of renames to perform in Sonarr.",
      "instance: Server to run renames on."
    ],

    nohl: [
      "Scans for non-hardlinked files and can auto-resolve them.",
      "source_dirs: One or more directories to scan.",
      "mode (per folder):",
      "  • Resolve: Delete+search to restore missing hardlinks automatically.",
      "  • Scan: Only log/report non-hardlinked files, do not resolve."
    ],

    jduparr: [
      "Runs jdupes to find/remove duplicate files.",
      "source_dirs: Folders to deduplicate.",
    ],
  }
]
};
// ===== Placeholder Text per Module =====
window.PLACEHOLDER_TEXT = {
    sync_gdrive:
    {
        name: 'Unique name for your Gdrive',
        token: '{\n  "access_token": "ya29.a0AfH6SMBEXAMPLEEXAMPLETOKEN",\n  "refresh_token": "1",\n  "scope": "https://www.googleapis.com/auth/drive",\n  "token_type": "Bearer",\n  "expiry_date": 1712345678901\n}',
        gdrive_sa_location: 'Click to pick your service account file…',
        location: 'Click to pick the destination directory',
        id: "Paste the Gdrive ID to pull posters from",
        client_id: "asdasds.apps.googleusercontent.com",
        client_secret: "GOCSPX-asda123"
    },
    poster_renamerr:
    {
        source_dirs: "Click to pick a source directory...",
        destination_dir: '/path/to/Kometa/assets_directory',
    },
    upgradinatorr:
    {
        data_dir: '/path/to/media_folder',
    },
    renameinatorr:
    {
        tag_name: 'Enter the tag you wish to use',
    },
    nohl:
    {
        source_dirs: "Click to pick a source directory...",
    },
    border_replacerr:
    {
        holiday_name: 'Holiday name',
    },
    labelarr:
    {
        labels: 'Comma-separated list of labels',
    }
};
// ===== Module Display Order =====
window.moduleOrder = [
    'sync_gdrive',
    'poster_renamerr',
    'poster_cleanarr',
    'unmatched_assets',
    'border_replacerr',
    'renameinatorr',
    'upgradinatorr',
    'nohl',
    'labelarr',
    'health_checkarr',
    'jduparr',
    'main',
];
// ===== Notification-Enabled Modules =====
window.notificationList = [
    'poster_renamerr',
    'unmatched_assets',
    'renameinatorr',
    'upgradinatorr',
    'nohl',
    'labelarr',
    'health_checkarr',
    'jduparr',
    // 'main', Needs to be added later
]
// ===== Notification Type Definitions =====
window.NOTIFICATION_DEFINITIONS = {
    email:
    {
        label: "Email",
        fields: [
        {
            key: "smtp_server",
            label: "SMTP Server",
            type: "text",
            dataType: "string",
            required: true,
            placeholder: "smtp.gmail.com"
        },
        {
            key: "smtp_port",
            label: "SMTP Port",
            type: "number",
            dataType: "int",
            required: true,
            placeholder: "587"
        },
        {
            key: "username",
            label: "Username",
            type: "text",
            dataType: "string",
            required: true,
            placeholder: "user@example.com"
        },
        {
            key: "password",
            label: "Password",
            type: "password",
            dataType: "string",
            required: true,
            placeholder: "yourpassword or app password on gmail"
        },
        {
            key: "from",
            label: "From",
            type: "email",
            dataType: "string",
            required: true,
            placeholder: "noreply@example.com"
        },
        {
            key: "to",
            label: "Recipients",
            type: "textarea",
            dataType: "list",
            required: true,
            placeholder: "admin@example.com\nsupport@example.com"
        },
        {
            key: "use_tls",
            label: "Use TLS",
            type: "checkbox",
            dataType: "bool",
            required: false
        }]
    },
    discord:
    {
        label: "Discord",
        fields: [
        {
            key: "webhook",
            label: "Webhook URL",
            type: "text",
            dataType: "string",
            required: true,
            placeholder: "https://discord.com/api/webhooks/..."
        }]
    },
    notifiarr:
    {
        label: "Notifiarr",
        fields: [
        {
            key: "webhook",
            label: "Webhook URL",
            type: "text",
            dataType: "string",
            required: true,
            placeholder: "https://notifiarr.com/api/..."
        },
        {
            key: "channel_id",
            label: "Channel ID",
            type: "text",
            dataType: "string",
            required: true,
            placeholder: "123456789012345678"
        }]
    }
};
// ===== Notification Type Restrictions =====
window.NOTIFICATION_TYPES_PER_MODULE = {
    unmatched_assets: ['email'],
};
// ===== Config Fetch Utility =====
window.fetchConfig = async function()
{
    try
    {
        const res = await fetch("/api/config");
        if (!res.ok) throw new Error("Failed to fetch config");
        return await res.json();
    }
    catch (err)
    {
        console.error("Error loading config:", err);
        return {};
    }
};