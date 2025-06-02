// ===== Holiday Presets =====
window.holidayPresets = {
    "🎆 New Year's Day":
    {
        schedule: "range(12/30-01/02)",
        colors: ["#00BFFF", "#FFD700"]
    },
    "💘 Valentine's Day":
    {
        schedule: "range(02/05-02/15)",
        colors: ["#D41F3A", "#FFC0CB"]
    },
    "🐣 Easter":
    {
        schedule: "range(03/31-04/02)",
        colors: ["#FFB6C1", "#87CEFA", "#98FB98"]
    },
    "🌸 Mother's Day":
    {
        schedule: "range(05/10-05/15)",
        colors: ["#FF69B4", "#FFDAB9"]
    },
    "👨‍👧‍👦 Father's Day":
    {
        schedule: "range(06/15-06/20)",
        colors: ["#1E90FF", "#4682B4"]
    },
    "🗽 Independence Day":
    {
        schedule: "range(07/01-07/05)",
        colors: ["#FF0000", "#FFFFFF", "#0000FF"]
    },
    "🧹 Labor Day":
    {
        schedule: "range(09/01-09/07)",
        colors: ["#FFD700", "#4682B4"]
    },
    "🎃 Halloween":
    {
        schedule: "range(10/01-10/31)",
        colors: ["#FFA500", "#000000"]
    },
    "🦃 Thanksgiving":
    {
        schedule: "range(11/01-11/30)",
        colors: ["#FFA500", "#8B4513"]
    },
    "🎄 Christmas":
    {
        schedule: "range(12/01-12/31)",
        colors: ["#FF0000", "#00FF00"]
    }
};

/**
 * Fetches and returns (caches) GDrive presets from the remote JSON.
 * Usage: await window.gdrivePresets()
 * Returns: Array of preset objects, or [] on error.
 */
window.gdrivePresets = async function() {
    if (window._gdrivePresetsCache) return window._gdrivePresetsCache; // use cache
    try {
        const response = await fetch("https://raw.githubusercontent.com/Drazzilb08/daps-gdrive-presets/refs/heads/beta/presets.json");
        if (!response.ok) throw new Error("Failed to fetch GDrive presets");
        const data = await response.json();
        // If it's an array, use directly; if object, convert to array
        window._gdrivePresetsCache = Array.isArray(data)
            ? data
            : Object.entries(data).map(([name, value]) =>
                typeof value === "object"
                    ? { name, ...value }
                    : { name, id: value }
              );
    } catch (err) {
        console.error("Error loading GDrive presets:", err);
        window._gdrivePresetsCache = [];
    }
    return window._gdrivePresetsCache;
};