// web/static/js/settings/settings_schema.js

export const SETTINGS_SCHEMA = [
  // --- SYNC GDRIVE ---
  {
    key: "sync_gdrive",
    label: "Sync Gdrive",
    fields: [
      { key: "log_level", label: "Log Level", type: "dropdown", options: ["debug", "info"], required: true },
      { key: "client_id", label: "Client ID", type: "text", required: true },
      { key: "client_secret", label: "Client Secret", type: "password", required: true },
      { key: "token",
        label: "Token (JSON)",
        type: "json",
        required: true,
        placeholder: `
{
    "access_token": "ya29.a0AfH6SMBEXAMPLEEXAMPLETOKEN",
    "refresh_token": "1",
    "scope": "https://www.googleapis.com/auth/drive",
    "token_type": "Bearer",
    "expiry_date": 1712345678901
}` 
      },
      { key: "gdrive_sa_location", label: "Service Account Location", type: "text", required: false},
      {
      key: "gdrive_list",
      label: "Google Drive List",
      type: "complex_list",
      required: false,
      description: "Each entry contains id, location, and name.",
      modal: "gdriveSyncModal",
      fields: [
        { key: "name", label: "Name", type: "text", required: true },
        { key: "id", label: "GDrive ID", type: "text", required: true },
        { key: "location", label: "Location", type: "text", required: true }
      ]
    }
  ]
},

  // --- POSTER RENAMERR ---
  {
    key: "poster_renamerr",
    label: "Poster Renamerr",
    fields: [
      { key: "log_level", label: "Log Level", type: "dropdown", options: ["debug", "info"], required: true },
      { key: "dry_run", label: "Dry Run", type: "slider", required: false },
      { key: "sync_posters", label: "Sync Posters", type: "slider", required: false },
      { key: "action_type", label: "Action Type", type: "dropdown", options: ["copy", "move", "hardlink", "symlink"], required: true },
      { key: "asset_folders", label: "Asset Folders", type: "slider", required: false },
      { key: "print_only_renames", label: "Print Only Renames", type: "slider", required: false },
      { key: "run_border_replacerr", label: "Run Border Replacerr", type: "slider", required: false },
      { key: "incremental_border_replacerr", label: "Incremental Border Replacerr", type: "slider", required: false },
      { key: "run_cleanarr", label: "Run Cleanarr", type: "slider", required: false },
      { key: "report_unmatched_assets", label: "Report Unmatched Assets", type: "slider", required: false },
      {
        key: "source_dirs",
        label: "Source Directories",
        type: "dir_list_drag_drop",   // Drag-and-drop UI
        required: true,
        modal: "directoryPickerModal" // Still allow picker modal for adding/editing
      },
      { key: "destination_dir", label: "Destination Directory", type: "dir", required: true, modal: "directoryPickerModal" },
      {
        key: "instances",
        label: "Instances",
        type: "instances",
        required: true,
        description: "Radarr/Sonarr/Plex targets.",
        instance_types: [
          "plex",
          "radarr",
          "sonarr"
        ]
      }
    ]
  },

  // --- POSTER CLEANARR ---
  {
    key: "poster_cleanarr",
    label: "Poster Cleanarr",
    fields: [
      // Add fields if/when needed.
    ]
  },

  // --- UNMATCHED ASSETS ---
  {
    key: "unmatched_assets",
    label: "Unmatched Assets",
    fields: [
      // Add fields if/when needed.
    ]
  },

  // --- BORDER REPLACERR ---
  {
    key: "border_replacerr",
    label: "Border Replacerr",
    fields: [
      { key: "log_level", label: "Log Level", type: "dropdown", options: ["debug", "info"], required: true },
      { key: "dry_run", label: "Dry Run", type: "slider", required: false },
      { key: "source_dirs", label: "Source Directories", type: "dir_list", required: false, modal: "directoryPickerModal" },
      { key: "destination_dir", label: "Destination Directory", type: "text", required: false, modal: "directoryPickerModal" },
      { key: "border_width", label: "Border Width (px)", type: "number", required: false },
      { key: "skip", label: "Skip", type: "slider", required: false },
      { key: "exclusion_list", label: "Exclusion List", type: "textarea", required: false },
      { key: "border_colors", label: "Border Colors", type: "color_list", required: false },
      {
        key: "holidays",
        label: "Holidays",
        type: "complex_list",
        description: "Add holiday color overrides.",
        required: false,
        modal: "borderReplacerrModal",
        fields: [
            { key: "name", label: "Holiday Name", type: "text", required: true },
            { key: "schedule", label: "Schedule", type: "text", required: true },
            { key: "color", label: "Colors", type: "color_list", required: true } // handle as array of colors
        ]
        }
    ]
  },

  // --- UPGRADINATORR ---
  {
    key: "upgradinatorr",
    label: "Upgradinatorr",
    fields: [
      { key: "log_level", label: "Log Level", type: "dropdown", options: ["debug", "info"], required: true },
      { key: "dry_run", label: "Dry Run", type: "slider", required: false },
      {
        key: "instances_list",
        label: "Instances List",
        type: "complex_list",
        required: false,
        description: "List of instance configs.",
        modal: "upgradinatorrModal",
        fields: [
            { key: "instance", label: "Instance", type: "text", required: true },
            { key: "count", label: "Count", type: "number", required: true },
            { key: "tag_name", label: "Tag Name", type: "text", required: true },
            { key: "ignore_tag", label: "Ignore Tag", type: "text", required: false },
            { key: "unattended", label: "Unattended", type: "slider", required: false },
        ]
      }
    ]
  },

  // --- RENAMEINATORR ---
  {
    key: "renameinatorr",
    label: "Renameinatorr",
    fields: [
      { key: "log_level", label: "Log Level", type: "dropdown", options: ["info", "debug"], required: true },
      { key: "dry_run", label: "Dry Run", type: "slider", required: false },
      { key: "rename_folders", label: "Rename Folders", type: "slider", required: false },
      { key: "count", label: "Count", type: "number", required: false },
      { key: "radarr_count", label: "Radarr Count", type: "number", required: false },
      { key: "sonarr_count", label: "Sonarr Count", type: "number", required: false },
      { key: "tag_name", label: "Tag Name", type: "text", required: false },
      { key: "enable_batching", label: "Enable Batching", type: "slider", required: false },
      {
        key: "instances",
        label: "Instances",
        type: "instances",
        required: true,
        description: "Radarr/Sonarr targets.",
      }
    ]
  },

  // --- NOHL ---
  {
    key: "nohl",
    label: "Nohl",
    fields: [
      { key: "log_level", label: "Log Level", type: "dropdown", options: ["debug", "info"], required: true },
      { key: "dry_run", label: "Dry Run", type: "slider", required: false },
      { key: "searches", label: "Searches", type: "number", required: false },
      { key: "print_files", label: "Print Files", type: "slider", required: false },
      { key: "source_dirs", label: "Source Directories", type: "mode_dir_list", required: true, modal: "directoryPickerModal" },
      { key: "exclude_profiles", label: "Exclude Profiles", type: "textarea", required: false },
      { key: "exclude_movies", label: "Exclude Movies", type: "textarea", required: false },
      { key: "exclude_series", label: "Exclude Series", type: "textarea", required: false },
      {
        key: "instances",
        label: "Instances",
        type: "instances",
        required: true,
        description: "Radarr/Sonarr targets."
      }
    ]
  },

  // --- LABELARR ---
  {
    key: "labelarr",
    label: "Labelarr",
    fields: [
      { key: "log_level", label: "Log Level", type: "dropdown", options: ["debug", "info"], required: true },
      { key: "dry_run", label: "Dry Run", type: "slider", required: false },
      {
        key: "mappings",
        label: "Mappings",
        type: "complex_list",
        required: false,
        description: "Mappings of app_type, app_instance, labels, plex_instances.",
        modal: "labelarrModal",
        fields: [
        { key: "app_type", label: "App Type", type: "text", required: true },
        { key: "app_instance", label: "App Instance", type: "text", required: true },
        { key: "labels", label: "Labels", type: "text", required: true },
        {
            key: "plex_instances",
            label: "Plex Instances",
            type: "complex_list",
            required: false,
            fields: [
            { key: "instance", label: "Plex Instance", type: "text", required: true },
            {
                key: "library_names",
                label: "Library Names",
                type: "textarea",
                required: true
            }
            ]
        }
        ]
      }
    ]
  },

  // --- HEALTH CHECKARR ---
  {
    key: "health_checkarr",
    label: "Health Checkarr",
    fields: [
      { key: "log_level", label: "Log Level", type: "dropdown", options: ["info", "debug"], required: true },
      { key: "dry_run", label: "Dry Run", type: "slider", required: false },
      {
        key: "instances",
        label: "Instances",
        type: "instances",
        required: true
      }
    ]
  },

  // --- JDUPARR ---
  {
    key: "jduparr",
    label: "Jduparr",
    fields: [
      { key: "log_level", label: "Log Level", type: "dropdown", options: ["debug", "info"], required: true },
      { key: "dry_run", label: "Dry Run", type: "slider", required: false },
      { key: "source_dirs", label: "Source Directories", type: "dir_list", required: false, modal: "directoryPickerModal" }
    ]
  },

  // --- MAIN ---
  {
    key: "main",
    label: "Main",
    fields: [
      { key: "log_level", label: "Log Level", type: "dropdown", options: ["debug", "info"], required: true },
      { key: "theme", label: "Theme", type: "dropdown", options: ["dark", "light"], required: true },
      { key: "update_notifications", label: "Update Notifications", type: "slider", required: false }
    ]
  },
];