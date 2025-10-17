/**
 * Transform snake_case strings into human-readable format
 *
 * Converts programming convention strings (like API field names) into
 * user-friendly display text by replacing underscores with spaces and
 * applying proper capitalization.
 *
 * @param {string} key - Snake_case string to transform
 * @returns {string} Human-readable string with title case
 *
 * @example
 * humanize('user_profile_name'); // => 'User Profile Name'
 * humanize('api_key'); // => 'Api Key'
 * humanize('max_retry_count'); // => 'Max Retry Count'
 * humanize(null); // => ''
 * humanize(undefined); // => ''
 */
export function humanize(key) {
    if (!key || typeof key !== 'string') {
        return key || '';
    }
    return key
        .replace(/_/g, ' ') // Replace underscores with spaces
        .replace(/\b\w/g, char => char.toUpperCase()); // Capitalize first letter of each word
}
