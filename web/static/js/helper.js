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
            "Gdrive Sync",
            "Please visit our wiki article in explaining on how to get the required data",
            {
                type: "link",
                text: "rclone configuration wiki",
                url: "https://github.com/Drazzilb08/daps/wiki/rclone-configuration"
            }
        ],
    }]
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
    'main',
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
    main: [],
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